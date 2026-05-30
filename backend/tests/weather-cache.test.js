/**
 * weather-cache.test.js
 *
 * weatherService.js — Line 16 false branch:
 *   if (Date.now() - cached.zaman < CACHE_SURE)
 *
 * Cache mevcutsa ama süresi dolmuşsa (> 30 dakika) yeni API çağrısı yapılır.
 * Bu test dosyası weatherService'i mock'LAMAZ — gerçek modülü kullanır.
 */

// axios'u mock'la (gerçek HTTP isteği yapmadan hava durumu yanıtı simüle et)
jest.mock('axios');

const axios   = require('axios');
const weather = require('../services/weatherService');

// ─── Test başlamadan önce API key'i ayarla ────────────────────────────────────
beforeAll(() => {
    process.env.OPENWEATHER_API_KEY = 'test_key';
});

// ─── Her testten önce axios mock'larını temizle ───────────────────────────────
beforeEach(() => {
    jest.clearAllMocks();
});

// ─── Yardımcı: sahte OpenWeather yanıtı ──────────────────────────────────────
const makeWeatherResponse = (temp, city = 'TestCity') => ({
    data: {
        main:    { temp, feels_like: temp + 1, humidity: 50 },
        weather: [{ description: 'açık', main: 'Clear', icon: '01d' }],
        wind:    { speed: 3 },
        name:    city,
        sys:     { country: 'TR', sunrise: 1_600_000_000, sunset: 1_600_050_000 },
    },
});

// ══════════════════════════════════════════════════════════════════════════════
// weatherService cache — line 16 false branch (süresi dolmuş cache)
// ══════════════════════════════════════════════════════════════════════════════
describe('weatherService cache expiry (line 16 false branch)', () => {

    test('süresi dolmuş cache girişi API\'yi yeniden çağırır', async () => {
        const enlem = 41.05;
        const boylam = 28.98;

        // 1. Çağrı — cache miss → API çağrısı → cache'e kaydedilir
        axios.get.mockResolvedValueOnce(makeWeatherResponse(25));
        const result1 = await weather.havaDurumuGetir(enlem, boylam);
        expect(result1.sicaklik).toBe(25);
        expect(axios.get).toHaveBeenCalledTimes(1);

        // 2. Çağrı — cache HIT, dolu ve taze → axios çağrılmaz
        const result2 = await weather.havaDurumuGetir(enlem, boylam);
        expect(result2.sicaklik).toBe(25);
        expect(axios.get).toHaveBeenCalledTimes(1);   // hâlâ 1 çağrı

        // Cache süresini geçmiş gibi göster (Date.now'u 31 dk ilerlet)
        const realDateNow = Date.now;
        Date.now = jest.fn(() => realDateNow() + 31 * 60 * 1000);

        // 3. Çağrı — cache HIT ama SÜRESİ DOLMUŞ → API yeniden çağrılır (line 16 false branch)
        axios.get.mockResolvedValueOnce(makeWeatherResponse(20));
        const result3 = await weather.havaDurumuGetir(enlem, boylam);
        expect(result3.sicaklik).toBe(20);             // Taze veri
        expect(axios.get).toHaveBeenCalledTimes(2);    // İkinci API çağrısı

        // Date.now'u geri yükle
        Date.now = realDateNow;
    });
});
