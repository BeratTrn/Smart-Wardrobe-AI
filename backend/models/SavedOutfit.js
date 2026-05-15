const mongoose = require('mongoose');

const savedOutfitSchema = new mongoose.Schema({
    kullanici: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    kiyafetler: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
    }],
    baslik: {
        type: String,
        default: 'Kaydedilen Kombin',
        trim: true,
    },
    aciklama: {
        type: String,
        default: '',
    },
    ipucu: {
        type: String,
        default: '',
    },
    havaDurumu: {
        sicaklik: Number,
        durum: String,
        konum: String,
    },
    kullaniciFoto: {
        type: String,
        default: '',
    },
}, { timestamps: true });

savedOutfitSchema.index({ kullanici: 1, createdAt: -1 });

module.exports = mongoose.model('SavedOutfit', savedOutfitSchema);
