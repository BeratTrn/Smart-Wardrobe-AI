const Outfit = require('../models/Outfit');
const Item = require('../models/Item');
const { resolveWeather } = require('./outfitController');
const { getStyleProfile, buildSearchQuery } = require('../services/styleProfileService');
const { searchProducts } = require('../services/webProductService');
const { generateWebOutfitSuggestion } = require('../services/webOutfitService');
const { getGenderItemFilter, getGenderSearchTerm } = require('../utils/genderFilter');

// @route  POST /api/outfits/web-recommend
// @desc   Kullanıcının stil profiline göre web'den ürün arar ve gardırop + web
//         ürünlerini birleştirerek AI destekli bir kombin önerir.
// @access Private
const webKombinOnerisi = async (req, res) => {
    try {
        const { enlem, boylam, sehir, etkinlik = 'Günlük' } = req.body;

        // 1. Gardırop + hava durumu + stil profili
        const [kiyafetler, havaBilgisi] = await Promise.all([
            Item.find({
                kullanici: req.user._id,
                ...getGenderItemFilter(req.user.cinsiyet),
            }),
            resolveWeather({ enlem, boylam, sehir }),
        ]);

        const profile = await getStyleProfile(req.user._id);

        // 2. Stil profilinden arama sorgusu üret, web'den ürün ara
        const aramaSorgusu = buildSearchQuery(profile, {
            etkinlik,
            cinsiyetTerimi: getGenderSearchTerm(req.user.cinsiyet),
        });
        const webUrunleri = await searchProducts(aramaSorgusu);
        console.log(`[web-recommend] sorgu="${aramaSorgusu}" -> ${webUrunleri.length} ürün bulundu (profil kaynağı: ${profile.kaynak})`);

        // Gardırop boş VE web'den de hiçbir sonuç gelmediyse anlamlı bir kombin
        // üretilemez — kullanıcıyı bilgilendir.
        if (kiyafetler.length === 0 && webUrunleri.length === 0) {
            return res.status(400).json({
                mesaj: 'Şu an için kombin önerisi oluşturulamadı. Dolabınıza kıyafet ekleyin veya daha sonra tekrar deneyin. 👗',
            });
        }

        // 3. AI ile dolap + web ürünlerinden kombin seç
        const userProfile = {
            cinsiyet:   req.user.cinsiyet,
            vucutSekli: req.user.vucut?.sekil,
            vucutKalip: req.user.vucut?.kalip,
            stilTonu:   req.user.stilTonu,
        };
        const aiKombin = await generateWebOutfitSuggestion(kiyafetler, webUrunleri, profile, havaBilgisi, etkinlik, userProfile);

        let onerilenKiyafetler = [];
        if (aiKombin.secilen_kiyafet_idleri?.length) {
            onerilenKiyafetler = await Item.find({
                _id: { $in: aiKombin.secilen_kiyafet_idleri },
                kullanici: req.user._id,
            });
        }

        const secilenWebUrunleri = webUrunleri.filter((p) =>
            aiKombin.secilen_web_urun_idleri?.includes(p.webId)
        );

        // Seçilen hiçbir parça yoksa (AI boş döndüyse) kullanıcıya anlamlı bir hata ver
        if (onerilenKiyafetler.length === 0 && secilenWebUrunleri.length === 0) {
            return res.status(502).json({
                mesaj: 'AI bu istek için bir kombin oluşturamadı. Lütfen tekrar deneyin.',
            });
        }

        // 4. Sonucu kaydet
        const disUrunler = secilenWebUrunleri.map((p) => ({
            ad: p.ad,
            resimUrl: p.resimUrl,
            link: p.link,
            fiyat: p.fiyat,
            kaynak: p.kaynak,
        }));

        const outfit = await Outfit.create({
            kullanici: req.user._id,
            baslik: `Web Destekli Kombin - ${etkinlik}`,
            kiyafetler: onerilenKiyafetler.map((k) => k._id),
            disUrunler,
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
            mesaj: 'Web destekli kombin önerisi hazır! 🛍️',
            kombin: {
                id: outfit._id,
                baslik: outfit.baslik,
                aciklama: aiKombin.aciklama,
                ipucu: aiKombin.ipucu || '',
                kiyafetler: onerilenKiyafetler,
                disUrunler,
                havaDurumu: havaBilgisi,
                etkinlik,
                aramaSorgusu,
                webUrunSayisi: webUrunleri.length,
            },
        });

    } catch (error) {
        console.error('Web Kombin Önerisi Hatası:', error);
        res.status(500).json({ mesaj: 'Web destekli kombin önerisi oluşturulamadı. Lütfen tekrar deneyin.' });
    }
};

module.exports = { webKombinOnerisi };
