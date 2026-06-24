/**
 * coverage-gaps-2.test.js
 *
 * Kalan küçük coverage boşluklarını kapatmak için ek test suite.
 *
 * Kapsanan dosyalar / satırlar:
 *   authController : 58  (registerUser — verified User var, unverified yok → 400)
 *   itemController : 37-38 (analyzeOnly dış catch), 50 (analyzeAndAddItem dosya yok),
 *                    150 (getItemById başarı/200)
 *   statsController: 86  (kategoriDagilimi yüzde hesaplama — toplamKiyafet=0 dalı)
 *   userController : 12-16 (updateProfile — geçersiz cinsiyet → 400)
 */

jest.mock('../services/emailService', () => ({
    sendVerificationEmail:  jest.fn().mockResolvedValue({ accepted: ['gaps2@test.com'], rejected: [] }),
    sendPasswordResetEmail: jest.fn().mockResolvedValue({ accepted: ['gaps2@test.com'], rejected: [] }),
}));

jest.mock('../services/aiService', () => ({
    analyzeItem: jest.fn().mockResolvedValue({
        kategori: 'Üst Giyim', renk: '#000000', aiDogrulandi: true,
    }),
    wardrobeOnKontrol:        jest.requireActual('../services/aiService').wardrobeOnKontrol,
    generateOutfitSuggestion: jest.fn(),
    generateSuitcaseSuggestion: jest.fn(),
    generateWeatherNotificationText: jest.fn(),
}));

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../models/User');
const Item = require('../models/Item');

const authCtrl  = require('../controllers/authController');
const itemCtrl  = require('../controllers/itemController');
const statsCtrl = require('../controllers/statsController');
const userCtrl  = require('../controllers/userController');

let mongoServer;
let userDoc;

/** Fake res nesnesi — direkt controller çağrıları için */
const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
};

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    userDoc = await User.create({
        kullaniciAdi: 'Gaps2User',
        email:        'gaps2@test.com',
        sifre:        'sifre123456',
        isVerified:   true,
    });
});

afterEach(() => {
    jest.restoreAllMocks();
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
});


// authController — line 58
describe('authController — register kalan dal (line 58)', () => {
    test('isVerified=false User yok ama isVerified=true User varsa → 400 (line 58)', async () => {
        jest.spyOn(User, 'findOne')
            .mockResolvedValueOnce(null)                          // line 46: existingUser → yok
            .mockResolvedValueOnce({ _id: 'x', isVerified: true }); // line 56: verifiedUser → var

        const req = { body: { kullaniciAdi: 'YeniKullanici', email: 'verified-gaps2@test.com', sifre: 'sifre123' } };
        const res = mockRes();

        await authCtrl.registerUser(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ mesaj: expect.stringContaining('zaten kullanımda') })
        );
    });
});


// itemController — lines 37-38, 50, 150
describe('itemController — kalan dallar', () => {

    test('analyzeOnly: res.status ilk çağrıda hata fırlatırsa dış catch 500 döner (lines 37-38)', async () => {
        const req = { file: { buffer: Buffer.from('fake-image'), originalname: 'a.jpg' } };
        const res = {};
        let callCount = 0;
        res.status = jest.fn(() => {
            callCount++;
            if (callCount === 1) throw new Error('res.status patladı');
            return res;
        });
        res.json = jest.fn().mockReturnValue(res);

        await itemCtrl.analyzeOnly(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ mesaj: expect.stringContaining('hata') })
        );
    });

    test('analyzeAndAddItem: req.file yoksa 400 döner (line 50)', async () => {
        const req = { file: undefined, body: {}, user: { _id: userDoc._id } };
        const res = mockRes();

        await itemCtrl.analyzeAndAddItem(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ mesaj: expect.stringContaining('fotoğraf') })
        );
    });

    test('getItemById: kullanıcının kendi kıyafetini başarıyla getirir (line 150)', async () => {
        const item = await Item.create({
            kullanici:    userDoc._id,
            resimUrl:     'http://x.com/img.jpg',
            kategori:     'Üst Giyim',
            renk:         'Siyah',
            mevsim:       'Yaz',
            stil:         'Günlük',
            cloudinaryId: '',
        });

        const req = { params: { id: item._id.toString() }, user: { _id: userDoc._id } };
        const res = mockRes();

        await itemCtrl.getItemById(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const payload = res.json.mock.calls[0][0];
        expect(payload.kiyafet._id.toString()).toBe(item._id.toString());

        await Item.deleteOne({ _id: item._id });
    });
});


// statsController — line 86
describe('statsController — kategoriDagilimi yüzde hesaplama (line 86)', () => {
    test('toplamKiyafet=0 iken kategoriDagilimi dolu ise yuzde=0 döner (line 86 false dalı)', async () => {
        jest.spyOn(Item, 'countDocuments').mockResolvedValueOnce(0); // toplamKiyafet
        jest.spyOn(Item, 'aggregate').mockResolvedValueOnce([
            { _id: 'Üst Giyim', adet: 2 },
        ]); // kategoriDagilimi

        const req = { user: { _id: userDoc._id } };
        const res = mockRes();

        await statsCtrl.getWardrobeStats(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const payload = res.json.mock.calls[0][0];
        expect(payload.istatistikler.kategoriDagilimi[0]).toEqual(
            expect.objectContaining({ ad: 'Üst Giyim', adet: 2, yuzde: 0 })
        );
    });
});


// userController — lines 12-16
describe('userController — updateProfile geçersiz cinsiyet (lines 12-16)', () => {
    test('cinsiyet geçerli enum dışında ise 400 döner', async () => {
        const req = {
            user: { _id: userDoc._id },
            body: { kullaniciAdi: 'Test', tercihler: {}, cinsiyet: 'Robot' },
        };
        const res = mockRes();

        await userCtrl.updateProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ mesaj: expect.stringContaining('cinsiyet') })
        );
    });
});
