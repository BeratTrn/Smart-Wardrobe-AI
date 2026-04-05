const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app, server } = require('../server');

let mongoServer;
let authToken;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const res = await request(app)
        .post('/api/auth/register')
        .send({ kullaniciAdi: 'OutfitTester', email: 'outfit@test.com', sifre: 'sifre123' });

    authToken = res.body.token;
});

afterEach(async () => {
    const collections = mongoose.connection.collections;
    if (collections.outfits) await collections.outfits.deleteMany({});
    if (collections.items) await collections.items.deleteMany({});
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
    server.close();
});

// =============================================
// KOMBİN ÖNERİSİ TESTLERİ
// =============================================
describe('POST /api/outfits/recommend', () => {

    test('❌ Token olmadan kombin isteği 401 dönmeli', async () => {
        const res = await request(app)
            .post('/api/outfits/recommend')
            .send({ sehir: 'Istanbul', etkinlik: 'Günlük' });

        expect(res.statusCode).toBe(401);
    });

    test('❌ Boş dolap ile kombin isteği 400 dönmeli', async () => {
        // Bu test AI çağırmadan önce dolap boş kontrolü yapar
        const res = await request(app)
            .post('/api/outfits/recommend')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ sehir: 'Istanbul', etkinlik: 'Günlük' });

        // Boş dolap → 400 beklenir
        expect(res.statusCode).toBe(400);
        expect(res.body.mesaj).toMatch(/kıyafet/i);
    });
});

// =============================================
// GEÇMİŞ KOMBİNLER TESTLERİ
// =============================================
describe('GET /api/outfits', () => {

    test('✅ Token ile geçmiş kombinler listelenebilmeli', async () => {
        const res = await request(app)
            .get('/api/outfits')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.kombinler).toBeInstanceOf(Array);
    });

    test('❌ Token olmadan geçmiş kombinler 401 dönmeli', async () => {
        const res = await request(app).get('/api/outfits');
        expect(res.statusCode).toBe(401);
    });

    test('✅ Sayfalama çalışmalı', async () => {
        const res = await request(app)
            .get('/api/outfits?sayfa=1&limit=5')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('toplam');
    });
});

// =============================================
// KOMBİN GERİ BİLDİRİMİ TESTLERİ
// =============================================
describe('PUT /api/outfits/:id/feedback', () => {

    test('❌ Var olmayan kombin için feedback 404 dönmeli', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .put(`/api/outfits/${fakeId}/feedback`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ begeniyor: true });

        expect(res.statusCode).toBe(404);
    });

    test('❌ Token olmadan feedback 401 dönmeli', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .put(`/api/outfits/${fakeId}/feedback`)
            .send({ begeniyor: true });

        expect(res.statusCode).toBe(401);
    });
});

// =============================================
// KOMBİN SİLME TESTLERİ
// =============================================
describe('DELETE /api/outfits/:id', () => {

    test('❌ Var olmayan kombini silmeye çalışırsa 404 dönmeli', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .delete(`/api/outfits/${fakeId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(404);
    });
});

// =============================================
// İSTATİSTİK TESTLERİ
// =============================================
describe('GET /api/stats/wardrobe', () => {

    test('✅ Token ile istatistikler alınabilmeli', async () => {
        const res = await request(app)
            .get('/api/stats/wardrobe')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('istatistikler');
        expect(res.body.istatistikler).toHaveProperty('ozet');
        expect(res.body.istatistikler).toHaveProperty('kategoriDagilimi');
    });

    test('❌ Token olmadan istatistikler 401 dönmeli', async () => {
        const res = await request(app).get('/api/stats/wardrobe');
        expect(res.statusCode).toBe(401);
    });
});
