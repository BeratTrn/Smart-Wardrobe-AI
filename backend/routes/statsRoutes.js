const express = require('express');
const { getWardrobeStats } = require('../controllers/statsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/stats/wardrobe → Gardırop istatistikleri
/**
 * @swagger
 * /api/stats/wardrobe:
 *   get:
 *     summary: Gardırop istatistiklerini getirir (renk, kategori vb. dağılımlar)
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Gardırop istatistikleri başarıyla çekildi
 */
router.get('/wardrobe', protect, getWardrobeStats);

module.exports = router;
