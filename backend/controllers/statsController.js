const Item = require('../models/Item');
const Outfit = require('../models/Outfit');

// @route  GET /api/stats/wardrobe
// @desc   Gardırop istatistiklerini getir (grafik verisi)
// @access Private
const getWardrobeStats = async (req, res) => {
    try {
        const userId = req.user._id;

        // Tüm kıyafetleri çek
        const [
            toplamKiyafet,
            kategoriDagilimi,
            renkDagilimi,
            mevsimDagilimi,
            stilDagilimi,
            toplamKombin,
            sonEklenenler
        ] = await Promise.all([

            // Toplam kıyafet sayısı
            Item.countDocuments({ kullanici: userId }),

            // Kategoriye göre dağılım
            Item.aggregate([
                { $match: { kullanici: userId } },
                { $group: { _id: '$kategori', adet: { $sum: 1 } } },
                { $sort: { adet: -1 } }
            ]),

            // Renge göre dağılım (ilk 10)
            Item.aggregate([
                { $match: { kullanici: userId } },
                { $group: { _id: '$renk', adet: { $sum: 1 } } },
                { $sort: { adet: -1 } },
                { $limit: 10 }
            ]),

            // Mevsime göre dağılım
            Item.aggregate([
                { $match: { kullanici: userId } },
                { $group: { _id: '$mevsim', adet: { $sum: 1 } } },
                { $sort: { adet: -1 } }
            ]),

            // Stile göre dağılım
            Item.aggregate([
                { $match: { kullanici: userId } },
                { $group: { _id: '$stil', adet: { $sum: 1 } } },
                { $sort: { adet: -1 } }
            ]),

            // Toplam kombin sayısı
            Outfit.countDocuments({ kullanici: userId }),

            // Son 5 eklenen kıyafet
            Item.find({ kullanici: userId })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('kategori renk mevsim resimUrl createdAt')
        ]);

        // En çok kullanılan renk
        const enCokRenk = renkDagilimi.length > 0 ? renkDagilimi[0]._id : 'Belirtilmemiş';
        const enCokKategori = kategoriDagilimi.length > 0 ? kategoriDagilimi[0]._id : 'Belirtilmemiş';

        res.status(200).json({
            mesaj: 'Gardırop istatistikleri hazır! 📊',
            istatistikler: {
                ozet: {
                    toplamKiyafet,
                    toplamKombin,
                    enCokRenk,
                    enCokKategori
                },
                kategoriDagilimi: kategoriDagilimi.map(k => ({
                    ad: k._id,
                    adet: k.adet,
                    yuzde: toplamKiyafet > 0 ? Math.round((k.adet / toplamKiyafet) * 100) : 0
                })),
                renkDagilimi: renkDagilimi.map(r => ({
                    renk: r._id,
                    adet: r.adet
                })),
                mevsimDagilimi: mevsimDagilimi.map(m => ({
                    mevsim: m._id,
                    adet: m.adet
                })),
                stilDagilimi: stilDagilimi.map(s => ({
                    stil: s._id,
                    adet: s.adet
                })),
                sonEklenenler
            }
        });

    } catch (error) {
        console.error('İstatistik Hatası:', error);
        res.status(500).json({ mesaj: 'İstatistikler alınamadı.' });
    }
};

module.exports = { getWardrobeStats };
