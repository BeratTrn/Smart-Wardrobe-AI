const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    kullaniciAdi: {
        type: String,
        required: [true, 'Kullanıcı adı zorunludur'],
        trim: true,
        minlength: [3, 'Kullanıcı adı en az 3 karakter olmalıdır'],
        maxlength: [30, 'Kullanıcı adı en fazla 30 karakter olabilir']
    },
    email: {
        type: String,
        required: [true, 'E-posta zorunludur'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Geçerli bir e-posta girin']
    },
    sifre: {
        type: String,
        required: [true, 'Şifre zorunludur'],
        minlength: [6, 'Şifre en az 6 karakter olmalıdır']
    },
    profilFoto: {
        type: String,
        default: ''
    },
    tercihler: {
        favoriStil: { type: String, default: 'Casual' },
        favoriRenkler: [{ type: String }],
        bildirimler: { type: Boolean, default: true }
    },
    googleId: {
        type: String,
        default: null
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // E-posta doğrulama
    isVerified: {
        type: Boolean,
        default: false
    },
    otpCode: String,          // SHA-256 hashli OTP
    otpExpire: Date           // OTP son kullanma tarihi
}, { timestamps: true });

// Şifre sıfırlama token'ı oluşturma metodu
userSchema.methods.getResetPasswordToken = function () {
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(20).toString('hex');
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 saat geçerli
    return resetToken;
};

// 6 haneli OTP kodu üretme metodu
userSchema.methods.getOtpCode = function () {
    const crypto = require('crypto');
    // 6 haneli düz kod (e-postaya gönderilecek)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    // Veritabanına hash'li halini kaydet
    this.otpCode = crypto.createHash('sha256').update(otpCode).digest('hex');
    this.otpExpire = Date.now() + 10 * 60 * 1000; // 10 dakika geçerli
    return otpCode;
};

module.exports = mongoose.model('User', userSchema);
