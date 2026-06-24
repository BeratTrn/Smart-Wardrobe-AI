/**
 * coverage-gaps-3.test.js
 *
 * authController, itemController, travelController, userController içindeki
 * kalan branch coverage boşluklarını kapatır.
 *
 * Bu dosya MongoMemoryServer / mongoose.connect KULLANMAZ — modeller jest.mock
 * ile mock'lanır, controller'lar fonksiyonlar olarak doğrudan çağrılır.
 *
 * Kapsanan dosyalar / satırlar:
 *   authController   : 263-264 (loginUser theme/language ?? fallback),
 *                       285-296 (getMe ?? fallback'leri),
 *                       331 (forgotPassword RESET_BASE_URL || ...),
 *                       485, 488-501 (googleAuth: profilFoto atama, yeni kullanıcı oluşturma dalları)
 *   itemController   : 67 (analyzeAndAddItem — req.file.path dalı),
 *                       116-117 (getItems — favori filtresi),
 *                       170 (updateItem — cinsiyet update)
 *   travelController : 90-100 (generateSuitcase — TravelSuitcase.create alanları)
 *   userController   : 16 (updateProfile — geçerli cinsiyet ataması)
 */

jest.mock('../models/User');
jest.mock('../models/Item');
jest.mock('../models/TravelSuitcase');

jest.mock('../services/aiService', () => ({
    analyzeItem: jest.fn(),
    wardrobeOnKontrol: jest.requireActual('../services/aiService').wardrobeOnKontrol,
    generateSuitcaseSuggestion: jest.fn(),
    generateOutfitSuggestion: jest.fn(),
    generateWeatherNotificationText: jest.fn(),
}));

jest.mock('../services/weatherService', () => ({
    havaDurumuGetir: jest.fn(),
    sehirHavaDurumu: jest.fn(),
    seyahatHavaDurumu: jest.fn(),
}));

const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
    OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken })),
}));

