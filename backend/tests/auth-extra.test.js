/**
 * auth-extra.test.js
 * Eksik kalan auth akışlarını ve middleware edge case'lerini kapatır:
 *   - deleteAccount
 *   - googleAuth (tüm dallar)
 *   - forgotPassword edge case'leri
 *   - resetPassword validation
 *   - changePassword validation
 *   - resendVerification edge case'leri
 *   - verifyEmail edge case'leri
 *   - loginUser → doğrulanmamış hesap (403)
 *   - authMiddleware → süresi dolmuş / silinmiş kullanıcı
 *   - GET /api/auth/reset-password/:token HTML formu
 *   - User.getOtpCode model metodu
 */

// Mock: emailService
jest.mock('../services/emailService', () => ({
    sendVerificationEmail: jest.fn().mockResolvedValue({
        accepted: ['auth-extra@test.com'],
        rejected: []
    }),
    sendPasswordResetEmail: jest.fn().mockResolvedValue({
        accepted: ['auth-extra@test.com'],
        rejected: []
    })
}));

// Mock: google-auth-library 
const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
    OAuth2Client: jest.fn().mockImplementation(() => ({
        verifyIdToken: mockVerifyIdToken
    }))
}));


const request    = require('supertest');
const mongoose   = require('mongoose');
const jwt        = require('jsonwebtoken');
const bcrypt     = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app, server } = require('../server');
const User       = require('../models/User');
const Item       = require('../models/Item');
const Outfit     = require('../models/Outfit');
const PendingRegistration = require('../models/PendingRegistration');
const { sendPasswordResetEmail } = require('../services/emailService');
const { sendVerificationEmail  } = require('../services/emailService');

let mongoServer;

// Helper: Doğrulanmış kullanıcı oluştur ve token al 
const createVerifiedUser = async (email = 'auth-extra@test.com', pass = 'sifre123') => {
    const hashed = await bcrypt.hash(pass, 10);
    const user   = await User.create({
        kullaniciAdi: 'AuthExtra',
        email:        email.toLowerCase(),
        sifre:        hashed,
        isVerified:   true
    });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '30d' });
    return { user, token };
};

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
    jest.clearAllMocks();
    // Tüm koleksiyonları temizle
    for (const col of Object.values(mongoose.connection.collections)) {
        await col.deleteMany({});
    }
    // Varsayılan mock'ları yeniden kur
    sendVerificationEmail.mockResolvedValue({ accepted: ['auth-extra@test.com'], rejected: [] });
    sendPasswordResetEmail.mockResolvedValue({ accepted: ['auth-extra@test.com'], rejected: [] });
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
    server.close();
});


