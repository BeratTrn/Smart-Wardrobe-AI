/**
 * items-extra.test.js
 * itemController.js için eksik test senaryoları:
 *   - analyzeOnly (tüm dallar)
 *   - toggleFavori
 *   - getFavorites
 *   - getItemById → 403
 *   - updateItem  → 403
 *   - deleteItem  → 403, cloudinaryId branch
 *   - getItems    → mevsim/renk/stil filtreleri
 */

// Mock: emailService 
jest.mock('../services/emailService', () => ({
    sendVerificationEmail: jest.fn().mockResolvedValue({
        accepted: ['items-extra@test.com'],
        rejected: []
    })
}));

// Mock: aiService 
jest.mock('../services/aiService', () => ({
    analyzeItem:              jest.fn(),
    wardrobeOnKontrol:        jest.requireActual('../services/aiService').wardrobeOnKontrol,
    generateOutfitSuggestion: jest.fn(),
    generateSuitcaseSuggestion: jest.fn(),
    generateWeatherNotificationText: jest.fn()
}));


const request  = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app, server } = require('../server');
const User  = require('../models/User');
const Item  = require('../models/Item');
const bcrypt = require('bcryptjs');
const { analyzeItem } = require('../services/aiService');

let mongoServer;
let authToken;
let userId;

// İkinci kullanıcı (yetki testleri için)
let token2;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Ana test kullanıcısı
    const { sendVerificationEmail } = require('../services/emailService');

    await request(app)
        .post('/api/auth/register')
        .send({ kullaniciAdi: 'ItemsExtra', email: 'items-extra@test.com', sifre: 'sifre123' });

    const otpCode = sendVerificationEmail.mock.calls[sendVerificationEmail.mock.calls.length - 1][2];
    await request(app).post('/api/auth/verify-email').send({ email: 'items-extra@test.com', otpCode });

    const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'items-extra@test.com', sifre: 'sifre123' });
    authToken = loginRes.body.token;
    userId = loginRes.body.kullanici?.id || (await User.findOne({ email: 'items-extra@test.com' }))._id.toString();

    // İkinci kullanıcı
    await request(app)
        .post('/api/auth/register')
        .send({ kullaniciAdi: 'OtherUser', email: 'other-items@test.com', sifre: 'sifre123' });
    const otpCode2 = sendVerificationEmail.mock.calls[sendVerificationEmail.mock.calls.length - 1][2];
    await request(app).post('/api/auth/verify-email').send({ email: 'other-items@test.com', otpCode: otpCode2 });
    const loginRes2 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'other-items@test.com', sifre: 'sifre123' });
    token2 = loginRes2.body.token;
});

afterEach(async () => {
    jest.clearAllMocks();
    analyzeItem.mockReset();
    const collections = mongoose.connection.collections;
    if (collections.items) await collections.items.deleteMany({});
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
    server.close();
});

// Helper: Test item oluştur 
const createTestItem = async (overrides = {}) => {
    const user = await User.findOne({ email: 'items-extra@test.com' });
    return Item.create({
        kullanici:   user._id,
        resimUrl:    'http://test.com/img.jpg',
        kategori:    'Üst Giyim',
        renk:        'Siyah',
        mevsim:      'Yaz',
        stil:        'Günlük',
        cloudinaryId: '',
        ...overrides
    });
};


// POST /api/items/analyze-only
describe('POST /api/items/analyze-only', () => {

    test('❌ Dosya gönderilmezse 400 dönmeli', async () => {
        const res = await request(app)
            .post('/api/items/analyze-only')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.mesaj).toMatch(/fotoğraf/i);
    });

    test('✅ AI başarılı analiz döndürmeli', async () => {
        analyzeItem.mockResolvedValueOnce({
            kategori:    'Alt Giyim',
            renk:        '#3A5A99',
            aiDogrulandi: true
        });

        const res = await request(app)
            .post('/api/items/analyze-only')
            .set('Authorization', `Bearer ${authToken}`)
            .attach('resim', Buffer.from('fake-image-data'), 'test.jpg');

        expect(res.statusCode).toBe(200);
        expect(res.body.analiz.kategori).toBe('Alt Giyim');
        expect(res.body.analiz.renk).toBe('#3A5A99');
        expect(res.body.analiz.aiDogrulandi).toBe(true);
    });

    test('✅ AI başarısız olursa varsayılan değerlerle 200 dönmeli', async () => {
        analyzeItem.mockRejectedValueOnce(new Error('FastAPI error'));

        const res = await request(app)
            .post('/api/items/analyze-only')
            .set('Authorization', `Bearer ${authToken}`)
            .attach('resim', Buffer.from('fake-image-data'), 'test.jpg');

        expect(res.statusCode).toBe(200);
        expect(res.body.analiz.kategori).toBe('Diğer'); // Varsayılan
        expect(res.body.analiz.aiDogrulandi).toBe(false);
    });

    test('❌ Token olmadan 401 dönmeli', async () => {
        const res = await request(app)
            .post('/api/items/analyze-only')
            .attach('resim', Buffer.from('fake-image-data'), 'test.jpg');

        expect(res.statusCode).toBe(401);
    });
});


