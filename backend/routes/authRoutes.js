const express = require('express');
const {
    registerUser,
    resendVerification,
    verifyEmail,
    loginUser,
    getMe,
    changePassword,
    forgotPassword,
    resetPassword,
    deleteAccount,
    googleAuth,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// ── Açık (Public) Rotalar ─────────────────────────────────────────────────────

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Yeni kullanıcı kaydı oluşturur
 *     description: |
 *       Geçici kayıt oluşturur ve e-posta adresine 6 haneli OTP gönderir.
 *       JWT döndürmez — önce `/api/auth/verify-email` çağrılmalıdır.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [kullaniciAdi, email, sifre]
 *             properties:
 *               kullaniciAdi:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 example: johndoe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               sifre:
 *                 type: string
 *                 minLength: 6
 *                 example: gizlisifre123
 *     responses:
 *       201:
 *         description: OTP e-posta ile gönderildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: Doğrulama kodu e-posta adresinize gönderildi.
 *                 email:
 *                   type: string
 *                   example: john@example.com
 *       400:
 *         description: Eksik alan veya e-posta zaten kullanımda
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       503:
 *         description: E-posta gönderilemedi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', registerUser);

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Doğrulama kodunu yeniden gönderir
 *     description: Süresi dolmuş veya alınamamış OTP için yeni kod üretip gönderir.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *     responses:
 *       200:
 *         description: Yeni OTP gönderildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: Yeni doğrulama kodu e-posta adresinize gönderildi.
 *                 email:
 *                   type: string
 *       400:
 *         description: Hesap zaten doğrulanmış
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Doğrulama bekleyen kayıt bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       503:
 *         description: E-posta gönderilemedi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/resend-verification', resendVerification);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: E-posta adresini doğrular ve JWT döner
 *     description: |
 *       Kullanıcının girdiği 6 haneli OTP doğrulanır; başarılı olursa
 *       MongoDB'de kalıcı kullanıcı oluşturulur ve JWT token döner.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otpCode]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               otpCode:
 *                 type: string
 *                 example: '482951'
 *     responses:
 *       200:
 *         description: E-posta doğrulandı, JWT döner
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: E-posta adresiniz doğrulandı! Hoş geldiniz. 🎉
 *                 token:
 *                   type: string
 *                   description: 30 gün geçerli JWT
 *                 kullanici:
 *                   $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Hatalı veya süresi dolmuş OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/verify-email', verifyEmail);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Kullanıcı girişi
 *     description: |
 *       E-posta ve şifre ile kimlik doğrulaması yapar.
 *       Doğrulanmamış hesaplar için `requiresVerification: true` alanı döner.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, sifre]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               sifre:
 *                 type: string
 *                 example: gizlisifre123
 *     responses:
 *       200:
 *         description: Giriş başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: Giriş başarılı! 🔑
 *                 token:
 *                   type: string
 *                   description: 30 gün geçerli JWT
 *                 kullanici:
 *                   $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: E-posta veya şifre hatalı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: E-posta henüz doğrulanmamış
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: E-posta adresiniz henüz doğrulanmamış.
 *                 requiresVerification:
 *                   type: boolean
 *                   example: true
 *                 email:
 *                   type: string
 */
