/**
 * web-outfit-services.test.js
 * "Web Destekli Kombin Önerisi" özelliğinin servis katmanı unit testleri:
 *   - services/styleProfileService.js (hex->renk, mevsim, profil çıkarımı, arama sorgusu)
 *   - services/webProductService.js   (Trendyol arama - puppeteer mock'lanır)
 *   - services/webOutfitService.js    (Groq prompt - groq-sdk mock'lanır)
 *
 * Hiçbir gerçek ağ/tarayıcı çağrısı yapılmaz.
 */

// groq-sdk mock (webOutfitService için)
jest.mock('groq-sdk', () => {
    return jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn().mockResolvedValue({
                    choices: [{ message: { content: JSON.stringify({ aciklama: '', secilen_kiyafet_idleri: [], secilen_web_urun_idleri: [] }) } }]
                })
            }
        }
    }));
});

// puppeteer-extra mock (webProductService için)
const mockPage = {
    setUserAgent: jest.fn().mockResolvedValue(undefined),
    setViewport: jest.fn().mockResolvedValue(undefined),
    setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
    goto: jest.fn(),
    waitForSelector: jest.fn(),
    evaluate: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
};
const mockBrowser = {
    newPage: jest.fn().mockResolvedValue(mockPage),
};
jest.mock('puppeteer-extra', () => ({
    use: jest.fn(),
    launch: jest.fn(() => Promise.resolve(mockBrowser)),
}));
jest.mock('puppeteer-extra-plugin-stealth', () => jest.fn(() => ({})));

// webProductService.searchProducts içindeki page.evaluate(() => {...}) callback'i
// gerçek bir tarayıcıda DOM üzerinde çalışır. Bu mantığı (kart/konteyner tespiti,
// fiyat/isim/görsel çıkarımı) gerçekten çalıştırıp kapsama almak için minimal
// bir sahte DOM ağacı oluşturuyoruz.
class FakeEl {
    constructor(tag, attrs = {}, children = [], text = '') {
        this.tag = tag;
        this.attrs = attrs;
        this.children = children;
        this.text = text;
        this.parentElement = null;
        children.forEach((c) => { c.parentElement = this; });
    }
    getAttribute(name) {
        return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null;
    }
    querySelector(selector) {
        const queue = [...this.children];
        while (queue.length) {
            const el = queue.shift();
            if (selector === 'img') {
                if (el.tag === 'img') return el;
            } else if (/class\*=/.test(selector)) {
                const cls = el.attrs.class || '';
                if (/name|title|desc/.test(cls)) return el;
            }
            queue.push(...el.children);
        }
        return null;
    }
    get textContent() {
        return this.text + this.children.map((c) => c.textContent).join('');
    }
}


const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
    getCurrentSeason,
    hexToColorName,
    getStyleProfile,
    buildSearchQuery,
    ALL_CATEGORIES,
} = require('../services/styleProfileService');

const { searchProducts, guessCategory } = require('../services/webProductService');
const { generateWebOutfitSuggestion } = require('../services/webOutfitService');

const User = require('../models/User');
const Item = require('../models/Item');

let mongoServer;
let groqCreateMock;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const Groq = require('groq-sdk');
    groqCreateMock = Groq.mock.results[0].value.chat.completions.create;
});

afterEach(async () => {
    await User.deleteMany({});
    await Item.deleteMany({});
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
});


