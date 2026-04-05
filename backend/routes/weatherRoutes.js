const express = require('express');
const { getWeatherByCoords, getWeatherByCity } = require('../controllers/weatherController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/weather?enlem=41.01&boylam=28.97   → Koordinata göre
// GET /api/weather/city?sehir=Istanbul         → Şehre göre

router.get('/', protect, getWeatherByCoords);
router.get('/city', protect, getWeatherByCity);

module.exports = router;