router.post('/login', loginUser);

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     summary: Google hesabı ile giriş yap veya kayıt ol
 *     description: |
 *       Flutter `google_sign_in` paketinden alınan `idToken` ile kimlik doğrulaması yapar.
 *       Hesap yoksa otomatik olarak oluşturulur (`isVerified: true`).
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Flutter google_sign_in'den alınan Google ID token
 *     responses:
 *       200:
 *         description: Google girişi başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: Google ile giriş başarılı.
 *                 token:
 *                   type: string
 *                 kullanici:
 *                   $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: idToken eksik
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Geçersiz Google token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/google', googleAuth);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Şifre sıfırlama e-postası gönderir
 *     description: |
 *       Verilen e-posta kayıtlıysa 1 saatlik sıfırlama linki gönderilir.
 *       Güvenlik açısından e-posta bulunsun ya da bulunsun aynı yanıt döner.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *     responses:
 *       200:
 *         description: İstek alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: Eğer bu e-posta kayıtlıysa sıfırlama bağlantısı gönderildi.
 *       503:
 *         description: E-posta gönderilemedi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/forgot-password', forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password/{resettoken}:
 *   put:
 *     summary: Şifreyi token ile sıfırlar
 *     description: |
 *       E-postadaki linkten gelen ham token ile yeni şifre belirlenir. Token 1 saat geçerlidir.
 *       Aynı path'e `GET` isteği atıldığında tarayıcıda HTML form açılır.
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: resettoken
 *         required: true
 *         schema:
 *           type: string
 *         description: E-postadaki URL'den alınan ham (hash'lenmemiş) token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [yeniSifre]
 *             properties:
 *               yeniSifre:
 *                 type: string
 *                 minLength: 6
 *                 example: yeniGizliSifre456
 *     responses:
 *       200:
 *         description: Şifre güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: Şifreniz başarıyla güncellendi.
 *                 token:
 *                   type: string
 *                   description: Otomatik oturum açmak için kullanılabilecek JWT
 *       400:
 *         description: Geçersiz veya süresi dolmuş token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/reset-password/:resettoken', resetPassword);

// ── Korumalı (Private) Rotalar — JWT gerektirir ───────────────────────────────

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Giriş yapmış kullanıcının profil bilgilerini getirir
 *     description: Kullanıcı adı, e-posta, tercihler ve vücut profili dahil tüm profil verilerini döner.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kullanıcı profili
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 kullanici:
 *                   $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Token eksik veya geçersiz
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/me', protect, getMe);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Kullanıcının şifresini değiştirir
 *     description: Mevcut şifre doğrulandıktan sonra yeni şifre belirlenir.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mevcutSifre, yeniSifre]
 *             properties:
 *               mevcutSifre:
 *                 type: string
 *                 example: eskiGizliSifre
 *               yeniSifre:
 *                 type: string
 *                 minLength: 6
 *                 example: yeniGizliSifre456
 *     responses:
 *       200:
 *         description: Şifre başarıyla değiştirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: Şifreniz başarıyla güncellendi. ✅
 *       400:
 *         description: Eksik alan veya şifre çok kısa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Mevcut şifre hatalı veya token geçersiz
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/change-password', protect, changePassword);

