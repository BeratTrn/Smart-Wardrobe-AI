const express = require('express');
const {
    registerUser,
    resendVerification,
    verifyEmail,
    loginUser,
    getMe,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// --- Public routes ---
router.post('/register', registerUser);          // Adım 1: Kayıt (OTP gönderir, JWT yok)
router.post('/resend-verification', resendVerification);
router.post('/verify-email', verifyEmail);       // Adım 2: OTP doğrula → JWT al
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);

// --- Private routes (JWT gerektirir) ---
router.get('/me', protect, getMe);
router.put('/update', protect, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;