// DELETE /api/auth/me — Hesap silme
describe('DELETE /api/auth/me — deleteAccount', () => {

    test('✅ Kullanıcı hesabı ve ilgili veriler kalıcı olarak silinmeli', async () => {
        const { user, token } = await createVerifiedUser('delete@test.com');

        // Birkaç item ve outfit ekle
        const item = await Item.create({
            kullanici: user._id,
            resimUrl:  'http://test.com/img.jpg',
            kategori:  'Üst Giyim',
            renk:      'Siyah',
            mevsim:    'Yaz',
            stil:      'Günlük'
        });
        await Outfit.create({ kullanici: user._id, kiyafetler: [item._id], aiAciklama: 'test' });

        const res = await request(app)
            .delete('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.mesaj).toMatch(/silindi/i);

        // Kullanıcı + item + outfit gerçekten silindi mi?
        const dbUser   = await User.findById(user._id);
        const dbItems  = await Item.find({ kullanici: user._id });
        const dbOutfits = await Outfit.find({ kullanici: user._id });

        expect(dbUser).toBeNull();
        expect(dbItems).toHaveLength(0);
        expect(dbOutfits).toHaveLength(0);
    });

    test('❌ Token olmadan hesap silme 401 dönmeli', async () => {
        const res = await request(app).delete('/api/auth/me');
        expect(res.statusCode).toBe(401);
    });
});


// POST /api/auth/google — Google OAuth
describe('POST /api/auth/google — googleAuth', () => {

    test('❌ idToken eksikse 400 dönmeli', async () => {
        const res = await request(app)
            .post('/api/auth/google')
            .send({});
        expect(res.statusCode).toBe(400);
        expect(res.body.mesaj).toMatch(/eksik/i);
    });

    test('❌ Geçersiz Google token → 401 dönmeli', async () => {
        mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

        const res = await request(app)
            .post('/api/auth/google')
            .send({ idToken: 'gecersiz-token' });

        expect(res.statusCode).toBe(401);
        expect(res.body.mesaj).toMatch(/başarısız/i);
    });

    test('✅ Yeni kullanıcı Google ile kayıt olabilmeli', async () => {
        mockVerifyIdToken.mockResolvedValueOnce({
            getPayload: () => ({
                sub:     'google-sub-123',
                email:   'newgoogle@test.com',
                name:    'Google User',
                picture: 'https://example.com/pic.jpg'
            })
        });

        const res = await request(app)
            .post('/api/auth/google')
            .send({ idToken: 'valid-token' });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body.kullanici.email).toBe('newgoogle@test.com');
    });

    test('✅ Mevcut kullanıcı Google ile giriş yapabilmeli (googleId bağlanır)', async () => {
        // Daha önce normal kayıt ile oluşturulmuş kullanıcı
        const hashed = await bcrypt.hash('pass123', 10);
        await User.create({
            kullaniciAdi: 'ExistingUser',
            email:        'existing@test.com',
            sifre:        hashed,
            isVerified:   true
        });

        mockVerifyIdToken.mockResolvedValueOnce({
            getPayload: () => ({
                sub:     'google-sub-existing',
                email:   'existing@test.com',
                name:    'Existing User',
                picture: 'https://example.com/pic.jpg'
            })
        });

        const res = await request(app)
            .post('/api/auth/google')
            .send({ idToken: 'valid-token' });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');

        // googleId bağlandı mı?
        const updatedUser = await User.findOne({ email: 'existing@test.com' });
        expect(updatedUser.googleId).toBe('google-sub-existing');
    });

    test('✅ googleId zaten kayıtlı kullanıcı tekrar giriş yapabilmeli', async () => {
        const hashed = await bcrypt.hash('pass123', 10);
        await User.create({
            kullaniciAdi: 'GoogleUser',
            email:        'googleuser@test.com',
            sifre:        hashed,
            isVerified:   true,
            googleId:     'google-sub-already'
        });

        mockVerifyIdToken.mockResolvedValueOnce({
            getPayload: () => ({
                sub:     'google-sub-already',
                email:   'googleuser@test.com',
                name:    'Google User',
                picture: null
            })
        });

        const res = await request(app)
            .post('/api/auth/google')
            .send({ idToken: 'valid-token' });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
    });
});


// POST /api/auth/forgot-password — Edge case'ler
describe('POST /api/auth/forgot-password — edge cases', () => {

    test('✅ Var olmayan email için de 200 dönmeli (güvenlik - e-posta ifşa etme)', async () => {
        const res = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'yokkullanici@test.com' });

        expect(res.statusCode).toBe(200);
        expect(res.body.mesaj).toMatch(/gönderildi/i);
    });

    test('❌ E-posta gönderimi başarısız olursa token temizlenmeli ve 503 dönmeli', async () => {
        await createVerifiedUser('forgotfail@test.com');
        sendPasswordResetEmail.mockRejectedValueOnce(new Error('SMTP hatası'));

        const res = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: 'forgotfail@test.com' });

        expect(res.statusCode).toBe(503);
        expect(res.body.mesaj).toMatch(/gönderilemedi/i);

        // Token temizlendi mi?
        const user = await User.findOne({ email: 'forgotfail@test.com' });
        expect(user.resetPasswordToken).toBeUndefined();
        expect(user.resetPasswordExpire).toBeUndefined();
    });
});


// PUT /api/auth/reset-password/:token — Validation
describe('PUT /api/auth/reset-password/:token — validation', () => {

    test('❌ Yeni şifre 6 karakterden kısaysa 400 dönmeli', async () => {
        const { user } = await createVerifiedUser('resetval@test.com');
        const rawToken = user.getResetPasswordToken();
        await user.save({ validateBeforeSave: false });

        const res = await request(app)
            .put(`/api/auth/reset-password/${rawToken}`)
            .send({ yeniSifre: '123' });

        expect(res.statusCode).toBe(400);
        expect(res.body.mesaj).toMatch(/karakter/i);
    });
});


