const mongoose = require('mongoose');

const outfitSchema = new mongoose.Schema({
    kullanici: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    baslik: {
        type: String,
        default: 'AI Kombin Önerisi'
    },
    // Kombini oluşturan kıyafetlerin ID'leri
    kiyafetler: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item'
    }],
    // AI'ın açıklaması
    aiAciklama: {
        type: String,
        required: true
    },
    // Kombinin oluşturulduğu bağlam
    baglam: {
        etkinlik: {
            type: String,
        },
        havaDurumu: {
            sicaklik: Number,      // Celsius
            durum: String,         // "Güneşli", "Yağmurlu" vs.
            nem: Number,           // %
            konum: String          // Şehir adı
        }
    },
    begeniyor: {
        type: Boolean,
        default: null  // null = henüz değerlendirilmedi
    },
    kaydedildi: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

outfitSchema.index({ kullanici: 1, createdAt: -1 });

module.exports = mongoose.model('Outfit', outfitSchema);
