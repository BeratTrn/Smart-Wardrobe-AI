const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { saveOutfit, getSavedOutfits, deleteOutfit } = require('../controllers/savedOutfitController');

/**
 * @swagger
 * tags:
 *   name: Saved Outfits
 *   description: Kullanıcının kaydettiği kombinleri yönetir
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     HavaDurumu:
 *       type: object
 *       properties:
 *         sicaklik:
 *           type: number
 *           example: 18
 *         durum:
 *           type: string
 *           example: Parçalı Bulutlu
 *         konum:
 *           type: string
 *           example: İstanbul
 *     SavedOutfitInput:
 *       type: object
 *       properties:
 *         baslik:
 *           type: string
 *           example: Seyahat - İstanbul
 *         aciklama:
 *           type: string
 *           example: Bu kombin İstanbul'un serin havası için mükemmel...
 *         havaDurumu:
 *           $ref: '#/components/schemas/HavaDurumu'
 *         kiyafetler:
 *           type: array
 *           items:
 *             type: string
 *           example: ["664abc123...", "664abc456..."]
 *         kullaniciFoto:
 *           type: string
 *           example: https://res.cloudinary.com/example/lookbook.jpg
 *     SavedOutfit:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         kullanici:
 *           type: string
 *         baslik:
 *           type: string
 *         aciklama:
 *           type: string
 *         havaDurumu:
 *           $ref: '#/components/schemas/HavaDurumu'
 *         kiyafetler:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *               resimUrl:
 *                 type: string
 *               renk:
 *                 type: string
 *               kategori:
 *                 type: string
 *               stil:
 *                 type: string
 *               marka:
 *                 type: string
 *         kullaniciFoto:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/saved-outfits:
 *   post:
 *     summary: Yeni bir kombini kaydet
 *     tags: [Saved Outfits]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SavedOutfitInput'
 *     responses:
 *       201:
 *         description: Kombin başarıyla kaydedildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: Kombin kaydedildi! 💾
 *                 kombin:
 *                   $ref: '#/components/schemas/SavedOutfit'
 *       401:
 *         description: Yetkisiz erişim
 *       500:
 *         description: Sunucu hatası
 */
router.post('/', protect, saveOutfit);

/**
 * @swagger
 * /api/saved-outfits:
 *   get:
 *     summary: Kullanıcının kaydettiği tüm kombinleri listeler
 *     tags: [Saved Outfits]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kayıtlı kombinler başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: Kaydedilen kombinler getirildi.
 *                 toplam:
 *                   type: integer
 *                   example: 3
 *                 kombinler:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SavedOutfit'
 *       401:
 *         description: Yetkisiz erişim
 *       500:
 *         description: Sunucu hatası
 */
router.get('/', protect, getSavedOutfits);

/**
 * @swagger
 * /api/saved-outfits/{id}:
 *   delete:
 *     summary: Kaydedilen bir kombini siler
 *     tags: [Saved Outfits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Silinecek kombinin MongoDB ObjectId değeri
 *     responses:
 *       200:
 *         description: Kombin başarıyla silindi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: Kombin silindi. 🗑️
 *       403:
 *         description: Bu kombini silme yetkiniz yok
 *       404:
 *         description: Kombin bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.delete('/:id', protect, deleteOutfit);

module.exports = router;
