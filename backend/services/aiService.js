const axios = require('axios');
const FormData = require('form-data');
const { GoogleGenAI } = require('@google/genai');

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// FastAPI category slug → MongoDB Item.kategori enum value
const CATEGORY_MAP = {
    ust_giyim: 'Üst Giyim',
    alt_giyim: 'Alt Giyim',
    elbise: 'Elbise & Etek',
    dis_giyim: 'Dış Giyim',
    ayakkabi: 'Ayakkabı',
    aksesuar: 'Aksesuar',
};

/**
 * Sends an image buffer to the FastAPI AI engine and returns
 * the dominant color (HEX) and mapped category.
 * @param {Buffer} fileBuffer
 * @param {string} originalname  - original filename with extension
 * @returns {{ kategori: string, renk: string, aiDogrulandi: boolean }}
 */
const analyzeItem = async (fileBuffer, originalname) => {
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
    const kategori = CATEGORY_MAP[raw.category] || 'Diğer';

    return {
        kategori,
        renk: raw.dominant_color,   // e.g. "#2D405C"
        aiDogrulandi: true,
    };
};

/**
 * Asks Gemini to act as a stylist and build a complete outfit
 * from the user's wardrobe for the given weather conditions.
 * @param {Array}  userItems   - Item documents from MongoDB
 * @param {Object} havaDurumu  - { sicaklik, durum, konum }
 * @param {string} etkinlik    - activity type
 * @returns {{ aciklama: string, secilen_kiyafet_idleri: string[], ipucu: string }}
 */
const generateOutfitSuggestion = async (userItems, havaDurumu, etkinlik = 'Günlük') => {
    const kiyafetListesi = userItems
        .map(k => `ID:${k._id} | ${k.kategori} | Renk:${k.renk} | ${k.mevsim} | Stil:${k.stil}`)
        .join('\n');

    const prompt = `
Sen kişisel bir moda danışmanısın. Aşağıdaki dolap içeriğini ve koşulları dikkate alarak bir kombin öner.

KOŞULLAR:
- Hava: ${havaDurumu.durum || 'Bilinmiyor'}, ${havaDurumu.sicaklik ?? '?'}°C, Konum: ${havaDurumu.konum || 'Türkiye'}
- Etkinlik: ${etkinlik}

DOLAP İÇERİĞİ (sadece bu listeden seç):
${kiyafetListesi}

Yanıtını YALNIZCA aşağıdaki JSON formatında ver, başka hiçbir metin ekleme:
{
  "aciklama": "Kombinin neden bu koşullara uygun olduğunu anlatan 2-3 cümle (Türkçe, samimi)",
  "secilen_kiyafet_idleri": ["id1", "id2"],
  "ipucu": "Tek cümlelik ek stil tavsiyesi"
}

KURALLAR:
- Soğuk hava (10°C altı) için şort veya ince giysi önerme.
- Resmi etkinlikte spor kıyafet önerme.
- Listede olmayan kıyafeti ASLA seçme.
- En az 2, en fazla 4 parça seç.
`;

    const response = await genai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
    });

    let text = response.text.trim();
    // Strip optional markdown fences Gemini sometimes adds
    text = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();

    return JSON.parse(text);
};

module.exports = { analyzeItem, generateOutfitSuggestion };
