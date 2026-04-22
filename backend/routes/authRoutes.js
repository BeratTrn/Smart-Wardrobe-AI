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
    resetPassword,
    deleteAccount
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();


/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Yeni kullanÄ±cÄ± kaydÄ± oluÅŸturur (OTP gÃ¶nderilir)
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
 *         description: BaÅŸarÄ±lÄ±
 */
router.post('/register', registerUser);          // AdÄ±m 1: KayÄ±t (OTP gÃ¶nderir, JWT yok)
/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: DoÄŸrulama kodunu tekrar gÃ¶nderir
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
 *         description: DoÄŸrulama kodu gÃ¶nderildi
 */
router.post('/resend-verification', resendVerification);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: E-posta adresini doÄŸrular ve JWT dÃ¶ner
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
 *         description: E-posta doÄŸrulandÄ± (JWT token dÃ¶ner)
 */
router.post('/verify-email', verifyEmail);       // AdÄ±m 2: OTP doÄŸrula â†’ JWT al

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: KullanÄ±cÄ± giriÅŸi
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
 *         description: GiriÅŸ baÅŸarÄ±lÄ± (JWT token dÃ¶ner)
 */
router.post('/login', loginUser);
/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Åifre sÄ±fÄ±rlama e-postasÄ± gÃ¶nderir
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
 *         description: E-posta gÃ¶nderildi
 */
router.post('/forgot-password', forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password/{resettoken}:
 *   put:
 *     summary: Åifre sÄ±fÄ±rlama iÅŸlemini tamamlar
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
 *         description: Åifre baÅŸarÄ±yla gÃ¼ncellendi
 */
router.put('/reset-password/:resettoken', resetPassword);

// --- Private routes (JWT gerektirir) ---
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: GiriÅŸ yapmÄ±ÅŸ kullanÄ±cÄ±nÄ±n profil bilgilerini getirir
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KullanÄ±cÄ± bilgileri
 */
router.get('/me', protect, getMe);

/**
 * @swagger
 * /api/auth/update:
 *   put:
 *     summary: KullanÄ±cÄ± profilini gÃ¼nceller
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
 *         description: Profil baÅŸarÄ±yla gÃ¼ncellendi
 */
router.put('/update', protect, updateProfile);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: KullanÄ±cÄ±nÄ±n ÅŸifresini deÄŸiÅŸtirir
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
 *         description: Åifre baÅŸarÄ±yla deÄŸiÅŸtirildi
 */
router.put('/change-password', protect, changePassword);

/**
 * @swagger
 * /api/auth/me:
 *   delete:
 *     summary: HesabÄ± kalÄ±cÄ± olarak siler
 *     description: KullanÄ±cÄ±nÄ±n hesabÄ±nÄ±, tÃ¼m kÄ±yafetlerini ve kombinlerini kalÄ±cÄ± olarak siler.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hesap baÅŸarÄ±yla silindi
 *       401:
 *         description: Yetkisiz eriÅŸim
 *       500:
 *         description: Sunucu hatasÄ±
 */
router.delete('/me', protect, deleteAccount);

// Åifre sÄ±fÄ±rlama formu (e-postadaki link bu sayfayÄ± aÃ§ar)
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
        '</html>'
    ].join('\n'));
});

// POST alias — formdan gelen istek (bazi tuneller PUT yerine POST ister)
router.post('/reset-password/:resettoken', resetPassword);

module.exports = router;

