/**
 * weather-travel.test.js
 *
 * weatherService.js — seyahatHavaDurumu() fonksiyonunun kalan dallarını kapsar
 * (satır 86-98 civarı: forecast ortalaması, tahminiMi=true/false dalları,
 * forecast hata -> mevcut havaya fallback).
 *
 * Bu test dosyası MongoMemoryServer / mongoose KULLANMAZ — axios mock'lanır.
 */

jest.mock('axios');

const axios   = require('axios');
const weather = require('../services/weatherService');

beforeAll(() => {
    process.env.OPENWEATHER_API_KEY = 'test-weather-key';
});

beforeEach(() => {
    jest.clearAllMocks();
});

const mockWeatherResponse = (city = 'TestCity') => ({
    data: {
        main:    { temp: 25, feels_like: 26, humidity: 55 },
        weather: [{ description: 'açık', main: 'Clear', icon: '01d' }],
        wind:    { speed: 4 },
        name:    city,
        sys:     { country: 'TR', sunrise: 1_600_000_000, sunset: 1_600_050_000 },
    },
});

describe('weatherService.seyahatHavaDurumu - kalan dallar', () => {
    test('seyahatHavaDurumu — tarih aralığında veri varsa ortalama alır (tahminiMi=false)', async () => {
        const futureTs = Math.floor((Date.now() + 86400000) / 1000); // yarın

        axios.get.mockResolvedValueOnce({
            data: {
                list: [
                    { dt: futureTs,        main: { temp: 22, humidity: 50 }, weather: [{ description: 'güneşli', main: 'Clear', icon: '01d' }] },
                    { dt: futureTs + 10800, main: { temp: 24, humidity: 45 }, weather: [{ description: 'güneşli', main: 'Clear', icon: '01d' }] },
                ],
                city: { name: 'Paris', country: 'FR' },
            },
        });

        const result = await weather.seyahatHavaDurumu(
            'Paris',
            new Date(Date.now() + 86400000),
            new Date(Date.now() + 2 * 86400000)
        );

        expect(result.sicaklik).toBe(23); // ortalama
        expect(result.konum).toBe('Paris');
        expect(result.tahminiMi).toBe(false);
    });

    test('seyahatHavaDurumu — tarih aralığı dışında veri varsa tüm listeyi kullanır (tahminiMi=true)', async () => {
        const oldTs = Math.floor((Date.now() - 7 * 86400000) / 1000); // 7 gün önce

        axios.get.mockResolvedValueOnce({
            data: {
                list: [
                    { dt: oldTs,        main: { temp: 18, humidity: 60 }, weather: [{ description: 'yağmur', main: 'Rain', icon: '09d' }] },
                    { dt: oldTs + 3600, main: { temp: 19, humidity: 62 }, weather: [{ description: 'yağmur', main: 'Rain', icon: '09d' }] },
                ],
                city: { name: 'Berlin', country: 'DE' },
            },
        });

        const result = await weather.seyahatHavaDurumu(
            'Berlin',
            new Date(Date.now() + 10 * 86400000),
            new Date(Date.now() + 12 * 86400000)
        );

        expect(result.tahminiMi).toBe(true);
        expect(result.konum).toBe('Berlin');
    });

    test('seyahatHavaDurumu — forecast başarısız olursa mevcut hava durumuna geri döner (catch dalı, satır 98)', async () => {
        axios.get
            .mockRejectedValueOnce(new Error('Forecast API error'))
            .mockResolvedValueOnce(mockWeatherResponse('London'));

        const result = await weather.seyahatHavaDurumu('London', new Date(), new Date());

        expect(result.konum).toBe('London');
        expect(result.tahminiMi).toBe(true);
    });

    test('seyahatHavaDurumu — API anahtarı yoksa hata fırlatır', async () => {
        delete process.env.OPENWEATHER_API_KEY;

        await expect(weather.seyahatHavaDurumu('Paris', new Date(), new Date())).rejects.toThrow(/API anahtarı/);

        process.env.OPENWEATHER_API_KEY = 'test-weather-key';
    });
});
