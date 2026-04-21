const express = require('express');
const { kombinOnerisi, getOutfits, outfitFeedback, deleteOutfit } = require('../controllers/outfitController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// POST   /api/outfits/recommend     → AI kombin önerisi al
// GET    /api/outfits                → Geçmiş kombinleri listele
// PUT    /api/outfits/:id/feedback   → Kombin beğen/beğenme
// DELETE /api/outfits/:id            → Kombini sil

/**
 * @swagger
 * /api/outfits/recommend:
 *   post:
 *     summary: AI destekli kombin önerisi alır
 *     tags: [Outfits]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stil:
 *                 type: string
 *               mevsim:
 *                 type: string
 *     responses:
 *       200:
 *         description: Kombin önerisi başarıyla alındı
 */
router.post('/recommend', protect, kombinOnerisi);

/**
 * @swagger
 * /api/outfits:
 *   get:
 *     summary: Geçmiş kombinleri listeler
 *     tags: [Outfits]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kombin listesi
 */
router.get('/', protect, getOutfits);

/**
 * @swagger
 * /api/outfits/{id}/feedback:
 *   put:
 *     summary: Kombine geri bildirim (beğen/beğenme) verir
 *     tags: [Outfits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               liked:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Geri bildirim kaydedildi
 */
router.put('/:id/feedback', protect, outfitFeedback);

/**
 * @swagger
 * /api/outfits/{id}:
 *   delete:
 *     summary: Bir kombini siler
 *     tags: [Outfits]
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
 *         description: Kombin silindi
 */
router.delete('/:id', protect, deleteOutfit);

module.exports = router;
