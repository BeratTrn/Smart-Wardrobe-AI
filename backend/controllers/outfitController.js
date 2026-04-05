const Outfit = require('../models/Outfit');
const Item = require('../models/Item');
const { kombinOner } = require('../services/aiService');
const { havaDurumuGetir, sehirHavaDurumu } = require('../services/weatherService');

// @route  POST /api/outfits/recommend
// @desc   Hava durumu + etkinliğe göre AI kombin önerisi al
// @access Private
const kombinOnerisi = async (req, res) => {
    try {
        const { enlem, boylam, sehir, etkinlik = 'Günlük' } = req.body;

        // 1. Kullanıcının dolabındaki kıyafetleri çek
        const kiyafetler = await Item.find({ kullanici: req.user._id });

        if (kiyafetler.length === 0) {
            return res.status(400).json({
                mesaj: 'Kombin önerisi için önce dolabınıza kıyafet eklemelisiniz. 👗'
            });
        }

        // 2. Hava durumunu çek
        let havaBilgisi = null;
        try {
            if (enlem && boylam) {
                havaBilgisi = await havaDurumuGetir(enlem, boylam);
            } else if (sehir) {
                havaBilgisi = await sehirHavaDurumu(sehir);
            } else {
                // Default: İstanbul
                havaBilgisi = await sehirHavaDurumu('Istanbul');
            }
        } catch (weatherErr) {
            console.error('Hava durumu alınamadı:', weatherErr.message);
            // Fallback hava durumu
            havaBilgisi = {
                sicaklik: 20,
                durum: 'Bilinmiyor',
                ana_durum: 'Clear',
                konum: sehir || 'Türkiye'
            };
        }

        // 3. GPT'ye gönder, kombin önerisi al
        const aiKombin = await kombinOner(kiyafetler, havaBilgisi, etkinlik);

        // 4. Önerilen kıyafet ID'lerini doğrula ve kıyafet objelerini çek
        let onerilen = [];
        if (aiKombin.secilen_kiyafet_idleri && aiKombin.secilen_kiyafet_idleri.length > 0) {
            onerilen = await Item.find({
                _id: { $in: aiKombin.secilen_kiyafet_idleri },
                kullanici: req.user._id
            });
        }

        // 5. Kombini veritabanına kaydet
        const outfit = await Outfit.create({
            kullanici: req.user._id,
            baslik: `${etkinlik} - ${havaBilgisi.konum || 'Kombin'}`,
            kiyafetler: onerilen.map(k => k._id),
            aiAciklama: aiKombin.aciklama,
            baglam: {
                etkinlik,
                havaDurumu: {
                    sicaklik: havaBilgisi.sicaklik,
                    durum: havaBilgisi.durum,
                    nem: havaBilgisi.nem,
                    konum: havaBilgisi.konum
                }
            }
        });

        res.status(200).json({
            mesaj: 'Kombin önerisi hazır! ✨',
            kombin: {
                id: outfit._id,
                baslik: outfit.baslik,
                aciklama: aiKombin.aciklama,
                ipucu: aiKombin.ipucu || '',
                kiyafetler: onerilen,
                havaDurumu: havaBilgisi,
                etkinlik
            }
        });

    } catch (error) {
        console.error('Kombin Önerisi Hatası:', error);
        res.status(500).json({ mesaj: 'Kombin önerisi oluşturulamadı. Lütfen tekrar deneyin.' });
    }
};

// @route  GET /api/outfits
// @desc   Kullanıcının geçmiş kombinlerini getir
// @access Private
const getOutfits = async (req, res) => {
    try {
        const { sayfa = 1, limit = 10 } = req.query;
        const skip = (parseInt(sayfa) - 1) * parseInt(limit);

        const [outfits, toplam] = await Promise.all([
            Outfit.find({ kullanici: req.user._id })
                .populate('kiyafetler', 'kategori renk mevsim resimUrl stil')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Outfit.countDocuments({ kullanici: req.user._id })
        ]);

        res.status(200).json({
            mesaj: 'Kombinler getirildi.',
            toplam,
            sayfa: parseInt(sayfa),
            kombinler: outfits
        });

    } catch (error) {
        res.status(500).json({ mesaj: 'Kombinler getirilemedi.' });
    }
};

// @route  PUT /api/outfits/:id/feedback
// @desc   Kombin hakkında geri bildirim ver (beğendi/beğenmedi)
// @access Private
const outfitFeedback = async (req, res) => {
    try {
        const { begeniyor } = req.body;

        const outfit = await Outfit.findOne({
            _id: req.params.id,
            kullanici: req.user._id
        });

        if (!outfit) {
            return res.status(404).json({ mesaj: 'Kombin bulunamadı.' });
        }

        outfit.begeniyor = begeniyor;
        outfit.kaydedildi = begeniyor === true;
        await outfit.save();

        res.status(200).json({
            mesaj: begeniyor ? 'Kombin kaydedildi! 💖' : 'Geri bildiriminiz alındı.',
            kombin: outfit
        });

    } catch (error) {
        res.status(500).json({ mesaj: 'Geri bildirim kaydedilemedi.' });
    }
};

// @route  DELETE /api/outfits/:id
// @desc   Kombini sil
// @access Private
const deleteOutfit = async (req, res) => {
    try {
        const outfit = await Outfit.findOne({
            _id: req.params.id,
            kullanici: req.user._id
        });

        if (!outfit) {
            return res.status(404).json({ mesaj: 'Kombin bulunamadı.' });
        }

        await outfit.deleteOne();
        res.status(200).json({ mesaj: 'Kombin silindi.' });

    } catch (error) {
        res.status(500).json({ mesaj: 'Kombin silinemedi.' });
    }
};

module.exports = { kombinOnerisi, getOutfits, outfitFeedback, deleteOutfit };
