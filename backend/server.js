const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// .env dosyasını yükle
dotenv.config();

// Veritabanına bağlan
if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

const app = express();

// ========================
// GÜVENLİK MİDDLEWARE'LERİ
// ========================

// Helmet: HTTP başlıklarını güvenli hale getirir
app.use(helmet());

// CORS: Frontend'den gelen isteklere izin ver
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:3000', 'http://localhost:8080'],
    credentials: true
}));

// Rate Limiting: Brute-force saldırılarına karşı koruma
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: process.env.NODE_ENV === 'test' ? 10000 : 100, // Testte throttle devre dışına yakın
    message: { mesaj: 'Çok fazla istek gönderildi, lütfen 15 dakika sonra tekrar deneyin.' }
});
app.use('/api/', limiter);

// Auth için daha sıkı limit
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'test' ? 10000 : 20,
    message: { mesaj: 'Çok fazla giriş denemesi, lütfen 15 dakika sonra tekrar deneyin.' }
});

// ========================
// GENEL MİDDLEWARE'LER
// ========================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// ========================
// ROUTE'LAR
// ========================
const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const outfitRoutes = require('./routes/outfitRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const statsRoutes = require('./routes/statsRoutes');

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/outfits', outfitRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/stats', statsRoutes);

// ========================
// SAĞLIK KONTROLÜ (Health Check)
// ========================
app.get('/api/health', (req, res) => {
    res.status(200).json({
        durum: 'Sunucu çalışıyor ✅',
        zaman: new Date().toISOString(),
        versiyon: '1.0.0'
    });
});

// ========================
// 404 HANDLER
// ========================
app.use('*', (req, res) => {
    res.status(404).json({ mesaj: `${req.originalUrl} endpoint'i bulunamadı.` });
});

// ========================
// GLOBAL HATA HANDLER
// ========================
app.use((err, req, res, next) => {
    console.error('❌ Global Hata:', err.stack);
    res.status(err.status || 500).json({
        mesaj: err.message || 'Beklenmeyen bir sunucu hatası oluştu.',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ========================
// SUNUCUYU BAŞLAT
// ========================
const PORT = process.env.PORT || 3000;

let server;
if (process.env.NODE_ENV !== 'test') {
    server = app.listen(PORT, () => {
        console.log(`🚀 Sunucu ${PORT} portunda çalışıyor | Ortam: ${process.env.NODE_ENV || 'development'}`);
    });
} else {
    server = app.listen(0); // Test için rastgele port
}

module.exports = { app, server };