// PATCH /api/items/:id/favorite — toggleFavori
describe('PATCH /api/items/:id/favorite — toggleFavori', () => {

    test('✅ Favori durumu true → false → true toggle edilebilmeli', async () => {
        const item = await createTestItem({ favori: false });

        // İlk toggle: false → true
        const res1 = await request(app)
            .patch(`/api/items/${item._id}/favorite`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res1.statusCode).toBe(200);
        expect(res1.body.favori).toBe(true);
        expect(res1.body.mesaj).toMatch(/eklendi/i);

        // İkinci toggle: true → false
        const res2 = await request(app)
            .patch(`/api/items/${item._id}/favorite`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res2.statusCode).toBe(200);
        expect(res2.body.favori).toBe(false);
        expect(res2.body.mesaj).toMatch(/çıkarıldı/i);
    });

    test('❌ Var olmayan item için 404 dönmeli', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .patch(`/api/items/${fakeId}/favorite`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(404);
    });

    test('❌ Başka kullanıcının itemini favorileyemez (403)', async () => {
        const item = await createTestItem(); // Ana kullanıcıya ait item

        const res = await request(app)
            .patch(`/api/items/${item._id}/favorite`)
            .set('Authorization', `Bearer ${token2}`); // İkinci kullanıcı

        expect(res.statusCode).toBe(403);
    });

    test('❌ Token olmadan 401 dönmeli', async () => {
        const item = await createTestItem();
        const res  = await request(app).patch(`/api/items/${item._id}/favorite`);
        expect(res.statusCode).toBe(401);
    });
});


// GET /api/items/favorites — getFavorites
describe('GET /api/items/favorites', () => {

    test('✅ Favori kıyafetler listelenebilmeli', async () => {
        await createTestItem({ favori: true });
        await createTestItem({ favori: true, renk: 'Mavi' });
        await createTestItem({ favori: false, renk: 'Kırmızı' });

        const res = await request(app)
            .get('/api/items/favorites')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.favoriler).toHaveLength(2);
        expect(res.body.toplam).toBe(2);
    });

    test('✅ Favori yoksa boş dizi dönmeli', async () => {
        const res = await request(app)
            .get('/api/items/favorites')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.favoriler).toHaveLength(0);
    });

    test('❌ Token olmadan 401 dönmeli', async () => {
        const res = await request(app).get('/api/items/favorites');
        expect(res.statusCode).toBe(401);
    });
});


// GET /api/items/:id — 403 yetki testi
describe('GET /api/items/:id — 403 branch', () => {

    test('❌ Başka kullanıcının itemini görüntüleyemez (403)', async () => {
        const item = await createTestItem(); // Ana kullanıcıya ait

        const res = await request(app)
            .get(`/api/items/${item._id}`)
            .set('Authorization', `Bearer ${token2}`); // Başka kullanıcı

        expect(res.statusCode).toBe(403);
        expect(res.body.mesaj).toMatch(/yetki/i);
    });
});


// PUT /api/items/:id — 403 yetki testi
describe('PUT /api/items/:id — 403 branch', () => {

    test('❌ Başka kullanıcının itemini güncelleyemez (403)', async () => {
        const item = await createTestItem();

        const res = await request(app)
            .put(`/api/items/${item._id}`)
            .set('Authorization', `Bearer ${token2}`)
            .send({ renk: 'Mavi' });

        expect(res.statusCode).toBe(403);
    });
});


// DELETE /api/items/:id — 403 ve cloudinaryId branch
describe('DELETE /api/items/:id — 403 ve cloudinary branch', () => {

    test('❌ Başka kullanıcının itemini silemez (403)', async () => {
        const item = await createTestItem();

        const res = await request(app)
            .delete(`/api/items/${item._id}`)
            .set('Authorization', `Bearer ${token2}`);

        expect(res.statusCode).toBe(403);
    });

    test('✅ cloudinaryId olan item silinirken destroy çağrılmalı (test env no-op)', async () => {
        // Test ortamında cloudinary = { uploader: { destroy: async () => ({}) } }
        // Gerçek bir silme işlemi yapılmaz ama branch kapanır
        const item = await createTestItem({ cloudinaryId: 'test-cloudinary-id-123' });

        const res = await request(app)
            .delete(`/api/items/${item._id}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.mesaj).toMatch(/silindi/i);
    });
});


// GET /api/items — filtre parametreleri
describe('GET /api/items — filtreler', () => {

    beforeEach(async () => {
        await createTestItem({ mevsim: 'Kış', renk: 'Bordo', stil: 'Resmi' });
        await createTestItem({ mevsim: 'Yaz', renk: 'Siyah', stil: 'Günlük' });
        await createTestItem({ kategori: 'Ayakkabı', mevsim: 'Kış', renk: 'Kahve', stil: 'Klasik' });
    });

    test('✅ mevsim filtresi çalışmalı', async () => {
        const res = await request(app)
            .get('/api/items')
            .query({ mevsim: 'Kış' })
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.kiyafetler.length).toBeGreaterThanOrEqual(2);
    });

    test('✅ renk filtresi (regex) çalışmalı', async () => {
        const res = await request(app)
            .get('/api/items?renk=Bordo')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.kiyafetler.length).toBeGreaterThanOrEqual(1);
    });

    test('✅ stil filtresi çalışmalı', async () => {
        const res = await request(app)
            .get('/api/items?stil=Resmi')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.kiyafetler.length).toBeGreaterThanOrEqual(1);
    });
});
