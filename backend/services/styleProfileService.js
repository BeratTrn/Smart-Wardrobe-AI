const Item = require('../models/Item');
const User = require('../models/User');

// Item.kategori enum ile birebir uyumlu (bkz. models/Item.js)
const ALL_CATEGORIES = ['Üst Giyim', 'Alt Giyim', 'Elbise', 'Dış Giyim', 'Ayakkabı', 'Aksesuar'];

// Web aramasında kullanılacak basit Türkçe kategori terimleri
const CATEGORY_SEARCH_TERMS = {
    'Üst Giyim':     'üst giyim',
    'Alt Giyim':     'pantolon',
    'Elbise':        'elbise',
    'Dış Giyim':     'mont',
    'Ayakkabı':      'ayakkabı',
    'Aksesuar':      'aksesuar',
};

// Item.stil enum -> arama anahtar kelimesi
const STIL_SEARCH_TERMS = {
    'Günlük': 'günlük',
    'Klasik': 'klasik',
    'Spor':   'spor',
    'Sokak':  'sokak modası',
    'Minimal':'minimal',
    'Şık':    'şık',
    'Resmi':  'resmi',
};

// Item.mevsim enum -> arama anahtar kelimesi
const MEVSIM_SEARCH_TERMS = {
    'İlkbahar':       'ilkbahar',
    'Yaz':            'yaz',
    'Sonbahar':       'sonbahar',
    'Kış':            'kış',
    'Tüm Mevsimler':  '',
};

// Ay -> mevsim eşlemesi 
const SEASON_BY_MONTH = {
    12: 'Kış',     1: 'Kış',  2: 'Kış',
    3: 'İlkbahar', 4: 'İlkbahar', 5: 'İlkbahar',
    6: 'Yaz',      7: 'Yaz',  8: 'Yaz',
    9: 'Sonbahar', 10: 'Sonbahar', 11: 'Sonbahar',
};

/**
 * Bugünün tarihine göre güncel mevsimi döner (Item.mevsim enum değerleri ile uyumlu).
 * @param {Date} [date]
 * @returns {string} 'İlkbahar' | 'Yaz' | 'Sonbahar' | 'Kış'
 */
const getCurrentSeason = (date = new Date()) => SEASON_BY_MONTH[date.getMonth() + 1];

/**
 * HEX rengi HSL'e çevirir.
 * @param {string} hex - "#rrggbb" veya "#rgb"
 * @returns {{h:number, s:number, l:number}}
 */
