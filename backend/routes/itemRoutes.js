const express = require('express');
const multer = require('multer');
const { analyzeAndAddItem, getItems } = require('../controllers/itemController'); // getItems eklendi!
const { protect } = require('../middleware/authMiddleware'); // Güvenlik görevlisi (middleware) eklendi!

const router = express.Router();

// Fotoğrafları havada (RAM'de) tutmak için multer ayarı
const upload = multer({ storage: multer.memoryStorage() });

// Yeni Kıyafet Ekleme Kapısı (POST isteği)
// Sıralama çok önemli: 1. Kimlik kontrolü -> 2. Fotoğrafı al -> 3. Yapay Zekaya gönder
router.post('/add', protect, upload.single('resim'), analyzeAndAddItem);

// Dolaptaki Kıyafetleri Getirme Kapısı (GET) - YENİ EKLENEN
router.get('/', protect, getItems);

module.exports = router;