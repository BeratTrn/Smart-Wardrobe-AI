const mongoose = require('mongoose');

// Kullanıcı Şeması (Veritabanında hangi verileri tutacağız?)
const userSchema = new mongoose.Schema({
    kullaniciAdi: {
        type: String,
        required: true, // Zorunlu alan
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true, // Her e-posta sadece 1 kere kayıt olabilir
        lowercase: true
    },
    sifre: {
        type: String,
        required: true
    }
}, { timestamps: true }); // Ne zaman kayıt olduğunu (createdAt) otomatik tutar

module.exports = mongoose.model('User', userSchema);