const express = require('express');
const { getWardrobeStats } = require('../controllers/statsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/stats/wardrobe → Gardırop istatistikleri
router.get('/wardrobe', protect, getWardrobeStats);

module.exports = router;
