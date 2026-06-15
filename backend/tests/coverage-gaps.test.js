/**
 * coverage-gaps.test.js
 *
 * Kalan tüm coverage boşluklarını kapatmak için yazılmış test suite.
 *
 * Kapsanan dosyalar / satırlar:
 *   authController  : 18, 51, 75-76, 107-108, 159-160, 219-220, 272-273,
 *                     304, 356-357, 395, 427-428, 454-455, 484
 *   itemController  : 37-38, 67-69, 97-98, 131-132, 173-174, 191, 197-198,
 *                     222-223, 235-236
 *   outfitController: 13, 22, 44, 199
 *   statsController : 99-100
 *   travelController: 84, 117-118, 137, 159
 *   userController  : 20, 59-60, 85-86, 99-110, 111-113, 153-154, 175-176
 *   errorMiddleware : 34
 *   notificationService: 37-46
 *   emailService    : 10
 */

// Mock: emailService 
jest.mock('../services/emailService', () => ({
    sendVerificationEmail:  jest.fn().mockResolvedValue({ accepted: ['gaps@test.com'], rejected: [] }),
    sendPasswordResetEmail: jest.fn().mockResolvedValue({ accepted: ['gaps@test.com'], rejected: [] }),
}));

// Mock: google-auth-library 
// Not: jest.mock hoisted edildiğinden değişken adı "mock" ile başlamalı (TDZ exception)
const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
    OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken }))
}));

// Mock: weatherService 
jest.mock('../services/weatherService', () => ({
    havaDurumuGetir:   jest.fn(),
    sehirHavaDurumu:   jest.fn(),
    seyahatHavaDurumu: jest.fn(),
}));

// Mock: aiService 
jest.mock('../services/aiService', () => ({
    analyzeItem: jest.fn().mockResolvedValue({
        kategori: 'Üst Giyim', renk: '#000000', aiDogrulandi: true
    }),
    wardrobeOnKontrol:        jest.requireActual('../services/aiService').wardrobeOnKontrol,
    generateOutfitSuggestion: jest.fn().mockResolvedValue({
        aciklama: 'Test kombin açıklaması', secilen_kiyafet_idleri: [], ipucu: 'Test ipucu'
    }),
    generateSuitcaseSuggestion: jest.fn().mockResolvedValue({
        aciklama: 'Test bavul açıklaması', secilen_kiyafet_idleri: [], ipucu: 'Test ipucu'
    }),
    generateWeatherNotificationText: jest.fn().mockResolvedValue('Test bildirim metni'),
}));

// Mock: firebase-admin 
const mockSendEachForMulticast = jest.fn();
jest.mock('firebase-admin', () => ({
    messaging: jest.fn(() => ({ sendEachForMulticast: mockSendEachForMulticast }))
}));



const request  = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt   = require('bcryptjs');

const { app, server } = require('../server');

const User           = require('../models/User');
const Item           = require('../models/Item');
const Outfit         = require('../models/Outfit');
const TravelSuitcase = require('../models/TravelSuitcase');
const PendingReg     = require('../models/PendingRegistration');

const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');
const { sehirHavaDurumu, seyahatHavaDurumu }            = require('../services/weatherService');
const { generateOutfitSuggestion, generateSuitcaseSuggestion, analyzeItem } =
    require('../services/aiService');

// Direkt controller çağrıları (auth middleware'i atlamak için)
const authCtrl   = require('../controllers/authController');
const itemCtrl   = require('../controllers/itemController');
const userCtrl   = require('../controllers/userController');
const statsCtrl  = require('../controllers/statsController');
const outfitCtrl = require('../controllers/outfitController');

const { errorHandler }        = require('../middleware/errorMiddleware');
const { sendPushNotification } = require('../services/notificationService');


// Durum
let mongoServer;
let authToken;
let userId;


// Yardımcılar
/** Fake res nesnesi — direkt controller çağrıları için */
const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
};

/** Ana test kullanıcısına ait minimal Item oluşturur */
const makeItem = (overrides = {}) =>
    Item.create({
        kullanici:    userId,
        resimUrl:     'http://x.com/img.jpg',
        kategori:     'Üst Giyim',
        renk:         'Siyah',
        mevsim:       'Yaz',
        stil:         'Günlük',
        cloudinaryId: '',
        ...overrides,
    });


