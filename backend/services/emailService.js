const nodemailer = require('nodemailer');

const emailPort = parseInt(process.env.EMAIL_PORT || '587', 10);
const secureFromEnv = process.env.EMAIL_SECURE;
const isSecure = typeof secureFromEnv === 'string'
    ? secureFromEnv.toLowerCase() === 'true'
    : emailPort === 465;
const tlsRejectUnauthorizedFromEnv = process.env.EMAIL_TLS_REJECT_UNAUTHORIZED;
const tlsRejectUnauthorized = process.env.NODE_ENV === 'production'
    ? (typeof tlsRejectUnauthorizedFromEnv === 'string'
        ? tlsRejectUnauthorizedFromEnv.toLowerCase() !== 'false'
        : true)
    : false;

/**
 * SMTP transporter — .env'deki ayarları kullanır.
 * Gmail kullanıcıları için 2FA aktifken üretilen
 * "App Password" girilmelidir (normal şifre çalışmaz).
 */
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: emailPort,
    secure: isSecure,
    tls: {
        rejectUnauthorized: tlsRejectUnauthorized
    },
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const verifySmtpConnection = async () => {
    try {
        await transporter.verify();
        console.log('[SMTP] Baglanti dogrulandi.');
    } catch (error) {
        console.error('[SMTP VERIFY HATASI]', {
            message: error.message,
            code: error.code,
            command: error.command,
            response: error.response
        });
    }
};

/**
 * Kullanıcıya OTP doğrulama e-postası gönderir.
 * @param {string} email         - Alıcı e-posta adresi
 * @param {string} kullaniciAdi  - Kullanıcı adı (e-postada selamlama için)
 * @param {string} otpCode       - 6 haneli düz metin OTP (hash değil)
 */
const sendVerificationEmail = async (email, kullaniciAdi, otpCode) => {
    const from = process.env.EMAIL_FROM || `"Smart Wardrobe AI" <${process.env.EMAIL_USER}>`;

    const mailOptions = {
        from,
        to: email,
        subject: 'Smart Wardrobe AI — E-posta Doğrulama Kodunuz',
        html: `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>E-posta Doğrulama</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background-color:#141414;border-radius:16px;border:1px solid #2A2A2A;overflow:hidden;">

          <!-- Başlık -->
          <tr>
            <td align="center"
                style="padding:36px 40px 28px;border-bottom:1px solid #2A2A2A;">
              <p style="margin:0;font-size:11px;letter-spacing:4px;color:#C9A84C;text-transform:uppercase;font-weight:600;">
                Smart Wardrobe AI
              </p>
              <h1 style="margin:12px 0 0;font-size:28px;color:#F0EEE6;font-weight:700;letter-spacing:-0.5px;">
                E-posta Doğrulama
              </h1>
            </td>
          </tr>

          <!-- İçerik -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;color:#9A9586;font-size:14px;">Merhaba, <strong style="color:#F0EEE6;">${kullaniciAdi}</strong> 👋</p>
              <p style="margin:0 0 28px;color:#9A9586;font-size:14px;line-height:1.6;">
                Smart Wardrobe AI hesabını etkinleştirmek için aşağıdaki 6 haneli doğrulama kodunu uygulamaya gir.
                Kod <strong style="color:#F0EEE6;">10 dakika</strong> geçerlidir.
              </p>

              <!-- OTP Kutusu -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background-color:#1C1C1C;border:1px solid #C9A84C;border-radius:12px;padding:20px 48px;">
                      <p style="margin:0;font-size:38px;font-weight:700;letter-spacing:12px;color:#C9A84C;font-family:'Courier New',monospace;">
                        ${otpCode}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#5A5850;font-size:12px;line-height:1.6;">
                Bu işlemi sen başlatmadıysan bu e-postayı dikkate alma. Hesabın güvendedir.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center"
                style="padding:20px 40px;border-top:1px solid #2A2A2A;">
              <p style="margin:0;color:#3A3830;font-size:11px;">
                © ${new Date().getFullYear()} Smart Wardrobe AI. Tüm hakları saklıdır.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `.trim(),
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        console.log('[SMTP SEND]', {
            to: email,
            messageId: result.messageId,
            accepted: result.accepted,
            rejected: result.rejected,
            response: result.response
        });
        return result;
    } catch (error) {
        console.error('[SMTP SEND HATASI]', {
            to: email,
            message: error.message,
            code: error.code,
            command: error.command,
            response: error.response
        });
        throw error;
    }
};