// styleProfileService — hexToColorName / hexToHSL
describe('styleProfileService.hexToColorName', () => {
    test('çok koyu renk -> siyah', () => {
        expect(hexToColorName('#050505')).toBe('siyah');
    });

    test('çok açık renk -> beyaz', () => {
        expect(hexToColorName('#fafafa')).toBe('beyaz');
    });

    test('düşük doygunluk -> gri', () => {
        expect(hexToColorName('#888888')).toBe('gri');
    });

    test('kırmızı tonu -> kırmızı', () => {
        expect(hexToColorName('#ff0000')).toBe('kırmızı');
    });

    test('turuncu/kahverengi tonu -> kahverengi', () => {
        expect(hexToColorName('#cc6600')).toBe('kahverengi');
    });

    test('sarı tonu -> sarı', () => {
        expect(hexToColorName('#ffff00')).toBe('sarı');
    });

    test('yeşil tonu -> yeşil', () => {
        expect(hexToColorName('#00ff00')).toBe('yeşil');
    });

    test('turkuaz tonu -> turkuaz', () => {
        expect(hexToColorName('#00cccc')).toBe('turkuaz');
    });

    test('mavi tonu -> mavi', () => {
        expect(hexToColorName('#0000ff')).toBe('mavi');
    });

    test('lacivert tonu -> lacivert', () => {
        expect(hexToColorName('#5500ff')).toBe('lacivert');
    });

    test('pembe/magenta tonu -> pembe', () => {
        expect(hexToColorName('#ff00ff')).toBe('pembe');
    });

    test('3 karakterli hex -> normalize edilip yeşil döner', () => {
        expect(hexToColorName('#0f0')).toBe('yeşil');
    });

    test('geçersiz/boş hex -> nötr', () => {
        expect(hexToColorName('')).toBe('nötr');
        expect(hexToColorName('Bilinmiyor')).toBe('nötr');
        expect(hexToColorName(undefined)).toBe('nötr');
        expect(hexToColorName('#zzzzzz')).toBe('nötr');
    });
});


// styleProfileService — getCurrentSeason
describe('styleProfileService.getCurrentSeason', () => {
    test('Ocak -> Kış', () => {
        expect(getCurrentSeason(new Date(2026, 0, 15))).toBe('Kış');
    });

    test('Nisan -> İlkbahar', () => {
        expect(getCurrentSeason(new Date(2026, 3, 15))).toBe('İlkbahar');
    });

    test('Temmuz -> Yaz', () => {
        expect(getCurrentSeason(new Date(2026, 6, 15))).toBe('Yaz');
    });

    test('Ekim -> Sonbahar', () => {
        expect(getCurrentSeason(new Date(2026, 9, 15))).toBe('Sonbahar');
    });

    test('Parametresiz çağrı -> geçerli bir mevsim döner', () => {
        const result = getCurrentSeason();
        expect(['İlkbahar', 'Yaz', 'Sonbahar', 'Kış']).toContain(result);
    });
});


