/**
 * web-outfit-controller.test.js
 * POST /api/outfits/web-recommend (webOutfitController.webKombinOnerisi) için
 * uçtan uca testler. webProductService ve webOutfitService mock'lanır
 * (gerçek tarayıcı/AI çağrısı yapılmaz); styleProfileService gerçek DB ile çalışır.
 */

jest.mock('../services/emailService', () => ({
    sendVerificationEmail: jest.fn().mockResolvedValue({
        accepted: ['webrec@test.com'],
        rejected: [],
    }),
}));

jest.mock('../services/weatherService', () => ({
    havaDurumuGetir: jest.fn().mockResolvedValue({
        sicaklik: 10, durum: 'bulutlu', konum: 'Istanbul', nem: 60, ana_durum: 'Clouds', icon: '02d',
    }),
    sehirHavaDurumu: jest.fn().mockResolvedValue({
        sicaklik: 10, durum: 'bulutlu', konum: 'Istanbul', nem: 60, ana_durum: 'Clouds', icon: '02d',
    }),
}));

jest.mock('../services/webProductService', () => ({
    searchProducts: jest.fn().mockResolvedValue([]),
}));

jest.mock('../services/webOutfitService', () => ({
    generateWebOutfitSuggestion: jest.fn(),
}));


const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app, server } = require('../server');
const User = require('../models/User');
const Item = require('../models/Item');
const Outfit = require('../models/Outfit');

const { searchProducts } = require('../services/webProductService');
const { generateWebOutfitSuggestion } = require('../services/webOutfitService');

let mongoServer;
let authToken;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const { sendVerificationEmail } = require('../services/emailService');

    await request(app)
        .post('/api/auth/register')
        .send({ kullaniciAdi: 'WebRecTester', email: 'webrec@test.com', sifre: 'sifre123' });

    const otpCode = sendVerificationEmail.mock.calls[sendVerificationEmail.mock.calls.length - 1][2];
    await request(app).post('/api/auth/verify-email').send({ email: 'webrec@test.com', otpCode });

    const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'webrec@test.com', sifre: 'sifre123' });
    authToken = loginRes.body.token;
});

afterEach(async () => {
    const collections = mongoose.connection.collections;
    if (collections.items) await collections.items.deleteMany({});
    if (collections.outfits) await collections.outfits.deleteMany({});
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
    server.close();
});


describe('POST /api/outfits/web-recommend', () => {

    test('❌ Token olmadan 401 dönmeli', async () => {
        const res = await request(app)
            .post('/api/outfits/web-recommend')
            .send({ sehir: 'Istanbul' });

        expect(res.statusCode).toBe(401);
    });

    test('❌ Boş dolap + boş web sonucu -> 400 dönmeli', async () => {
        searchProducts.mockResolvedValueOnce([]);

        const res = await request(app)
            .post('/api/outfits/web-recommend')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ sehir: 'Istanbul', etkinlik: 'Günlük' });

        expect(res.statusCode).toBe(400);
        expect(res.body.mesaj).toMatch(/Dolabınıza/);
    });

    test('❌ AI hiçbir parça seçmezse -> 502 dönmeli', async () => {
        const user = await User.findOne({ email: 'webrec@test.com' });
        await Item.create({
            kullanici: user._id, resimUrl: 'http://x/a.jpg',
            kategori: 'Üst Giyim', renk: '#112233', mevsim: 'Kış', stil: 'Günlük',
        });

        searchProducts.mockResolvedValueOnce([]);
        generateWebOutfitSuggestion.mockResolvedValueOnce({
            aciklama: 'Boş', secilen_kiyafet_idleri: [], secilen_web_urun_idleri: [], ipucu: '',
        });

        const res = await request(app)
            .post('/api/outfits/web-recommend')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ sehir: 'Istanbul' });

        expect(res.statusCode).toBe(502);
        expect(res.body.mesaj).toMatch(/AI bu istek/);
    });

    test('✅ Başarılı web destekli kombin önerisi -> 200 dönmeli', async () => {
        const user = await User.findOne({ email: 'webrec@test.com' });
        const item = await Item.create({
            kullanici: user._id, resimUrl: 'http://x/a.jpg',
            kategori: 'Üst Giyim', renk: '#112233', mevsim: 'Kış', stil: 'Günlük',
        });

        const webProducts = [
            { webId: 'WEB-0', ad: 'Pantolon', resimUrl: 'http://img/p.jpg', link: 'http://link/p', fiyat: 199, kaynak: 'Trendyol', kategoriTahmini: 'Alt Giyim' },
            { webId: 'WEB-1', ad: 'Spor Ayakkabı', resimUrl: 'http://img/s.jpg', link: 'http://link/s', fiyat: 399, kaynak: 'Trendyol', kategoriTahmini: 'Ayakkabı' },
        ];
        searchProducts.mockResolvedValueOnce(webProducts);

        generateWebOutfitSuggestion.mockResolvedValueOnce({
            aciklama: 'Harika bir kombin oluşturdum!',
            secilen_kiyafet_idleri: [item._id.toString()],
            secilen_web_urun_idleri: ['WEB-0', 'WEB-1'],
            ipucu: 'Pantolonu rahat bir üstle eşleştir',
        });

        const res = await request(app)
            .post('/api/outfits/web-recommend')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ enlem: 41.01, boylam: 28.97, etkinlik: 'İş' });

        expect(res.statusCode).toBe(200);
        expect(res.body.kombin.kiyafetler).toHaveLength(1);
        expect(res.body.kombin.disUrunler).toHaveLength(2);
        expect(res.body.kombin.aciklama).toBe('Harika bir kombin oluşturdum!');
        expect(res.body.kombin.ipucu).toBe('Pantolonu rahat bir üstle eşleştir');
        expect(res.body.kombin.webUrunSayisi).toBe(2);
        expect(res.body.kombin.etkinlik).toBe('İş');

        const saved = await Outfit.findOne({ kullanici: user._id });
        expect(saved).not.toBeNull();
        expect(saved.disUrunler).toHaveLength(2);
        expect(saved.baglam.etkinlik).toBe('İş');
    });

    test('✅ Konum/şehir verilmeden varsayılan etkinlik ile çalışmalı', async () => {
        const user = await User.findOne({ email: 'webrec@test.com' });
        const item = await Item.create({
            kullanici: user._id, resimUrl: 'http://x/b.jpg',
            kategori: 'Ayakkabı', renk: '#000000', mevsim: 'Yaz', stil: 'Spor',
        });

        searchProducts.mockResolvedValueOnce([]);
        generateWebOutfitSuggestion.mockResolvedValueOnce({
            aciklama: 'Varsayılan kombin',
            secilen_kiyafet_idleri: [item._id.toString()],
            secilen_web_urun_idleri: [],
        });

        const res = await request(app)
            .post('/api/outfits/web-recommend')
            .set('Authorization', `Bearer ${authToken}`)
            .send({});

        expect(res.statusCode).toBe(200);
        expect(res.body.kombin.etkinlik).toBe('Günlük');
        expect(res.body.kombin.ipucu).toBe('');
        expect(res.body.kombin.disUrunler).toHaveLength(0);
    });

    test('❌ Beklenmeyen hata oluşursa -> 500 dönmeli', async () => {
        searchProducts.mockRejectedValueOnce(new Error('Web arama hatası'));

        const res = await request(app)
            .post('/api/outfits/web-recommend')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ sehir: 'Istanbul' });

        expect(res.statusCode).toBe(500);
        expect(res.body.mesaj).toMatch(/oluşturulamadı/);
    });
});
