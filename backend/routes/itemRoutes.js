const express = require('express');
const multer  = require('multer');
const { analyzeOnly, analyzeAndAddItem, getItems, getItemById, updateItem, deleteItem, toggleFavori, getFavorites } = require('../controllers/itemController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

// In-memory storage — file bytes stay in req.file.buffer, nothing hits Cloudinary.
// Used only for the analyze-only preview step.
const uploadMemory = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// POST   /api/items/analyze-only → Yalnızca AI analiz (Cloudinary/MongoDB'ye kayıt YOK)
// POST   /api/items/add          → Fotoğraf yükle + AI analiz + ekle
// GET    /api/items              → Tüm kıyafetleri listele (filtreli)
// GET    /api/items/:id          → Tek kıyafet getir
// PUT    /api/items/:id          → Kıyafet bilgilerini güncelle
// DELETE /api/items/:id          → Kıyafet sil

/**
 * @swagger
 * /api/items/analyze-only:
 *   post:
 *     summary: Kıyafeti yalnızca AI ile analiz eder (Cloudinary / MongoDB'ye kayıt yapılmaz)
 *     description: |
 *       Flutter "önizleme → kullanıcı düzelt → kaydet" akışının 1. adımı.
 *       Fotoğraf FastAPI motoruna gönderilir; kategori + renk tahmini döner.
 *       Cloudinary veya MongoDB'ye hiçbir şey yazılmaz.
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [resim]
 *             properties:
 *               resim:
 *                 type: string
 *                 format: binary
 *                 description: Kıyafet fotoğrafı (JPG / PNG)
 *     responses:
 *       200:
 *         description: AI analizi tamamlandı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                 analiz:
 *                   type: object
 *                   properties:
 *                     kategori:
 *                       type: string
 *                       example: Üst Giyim
 *                     renk:
 *                       type: string
 *                       example: '#2D405C'
 *                     aiDogrulandi:
 *                       type: boolean
 *       400:
 *         description: Fotoğraf gönderilmedi
 *       401:
 *         description: Yetkisiz erişim
 */
router.post('/analyze-only', protect, uploadMemory.single('resim'), analyzeOnly);

/**
 * @swagger
 * /api/items/add:
 *   post:
 *     summary: Yeni bir kıyafet ekler ve AI ile analiz eder
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               resim:
 *                 type: string
 *                 format: binary
 *               kategori:
 *                 type: string
 *                 description: Kullanıcının onayladığı kategori (AI tahminini override eder)
 *               renk:
 *                 type: string
 *                 description: Kullanıcının onayladığı HEX renk kodu
 *               mevsim:
 *                 type: string
 *               stil:
 *                 type: string
 *     responses:
 *       201:
 *         description: Kıyafet eklendi
 */
router.post('/add', protect, upload.single('resim'), analyzeAndAddItem);

/**
 * @swagger
 * /api/items:
 *   get:
 *     summary: Tüm kıyafetleri listeler
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: kategori
 *         schema:
 *           type: string
 *         description: Kategoriye göre filtrele
 *       - in: query
 *         name: renk
 *         schema:
 *           type: string
 *         description: Renge göre filtrele
 *     responses:
 *       200:
 *         description: Kıyafet listesi
 */
router.get('/', protect, getItems);

/**
 * @swagger
 * /api/items/favorites:
 *   get:
 *     summary: Favori kıyafetleri listeler
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Favori listesi
 */
router.get('/favorites', protect, getFavorites);

/**
 * @swagger
 * /api/items/{id}/favorite:
 *   patch:
 *     summary: Kıyafeti favorilere ekler veya çıkarır (toggle)
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Favori durumu güncellendi
 */
router.patch('/:id/favorite', protect, toggleFavori);

/**
 * @swagger
 * /api/items/{id}:
 *   get:
 *     summary: Belirli bir kıyafeti getirir
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Kıyafet bilgileri
 */
router.get('/:id', protect, getItemById);

/**
 * @swagger
 * /api/items/{id}:
 *   put:
 *     summary: Bir kıyafetin bilgilerini günceller
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               kategori:
 *                 type: string
 *               renk:
 *                 type: string
 *               mevsim:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Kıyafet güncellendi
 */
router.put('/:id', protect, updateItem);

/**
 * @swagger
 * /api/items/{id}:
 *   delete:
 *     summary: Bir kıyafeti siler
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Kıyafet silindi
 */
router.delete('/:id', protect, deleteItem);

module.exports = router;
