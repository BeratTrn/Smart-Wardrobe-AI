const crypto = require('crypto');
const User = require('../models/User');
const PendingRegistration = require('../models/PendingRegistration');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendVerificationEmail } = require('../services/emailService');

// ─── Yardımcı: JWT token üretici ────────────────────────────────────────────
const tokenUret = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// ─── Yardımcı: OTP hash kontrolü ────────────────────────────────────────────
const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

const logDevOtp = (email, otpCode) => {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[OTP KODU - ${email}]: ${otpCode}`);
    }
};

const isEmailDelivered = (sendResult) =>
    Array.isArray(sendResult?.accepted) &&
    sendResult.accepted.length > 0 &&
    (!Array.isArray(sendResult?.rejected) || sendResult.rejected.length === 0);

// ────────────────────────────────────────────────────────────────────────────
// @route  POST /api/auth/register
// @desc   1. Adım — Geçici kayıt oluştur ve OTP gönder (User oluşturmaz)
// @access Public
// ────────────────────────────────────────────────────────────────────────────
const registerUser = async (req, res) => {
    try {
        const { kullaniciAdi, email, sifre } = req.body;

        // Alan kontrolü
        if (!kullaniciAdi || !email || !sifre) {
            return res.status(400).json({ mesaj: 'Kullanıcı adı, e-posta ve şifre zorunludur.' });
        }

        // Şifre uzunluğu
        if (sifre.length < 6) {
            return res.status(400).json({ mesaj: 'Şifre en az 6 karakter olmalıdır.' });
        }

        const normalizedEmail = email.toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            if (!existingUser.isVerified) {
                await User.deleteOne({ _id: existingUser._id });
            } else {
                return res.status(400).json({ mesaj: 'Bu e-posta adresi zaten kullanımda.' });
            }
        }

        const verifiedUser = await User.findOne({ email: normalizedEmail, isVerified: true });
        if (verifiedUser) {
            return res.status(400).json({ mesaj: 'Bu e-posta adresi zaten kullanımda.' });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(sifre, salt);

        let pending = await PendingRegistration.findOne({ email: normalizedEmail });
        if (!pending) {
            pending = new PendingRegistration({
                kullaniciAdi,
                email: normalizedEmail,
                sifre: hashedPassword,
                otpCode: 'placeholder',
                otpExpire: new Date(Date.now() + 60 * 1000)
            });
        } else {
            pending.kullaniciAdi = kullaniciAdi;
            pending.sifre = hashedPassword;
        }

        const otpCode = pending.getOtpCode();
        await pending.save();

        try {
            const sendResult = await sendVerificationEmail(pending.email, pending.kullaniciAdi, otpCode);
            if (!isEmailDelivered(sendResult)) {
                return res.status(503).json({
                    mesaj: 'Doğrulama e-postası teslim edilemedi. Lütfen kodu tekrar isteyin.',
                    emailSendFailed: true,
                    email: pending.email
                });
            }
        } catch (emailErr) {
            console.error('[EMAIL HATASI][REGISTER-NEW]', emailErr.message);
            logDevOtp(pending.email, otpCode);
            return res.status(503).json({
                mesaj: 'Doğrulama e-postası gönderilemedi. Lütfen kodu tekrar isteyin.',
                emailSendFailed: true,
                email: pending.email
            });
        }

        res.status(201).json({
            mesaj: 'Doğrulama kodu e-posta adresinize gönderildi.',
            email: pending.email
        });

    } catch (error) {
        console.error('Kayıt Hatası:', error);
        res.status(500).json({ mesaj: 'Kayıt sırasında sunucu hatası oluştu.' });
    }
};

// @route  POST /api/auth/resend-verification
// @desc   Doğrulanmamış kullanıcı için yeni OTP üretip tekrar gönder
// @access Public
const resendVerification = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ mesaj: 'E-posta adresi zorunludur.' });
        }

        const normalizedEmail = email.toLowerCase();
        const verifiedUser = await User.findOne({ email: normalizedEmail, isVerified: true });
        if (verifiedUser) {
            return res.status(400).json({ mesaj: 'Bu hesap zaten doğrulanmış. Giriş yapabilirsiniz.' });
        }

        const pending = await PendingRegistration.findOne({ email: normalizedEmail });
        if (!pending) {
            return res.status(404).json({ mesaj: 'Doğrulama bekleyen bir kayıt bulunamadı. Lütfen tekrar kayıt olun.' });
        }

        const otpCode = pending.getOtpCode();
        await pending.save();

        try {
            const sendResult = await sendVerificationEmail(pending.email, pending.kullaniciAdi, otpCode);
            if (!isEmailDelivered(sendResult)) {
                return res.status(503).json({
                    mesaj: 'Doğrulama kodu teslim edilemedi. Lütfen tekrar deneyin.',
                    emailSendFailed: true
                });
            }
        } catch (emailErr) {
            console.error('[EMAIL HATASI][RESEND]', emailErr.message);
            logDevOtp(pending.email, otpCode);
            return res.status(503).json({
                mesaj: 'Doğrulama kodu gönderilemedi. Lütfen tekrar deneyin.',
                emailSendFailed: true
            });
        }

        return res.status(200).json({
            mesaj: 'Yeni doğrulama kodu e-posta adresinize gönderildi.',
            email: pending.email
        });
    } catch (error) {
        console.error('Resend Verification Hatası:', error);
        return res.status(500).json({ mesaj: 'Kod yeniden gönderilirken sunucu hatası oluştu.' });
    }
};

// ────────────────────────────────────────────────────────────────────────────
// @route  POST /api/auth/verify-email
// @desc   2. Adım — OTP doğrula → isVerified: true yap → JWT döndür
// @access Public
// ────────────────────────────────────────────────────────────────────────────
const verifyEmail = async (req, res) => {
    try {
        const { email, otpCode } = req.body;

        if (!email || !otpCode) {
            return res.status(400).json({ mesaj: 'E-posta ve doğrulama kodu zorunludur.' });
        }

        const normalizedEmail = email.toLowerCase();
        const alreadyVerified = await User.findOne({ email: normalizedEmail, isVerified: true });
        if (alreadyVerified) {
            return res.status(400).json({ mesaj: 'Bu hesap zaten doğrulanmış. Giriş yapabilirsiniz.' });
        }

        const pending = await PendingRegistration.findOne({ email: normalizedEmail });
        if (!pending || !pending.otpCode || !pending.otpExpire) {
            return res.status(400).json({ mesaj: 'Doğrulama bekleyen bir kayıt bulunamadı. Lütfen tekrar kayıt olun.' });
        }

        if (pending.otpExpire < Date.now()) {
            return res.status(400).json({ mesaj: 'Doğrulama kodunun süresi dolmuş. Lütfen yeni kod talep edin.' });
        }

        const hashedInput = hashOtp(otpCode.toString().trim());
        if (hashedInput !== pending.otpCode) {
            return res.status(400).json({ mesaj: 'Hatalı doğrulama kodu. Lütfen tekrar deneyin.' });
        }

        const newUser = await User.create({
            kullaniciAdi: pending.kullaniciAdi,
            email: pending.email,
            sifre: pending.sifre,
            isVerified: true,
            otpCode: undefined,
            otpExpire: undefined
        });
        await PendingRegistration.deleteOne({ _id: pending._id });

        res.status(200).json({
            mesaj: 'E-posta adresiniz doğrulandı! Hoş geldiniz. 🎉',
            token: tokenUret(newUser._id),
            kullanici: {
                id: newUser._id,
                kullaniciAdi: newUser.kullaniciAdi,
                email: newUser.email,
                createdAt: newUser.createdAt
            }
        });

    } catch (error) {
        console.error('OTP Doğrulama Hatası:', error);
        res.status(500).json({ mesaj: 'Doğrulama sırasında sunucu hatası oluştu.' });
    }
};

// ────────────────────────────────────────────────────────────────────────────
// @route  POST /api/auth/login
// @desc   Kullanıcı girişi
// @access Public
// ────────────────────────────────────────────────────────────────────────────
const loginUser = async (req, res) => {
    try {
        const { email, sifre } = req.body;

        if (!email || !sifre) {
            return res.status(400).json({ mesaj: 'E-posta ve şifre zorunludur.' });
        }

        // Kullanıcıyı bul
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ mesaj: 'E-posta veya şifre hatalı.' });
        }

        // E-posta doğrulanmamış hesap kontrolü
        if (!user.isVerified) {
            return res.status(403).json({
                mesaj: 'E-posta adresiniz henüz doğrulanmamış. Lütfen gelen kutunuzu kontrol edin.',
                requiresVerification: true,
                email: user.email
            });
        }

        // Şifre kontrolü
        const isMatch = await bcrypt.compare(sifre, user.sifre);
        if (!isMatch) {
            return res.status(401).json({ mesaj: 'E-posta veya şifre hatalı.' });
        }

        res.status(200).json({
            mesaj: 'Giriş başarılı! 🔑',
            token: tokenUret(user._id),
            kullanici: {
                id: user._id,
                kullaniciAdi: user.kullaniciAdi,
                email: user.email,
                tercihler: user.tercihler
            }
        });

    } catch (error) {
        console.error('Giriş Hatası:', error);
        res.status(500).json({ mesaj: 'Giriş sırasında sunucu hatası oluştu.' });
    }
};

// ────────────────────────────────────────────────────────────────────────────
// @route  GET /api/auth/me
// @desc   Giriş yapan kullanıcının bilgilerini getir
// @access Private
// ────────────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
    try {
        res.status(200).json({
            kullanici: {
                id: req.user._id,
                kullaniciAdi: req.user.kullaniciAdi,
                email: req.user.email,
                tercihler: req.user.tercihler,
                createdAt: req.user.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ mesaj: 'Kullanıcı bilgileri alınamadı.' });
    }
};

// ────────────────────────────────────────────────────────────────────────────
// @route  PUT /api/auth/update-profile
// @desc   Profil güncelle
// @access Private
// ────────────────────────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
    try {
        const { kullaniciAdi, tercihler } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { kullaniciAdi, tercihler },
            { new: true, runValidators: true }
        ).select('-sifre');

        res.status(200).json({
            mesaj: 'Profil güncellendi. ✅',
            kullanici: updatedUser
        });
    } catch (error) {
        res.status(500).json({ mesaj: 'Profil güncellenemedi.' });
    }
};

// ────────────────────────────────────────────────────────────────────────────
// @route  POST /api/auth/forgot-password
// @desc   Şifre sıfırlama bağlantısı gönder
// @access Public
// ────────────────────────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ mesaj: 'E-posta adresi zorunludur.' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ mesaj: 'Bu e-posta adresine kayıtlı hesap bulunamadı.' });
        }

        // Token oluştur
        const resetToken = user.getResetPasswordToken();
        await user.save({ validateBeforeSave: false });

        const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
        console.log(`[E-POSTA SIMULASYONU] Şifre sıfırlama linki: ${resetUrl}`);

        res.status(200).json({
            mesaj: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.',
            resetToken
        });
    } catch (error) {
        console.error('Şifre Sıfırlama Hatası:', error);
        res.status(500).json({ mesaj: 'İşlem sırasında sunucu hatası oluştu.' });
    }
};

// ────────────────────────────────────────────────────────────────────────────
// @route  PUT /api/auth/reset-password/:resettoken
// @desc   Şifreyi sıfırla
// @access Public
// ────────────────────────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
    try {
        const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ mesaj: 'Geçersiz veya süresiz dolmuş token.' });
        }

        const { yeniSifre } = req.body;
        if (!yeniSifre || yeniSifre.length < 6) {
            return res.status(400).json({ mesaj: 'Şifre en az 6 karakter olmalıdır.' });
        }

        const salt = await bcrypt.genSalt(12);
        user.sifre = await bcrypt.hash(yeniSifre, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(200).json({
            mesaj: 'Şifreniz başarıyla güncellendi.',
            token: tokenUret(user._id)
        });
    } catch (error) {
        res.status(500).json({ mesaj: 'Sıfırlama işlemi başarısız.' });
    }
};

// ────────────────────────────────────────────────────────────────────────────
// @route  PUT /api/auth/change-password
// @desc   Mevcut şifre kontrol edilerek yeni şifre belirle
// @access Private
// ────────────────────────────────────────────────────────────────────────────
const changePassword = async (req, res) => {
    try {
        const { mevcutSifre, yeniSifre } = req.body;

        if (!mevcutSifre || !yeniSifre) {
            return res.status(400).json({ mesaj: 'Mevcut ve yeni şifre zorunludur.' });
        }
        if (yeniSifre.length < 6) {
            return res.status(400).json({ mesaj: 'Yeni şifre en az 6 karakter olmalıdır.' });
        }

        const user = await User.findById(req.user._id);
        const isMatch = await bcrypt.compare(mevcutSifre, user.sifre);
        if (!isMatch) {
            return res.status(401).json({ mesaj: 'Mevcut şifre hatalı.' });
        }

        const salt = await bcrypt.genSalt(12);
        user.sifre = await bcrypt.hash(yeniSifre, salt);
        await user.save();

        res.status(200).json({ mesaj: 'Şifreniz başarıyla güncellendi. ✅' });
    } catch (error) {
        console.error('Şifre Değiştirme Hatası:', error);
        res.status(500).json({ mesaj: 'Şifre değiştirilemedi.' });
    }
};

module.exports = {
    registerUser,
    resendVerification,
    verifyEmail,
    loginUser,
    getMe,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword
};