// PUT /api/auth/change-password — Validation
describe('PUT /api/auth/change-password — validation', () => {

    let token;

    beforeEach(async () => {
        const result = await createVerifiedUser('changeval@test.com');
        token = result.token;
    });

    test('❌ Mevcut veya yeni şifre eksikse 400 dönmeli', async () => {
        const res = await request(app)
            .put('/api/auth/change-password')
            .set('Authorization', `Bearer ${token}`)
            .send({ mevcutSifre: 'sifre123' }); // yeniSifre eksik

        expect(res.statusCode).toBe(400);
        expect(res.body.mesaj).toMatch(/zorunludur/i);
    });

    test('❌ Yeni şifre 6 karakterden kısaysa 400 dönmeli', async () => {
        const res = await request(app)
            .put('/api/auth/change-password')
            .set('Authorization', `Bearer ${token}`)
            .send({ mevcutSifre: 'sifre123', yeniSifre: '123' });

        expect(res.statusCode).toBe(400);
        expect(res.body.mesaj).toMatch(/karakter/i);
    });
});


// GET /api/auth/reset-password/:token — HTML Formu
describe('GET /api/auth/reset-password/:token — HTML form', () => {

    test('✅ HTML form sayfası dönmeli', async () => {
        const res = await request(app)
            .get('/api/auth/reset-password/herhangi-bir-token');

        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/html/i);
        expect(res.text).toContain('Smart Wardrobe');
    });
});


// POST /api/auth/resend-verification — Edge case'ler
describe('POST /api/auth/resend-verification — edge cases', () => {

    test('❌ Email alanı eksikse 400 dönmeli', async () => {
        const res = await request(app)
            .post('/api/auth/resend-verification')
            .send({});

        expect(res.statusCode).toBe(400);
        expect(res.body.mesaj).toMatch(/zorunludur/i);
    });

    test('❌ Bekleyen kayıt yoksa 404 dönmeli', async () => {
        const res = await request(app)
            .post('/api/auth/resend-verification')
            .send({ email: 'hicbeklemeyok@test.com' });

        expect(res.statusCode).toBe(404);
    });

    test('❌ E-posta gönderimi başarısız olursa 503 dönmeli', async () => {
        // Önce pending kaydı oluştur
        await request(app)
            .post('/api/auth/register')
            .send({ kullaniciAdi: 'ResendFail', email: 'resendfail@test.com', sifre: 'sifre123' });

        sendVerificationEmail.mockRejectedValueOnce(new Error('SMTP'));

        const res = await request(app)
            .post('/api/auth/resend-verification')
            .send({ email: 'resendfail@test.com' });

        expect(res.statusCode).toBe(503);
        expect(res.body.emailSendFailed).toBe(true);
    });

    test('❌ Resend e-postası teslim edilemezse 503 dönmeli', async () => {
        await request(app)
            .post('/api/auth/register')
            .send({ kullaniciAdi: 'ResendDel', email: 'resenddel@test.com', sifre: 'sifre123' });

        sendVerificationEmail.mockResolvedValueOnce({ accepted: [], rejected: ['resenddel@test.com'] });

        const res = await request(app)
            .post('/api/auth/resend-verification')
            .send({ email: 'resenddel@test.com' });

        expect(res.statusCode).toBe(503);
        expect(res.body.emailSendFailed).toBe(true);
    });
});


