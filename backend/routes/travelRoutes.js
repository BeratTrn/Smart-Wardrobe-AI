const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    generateSuitcase,
    getSuitcases,
    deleteSuitcase
} = require('../controllers/travelController');

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Travel
 *   description: AI destekli seyahat bavulu oluşturma ve yönetimi
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     TravelPackInput:
 *       type: object
 *       required:
 *         - sehir
 *         - baslangicTarihi
 *         - bitisTarihi
 *       properties:
 *         sehir:
 *           type: string
 *           example: Roma
 *           description: Gidilecek şehir adı (OpenWeather'ın tanıdığı herhangi bir şehir)
 *         baslangicTarihi:
 *           type: string
 *           format: date
 *           example: "2025-07-10"
 *           description: Seyahatin başlangıç tarihi (ISO 8601)
 *         bitisTarihi:
 *           type: string
 *           format: date
 *           example: "2025-07-17"
 *           description: Seyahatin bitiş tarihi (ISO 8601)
 *     TravelSuitcaseItem:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "664abc123def456789012345"
 *         resimUrl:
 *           type: string
 *           example: "https://res.cloudinary.com/example/item.jpg"
 *         kategori:
 *           type: string
 *           example: "Üst Giyim"
 *         renk:
 *           type: string
 *           example: "#2D405C"
 *         mevsim:
 *           type: string
 *           example: "Yaz"
 *         stil:
 *           type: string
 *           example: "Günlük"
 *         marka:
 *           type: string
 *           example: "Zara"
 *     TravelSuitcase:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "665xyz789abc123456789000"
 *         kullanici:
 *           type: string
 *           example: "664user000000000000000001"
 *         sehir:
 *           type: string
 *           example: "Rome"
 *         baslangicTarihi:
 *           type: string
 *           format: date-time
 *           example: "2025-07-10T00:00:00.000Z"
 *         bitisTarihi:
 *           type: string
 *           format: date-time
 *           example: "2025-07-17T00:00:00.000Z"
 *         gunSayisi:
 *           type: integer
 *           example: 8
 *         havaDurumuOzeti:
 *           type: string
 *           example: "açık hava"
 *         havaSicakligi:
 *           type: number
 *           example: 29
 *         havaIkonu:
 *           type: string
 *           example: "01d"
 *         tahminiHava:
 *           type: boolean
 *           example: false
 *           description: "true ise seyahat 5 günden uzak; forecast yerine mevcut hava kullanıldı"
 *         onerilenkiyafetler:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TravelSuitcaseItem'
 *         aiAciklamasi:
 *           type: string
 *           example: "Roma'nın sıcak yaz havasına uygun hafif ve şık bir kapsül gardırop hazırladım..."
 *         aiIpucu:
 *           type: string
 *           example: "Nötr renk bazı sayesinde tüm parçaları birbirine kombinleyebilirsiniz."
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/travel/pack:
 *   post:
 *     summary: AI ile yeni seyahat bavulu oluşturur
 *     description: >
 *       Girilen şehir ve tarih aralığı için OpenWeather'dan ortalama hava durumu tahmini çeker,
 *       ardından Llama 3.3 kullanarak kullanıcının dolabındaki kıyafetlerden kapsül bir seyahat
 *       bavulu önerisi oluşturur ve MongoDB'ye kaydeder.
 *     tags: [Travel]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TravelPackInput'
 *     responses:
 *       201:
 *         description: Bavul başarıyla oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: "Seyahat bavulunuz hazırlandı! 🧳"
 *                 bavul:
 *                   $ref: '#/components/schemas/TravelSuitcase'
 *       400:
 *         description: Eksik / geçersiz girdi veya dolap yetersiz
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: "Dolabınızda kombin yapabilmek için yeterli temel parça bulunmuyor."
 *       401:
 *         description: Yetkisiz erişim — geçerli Bearer token gerekli
 *       500:
 *         description: AI önerisi üretilemedi veya sunucu hatası
 */
router.post('/pack', generateSuitcase);

/**
 * @swagger
 * /api/travel:
 *   get:
 *     summary: Kullanıcının kayıtlı tüm seyahat bavullarını listeler
 *     description: En yeni oluşturulandan en eskiye doğru sıralanmış bavulları döndürür. Kıyafetler populate edilmiş olarak gelir.
 *     tags: [Travel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bavullar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sayi:
 *                   type: integer
 *                   example: 2
 *                   description: Kullanıcının toplam bavul sayısı
 *                 bavullar:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TravelSuitcase'
 *       401:
 *         description: Yetkisiz erişim — geçerli Bearer token gerekli
 *       500:
 *         description: Sunucu hatası
 */
router.get('/', getSuitcases);

/**
 * @swagger
 * /api/travel/{id}:
 *   delete:
 *     summary: Belirtilen seyahat bavulunu siler
 *     description: Yalnızca bavulun sahibi olan kullanıcı silme işlemi yapabilir.
 *     tags: [Travel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Silinecek bavulun MongoDB ObjectId değeri
 *         example: "665xyz789abc123456789000"
 *     responses:
 *       200:
 *         description: Bavul başarıyla silindi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: "Seyahat bavulu silindi."
 *       401:
 *         description: Yetkisiz erişim — geçerli Bearer token gerekli
 *       404:
 *         description: Bavul bulunamadı veya bu kullanıcıya ait değil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: "Bavul bulunamadı."
 *       500:
 *         description: Sunucu hatası
 */
router.delete('/:id', deleteSuitcase);

module.exports = router;
