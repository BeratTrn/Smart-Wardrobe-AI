const axios = require('axios');
const FormData = require('form-data');
const Groq = require('groq-sdk');
const { hexToColorName } = require('./styleProfileService');

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

// Yeni Yapay Zeka Motorumuz: Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy_key_for_build' });

// FastAPI category slug → MongoDB Item.kategori enum value (strict 6-category system)
const CATEGORY_MAP = {
    ust_giyim:   'Üst Giyim',
    alt_giyim:   'Alt Giyim',
    elbise:      'Elbise',
    etek:        'Elbise',
    dis_giyim:   'Dış Giyim',
    mont:        'Dış Giyim',
    ayakkabi:    'Ayakkabı',
    aksesuar:    'Aksesuar',
    spor_giyim:  'Üst Giyim',  // sporu üst giyime düşür — enum dışında değer engellenir
};

/**
 * Sends an image buffer OR a Cloudinary URL to the FastAPI AI engine and returns
 * the dominant color (HEX) and mapped category.
 * @param {Buffer|string} fileOrUrl - Raw image buffer OR Cloudinary image URL
 * @param {string} originalname  - original filename with extension
 * @returns {{ kategori: string, renk: string, aiDogrulandi: boolean }}
 */
const analyzeItem = async (fileOrUrl, originalname) => {
    let fileBuffer = fileOrUrl;

    // EĞER GELEN ŞEY BİR URL İSE (Cloudinary Linki), ÖNCE ONU İNDİRİP BUFFER'A ÇEVİRİYORUZ
    if (typeof fileOrUrl === 'string' && fileOrUrl.startsWith('http')) {
        const response = await axios.get(fileOrUrl, { responseType: 'arraybuffer' });
        fileBuffer = Buffer.from(response.data);
    }

    const form = new FormData();
    form.append('file', fileBuffer, {
        filename: originalname || 'image.jpg',
        contentType: 'image/jpeg',
    });

    const { data } = await axios.post(`${FASTAPI_URL}/analyze-item/`, form, {
        headers: form.getHeaders(),
        timeout: 30_000,
    });

    const raw = data.analysis;
    const kategori = CATEGORY_MAP[raw.category] || 'Aksesuar';

    return {
        kategori,
        renk: raw.dominant_color,   // e.g. "#2D405C"
        aiDogrulandi: true,
    };
};

// Vücut Profili + Stil Danışmanı Tonu — AI kombin açıklamalarında kullanılan etiketler

const VUCUT_SEKLI_LABELS = {
    kum_saati:   'Kum Saati (omuz ve kalça dengeli, bel belirgin)',
    armut:       'Armut (kalça omuzdan biraz daha geniş)',
    ters_ucgen:  'Ters Üçgen (omuz kalçadan daha geniş)',
    dikdortgen:  'Dikdörtgen (omuz, bel ve kalça birbirine yakın)',
};

const KALIP_LABELS = {
    slim:     'Slim-fit (vücuda yakın, dar kesimi sever)',
    regular:  'Regular (standart, dengeli kesimi sever)',
    oversize: 'Oversize (bol, rahat kesimi sever)',
};

const TON_TALIMATLARI = {
    professional: 'Profesyonel: resmi, net ve kurumsal bir dil kullan; ölçülü ve saygılı bir danışman gibi yaz, şakacı ifadelerden kaçın.',
    friendly:     'Samimi: sıcak, enerjik ve arkadaşça bir dille yaz; sanki yakın bir arkadaş tavsiye veriyormuş gibi içten ol.',
    harsh:        'Sert / Moda Eleştirmeni: dürüst, doğrudan ve iddialı bir dille yaz; gerekirse seçimi nazikçe eleştir ama her zaman somut bir alternatif sun — kompromise girme, yumuşatma.',
};

/**
 * Kullanıcının vücut profili + cinsiyet + stil danışmanı tonu bilgisinden
 * AI prompt'una eklenecek metin bloğunu ve anlatım tonu talimatını üretir.
 * Kullanıcı bu alanlardan hiçbirini seçmemişse ilgili satır prompt'a hiç eklenmez.
 *
 * @param {{cinsiyet?: string, vucutSekli?: string, vucutKalip?: string, stilTonu?: string}} userProfile
 * @returns {{ profilBlok: string, tonTalimati: string }}
 */
