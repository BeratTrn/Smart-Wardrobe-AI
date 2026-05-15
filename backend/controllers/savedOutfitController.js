const SavedOutfit = require('../models/SavedOutfit');

// @route  POST /api/saved-outfits
// @desc   Kombini kaydet
// @access Private
const saveOutfit = async (req, res) => {
    try {
        const { baslik, aciklama, ipucu, havaDurumu, kiyafetler, kullaniciFoto } = req.body;

        const outfit = await SavedOutfit.create({
            kullanici: req.user._id,
            kiyafetler: kiyafetler || [],
            baslik: baslik || 'Kaydedilen Kombin',
            aciklama: aciklama || '',
            ipucu: ipucu || '',
            havaDurumu: havaDurumu || {},
            kullaniciFoto: kullaniciFoto || '',
        });

        await outfit.populate('kiyafetler', 'resimUrl renk kategori stil marka');

        res.status(201).json({
            mesaj: 'Kombin kaydedildi! 💾',
            kombin: outfit,
        });
    } catch (error) {
        console.error('Kombin Kaydetme Hatası:', error);
        res.status(500).json({ mesaj: 'Kombin kaydedilemedi. Lütfen tekrar deneyin.' });
    }
};

// @route  GET /api/saved-outfits
// @desc   Kullanıcının kaydettiği kombinleri getir
// @access Private
const getSavedOutfits = async (req, res) => {
    try {
        const kombinler = await SavedOutfit.find({ kullanici: req.user._id })
            .populate('kiyafetler', 'resimUrl renk kategori stil marka')
            .sort({ createdAt: -1 });

        res.status(200).json({
            mesaj: 'Kaydedilen kombinler getirildi.',
            toplam: kombinler.length,
            kombinler,
        });
    } catch (error) {
        console.error('Kayıtlı Kombinler Hatası:', error);
        res.status(500).json({ mesaj: 'Kombinler getirilemedi.' });
    }
};

// @route  DELETE /api/saved-outfits/:id
// @desc   Kaydedilen kombini sil
// @access Private
const deleteOutfit = async (req, res) => {
    try {
        const outfit = await SavedOutfit.findById(req.params.id);
        if (!outfit) {
            return res.status(404).json({ mesaj: 'Kombin bulunamadı.' });
        }
        if (outfit.kullanici.toString() !== req.user._id.toString()) {
            return res.status(403).json({ mesaj: 'Bu kombini silme yetkiniz yok.' });
        }

        await outfit.deleteOne();
        res.status(200).json({ mesaj: 'Kombin silindi. 🗑️' });
    } catch (error) {
        console.error('Kombin Silme Hatası:', error);
        res.status(500).json({ mesaj: 'Kombin silinemedi.' });
    }
};

module.exports = { saveOutfit, getSavedOutfits, deleteOutfit };
