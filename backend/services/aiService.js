const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

/**
 * Kıyafet fotoğrafını AI ile analiz eder
 * @param {Buffer} imageBuffer - Resim buffer'ı
 * @param {string} mimeType - Resim MIME tipi
 * @returns {Object} - { kategori, renk, mevsim, stil, guven }
 */
const kiyafetAnaliz = async (imageBuffer, mimeType) => {
    const base64Image = imageBuffer.toString('base64');

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: `Bu kıyafeti analiz et ve SADECE aşağıdaki JSON formatında yanıt ver, başka hiçbir şey yazma:
{
  "kategori": "Üst Giyim|Alt Giyim|Elbise & Etek|Dış Giyim|Ayakkabı|Aksesuar|Spor Giyim|Diğer",
  "renk": "Ana renk adı (Türkçe)",
  "mevsim": "İlkbahar|Yaz|Sonbahar|Kış|Tüm Mevsimler",
  "stil": "Casual|Formal|Spor|Elegant|Bohemian|Streetwear|Diğer",
  "guven": 0.0-1.0 arası güven skoru
}`
                    },
                    {
                        type: 'image_url',
                        image_url: { url: `data:${mimeType};base64,${base64Image}` }
                    }
                ]
            }
        ],
        max_tokens: 300,
        temperature: 0.1  // Tutarlı sonuçlar için düşük temperature
    });

    let aiMetin = response.choices[0].message.content;
    // Markdown kod bloklarını temizle
    aiMetin = aiMetin.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const aiData = JSON.parse(aiMetin);

    // Güvenli enum değerleri kontrolü
    const gecerliKategoriler = ['Üst Giyim', 'Alt Giyim', 'Elbise & Etek', 'Dış Giyim', 'Ayakkabı', 'Aksesuar', 'Spor Giyim', 'Diğer'];
    const gecerliMevsimler = ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış', 'Tüm Mevsimler'];
    const gecerliStiller = ['Casual', 'Formal', 'Spor', 'Elegant', 'Bohemian', 'Streetwear', 'Diğer'];

    return {
        kategori: gecerliKategoriler.includes(aiData.kategori) ? aiData.kategori : 'Diğer',
        renk: aiData.renk || 'Bilinmiyor',
        mevsim: gecerliMevsimler.includes(aiData.mevsim) ? aiData.mevsim : 'Tüm Mevsimler',
        stil: gecerliStiller.includes(aiData.stil) ? aiData.stil : 'Casual',
        guven: parseFloat(aiData.guven) || 0.8,
        aiDogrulandi: true
    };
};

/**
 * Dolap içeriği + hava durumu bilgisine göre kombin önerisi üretir
 * @param {Array}  kiyafetler  - Kullanıcının dolabındaki kıyafetler
 * @param {Object} havaDurumu  - { sicaklik, durum, konum }
 * @param {string} etkinlik    - Gidilecek etkinlik türü
 * @returns {Object} - { aciklama, onerilen_ids, kategori_secimi }
 */
const kombinOner = async (kiyafetler, havaDurumu, etkinlik) => {
    if (!kiyafetler || kiyafetler.length === 0) {
        throw new Error('Kombin önerisi için önce dolabınıza kıyafet eklemelisiniz.');
    }

    // Kıyafet listesini prompt için formatla
    const kiyafetListesi = kiyafetler.map(k =>
        `ID:${k._id} | ${k.kategori} | ${k.renk} | ${k.mevsim} | Stil: ${k.stil || 'Casual'}`
    ).join('\n');

    const prompt = `
Sen bir profesyonel moda danışmanısın. Kullanıcının gardırobundaki kıyafetlere ve koşullarına göre en uygun kombini öner.

MEVCUT KOŞULLAR:
- Hava Durumu: ${havaDurumu.durum || 'Bilinmiyor'}, ${havaDurumu.sicaklik}°C, Konum: ${havaDurumu.konum || 'Türkiye'}
- Etkinlik: ${etkinlik}

KULLANICININ DOLABINDAKİ KIYAFETLERİ (sadece bu listeden seç):
${kiyafetListesi}

GÖREV: Hava durumuna ve etkinliğe uygun bir kombin oluştur. SADECE aşağıdaki JSON formatında yanıt ver:
{
  "aciklama": "Kombinin neden uygun olduğunu açıklayan 2-3 cümle (Türkçe, samimi ve yardımsever bir dil)",
  "secilen_kiyafet_idleri": ["id1", "id2", "id3"],
  "ipucu": "Ek bir stil tavsiyesi"
}

ÖNEMLİ KURALLAR:
- Yağmurlu/soğuk havada (10°C altı) şort veya ince giysi önerme
- Resmi etkinlikte spor kıyafet önerme
- Sadece listede olan kıyafetlerden seç
- En az 2, en fazla 4 parça seç
`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.7
    });

    let aiMetin = response.choices[0].message.content;
    aiMetin = aiMetin.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    return JSON.parse(aiMetin);
};

module.exports = { kiyafetAnaliz, kombinOner };