// styleProfileService — getStyleProfile
describe('styleProfileService.getStyleProfile', () => {
    test('Boş gardırop + tercihleri olan kullanıcı -> "tercihler" kaynaklı profil', async () => {
        const user = await User.create({
            kullaniciAdi: 'StilUser1',
            email: 'stil1@test.com',
            sifre: 'sifre123',
            tercihler: { favoriStil: 'Spor', favoriRenkler: ['#0000ff', '#ff0000', '#888888'] },
        });

        const profile = await getStyleProfile(user._id);

        expect(profile.kaynak).toBe('tercihler');
        expect(profile.gardrobBoyutu).toBe(0);
        expect(profile.dominantStiller).toEqual(['Spor']);
        // gri ('nötr' filtresi) elenir, en fazla 2 renk
        expect(profile.dominantRenkler).toEqual(['mavi', 'kırmızı']);
        expect(profile.eksikKategoriler).toEqual(ALL_CATEGORIES);
    });

    test('Boş gardırop + tercihi olmayan/varsayılan kullanıcı -> varsayılan profil', async () => {
        const user = await User.create({
            kullaniciAdi: 'StilUser2',
            email: 'stil2@test.com',
            sifre: 'sifre123',
        });

        const profile = await getStyleProfile(user._id);

        expect(profile.kaynak).toBe('tercihler');
        expect(profile.dominantStiller).toEqual(['Günlük']);
        expect(profile.dominantRenkler).toEqual(['nötr']);
    });

    test('Boş gardırop + kullanıcı bulunamıyor (user=null) -> user?. zincirleme varsayılanları', async () => {
        // Var olmayan ama geçerli formatlı bir ObjectId — Item.find boş döner,
        // User.findById de null döner -> user?.tercihler?.favoriRenkler / favoriStil
        // optional-chaining + `||` varsayılan dallarını kapsar.
        const yokId = new mongoose.Types.ObjectId();

        const profile = await getStyleProfile(yokId);

        expect(profile.kaynak).toBe('tercihler');
        expect(profile.dominantStiller).toEqual(['Günlük']);
        expect(profile.dominantRenkler).toEqual(['nötr']);
        expect(profile.gardrobBoyutu).toBe(0);
    });

    test('Dolu gardırop ama stilsiz/renk-tanımsız tek parça -> dominant dizi boşsa varsayılanlara düşer', async () => {
        const user = await User.create({
            kullaniciAdi: 'StilUser4',
            email: 'stil4@test.com',
            sifre: 'sifre123',
        });

        // `stil` alanı YOK (zorunlu değil) ve `renk` geçersiz bir hex -> 'nötr'
        await Item.create({
            kullanici: user._id, resimUrl: 'http://x/4.jpg',
            kategori: 'Aksesuar', renk: 'Bilinmiyor', mevsim: 'Yaz',
        });

        const profile = await getStyleProfile(user._id);

        expect(profile.kaynak).toBe('gardrop');
        // stilSayac boş -> dominantStiller boş -> ['Günlük'] varsayılanı
        expect(profile.dominantStiller).toEqual(['Günlük']);
        // renkSayac = { nötr: 1 } -> filtre sonrası boş -> ['nötr'] varsayılanı
        expect(profile.dominantRenkler).toEqual(['nötr']);
    });

    test('Dolu gardırop -> "gardrop" kaynaklı profil, dominant stil/renk ve eksik kategoriler', async () => {
        const user = await User.create({
            kullaniciAdi: 'StilUser3',
            email: 'stil3@test.com',
            sifre: 'sifre123',
        });

        await Item.create([
            { kullanici: user._id, resimUrl: 'http://x/1.jpg', kategori: 'Üst Giyim', renk: '#0000ff', mevsim: 'Kış', stil: 'Günlük' },
            { kullanici: user._id, resimUrl: 'http://x/2.jpg', kategori: 'Üst Giyim', renk: '#0000ff', mevsim: 'Kış', stil: 'Günlük' },
            { kullanici: user._id, resimUrl: 'http://x/3.jpg', kategori: 'Alt Giyim', renk: 'Bilinmiyor', mevsim: 'Kış', stil: 'Spor' },
        ]);

        const profile = await getStyleProfile(user._id);

        expect(profile.kaynak).toBe('gardrop');
        expect(profile.gardrobBoyutu).toBe(3);
        expect(profile.dominantStiller[0]).toBe('Günlük');
        expect(profile.dominantRenkler).toEqual(['mavi']); // 'Bilinmiyor' -> nötr -> filtrelenir
        // Üst Giyim ve Alt Giyim mevcut, kalanlar eksik
        expect(profile.eksikKategoriler).not.toContain('Üst Giyim');
        expect(profile.eksikKategoriler).not.toContain('Alt Giyim');
        expect(profile.eksikKategoriler).toContain('Elbise');
    });
});


