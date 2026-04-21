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
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Yeni kullanıcı kaydı oluşturur (OTP gönderilir)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Başarılı
 */
router.post('/register', registerUser);          // Adım 1: Kayıt (OTP gönderir, JWT yok)
/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Doğrulama kodunu tekrar gönderir
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Doğrulama kodu gönderildi
 */
router.post('/resend-verification', resendVerification);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: E-posta adresini doğrular ve JWT döner
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: E-posta doğrulandı (JWT token döner)
 */
router.post('/verify-email', verifyEmail);       // Adım 2: OTP doğrula → JWT al

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Kullanıcı girişi
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Giriş başarılı (JWT token döner)
 */
router.post('/login', loginUser);
/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Şifre sıfırlama e-postası gönderir
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: E-posta gönderildi
 */
router.post('/forgot-password', forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password/{resettoken}:
 *   put:
 *     summary: Şifre sıfırlama işlemini tamamlar
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: resettoken
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
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Şifre başarıyla güncellendi
 */
router.put('/reset-password/:resettoken', resetPassword);

// --- Private routes (JWT gerektirir) ---
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Giriş yapmış kullanıcının profil bilgilerini getirir
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kullanıcı bilgileri
 */
router.get('/me', protect, getMe);

/**
 * @swagger
 * /api/auth/update:
 *   put:
 *     summary: Kullanıcı profilini günceller
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profil başarıyla güncellendi
 */
router.put('/update', protect, updateProfile);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Kullanıcının şifresini değiştirir
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Şifre başarıyla değiştirildi
 */
router.put('/change-password', protect, changePassword);

module.exports = router;
