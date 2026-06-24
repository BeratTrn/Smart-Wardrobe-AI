jest.mock('puppeteer-extra-plugin-stealth', () => jest.fn(() => ({})));

describe('webProductService.getBrowser - tarayıcı başlatma hatası', () => {
    test('launch() reddedilirse hata yutulur (boş dizi döner) ve bir sonraki çağrıda yeniden denenir', async () => {
        jest.resetModules();

        const launchMock = jest.fn();
        jest.doMock('puppeteer-extra', () => ({
            use: jest.fn(),
            launch: launchMock,
        }));

        launchMock.mockRejectedValueOnce(new Error('launch failed'));

        const { searchProducts } = require('../services/webProductService');

        const result1 = await searchProducts('izole tarayici hata testi sorgu 1');
        expect(result1).toEqual([]);
        expect(launchMock).toHaveBeenCalledTimes(1);

        const mockPage = {
            setUserAgent: jest.fn().mockResolvedValue(undefined),
            setViewport: jest.fn().mockResolvedValue(undefined),
            setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
            goto: jest.fn().mockResolvedValue({ status: () => 200 }),
            waitForSelector: jest.fn().mockResolvedValue(undefined),
            evaluate: jest.fn().mockResolvedValue({
                items: [],
                totalAnchors: 0,
                pageTitle: 'Test',
                bodyLength: 0,
            }),
            close: jest.fn().mockResolvedValue(undefined),
        };
        const mockBrowser = { newPage: jest.fn().mockResolvedValue(mockPage) };
        launchMock.mockResolvedValueOnce(mockBrowser);

        const result2 = await searchProducts('izole tarayici hata testi sorgu 2');
        expect(result2).toEqual([]);
        expect(launchMock).toHaveBeenCalledTimes(2);
    });
});

describe('webProductService.closeBrowser - süreç sonlanırken tarayıcıyı kapatma (satır 86-93, 98)', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('browserPromise mevcutsa SIGINT yakalayıcısı closeBrowser() çağırır ve browser.close() ile process.kill() tetiklenir', async () => {
        jest.resetModules();

        // process.once'ı yakalayalım — gerçek sinyal dinleyicisi KAYIT ETMEYELİM,
        // sadece modül yüklenirken kaydedilen handler'ları yakalayıp elle çağıracağız.
        const capturedHandlers = {};
        const onceSpy = jest.spyOn(process, 'once').mockImplementation((signal, handler) => {
            capturedHandlers[signal] = handler;
            return process;
        });
        const killSpy = jest.spyOn(process, 'kill').mockImplementation(() => {});

        const mockBrowserClose = jest.fn().mockResolvedValue(undefined);
        const mockPage = {
            setUserAgent: jest.fn().mockResolvedValue(undefined),
            setViewport: jest.fn().mockResolvedValue(undefined),
            setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
            goto: jest.fn().mockResolvedValue({ status: () => 200 }),
            waitForSelector: jest.fn().mockResolvedValue(undefined),
            evaluate: jest.fn().mockResolvedValue({
                items: [],
                totalAnchors: 0,
                pageTitle: 'Test',
                bodyLength: 0,
            }),
            close: jest.fn().mockResolvedValue(undefined),
        };
        const mockBrowser = { newPage: jest.fn().mockResolvedValue(mockPage), close: mockBrowserClose };

        const launchMock = jest.fn().mockResolvedValue(mockBrowser);
        jest.doMock('puppeteer-extra', () => ({
            use: jest.fn(),
            launch: launchMock,
        }));

        const { searchProducts } = require('../services/webProductService');

        // browserPromise'ı doldurmak için en az bir arama yap
        await searchProducts('kapatma testi sorgusu');
        expect(launchMock).toHaveBeenCalledTimes(1);

        // Modül kayıtlı SIGINT/SIGTERM/SIGUSR2 handler'larını yakalamış olmalı (satır 96-99)
        expect(onceSpy).toHaveBeenCalled();
        expect(typeof capturedHandlers.SIGINT).toBe('function');

        // SIGINT handler'ı elle tetikle -> closeBrowser().finally(() => process.kill(...)) (satır 98)
        capturedHandlers.SIGINT();

        // closeBrowser'ın iç async işini bitirmesini bekle
        await new Promise((resolve) => setImmediate(resolve));
        await new Promise((resolve) => setImmediate(resolve));

        expect(mockBrowserClose).toHaveBeenCalledTimes(1);
        expect(killSpy).toHaveBeenCalledWith(process.pid, 'SIGINT');
    });
});
