const Item = require('../models/Item');
const { analyzeItem } = require('../services/aiService');
const { cloudinary } = require('../config/cloudinary');

// @route  POST /api/items/add
// @desc   Fotoğraf yükle + AI analiz et + dolaba ekle
// @access Private
const analyzeAndAddItem = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ mesaj: 'Lütfen bir kıyafet fotoğrafı yükleyin.' });
        }

        let resimUrl = req.file.path || '';
        let cloudinaryId = req.file.filename || '';

        // ── AI Analysis via FastAPI engine ────────────────────
        let aiData = {
            kategori: req.body.kategori || 'Diğer',
            renk: req.body.renk || 'Bilinmiyor',
            aiDogrulandi: false,
        };

        try {
            // req.file.buffer is populated when multer uses memoryStorage;
            // for cloudinary storage we fall back to manual input.
            if (req.file.buffer) {
                aiData = await analyzeItem(req.file.buffer, req.file.originalname);
            }
        } catch (aiError) {
            console.error('AI Analiz Hatası:', aiError.message);
            // Non-fatal: continue with manual/fallback values
        }

        const newItem = await Item.create({
            kullanici: req.user._id,
            resimUrl: resimUrl || 'placeholder_url',
            cloudinaryId,
            kategori: aiData.kategori,
            renk: aiData.renk,
            mevsim: req.body.mevsim || 'Tüm Mevsimler',
            stil: req.body.stil || 'Casual',
            marka: req.body.marka || '',
            notlar: req.body.notlar || '',
            aiDogrulandi: aiData.aiDogrulandi,
        });

        res.status(201).json({
            mesaj: 'Kıyafet yapay zeka ile analiz edildi ve dolabınıza eklendi! 🪄',
            kiyafet: newItem,
        });

    } catch (error) {
        console.error('Kıyafet Ekleme Hatası:', error);
        res.status(500).json({ mesaj: 'Kıyafet eklenemedi. Lütfen tekrar deneyin.' });
    }
};

// @route  GET /api/items
// @desc   Kullanıcının tüm kıyafetlerini getir (filtreleme destekli)
// @access Private
const getItems = async (req, res) => {
    try {
        const { kategori, mevsim, renk, stil, sayfa = 1, limit = 20 } = req.query;

        const filtre = { kullanici: req.user._id };
        if (kategori) filtre.kategori = kategori;
        if (mevsim) filtre.mevsim = mevsim;
        if (renk) filtre.renk = new RegExp(renk, 'i');
        if (stil) filtre.stil = stil;

        const skip = (parseInt(sayfa) - 1) * parseInt(limit);

        const [items, toplam] = await Promise.all([
            Item.find(filtre).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
            Item.countDocuments(filtre),
        ]);

        res.status(200).json({
            mesaj: 'Kıyafetler başarıyla getirildi. 👕',
            toplam,
            sayfa: parseInt(sayfa),
            toplamSayfa: Math.ceil(toplam / parseInt(limit)),
            kiyafetler: items,
        });

    } catch (error) {
        console.error('Kıyafet Getirme Hatası:', error);
        res.status(500).json({ mesaj: 'Kıyafetler getirilemedi.' });
    }
};

// @route  GET /api/items/:id
// @desc   Tek kıyafet getir
// @access Private
const getItemById = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ mesaj: 'Kıyafet bulunamadı.' });
        }
        if (item.kullanici.toString() !== req.user._id.toString()) {
            return res.status(403).json({ mesaj: 'Bu kıyafete erişim yetkiniz yok.' });
        }

        res.status(200).json({ kiyafet: item });

    } catch (error) {
        res.status(500).json({ mesaj: 'Kıyafet getirilemedi.' });
    }
};

// @route  PUT /api/items/:id
// @desc   Kıyafet bilgilerini güncelle
// @access Private
const updateItem = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ mesaj: 'Kıyafet bulunamadı.' });
        }
        if (item.kullanici.toString() !== req.user._id.toString()) {
            return res.status(403).json({ mesaj: 'Bu kıyafeti düzenleme yetkiniz yok.' });
        }

        const { kategori, renk, mevsim, stil, marka, notlar } = req.body;

        const updatedItem = await Item.findByIdAndUpdate(
            req.params.id,
            { kategori, renk, mevsim, stil, marka, notlar },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            mesaj: 'Kıyafet bilgileri güncellendi. ✅',
            kiyafet: updatedItem,
        });

    } catch (error) {
        console.error('Kıyafet Güncelleme Hatası:', error);
        res.status(500).json({ mesaj: 'Kıyafet güncellenemedi.' });
    }
};

// @route  DELETE /api/items/:id
// @desc   Kıyafet sil
// @access Private
const deleteItem = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ mesaj: 'Kıyafet bulunamadı.' });
        }
        if (item.kullanici.toString() !== req.user._id.toString()) {
            return res.status(403).json({ mesaj: 'Başkasının dolabından kıyafet silemezsiniz.' });
        }

        if (item.cloudinaryId) {
            try {
                await cloudinary.uploader.destroy(item.cloudinaryId);
            } catch (cloudErr) {
                console.error('Cloudinary silme hatası:', cloudErr.message);
            }
        }

        await item.deleteOne();
        res.status(200).json({ mesaj: 'Kıyafet dolabınızdan silindi. 🗑️' });

    } catch (error) {
        console.error('Kıyafet Silme Hatası:', error);
        res.status(500).json({ mesaj: 'Kıyafet silinemedi.' });
    }
};

// @route  PATCH /api/items/:id/favorite
// @desc   Kıyafeti favorilere ekle / çıkar (toggle)
// @access Private
const toggleFavori = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) return res.status(404).json({ mesaj: 'Kıyafet bulunamadı.' });
        if (item.kullanici.toString() !== req.user._id.toString()) {
            return res.status(403).json({ mesaj: 'Bu kıyafete erişim yetkiniz yok.' });
        }

        item.favori = !item.favori;
        await item.save();

        res.status(200).json({
            mesaj: item.favori ? 'Favorilere eklendi. ❤️' : 'Favorilerden çıkarıldı.',
            favori: item.favori,
            kiyafet: item,
        });

    } catch (error) {
        console.error('Favori Toggle Hatası:', error);
        res.status(500).json({ mesaj: 'Favori durumu güncellenemedi.' });
    }
};

// @route  GET /api/items/favorites
// @desc   Kullanıcının favori kıyafetlerini getir
// @access Private
const getFavorites = async (req, res) => {
    try {
        const items = await Item.find({ kullanici: req.user._id, favori: true }).sort({ updatedAt: -1 });
        res.status(200).json({ favoriler: items, toplam: items.length });
    } catch (error) {
        console.error('Favoriler Hatası:', error);
        res.status(500).json({ mesaj: 'Favoriler getirilemedi.' });
    }
};

module.exports = {
    analyzeAndAddItem,
    getItems,
    getItemById,
    updateItem,
    deleteItem,
    toggleFavori,
    getFavorites,
};
