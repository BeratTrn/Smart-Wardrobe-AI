const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    kullanici: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    resimUrl: {
        type: String,
        required: [true, 'Resim URL zorunludur']
    },
    cloudinaryId: {
        type: String,
        default: ''
    },
    kategori: {
        type: String,
        required: [true, 'Kategori zorunludur'],
        enum: ['Üst Giyim', 'Alt Giyim', 'Elbise & Etek', 'Dış Giyim', 'Ayakkabı', 'Aksesuar']
    },
    renk: {
        type: String,
        required: [true, 'Renk zorunludur'],
        trim: true
    },
    mevsim: {
        type: String,
        required: [true, 'Mevsim zorunludur'],
        enum: ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış', 'Tüm Mevsimler']
    },
    stil: {
        type: String,
        enum: ['Günlük', 'Klasik', 'Spor', 'Sokak', 'Minimal', 'Şık', 'Resmi'],
        default: 'Günlük'
    },
    marka: {
        type: String,
        trim: true,
        default: ''
    },
    notlar: {
        type: String,
        maxlength: [500, 'Not en fazla 500 karakter olabilir'],
        default: ''
    },
    aiDogrulandi: {
        type: Boolean,
        default: false
    },
    favori: {
        type: Boolean,
        default: false
    },
    kullanilmaSayisi: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// İndeksleme - hızlı sorgular için
itemSchema.index({ kullanici: 1, kategori: 1 });
itemSchema.index({ kullanici: 1, mevsim: 1 });
itemSchema.index({ kullanici: 1, createdAt: -1 });

module.exports = mongoose.model('Item', itemSchema);