// styleProfileService — buildSearchQuery
describe('styleProfileService.buildSearchQuery', () => {
    test('Tüm alanlar dolu -> tüm parçalar sorguya eklenir', () => {
        const profile = {
            dominantRenkler: ['mavi'],
            dominantStiller: ['Spor'],
            guncelMevsim: 'Yaz',
            eksikKategoriler: ['Ayakkabı'],
        };
        const sorgu = buildSearchQuery(profile, { etkinlik: 'Günlük', cinsiyetTerimi: 'erkek' });

        expect(sorgu).toBe('erkek mavi spor yaz ayakkabı');
    });

    test('Renk "nötr" ise sorguya eklenmez', () => {
        const profile = {
            dominantRenkler: ['nötr'],
            dominantStiller: ['Klasik'],
            guncelMevsim: 'Kış',
            eksikKategoriler: [],
        };
        const sorgu = buildSearchQuery(profile, { etkinlik: 'İş' });

        expect(sorgu).not.toContain('nötr');
        expect(sorgu).toContain('klasik');
        expect(sorgu).toContain('kış');
        // 'İş'.toLowerCase() -> 'i' + KOMBİNE NOKTA (U+0307) + 'ş' (yerel olmayan küçültme)
        expect(sorgu).toContain('i̇ş'); // eksikKategoriler boş -> etkinlik kullanılır
    });

    test('Bilinmeyen stil ve "Tüm Mevsimler" -> ilgili terimler atlanır', () => {
        const profile = {
            dominantRenkler: ['yeşil'],
            dominantStiller: ['BilinmeyenStil'],
            guncelMevsim: 'Tüm Mevsimler',
            eksikKategoriler: ['Elbise'],
        };
        const sorgu = buildSearchQuery(profile);

        expect(sorgu).toContain('yeşil');
        expect(sorgu).toContain('elbise');
        expect(sorgu).not.toContain('BilinmeyenStil');
    });

    test('Hiçbir parça üretilemezse varsayılan "günlük kombin" döner', () => {
        const profile = {
            dominantRenkler: ['nötr'],
            dominantStiller: ['BilinmeyenStil'],
            guncelMevsim: 'Tüm Mevsimler',
            eksikKategoriler: [],
        };
        const sorgu = buildSearchQuery(profile);

        expect(sorgu).toBe('günlük kombin');
    });
});


// webProductService — guessCategory
describe('webProductService.guessCategory', () => {
    test.each([
        ['Nike Spor Ayakkabı', 'Ayakkabı'],
        ['Yazlık Elbise', 'Elbise'],
        ['Mini Etek', 'Elbise'],
        ['Şişme Mont', 'Dış Giyim'],
        ['Slim Fit Kot Pantolon', 'Alt Giyim'],
        ['Deri Kemer', 'Aksesuar'],
        ['Basic Tişört', 'Üst Giyim'],
        ['Tamamen Alakasız Ürün Adı', 'Aksesuar'],
        [undefined, 'Aksesuar'],
    ])('"%s" -> %s', (title, expected) => {
        expect(guessCategory(title)).toBe(expected);
    });
});


