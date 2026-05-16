const Item            = require('../models/Item');
const TravelSuitcase  = require('../models/TravelSuitcase');
const { seyahatHavaDurumu }        = require('../services/weatherService');
const { generateSuitcaseSuggestion, wardrobeOnKontrol } = require('../services/aiService');

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/travel/pack
//  Şehir + tarih aralığını alır, hava durumunu çeker, AI ile bavul hazırlar.
// ─────────────────────────────────────────────────────────────────────────────
const generateSuitcase = async (req, res, next) => {
    try {
        const { sehir, baslangicTarihi, bitisTarihi } = req.body;

        // ── Girdi doğrulama ───────────────────────────────────────────────────
        if (!sehir || !baslangicTarihi || !bitisTarihi) {
            return res.status(400).json({
                mesaj: 'Şehir, başlangıç tarihi ve bitiş tarihi zorunludur.'
            });
        }

        const baslangic = new Date(baslangicTarihi);
        const bitis     = new Date(bitisTarihi);

        if (isNaN(baslangic.getTime()) || isNaN(bitis.getTime())) {
            return res.status(400).json({ mesaj: 'Geçersiz tarih formatı.' });
        }

        if (bitis < baslangic) {
            return res.status(400).json({
                mesaj: 'Bitiş tarihi başlangıç tarihinden önce olamaz.'
            });
        }

        // Gün sayısı (en az 1)
        const gunSayisi = Math.max(
            1,
            Math.ceil((bitis - baslangic) / (1000 * 60 * 60 * 24)) + 1
        );

        // ── Dolabı çek ────────────────────────────────────────────────────────
        const kiyafetler = await Item.find({ kullanici: req.user._id }).lean();

        if (kiyafetler.length === 0) {
            return res.status(400).json({
                mesaj: 'Dolabınızda hiç kıyafet bulunamadı. Lütfen önce dolabınıza kıyafet ekleyin.'
            });
        }

        // Temel kombin yapılabilirlik kontrolü
        const kontrol = wardrobeOnKontrol(kiyafetler);
        if (!kontrol.gecerli) {
            return res.status(400).json({ mesaj: kontrol.mesaj });
        }

        // ── Hava durumu (forecast → current fallback) ─────────────────────────
        console.log(`✈️  Seyahat hava durumu çekiliyor: ${sehir} | ${baslangicTarihi} → ${bitisTarihi}`);
        let hava;
        try {
            hava = await seyahatHavaDurumu(sehir, baslangic, bitis);
        } catch (weatherErr) {
            console.warn('⚠️  Hava durumu alınamadı:', weatherErr.message);
            // Hava durumu alınamazsa varsayılan değerle devam et
            hava = {
                sicaklik: 18,
                durum: 'bilinmiyor',
                ana_durum: 'Unknown',
                icon: '02d',
                nem: 60,
                konum: sehir,
                tahminiMi: true
            };
        }

        // ── AI bavul önerisi ─────────────────────────────────────────────────
        console.log(`🤖  AI bavul hazırlıyor: ${sehir}, ${gunSayisi} gün, ${hava.sicaklik}°C`);
        const aiSonuc = await generateSuitcaseSuggestion(
            kiyafetler,
            hava,
            sehir,
            gunSayisi
        );

        if (!aiSonuc.secilen_kiyafet_idleri?.length) {
            return res.status(500).json({
                mesaj: 'AI herhangi bir kıyafet öneremedi. Dolabınızı zenginleştirmeyi deneyin.'
            });
        }

        // ── Veritabanına kaydet ───────────────────────────────────────────────
        const yeniBavul = await TravelSuitcase.create({
            kullanici:          req.user._id,
            sehir:              hava.konum || sehir,   // OpenWeather'ın normalize ettiği ismi kullan
            baslangicTarihi:    baslangic,
            bitisTarihi:        bitis,
            gunSayisi,
            havaDurumuOzeti:    hava.durum,
            havaSicakligi:      hava.sicaklik,
            havaIkonu:          hava.icon,
            tahminiHava:        hava.tahminiMi ?? false,
            onerilenkiyafetler: aiSonuc.secilen_kiyafet_idleri,
            aiAciklamasi:       aiSonuc.aciklama || '',
            aiIpucu:            aiSonuc.ipucu    || '',
        });

        // Populate ederek tam kıyafet bilgisiyle dön
        const populated = await TravelSuitcase.findById(yeniBavul._id)
            .populate('onerilenkiyafetler', 'resimUrl kategori renk mevsim stil marka');

        console.log(`✅  Bavul oluşturuldu: ${yeniBavul._id} | ${aiSonuc.secilen_kiyafet_idleri.length} parça`);

        res.status(201).json({
            mesaj: 'Seyahat bavulunuz hazırlandı! 🧳',
            bavul: populated
        });

    } catch (err) {
        console.error('❌ generateSuitcase hatası:', err.message);
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/travel
//  Kullanıcının kayıtlı tüm seyahat bavullarını döndürür.
// ─────────────────────────────────────────────────────────────────────────────
const getSuitcases = async (req, res, next) => {
    try {
        const bavullar = await TravelSuitcase.find({ kullanici: req.user._id })
            .populate('onerilenkiyafetler', 'resimUrl kategori renk mevsim stil marka')
            .sort({ createdAt: -1 });

        res.status(200).json({
            sayi: bavullar.length,
            bavullar
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE /api/travel/:id
//  Belirtilen seyahat bavulunu siler.
// ─────────────────────────────────────────────────────────────────────────────
const deleteSuitcase = async (req, res, next) => {
    try {
        const bavul = await TravelSuitcase.findOne({
            _id:      req.params.id,
            kullanici: req.user._id
        });

        if (!bavul) {
            return res.status(404).json({ mesaj: 'Bavul bulunamadı.' });
        }

        await bavul.deleteOne();
        res.status(200).json({ mesaj: 'Seyahat bavulu silindi.' });
    } catch (err) {
        next(err);
    }
};

module.exports = { generateSuitcase, getSuitcases, deleteSuitcase };
