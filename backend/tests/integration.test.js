jest.mock('../services/emailService', () => ({
    sendVerificationEmail: jest.fn().mockResolvedValue({
        accepted: ['entegrasyon@example.com'],
        rejected: []
    })
}));

const request = require('supertest');
const { app, server } = require('../server');
const User = require('../models/User');
const Item = require('../models/Item');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    // Test sırasında mongoose bağlantısı açıksa kapatıp In-Memory db'ye bağla
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    server.close();
});

beforeEach(async () => {
    // Testler öncesi veritabanını temizle
    await User.deleteMany({});
    await Item.deleteMany({});
});

describe('Kısmi Entegrasyon Testi (Uçtan Uca İş Akışı)', () => {

    let token = '';

    test('Senaryo: Kullanıcı hesabı açar, giriş yapar ve gardırobuna bir eşya ekler', async () => {
        // 1. Kullanıcı Kaydı (Register)
        const registerData = {
            kullaniciAdi: 'test_entegrasyon',
            email: 'entegrasyon@example.com',
            sifre: 'Parola123!'
        };

        const registerRes = await request(app)
            .post('/api/auth/register')
            .send(registerData);

        expect(registerRes.status).toBe(201);
        await User.updateOne(
            { email: registerData.email.toLowerCase() },
            { isVerified: true, otpCode: undefined, otpExpire: undefined }
        );

        // 2. Kullanıcı Girişi (Login)
        const loginData = {
            email: 'entegrasyon@example.com',
            sifre: 'Parola123!'
        };

        const loginRes = await request(app)
            .post('/api/auth/login')
            .send(loginData);

        expect(loginRes.status).toBe(200);
        expect(loginRes.body).toHaveProperty('token');
        token = loginRes.body.token; // Gelen tokenı al

        // 3. Eşya (Item) Ekleme (Auth gerektirir)
        const itemRes = await request(app)
            .post('/api/items/add')
            .set('Authorization', `Bearer ${token}`)
            .field('kategori', 'Üst Giyim')
            .field('renk', 'Siyah')
            .field('mevsim', 'Yaz')
            .field('stil', 'Casual')
            .attach('resim', Buffer.from('mock image payload'), 'test.jpg');

        expect(itemRes.status).toBe(201);
        expect(itemRes.body.kiyafet).toHaveProperty('kategori', 'Üst Giyim');
        expect(itemRes.body.kiyafet).toHaveProperty('renk', 'Siyah');

        // 4. Eklenen eşyayı listeleyip doğrulama
        const getItemsRes = await request(app)
            .get('/api/items')
            .set('Authorization', `Bearer ${token}`);

        expect(getItemsRes.status).toBe(200);
        expect(getItemsRes.body.kiyafetler.length).toBeGreaterThan(0);
        expect(getItemsRes.body.kiyafetler[0].kategori).toBe('Üst Giyim');
    });
});
