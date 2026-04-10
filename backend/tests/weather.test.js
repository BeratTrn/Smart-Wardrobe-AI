const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../services/weatherService', () => ({
    havaDurumuGetir: jest.fn(),
    sehirHavaDurumu: jest.fn()
}));

const { havaDurumuGetir, sehirHavaDurumu } = require('../services/weatherService');
const { app, server } = require('../server');

let mongoServer;
let token;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const res = await request(app)
        .post('/api/auth/register')
        .send({ kullaniciAdi: 'WeatherUser', email: 'weather@test.com', sifre: 'sifre123' });
    token = res.body.token;
});

afterEach(async () => {
    jest.clearAllMocks();
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }

    const res = await request(app)
        .post('/api/auth/register')
        .send({ kullaniciAdi: 'WeatherUser', email: 'weather@test.com', sifre: 'sifre123' });
    token = res.body.token;
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
    server.close();
});

describe('GET /api/weather', () => {
    test('✅ Token ve gecerli koordinat ile hava durumu donebilmeli', async () => {
        havaDurumuGetir.mockResolvedValue({
            sicaklik: 24,
            durum: 'acik',
            konum: 'Istanbul'
        });

        const res = await request(app)
            .get('/api/weather?enlem=41.01&boylam=28.97')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('havaDurumu');
        expect(res.body.havaDurumu.konum).toBe('Istanbul');
    });

    test('❌ Token olmadan 401 donmeli', async () => {
        const res = await request(app).get('/api/weather?enlem=41.01&boylam=28.97');
        expect(res.statusCode).toBe(401);
    });

    test('❌ Koordinat eksikse 400 donmeli', async () => {
        const res = await request(app)
            .get('/api/weather?enlem=41.01')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(400);
    });
});

describe('GET /api/weather/city', () => {
    test('✅ Sehir ile hava durumu donebilmeli', async () => {
        sehirHavaDurumu.mockResolvedValue({
            sicaklik: 18,
            durum: 'bulutlu',
            konum: 'Ankara'
        });

        const res = await request(app)
            .get('/api/weather/city?sehir=Ankara')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.havaDurumu.konum).toBe('Ankara');
    });

    test('❌ Sehir parametresi yoksa 400 donmeli', async () => {
        const res = await request(app)
            .get('/api/weather/city')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(400);
    });

    test('❌ Bilinmeyen sehirde 404 donmeli', async () => {
        const err = new Error('not found');
        err.response = { status: 404 };
        sehirHavaDurumu.mockRejectedValue(err);

        const res = await request(app)
            .get('/api/weather/city?sehir=YokSehir')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(404);
    });
});