// POST /api/auth/verify-email — Edge case'ler
describe('POST /api/auth/verify-email — edge cases', () => {

    test('❌ Email veya otpCode eksikse 400 dönmeli', async () => {
        const res = await request(app)
            .post('/api/auth/verify-email')
            .send({ email: 'test@test.com' }); // otpCode eksik

        expect(res.statusCode).toBe(400);
    });

    test('❌ Zaten doğrulanmış hesap için 400 dönmeli', async () => {
        await createVerifiedUser('alreadyverified@test.com');

        const res = await request(app)
            .post('/api/auth/verify-email')
            .send({ email: 'alreadyverified@test.com', otpCode: '123456' });

        expect(res.statusCode).toBe(400);
        expect(res.body.mesaj).toMatch(/zaten doğrulanmış/i);
    });

    test('❌ Bekleyen kayıt yoksa 400 dönmeli', async () => {
        const res = await request(app)
            .post('/api/auth/verify-email')
            .send({ email: 'hicbeklemeyok2@test.com', otpCode: '123456' });

        expect(res.statusCode).toBe(400);
    });

    test('❌ Süresi dolmuş OTP için 400 dönmeli', async () => {
        await request(app)
            .post('/api/auth/register')
            .send({ kullaniciAdi: 'ExpiredOTP', email: 'expiredotp@test.com', sifre: 'sifre123' });

        const pending = await PendingRegistration.findOne({ email: 'expiredotp@test.com' });
        const otp = pending.getOtpCode();
        pending.otpExpire = Date.now() - 1000; // Geçmiş tarih
        await pending.save({ validateBeforeSave: false });

        const res = await request(app)
            .post('/api/auth/verify-email')
            .send({ email: 'expiredotp@test.com', otpCode: otp });

        expect(res.statusCode).toBe(400);
        expect(res.body.mesaj).toMatch(/süres[i|i]/i);
    });

    test('❌ Yanlış OTP için 400 dönmeli', async () => {
        await request(app)
            .post('/api/auth/register')
            .send({ kullaniciAdi: 'WrongOTP', email: 'wrongotp@test.com', sifre: 'sifre123' });

        const res = await request(app)
            .post('/api/auth/verify-email')
            .send({ email: 'wrongotp@test.com', otpCode: '000000' });

        expect(res.statusCode).toBe(400);
        expect(res.body.mesaj).toMatch(/hatalı/i);
    });
});


// POST /api/auth/login — Doğrulanmamış hesap
describe('POST /api/auth/login — unverified account', () => {

    test('❌ Doğrulanmamış hesap ile giriş yapılamamalı (403)', async () => {
        const hashed = await bcrypt.hash('sifre123', 10);
        await User.create({
            kullaniciAdi: 'Unverified',
            email:        'unverified@test.com',
            sifre:        hashed,
            isVerified:   false
        });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'unverified@test.com', sifre: 'sifre123' });

        expect(res.statusCode).toBe(403);
        expect(res.body.requiresVerification).toBe(true);
    });
});


// authMiddleware — Edge case'ler
describe('authMiddleware — token edge cases', () => {

    test('❌ Süresi dolmuş token ile 401 dönmeli', async () => {
        const hashed = await bcrypt.hash('sifre123', 10);
        const user   = await User.create({
            kullaniciAdi: 'ExpiredUser',
            email:        'expiredtoken@test.com',
            sifre:        hashed,
            isVerified:   true
        });

        // Süresi -1s olan (zaten dolmuş) JWT
        const expiredToken = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: -1 }
        );

        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${expiredToken}`);

        expect(res.statusCode).toBe(401);
        expect(res.body.mesaj).toMatch(/süre/i);
    });

    test('❌ Token geçerli ama kullanıcı veritabanından silinmişse 401 dönmeli', async () => {
        const hashed = await bcrypt.hash('sifre123', 10);
        const user   = await User.create({
            kullaniciAdi: 'GhostUser',
            email:        'ghostuser@test.com',
            sifre:        hashed,
            isVerified:   true
        });

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '30d' }
        );

        // Kullanıcıyı sil
        await User.findByIdAndDelete(user._id);

        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(401);
        expect(res.body.mesaj).toMatch(/bulunamadı/i);
    });
});


// User Model — getOtpCode metodu
describe('User Model — getOtpCode metodu', () => {

    test('✅ getOtpCode 6 haneli OTP üretmeli ve hashlenmeli', () => {
        const user = new User({
            kullaniciAdi: 'TestOtpUser',
            email:        'otptest@test.com',
            sifre:        'sifre123'
        });

        const otp = user.getOtpCode();

        expect(typeof otp).toBe('string');
        expect(otp).toHaveLength(6);
        expect(Number(otp)).toBeGreaterThanOrEqual(100000);
        expect(Number(otp)).toBeLessThanOrEqual(999999);

        // DB'ye hash kaydedilmeli
        expect(user.otpCode).toBeDefined();
        expect(user.otpCode).not.toBe(otp); // Hash olmalı (düz otp değil)
        expect(user.otpExpire).toBeDefined();
        expect(user.otpExpire.getTime()).toBeGreaterThan(Date.now());
    });
});
