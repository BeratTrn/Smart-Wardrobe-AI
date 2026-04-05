const Item = require('../models/Item');
const { kiyafetAnaliz } = require('../services/aiService');
const { cloudinary } = require('../config/cloudinary');

// @route  POST /api/items/add
// @desc   Fotoğraf yükle + AI analiz et + dolaba ekle
// @access Private
const analyzeAndAddItem = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ mesaj: 'Lütfen bir kıyafet fotoğrafı yükleyin.' });
        }

        let aiData = {};
        let resimUrl = '';
        let cloudinaryId = '';

        // Cloudinary'ye yüklendiyse URL'i al
        if (req.file.path) {
            // Cloudinary storage kullanıldığında req.file.path = URL
            resimUrl = req.file.path;
            cloudinaryId = req.file.filename || '';
        }

        // AI Analizi - buffer varsa (memory storage), yoksa URL üzerinden
        try {
            if (req.file.buffer) {
                aiData = await kiyafetAnaliz(req.file.buffer, req.file.mimetype);
            } else {
                // Geçici placeholder (gerçek proje için URL üzerinden analiz eklenebilir)
                aiData = {
                    kategori: req.body.kategori || 'Diğer',
                    renk: req.body.renk || 'Bilinmiyor',
                    mevsim: req.body.mevsim || 'Tüm Mevsimler',
                    stil: req.body.stil || 'Casual',
                    aiDogrulandi: false
                };
            }
        } catch (aiError) {
            console.error('AI Analiz Hatası:', aiError.message);
            // AI başarısız olursa manuel bilgileri kullan
            aiData = {
                kategori: req.body.kategori || 'Diğer',
                renk: req.body.renk || 'Bilinmiyor',
                mevsim: req.body.mevsim || 'Tüm Mevsimler',
                stil: req.body.stil || 'Casual',
                aiDogrulandi: false
            };
        }

        const newItem = await Item.create({
            kullanici: req.user._id,
            resimUrl: resimUrl || 'placeholder_url',
            cloudinaryId,
            kategori: aiData.kategori,
            renk: aiData.renk,
            mevsim: aiData.mevsim,
            stil: aiData.stil,
            marka: req.body.marka || '',
            notlar: req.body.notlar || '',
            aiDogrulandi: aiData.aiDogrulandi
        });

        res.status(201).json({
            mesaj: 'Kıyafet yapay zeka ile analiz edildi ve dolabınıza eklendi! 🪄',
            kiyafet: newItem
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

        // Dinamik filtre oluştur
        const filtre = { kullanici: req.user._id };
        if (kategori) filtre.kategori = kategori;
        if (mevsim) filtre.mevsim = mevsim;
        if (renk) filtre.renk = new RegExp(renk, 'i');
        if (stil) filtre.stil = stil;

        const skip = (parseInt(sayfa) - 1) * parseInt(limit);

        const [items, toplam] = await Promise.all([
            Item.find(filtre)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Item.countDocuments(filtre)
        ]);

        res.status(200).json({
            mesaj: 'Kıyafetler başarıyla getirildi. 👕',
            toplam,
            sayfa: parseInt(sayfa),
            toplamSayfa: Math.ceil(toplam / parseInt(limit)),
            kiyafetler: items
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
// @desc   Kıyafet bilgilerini güncelle (AI etiketlerini düzelt)
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
            kiyafet: updatedItem
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

        // Cloudinary'den de sil (varsa)
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

module.exports = { analyzeAndAddItem, getItems, getItemById, updateItem, deleteItem };
