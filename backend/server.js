const express = require('express');
const cors = require('cors');

// Uygulamayı oluştur
const app = express();

// Ara yazılımlar (Middleware)
app.use(cors()); // Farklı portlardan gelen isteklere izin ver
app.use(express.json()); // Gelen JSON verilerini okuyabilmek için

// Test Uç Noktası (Endpoint)
app.get('/', (req, res) => {
    res.json({ mesaj: 'Smart Wardrobe AI Backend API Çalışıyor!' });
});

// Sunucuyu Dinlemeye Başla
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda başarıyla ayağa kalktı!`);
});