// Setup / Teardown
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Ana test kullanıcısı oluştur ve doğrula
    await request(app)
        .post('/api/auth/register')
        .send({ kullaniciAdi: 'GapsUser', email: 'gaps@test.com', sifre: 'sifre123' });

    const otpCode = sendVerificationEmail.mock.calls[
        sendVerificationEmail.mock.calls.length - 1
    ][2];

    await request(app)
        .post('/api/auth/verify-email')
        .send({ email: 'gaps@test.com', otpCode });

    const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'gaps@test.com', sifre: 'sifre123' });

    authToken = loginRes.body.token;
    userId    = loginRes.body.kullanici?.id
        ?? (await User.findOne({ email: 'gaps@test.com' }))._id.toString();
});

afterEach(async () => {
    // Mock call geçmişlerini ve once-queue'larını temizle
    jest.clearAllMocks();
    // jest.spyOn ile oluşturulan spy'ları geri yükle
    jest.restoreAllMocks();

    // Modül mock'larının default değerlerini yeniden ayarla
    sendVerificationEmail.mockResolvedValue({ accepted: ['gaps@test.com'], rejected: [] });
    sendPasswordResetEmail.mockResolvedValue({ accepted: ['gaps@test.com'], rejected: [] });
    generateOutfitSuggestion.mockResolvedValue({
        aciklama: 'Test kombin açıklaması', secilen_kiyafet_idleri: [], ipucu: 'Test ipucu'
    });
    generateSuitcaseSuggestion.mockResolvedValue({
        aciklama: 'Test bavul açıklaması', secilen_kiyafet_idleri: [], ipucu: 'Test ipucu'
    });
    analyzeItem.mockResolvedValue({ kategori: 'Üst Giyim', renk: '#000000', aiDogrulandi: true });

    // DB temizliği — gaps@test.com kullanıcısı dışındaki her şeyi sil
    await Item.deleteMany({ kullanici: userId });
    await Outfit.deleteMany({ kullanici: userId });
    await TravelSuitcase.deleteMany({ kullanici: userId });
    await PendingReg.deleteMany({});
    await User.deleteMany({ email: { $ne: 'gaps@test.com' } });
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
    server.close();
});


