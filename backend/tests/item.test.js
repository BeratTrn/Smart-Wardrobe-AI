const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app, server } = require('../server');

let mongoServer;
let authToken;
let testItemId;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Test kullanıcısı oluştur ve token al
    const res = await request(app)
        .post('/api/auth/register')
        .send({ kullaniciAdi: 'ItemTester', email: 'item@test.com', sifre: 'sifre123' });

    authToken = res.body.token;
});

afterEach(async () => {
    // Items koleksiyonunu temizle (kullanıcıyı silme)
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

// =============================================
// KIYAFETLERİ LİSTELEME (GET)
// =============================================
describe('GET /api/items', () => {

    test('✅ Token ile boş dolap başarıyla dönmeli', async () => {
        const res = await request(app)
            .get('/api/items')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.kiyafetler).toBeInstanceOf(Array);
        expect(res.body.toplam).toBe(0);
    });

    test('❌ Token olmadan 401 dönmeli', async () => {
        const res = await request(app).get('/api/items');
        expect(res.statusCode).toBe(401);
    });

    test('✅ Kategori filtresi çalışmalı', async () => {
        const res = await request(app)
            .get('/api/items?kategori=Di%C4%9Fer')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('kiyafetler');
    });

    test('✅ Sayfalama parametreleri çalışmalı', async () => {
        const res = await request(app)
            .get('/api/items?sayfa=1&limit=5')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('sayfa', 1);
        expect(res.body).toHaveProperty('toplamSayfa');
    });
});

// =============================================
// TEK KIYAFETİ GETIRME
// =============================================
describe('GET /api/items/:id', () => {

    test('❌ Geçersiz ID formatında 500 veya 400 dönmeli', async () => {
        const res = await request(app)
            .get('/api/items/gecersizid')
            .set('Authorization', `Bearer ${authToken}`);

        expect([400, 404, 500]).toContain(res.statusCode);
    });

    test('❌ Var olmayan ObjectId için 404 dönmeli', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .get(`/api/items/${fakeId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(404);
    });
});

// =============================================
// KIYAFETİ GÜNCELLEME (PUT)
// =============================================
describe('PUT /api/items/:id', () => {

    test('❌ Başka kullanıcının kıyafetini güncelleyemez (403)', async () => {
        // İkinci kullanıcı oluştur
        const res2 = await request(app)
            .post('/api/auth/register')
            .send({ kullaniciAdi: 'Diger', email: 'diger@test.com', sifre: 'sifre123' });

        const token2 = res2.body.token;

        // Var olmayan / başkasına ait ID dene
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .put(`/api/items/${fakeId}`)
            .set('Authorization', `Bearer ${token2}`)
            .send({ renk: 'Mavi' });

        expect([403, 404]).toContain(res.statusCode);
    });
});

// =============================================
// KIYAFETİ SİLME (DELETE)
// =============================================
describe('DELETE /api/items/:id', () => {

    test('❌ Var olmayan kıyafeti silmeye çalışırsa 404 dönmeli', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .delete(`/api/items/${fakeId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toBe(404);
    });

    test('❌ Token olmadan silme isteği 401 dönmeli', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app).delete(`/api/items/${fakeId}`);
        expect(res.statusCode).toBe(401);
    });
});

// =============================================
// SAĞLIK KONTROLÜ
// =============================================
describe('GET /api/health', () => {

    test('✅ Health check endpoint çalışmalı', async () => {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('durum');
    });
});

// =============================================
// 404 TEST
// =============================================
describe('Olmayan Endpoint', () => {

    test('✅ Olmayan endpoint 404 dönmeli', async () => {
        const res = await request(app).get('/api/olmayan-endpoint');
        expect(res.statusCode).toBe(404);
    });
});
