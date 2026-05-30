const mongoose = require('mongoose');

const travelSuitcaseSchema = new mongoose.Schema({
    kullanici: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sehir: {
        type: String,
        required: [true, 'Şehir adı zorunludur'],
        trim: true
    },
    baslangicTarihi: {
        type: Date,
        required: [true, 'Başlangıç tarihi zorunludur']
    },
    bitisTarihi: {
        type: Date,
        required: [true, 'Bitiş tarihi zorunludur']
    },
    gunSayisi: {
        type: Number,
        default: 1
    },
    havaDurumuOzeti: {
        type: String,
        default: ''
    },
    havaSicakligi: {
        type: Number,
        default: null
    },
    havaIkonu: {
        type: String,
        default: ''
    },
    tahminiHava: {
        type: Boolean,
        default: false   // true → seyahat 5 günden uzak, forecast yerine current kullanıldı
    },
    onerilenkiyafetler: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item'
    }],
    aiAciklamasi: {
        type: String,
        default: ''
    },
    aiIpucu: {
        type: String,
        default: ''
    }
}, { timestamps: true });

travelSuitcaseSchema.index({ kullanici: 1, createdAt: -1 });

module.exports = mongoose.model('TravelSuitcase', travelSuitcaseSchema);
