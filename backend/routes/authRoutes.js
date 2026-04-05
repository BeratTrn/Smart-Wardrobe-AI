const express = require('express');
const { registerUser, loginUser, getMe, updateProfile, changePassword, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);
router.get('/me', protect, getMe);
router.put('/update', protect, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;
