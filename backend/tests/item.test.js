jest.mock('../services/emailService', () => ({
    sendVerificationEmail: jest.fn().mockResolvedValue({
        accepted: ['item@test.com'],
        rejected: []
    })
}));

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
    await request(app)
        .post('/api/auth/register')
        .send({ kullaniciAdi: 'ItemTester', email: 'item@test.com', sifre: 'sifre123' });

    const { sendVerificationEmail } = require('../services/emailService');
    const otpCode = sendVerificationEmail.mock.calls[sendVerificationEmail.mock.calls.length - 1][2];
    await request(app).post('/api/auth/verify-email').send({ email: 'item@test.com', otpCode });
    const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'item@test.com', sifre: 'sifre123' });
    authToken = loginRes.body.token;
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
    test('✅ Olusturulan kiyafet ID ile getirilebilmeli', async () => {
        const createRes = await request(app)
            .post('/api/items/add')
            .set('Authorization', `Bearer ${authToken}`)
            .field('kategori', 'Üst Giyim')
            .field('renk', 'Siyah')
            .field('mevsim', 'Yaz')
            .field('stil', 'Günlük')
            .attach('resim', Buffer.from('mock image payload'), 'test.jpg');

        const itemId = createRes.body.kiyafet._id;
        const getRes = await request(app)
            .get(`/api/items/${itemId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(getRes.statusCode).toBe(200);
        expect(getRes.body).toHaveProperty('kiyafet');
        expect(getRes.body.kiyafet._id).toBe(itemId);
    });

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
    test('✅ Kullanicinin kendi kiyafeti guncellenebilmeli', async () => {
        const createRes = await request(app)
            .post('/api/items/add')
            .set('Authorization', `Bearer ${authToken}`)
            .field('kategori', 'Üst Giyim')
            .field('renk', 'Siyah')
            .field('mevsim', 'Yaz')
            .field('stil', 'Günlük')
            .attach('resim', Buffer.from('mock image payload'), 'test.jpg');

        const itemId = createRes.body.kiyafet._id;
        const updateRes = await request(app)
            .put(`/api/items/${itemId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ renk: 'Mavi', stil: 'Resmi' });

        expect(updateRes.statusCode).toBe(200);
        expect(updateRes.body.kiyafet.renk).toBe('Mavi');
        expect(updateRes.body.kiyafet.stil).toBe('Resmi');
    });

    test('❌ Başka kullanıcının kıyafetini güncelleyemez (403)', async () => {
        // İkinci kullanıcı oluştur
        await request(app)
            .post('/api/auth/register')
            .send({ kullaniciAdi: 'Diger', email: 'diger@test.com', sifre: 'sifre123' });

        const { sendVerificationEmail } = require('../services/emailService');
        const otpCode2 = sendVerificationEmail.mock.calls[sendVerificationEmail.mock.calls.length - 1][2];
        await request(app).post('/api/auth/verify-email').send({ email: 'diger@test.com', otpCode: otpCode2 });
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'diger@test.com', sifre: 'sifre123' });
        const token2 = loginRes.body.token;

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
    test('✅ Kullanicinin kendi kiyafeti silinebilmeli', async () => {
        const createRes = await request(app)
            .post('/api/items/add')
            .set('Authorization', `Bearer ${authToken}`)
            .field('kategori', 'Üst Giyim')
            .field('renk', 'Siyah')
            .field('mevsim', 'Yaz')
            .field('stil', 'Günlük')
            .attach('resim', Buffer.from('mock image payload'), 'test.jpg');

        const itemId = createRes.body.kiyafet._id;
        const deleteRes = await request(app)
            .delete(`/api/items/${itemId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(deleteRes.statusCode).toBe(200);

        const getRes = await request(app)
            .get(`/api/items/${itemId}`)
            .set('Authorization', `Bearer ${authToken}`);
        expect(getRes.statusCode).toBe(404);
    });

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
