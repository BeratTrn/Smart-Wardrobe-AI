const express = require('express');
const { getWeatherByCoords, getWeatherByCity } = require('../controllers/weatherController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/weather?enlem=41.01&boylam=28.97   → Koordinata göre
// GET /api/weather/city?sehir=Istanbul         → Şehre göre

/**
 * @swagger
 * /api/weather:
 *   get:
 *     summary: Koordinatlara göre hava durumunu getirir
 *     tags: [Weather]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: enlem
 *         schema:
 *           type: string
 *         description: Enlem değeri (örn. 41.01)
 *       - in: query
 *         name: boylam
 *         schema:
 *           type: string
 *         description: Boylam değeri (örn. 28.97)
 *     responses:
 *       200:
 *         description: Hava durumu bilgisi
 */
router.get('/', protect, getWeatherByCoords);

/**
 * @swagger
 * /api/weather/city:
 *   get:
 *     summary: Şehir ismine göre hava durumunu getirir
 *     tags: [Weather]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sehir
 *         required: true
 *         schema:
 *           type: string
 *         description: Şehir ismi (örn. Istanbul)
 *     responses:
 *       200:
 *         description: Hava durumu bilgisi
 */
router.get('/city', protect, getWeatherByCity);

module.exports = router;
