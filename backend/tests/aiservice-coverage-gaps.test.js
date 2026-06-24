/**
 * aiservice-coverage-gaps.test.js
 *
 * services/aiService.js içindeki kalan küçük coverage boşluklarını kapatır.
 * MongoMemoryServer / server.js gerektirmez — saf birim testleri, groq-sdk mock'lanır.
 *
 * Kapsanan satırlar:
 *   - 151-152: generateOutfitSuggestion → havaDurumu.durum / havaDurumu.konum yoksa
 *              varsayılan ('Bilinmiyor' / 'Türkiye') dalları
 *   - 216-217: generateOutfitSuggestion → AI yanıtında secilen_kiyafet_idleri
 *              alanı yoksa `|| []` dalı
 *   - 264    : generateSuitcaseSuggestion → havaDurumu.nem yoksa '—' dalı
 *   - 326-327: generateSuitcaseSuggestion → AI yanıtında secilen_kiyafet_idleri
 *              alanı yoksa `|| []` dalı
 *   - 339-356: generateWeatherNotificationText → tamamen test edilir,
 *              ayrıca hava.sicaklik / hava.durum yoksa varsayılan dallar (340-341)
 */

// Mock: groq-sdk
jest.mock('groq-sdk', () => {
    return jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn(),
            },
        },
    }));
});

const {
    generateOutfitSuggestion,
    generateSuitcaseSuggestion,
    generateWeatherNotificationText,
} = require('../services/aiService');

const Groq = require('groq-sdk');

// aiService.js modül yüklenirken `new Groq(...)` çağrılır — instance'ın
// create mock'unu yakalayalım.
const groqCreateMock = Groq.mock.results[0].value.chat.completions.create;

beforeEach(() => {
    groqCreateMock.mockReset();
});

// Geçerli dolap: 1 Üst Giyim + 1 Alt Giyim + 1 Ayakkabı (wardrobeOnKontrol → gecerli)
const userItems = [
    { _id: 'item-ust',  kategori: 'Üst Giyim', renk: 'Siyah',   mevsim: 'Yaz', stil: 'Günlük' },
    { _id: 'item-alt',  kategori: 'Alt Giyim', renk: 'Lacivert', mevsim: 'Yaz', stil: 'Günlük' },
    { _id: 'item-ayak', kategori: 'Ayakkabı',  renk: 'Beyaz',   mevsim: 'Yaz', stil: 'Günlük' },
];

const groqResponse = (jsonBody) => ({
    choices: [{ message: { content: JSON.stringify(jsonBody) } }],
});

describe('aiService — generateOutfitSuggestion kalan dallar', () => {
    test('havaDurumu.durum ve havaDurumu.konum eksikse varsayılan değerler kullanılır (lines 151-152)', async () => {
        groqCreateMock.mockResolvedValueOnce(groqResponse({
            aciklama: 'Sıcak hava için hafif bir kombin.',
            secilen_kiyafet_idleri: ['item-ust', 'item-alt', 'item-ayak'],
            ipucu: 'Rahat ol.',
        }));

        // havaDurumu içinde `durum` ve `konum` alanları YOK
        const result = await generateOutfitSuggestion(userItems, { sicaklik: 28 }, 'Günlük');

        expect(result.secilen_kiyafet_idleri).toEqual(['item-ust', 'item-alt', 'item-ayak']);
        expect(groqCreateMock).toHaveBeenCalledTimes(1);
    });

    test('AI yanıtında secilen_kiyafet_idleri alanı yoksa boş diziye düşer (lines 216-217)', async () => {
        groqCreateMock.mockResolvedValueOnce(groqResponse({
            aciklama: 'Kombin açıklaması',
            ipucu: 'İpucu',
            // secilen_kiyafet_idleri KASITLI olarak yok
        }));

        const result = await generateOutfitSuggestion(
            userItems,
            { sicaklik: 18, durum: 'bulutlu', konum: 'Ankara' },
            'İş'
        );

        expect(result.secilen_kiyafet_idleri).toEqual([]);
    });
});

