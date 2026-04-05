const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// JWT token üretici
const tokenUret = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @route  POST /api/auth/register
// @desc   Yeni kullanıcı kaydı
// @access Public
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

        // E-posta kontrolü
        const userExists = await User.findOne({ email: email.toLowerCase() });
        if (userExists) {
            return res.status(400).json({ mesaj: 'Bu e-posta adresi zaten kullanımda.' });
        }

        // Şifreyi hashle
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(sifre, salt);

        const newUser = await User.create({
            kullaniciAdi,
            email: email.toLowerCase(),
            sifre: hashedPassword
        });

        res.status(201).json({
            mesaj: 'Hesap başarıyla oluşturuldu! 🎉',
            token: tokenUret(newUser._id),
            kullanici: {
                id: newUser._id,
                kullaniciAdi: newUser.kullaniciAdi,
                email: newUser.email,
                createdAt: newUser.createdAt
            }
        });

    } catch (error) {
        console.error('Kayıt Hatası:', error);
        res.status(500).json({ mesaj: 'Kayıt sırasında sunucu hatası oluştu.' });
    }
};

// @route  POST /api/auth/login
// @desc   Kullanıcı girişi
// @access Public
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

// @route  GET /api/auth/me
// @desc   Giriş yapan kullanıcının bilgilerini getir
// @access Private
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

// @route  PUT /api/auth/update-profile
// @desc   Profil güncelle
// @access Private
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

// @route  POST /api/auth/forgot-password
// @desc   Şifre sıfırlama (Simülasyon)
// @access Public
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

        // Gerçek projede nodemailer ile e-posta gonderilir. Şimdilik konsola yazdırıyoruz.
        const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
        console.log(`[E-POSTA SIMULASYONU] Şifre sıfırlama linki: ${resetUrl}`);

        res.status(200).json({
            mesaj: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.',
            // Test kolaylığı için token dönüyoruz (canlıda silinmeli)
            resetToken
        });
    } catch (error) {
        console.error('Şifre Sıfırlama Hatası:', error);
        res.status(500).json({ mesaj: 'İşlem sırasında sunucu hatası oluştu.' });
    }
};

// @route  PUT /api/auth/reset-password/:resettoken
// @desc   Şifreyi sıfırla
// @access Public
const resetPassword = async (req, res) => {
    try {
        const crypto = require('crypto');
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

// @route  PUT /api/auth/change-password
// @desc   Mevcut şifre kontrol edilerek yeni şifre belirle
// @access Private
const changePassword = async (req, res) => {
    try {
        const { mevcutSifre, yeniSifre } = req.body;

        if (!mevcutSifre || !yeniSifre) {
            return res.status(400).json({ mesaj: 'Mevcut ve yeni şifre zorunludur.' });
        }
        if (yeniSifre.length < 6) {
            return res.status(400).json({ mesaj: 'Yeni şifre en az 6 karakter olmalıdır.' });
        }

        // Kullanıcıyı şifresiyle birlikte çek
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

module.exports = { registerUser, loginUser, getMe, updateProfile, changePassword, forgotPassword, resetPassword };