/**
 * Kullanıcıya şifre sıfırlama e-postası gönderir.
 * @param {string} email        - Alıcı e-posta adresi
 * @param {string} kullaniciAdi - Kullanıcı adı
 * @param {string} resetUrl     - Şifre sıfırlama bağlantısı
 */
const sendPasswordResetEmail = async (email, kullaniciAdi, resetUrl) => {
    const from = process.env.EMAIL_FROM || `"Smart Wardrobe AI" <${process.env.EMAIL_USER}>`;

    const mailOptions = {
        from,
        to: email,
        subject: 'Smart Wardrobe AI — Şifre Sıfırlama',
        html: `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Şifre Sıfırlama</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background-color:#141414;border-radius:16px;border:1px solid #2A2A2A;overflow:hidden;">

          <!-- Başlık -->
          <tr>
            <td align="center"
                style="padding:36px 40px 28px;border-bottom:1px solid #2A2A2A;">
              <p style="margin:0;font-size:11px;letter-spacing:4px;color:#C9A84C;text-transform:uppercase;font-weight:600;">
                Smart Wardrobe AI
              </p>
              <h1 style="margin:12px 0 0;font-size:28px;color:#F0EEE6;font-weight:700;letter-spacing:-0.5px;">
                Şifre Sıfırlama
              </h1>
            </td>
          </tr>

          <!-- İçerik -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;color:#9A9586;font-size:14px;">Merhaba, <strong style="color:#F0EEE6;">${kullaniciAdi}</strong> 👋</p>
              <p style="margin:0 0 28px;color:#9A9586;font-size:14px;line-height:1.6;">
                Şifrenizi sıfırlamak için bir istek aldık. Aşağıdaki butona tıklayarak
                yeni şifrenizi belirleyebilirsiniz. Bu bağlantı
                <strong style="color:#F0EEE6;">1 saat</strong> geçerlidir.
              </p>

              <!-- Buton -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}"
                       style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#E8C96A);
                              color:#000;font-weight:700;font-size:15px;
                              text-decoration:none;padding:16px 40px;
                              border-radius:12px;letter-spacing:0.3px;">
                      Şifremi Sıfırla →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#5A5850;font-size:12px;line-height:1.6;">
                Butona tıklayamıyor musunuz? Aşağıdaki bağlantıyı tarayıcınıza kopyalayın:
              </p>
              <p style="margin:0 0 20px;word-break:break-all;">
                <a href="${resetUrl}" style="color:#C9A84C;font-size:12px;">${resetUrl}</a>
              </p>

              <p style="margin:0;color:#5A5850;font-size:12px;line-height:1.6;">
                Bu işlemi sen başlatmadıysan bu e-postayı dikkate alma. Hesabın güvendedir.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center"
                style="padding:20px 40px;border-top:1px solid #2A2A2A;">
              <p style="margin:0;color:#3A3830;font-size:11px;">
                © ${new Date().getFullYear()} Smart Wardrobe AI. Tüm hakları saklıdır.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `.trim(),
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        console.log('[SMTP SEND - RESET]', {
            to: email,
            messageId: result.messageId,
            accepted: result.accepted,
        });
        return result;
    } catch (error) {
        console.error('[SMTP SEND HATASI - RESET]', {
            to: email,
            message: error.message,
        });
        throw error;
    }
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail, verifySmtpConnection };

