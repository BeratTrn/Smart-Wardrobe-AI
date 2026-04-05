const express = require('express');
const { analyzeAndAddItem, getItems, getItemById, updateItem, deleteItem } = require('../controllers/itemController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

const router = express.Router();

// POST   /api/items/add       → Fotoğraf yükle + AI analiz + ekle
// GET    /api/items            → Tüm kıyafetleri listele (filtreli)
// GET    /api/items/:id        → Tek kıyafet getir
// PUT    /api/items/:id        → Kıyafet bilgilerini güncelle
// DELETE /api/items/:id        → Kıyafet sil

router.post('/add', protect, upload.single('resim'), analyzeAndAddItem);
router.get('/', protect, getItems);
router.get('/:id', protect, getItemById);
router.put('/:id', protect, updateItem);
router.delete('/:id', protect, deleteItem);

module.exports = router;
