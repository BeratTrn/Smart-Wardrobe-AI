const express = require('express');
const { kombinOnerisi, getOutfits, outfitFeedback, deleteOutfit } = require('../controllers/outfitController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// POST   /api/outfits/recommend     → AI kombin önerisi al
// GET    /api/outfits                → Geçmiş kombinleri listele
// PUT    /api/outfits/:id/feedback   → Kombin beğen/beğenme
// DELETE /api/outfits/:id            → Kombini sil

router.post('/recommend', protect, kombinOnerisi);
router.get('/', protect, getOutfits);
router.put('/:id/feedback', protect, outfitFeedback);
router.delete('/:id', protect, deleteOutfit);

module.exports = router;
