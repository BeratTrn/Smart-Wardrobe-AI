const express = require('express');
const multer  = require('multer');
const { analyzeOnly, analyzeAndAddItem, getItems, getItemById, updateItem, deleteItem, toggleFavori, getFavorites } = require('../controllers/itemController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

// In-memory storage — file bytes stay in req.file.buffer, nothing hits Cloudinary.
// Used only for the analyze-only preview step.
const uploadMemory = multer({ storage: multer.memoryStorage() });

const router = express.Router();

/**
 * @swagger
 * /api/items/analyze-only:
 *   post:
 *     summary: Kıyafeti yalnızca AI ile analiz eder
 *     description: |
 *       Flutter "önizleme → kullanıcı düzelt → kaydet" akışının **1. adımı**.
 *       Fotoğraf FastAPI motoruna gönderilir; kategori + renk tahmini döner.
 *       Cloudinary veya MongoDB'ye hiçbir şey yazılmaz.
 *     tags: [Items]
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
 *                 description: Kıyafet fotoğrafı (JPG / PNG)
 *     responses:
 *       200:
 *         description: AI analizi tamamlandı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: AI analizi tamamlandı.
 *                 analiz:
 *                   type: object
 *                   properties:
 *                     kategori:
 *                       type: string
 *                       example: Üst Giyim
 *                     renk:
 *                       type: string
 *                       example: '#2D405C'
 *                     aiDogrulandi:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Fotoğraf gönderilmedi
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
 */
router.post('/analyze-only', protect, uploadMemory.single('resim'), analyzeOnly);

/**
 * @swagger
 * /api/items/add:
 *   post:
 *     summary: Yeni bir kıyafet ekler (Cloudinary + AI analiz + MongoDB)
 *     description: |
 *       Flutter "önizleme → kullanıcı düzelt → kaydet" akışının **2. adımı**.
 *       Fotoğraf Cloudinary'e yüklenir, FastAPI ile analiz edilir ve MongoDB'ye kaydedilir.
 *       `kategori` / `renk` gönderilirse AI tahminini override eder.
 *     tags: [Items]
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
 *                 description: Kıyafet fotoğrafı (JPG / PNG)
 *               kategori:
 *                 type: string
 *                 enum: [Üst Giyim, Alt Giyim, Ayakkabı, Aksesuar, Tek Parça, Dış Giyim, Diğer]
 *                 description: Kullanıcının onayladığı kategori (boş bırakılırsa AI tahmini kullanılır)
 *               renk:
 *                 type: string
 *                 description: Kullanıcının onayladığı HEX renk kodu (örn. #2D405C)
 *               mevsim:
 *                 type: string
 *                 example: Tüm Mevsimler
 *               stil:
 *                 type: string
 *                 example: Casual
 *     responses:
 *       201:
 *         description: Kıyafet başarıyla eklendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: Kıyafet eklendi!
 *                 kiyafet:
 *                   $ref: '#/components/schemas/ClothingItem'
 *       400:
 *         description: Fotoğraf gönderilmedi veya geçersiz veri
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
 */
router.post('/add', protect, upload.single('resim'), analyzeAndAddItem);

/**
 * @swagger
 * /api/items:
 *   get:
 *     summary: Kullanıcının tüm kıyafetlerini listeler
 *     description: İsteğe bağlı `kategori` ve `renk` query parametreleriyle filtrelenebilir.
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: kategori
 *         schema:
 *           type: string
 *           enum: [Üst Giyim, Alt Giyim, Ayakkabı, Aksesuar, Tek Parça, Dış Giyim, Diğer]
 *         description: Kategoriye göre filtrele
 *       - in: query
 *         name: renk
 *         schema:
 *           type: string
 *         description: Renge göre filtrele (HEX kodu, örn. %232D405C)
 *     responses:
 *       200:
 *         description: Kıyafet listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                 toplam:
 *                   type: integer
 *                   example: 12
 *                 kiyafetler:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ClothingItem'
 *       401:
 *         description: Yetkisiz erişim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', protect, getItems);

/**
 * @swagger
 * /api/items/favorites:
 *   get:
 *     summary: Kullanıcının favori kıyafetlerini listeler
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Favori kıyafet listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                 toplam:
 *                   type: integer
 *                 kiyafetler:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ClothingItem'
 *       401:
 *         description: Yetkisiz erişim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/favorites', protect, getFavorites);

/**
 * @swagger
 * /api/items/{id}/favorite:
 *   patch:
 *     summary: Kıyafeti favorilere ekler veya çıkarır (toggle)
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Kıyafetin MongoDB ObjectId değeri
 *     responses:
 *       200:
 *         description: Favori durumu güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: Favorilere eklendi.
 *                 favori:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Yetkisiz erişim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Kıyafet bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id/favorite', protect, toggleFavori);

/**
 * @swagger
 * /api/items/{id}:
 *   get:
 *     summary: Belirli bir kıyafeti getirir
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Kıyafetin MongoDB ObjectId değeri
 *     responses:
 *       200:
 *         description: Kıyafet bilgileri
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 kiyafet:
 *                   $ref: '#/components/schemas/ClothingItem'
 *       401:
 *         description: Yetkisiz erişim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Kıyafet bulunamadı veya bu kullanıcıya ait değil
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', protect, getItemById);

/**
 * @swagger
 * /api/items/{id}:
 *   put:
 *     summary: Bir kıyafetin bilgilerini günceller
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Kıyafetin MongoDB ObjectId değeri
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               kategori:
 *                 type: string
 *                 enum: [Üst Giyim, Alt Giyim, Ayakkabı, Aksesuar, Tek Parça, Dış Giyim, Diğer]
 *               renk:
 *                 type: string
 *                 example: '#2D405C'
 *               mevsim:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [İlkbahar, Yaz, Sonbahar, Kış, Tüm Mevsimler]
 *               stil:
 *                 type: string
 *                 example: Casual
 *               marka:
 *                 type: string
 *                 example: Zara
 *     responses:
 *       200:
 *         description: Kıyafet güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: Kıyafet güncellendi. ✅
 *                 kiyafet:
 *                   $ref: '#/components/schemas/ClothingItem'
 *       401:
 *         description: Yetkisiz erişim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Kıyafet bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', protect, updateItem);

/**
 * @swagger
 * /api/items/{id}:
 *   delete:
 *     summary: Bir kıyafeti siler
 *     description: Kıyafet MongoDB'den silinir ve Cloudinary'deki fotoğrafı kaldırılır.
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Kıyafetin MongoDB ObjectId değeri
 *     responses:
 *       200:
 *         description: Kıyafet silindi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: Kıyafet silindi. 🗑️
 *       401:
 *         description: Yetkisiz erişim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Bu kıyafeti silme yetkiniz yok
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Kıyafet bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', protect, deleteItem);

module.exports = router;