const hexToHSL = (hex) => {
    let normalized = hex.replace('#', '').trim();
    if (normalized.length === 3) {
        normalized = normalized.split('').map((c) => c + c).join('');
    }
    const r = parseInt(normalized.substring(0, 2), 16) / 255;
    const g = parseInt(normalized.substring(2, 4), 16) / 255;
    const b = parseInt(normalized.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    const d = max - min;

    if (d !== 0) {
        s = d / (1 - Math.abs(2 * l - 1));
        switch (max) {
            case r: h = ((g - b) / d) % 6; break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h *= 60;
        if (h < 0) h += 360;
    }

    return { h, s: s * 100, l: l * 100 };
};

/**
 * Bir HEX rengini insan-okunabilir bir "renk ailesi"ne indirger.
 * Gardıroptaki tonlarca farklı hex değerlerini ortak bir kümeye toplamak
 * (örn. #0B1A33 ve #16284A -> "lacivert/mavi") arama sorgusu üretiminde gerekli.
 * @param {string} hex
 * @returns {string}
 */
const hexToColorName = (hex) => {
    if (!hex || typeof hex !== 'string' || !/^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(hex.trim())) {
        return 'nötr';
    }

    const { h, s, l } = hexToHSL(hex);

    if (l < 15) return 'siyah';
    if (l > 90) return 'beyaz';
    if (s < 12) return 'gri';
    if (h < 20 || h >= 345) return 'kırmızı';
    if (h < 45) return 'kahverengi';
    if (h < 65) return 'sarı';
    if (h < 170) return 'yeşil';
    if (h < 200) return 'turkuaz';
    if (h < 255) return 'mavi';
    if (h < 290) return 'lacivert';
    /* istanbul ignore else -- h değeri burada her zaman [290,345) aralığındadır
       (önceki dallar [0,290) ve [345,360) aralıklarını tüketir), bu yüzden bu
       koşul her zaman doğrudur; aşağıdaki 'nötr' fallback'i erişilemez bir
       güvenlik ağıdır */
    if (h < 345) return 'pembe';
    /* istanbul ignore next -- h her zaman [0,360) aralığında ve yukarıdaki
       dallar bu aralığın tamamını kapsar; bu satır erişilemez bir güvenlik ağıdır */
    return 'nötr';
};

/**
 * Kullanıcının gardırobundan ve tercihlerinden bir "stil profili" çıkarır.
 * Gardırop boşsa kullanıcının kayıt sırasında belirttiği tercihlere (User.tercihler) düşer.
 *
 * @param {string} userId
 * @returns {Promise<{
 *   dominantStiller: string[],
 *   dominantRenkler: string[],
 *   guncelMevsim: string,
 *   eksikKategoriler: string[],
 *   gardrobBoyutu: number,
 *   kaynak: 'gardrop' | 'tercihler'
 * }>}
 */
const getStyleProfile = async (userId) => {
    const guncelMevsim = getCurrentSeason();
    const items = await Item.find({ kullanici: userId }).select('kategori renk mevsim stil').lean();

    // Gardırop boşsa: kullanıcının profil tercihlerine düş 
    if (!items.length) {
        const user = await User.findById(userId).select('tercihler').lean();
        const favoriRenkler = (user?.tercihler?.favoriRenkler || [])
            .map(hexToColorName)
            .filter((r) => r && r !== 'nötr');

        return {
            dominantStiller: [user?.tercihler?.favoriStil || 'Günlük'],
            dominantRenkler: favoriRenkler.length ? favoriRenkler.slice(0, 2) : ['nötr'],
            guncelMevsim,
            eksikKategoriler: ALL_CATEGORIES,
            gardrobBoyutu: 0,
            kaynak: 'tercihler',
        };
    }

    // Gardıroptaki dağılımları say
    const stilSayac = {};
    const renkSayac = {};
    const kategoriSayac = {};

    for (const item of items) {
        if (item.stil) stilSayac[item.stil] = (stilSayac[item.stil] || 0) + 1;

        /* istanbul ignore else -- Item.renk şemada zorunlu (required) bir alandır;
           bu dal yalnızca eski/bozuk veri için bir güvenlik ağıdır */
        if (item.renk) {
            const aile = hexToColorName(item.renk);
            renkSayac[aile] = (renkSayac[aile] || 0) + 1;
        }

        /* istanbul ignore else -- Item.kategori şemada zorunlu (required) bir
           alandır; bu dal yalnızca eski/bozuk veri için bir güvenlik ağıdır */
        if (item.kategori) kategoriSayac[item.kategori] = (kategoriSayac[item.kategori] || 0) + 1;
    }

    const siraliDizi = (sayac) => Object.entries(sayac).sort((a, b) => b[1] - a[1]).map(([k]) => k);

    const dominantStiller = siraliDizi(stilSayac).slice(0, 2);
    const dominantRenkler = siraliDizi(renkSayac).filter((r) => r !== 'nötr').slice(0, 2);

    // Gardırobunda hiç olmayan veya çok az olan kategoriler — "tamamlayıcı" web önerisi için
    const eksikKategoriler = ALL_CATEGORIES.filter((k) => !kategoriSayac[k]);

    return {
        dominantStiller: dominantStiller.length ? dominantStiller : ['Günlük'],
        dominantRenkler: dominantRenkler.length ? dominantRenkler : ['nötr'],
        guncelMevsim,
        eksikKategoriler,
        gardrobBoyutu: items.length,
        kaynak: 'gardrop',
    };
};

/**
 * Stil profilinden web araması için Türkçe bir sorgu metni üretir.
 * Örn: "lacivert günlük yaz ayakkabı"
 *
 * @param {Object} profile - getStyleProfile() çıktısı
 * @param {{ etkinlik?: string, cinsiyetTerimi?: string }} [opts]
 * @returns {string}
 */
const buildSearchQuery = (profile, opts = {}) => {
    const parcalar = [];

    // Kullanıcının cinsiyetine göre web aramasını daraltmak için en başa eklenir
    // (örn. "erkek lacivert günlük yaz ayakkabı"). Belirtilmemişse atlanır.
    if (opts.cinsiyetTerimi) parcalar.push(opts.cinsiyetTerimi);

    const renk = profile.dominantRenkler?.[0];
    if (renk && renk !== 'nötr') parcalar.push(renk);

    const stil = profile.dominantStiller?.[0];
    if (stil && STIL_SEARCH_TERMS[stil]) parcalar.push(STIL_SEARCH_TERMS[stil]);

    const mevsimTerimi = MEVSIM_SEARCH_TERMS[profile.guncelMevsim];
    if (mevsimTerimi) parcalar.push(mevsimTerimi);

    // Gardırobunda eksik bir kategori varsa, web önerisini onu tamamlamaya yönlendir.
    // Aksi halde etkinliğe göre genel bir terim ekle.
    const eksikKategori = profile.eksikKategoriler?.[0];
    if (eksikKategori && CATEGORY_SEARCH_TERMS[eksikKategori]) {
        parcalar.push(CATEGORY_SEARCH_TERMS[eksikKategori]);
    } else if (opts.etkinlik) {
        parcalar.push(opts.etkinlik.toLowerCase());
    }

    const sorgu = parcalar.filter(Boolean).join(' ').trim();
    return sorgu || 'günlük kombin';
};

module.exports = {
    ALL_CATEGORIES,
    getCurrentSeason,
    hexToHSL,
    hexToColorName,
    getStyleProfile,
    buildSearchQuery,
};
