const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app, server } = require('../server');

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
