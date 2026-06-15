const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteerExtra.use(StealthPlugin());

// Kategori tahmini
// Web'den gelen ürünlerin başlığından Item.kategori enum'una en yakın tahmini
// kategoriyi bulmaya çalışır. Bu kesin bir sınıflandırma DEĞİLDİR — AI prompt'una
// "tahmini" olarak işaretlenip gönderilir, nihai kararı Groq verir.
// Sıra önemlidir: daha spesifik anahtar kelimeler önce kontrol edilir.
const CATEGORY_KEYWORDS = [
    { kategori: 'Ayakkabı',      kelimeler: ['ayakkabı', 'bot', 'sneaker', 'spor ayakkabı', 'çizme', 'terlik', 'sandalet', 'topuklu', 'babet', 'loafer'] },
    { kategori: 'Elbise',        kelimeler: ['elbise', 'etek', 'tulum', 'jumpsuit'] },
    { kategori: 'Dış Giyim',     kelimeler: ['mont', 'kaban', 'parka', 'trençkot', 'trenchcoat', 'yelek', 'ceket', 'kürk', 'puffer'] },
    { kategori: 'Alt Giyim',     kelimeler: ['pantolon', 'jean', 'kot', 'şort', 'tayt', 'eşofman altı', 'jogger'] },
    { kategori: 'Aksesuar',      kelimeler: ['çanta', 'kemer', 'şapka', 'atkı', 'gözlük', 'eldiven', 'kolye', 'küpe', 'saat', 'bere', 'fular', 'bileklik', 'cüzdan'] },
    { kategori: 'Üst Giyim',     kelimeler: ['tişört', 't-shirt', 'tshirt', 'gömlek', 'bluz', 'kazak', 'sweatshirt', 'hoodie', 'atlet', 'body', 'crop', 'triko', 'süveter'] },
];

/**
 * Ürün başlığından Item.kategori enum'una en yakın tahmini kategoriyi döner.
 * Eşleşme bulunamazsa 'Aksesuar' döner (en az kısıtlayıcı/en güvenli varsayım).
 * @param {string} title
 * @returns {string}
 */
const guessCategory = (title = '') => {
    const lower = title.toLocaleLowerCase('tr-TR');
    for (const { kategori, kelimeler } of CATEGORY_KEYWORDS) {
        if (kelimeler.some((k) => lower.includes(k))) return kategori;
    }
    return 'Aksesuar';
};

// Basit bellek-içi cache
// Aynı sorgu kısa süre içinde tekrar gelirse (örn. kullanıcı "yeniden öner"e
// basarsa) harici servise gereksiz istek atmamak için.
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 dakika
const cache = new Map();

const getFromCache = (key) => {
    const hit = cache.get(key);
    if (!hit) return null;
    if (hit.expiresAt < Date.now()) {
        cache.delete(key);
        return null;
    }
    return hit.data;
};

const setCache = (key, data) => {
    cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
};

const SEARCH_PAGE_URL = 'https://www.trendyol.com/sr';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Paylaşılan tarayıcı örneği
// Her arama için yeni bir Chromium başlatmak yavaş olduğundan, tarayıcı bir kez
// başlatılıp sonraki istekler için yeniden kullanılır (her sekme için yeni bir
// page açılır/kapanır).
let browserPromise = null;

const getBrowser = () => {
    if (!browserPromise) {
        browserPromise = puppeteerExtra
            .launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                ],
            })
            .catch((err) => {
                browserPromise = null;
                throw err;
            });
    }
    return browserPromise;
};

// Süreç sonlanırken Chromium'u temiz şekilde kapat (özellikle nodemon yeniden
// başlatmalarında "hayalet" tarayıcı süreçlerinin birikmesini önler).
/* istanbul ignore next -- süreç sonlanma (SIGINT/SIGTERM/SIGUSR2) temizlik
   mantığı; test ortamında tetiklenmesi process'i sonlandıracağı için
   güvenle birim test edilemez */
const closeBrowser = async () => {
    if (!browserPromise) return;
    try {
        const browser = await browserPromise;
        await browser.close();
    } catch {
        // yoksay
    } finally {
        browserPromise = null;
    }
};
/* istanbul ignore next -- yukarıdaki closeBrowser ile aynı sebepten test edilemez */
['SIGINT', 'SIGTERM', 'SIGUSR2'].forEach((signal) => {
    process.once(signal, () => {
        closeBrowser().finally(() => process.kill(process.pid, signal));
    });
});

/**
 * Bir fiyat metnini ("1.234,56 TL" gibi) sayıya çevirir.
 * @param {string} text
 * @returns {number|null}
 */
const parsePriceText = (text = '') => {
    const cleaned = text.replace(/[^\d.,]/g, '');
    if (!cleaned) return null;
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    return Number.isFinite(num) ? num : null;
};