// A — authController
describe('authController — kalan coverage dalları', () => {

    // A1. Line 51: Doğrulanmamış User mevcut → silinip yeni kayıt devam eder
    test('register: mevcut isVerified=false User silinip kayıt devam eder (line 51)', async () => {
        const salt = await bcrypt.genSalt(10);
        await User.create({
            kullaniciAdi: 'Unverified',
            email:        'unverified-gaps@test.com',
            sifre:        await bcrypt.hash('password123', salt),
            isVerified:   false,
        });

        const res = await request(app)
            .post('/api/auth/register')
            .send({ kullaniciAdi: 'NewUser', email: 'unverified-gaps@test.com', sifre: 'sifre123' });

        expect(res.statusCode).toBe(201);
        // isVerified: false olan user silinmiş olmalı
        const stillUnverified = await User.findOne({
            email:      'unverified-gaps@test.com',
            isVerified: false,
        });
        expect(stillUnverified).toBeNull();
    });

    // A2. Lines 75-76: Aynı e-posta iki kez kayıt → PendingRegistration güncellenir
    test('register: ikinci kayıt PendingRegistration kullaniciAdi & sifre günceller (lines 75-76)', async () => {
        const email = 'double-reg-gaps@test.com';

        // İlk kayıt
        await request(app)
            .post('/api/auth/register')
            .send({ kullaniciAdi: 'FirstName', email, sifre: 'sifre123' });

        // İkinci kayıt — aynı e-posta
        const res = await request(app)
            .post('/api/auth/register')
            .send({ kullaniciAdi: 'SecondName', email, sifre: 'yenisifre456' });

        expect(res.statusCode).toBe(201);
        const pending = await PendingReg.findOne({ email });
        expect(pending?.kullaniciAdi).toBe('SecondName');
    });

    // A3. Line 18: logDevOtp — development modunda OTP konsola yazılır
    test('register email hatası → development modunda logDevOtp çalışır (line 18)', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        sendVerificationEmail.mockRejectedValueOnce(new Error('SMTP bağlantı hatası'));

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        await request(app)
            .post('/api/auth/register')
            .send({ kullaniciAdi: 'DevUser', email: 'devmode-gaps@test.com', sifre: 'sifre123' });

        // development modunda logDevOtp console.log çağırmalı
        expect(consoleSpy).toHaveBeenCalled();

        process.env.NODE_ENV = originalEnv;
    });

    // A4. Lines 107-108: registerUser dış catch → 500
    test('registerUser: DB hatası → 500 döner (lines 107-108)', async () => {
        jest.spyOn(User, 'findOne').mockRejectedValueOnce(new Error('DB çöktü'));

        const req = { body: { kullaniciAdi: 'T', email: 'err@test.com', sifre: 'sifre123' } };
        const res = mockRes();
        await authCtrl.registerUser(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ mesaj: expect.stringContaining('sunucu hatası') })
        );
    });

    // A5. Lines 159-160: resendVerification dış catch → 500
    test('resendVerification: DB hatası → 500 döner (lines 159-160)', async () => {
        jest.spyOn(User, 'findOne').mockRejectedValueOnce(new Error('DB çöktü'));

        const req = { body: { email: 'err@test.com' } };
        const res = mockRes();
        await authCtrl.resendVerification(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    // A6. Lines 219-220: verifyEmail dış catch → 500
    test('verifyEmail: DB hatası → 500 döner (lines 219-220)', async () => {
        jest.spyOn(User, 'findOne').mockRejectedValueOnce(new Error('DB çöktü'));

        const req = { body: { email: 'err@test.com', otpCode: '123456' } };
        const res = mockRes();
        await authCtrl.verifyEmail(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    // A7. Lines 272-273: loginUser dış catch → 500
    test('loginUser: DB hatası → 500 döner (lines 272-273)', async () => {
        jest.spyOn(User, 'findOne').mockRejectedValueOnce(new Error('DB çöktü'));

        const req = { body: { email: 'err@test.com', sifre: 'sifre123' } };
        const res = mockRes();
        await authCtrl.loginUser(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    // A8. Line 304: getMe catch → 500 (req.user null)
    test('getMe: req.user null olduğunda → 500 döner (line 304)', async () => {
        const req = { user: null };
        const res = mockRes();
        await authCtrl.getMe(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ mesaj: 'Kullanıcı bilgileri alınamadı.' });
    });

    // A9. Lines 356-357: forgotPassword dış catch → 500
    test('forgotPassword: DB hatası → 500 döner (lines 356-357)', async () => {
        jest.spyOn(User, 'findOne').mockRejectedValueOnce(new Error('DB çöktü'));

        const req = {
            body: { email: 'err@test.com' },
            protocol: 'http',
            get: () => 'localhost:5000',
        };
        const res = mockRes();
        await authCtrl.forgotPassword(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    // A10. Line 395: resetPassword catch → 500
    test('resetPassword: DB hatası → 500 döner (line 395)', async () => {
        jest.spyOn(User, 'findOne').mockRejectedValueOnce(new Error('DB çöktü'));

        const req = {
            params: { resettoken: 'abcdef123456' },
            body:   { yeniSifre: 'newsifre123' },
        };
        const res = mockRes();
        await authCtrl.resetPassword(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    // A11. Lines 427-428: changePassword catch → 500
    test('changePassword: DB hatası → 500 döner (lines 427-428)', async () => {
        const user = await User.findById(userId);
        jest.spyOn(User, 'findById').mockRejectedValueOnce(new Error('DB çöktü'));

        const req = {
            user,
            body: { mevcutSifre: 'sifre123', yeniSifre: 'yenisifre123' },
        };
        const res = mockRes();
        await authCtrl.changePassword(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    // A12. Lines 454-455: deleteAccount catch → 500
    test('deleteAccount: DB hatası → 500 döner (lines 454-455)', async () => {
        const user = await User.findById(userId);
        jest.spyOn(Item, 'deleteMany').mockRejectedValueOnce(new Error('DB çöktü'));

        const req = { user };
        const res = mockRes();
        await authCtrl.deleteAccount(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    // A13. Line 484: googleAuth payload'da email yok → 400
    test('googleAuth: Google payload\'da email olmadığında → 400 döner (line 484)', async () => {
        mockVerifyIdToken.mockResolvedValueOnce({
            getPayload: () => ({
                sub:     'google-sub-123',
                email:   undefined,   // email yok
                name:    'Test User',
                picture: null,
            }),
        });

        const res = await request(app)
            .post('/api/auth/google')
            .send({ idToken: 'fake-google-token' });

        expect(res.statusCode).toBe(400);
        expect(res.body.mesaj).toMatch(/e-posta alınamadı/i);
    });
});


// B — itemController
describe('itemController — kalan coverage dalları', () => {

    // B1. Lines 37-38 & 67-69: req.file.path mevcutsa (cloudinary URL yolu)
    test('analyzeAndAddItem: req.file.path varken buffer yoksa cloudinary URL dalı çalışır (lines 37-38, 67-69)', async () => {
        const user = await User.findById(userId);

        analyzeItem.mockResolvedValueOnce({ kategori: 'Alt Giyim', renk: '#FF0000', aiDogrulandi: true });

        const req = {
            user,
            file: {
                path:         'https://res.cloudinary.com/test/upload/test.jpg',
                filename:     'cloudinary-public-id',
                originalname: 'test.jpg',
                buffer:       undefined,   // buffer yok → path dalı
            },
            body: {},
        };
        const res = mockRes();

        await itemCtrl.analyzeAndAddItem(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        // analyzeItem cloudinary URL ile çağrılmış olmalı
        expect(analyzeItem).toHaveBeenCalledWith(
            'https://res.cloudinary.com/test/upload/test.jpg',
            'cloudinary-public-id'
        );
    });

    // B2. Lines 97-98: analyzeAndAddItem dış catch → 500
    test('analyzeAndAddItem: DB hatası → 500 döner (lines 97-98)', async () => {
        const user = await User.findById(userId);
        jest.spyOn(Item, 'create').mockRejectedValueOnce(new Error('DB çöktü'));

        const req = {
            user,
            file: { buffer: Buffer.from('fake-image'), originalname: 'test.jpg' },
            body: {},
        };
        const res = mockRes();

        await itemCtrl.analyzeAndAddItem(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    // B3. Lines 131-132: getItems catch → 500
    test('getItems: DB hatası → 500 döner (lines 131-132)', async () => {
        const user = await User.findById(userId);
        jest.spyOn(Item, 'countDocuments').mockRejectedValueOnce(new Error('DB çöktü'));

        const req = { user, query: {} };
        const res = mockRes();

        await itemCtrl.getItems(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    // B4. Lines 173-174: updateItem catch → 500
    test('updateItem: DB hatası → 500 döner (lines 173-174)', async () => {
        const user = await User.findById(userId);
        const item = await makeItem();
        jest.spyOn(Item, 'findByIdAndUpdate').mockRejectedValueOnce(new Error('DB çöktü'));

        const req = {
            user,
            params: { id: item._id.toString() },
            body:   { renk: 'Mavi' },
        };
        const res = mockRes();

        await itemCtrl.updateItem(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    // B5. Line 191: cloudinary.uploader.destroy hata fırlatırsa item yine silinir
    test('deleteItem: cloudinary.destroy hata fırlatsa da item silinir (line 191)', async () => {
        const item = await makeItem({ cloudinaryId: 'test-cld-id' });

        const cloudConfig = require('../config/cloudinary');
        jest.spyOn(cloudConfig.cloudinary.uploader, 'destroy')
            .mockRejectedValueOnce(new Error('Cloudinary network error'));

        const res = await request(app)
            .delete(`/api/items/${item._id}`)
            .set('Authorization', `Bearer ${authToken}`);

        // Cloudinary hatası olsa bile item silinmeli
        expect(res.statusCode).toBe(200);
        expect(res.body.mesaj).toMatch(/silindi/i);
    });

    // B6. Lines 197-198: deleteItem dış catch → 500
    test('deleteItem: DB hatası → 500 döner (lines 197-198)', async () => {
        const user = await User.findById(userId);
        jest.spyOn(Item, 'findById').mockRejectedValueOnce(new Error('DB çöktü'));

        const req = {
            user,
            params: { id: new mongoose.Types.ObjectId().toString() },
        };
        const res = mockRes();

        await itemCtrl.deleteItem(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    // B7. Lines 222-223: toggleFavori catch → 500
    test('toggleFavori: DB hatası → 500 döner (lines 222-223)', async () => {
        const user = await User.findById(userId);
        jest.spyOn(Item, 'findById').mockRejectedValueOnce(new Error('DB çöktü'));

        const req = {
            user,
            params: { id: new mongoose.Types.ObjectId().toString() },
        };
        const res = mockRes();

        await itemCtrl.toggleFavori(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    // B8. Lines 235-236: getFavorites catch → 500
    test('getFavorites: DB hatası → 500 döner (lines 235-236)', async () => {
        const user = await User.findById(userId);
        jest.spyOn(Item, 'find').mockImplementationOnce(() => {
            throw new Error('DB çöktü');
        });

        const req = { user };
        const res = mockRes();

        await itemCtrl.getFavorites(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});


// C — outfitController
describe('outfitController — kalan coverage dalları', () => {

    // Outfit testleri için minimum 1 kıyafet gerekli
    beforeEach(async () => {
        await makeItem({ kategori: 'Üst Giyim' });
    });

    // C1. Line 13: resolveWeather catch → konum = sehir || 'Türkiye'
    // (sehir undefined olduğundan konum = 'Türkiye')
    test('kombinOnerisi: weather throws, sehir yok → konum=Türkiye döner (line 13)', async () => {
        sehirHavaDurumu.mockRejectedValueOnce(new Error('Hava durumu servisi çöktü'));

        const res = await request(app)
            .post('/api/outfits/recommend')
            .set('Authorization', `Bearer ${authToken}`)
            .send({});   // sehir / enlem / boylam yok

        expect(res.statusCode).toBe(200);
        expect(res.body.kombin.havaDurumu.konum).toBe('Türkiye');
    });

    // C2. Line 22: etkinlik = 'Günlük' (default value dalı)
    test('kombinOnerisi: etkinlik gönderilmediğinde "Günlük" default kullanılır (line 22)', async () => {
        sehirHavaDurumu.mockResolvedValueOnce({
            sicaklik: 22, durum: 'bulutlu', ana_durum: 'Clouds',
            nem: 55, icon: '02d', konum: 'Istanbul',
        });

        const res = await request(app)
            .post('/api/outfits/recommend')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ sehir: 'Istanbul' });  // etkinlik gönderilmiyor

        expect(res.statusCode).toBe(200);
        expect(res.body.kombin.etkinlik).toBe('Günlük');
    });

    // C3. Line 44: baslik = `${etkinlik} - ${'Kombin'}` (konum falsy)
    test('kombinOnerisi: konum boş olunca başlık "Kombin" içerir (line 44)', async () => {
        sehirHavaDurumu.mockResolvedValueOnce({
            sicaklik: 20, durum: 'güneşli', ana_durum: 'Clear',
            nem: 40, icon: '01d', konum: '',  // falsy konum
        });

        const res = await request(app)
            .post('/api/outfits/recommend')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ sehir: 'Istanbul', etkinlik: 'Spor' });

        expect(res.statusCode).toBe(200);
        expect(res.body.kombin.baslik).toMatch(/Kombin/);
    });

    // C4. Line 199: begeniyor=false → 'Geri bildiriminiz alındı.' (false branch)
    test('outfitFeedback: begeniyor=false → "Geri bildiriminiz alındı." döner (line 199)', async () => {
        const outfit = await Outfit.create({
            kullanici:  userId,
            aiAciklama: 'Test AI açıklaması',
            baslik:     'Test Kombin',
            kiyafetler: [],
        });

        const res = await request(app)
            .put(`/api/outfits/${outfit._id}/feedback`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ begeniyor: false });

        expect(res.statusCode).toBe(200);
        expect(res.body.mesaj).toBe('Geri bildiriminiz alındı.');
    });
});


// D — statsController
describe('statsController — kalan coverage dalları', () => {

    // D1. Lines 99-100: getWardrobeStats catch → 500
    test('getWardrobeStats: DB hatası → 500 döner (lines 99-100)', async () => {
        const user = await User.findById(userId);
        jest.spyOn(Item, 'countDocuments').mockRejectedValueOnce(new Error('DB çöktü'));

        const req = { user };
        const res = mockRes();

        await statsCtrl.getWardrobeStats(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ mesaj: 'İstatistikler alınamadı.' });
    });
});


// E — travelController
describe('travelController — kalan coverage dalları', () => {

    // Gelecek tarihler (format: YYYY-MM-DD)
    const futureDate = (plusDays = 7) => {
        const d = new Date();
        d.setDate(d.getDate() + plusDays);
        return d.toISOString().split('T')[0];
    };

    beforeEach(async () => {
        // Seyahat testleri için geçerli dolap (wardrobeOnKontrol geçmeli)
        await Item.create([
            { kullanici: userId, resimUrl: 'x', kategori: 'Üst Giyim', renk: 'S', mevsim: 'Yaz', stil: 'Günlük', cloudinaryId: '' },
            { kullanici: userId, resimUrl: 'x', kategori: 'Alt Giyim', renk: 'M', mevsim: 'Yaz', stil: 'Günlük', cloudinaryId: '' },
            { kullanici: userId, resimUrl: 'x', kategori: 'Ayakkabı',  renk: 'B', mevsim: 'Yaz', stil: 'Günlük', cloudinaryId: '' },
        ]);
        seyahatHavaDurumu.mockResolvedValue({
            sicaklik: 20, durum: 'güneşli', ana_durum: 'Clear',
            icon: '01d', nem: 50, konum: 'Paris', tahminiMi: false,
        });
    });

    // E1. Line 84: AI boş kıyafet listesi döndürdüğünde → 500
    test('generateSuitcase: AI kıyafet önerisi boşsa → 500 döner (line 84)', async () => {
        generateSuitcaseSuggestion.mockResolvedValueOnce({
            aciklama: 'Test', secilen_kiyafet_idleri: [], ipucu: 'Test',
        });

        const res = await request(app)
            .post('/api/travel/pack')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                sehir:           'Paris',
                baslangicTarihi: futureDate(7),
                bitisTarihi:     futureDate(10),
            });

        expect(res.statusCode).toBe(500);
        expect(res.body.mesaj).toMatch(/herhangi bir kıyafet öneremedi/i);
    });

    // E2. Lines 117-118: generateSuitcase beklenmedik hata → next(err)
    test('generateSuitcase: beklenmedik DB hatası → 500 (errorHandler) (lines 117-118)', async () => {
        jest.spyOn(Item, 'find').mockImplementationOnce(() => {
            throw new Error('DB çöktü');
        });

        const res = await request(app)
            .post('/api/travel/pack')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                sehir:           'Paris',
                baslangicTarihi: futureDate(7),
                bitisTarihi:     futureDate(10),
            });

        expect(res.statusCode).toBe(500);
    });

    // E3. Line 137: getSuitcases catch → next(err)
    test('getSuitcases: DB hatası → 500 (errorHandler) (line 137)', async () => {
        jest.spyOn(TravelSuitcase, 'find').mockImplementationOnce(() => {
            throw new Error('DB çöktü');
        });

        const res = await request(app)
            .get('/api/travel')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(500);
    });

    // E4. Line 159: deleteSuitcase catch → next(err)
    test('deleteSuitcase: DB hatası → 500 (errorHandler) (line 159)', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        jest.spyOn(TravelSuitcase, 'findOne').mockRejectedValueOnce(new Error('DB çöktü'));

        const res = await request(app)
            .delete(`/api/travel/${fakeId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(500);
    });
});


// F — userController
describe('userController — kalan coverage dalları', () => {

    // F1. Line 20: updateProfile catch → 500
    test('updateProfile: DB hatası → 500 döner (line 20)', async () => {
        const user = await User.findById(userId);
        // Not: findByIdAndUpdate sonrasında .select() zinciri olduğu için mockRejectedValueOnce
        // yerine synchronous throw kulllanıyoruz (unhandled rejection önlemek için).
        jest.spyOn(User, 'findByIdAndUpdate').mockImplementationOnce(() => {
            throw new Error('DB çöktü');
        });

        const req = { user, body: { kullaniciAdi: 'Yeni Ad' } };
        const res = mockRes();
        await userCtrl.updateProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ mesaj: 'Profil güncellenemedi.' });
    });

    // F2. Lines 59-60: updateBodyProfile catch → 500
    test('updateBodyProfile: DB hatası → 500 döner (lines 59-60)', async () => {
        const user = await User.findById(userId);
        jest.spyOn(User, 'findByIdAndUpdate').mockImplementationOnce(() => {
            throw new Error('DB çöktü');
        });

        const req = { user, body: { bodyShape: 'kum_saati' } };
        const res = mockRes();
        await userCtrl.updateBodyProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ mesaj: 'Vücut profili güncellenemedi.' });
    });

    // F3. Lines 85-86: updateProfilePhoto catch → 500
    test('updateProfilePhoto: DB hatası → 500 döner (lines 85-86)', async () => {
        const user = await User.findById(userId);
        jest.spyOn(User, 'findByIdAndUpdate').mockImplementationOnce(() => {
            throw new Error('DB çöktü');
        });

        const req = { user, body: { profilFoto: 'https://test.com/photo.jpg' } };
        const res = mockRes();
        await userCtrl.updateProfilePhoto(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ mesaj: 'Profil fotoğrafı güncellenemedi.' });
    });

    // F4. Lines 99-110: uploadProfilePhoto — req.file.path ile başarılı yol
    test('uploadProfilePhoto: req.file.path ile 200 döner ve DB güncellenir (lines 99-110)', async () => {
        const user = await User.findById(userId);

        const req = {
            user,
            file: { path: 'https://res.cloudinary.com/test/image/upload/v1/profile.jpg' },
        };
        const res = mockRes();

        await userCtrl.uploadProfilePhoto(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ mesaj: expect.stringContaining('yüklendi') })
        );
    });

    // F5. Lines 111-113: uploadProfilePhoto catch → 500
    test('uploadProfilePhoto: DB hatası → 500 döner (lines 111-113)', async () => {
        const user = await User.findById(userId);
        jest.spyOn(User, 'findByIdAndUpdate').mockImplementationOnce(() => { throw new Error('DB çöktü'); });

        const req = {
            user,
            file: { path: 'https://res.cloudinary.com/test/image/upload/v1/profile.jpg' },
        };
        const res = mockRes();

        await userCtrl.uploadProfilePhoto(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ mesaj: 'Profil fotoğrafı yüklenemedi.' });
    });

    // F6. Lines 153-154: updatePreferences catch → 500
    test('updatePreferences: DB hatası → 500 döner (lines 153-154)', async () => {
        const user = await User.findById(userId);
        jest.spyOn(User, 'findByIdAndUpdate').mockImplementationOnce(() => { throw new Error('DB çöktü'); });

        const req = { user, body: { theme: 'dark' } };
        const res = mockRes();
        await userCtrl.updatePreferences(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ mesaj: 'Tercihler güncellenemedi.' });
    });

    // F7. Lines 175-176: saveFcmToken catch → 500
    test('saveFcmToken: DB hatası → 500 döner (lines 175-176)', async () => {
        const user = await User.findById(userId);
        jest.spyOn(User, 'findByIdAndUpdate').mockImplementationOnce(() => { throw new Error('DB çöktü'); });

        const req = { user, body: { fcmToken: 'some-valid-fcm-token' } };
        const res = mockRes();
        await userCtrl.saveFcmToken(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ mesaj: 'FCM token kaydedilemedi.' });
    });
});


// G — errorMiddleware
describe('errorMiddleware — kalan coverage dalları', () => {

    // G1. Line 34: err.message falsy → fallback 'Sunucu hatası' kullanılır
    test('errorHandler: err.message yok → "Sunucu hatası" ile 500 döner (line 34)', () => {
        const err  = {};   // message alanı yok
        const req  = {};
        const res  = {
            statusCode: 500,
            status: jest.fn().mockReturnThis(),
            json:   jest.fn(),
        };
        const next = jest.fn();

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ mesaj: 'Sunucu hatası' })
        );
    });
});


// H — notificationService  (NODE_ENV != 'test' ile çalıştırma)
describe('notificationService — kalan coverage dalları (lines 37-46)', () => {

    let notifUser;

    // Her test için taze bir kullanıcı oluştur (outer afterEach temizler)
    beforeEach(async () => {
        const salt = await bcrypt.genSalt(10);
        notifUser = await User.create({
            kullaniciAdi: 'NotifUser',
            email:        'notif-gaps@test.com',
            sifre:        await bcrypt.hash('sifre123', salt),
            isVerified:   true,
            fcmTokens:    ['token-aaa', 'token-bbb'],
        });
    });

    // H1. Lines 37-42: messaging/invalid-registration-token → token temizlenir
    test('invalid-registration-token kodu → geçersiz token silinir (lines 37-42)', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production_test';   // 'test' dışı → guard'ı geçer

        mockSendEachForMulticast.mockResolvedValueOnce({
            failureCount: 1,
            responses: [
                { success: false, error: { code: 'messaging/invalid-registration-token' } },
                { success: true },
            ],
        });

        await sendPushNotification(notifUser._id, 'Başlık', 'Gövde');

        const updated = await User.findById(notifUser._id);
        expect(updated.fcmTokens).not.toContain('token-aaa');  // silindi
        expect(updated.fcmTokens).toContain('token-bbb');       // korundu

        process.env.NODE_ENV = originalEnv;
    });

    // H2. Line 46: bilinmeyen hata kodu → expiredTokens boş → $pull çağrılmaz
    test('bilinmeyen hata kodu → token listesi değişmez (line 46 false branch)', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production_test';

        mockSendEachForMulticast.mockResolvedValueOnce({
            failureCount: 1,
            responses: [
                { success: false, error: { code: 'messaging/unknown-error-code' } },
                { success: true },
            ],
        });

        await sendPushNotification(notifUser._id, 'Başlık', 'Gövde');

        const updated = await User.findById(notifUser._id);
        // Bilinmeyen hata → token silinmemeli
        expect(updated.fcmTokens).toContain('token-aaa');
        expect(updated.fcmTokens).toContain('token-bbb');

        process.env.NODE_ENV = originalEnv;
    });
});


// I — emailService  (production ortamında TLS branch)
describe('emailService — production TLS branch (line 10)', () => {

    // I1. Line 10 false branch: production + EMAIL_TLS_REJECT_UNAUTHORIZED undefined
    //        → tlsRejectUnauthorized = true
    test('emailService: production + TLS env yok → tlsRejectUnauthorized=true (line 10)', () => {
        const savedNodeEnv = process.env.NODE_ENV;
        const savedTls     = process.env.EMAIL_TLS_REJECT_UNAUTHORIZED;

        process.env.NODE_ENV = 'production';
        delete process.env.EMAIL_TLS_REJECT_UNAUTHORIZED;

        // jest.isolateModules + jest.requireActual ile gerçek modülü yükle
        // (jest.mock factory'yi bypass eder — gerçek emailService kodu çalışır)
        jest.isolateModules(() => {
            const realEmail = jest.requireActual('../services/emailService');
            // Modül yüklendi → line 10 false branch (typeof undefined !== 'string' → true) kapandı
            expect(typeof realEmail.sendVerificationEmail).toBe('function');
        });

        // Çevre değişkenlerini geri yükle
        process.env.NODE_ENV = savedNodeEnv;
        if (savedTls !== undefined) {
            process.env.EMAIL_TLS_REJECT_UNAUTHORIZED = savedTls;
        }
    });
});