// webProductService — searchProducts
describe('webProductService.searchProducts', () => {
    test('Başarılı arama -> ürünleri ayrıştırır ve eksik görsel/linki olanları filtreler', async () => {
        mockPage.goto.mockResolvedValueOnce({ status: () => 200 });
        mockPage.waitForSelector.mockResolvedValueOnce(undefined);
        mockPage.evaluate.mockResolvedValueOnce({
            items: [
                { name: 'Mavi Tişört', src: '//cdn.example.com/img1.jpg', href: '/urun/mavi-tisort-p-111', priceText: '199,90 TL' },
                { name: '', src: 'https://cdn.example.com/img2.jpg', href: 'https://www.trendyol.com/urun-p-222', priceText: '1.299 TL' },
                { name: 'Görselsiz Ürün', src: '', href: '', priceText: '' },
            ],
            totalAnchors: 3,
            pageTitle: 'Trendyol Arama',
            bodyLength: 5000,
        });

        const result = await searchProducts('mavi tişört arama', { limit: 5 });

        expect(result).toHaveLength(2);
        expect(result[0].webId).toBe('WEB-0');
        expect(result[0].resimUrl).toBe('https://cdn.example.com/img1.jpg');
        expect(result[0].link).toBe('https://www.trendyol.com/urun/mavi-tisort-p-111');
        expect(result[0].fiyat).toBe(199.9);
        expect(result[0].kategoriTahmini).toBe('Üst Giyim');
        expect(result[0].kaynak).toBe('Trendyol');

        expect(result[1].ad).toBe('Ürün');
        expect(result[1].link).toBe('https://www.trendyol.com/urun-p-222');
        expect(result[1].fiyat).toBe(1299);
    });

    test('Cache: aynı sorgu tekrar çağrılırsa tarayıcı yeniden kullanılmaz', async () => {
        const newPageCallsBefore = mockBrowser.newPage.mock.calls.length;

        const result = await searchProducts('mavi tişört arama', { limit: 5 });

        expect(result).toHaveLength(2);
        expect(mockBrowser.newPage.mock.calls.length).toBe(newPageCallsBefore);
    });

    test('waitForSelector zaman aşımına uğrarsa ve hiç ürün bulunamazsa boş dizi döner', async () => {
        mockPage.goto.mockResolvedValueOnce(null);
        mockPage.waitForSelector.mockRejectedValueOnce(new Error('timeout'));
        mockPage.evaluate.mockResolvedValueOnce({
            items: [],
            totalAnchors: 0,
            pageTitle: 'Boş Sayfa',
            bodyLength: 0,
        });

        const result = await searchProducts('hiç sonuç yok benzersiz sorgu');

        expect(result).toEqual([]);
    });

    test('Tarayıcı sayfası açılamazsa hata yutulup boş dizi döner', async () => {
        mockBrowser.newPage.mockRejectedValueOnce(new Error('newPage failed'));

        const result = await searchProducts('hata veren benzersiz sorgu');

        expect(result).toEqual([]);
    });

    test('page.evaluate içindeki DOM ayrıştırma mantığı: kart tespiti, dedup, regex ve isim/görsel/fiyat çıkarımı', async () => {
        // item1: 'a' linkinin kendisinde img/fiyat yok -> 1 üst konteynerde bulunur
        const img1 = new FakeEl('img', { src: '//cdn.example.com/img1.jpg', alt: 'Mavi Tişört' });
        const price1 = new FakeEl('span', {}, [], 'Fiyat: 199,90 TL');
        const a1 = new FakeEl('a', { href: '/urun/mavi-tisort-p-111' });
        const card1 = new FakeEl('div', { class: 'card' }, [a1, img1, price1]);

        // item2: aynı ürün id'si (111) tekrar -> dedup ile atlanır
        const a2 = new FakeEl('a', { href: '/baska-p-111' });
        const card2 = new FakeEl('div', {}, [a2]);

        // item3: href regex'e uymuyor (-p- sonrası rakam yok) -> atlanır
        const a4 = new FakeEl('a', { href: '/gecersiz-p-abc' });
        const card4 = new FakeEl('div', {}, [a4]);

        // item5: img'de data-src + title kullanılır, container 1 üstte img+fiyat ile bulunur
        const img5 = new FakeEl('img', { 'data-src': '//cdn.example.com/img5.jpg', title: 'Kot Pantolon' });
        const price5 = new FakeEl('span', {}, [], '349,00 TL');
        const a5 = new FakeEl('a', { href: 'https://www.trendyol.com/urun-p-333' });
        const card5 = new FakeEl('div', { class: 'card' }, [a5, img5, price5]);

        // item6: 5 seviye yukarı çıkana kadar img/fiyat bulunamaz -> en üst konteynerdeki
        // [class*="title"] elemanından isim alınır, görsel/fiyat boş kalır
        const a3 = new FakeEl('a', { href: '/derin-p-222' });
        let wrap = new FakeEl('div', {}, [a3]);
        for (let i = 0; i < 5; i++) {
            wrap = new FakeEl('div', {}, [wrap]);
        }
        const nameEl3 = new FakeEl('span', { class: 'product-title' }, [], 'Derin Ürün');
        nameEl3.parentElement = wrap;
        wrap.children.push(nameEl3);

        const body = new FakeEl('body', {}, [card1, card2, wrap, card4, card5]);

        global.document = {
            title: 'Trendyol Arama Sonuçları',
            body: { innerHTML: 'x'.repeat(1234) },
            querySelectorAll: (selector) => {
                if (selector !== 'a[href*="-p-"]') return [];
                const result = [];
                const queue = [...body.children];
                while (queue.length) {
                    const el = queue.shift();
                    if (el.tag === 'a' && (el.attrs.href || '').includes('-p-')) result.push(el);
                    queue.push(...el.children);
                }
                return result;
            },
        };

        try {
            mockPage.goto.mockResolvedValueOnce({ status: () => 200 });
            mockPage.waitForSelector.mockResolvedValueOnce(undefined);
            mockPage.evaluate.mockImplementationOnce((fn) => Promise.resolve(fn()));

            const result = await searchProducts('dom ayrıştırma test sorgusu unique-dom', { limit: 5 });

            // item2 (dedup), item3/item4 (regex/no-image) elenir -> sadece item1 ve item5 kalır
            expect(result).toHaveLength(2);

            expect(result[0].ad).toBe('Mavi Tişört');
            expect(result[0].resimUrl).toBe('https://cdn.example.com/img1.jpg');
            expect(result[0].link).toBe('https://www.trendyol.com/urun/mavi-tisort-p-111');
            expect(result[0].fiyat).toBe(199.9);
            expect(result[0].kategoriTahmini).toBe('Üst Giyim');

            expect(result[1].ad).toBe('Kot Pantolon');
            expect(result[1].resimUrl).toBe('https://cdn.example.com/img5.jpg');
            expect(result[1].link).toBe('https://www.trendyol.com/urun-p-333');
            expect(result[1].fiyat).toBe(349);
            expect(result[1].kategoriTahmini).toBe('Alt Giyim');
        } finally {
            delete global.document;
        }
    });

    test('Cache süresi (TTL) dolduğunda aynı sorgu için tekrar arama yapılır', async () => {
        const query = 'ttl süresi test sorgusu unique-ttl';

        mockPage.goto.mockResolvedValue({ status: () => 200 });
        mockPage.waitForSelector.mockResolvedValue(undefined);
        mockPage.evaluate.mockResolvedValue({
            items: [{ name: 'TTL Ürün', src: '//cdn.example.com/ttl.jpg', href: '/ttl-p-555', priceText: '10 TL' }],
            totalAnchors: 1,
            pageTitle: 'TTL',
            bodyLength: 10,
        });

        const r1 = await searchProducts(query, { limit: 5 });
        expect(r1).toHaveLength(1);

        const callsAfterFirst = mockBrowser.newPage.mock.calls.length;

        // Cache hit -> tarayıcı yeniden kullanılmaz
        const r2 = await searchProducts(query, { limit: 5 });
        expect(r2).toHaveLength(1);
        expect(mockBrowser.newPage.mock.calls.length).toBe(callsAfterFirst);

        // TTL'in (10 dk) dolduğunu simüle et -> cache geçersiz, tekrar aranır
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 11 * 60 * 1000);
        try {
            const r3 = await searchProducts(query, { limit: 5 });
            expect(r3).toHaveLength(1);
            expect(mockBrowser.newPage.mock.calls.length).toBe(callsAfterFirst + 1);
        } finally {
            nowSpy.mockRestore();
        }
    });
});