/**
 * Verilen sorgu metnine göre web'den (Trendyol arama sonuçları) ürün listesi
 * çeker. Trendyol arama sayfası bot tespiti (Akamai) yaptığından, sade HTTP
 * istekleri 403 ile reddedilir — bu nedenle gerçek bir tarayıcı (headless
 * Chromium + stealth eklentisi) ile sayfa açılıp DOM'dan ürün kartları okunur.
 * Herhangi bir API anahtarı gerektirmez. Servis yanıt vermezse veya yapı
 * değişmişse hata fırlatmaz, boş dizi döner — böylece kombin üretimi yine de
 * gardıroptaki parçalarla devam edebilir.
 *
 * @param {string} query - Türkçe arama metni (örn. "lacivert günlük yaz ayakkabı")
 * @param {{ limit?: number }} [opts]
 * @returns {Promise<Array<{
 *   webId: string, ad: string, resimUrl: string, link: string,
 *   fiyat: number|null, kaynak: string, kategoriTahmini: string
 * }>>}
 */
const searchProducts = async (query, opts = {}) => {
    const limit = opts.limit ?? 12;
    const cacheKey = `${query.trim().toLocaleLowerCase('tr-TR')}::${limit}`;

    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    let page;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
        await page.setUserAgent(USER_AGENT);
        await page.setViewport({ width: 1366, height: 900 });
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'tr-TR,tr;q=0.9' });

        const url = `${SEARCH_PAGE_URL}?q=${encodeURIComponent(query)}`;
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });

        console.log(
            `webProductService.searchProducts: "${query}" -> status=${response ? response.status() : 'yok'}`
        );

        // Trendyol ürün detay sayfalarının URL'leri her zaman "...-p-<sayısalId>"
        // ile biter (örn. /marka/urun-adi-p-123456789). CSS sınıf adları sık
        // değiştiği için ürün kartlarını bu URL deseninden tespit etmek, sınıf
        // adına dayanmaktan çok daha güvenilirdir.
        await page.waitForSelector('a[href*="-p-"]', { timeout: 10000 }).catch(() => {
            console.warn(`webProductService.searchProducts: "${query}" için ürün linki bekleme süresinde bulunamadı (selector timeout).`);
        });

        const raw = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a[href*="-p-"]'));
            const seen = new Set();
            const items = [];

            for (const a of anchors) {
                const href = a.getAttribute('href') || '';
                const m = href.match(/-p-(\d+)/);
                if (!m) continue;
                const pid = m[1];
                if (seen.has(pid)) continue;
                seen.add(pid);

                // En yakın "kart" konteynerini bul: hem görsel hem fiyat metni içeren ilk üst öğe
                let container = a;
                for (let i = 0; i < 5 && container.parentElement; i++) {
                    const hasImg = container.querySelector('img');
                    const hasPrice = /(TL|₺)/.test(container.textContent || '');
                    if (hasImg && hasPrice) break;
                    container = container.parentElement;
                }

                const img = container.querySelector('img');
                const text = container.textContent || '';
                const priceMatch = text.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*(TL|₺)/);
                const nameEl = container.querySelector('[class*="name"], [class*="title"], [class*="desc"]');

                items.push({
                    name: (img && (img.getAttribute('alt') || img.getAttribute('title'))) || (nameEl && nameEl.textContent) || '',
                    src: (img && (img.getAttribute('src') || img.getAttribute('data-src'))) || '',
                    href,
                    priceText: priceMatch ? priceMatch[0] : '',
                });
            }

            return {
                items: items.slice(0, 24),
                totalAnchors: anchors.length,
                pageTitle: document.title,
                bodyLength: document.body ? document.body.innerHTML.length : 0,
            };
        });

        console.log(
            `webProductService.searchProducts: "${query}" -> sayfa başlığı="${raw.pageTitle}", ` +
            `bodyLength=${raw.bodyLength}, ürün linki=${raw.totalAnchors}, ${raw.items.length} ürün ayrıştırıldı`
        );

        const products = raw.items
            .map((it) => ({ ...it, name: (it.name || '').trim() }))
            .filter((it) => it.name || it.src)
            .slice(0, limit)
            .map((it, idx) => {
                const resimUrl = it.src.startsWith('http') ? it.src : (it.src ? `https:${it.src}` : '');
                const link = it.href.startsWith('http')
                    ? it.href
                    : (it.href ? `https://www.trendyol.com${it.href.startsWith('/') ? '' : '/'}${it.href}` : '');

                return {
                    webId: `WEB-${idx}`,
                    ad: it.name || 'Ürün',
                    resimUrl,
                    link,
                    fiyat: parsePriceText(it.priceText),
                    kaynak: 'Trendyol',
                    kategoriTahmini: guessCategory(it.name),
                };
            })
            // Görseli veya linki olmayan ürünler kombin/öneri için kullanışsız
            .filter((p) => p.resimUrl && p.link);

        if (!products.length) {
            console.warn(`webProductService.searchProducts: "${query}" -> 0 kullanılabilir ürün (ham kart sayısı: ${raw.items.length}).`);
        }

        setCache(cacheKey, products);
        return products;
    } catch (error) {
        console.error(`webProductService.searchProducts hata: "${query}" ->`, error.message);
        return [];
    } finally {
        if (page) await page.close().catch(() => {});
    }
};

module.exports = { searchProducts, guessCategory };
