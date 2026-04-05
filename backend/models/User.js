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
    resetPasswordToken: String,
    resetPasswordExpire: Date
}, { timestamps: true });

// Geçici şifre sıfırlama token'ı oluşturma metodu
userSchema.methods.getResetPasswordToken = function () {
    const crypto = require('crypto');
    // Doğrudan URL'ye eklenecek şifresiz token oluştur
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Veritabanına şifrelenmiş (hash) halini kaydet
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 dakika geçerli

    return resetToken;
};

module.exports = mongoose.model('User', userSchema);
