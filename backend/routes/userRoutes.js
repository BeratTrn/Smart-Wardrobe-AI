const express = require('express');
const {
    updateProfile,
    updateBodyProfile,
    updateProfilePhoto,
    uploadProfilePhoto,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Kullanıcı profili yönetimi (kimlik doğrulama dışı)
 */

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Kullanıcı profilini günceller
 *     description: |
 *       Giriş yapmış kullanıcının kullanıcı adını ve/veya `tercihler`
 *       (favori stil, renkler, bildirim tercihi) alanlarını günceller.
 *       En az bir alan gönderilmelidir.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               kullaniciAdi:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 example: newusername
 *               tercihler:
 *                 $ref: '#/components/schemas/Tercihler'
 *     responses:
 *       200:
 *         description: Profil başarıyla güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: Profil güncellendi. ✅
 *                 kullanici:
 *                   $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Token eksik veya geçersiz
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
router.put('/profile', protect, updateProfile);

/**
 * @swagger
 * /api/users/profile/body:
 *   put:
 *     summary: Vücut şekli ve kalıp tercihini günceller
 *     description: |
 *       Flutter Vücut Profili ekranından gelen veri MongoDB `vucut` alanına kaydedilir.
 *       AI stilist bu bilgileri kombin önerilerinde kullanır.
 *       En az bir alan (`bodyShape` veya `fitPreference`) gönderilmelidir.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bodyShape:
 *                 type: string
 *                 enum: [kum_saati, armut, ters_ucgen, dikdortgen]
 *                 example: kum_saati
 *               fitPreference:
 *                 type: string
 *                 enum: [slim, regular, oversize]
 *                 example: regular
 *     responses:
 *       200:
 *         description: Vücut profili başarıyla güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: Vücut profili güncellendi. ✅
 *                 vucut:
 *                   $ref: '#/components/schemas/VucutProfili'
 *       400:
 *         description: Geçersiz veya eksik değer
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Token eksik veya geçersiz
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
router.put('/profile/body', protect, updateBodyProfile);

/**
 * @swagger
 * /api/users/profile/photo:
 *   put:
 *     summary: Avatar yolunu profil fotoğrafı olarak kaydeder
 *     description: |
 *       Flutter asset yolunu (örn. `assets/images/avatars/erkek_avatar_1.png`)
 *       MongoDB `profilFoto` alanına kaydeder. Cloudinary yüklemesi yapılmaz;
 *       gerçek fotoğraf yüklemek için `/api/users/profile/photo/upload` kullanın.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [profilFoto]
 *             properties:
 *               profilFoto:
 *                 type: string
 *                 example: assets/images/avatars/erkek_avatar_1.png
 *     responses:
 *       200:
 *         description: Profil fotoğrafı başarıyla güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: Profil fotoğrafı güncellendi. ✅
 *                 profilFoto:
 *                   type: string
 *                   example: assets/images/avatars/erkek_avatar_1.png
 *       400:
 *         description: Geçersiz veya boş değer
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Token eksik veya geçersiz
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
router.put('/profile/photo', protect, updateProfilePhoto);

/**
 * @swagger
 * /api/users/profile/photo/upload:
 *   put:
 *     summary: Gerçek fotoğrafı Cloudinary'e yükler ve profil fotoğrafı olarak kaydeder
 *     description: |
 *       Galeri veya kameradan seçilen fotoğraf Cloudinary'e yüklenir,
 *       dönen güvenli URL MongoDB `profilFoto` alanına kaydedilir.
 *       Form alanı adı `resim` olmalıdır (`Content-Type: multipart/form-data`).
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [resim]
 *             properties:
 *               resim:
 *                 type: string
 *                 format: binary
 *                 description: Profil fotoğrafı dosyası (JPG / PNG, maks 800×800 önerilen)
 *     responses:
 *       200:
 *         description: Fotoğraf Cloudinary'e yüklendi ve profil güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: Profil fotoğrafı yüklendi. ✅
 *                 profilFoto:
 *                   type: string
 *                   example: https://res.cloudinary.com/demo/image/upload/v1/profile.jpg
 *       400:
 *         description: Fotoğraf gönderilmedi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Token eksik veya geçersiz
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
router.put('/profile/photo/upload', protect, upload.single('resim'), uploadProfilePhoto);

module.exports = router;