jest.mock('bcryptjs', () => ({
    genSalt: jest.fn().mockResolvedValue('salt'),
    hash:    jest.fn().mockResolvedValue('hashed-pass'),
    compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('../services/emailService', () => ({
    sendVerificationEmail:  jest.fn(),
    sendPasswordResetEmail: jest.fn().mockResolvedValue({ accepted: ['forgot@test.com'], rejected: [] }),
}));

// authController içindeki tokenUret() jwt.sign çağırır — JWT_SECRET tanımlı olmalı
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-coverage-gaps-3';

const User           = require('../models/User');
const Item           = require('../models/Item');
const TravelSuitcase = require('../models/TravelSuitcase');

const { analyzeItem, generateSuitcaseSuggestion } = require('../services/aiService');
const { seyahatHavaDurumu } = require('../services/weatherService');

const authCtrl   = require('../controllers/authController');
const itemCtrl   = require('../controllers/itemController');
const travelCtrl = require('../controllers/travelController');
const userCtrl   = require('../controllers/userController');

/** Fake res nesnesi */
const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
};

const FAKE_USER_ID = '507f1f77bcf86cd799439011';

afterEach(() => {
    jest.clearAllMocks();
});

// ============================================================
// authController — loginUser (satır 263-264)
// ============================================================
describe('authController.loginUser — theme/language ?? dalları (263-264)', () => {
    const baseUser = {
        _id: FAKE_USER_ID,
        kullaniciAdi: 'TestUser',
        email: 'login@test.com',
        sifre: 'hashed-pass',
        tercihler: { favoriStil: 'Günlük' },
        isVerified: true,
    };

    test('user.theme ve user.language TANIMLIYSA bunlar kullanılır', async () => {
        User.findOne = jest.fn().mockResolvedValue({
            ...baseUser,
            theme: 'light',
            language: 'en',
        });

        const req = { body: { email: 'login@test.com', sifre: 'sifre123' } };
        const res = mockRes();

        await authCtrl.loginUser(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const payload = res.json.mock.calls[0][0];
        expect(payload.kullanici.theme).toBe('light');
        expect(payload.kullanici.language).toBe('en');
    });

    test('user.theme ve user.language TANIMSIZSA varsayılan dark/tr kullanılır', async () => {
        User.findOne = jest.fn().mockResolvedValue({
            ...baseUser,
            theme: undefined,
            language: undefined,
        });

        const req = { body: { email: 'login@test.com', sifre: 'sifre123' } };
        const res = mockRes();

        await authCtrl.loginUser(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const payload = res.json.mock.calls[0][0];
        expect(payload.kullanici.theme).toBe('dark');
        expect(payload.kullanici.language).toBe('tr');
    });
});

// ============================================================
// authController — getMe (satır 285-296)
// ============================================================
describe('authController.getMe — ?? varsayılan dalları (285-296)', () => {
    test('req.user alanları TANIMLIYSA bunlar kullanılır', async () => {
        const req = {
            user: {
                _id: FAKE_USER_ID,
                kullaniciAdi: 'TestUser',
                email: 'getme@test.com',
                profilFoto: 'https://example.com/foto.jpg',
                tercihler: { favoriStil: 'Klasik' },
                theme: 'light',
                language: 'en',
                vucut: { sekil: 'kum_saati', kalip: 'slim' },
                cinsiyet: 'Kadın',
                defaultCity: 'Ankara',
                notificationPreferences: {
                    dailyWeatherAI: false,
                    travelReminders: false,
                    weeklyStyle: false,
                },
                createdAt: new Date('2024-01-01'),
            },
        };
        const res = mockRes();

        await authCtrl.getMe(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const { kullanici } = res.json.mock.calls[0][0];
        expect(kullanici.profilFoto).toBe('https://example.com/foto.jpg');
        expect(kullanici.theme).toBe('light');
        expect(kullanici.language).toBe('en');
        expect(kullanici.cinsiyet).toBe('Kadın');
        expect(kullanici.defaultCity).toBe('Ankara');
        expect(kullanici.notificationPreferences).toEqual({
            dailyWeatherAI: false,
            travelReminders: false,
            weeklyStyle: false,
        });
    });

    test('req.user alanları TANIMSIZSA varsayılan değerler kullanılır', async () => {
        const req = {
            user: {
                _id: FAKE_USER_ID,
                kullaniciAdi: 'TestUser',
                email: 'getme2@test.com',
                profilFoto: undefined,
                tercihler: { favoriStil: 'Günlük' },
                theme: undefined,
                language: undefined,
                vucut: undefined,
                cinsiyet: undefined,
                defaultCity: undefined,
                notificationPreferences: undefined,
                createdAt: new Date('2024-01-01'),
            },
        };
        const res = mockRes();

        await authCtrl.getMe(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const { kullanici } = res.json.mock.calls[0][0];
        expect(kullanici.profilFoto).toBe('');
        expect(kullanici.theme).toBe('dark');
        expect(kullanici.language).toBe('tr');
        expect(kullanici.cinsiyet).toBe('Belirtilmemiş');
        expect(kullanici.defaultCity).toBe('Istanbul');
        expect(kullanici.notificationPreferences).toEqual({
            dailyWeatherAI: true,
            travelReminders: true,
            weeklyStyle: true,
        });
    });
});

// ============================================================
// authController — forgotPassword (satır 331)
// ============================================================
describe('authController.forgotPassword — RESET_BASE_URL || ... dalı (331)', () => {
    const fakeUser = () => ({
        _id: FAKE_USER_ID,
        email: 'forgot@test.com',
        kullaniciAdi: 'ForgotUser',
        getResetPasswordToken: jest.fn().mockReturnValue('raw-reset-token'),
        save: jest.fn().mockResolvedValue(undefined),
    });

    let originalResetBaseUrl;

    beforeEach(() => {
        originalResetBaseUrl = process.env.RESET_BASE_URL;
        User.findOne = jest.fn().mockResolvedValue(fakeUser());
    });

    afterEach(() => {
        if (originalResetBaseUrl === undefined) {
            delete process.env.RESET_BASE_URL;
        } else {
            process.env.RESET_BASE_URL = originalResetBaseUrl;
        }
    });

    test('RESET_BASE_URL tanımlıysa onu kullanır', async () => {
        process.env.RESET_BASE_URL = 'https://reset.example.com';

        const req = {
            body: { email: 'forgot@test.com' },
            protocol: 'http',
            get: jest.fn().mockReturnValue('localhost:5000'),
        };
        const res = mockRes();

        await authCtrl.forgotPassword(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('RESET_BASE_URL tanımsızsa req.protocol + req.get host kullanılır', async () => {
        delete process.env.RESET_BASE_URL;

        const req = {
            body: { email: 'forgot@test.com' },
            protocol: 'http',
            get: jest.fn().mockReturnValue('localhost:5000'),
        };
        const res = mockRes();

        await authCtrl.forgotPassword(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(req.get).toHaveBeenCalledWith('host');
    });
});

// ============================================================
// authController — googleAuth (satır 485, 488-501)
// ============================================================
describe('authController.googleAuth — profilFoto ataması ve yeni kullanıcı oluşturma (485, 488-501)', () => {
    test('Mevcut kullanıcı, googleId YOK, picture VAR, profilFoto YOK -> profilFoto atanır (485 true dal)', async () => {
        const existingUser = {
            _id: FAKE_USER_ID,
            googleId: undefined,
            profilFoto: '',
            kullaniciAdi: 'Existing',
            email: 'existing@test.com',
            save: jest.fn().mockResolvedValue(undefined),
        };
        User.findOne = jest.fn().mockResolvedValue(existingUser);

        mockVerifyIdToken.mockResolvedValueOnce({
            getPayload: () => ({
                sub: 'google-sub-1',
                email: 'existing@test.com',
                name: 'Existing User',
                picture: 'https://example.com/pic.jpg',
            }),
        });

        const req = { body: { idToken: 'valid-token' } };
        const res = mockRes();

        await authCtrl.googleAuth(req, res);

        expect(existingUser.googleId).toBe('google-sub-1');
        expect(existingUser.profilFoto).toBe('https://example.com/pic.jpg');
        expect(existingUser.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('Mevcut kullanıcı, googleId YOK, picture YOK -> profilFoto atanmaz (485 false dal)', async () => {
        const existingUser = {
            _id: FAKE_USER_ID,
            googleId: undefined,
            profilFoto: 'mevcut-foto.jpg',
            kullaniciAdi: 'Existing2',
            email: 'existing2@test.com',
            save: jest.fn().mockResolvedValue(undefined),
        };
        User.findOne = jest.fn().mockResolvedValue(existingUser);

        mockVerifyIdToken.mockResolvedValueOnce({
            getPayload: () => ({
                sub: 'google-sub-2',
                email: 'existing2@test.com',
                name: 'Existing User 2',
                picture: null,
            }),
        });

        const req = { body: { idToken: 'valid-token' } };
        const res = mockRes();

        await authCtrl.googleAuth(req, res);

        expect(existingUser.googleId).toBe('google-sub-2');
        expect(existingUser.profilFoto).toBe('mevcut-foto.jpg');
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('Mevcut kullanıcı, profilFoto VAR, picture VAR -> profilFoto degismez (485 false dal)', async () => {
        const existingUser = {
            _id: FAKE_USER_ID,
            googleId: undefined,
            profilFoto: 'eski-foto.jpg',
            kullaniciAdi: 'Existing3',
            email: 'existing3@test.com',
            save: jest.fn().mockResolvedValue(undefined),
        };
        User.findOne = jest.fn().mockResolvedValue(existingUser);

        mockVerifyIdToken.mockResolvedValueOnce({
            getPayload: () => ({
                sub: 'google-sub-3',
                email: 'existing3@test.com',
                name: 'Existing User 3',
                picture: 'https://example.com/yeni-foto.jpg',
            }),
        });

        const req = { body: { idToken: 'valid-token' } };
        const res = mockRes();

        await authCtrl.googleAuth(req, res);

        expect(existingUser.profilFoto).toBe('eski-foto.jpg');
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('Yeni kullanici (googleId VE email ile bulunamadi) -> name/picture VARSA bunlar kullanilir (488-501)', async () => {
        User.findOne = jest.fn().mockResolvedValue(null);
        User.create  = jest.fn().mockResolvedValue({
            _id: FAKE_USER_ID,
            kullaniciAdi: 'Yeni Kullanici',
            email: 'yenikullanici@test.com',
            profilFoto: 'https://example.com/yeni.jpg',
        });

        mockVerifyIdToken.mockResolvedValueOnce({
            getPayload: () => ({
                sub: 'google-sub-new',
                email: 'yenikullanici@test.com',
                name: 'Yeni Kullanici',
                picture: 'https://example.com/yeni.jpg',
            }),
        });

        const req = { body: { idToken: 'valid-token' } };
        const res = mockRes();

        await authCtrl.googleAuth(req, res);

        expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
            kullaniciAdi: 'Yeni Kullanici',
            email: 'yenikullanici@test.com',
            googleId: 'google-sub-new',
            profilFoto: 'https://example.com/yeni.jpg',
            isVerified: true,
        }));
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('Yeni kullanici -> name/picture YOKSA email-prefix ve bos string kullanilir (488-501 || dallari)', async () => {
        User.findOne = jest.fn().mockResolvedValue(null);
        User.create  = jest.fn().mockResolvedValue({
            _id: FAKE_USER_ID,
            kullaniciAdi: 'isimsiz',
            email: 'isimsiz@test.com',
            profilFoto: '',
        });

        mockVerifyIdToken.mockResolvedValueOnce({
            getPayload: () => ({
                sub: 'google-sub-noname',
                email: 'isimsiz@test.com',
                name: undefined,
                picture: undefined,
            }),
        });

        const req = { body: { idToken: 'valid-token' } };
        const res = mockRes();

        await authCtrl.googleAuth(req, res);

        expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
            kullaniciAdi: 'isimsiz',
            email: 'isimsiz@test.com',
            googleId: 'google-sub-noname',
            profilFoto: '',
            isVerified: true,
        }));
        expect(res.status).toHaveBeenCalledWith(200);
    });
});

// ============================================================
// itemController — analyzeAndAddItem (satır 67 — req.file.path dalı)
// ============================================================
describe('itemController.analyzeAndAddItem — req.file.path dali (cloudinary storage, satir 67)', () => {
    test('req.file.buffer YOK ama req.file.path VARSA analyzeItem(path, filename) cagrilir', async () => {
        analyzeItem.mockResolvedValueOnce({
            kategori: 'Üst Giyim',
            renk: '#112233',
            aiDogrulandi: true,
        });

        Item.create = jest.fn().mockResolvedValue({
            _id: FAKE_USER_ID,
            kategori: 'Üst Giyim',
            renk: '#112233',
        });

        const req = {
            file: {
                path: 'https://res.cloudinary.com/test/image/upload/v1/abc.jpg',
                filename: 'abc',
            },
            body: {},
            user: { _id: FAKE_USER_ID },
        };
        const res = mockRes();

        await itemCtrl.analyzeAndAddItem(req, res);

        expect(analyzeItem).toHaveBeenCalledWith(
            'https://res.cloudinary.com/test/image/upload/v1/abc.jpg',
            'abc'
        );
        expect(res.status).toHaveBeenCalledWith(201);
    });
});

// ============================================================
// itemController — getItems (satır 116-117 — favori filtresi)
// ============================================================
describe('itemController.getItems — favori filtresi (116-117)', () => {
    beforeEach(() => {
        Item.find = jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue([]),
                }),
            }),
        });
        Item.countDocuments = jest.fn().mockResolvedValue(0);
    });

    test('favori=true -> filtre.favori = true (116)', async () => {
        const req = { query: { favori: 'true' }, user: { _id: FAKE_USER_ID } };
        const res = mockRes();

        await itemCtrl.getItems(req, res);

        expect(Item.find).toHaveBeenCalledWith(expect.objectContaining({ favori: true }));
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('favori=false -> filtre.favori = false (117)', async () => {
        const req = { query: { favori: 'false' }, user: { _id: FAKE_USER_ID } };
        const res = mockRes();

        await itemCtrl.getItems(req, res);

        expect(Item.find).toHaveBeenCalledWith(expect.objectContaining({ favori: false }));
        expect(res.status).toHaveBeenCalledWith(200);
    });
});

// ============================================================
// itemController — updateItem (satır 170 — cinsiyet update)
// ============================================================
describe('itemController.updateItem — cinsiyet guncelleme dali (170)', () => {
    test('req.body.cinsiyet TANIMLIYSA update.cinsiyet atanir', async () => {
        const existingItem = {
            _id: FAKE_USER_ID,
            kullanici: { toString: () => FAKE_USER_ID },
        };
        Item.findById = jest.fn().mockResolvedValue(existingItem);
        Item.findByIdAndUpdate = jest.fn().mockResolvedValue({
            _id: FAKE_USER_ID,
            cinsiyet: 'Kadın',
        });

        const req = {
            params: { id: FAKE_USER_ID },
            body: { kategori: 'Üst Giyim', renk: 'Siyah', mevsim: 'Yaz', stil: 'Günlük', cinsiyet: 'Kadın' },
            user: { _id: { toString: () => FAKE_USER_ID } },
        };
        const res = mockRes();

        await itemCtrl.updateItem(req, res);

        expect(Item.findByIdAndUpdate).toHaveBeenCalledWith(
            FAKE_USER_ID,
            expect.objectContaining({ cinsiyet: 'Kadın' }),
            { new: true, runValidators: true }
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });
});

// ============================================================
// travelController — generateSuitcase (satır 90-100)
// ============================================================
describe('travelController.generateSuitcase — TravelSuitcase.create alanlari (90-100)', () => {
    const validWardrobe = [
        { _id: 'item-ust',  kategori: 'Üst Giyim', renk: 'Siyah',   mevsim: 'Yaz', stil: 'Günlük' },
        { _id: 'item-alt',  kategori: 'Alt Giyim', renk: 'Lacivert', mevsim: 'Yaz', stil: 'Günlük' },
        { _id: 'item-ayak', kategori: 'Ayakkabı',  renk: 'Beyaz',   mevsim: 'Yaz', stil: 'Günlük' },
    ];

    const baseReq = () => ({
        body: {
            sehir: 'Roma',
            baslangicTarihi: new Date(Date.now() + 86400000).toISOString(),
            bitisTarihi: new Date(Date.now() + 3 * 86400000).toISOString(),
        },
        user: { _id: FAKE_USER_ID },
    });

    beforeEach(() => {
        Item.find = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(validWardrobe) });
        generateSuitcaseSuggestion.mockResolvedValue({
            secilen_kiyafet_idleri: ['item-ust', 'item-alt', 'item-ayak'],
            aciklama: 'AI açıklaması',
            ipucu: 'AI ipucu',
        });
        TravelSuitcase.create = jest.fn().mockResolvedValue({ _id: 'bavul-1' });
        TravelSuitcase.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue({ _id: 'bavul-1', sehir: 'Roma' }),
        });
    });

    test('hava.konum VAR, hava.tahminiMi VAR, aciklama/ipucu VAR -> bunlar direkt kullanilir', async () => {
        seyahatHavaDurumu.mockResolvedValue({
            sicaklik: 22,
            durum: 'güneşli',
            icon: '01d',
            nem: 40,
            konum: 'Rome',
            tahminiMi: true,
        });

        const req = baseReq();
        const res = mockRes();
        const next = jest.fn();

        await travelCtrl.generateSuitcase(req, res, next);

        expect(TravelSuitcase.create).toHaveBeenCalledWith(expect.objectContaining({
            sehir: 'Rome',
            tahminiHava: true,
            aiAciklamasi: 'AI açıklaması',
            aiIpucu: 'AI ipucu',
        }));
        expect(res.status).toHaveBeenCalledWith(201);
        expect(next).not.toHaveBeenCalled();
    });

    test('hava.konum YOK, hava.tahminiMi TANIMSIZ, aciklama/ipucu YOK -> varsayilanlar kullanilir', async () => {
        seyahatHavaDurumu.mockResolvedValue({
            sicaklik: 18,
            durum: 'bulutlu',
            icon: '02d',
            nem: 55,
            konum: undefined,
            tahminiMi: undefined,
        });

        generateSuitcaseSuggestion.mockResolvedValueOnce({
            secilen_kiyafet_idleri: ['item-ust', 'item-alt', 'item-ayak'],
        });

        const req = baseReq();
        const res = mockRes();
        const next = jest.fn();

        await travelCtrl.generateSuitcase(req, res, next);

        expect(TravelSuitcase.create).toHaveBeenCalledWith(expect.objectContaining({
            sehir: 'Roma',
            tahminiHava: false,
            aiAciklamasi: '',
            aiIpucu: '',
        }));
        expect(res.status).toHaveBeenCalledWith(201);
        expect(next).not.toHaveBeenCalled();
    });
});

// ============================================================
// userController — updateProfile (satır 16 — geçerli cinsiyet ataması)
// ============================================================
describe('userController.updateProfile — gecerli cinsiyet atamasi (16)', () => {
    test('cinsiyet=Erkek (gecerli) -> update.cinsiyet atanir ve kullanici guncellenir', async () => {
        const updatedUser = {
            _id: FAKE_USER_ID,
            kullaniciAdi: 'GuncelUser',
            cinsiyet: 'Erkek',
        };
        User.findByIdAndUpdate = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(updatedUser),
        });

        const req = {
            body: { kullaniciAdi: 'GuncelUser', tercihler: { favoriStil: 'Spor' }, cinsiyet: 'Erkek' },
            user: { _id: FAKE_USER_ID },
        };
        const res = mockRes();

        await userCtrl.updateProfile(req, res);

        expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
            FAKE_USER_ID,
            expect.objectContaining({ $set: expect.objectContaining({ cinsiyet: 'Erkek' }) }),
            { new: true, runValidators: true }
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            kullanici: updatedUser,
        }));
    });
});
