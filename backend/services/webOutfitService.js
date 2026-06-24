const { buildUserProfileContext, groq } = require('./aiService');

/**
 * Groq / Llama 3.3 ile kullanıcının GARDIROBU + WEB'DEN BULUNAN ÜRÜNLER arasından
 * anatomik kurallara uygun bir kombin önerir. aiService.generateOutfitSuggestion
 * ile aynı "Yapı A / Yapı B" kurallarını kullanır; farkı, kombinin en fazla 2
 * parçasının web'den (gardırop dışından) seçilebilmesidir.
 *
 * @param {Array}  userItems   - Item documents from MongoDB (gardırop)
 * @param {Array}  webProducts - webProductService.searchProducts() çıktısı
 * @param {Object} profile     - styleProfileService.getStyleProfile() çıktısı
 * @param {Object} havaDurumu  - { sicaklik, durum, konum }
 * @param {string} etkinlik    - activity type
 * @returns {{
 *   aciklama: string,
 *   secilen_kiyafet_idleri: string[],
 *   secilen_web_urun_idleri: string[],
 *   ipucu: string
 * }}
 */
const generateWebOutfitSuggestion = async (userItems, webProducts, profile, havaDurumu, etkinlik = 'Günlük', userProfile = {}) => {

    // 1. LİSTELERİ HAZIRLA
    const kiyafetListesi = userItems.length
        ? userItems
            .map((k) => `ID:${k._id} | KATEGORİ:${k.kategori} | Renk:${k.renk} | Mevsim:${k.mevsim} | Stil:${k.stil}`)
            .join('\n')
        : '(Gardırop boş)';

    const webListesi = webProducts.length
        ? webProducts
            .map((p) => `WEBID:${p.webId} | TAHMİNİ_KATEGORİ:${p.kategoriTahmini} | Ad:${p.ad} | Fiyat:${p.fiyat ?? 'bilinmiyor'}`)
            .join('\n')
        : '(Web sonucu bulunamadı)';

    const sicaklik  = havaDurumu.sicaklik ?? 20;
    const sogukHava = sicaklik < 10;
    const sıcakHava = sicaklik > 25;

    const stilOzeti = (profile?.dominantStiller || []).join(', ') || 'Günlük';
    const renkOzeti = (profile?.dominantRenkler || []).join(', ') || 'belirsiz';

    const { profilBlok, tonTalimati } = buildUserProfileContext(userProfile);

    // 2. PROMPT
    const prompt = `
Sen bir profesyonel moda danışmanısın. Kullanıcının GARDIROBU ve WEB'DE BULUNAN ÜRÜNLER listelerinden, tam anlamıyla giyilebilir, gerçek hayata uygun bir kombin oluştur.

════════════════════════════════
KULLANICI STİL PROFİLİ
════════════════════════════════
- Sık kullanılan stiller : ${stilOzeti}
- Sık kullanılan renkler : ${renkOzeti}

════════════════════════════════
KOŞULLAR
════════════════════════════════
- Hava Durumu : ${havaDurumu.durum || 'Bilinmiyor'}, ${sicaklik}°C
- Konum       : ${havaDurumu.konum || 'Türkiye'}
- Etkinlik    : ${etkinlik}
${profilBlok}
════════════════════════════════
GARDIROP (kullanıcının kendi parçaları)
════════════════════════════════
${kiyafetListesi}

════════════════════════════════
WEB'DEN BULUNAN ÜRÜNLER (mağaza önerileri)
════════════════════════════════
${webListesi}

════════════════════════════════
ANATOMİK YAPI KURALLARI — MUTLAK ZORUNLU
════════════════════════════════
Kombin, aşağıdaki iki yapıdan BİRİNE TAMAMEN UYMAK ZORUNDADIR. Her parça GARDIROP'tan veya WEB'DEN BULUNAN ÜRÜNLER'den seçilebilir:

  YAPI A:  TAM OLARAK 1 adet "Üst Giyim"
          + TAM OLARAK 1 adet "Alt Giyim"
          + TAM OLARAK 1 adet "Ayakkabı"

  YAPI B:  TAM OLARAK 1 adet "Elbise"
          + TAM OLARAK 1 adet "Ayakkabı"

İKİ YAPI İÇİN DE ORTAK OPSIYONEL EKLER:
  - İSTEĞE BAĞLI: En fazla 1 adet "Dış Giyim"${sogukHava ? ' (hava soğuk olduğu için önerilir)' : sıcakHava ? ' (hava sıcak, gereksizse ekleme)' : ''}
  - İSTEĞE BAĞLI: En fazla 1 adet "Aksesuar"

════════════════════════════════
WEB ÜRÜNÜ KULLANIM KURALI — ZORUNLU
════════════════════════════════
- Bu özelliğin amacı kullanıcıya gardırobunun DIŞINDA, web'den GERÇEK ürün önerileri sunmaktır.
- WEB'DEN BULUNAN ÜRÜNLER listesi "(Web sonucu bulunamadı)" DEĞİLSE, kombinde EN AZ 1,
  EN FAZLA 2 parça MUTLAKA WEB'DEN seçilmelidir. "secilen_web_urun_idleri" boş kalmamalıdır.
- Web'den seçilecek parça(lar) için şu önceliği izle:
  1) Önce, gardırobunda hiç bulunmayan veya zayıf olan bir kategoriyi (örn. Yapı A/B'nin
     opsiyonel "Dış Giyim" veya "Aksesuar" yuvası, ya da ana yuvalardan biri) web'den tamamla.
  2) Gardırop zaten tam bir Yapı A/B oluşturuyorsa, ana yapıdaki parçalardan birini (örn.
     Üst Giyim veya Ayakkabı) kullanıcının stiline/renklerine en uygun web ürünüyle DEĞİŞTİR
     — yani o kategoride gardıroptaki parçayı seçme, yerine web ürününü seç.
- Web'den seçtiğin her parçanın TAHMİNİ_KATEGORİ'si, yerleştirildiği Yapı A/B yuvasıyla
  uyumlu olmalıdır (örn. "Ayakkabı" yuvasına TAHMİNİ_KATEGORİ="Ayakkabı" olan bir ürün seç).
- "TAHMİNİ_KATEGORİ" alanı kesin değildir; ürün adına bakarak makul bir değerlendirme yap.
- WEB'DEN BULUNAN ÜRÜNLER listesi "(Web sonucu bulunamadı)" İSE, web ürünü seçme; sadece
  gardıroptan kombin oluştur ve "secilen_web_urun_idleri"ni boş bırak.

════════════════════════════════
MUTLAK YASAK KURALLAR
════════════════════════════════
1. AYNI KATEGORİDEN 2 PARÇA ASLA SEÇİLEMEZ (2 üst, 2 ayakkabı, 2 elbise vb. kesinlikle yasak) — gardırop+web toplamında geçerlidir.
2. Listelerde ID'si/WEBID'si OLMAYAN herhangi bir parça seçilemez.
3. "Üst Giyim" + "Elbise" kombinasyonu yasak (ikisi birden seçilemez).
${sogukHava ? '4. Hava 10°C altında: şort, kolsuz üst, ince yazlık KESİNLİKLE seçilmez.\n' : ''}${etkinlik === 'İş' ? '4. İş etkinliği: spor kıyafet ve aşırı rahat parçalar seçilmez.\n' : ''}
════════════════════════════════
ANLATIM TONU — "aciklama" VE "ipucu" İÇİN ZORUNLU
════════════════════════════════
${tonTalimati}

════════════════════════════════
ÇIKTI FORMATI
════════════════════════════════
Yanıtını YALNIZCA geçerli bir JSON nesnesi olarak ver. Markdown, açıklama, ön/son metin YASAK.
{
  "aciklama": "Seçilen kombinin neden bu hava, etkinlik, kullanıcı stiline${profilBlok ? ' ve vücut profiline' : ''} uygun olduğunu anlatan 2-3 cümle. Web'den bir parça seçtiysen nedenini belirt (Türkçe; yukarıdaki ANLATIM TONU'na uy)",
  "secilen_kiyafet_idleri": ["<ID_gardrop>"],
  "secilen_web_urun_idleri": ["<WEBID>"],
  "ipucu": "Tek cümlelik ek stil tavsiyesi (Türkçe; ANLATIM TONU'na uy)"
}
`.trim();

    // 3. AI ÇAĞRISI 
    const response = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.4,
        response_format: { type: 'json_object' },
    });

    const text = response.choices[0].message.content.trim();

    // 4. PARSE & SONUÇ DOĞRULAMA 
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch {
        const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
        parsed = JSON.parse(clean);
    }

    const gecerliKiyafetIdleri = new Set(userItems.map((k) => k._id.toString()));
    const gecerliWebIdleri = new Set(webProducts.map((p) => p.webId));

    parsed.secilen_kiyafet_idleri = (parsed.secilen_kiyafet_idleri || [])
        .filter((id) => gecerliKiyafetIdleri.has(id?.toString()));

    parsed.secilen_web_urun_idleri = (parsed.secilen_web_urun_idleri || [])
        .filter((id) => gecerliWebIdleri.has(id))
        // Güvenlik için web ürün sayısını da burada sınırlandır
        .slice(0, 2);

    return parsed;
};

module.exports = { generateWebOutfitSuggestion };
