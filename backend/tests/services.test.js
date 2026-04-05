const { kiyafetAnaliz, kombinOner } = require('../services/aiService');
const { havaDurumuGetir, sehirHavaDurumu } = require('../services/weatherService');
const { errorHandler, notFound } = require('../middleware/errorMiddleware');

// Mock axios
jest.mock('axios');
const axios = require('axios');

// Mock openai
jest.mock('openai', () => {
    return jest.fn().mockImplementation(() => {
        return {
            chat: {
                completions: {
                    create: jest.fn().mockResolvedValue({
                        choices: [{
                            message: {
                                content: JSON.stringify({
                                    kategori: 'Üst Giyim',
                                    renk: 'Siyah',
                                    mevsim: 'Yaz',
                                    stil: 'Casual',
                                    guven: 0.9,
                                    aciklama: 'Harika bir kombin',
                                    secilen_kiyafet_idleri: ['1', '2'],
                                    ipucu: 'Güneş gözlüğü takın'
                                })
                            }
                        }]
                    })
                }
            }
        };
    });
});

describe('Services & Middleware Testleri', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Weather Service', () => {
        it('havaDurumuGetir fonksiyonu dogru calismali', async () => {
            axios.get.mockResolvedValue({
                data: {
                    main: { temp: 25, feels_like: 26, humidity: 50 },
                    weather: [{ description: 'Açık', main: 'Clear', icon: '01d' }],
                    wind: { speed: 5 },
                    name: 'Istanbul',
                    sys: { country: 'TR', sunrise: 1600000000, sunset: 1600050000 }
                }
            });

            process.env.OPENWEATHER_API_KEY = 'test_key';
            const data = await havaDurumuGetir(41.01, 28.97);
            expect(data.sicaklik).toBe(25);
            expect(data.konum).toBe('Istanbul');
        });

        it('sehirHavaDurumu fonksiyonu dogru calismali', async () => {
            axios.get.mockResolvedValue({
                data: {
                    main: { temp: 20, feels_like: 21, humidity: 40 },
                    weather: [{ description: 'Bulutlu', main: 'Clouds', icon: '02d' }],
                    wind: { speed: 3 },
                    name: 'Ankara',
                    sys: { country: 'TR' }
                }
            });

            process.env.OPENWEATHER_API_KEY = 'test_key';
            const data = await sehirHavaDurumu('Ankara');
            expect(data.sicaklik).toBe(20);
            expect(data.konum).toBe('Ankara');
        });
    });

    describe('AI Service', () => {
        it('kiyafetAnaliz calismali', async () => {
            const data = await kiyafetAnaliz(Buffer.from('test'), 'image/jpeg');
            expect(data.kategori).toBe('Üst Giyim');
            expect(data.renk).toBe('Siyah');
        });

        it('kombinOner calismali', async () => {
            const kiyafetler = [{ _id: '1', kategori: 'Üst Giyim', renk: 'Siyah', mevsim: 'Yaz' }];
            const havaDurumu = { durum: 'Güneşli', sicaklik: 30, konum: 'Istanbul' };
            const data = await kombinOner(kiyafetler, havaDurumu, 'Piknik');

            expect(data.aciklama).toBe('Harika bir kombin');
            expect(data.secilen_kiyafet_idleri).toContain('1');
        });
    });

    describe('Error Middleware', () => {
        it('notFound middleware 404 hatasi firlatmali', () => {
            const req = { originalUrl: '/test' };
            const res = { status: jest.fn() };
            const next = jest.fn();

            notFound(req, res, next);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });

        it('errorHandler CastError yakalamali', () => {
            const err = { name: 'CastError' };
            const req = {};
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const next = jest.fn();

            errorHandler(err, req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ mesaj: 'Geçersiz ID formatı.' });
        });

        it('errorHandler ValidationError yakalamali', () => {
            const err = { name: 'ValidationError', errors: { field: { message: 'Gerekli alan' } } };
            const req = {};
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const next = jest.fn();

            errorHandler(err, req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ mesaj: 'Gerekli alan' });
        });

        it('errorHandler genel sunucu hatasi 500 donmeli', () => {
            const err = { message: 'Bilinmeyen hata' };
            const req = {};
            const res = { statusCode: 200, status: jest.fn().mockReturnThis(), json: jest.fn() };
            const next = jest.fn();

            errorHandler(err, req, res, next);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ mesaj: 'Bilinmeyen hata' });
        });
    });
});
