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
