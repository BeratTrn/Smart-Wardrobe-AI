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

/**
 * Seyahat tarihleri için ortalama hava durumu tahmini çeker.
 * OpenWeather 5-günlük forecast (3 saatlik dilimler) kullanır.
 * Seyahat 5 günden uzaksa tüm forecast ortalaması alınır, yoksa mevcut havalara düşülür.
 *
 * @param {string} sehir
 * @param {Date}   baslangicTarihi
 * @param {Date}   bitisTarihi
 * @returns {Object} sicaklik, durum, icon, nem, konum, tahminiMi, ...
 */
const seyahatHavaDurumu = async (sehir, baslangicTarihi, bitisTarihi) => {
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    if (!API_KEY) throw new Error('OpenWeather API anahtarı bulunamadı.');

    try {
        // 5-günlük tahmin (40 dilim × 3 saat = 5 gün — ücretsiz plan dahilinde)
        const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(sehir)}&appid=${API_KEY}&units=metric&lang=tr&cnt=40`;
        const response = await axios.get(url, { timeout: 8000 });
        const list     = response.data.list;
        const konum    = response.data.city.name;
        const ulke     = response.data.city.country;

        const baslangicMs = new Date(baslangicTarihi).setHours(0, 0, 0, 0);
        const bitisMs     = new Date(bitisTarihi).setHours(23, 59, 59, 999);

        // Seyahat tarih aralığındaki forecast dilimlerini filtrele
        const uygunDilimler = list.filter(d => {
            const t = d.dt * 1000;
            return t >= baslangicMs && t <= bitisMs;
        });

        // Tarih aralığında veri yoksa (seyahat 5 günden uzak) tüm listeyi kullan
        const tahminiMi    = uygunDilimler.length === 0;
        const kullanilacak = tahminiMi ? list : uygunDilimler;

        // Ortalama sıcaklık
        const ortalamaSicaklik = Math.round(
            kullanilacak.reduce((s, d) => s + d.main.temp, 0) / kullanilacak.length
        );
        const ortalamaNem = Math.round(
            kullanilacak.reduce((s, d) => s + d.main.humidity, 0) / kullanilacak.length
        );

        // En sık görülen hava durumu açıklaması ve ikonu
        const durumSayac = {};
        const ikonSayac  = {};
        for (const d of kullanilacak) {
            const desc = d.weather[0].description;
            const icon = d.weather[0].icon;
            durumSayac[desc] = (durumSayac[desc] || 0) + 1;
            ikonSayac[icon]  = (ikonSayac[icon]  || 0) + 1;
        }
        const baskınDurum = Object.entries(durumSayac).sort((a, b) => b[1] - a[1])[0][0];
        const baskınIkon  = Object.entries(ikonSayac).sort( (a, b) => b[1] - a[1])[0][0];
        const anaDurum    = kullanilacak[Math.floor(kullanilacak.length / 2)].weather[0].main;

        console.log(`🌤️  Seyahat hava tahmini: ${sehir} | ${ortalamaSicaklik}°C | ${baskınDurum}${tahminiMi ? ' (5+ gün, tüm forecast ortalaması)' : ''}`);

        return {
            sicaklik:  ortalamaSicaklik,
            nem:       ortalamaNem,
            durum:     baskınDurum,
            ana_durum: anaDurum,
            icon:      baskınIkon,
            konum,
            ulke,
            tahminiMi,
            tarih: new Date().toISOString()
        };

    } catch (err) {
        // Forecast başarısız olursa mevcut hava durumuna geri dön
        console.warn('⚠️  Forecast alınamadı, mevcut hava durumuna dönülüyor:', err.message);
        const mevcut = await sehirHavaDurumu(sehir);
        return { ...mevcut, tahminiMi: true };
    }
};

module.exports = { havaDurumuGetir, sehirHavaDurumu, seyahatHavaDurumu };
