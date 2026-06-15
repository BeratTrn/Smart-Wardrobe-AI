const express = require('express');
const { kombinOnerisi, getOutfits, outfitFeedback, deleteOutfit } = require('../controllers/outfitController');
const { webKombinOnerisi } = require('../controllers/webOutfitController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/outfits/recommend:
 *   post:
 *     summary: AI destekli kombin önerisi alır
 *     description: |
 *       Claude AI, kullanıcının gardırobundaki kıyafetleri ve hava durumunu analiz ederek
 *       etkinliğe uygun bir kombin önerir. Öneri MongoDB'ye kaydedilir.
 *       `sehir` veya `enlem`/`boylam` gönderilirse hava durumu verisi de kullanılır.
 *     tags: [Outfits]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [etkinlik]
 *             properties:
 *               etkinlik:
 *                 type: string
 *                 example: İş toplantısı
 *                 description: Kombin önerisinin yapılacağı etkinlik
 *               sehir:
 *                 type: string
 *                 example: Istanbul
 *                 description: Hava durumu için şehir adı
 *               enlem:
 *                 type: number
 *                 example: 41.01
 *                 description: GPS enlem koordinatı (sehir yerine kullanılabilir)
 *               boylam:
 *                 type: number
 *                 example: 28.97
 *                 description: GPS boylam koordinatı (sehir yerine kullanılabilir)
 *     responses:
 *       200:
 *         description: Kombin önerisi başarıyla oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: Kombin hazır! 🎨
 *                 kombin:
 *                   $ref: '#/components/schemas/Outfit'
 *       400:
 *         description: Etkinlik belirtilmedi veya gardırop boş
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
 *       500:
 *         description: AI servisi hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/recommend', protect, kombinOnerisi);

/**
 * @swagger
 * /api/outfits/web-recommend:
 *   post:
 *     summary: Gardırop + web'den bulunan ürünlerle AI destekli kombin önerisi alır
 *     description: |
 *       Kullanıcının gardırobundan çıkarılan stil profiline (sık kullanılan stil,
 *       renk, mevcut sezon, eksik kategoriler) göre web'de ürün araması yapılır.
 *       Bulunan ürünler ve kullanıcının kendi kıyafetleri birlikte AI'a sunulur;
 *       AI anatomik kurallara uygun bir kombin seçer. Web'den en fazla 2 parça
 *       önerilebilir, kombinin temeli kullanıcının gardırobudur.
 *     tags: [Outfits]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               etkinlik:
 *                 type: string
 *                 example: Günlük
 *               sehir:
 *                 type: string
 *                 example: Istanbul
 *               enlem:
 *                 type: number
 *                 example: 41.01
 *               boylam:
 *                 type: number
 *                 example: 28.97
 *     responses:
 *       200:
 *         description: Web destekli kombin önerisi başarıyla oluşturuldu
 *       400:
 *         description: Gardırop boş ve web'den de sonuç bulunamadı
 *       401:
 *         description: Yetkisiz erişim
 *       500:
 *         description: AI servisi hatası
 */
router.post('/web-recommend', protect, webKombinOnerisi);

/**
 * @swagger
 * /api/outfits:
 *   get:
 *     summary: Kullanıcının geçmiş kombin önerilerini listeler
 *     description: En yeni öneriler önce gelecek şekilde sıralanmış tüm kombinler döner.
 *     tags: [Outfits]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kombin listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                 toplam:
 *                   type: integer
 *                   example: 5
 *                 kombinler:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Outfit'
 *       401:
 *         description: Yetkisiz erişim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', protect, getOutfits);

/**
 * @swagger
 * /api/outfits/{id}/feedback:
 *   put:
 *     summary: Kombine geri bildirim verir (beğen / beğenme)
 *     tags: [Outfits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Kombinin MongoDB ObjectId değeri
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [begeniyor]
 *             properties:
 *               begeniyor:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Geri bildirim kaydedildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: Geri bildirim alındı. 👍
 *       401:
 *         description: Yetkisiz erişim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Kombin bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id/feedback', protect, outfitFeedback);

/**
 * @swagger
 * /api/outfits/{id}:
 *   delete:
 *     summary: Bir kombin önerisini siler
 *     tags: [Outfits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Kombinin MongoDB ObjectId değeri
 *     responses:
 *       200:
 *         description: Kombin silindi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: Kombin silindi. 🗑️
 *       401:
 *         description: Yetkisiz erişim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Bu kombini silme yetkiniz yok
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Kombin bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', protect, deleteOutfit);

module.exports = router;