/**
 * @swagger
 * /api/auth/me:
 *   delete:
 *     summary: Hesabı ve tüm ilgili verileri kalıcı olarak siler
 *     description: |
 *       Kullanıcının hesabını, tüm kıyafet öğelerini ve kombinlerini kalıcı olarak siler.
 *       **Bu işlem geri alınamaz.**
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hesap başarıyla silindi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mesaj:
 *                   type: string
 *                   example: Hesabınız ve tüm verileriniz kalıcı olarak silindi.
 *       401:
 *         description: Yetkisiz erişim
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
router.delete('/me', protect, deleteAccount);

// Şifre sıfırlama formu (e-postadaki link bu sayfayı açar)
router.get('/reset-password/:resettoken', (req, res) => {
    const token = req.params.resettoken;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Helmet'in CSP'si inline JS'i bloke eder — bu sayfada kasıtlı olarak izin veriyoruz
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'");
    res.end([
        '<!DOCTYPE html>',
        '<html lang="tr">',
        '<head>',
        '<meta charset="UTF-8"/>',
        '<meta name="viewport" content="width=device-width,initial-scale=1"/>',
        '<title>Smart Wardrobe AI - Sifre Sifirla</title>',
        '<style>',
        '*{margin:0;padding:0;box-sizing:border-box}',
        'body{min-height:100vh;background:#0A0A0A;font-family:Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;padding:24px}',
        '.card{background:#141414;border:1px solid #2A2A2A;border-radius:20px;padding:40px 36px;width:100%;max-width:420px}',
        '.brand{font-size:11px;letter-spacing:4px;color:#C9A84C;text-transform:uppercase;font-weight:600;margin-bottom:12px}',
        'h1{font-size:30px;color:#F0EEE6;font-weight:700;margin-bottom:28px;line-height:1.15}',
        'label{display:block;font-size:12px;color:#9A9586;margin-bottom:8px}',
        'input{width:100%;background:#1C1C1C;border:1px solid #2A2A2A;border-radius:12px;padding:14px 16px;color:#F0EEE6;font-size:15px;outline:none;margin-bottom:16px;box-sizing:border-box}',
        'input:focus{border-color:#C9A84C}',
        '#btn{width:100%;background:linear-gradient(135deg,#C9A84C,#E8C96A);color:#000;font-weight:700;font-size:15px;border:none;border-radius:12px;padding:16px;cursor:pointer}',
        '#btn:disabled{opacity:0.5;cursor:not-allowed}',
        '#msg{margin-top:18px;font-size:14px;text-align:center;min-height:20px;line-height:1.5}',
        '.ok{color:#4CAF50}.err{color:#E57373}',
        '</style>',
        '</head>',
        '<body>',
        '<div class="card">',
        '<p class="brand">SMART WARDROBE AI</p>',
        '<h1>Yeni Sifreni<br/>Belirle.</h1>',
        '<label>Yeni Sifre</label>',
        '<input type="password" id="p1" placeholder="En az 6 karakter"/>',
        '<label>Sifreyi Tekrarla</label>',
        '<input type="password" id="p2" placeholder="Sifreyi tekrar girin"/>',
        '<button type="button" id="btn" onclick="gonder()">Sifremi Sifirla</button>',
        '<p id="msg"></p>',
        '</div>',
        '<script>',
        'var RESET_TOKEN = "' + token + '";',
        'function gonder() {',
        '  var p1 = document.getElementById("p1").value;',
        '  var p2 = document.getElementById("p2").value;',
        '  var msg = document.getElementById("msg");',
        '  var btn = document.getElementById("btn");',
        '  if (!p1 || p1.length < 6) {',
        '    msg.className = "err";',
        '    msg.textContent = "Sifre en az 6 karakter olmalidir.";',
        '    return;',
        '  }',
        '  if (p1 !== p2) {',
        '    msg.className = "err";',
        '    msg.textContent = "Sifreler eslesmiyor.";',
        '    return;',
        '  }',
        '  btn.disabled = true;',
        '  btn.textContent = "Isleniyor...";',
        '  msg.textContent = "";',
        '  var xhr = new XMLHttpRequest();',
        '  xhr.open("POST", "/api/auth/reset-password/" + RESET_TOKEN, true);',
        '  xhr.setRequestHeader("Content-Type", "application/json");',
        '  xhr.onreadystatechange = function() {',
        '    if (xhr.readyState !== 4) return;',
        '    var data = {};',
        '    try { data = JSON.parse(xhr.responseText); } catch(e) {}',
        '    if (xhr.status === 200) {',
        '      msg.className = "ok";',
        '      msg.textContent = "Sifreniz guncellendi! Uygulamaya donup giris yapabilirsiniz.";',
        '      document.getElementById("p1").style.display = "none";',
        '      document.getElementById("p2").style.display = "none";',
        '      btn.style.display = "none";',
        '    } else {',
        '      msg.className = "err";',
        '      msg.textContent = data.mesaj || "Bir hata olustu. Lutfen tekrar deneyin.";',
        '      btn.disabled = false;',
        '      btn.textContent = "Sifremi Sifirla";',
        '    }',
        '  };',
        '  xhr.onerror = function() {',
        '    msg.className = "err";',
        '    msg.textContent = "Baglanti hatasi. Lutfen tekrar deneyin.";',
        '    btn.disabled = false;',
        '    btn.textContent = "Sifremi Sifirla";',
        '  };',
        '  xhr.send(JSON.stringify({ yeniSifre: p1 }));',
        '}',
        '</script>',
        '</body>',
        '</html>',
    ].join('\n'));
});

// POST alias — formdan gelen istek (bazı tüneller PUT yerine POST ister)
router.post('/reset-password/:resettoken', resetPassword);

module.exports = router;