const buildUserProfileContext = (userProfile = {}) => {
    const { cinsiyet, vucutSekli, vucutKalip, stilTonu } = userProfile;
    const satirlar = [];

    if (cinsiyet && cinsiyet !== 'Belirtilmemiş') satirlar.push(`- Cinsiyet: ${cinsiyet}`);
    if (vucutSekli && VUCUT_SEKLI_LABELS[vucutSekli]) satirlar.push(`- Vücut Şekli: ${VUCUT_SEKLI_LABELS[vucutSekli]}`);
    if (vucutKalip && KALIP_LABELS[vucutKalip]) satirlar.push(`- Kalıp Tercihi: ${KALIP_LABELS[vucutKalip]}`);

    const tonTalimati = TON_TALIMATLARI[stilTonu] || TON_TALIMATLARI.friendly;

    if (satirlar.length === 0) return { profilBlok: '', tonTalimati };

    const profilBlok = `
════════════════════════════════
KULLANICI VÜCUT PROFİLİ — "aciklama" VE "ipucu" METİNLERİNDE MUTLAKA KULLAN
════════════════════════════════
${satirlar.join('\n')}
Bu bilgilere göre kombinin neden bu kullanıcıya yakışacağını somut bir gerekçeyle anlat
(örn. bel vurgusu, omuz dengesi, kalıbın vücuda etkisi gibi). Kalıp tercihine sadık kal,
ona ters bir kesim önerme.
`;

    return { profilBlok, tonTalimati };
};

// Kategori sabitleri
const KAT = {
    UST:     'Üst Giyim',
    ALT:     'Alt Giyim',
    ELBISE:  'Elbise',
    DIS:     'Dış Giyim',
    AYAK:    'Ayakkabı',
    AKSESUAR:'Aksesuar',
};

/**
 * Kullanıcının dolabında kombin yapabilmek için yeterli temel parça
 * olup olmadığını kontrol eder.
 *
 * Geçerli yapılar:
 *   A) En az 1 Üst Giyim + 1 Alt Giyim + 1 Ayakkabı
 *   B) En az 1 Elbise + 1 Ayakkabı
 *
 * @param {Array} items - MongoDB Item dökümanları
 * @returns {{ gecerli: boolean, mesaj?: string }}
 */
const wardrobeOnKontrol = (items) => {
    const sayac = {};
    for (const item of items) {
        sayac[item.kategori] = (sayac[item.kategori] || 0) + 1;
    }

    const varA = (sayac[KAT.UST]    >= 1) &&
                 (sayac[KAT.ALT]    >= 1) &&
                 (sayac[KAT.AYAK]   >= 1);

    const varB = (sayac[KAT.ELBISE] >= 1) &&
                 (sayac[KAT.AYAK]   >= 1);

    if (varA || varB) return { gecerli: true };

    // Neyin eksik olduğunu kullanıcıya bildiren spesifik mesaj
    const eksikler = [];
    if (!sayac[KAT.AYAK])  eksikler.push('ayakkabı');
    if (!sayac[KAT.UST] && !sayac[KAT.ELBISE]) eksikler.push('üst giyim veya elbise');
    if (!sayac[KAT.ALT] && !sayac[KAT.ELBISE]) eksikler.push('alt giyim veya elbise');

    return {
        gecerli: false,
        mesaj: `Dolabınızda kombin yapabilmek için yeterli temel parça bulunmuyor. ` +
               `Lütfen en az bir üst giyim (veya elbise), bir alt giyim ve bir ayakkabı ekleyin. ` +
               `(Eksik: ${eksikler.join(', ')})`,
    };
};

/**
 * Groq / Llama 3.3 ile anatomik kurallara uygun kombin önerir.
 * Çağrılmadan önce `wardrobeOnKontrol` ile dolap doğrulanır.
 *
 * @param {Array}  userItems   - Item documents from MongoDB
 * @param {Object} havaDurumu  - { sicaklik, durum, konum }
 * @param {string} etkinlik    - activity type
 * @returns {{ aciklama: string, secilen_kiyafet_idleri: string[], ipucu: string }}
 * @throws {Error} Dolap yetersizse veya AI parse başarısızsa
 */
