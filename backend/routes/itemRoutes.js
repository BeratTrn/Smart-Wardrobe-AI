const express = require('express');
const multer = require('multer');
const { analyzeAndAddItem, getItems, deleteItem } = require('../controllers/itemController'); // deleteItem eklendi!
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Fotoğrafları havada (RAM'de) tutmak için multer ayarı
const upload = multer({ storage: multer.memoryStorage() });

// Yeni Kıyafet Ekleme Kapısı (POST isteği)
// Sıralama çok önemli: 1. Kimlik kontrolü -> 2. Fotoğrafı al -> 3. Yapay Zekaya gönder
router.post('/add', protect, upload.single('resim'), analyzeAndAddItem);

// Dolaptaki Kıyafetleri Getirme Kapısı (GET) - YENİ EKLENEN
router.get('/', protect, getItems);

// Kıyafet Silme Kapısı (DELETE) - YENİ EKLENEN
// URL'nin sonuna silinecek kıyafetin ID'si gelecek (Örn: /api/items/12345abcde)
router.delete('/:id', protect, deleteItem);

module.exports = router;