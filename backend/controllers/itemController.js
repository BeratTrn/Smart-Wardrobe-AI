const Item = require('../models/Item');
const OpenAI = require('openai');

// OpenAI Bağlantısını Kur
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY // .env dosyasından şifreyi alır
});

const analyzeAndAddItem = async (req, res) => {
    try {
        // 1. Kullanıcı gerçekten bir fotoğraf yüklemiş mi?
        if (!req.file) {
            return res.status(400).json({ mesaj: 'Lütfen bir kıyafet fotoğrafı yükleyin!' });
        }

        // 2. Resmi Base64 formatına çevir (OpenAI'ın gözleriyle görebilmesi için)
        const base64Image = req.file.buffer.toString('base64');

        // 3. Yapay Zekaya (GPT-4o) Sor!
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        { 
                            type: "text", 
                            text: "Bu kıyafeti analiz et. Lütfen SADECE şu formatta bir JSON döndür, başka hiçbir açıklama yazma: {\"kategori\": \"Üst Giyim\", \"renk\": \"Kırmızı\", \"mevsim\": \"Kış\"}" 
                        },
                        { 
                            type: "image_url", 
                            image_url: { url: `data:${req.file.mimetype};base64,${base64Image}` } 
                        }
                    ]
                }
            ],
            max_tokens: 300,
        });

        // 4. OpenAI'dan gelen cevabı temizle ve JSON'a çevir
        let aiResponse = response.choices[0].message.content;
        aiResponse = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim(); // Markdown temizliği
        const aiData = JSON.parse(aiResponse);

        // 5. Veritabanına Kaydet
        const newItem = new Item({
            kullanici: req.user.id, // Kimin eklediğini güvenlik görevlisinden (middleware) öğrendik!
            resimUrl: "gecici_resim_linki.jpg", // Gerçek resim linkleme işini (Cloudinary) sonraki aşamalarda yapacağız
            kategori: aiData.kategori,
            renk: aiData.renk,
            mevsim: aiData.mevsim
        });

        await newItem.save();

        // 6. Başarı mesajı ve AI sonucunu mobile gönder
        res.status(201).json({
            mesaj: 'Kıyafet yapay zeka ile analiz edildi ve dolaba eklendi! 🪄',
            kıyafet: newItem
        });

    } catch (error) {
        console.error("Yapay Zeka veya Kayıt Hatası:", error);
        res.status(500).json({ mesaj: 'Kıyafet analiz edilemedi, lütfen tekrar deneyin.' });
    }
};

// Yeni Fonksiyon: Kullanıcının dolabındaki kıyafetleri getir
const getItems = async (req, res) => {
    try {
        // req.user.id'yi yine güvenlik görevlimizden (middleware) alıyoruz.
        // Item (Kıyafet) tablosunda sadece bu id'ye ait olanları buluyoruz.
        // sort({ createdAt: -1 }) ile en son eklenen kıyafetin en üstte (ilk sırada) gelmesini sağlıyoruz.
        const items = await Item.find({ kullanici: req.user.id }).sort({ createdAt: -1 });

        res.status(200).json({
            mesaj: 'Kıyafetler başarıyla getirildi! 👕👗',
            adet: items.length,
            kiyafetler: items
        });
    } catch (error) {
        console.error("Kıyafetleri Getirme Hatası:", error);
        res.status(500).json({ mesaj: 'Kıyafetler getirilemedi, sunucu hatası.' });
    }
};

// Yeni Fonksiyon: Dolaptan Kıyafet Sil
const deleteItem = async (req, res) => {
    try {
        // 1. Silinecek kıyafeti URL'den gelen ID'sine göre bul
        const item = await Item.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ mesaj: 'Silinmek istenen kıyafet bulunamadı!' });
        }

        // 2. Güvenlik Kontrolü: Bu kıyafet gerçekten giriş yapan kullanıcıya mı ait?
        if (item.kullanici.toString() !== req.user.id) {
            return res.status(401).json({ mesaj: 'Başkasının dolabından kıyafet silemezsiniz!' });
        }

        // 3. Kıyafeti veritabanından kalıcı olarak sil
        await item.deleteOne();

        res.status(200).json({ mesaj: 'Kıyafet dolabınızdan başarıyla silindi! 🗑️' });
    } catch (error) {
        console.error("Kıyafet Silme Hatası:", error);
        res.status(500).json({ mesaj: 'Kıyafet silinemedi, sunucu hatası.' });
    }
};

// DİKKAT: En alttaki dışa aktarma satırını şu şekilde güncelle ki deleteItem fonksiyonunu da dışarı açalım:
module.exports = { analyzeAndAddItem, getItems, deleteItem };