describe('aiService — generateSuitcaseSuggestion kalan dallar', () => {
    test('havaDurumu.nem eksikse "—" varsayılanı kullanılır (line 264)', async () => {
        groqCreateMock.mockResolvedValueOnce(groqResponse({
            aciklama: 'Seyahat kombini açıklaması',
            secilen_kiyafet_idleri: ['item-ust', 'item-alt', 'item-ayak'],
            ipucu: 'Az eşya götür.',
        }));

        // havaDurumu içinde `nem` alanı YOK
        const result = await generateSuitcaseSuggestion(
            userItems,
            { sicaklik: 15, durum: 'parçalı bulutlu' },
            'Roma',
            4
        );

        expect(result.secilen_kiyafet_idleri).toEqual(['item-ust', 'item-alt', 'item-ayak']);
        expect(groqCreateMock).toHaveBeenCalledTimes(1);
    });

    test('havaDurumu.durum eksikse "Bilinmiyor" varsayılanı kullanılır (line 264)', async () => {
        groqCreateMock.mockResolvedValueOnce(groqResponse({
            aciklama: 'Seyahat kombini açıklaması',
            secilen_kiyafet_idleri: ['item-ust', 'item-alt', 'item-ayak'],
            ipucu: 'Az eşya götür.',
        }));

        // havaDurumu içinde `durum` alanı YOK
        const result = await generateSuitcaseSuggestion(
            userItems,
            { sicaklik: 12, nem: 60 },
            'Viyana',
            2
        );

        expect(result.secilen_kiyafet_idleri).toEqual(['item-ust', 'item-alt', 'item-ayak']);
        const callArgs = groqCreateMock.mock.calls[0][0];
        expect(callArgs.messages[0].content).toContain('Bilinmiyor');
    });

    test('AI yanıtında secilen_kiyafet_idleri alanı yoksa boş diziye düşer (lines 326-327)', async () => {
        groqCreateMock.mockResolvedValueOnce(groqResponse({
            aciklama: 'Bavul açıklaması',
            ipucu: 'İpucu',
            // secilen_kiyafet_idleri KASITLI olarak yok
        }));

        const result = await generateSuitcaseSuggestion(
            userItems,
            { sicaklik: 10, durum: 'yağmurlu', nem: 80 },
            'Londra',
            10
        );

        expect(result.secilen_kiyafet_idleri).toEqual([]);
    });
});

describe('aiService — generateWeatherNotificationText (lines 339-356)', () => {
    test('hava.sicaklik ve hava.durum eksikse varsayılanlarla bildirim metni üretir (lines 340-341)', async () => {
        groqCreateMock.mockResolvedValueOnce({
            choices: [{ message: { content: '  Bugün rahat bir kombin seni bekliyor! 🌤️  ' } }],
        });

        // hava içinde `sicaklik` ve `durum` alanları YOK
        const text = await generateWeatherNotificationText(userItems, {}, 'İstanbul');

        expect(text).toBe('Bugün rahat bir kombin seni bekliyor! 🌤️');
        expect(groqCreateMock).toHaveBeenCalledTimes(1);

        const callArgs = groqCreateMock.mock.calls[0][0];
        expect(callArgs.messages[0].content).toContain('20°C');
        expect(callArgs.messages[0].content).toContain('güneşli');
        expect(callArgs.messages[0].content).toContain('Dolabımdaki gerçek parçalar');
    });

    test('hava.sicaklik ve hava.durum verilmişse bunlar kullanılır', async () => {
        groqCreateMock.mockResolvedValueOnce({
            choices: [{ message: { content: 'Yağmurluk al, dışarı çık!' } }],
        });

        const text = await generateWeatherNotificationText(userItems, { sicaklik: 9, durum: 'yağmurlu' }, 'Londra');

        expect(text).toBe('Yağmurluk al, dışarı çık!');
        const callArgs = groqCreateMock.mock.calls[0][0];
        expect(callArgs.messages[0].content).toContain('9°C');
        expect(callArgs.messages[0].content).toContain('yağmurlu');
        expect(callArgs.messages[0].content).toContain('Londra');
    });
});
