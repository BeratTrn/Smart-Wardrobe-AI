const Outfit = require('../models/Outfit');
const Item = require('../models/Item');
const { generateOutfitSuggestion } = require('../services/aiService');
const { havaDurumuGetir, sehirHavaDurumu } = require('../services/weatherService');

// ── Shared helper: resolve weather from request body ─────────
const resolveWeather = async ({ enlem, boylam, sehir }) => {
    try {
        if (enlem && boylam) return await havaDurumuGetir(enlem, boylam);
        if (sehir) return await sehirHavaDurumu(sehir);
        return await sehirHavaDurumu('Istanbul');
    } catch {
        return { sicaklik: 20, durum: 'Bilinmiyor', ana_durum: 'Clear', konum: sehir || 'Türkiye' };
    }
};

// @route  POST /api/outfits/recommend
// @desc   Hava durumu + etkinliğe göre AI (Gemini) kombin önerisi al
// @access Private
const kombinOnerisi = async (req, res) => {
    try {
        const { enlem, boylam, sehir, etkinlik = 'Günlük' } = req.body;

        const kiyafetler = await Item.find({ kullanici: req.user._id });
        if (kiyafetler.length === 0) {
            return res.status(400).json({
                mesaj: 'Kombin önerisi için önce dolabınıza kıyafet eklemelisiniz. 👗',
            });
        }

        const havaBilgisi = await resolveWeather({ enlem, boylam, sehir });
        const aiKombin = await generateOutfitSuggestion(kiyafetler, havaBilgisi, etkinlik);

        let onerilen = [];
        if (aiKombin.secilen_kiyafet_idleri?.length) {
            onerilen = await Item.find({
                _id: { $in: aiKombin.secilen_kiyafet_idleri },
                kullanici: req.user._id,
            });
        }

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
                    konum: havaBilgisi.konum,
                },
            },
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
                etkinlik,
            },
        });

    } catch (error) {
        console.error('Kombin Önerisi Hatası:', error);
        // wardrobeOnKontrol 400 fırlatırsa anlamlı mesajı kullanıcıya ilet
        const status = error.statusCode === 400 ? 400 : 500;
        const mesaj  = status === 400
            ? error.message
            : 'Kombin önerisi oluşturulamadı. Lütfen tekrar deneyin.';
        res.status(status).json({ mesaj });
    }
};

// @route  POST /api/outfits/daily
// @desc   Günlük otomatik kombin — konum + etkinlik zorunlu değil
// @access Private
const generateDailyOutfit = async (req, res) => {
    try {
        const { sehir = 'Istanbul', etkinlik = 'Günlük' } = req.body;

        const kiyafetler = await Item.find({ kullanici: req.user._id });
        if (kiyafetler.length === 0) {
            return res.status(400).json({
                mesaj: 'Günlük kombin için önce dolabınıza kıyafet eklemelisiniz. 👗',
            });
        }

        // Mock weather fallback so the endpoint works without a live API key
        let havaBilgisi;
        try {
            havaBilgisi = await sehirHavaDurumu(sehir);
        } catch {
            havaBilgisi = { sicaklik: 20, durum: 'Güneşli', nem: 50, konum: sehir };
        }

        const aiKombin = await generateOutfitSuggestion(kiyafetler, havaBilgisi, etkinlik);

        let onerilen = [];
        if (aiKombin.secilen_kiyafet_idleri?.length) {
            onerilen = await Item.find({
                _id: { $in: aiKombin.secilen_kiyafet_idleri },
                kullanici: req.user._id,
            });
        }

        const outfit = await Outfit.create({
            kullanici: req.user._id,
            baslik: `Günlük Kombin - ${havaBilgisi.konum}`,
            kiyafetler: onerilen.map(k => k._id),
            aiAciklama: aiKombin.aciklama,
            baglam: {
                etkinlik,
                havaDurumu: {
                    sicaklik: havaBilgisi.sicaklik,
                    durum: havaBilgisi.durum,
                    nem: havaBilgisi.nem,
                    konum: havaBilgisi.konum,
                },
            },
        });

        res.status(200).json({
            mesaj: 'Günlük kombiniz hazır! 🌤️',
            kombin: {
                id: outfit._id,
                baslik: outfit.baslik,
                aciklama: aiKombin.aciklama,
                ipucu: aiKombin.ipucu || '',
                kiyafetler: onerilen,
                havaDurumu: havaBilgisi,
                etkinlik,
            },
        });

    } catch (error) {
        console.error('Günlük Kombin Hatası:', error);
        const status = error.statusCode === 400 ? 400 : 500;
        const mesaj  = status === 400
            ? error.message
            : 'Günlük kombin oluşturulamadı. Lütfen tekrar deneyin.';
        res.status(status).json({ mesaj });
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
            Outfit.countDocuments({ kullanici: req.user._id }),
        ]);

        res.status(200).json({
            mesaj: 'Kombinler getirildi.',
            toplam,
            sayfa: parseInt(sayfa),
            kombinler: outfits,
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

        const outfit = await Outfit.findOne({ _id: req.params.id, kullanici: req.user._id });
        if (!outfit) {
            return res.status(404).json({ mesaj: 'Kombin bulunamadı.' });
        }

        outfit.begeniyor = begeniyor;
        outfit.kaydedildi = begeniyor === true;
        await outfit.save();

        res.status(200).json({
            mesaj: begeniyor ? 'Kombin kaydedildi! 💖' : 'Geri bildiriminiz alındı.',
            kombin: outfit,
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
        const outfit = await Outfit.findOne({ _id: req.params.id, kullanici: req.user._id });
        if (!outfit) {
            return res.status(404).json({ mesaj: 'Kombin bulunamadı.' });
        }

        await outfit.deleteOne();
        res.status(200).json({ mesaj: 'Kombin silindi.' });

    } catch (error) {
        res.status(500).json({ mesaj: 'Kombin silinemedi.' });
    }
};

module.exports = { kombinOnerisi, generateDailyOutfit, getOutfits, outfitFeedback, deleteOutfit };