const generateOutfitSuggestion = async (userItems, havaDurumu, etkinlik = 'Günlük', userProfile = {}) => {

    // 1. ÖN KONTROL
    const kontrol = wardrobeOnKontrol(userItems);
    if (!kontrol.gecerli) {
        const err = new Error(kontrol.mesaj);
        err.statusCode = 400; // controller'da 400 olarak dönebilsin
        throw err;
    }

    // 2. DOLAP LİSTESİNİ HAZIRLA
    // Kategori etiketini ID'nin yanına ekliyoruz ki AI hangi parçanın
    // hangi kategoride olduğunu net görsün.
    // Geçerli Stil değerleri: Günlük, Klasik, Spor, Sokak, Minimal, Şık, Resmi
    const kiyafetListesi = userItems
        .map(k =>
            `ID:${k._id} | KATEGORİ:${k.kategori} | Renk:${k.renk} | Mevsim:${k.mevsim} | Stil:${k.stil}`
        )
        .join('\n');

    const sicaklik  = havaDurumu.sicaklik ?? 20;
    const sogukHava = sicaklik < 10;
    const sıcakHava = sicaklik > 25;

    const { profilBlok, tonTalimati } = buildUserProfileContext(userProfile);

    // 3. PROMPT
    const prompt = `
Sen bir profesyonel moda danışmanısın. Aşağıdaki DOLAP İÇERİĞİ listesinden tam anlamıyla giyilebilir, gerçek hayata uygun bir kombin oluştur.

════════════════════════════════
KOŞULLAR
════════════════════════════════
- Hava Durumu : ${havaDurumu.durum || 'Bilinmiyor'}, ${sicaklik}°C
- Konum       : ${havaDurumu.konum || 'Türkiye'}
- Etkinlik    : ${etkinlik}
${profilBlok}
════════════════════════════════
DOLAP İÇERİĞİ (YALNIZCA BURADAN SEÇ)
════════════════════════════════
${kiyafetListesi}

════════════════════════════════
ANATOMİK YAPI KURALLARI — MUTLAK ZORUNLU
════════════════════════════════
Kombin, aşağıdaki iki yapıdan BİRİNE TAMAMEN UYMAK ZORUNDADIR:

  YAPI A:  TAM OLARAK 1 adet "Üst Giyim"
          + TAM OLARAK 1 adet "Alt Giyim"
          + TAM OLARAK 1 adet "Ayakkabı"

  YAPI B:  TAM OLARAK 1 adet "Elbise"
          + TAM OLARAK 1 adet "Ayakkabı"

İKİ YAPI İÇİN DE ORTAK OPSIYONEL EKLER:
  - İSTEĞE BAĞLI: En fazla 1 adet "Dış Giyim"${sogukHava ? ' (hava soğuk olduğu için önerilir)' : sıcakHava ? ' (hava sıcak, gereksizse ekleme)' : ''}
  - İSTEĞE BAĞLI: En fazla 1 adet "Aksesuar"

════════════════════════════════
MUTLAK YASAK KURALLAR
════════════════════════════════
1. AYNI KATEGORİDEN 2 PARÇA ASLA SEÇİLEMEZ (2 üst, 2 ayakkabı, 2 elbise vb. kesinlikle yasak).
2. Listede ID'si OLMAYAN herhangi bir parça seçilemez.
3. "Üst Giyim" + "Elbise" kombinasyonu yasak (ikisi birden seçilemez).
${sogukHava ? '4. Hava 10°C altında: şort, kolsuz üst, ince yazlık KESİNLİKLE seçilmez.\n' : ''}${etkinlik === 'İş' ? '4. İş etkinliği: spor kıyafet (Spor Giyim) ve aşırı rahat parçalar seçilmez.\n' : ''}
════════════════════════════════
ANLATIM TONU — "aciklama" VE "ipucu" İÇİN ZORUNLU
════════════════════════════════
${tonTalimati}

════════════════════════════════
ÇIKTI FORMATI
════════════════════════════════
Yanıtını YALNIZCA geçerli bir JSON nesnesi olarak ver. Markdown, açıklama, ön/son metin YASAK.
{
  "aciklama": "Seçilen kombinin neden bu hava, etkinlik${profilBlok ? ' ve kullanıcının vücut profiline' : ''} uygun olduğunu anlatan 2-3 cümle (Türkçe; yukarıdaki ANLATIM TONU'na uy)",
  "secilen_kiyafet_idleri": ["<ID_1>", "<ID_2>", "<ID_3>"],
  "ipucu": "Tek cümlelik ek stil tavsiyesi (Türkçe; ANLATIM TONU'na uy)"
}
`.trim();

    // 4. AI ÇAĞRISI 
    const response = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.4, // Yaratıcılık < tutarlılık: kurallara uymak için düşük tutuyoruz
        response_format: { type: 'json_object' }, // Groq'un native JSON modu
    });

    const text = response.choices[0].message.content.trim();

    // 5. PARSE & SONUÇ DOĞRULAMA 
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch {
        // json_object modu açıkken bu nadiren olur; yine de güvenlik ağı
        const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
        parsed = JSON.parse(clean);
    }

    // Seçilen ID'lerin gerçekten dolaptaki parçalara ait olduğunu doğrula
    const gecerliIdler = new Set(userItems.map(k => k._id.toString()));
    parsed.secilen_kiyafet_idleri = (parsed.secilen_kiyafet_idleri || [])
        .filter(id => gecerliIdler.has(id.toString()));

    return parsed;
};

