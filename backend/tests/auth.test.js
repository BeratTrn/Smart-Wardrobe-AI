const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app, server } = require('../server');
const User = require('../models/User');

let mongoServer;

// Her test öncesi bellek içi MongoDB başlat
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

// Her test sonrası veritabanını temizle
afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

// Tüm testler bitince bağlantıyı kapat
afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
    server.close();
});

// =============================================
// KAYIT (REGISTER) TESTLERİ
// =============================================
describe('POST /api/auth/register', () => {

    const gecerliKullanici = {
        kullaniciAdi: 'TestKullanici',
        email: 'test@example.com',
        sifre: 'sifre123'
    };

    test('✅ Geçerli bilgilerle başarıyla kayıt olunabilmeli', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(gecerliKullanici);

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('token');
        expect(res.body).toHaveProperty('kullanici');
        expect(res.body.kullanici.email).toBe('test@example.com');
        expect(res.body.kullanici).not.toHaveProperty('sifre'); // Şifre döndürülmemeli
    });

    test('❌ Aynı e-posta ile ikinci kayıt reddedilmeli', async () => {
        // İlk kayıt
        await request(app).post('/api/auth/register').send(gecerliKullanici);

        // İkinci kayıt - aynı email
        const res = await request(app)
            .post('/api/auth/register')
            .send(gecerliKullanici);

        expect(res.statusCode).toBe(400);
        expect(res.body.mesaj).toMatch(/kullanımda/i);
    });

    test('❌ E-posta eksikse 400 dönmeli', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ kullaniciAdi: 'Test', sifre: 'sifre123' });

        expect(res.statusCode).toBe(400);
    });

    test('❌ Şifre 6 karakterden kısaysa reddedilmeli', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ kullaniciAdi: 'Test', email: 'test2@example.com', sifre: '123' });

        expect(res.statusCode).toBe(400);
    });

    test('✅ Kayıt sonrası geçerli JWT token üretilmeli', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(gecerliKullanici);

        expect(res.body.token).toBeDefined();
        expect(typeof res.body.token).toBe('string');
        // JWT formatı: üç parça nokta ile ayrılır
        expect(res.body.token.split('.')).toHaveLength(3);
    });
});

// =============================================
// GİRİŞ (LOGIN) TESTLERİ
// =============================================
describe('POST /api/auth/login', () => {

    beforeEach(async () => {
        // Her login testinden önce bir kullanıcı oluştur
        await request(app)
            .post('/api/auth/register')
            .send({ kullaniciAdi: 'LoginTest', email: 'login@example.com', sifre: 'sifre123' });
    });

    test('✅ Doğru bilgilerle giriş yapılabilmeli', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'login@example.com', sifre: 'sifre123' });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body.mesaj).toMatch(/başarılı/i);
    });

    test('❌ Yanlış şifre ile giriş reddedilmeli (401)', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'login@example.com', sifre: 'yanlis_sifre' });

        expect(res.statusCode).toBe(401);
    });

    test('❌ Kayıtlı olmayan e-posta ile giriş reddedilmeli', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'yok@example.com', sifre: 'sifre123' });

        expect(res.statusCode).toBe(401);
    });

    test('❌ E-posta veya şifre eksikse 400 dönmeli', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'login@example.com' }); // Şifre yok

        expect(res.statusCode).toBe(400);
    });
});

// =============================================
// KORUNAN ROUTE TESTLERİ
// =============================================
describe('GET /api/auth/me', () => {

    let token;

    beforeEach(async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ kullaniciAdi: 'MeTest', email: 'me@example.com', sifre: 'sifre123' });
        token = res.body.token;
    });

    test('✅ Geçerli token ile kullanıcı bilgileri alınabilmeli', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.kullanici.email).toBe('me@example.com');
    });

    test('❌ Token olmadan /me endpoint\'i 401 dönmeli', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.statusCode).toBe(401);
    });

    test('❌ Geçersiz (sahte) token ile 401 dönmeli', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer sahte.token.degeri');

        expect(res.statusCode).toBe(401);
    });
});

