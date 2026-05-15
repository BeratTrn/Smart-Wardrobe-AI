const axios = require('axios');
const FormData = require('form-data');
const Groq = require('groq-sdk'); // Google'ı sildik, Groq'u ekledik!

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

// Yeni Yapay Zeka Motorumuz: Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// FastAPI category slug → MongoDB Item.kategori enum value (strict 6-category system)
const CATEGORY_MAP = {
    ust_giyim:   'Üst Giyim',
    alt_giyim:   'Alt Giyim',
    elbise:      'Elbise & Etek',
    etek:        'Elbise & Etek',
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

// ── Kategori sabitleri ────────────────────────────────────────────────────────
const KAT = {
    UST:     'Üst Giyim',
    ALT:     'Alt Giyim',
    ELBISE:  'Elbise & Etek',
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
 *   B) En az 1 Elbise & Etek + 1 Ayakkabı
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
const generateOutfitSuggestion = async (userItems, havaDurumu, etkinlik = 'Günlük') => {

    // ── 1. ÖN KONTROL ────────────────────────────────────────────────────────
    const kontrol = wardrobeOnKontrol(userItems);
    if (!kontrol.gecerli) {
        const err = new Error(kontrol.mesaj);
        err.statusCode = 400; // controller'da 400 olarak dönebilsin
        throw err;
    }

    // ── 2. DOLAP LİSTESİNİ HAZIRLA ───────────────────────────────────────────
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

    // ── 3. PROMPT ─────────────────────────────────────────────────────────────
    const prompt = `
Sen bir profesyonel moda danışmanısın. Aşağıdaki DOLAP İÇERİĞİ listesinden tam anlamıyla giyilebilir, gerçek hayata uygun bir kombin oluştur.

════════════════════════════════
KOŞULLAR
════════════════════════════════
- Hava Durumu : ${havaDurumu.durum || 'Bilinmiyor'}, ${sicaklik}°C
- Konum       : ${havaDurumu.konum || 'Türkiye'}
- Etkinlik    : ${etkinlik}

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

  YAPI B:  TAM OLARAK 1 adet "Elbise & Etek"
          + TAM OLARAK 1 adet "Ayakkabı"

İKİ YAPI İÇİN DE ORTAK OPSIYONEL EKLER:
  - İSTEĞE BAĞLI: En fazla 1 adet "Dış Giyim"${sogukHava ? ' (hava soğuk olduğu için önerilir)' : sıcakHava ? ' (hava sıcak, gereksizse ekleme)' : ''}
  - İSTEĞE BAĞLI: En fazla 1 adet "Aksesuar"

════════════════════════════════
MUTLAK YASAK KURALLAR
════════════════════════════════
1. AYNI KATEGORİDEN 2 PARÇA ASLA SEÇİLEMEZ (2 üst, 2 ayakkabı, 2 elbise vb. kesinlikle yasak).
2. Listede ID'si OLMAYAN herhangi bir parça seçilemez.
3. "Üst Giyim" + "Elbise & Etek" kombinasyonu yasak (ikisi birden seçilemez).
${sogukHava ? '4. Hava 10°C altında: şort, kolsuz üst, ince yazlık KESİNLİKLE seçilmez.\n' : ''}${etkinlik === 'İş' ? '4. İş etkinliği: spor kıyafet (Spor Giyim) ve aşırı rahat parçalar seçilmez.\n' : ''}
════════════════════════════════
ÇIKTI FORMATI
════════════════════════════════
Yanıtını YALNIZCA geçerli bir JSON nesnesi olarak ver. Markdown, açıklama, ön/son metin YASAK.
{
  "aciklama": "Seçilen kombininin neden bu hava ve etkinliğe uygun olduğunu anlatan 2-3 cümle (Türkçe, samimi ve yardımsever bir dil)",
  "secilen_kiyafet_idleri": ["<ID_1>", "<ID_2>", "<ID_3>"],
  "ipucu": "Tek cümlelik ek stil tavsiyesi (Türkçe)"
}
`.trim();

    // ── 4. AI ÇAĞRISI ─────────────────────────────────────────────────────────
    const response = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.4, // Yaratıcılık < tutarlılık: kurallara uymak için düşük tutuyoruz
        response_format: { type: 'json_object' }, // Groq'un native JSON modu
    });

    const text = response.choices[0].message.content.trim();

    // ── 5. PARSE & SONUÇ DOĞRULAMA ────────────────────────────────────────────
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

module.exports = { analyzeItem, generateOutfitSuggestion };