// webOutfitService — generateWebOutfitSuggestion
describe('webOutfitService.generateWebOutfitSuggestion', () => {
    test('Dolu gardırop + web ürünleri, soğuk hava ve "İş" etkinliği -> geçerli ID\'ler filtrelenir', async () => {
        const userItems = [
            { _id: 'item1', kategori: 'Üst Giyim', renk: 'Mavi', mevsim: 'Kış', stil: 'Günlük' },
            { _id: 'item2', kategori: 'Ayakkabı', renk: 'Siyah', mevsim: 'Kış', stil: 'Günlük' },
        ];
        const webProducts = [
            { webId: 'WEB-0', kategoriTahmini: 'Dış Giyim', ad: 'Mont', fiyat: 999 },
            { webId: 'WEB-1', kategoriTahmini: 'Aksesuar', ad: 'Atkı', fiyat: null },
        ];
        const profile = { dominantStiller: ['Günlük', 'Spor'], dominantRenkler: ['mavi'] };
        const havaDurumu = { sicaklik: 5, durum: 'kar', konum: 'İstanbul' };

        groqCreateMock.mockResolvedValueOnce({
            choices: [{
                message: {
                    content: JSON.stringify({
                        aciklama: 'Soğuk havaya uygun kombin',
                        secilen_kiyafet_idleri: ['item1', 'item2', 'gecersiz-id'],
                        secilen_web_urun_idleri: ['WEB-0', 'WEB-1', 'WEB-GECERSIZ'],
                        ipucu: 'Atkını unutma',
                    }),
                },
            }],
        });

        const result = await generateWebOutfitSuggestion(userItems, webProducts, profile, havaDurumu, 'İş');

        expect(result.aciklama).toBe('Soğuk havaya uygun kombin');
        expect(result.secilen_kiyafet_idleri).toEqual(['item1', 'item2']);
        expect(result.secilen_web_urun_idleri).toEqual(['WEB-0', 'WEB-1']);
    });

    test('Boş gardırop + boş web sonuçları + profil yok -> varsayılanlarla çalışır', async () => {
        groqCreateMock.mockResolvedValueOnce({
            choices: [{
                message: {
                    content: JSON.stringify({
                        aciklama: 'Boş kombin',
                        secilen_kiyafet_idleri: [],
                        secilen_web_urun_idleri: [],
                    }),
                },
            }],
        });

        const result = await generateWebOutfitSuggestion([], [], null, {}, undefined);

        expect(result.aciklama).toBe('Boş kombin');
        expect(result.secilen_kiyafet_idleri).toEqual([]);
        expect(result.secilen_web_urun_idleri).toEqual([]);
    });

    test('Sıcak hava + markdown sarmalı JSON + eksik seçim alanları -> parse edilip boş dizilere düşer', async () => {
        groqCreateMock.mockResolvedValueOnce({
            choices: [{
                message: {
                    content: '```json\n' + JSON.stringify({ aciklama: 'Sıcak kombin', ipucu: 'Hafif giyin' }) + '\n```',
                },
            }],
        });

        const result = await generateWebOutfitSuggestion([], [], {}, { sicaklik: 30 }, 'Günlük');

        expect(result.aciklama).toBe('Sıcak kombin');
        expect(result.secilen_kiyafet_idleri).toEqual([]);
        expect(result.secilen_web_urun_idleri).toEqual([]);
    });

    test('2\'den fazla geçerli web ürünü seçilirse en fazla 2 ile sınırlandırılır', async () => {
        const webProducts = [
            { webId: 'WEB-0', kategoriTahmini: 'Üst Giyim', ad: 'A', fiyat: 1 },
            { webId: 'WEB-1', kategoriTahmini: 'Alt Giyim', ad: 'B', fiyat: 2 },
            { webId: 'WEB-2', kategoriTahmini: 'Ayakkabı', ad: 'C', fiyat: 3 },
        ];

        groqCreateMock.mockResolvedValueOnce({
            choices: [{
                message: {
                    content: JSON.stringify({
                        aciklama: 'Çoklu seçim',
                        secilen_kiyafet_idleri: [],
                        secilen_web_urun_idleri: ['WEB-0', 'WEB-1', 'WEB-2'],
                    }),
                },
            }],
        });

        const result = await generateWebOutfitSuggestion([], webProducts, {}, { sicaklik: 18 }, 'Günlük');

        expect(result.secilen_web_urun_idleri).toHaveLength(2);
        expect(result.secilen_web_urun_idleri).toEqual(['WEB-0', 'WEB-1']);
    });
});