// =============================================
// PROFIL GUNCELLEME TESTLERI
// =============================================
describe('PUT /api/auth/update', () => {
    let token;

    beforeEach(async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ kullaniciAdi: 'UpdateUser', email: 'update@example.com', sifre: 'sifre123' });
        token = res.body.token;
    });

    test('✅ Gecerli token ile kullanici profili guncellenebilmeli', async () => {
        const res = await request(app)
            .put('/api/auth/update')
            .set('Authorization', `Bearer ${token}`)
            .send({
                kullaniciAdi: 'UpdateUserV2',
                tercihler: {
                    favoriStil: 'Elegant',
                    favoriRenkler: ['Siyah', 'Beyaz'],
                    bildirimler: false
                }
            });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('kullanici');
        expect(res.body.kullanici.kullaniciAdi).toBe('UpdateUserV2');
        expect(res.body.kullanici.tercihler.favoriStil).toBe('Elegant');
    });

    test('❌ Token olmadan profil guncelleme 401 donmeli', async () => {
        const res = await request(app)
            .put('/api/auth/update')
            .send({ kullaniciAdi: 'NoTokenUpdate' });

        expect(res.statusCode).toBe(401);
    });
});

// =============================================
// SIFRE DEGISTIRME TESTLERI
// =============================================
describe('PUT /api/auth/change-password', () => {
    let token;

    beforeEach(async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ kullaniciAdi: 'ChangePassUser', email: 'changepass@example.com', sifre: 'sifre123' });
        token = res.body.token;
    });

    test('✅ Mevcut sifre dogruysa sifre degistirilebilmeli', async () => {
        const changeRes = await request(app)
            .put('/api/auth/change-password')
            .set('Authorization', `Bearer ${token}`)
            .send({ mevcutSifre: 'sifre123', yeniSifre: 'yenisifre123' });

        expect(changeRes.statusCode).toBe(200);

        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'changepass@example.com', sifre: 'yenisifre123' });

        expect(loginRes.statusCode).toBe(200);
        expect(loginRes.body).toHaveProperty('token');
    });

    test('❌ Mevcut sifre yanlissa 401 donmeli', async () => {
        const res = await request(app)
            .put('/api/auth/change-password')
            .set('Authorization', `Bearer ${token}`)
            .send({ mevcutSifre: 'yanlis', yeniSifre: 'yenisifre123' });

        expect(res.statusCode).toBe(401);
    });
});

// =============================================
// SIFRE SIFIRLAMA TESTLERI
// =============================================
describe('Sifre sifirlama akis testleri', () => {
    beforeEach(async () => {
        await request(app)
            .post('/api/auth/register')
            .send({ kullaniciAdi: 'ForgotUser', email: 'forgot@example.com', sifre: 'sifre123' });
    });

    test('✅ forgot-password token dondurmeli, reset-password yeni sifreyi kaydetmeli', async () => {
        const forgotRes = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'forgot@example.com' });

        expect(forgotRes.statusCode).toBe(200);
        expect(forgotRes.body).toHaveProperty('resetToken');

        const resetRes = await request(app)
            .put(`/api/auth/reset-password/${forgotRes.body.resetToken}`)
            .send({ yeniSifre: 'yenisifre123' });

        expect(resetRes.statusCode).toBe(200);
        expect(resetRes.body).toHaveProperty('token');

        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'forgot@example.com', sifre: 'yenisifre123' });

        expect(loginRes.statusCode).toBe(200);
    });

    test('❌ forgot-password email olmadan 400 donmeli', async () => {
        const res = await request(app)
            .post('/api/auth/forgot-password')
            .send({});

        expect(res.statusCode).toBe(400);
    });

    test('❌ reset-password gecersiz token ile 400 donmeli', async () => {
        const res = await request(app)
            .put('/api/auth/reset-password/gecersiztoken')
            .send({ yeniSifre: 'yenisifre123' });

        expect(res.statusCode).toBe(400);
    });

    test('❌ reset-password suresi dolmus token ile 400 donmeli', async () => {
        const forgotRes = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'forgot@example.com' });

        const user = await User.findOne({ email: 'forgot@example.com' });
        user.resetPasswordExpire = Date.now() - 1000;
        await user.save({ validateBeforeSave: false });

        const resetRes = await request(app)
            .put(`/api/auth/reset-password/${forgotRes.body.resetToken}`)
            .send({ yeniSifre: 'yenisifre123' });

        expect(resetRes.statusCode).toBe(400);
    });
});
