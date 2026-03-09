require('dotenv').config(); // .env dosyasını okuması için en başa ekliyoruz
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db'); // Veritabanı bağlantı fonksiyonunu içeri aktar

// Rotaları (Yolları) İçeri Aktar
const authRoutes = require('./routes/authRoutes');

// Veritabanına Bağlan
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// API Rotalarını Kullan (Gelen istekleri ilgili kapıya yönlendir)
app.use('/api/auth', authRoutes);

// Test Uç Noktası
app.get('/', (req, res) => {
    res.json({ mesaj: 'Smart Wardrobe AI Backend API Çalışıyor! 🚀' });
});

// Portu .env'den al, yoksa 3000 kullan
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda başarıyla ayağa kalktı!`);
});