/**
 * Groq / Llama 3.3 ile seyahat kapsül gardırobu önerir.
 *
 * @param {Array}  userItems  - Item documents from MongoDB
 * @param {Object} havaDurumu - { sicaklik, durum, nem, konum }
 * @param {string} sehir      - Hedef şehir adı
 * @param {number} gunSayisi  - Seyahat süresi (gün)
 * @returns {{ aciklama: string, secilen_kiyafet_idleri: string[], ipucu: string }}
 */
const generateSuitcaseSuggestion = async (userItems, havaDurumu, sehir, gunSayisi) => {

    // 1. DOLAP LİSTESİNİ HAZIRLA 
    const kiyafetListesi = userItems
        .map(k =>
            `ID:${k._id} | KATEGORİ:${k.kategori} | Renk:${k.renk} | Mevsim:${k.mevsim} | Stil:${k.stil}${k.marka ? ' | Marka:' + k.marka : ''}`
        )
        .join('\n');

    const sicaklik  = havaDurumu.sicaklik ?? 18;
    const sogukHava = sicaklik < 10;
    const sicakHava = sicaklik > 25;

    // 2. GÜN SAYISINA GÖRE PAKETLEME KILAVUZU 
    let paketlemeKuralı;
    if (gunSayisi <= 3) {
        paketlemeKuralı = `${gunSayisi} günlük kısa seyahat: 2-${gunSayisi + 1} üst/elbise, 1-2 alt giyim, 1 ayakkabı öner. Valiz yerine kabin bagajına sığacak kadar az parça seç.`;
    } else if (gunSayisi <= 7) {
        paketlemeKuralı = `${gunSayisi} günlük seyahat: 4-5 üst/elbise, 2-3 alt giyim, 1-2 ayakkabı öner. Parçaları birbiriyle kombinleyerek fazla yer kaplamamasına dikkat et.`;
    } else {
        paketlemeKuralı = `${gunSayisi} günlük uzun seyahat: kapsül gardırop mantığıyla 5-6 üst/elbise, 3 alt giyim, 2 ayakkabı öner. Mix-and-match yaratabilecek nötr tonları tercih et.`;
    }

    // 3. PROMPT 
    const prompt = `
Sen bir profesyonel seyahat stili danışmanısın. Kullanıcı ${sehir}'e ${gunSayisi} günlük bir seyahat yapıyor.

════════════════════════════════
SEYAHAT BİLGİLERİ
════════════════════════════════
- Hedef Şehir   : ${sehir}
- Seyahat Süresi : ${gunSayisi} gün
- Tahmini Sıcaklık: ${sicaklik}°C
- Hava Durumu   : ${havaDurumu.durum || 'Bilinmiyor'}
- Nem            : ${havaDurumu.nem ?? '—'}%
${sogukHava ? '- ⚠️  SOĞUK HAVA: Kat kat giyim öner. Dış giyim zorunlu.' : ''}
${sicakHava ? '- ☀️  SICAK HAVA: Hafif ve nefes alan parçalar tercih et. Dış giyim muhtemelen gereksiz.' : ''}

════════════════════════════════
DOLAP İÇERİĞİ (YALNIZCA BURADAN SEÇ)
════════════════════════════════
${kiyafetListesi}

════════════════════════════════
PAKETLEME STRATEJİSİ
════════════════════════════════
${paketlemeKuralı}

MIX-AND-MATCH KURALI: Seçilen her alt giyim en az 2 farklı üst giyimle uyumlu olmalı.
RENK UYUMU: Nötr baz renkler (siyah, beyaz, gri, lacivert, bej) + en fazla 1-2 vurgu rengi.

HAVA KURALLARI:
${sogukHava ? '- Şort, kolsuz üst, ince yazlık YASAK.' : sicakHava ? '- Kaban ve kalın mont gereksiz.' : '- Mevsim geçiş hava: katman eklenebilir hafif parçaları tercih et.'}

ZORUNLU MİNİMUM (en az biri sağlanmalı):
  YAPI A: 1 Üst Giyim + 1 Alt Giyim + 1 Ayakkabı
  YAPI B: 1 Elbise + 1 Ayakkabı

════════════════════════════════
MUTLAK YASAKLAR
════════════════════════════════
1. Listede ID'si OLMAYAN herhangi bir parça seçilemez.
2. Aynı ID iki kez seçilemez.

════════════════════════════════
ÇIKTI FORMATI
════════════════════════════════
YALNIZCA geçerli bir JSON nesnesi döndür. Markdown ve ek metin yasak.
{
  "aciklama": "Bu şehir, bu hava ve bu süre için neden bu parçaları seçtiğini açıklayan 2-3 cümle. (Türkçe, samimi)",
  "secilen_kiyafet_idleri": ["<ID_1>", "<ID_2>", "..."],
  "ipucu": "Seyahat paketleme veya stil için tek cümlelik akıllı tavsiye. (Türkçe)"
}
`.trim();

    // 4. AI ÇAĞRISI 
    const response = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.5,  // Outfit'ten biraz daha yaratıcı ama kural odaklı
        response_format: { type: 'json_object' },
    });

    const text = response.choices[0].message.content.trim();

    // 5. PARSE & ID DOĞRULAMA 
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch {
        const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
        parsed = JSON.parse(clean);
    }

    const gecerliIdler = new Set(userItems.map(k => k._id.toString()));
    parsed.secilen_kiyafet_idleri = (parsed.secilen_kiyafet_idleri || [])
        .filter(id => gecerliIdler.has(id.toString()));

    return parsed;
};

