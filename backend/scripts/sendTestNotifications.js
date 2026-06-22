/**
 * Test script — gerçek cron job'ların gönderdiği 3 bildirimin AYNISINI
 * (aynı başlık, aynı içerik mantığı) hemen, manuel olarak tetikler.
 * Production'daki Pazartesi/08:00/09:00/Pazar-10:00 zamanlamasını
 * beklemeden, bildirimlerin gerçekte nasıl görüneceğini test etmek içindir.
 *
 * Kullanım (backend/ klasöründe):
 *   node scripts/sendTestNotifications.js kullanici@email.com
 */
require('dotenv').config();
const connectDB = require('../config/db');
const { initFirebase } = require('../config/firebase');
const User = require('../models/User');
const Item = require('../models/Item');
const TravelSuitcase = require('../models/TravelSuitcase');
const { sehirHavaDurumu } = require('../services/weatherService');
const { generateWeatherNotificationText } = require('../services/aiService');
const { sendPushNotification } = require('../services/notificationService');

const EMAIL = process.argv[2];

async function main() {
    if (!EMAIL) {
        console.error('Kullanım: node scripts/sendTestNotifications.js kullanici@email.com');
        process.exit(1);
    }

    await connectDB();
    initFirebase();

    const user = await User.findOne({ email: EMAIL }).select('_id email defaultCity fcmTokens');
    if (!user) {
        console.error(`❌ Kullanıcı bulunamadı: ${EMAIL}`);
        process.exit(1);
    }
    if (!user.fcmTokens?.length) {
        console.error("❌ Bu kullanıcının kayıtlı bildirim token'ı yok. Önce web Ayarlar sayfasında bildirim iznini ver.");
        process.exit(1);
    }
    console.log(`✅ ${user.email} bulundu — ${user.fcmTokens.length} cihaz kayıtlı.\n`);

    // 1) Hava Durumu & Kombin (gerçek cron: her gün 08:00)
    try {
        const city = user.defaultCity || 'Istanbul';
        const hava = await sehirHavaDurumu(city);
        const items = await Item.find({ kullanici: user._id }).select('kategori renk mevsim stil').limit(30).lean();

        const notifText = items.length > 0
            ? await generateWeatherNotificationText(items, hava, city)
            : `${city}'de bugün hava güzel! Dolabını doldurup ilk kombinini oluştur.`;

        await sendPushNotification(user._id, '🌤️ Günlük Kombin Önerin', notifText, { screen: 'outfit' });
        console.log('1) Hava Durumu & Kombin gönderildi:');
        console.log(`   "${notifText}"\n`);
    } catch (err) {
        console.error('1) ⚠️ Hava durumu bildirimi gönderilemedi:', err.message, '\n');
    }

    // 2) Seyahat Hatırlatıcısı — gerçek cron mantığıyla AYNI tarih filtresi:
    //    sadece başlangıcı YARIN olan bir bavul varsa gönderilir.
    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const dayAfterTomorrow = new Date(tomorrow);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

        const suitcase = await TravelSuitcase.findOne({
            kullanici: user._id,
            baslangicTarihi: { $gte: tomorrow, $lt: dayAfterTomorrow },
        });

        if (suitcase) {
            const body = `Yarınki ${suitcase.sehir} seyahatin için AI bavulun hazır! Göz atmayı unutma ✈️`;
            await sendPushNotification(user._id, '✈️ Seyahat Hatırlatıcısı', body, { screen: 'travel' });
            console.log('2) Seyahat Hatırlatıcısı gönderildi (gerçek, başlangıcı yarın olan bavul bulundu):');
            console.log(`   "${body}"\n`);
        } else {
            const ornekSehir = 'Adana';
            const body = `Yarınki ${ornekSehir} seyahatin için AI bavulun hazır! Göz atmayı unutma ✈️`;
            await sendPushNotification(user._id, '✈️ Seyahat Hatırlatıcısı (ÖRNEK)', body, { screen: 'travel' });
            console.log('2) ℹ️  Başlangıcı yarın olan kayıtlı bir bavulun yok — bu yüzden örnek bir şehirle ÖNİZLEME gönderildi:');
            console.log(`   "${body}"`);
            console.log('   Gerçek üretimde bu bildirim SADECE başlangıç tarihi tam olarak "yarın" olan bir bavul varsa gider —');
            console.log('   geçmiş tarihli bavullar (Rome, Ankara gibi) asla tetiklemez, bu doğru ve beklenen davranış.\n');
        }
    } catch (err) {
        console.error('2) ⚠️ Seyahat bildirimi gönderilemedi:', err.message, '\n');
    }

    // 3) Haftalık Stil Özeti (gerçek cron: her Pazar 10:00)
    try {
        const itemCount = await Item.countDocuments({ kullanici: user._id });
        const body = `Yeni haftaya stilinle gir! ${itemCount} parçalık dolabın seni bekliyor. Bir kombin dene 👗`;

        await sendPushNotification(user._id, '📅 Haftalık Stil Özeti', body, { screen: 'wardrobe' });
        console.log('3) Haftalık Stil Özeti gönderildi:');
        console.log(`   "${body}"\n`);
    } catch (err) {
        console.error('3) ⚠️ Haftalık özet gönderilemedi:', err.message, '\n');
    }

    console.log('Tamamlandı — tarayıcında (sekme arka plandaysa Windows bildirim merkezinde, açıksa sayfada) 3 bildirim belirmeli.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Beklenmeyen hata:', err);
    process.exit(1);
});
