const express = require('express');
const { getWardrobeStats } = require('../controllers/statsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/stats/wardrobe:
 *   get:
 *     summary: Gardırop istatistiklerini getirir
 *     description: |
 *       Kullanıcının gardırobundaki kıyasetlerin kategori ve renk dağılımlarını,
 *       toplam kıyafet sayısını ve diğer özet istatistikleri döner.
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Gardırop istatistikleri
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: Gardırop istatistikleri getirildi.
 *                 istatistikler:
 *                   $ref: '#/components/schemas/WardrobeStats'
 *       401:
 *         description: Yetkisiz erişim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Sunucu hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/wardrobe', protect, getWardrobeStats);

module.exports = router;