/**
 * Günlük push bildirimi için hava durumu + dolap bazlı kısa metin üretir.
 * @param {Array}  items  - wardrobe items (kategori, renk)
 * @param {Object} hava   - { sicaklik, durum, konum }
 * @param {string} sehir  - city name
 * @param {{cinsiyet?: string, vucutSekli?: string, vucutKalip?: string, stilTonu?: string}} userProfile
 * @returns {string} notification body text
 */
const generateWeatherNotificationText = async (items, hava, sehir, userProfile = {}) => {
    const sicaklik = hava.sicaklik ?? 20;
    const durum    = hava.durum    ?? 'güneşli';

    // Dolaptaki GERÇEK parçaları kategoriye göre grupla ve modele ver —
    // aksi halde model rastgele/uydurma kıyafetlerden bahsediyordu. Renkler
    // hex kod ("#2A415F") olarak saklanıyor; bildirimde okunaklı olsun diye
    // önce insan-okunabilir Türkçe renk adına çeviriyoruz (örn. "lacivert").
    const byCategory = {};
    items.forEach((it) => {
        const kategori = it.kategori || 'Diğer';
        const renkAdi = hexToColorName(it.renk);
        if (!byCategory[kategori]) byCategory[kategori] = new Set();
        if (renkAdi && renkAdi !== 'nötr') byCategory[kategori].add(renkAdi);
    });
    const itemsList = Object.entries(byCategory)
        .map(([kategori, renkler]) => {
            const renkListesi = [...renkler].slice(0, 4).join(', ');
            return renkListesi ? `${kategori} (${renkListesi})` : kategori;
        })
        .join(' | ');

    const { profilBlok, tonTalimati } = buildUserProfileContext(userProfile);

    const response = await groq.chat.completions.create({
        messages: [{
            role: 'user',
            content: `${sehir}'de bugün ${sicaklik}°C ve ${durum}. ` +
                     `Dolabımdaki gerçek parçalar şunlar: ${itemsList}. ` +
                     (profilBlok ? `${profilBlok}\n` : '') +
                     `Bu hava için SADECE yukarıdaki listeden 2-3 gerçek parça seçerek kısa, sıcak ve doğal bir Türkçe ` +
                     `kombin önerisi push bildirimi yaz (tam olarak 1-2 cümle, en fazla ~140 karakter). ` +
                     `Anlatım tonu: ${tonTalimati} ` +
                     `Kurallar: listede olmayan bir kıyafeti asla uydurma; renkleri ve kategori adlarını HİÇBİR ZAMAN ` +
                     `"#" ile başlayan hex kod olarak yazma, sadece verilen Türkçe renk adlarını kullan; ` +
                     `"renkli Üst Giyim" gibi mekanik/tekrarlayan kalıplar kurma — gerçek bir arkadaşın yazdığı gibi ` +
                     `akıcı, günlük bir dille yaz (örnek ton: "Bugün hava ... için lacivert ceketini siyah pantolonunla dene, harika gider!").`
        }],
        model:       'llama-3.3-70b-versatile',
        temperature: 0.8,
        max_tokens:  90,
    });

    return response.choices[0].message.content.trim();
};

module.exports = { analyzeItem, wardrobeOnKontrol, generateOutfitSuggestion, generateSuitcaseSuggestion, generateWeatherNotificationText, buildUserProfileContext };