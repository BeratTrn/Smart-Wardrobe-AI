const axios = require('axios');

// Basit in-memory cache (API kotasını korur)
const cache = new Map();
const CACHE_SURE = 30 * 60 * 1000; // 30 dakika

/**
 * Koordinatlara göre hava durumu çeker
 */
const havaDurumuGetir = async (enlem, boylam) => {
    const cacheAnahtar = `${parseFloat(enlem).toFixed(2)}_${parseFloat(boylam).toFixed(2)}`;

    // Cache kontrolü
    if (cache.has(cacheAnahtar)) {
        const cached = cache.get(cacheAnahtar);
        if (Date.now() - cached.zaman < CACHE_SURE) {
            console.log('ℹ️ Hava durumu cache\'den alındı');
            return cached.veri;
        }
    }

    const API_KEY = process.env.OPENWEATHER_API_KEY;
    if (!API_KEY) {
        throw new Error('OpenWeather API anahtarı bulunamadı.');
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${enlem}&lon=${boylam}&appid=${API_KEY}&units=metric&lang=tr`;

    const response = await axios.get(url, { timeout: 8000 });
    const data = response.data;

    const havaBilgisi = {
        sicaklik: Math.round(data.main.temp),
        hissedilen: Math.round(data.main.feels_like),
        nem: data.main.humidity,
        durum: data.weather[0].description,
        ana_durum: data.weather[0].main,  // "Rain", "Clear", "Clouds" vs.
        icon: data.weather[0].icon,
        ruzgar: Math.round(data.wind.speed * 3.6), // m/s -> km/h
        konum: data.name,
        ulke: data.sys.country,
        gundogumu: new Date(data.sys.sunrise * 1000).toLocaleTimeString('tr-TR'),
        gunbatimi: new Date(data.sys.sunset * 1000).toLocaleTimeString('tr-TR'),
        tarih: new Date().toISOString()
    };

    // Cache'e kaydet
    cache.set(cacheAnahtar, { veri: havaBilgisi, zaman: Date.now() });

    return havaBilgisi;
};

/**
 * Şehir adına göre hava durumu çeker
 */
const sehirHavaDurumu = async (sehir) => {
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    if (!API_KEY) {
        throw new Error('OpenWeather API anahtarı bulunamadı.');
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(sehir)}&appid=${API_KEY}&units=metric&lang=tr`;

    const response = await axios.get(url, { timeout: 8000 });
    const data = response.data;

    return {
        sicaklik: Math.round(data.main.temp),
        hissedilen: Math.round(data.main.feels_like),
        nem: data.main.humidity,
        durum: data.weather[0].description,
        ana_durum: data.weather[0].main,
        icon: data.weather[0].icon,
        ruzgar: Math.round(data.wind.speed * 3.6),
        konum: data.name,
        ulke: data.sys.country,
        tarih: new Date().toISOString()
    };
};

module.exports = { havaDurumuGetir, sehirHavaDurumu };
