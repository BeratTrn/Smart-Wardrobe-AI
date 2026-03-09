const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    kullanici: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Bu kıyafetin sahibi kim? (User tablosuyla ilişkilendirdik)
        required: true
    },
    resimUrl: {
        type: String, // Fotoğrafın yüklendiği yerin linki (İleride ekleyeceğiz)
        required: true
    },
    kategori: {
        type: String, // OpenAI'ın bulacağı sonuç (Örn: Üst Giyim, Alt Giyim, Ayakkabı)
        required: true
    },
    renk: {
        type: String, // OpenAI'ın bulacağı sonuç (Örn: Kırmızı, Siyah)
        required: true
    },
    mevsim: {
        type: String, // OpenAI'ın bulacağı sonuç (Örn: Kış, Yaz)
        required: true
    }
}, { timestamps: true }); // Kıyafetin dolaba eklenme tarihini otomatik tutar

module.exports = mongoose.model('Item', itemSchema);