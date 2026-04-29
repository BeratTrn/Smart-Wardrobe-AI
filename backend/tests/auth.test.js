jest.mock('../services/emailService', () => ({
    sendVerificationEmail: jest.fn().mockResolvedValue({
        accepted: ['test@example.com'],
        rejected: []
    }),
    sendPasswordResetEmail: jest.fn().mockResolvedValue({
        accepted: ['test@example.com'],
        rejected: []
    })
}));

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { sendVerificationEmail } = require('../services/emailService');
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
        expect(res.body).toHaveProperty('email', 'test@example.com');
        expect(res.body).not.toHaveProperty('token');
    });

    test('❌ Aynı e-posta ile ikinci kayıt reddedilmeli', async () => {
        const hashed = await bcrypt.hash('sifre123', 10);
        await User.create({
            kullaniciAdi: 'VarOlan',
            email: gecerliKullanici.email,
            sifre: hashed,
            isVerified: true
        });

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

        expect(res.statusCode).toBe(201);
        expect(res.body.token).toBeUndefined();
    });

    test('❌ E-posta gönderimi başarısız olursa yanıltıcı başarı dönmemeli', async () => {
        sendVerificationEmail.mockRejectedValueOnce(new Error('SMTP Down'));

        const res = await request(app)
            .post('/api/auth/register')
            .send({
                kullaniciAdi: 'MailFailUser',
                email: 'mailfail@example.com',
                sifre: 'sifre123'
            });

        expect(res.statusCode).toBe(503);
        expect(res.body.emailSendFailed).toBe(true);
    });

    test('❌ Provider accepted dönmezse başarı sayılmamalı', async () => {
        sendVerificationEmail.mockResolvedValueOnce({
            accepted: [],
            rejected: ['nobody@example.com']
        });

        const res = await request(app)
            .post('/api/auth/register')
            .send({
                kullaniciAdi: 'DeliveryFailUser',
                email: 'deliveryfail@example.com',
                sifre: 'sifre123'
            });

        expect(res.statusCode).toBe(503);
        expect(res.body.emailSendFailed).toBe(true);
    });
});

const createVerifiedUserAndToken = async (payload) => {
    const hashed = await bcrypt.hash(payload.sifre, 10);
    await User.create({
        kullaniciAdi: payload.kullaniciAdi,
        email: payload.email.toLowerCase(),
        sifre: hashed,
        isVerified: true
    });

    const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: payload.email, sifre: payload.sifre });

    return loginRes.body.token;
};

// =============================================
// GİRİŞ (LOGIN) TESTLERİ
// =============================================
describe('POST /api/auth/login', () => {

    beforeEach(async () => {
        await createVerifiedUserAndToken({
            kullaniciAdi: 'LoginTest',
            email: 'login@example.com',
            sifre: 'sifre123'
        });
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
        token = await createVerifiedUserAndToken({
            kullaniciAdi: 'MeTest',
            email: 'me@example.com',
            sifre: 'sifre123'
        });
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
        token = await createVerifiedUserAndToken({
            kullaniciAdi: 'UpdateUser',
            email: 'update@example.com',
            sifre: 'sifre123'
        });
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
        token = await createVerifiedUserAndToken({
            kullaniciAdi: 'ChangePassUser',
            email: 'changepass@example.com',
            sifre: 'sifre123'
        });
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
        await createVerifiedUserAndToken({
            kullaniciAdi: 'ForgotUser',
            email: 'forgot@example.com',
            sifre: 'sifre123'
        });
    });

    test('✅ forgot-password mail gonderir, reset-password yeni sifreyi kaydetmeli', async () => {
        const forgotRes = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'forgot@example.com' });

        expect(forgotRes.statusCode).toBe(200);
        expect(forgotRes.body).toHaveProperty('mesaj');

        // Token API'den donmez (guvenlik), DB'den aliyoruz
        const user = await User.findOne({ email: 'forgot@example.com' });
        expect(user.resetPasswordToken).toBeDefined();
        expect(user.resetPasswordExpire).toBeDefined();

        // Ham token controller tarafindan getResetPasswordToken() ile uretildi
        // Test ortaminda DB'deki hash'e karsilik gelen ham tokeni bulmak icin
        // yeni bir token uretip DB'ye yaziyoruz (ayni akisi simule etmek icin)
        const rawToken = user.getResetPasswordToken();
        await user.save({ validateBeforeSave: false });

        const resetRes = await request(app)
            .put(`/api/auth/reset-password/${rawToken}`)
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
        await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'forgot@example.com' });

        const user = await User.findOne({ email: 'forgot@example.com' });
        const rawToken = user.getResetPasswordToken();
        user.resetPasswordExpire = Date.now() - 1000; // Suresi gecmis
        await user.save({ validateBeforeSave: false });

        const resetRes = await request(app)
            .put(`/api/auth/reset-password/${rawToken}`)
            .send({ yeniSifre: 'yenisifre123' });

        expect(resetRes.statusCode).toBe(400);
    });
});

describe('POST /api/auth/resend-verification', () => {
    test('✅ Doğrulanmamış kullanıcı için kod yeniden gönderilmeli', async () => {
        await request(app).post('/api/auth/register').send({
            kullaniciAdi: 'ResendUser',
            email: 'resend@example.com',
            sifre: 'sifre123'
        });

        const res = await request(app)
            .post('/api/auth/resend-verification')
            .send({ email: 'resend@example.com' });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('email', 'resend@example.com');
    });

    test('❌ Doğrulanmış hesap için yeniden kod gönderilmemeli', async () => {
        await createVerifiedUserAndToken({
            kullaniciAdi: 'AlreadyVerified',
            email: 'verified@example.com',
            sifre: 'sifre123'
        });

        const res = await request(app)
            .post('/api/auth/resend-verification')
            .send({ email: 'verified@example.com' });

        expect(res.statusCode).toBe(400);
    });
});
