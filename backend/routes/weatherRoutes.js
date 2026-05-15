const express = require('express');
const { getWeatherByCoords, getWeatherByCity } = require('../controllers/weatherController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/weather:
 *   get:
 *     summary: GPS koordinatlarına göre hava durumunu getirir
 *     description: Flutter'dan gelen `enlem` ve `boylam` değerleriyle OpenWeatherMap API'ye istek atar.
 *     tags: [Weather]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: enlem
 *         required: true
 *         schema:
 *           type: number
 *         example: 41.01
 *         description: Enlem koordinatı
 *       - in: query
 *         name: boylam
 *         required: true
 *         schema:
 *           type: number
 *         example: 28.97
 *         description: Boylam koordinatı
 *     responses:
 *       200:
 *         description: Hava durumu bilgisi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 havaDurumu:
 *                   $ref: '#/components/schemas/WeatherData'
 *       400:
 *         description: Enlem veya boylam eksik
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Yetkisiz erişim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       502:
 *         description: OpenWeatherMap API hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', protect, getWeatherByCoords);

/**
 * @swagger
 * /api/weather/city:
 *   get:
 *     summary: Şehir ismine göre hava durumunu getirir
 *     description: Verilen şehir adı için OpenWeatherMap API'den güncel hava durumunu çeker.
 *     tags: [Weather]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sehir
 *         required: true
 *         schema:
 *           type: string
 *         example: Istanbul
 *         description: Şehir adı (Türkçe veya İngilizce)
 *     responses:
 *       200:
 *         description: Hava durumu bilgisi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 havaDurumu:
 *                   $ref: '#/components/schemas/WeatherData'
 *       400:
 *         description: Şehir adı belirtilmedi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Yetkisiz erişim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       502:
 *         description: OpenWeatherMap API hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/city', protect, getWeatherByCity);

module.exports = router;
