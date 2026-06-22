const cron = require('node-cron');
const User = require('../models/User');
const Item = require('../models/Item');
const TravelSuitcase = require('../models/TravelSuitcase');
const { sehirHavaDurumu } = require('./weatherService');
const { generateWeatherNotificationText } = require('./aiService');
const { sendPushNotification } = require('./notificationService');
const { getGenderItemFilter } = require('../utils/genderFilter');

// Hava Durumu + AI Kombin Önerisi — Her gün 08:00
const scheduleWeatherNotifications = () => {
    cron.schedule('0 8 * * *', async () => {
        console.log('🌤️  Cron [08:00] Hava durumu bildirimleri başlatılıyor...');

        const users = await User.find({
            'notificationPreferences.dailyWeatherAI': true,
            fcmTokens: { $exists: true, $not: { $size: 0 } },
        }).select('_id defaultCity fcmTokens vucut stilTonu cinsiyet');

        for (const user of users) {
            try {
                const city = user.defaultCity || 'Istanbul';
                const hava  = await sehirHavaDurumu(city);

                const items = await Item.find({
                    kullanici: user._id,
                    ...getGenderItemFilter(user.cinsiyet),
                })
                    .select('kategori renk mevsim stil')
                    .limit(30)
                    .lean();

                if (items.length === 0) continue;

                const userProfile = {
                    cinsiyet:   user.cinsiyet,
                    vucutSekli: user.vucut?.sekil,
                    vucutKalip: user.vucut?.kalip,
                    stilTonu:   user.stilTonu,
                };
                const notifText = await generateWeatherNotificationText(items, hava, city, userProfile);

                await sendPushNotification(
                    user._id,
                    '🌤️ Günlük Kombin Önerin',
                    notifText,
                    { screen: 'outfit' },
                );
            } catch (err) {
                console.error(`  ⚠️  Weather notif hatası (${user._id}):`, err.message);
            }
        }

        console.log(`  ✅ Hava durumu bildirimleri tamamlandı. (${users.length} kullanıcı)`);
    }, { timezone: 'Europe/Istanbul' });
};

// Seyahat Hatırlatıcıları — Her gün 09:00
const scheduleTravelReminders = () => {
    cron.schedule('0 9 * * *', async () => {
        console.log('✈️  Cron [09:00] Seyahat hatırlatıcıları başlatılıyor...');

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const dayAfterTomorrow = new Date(tomorrow);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

        const suitcases = await TravelSuitcase.find({
            baslangicTarihi: { $gte: tomorrow, $lt: dayAfterTomorrow },
        }).populate('kullanici', 'fcmTokens notificationPreferences');

        let sent = 0;
        for (const suitcase of suitcases) {
            const user = suitcase.kullanici;
            if (!user?.notificationPreferences?.travelReminders) continue;
            if (!user.fcmTokens?.length) continue;

            try {
                await sendPushNotification(
                    user._id,
                    '✈️ Seyahat Hatırlatıcısı',
                    `Yarınki ${suitcase.sehir} seyahatin için AI bavulun hazır! Göz atmayı unutma ✈️`,
                    { screen: 'travel', suitcaseId: suitcase._id.toString() },
                );
                sent++;
            } catch (err) {
                console.error(`  ⚠️  Travel notif hatası (${user._id}):`, err.message);
            }
        }

        console.log(`  ✅ Seyahat hatırlatıcıları tamamlandı. (${sent} bildirim)`);
    }, { timezone: 'Europe/Istanbul' });
};

// Haftalık Stil Özeti — Her Pazar 10:00
const scheduleWeeklySummary = () => {
    cron.schedule('0 10 * * 0', async () => {
        console.log('📅  Cron [10:00/Pazar] Haftalık stil özeti başlatılıyor...');

        const users = await User.find({
            'notificationPreferences.weeklyStyle': true,
            fcmTokens: { $exists: true, $not: { $size: 0 } },
        }).select('_id fcmTokens');

        let sent = 0;
        for (const user of users) {
            try {
                const itemCount = await Item.countDocuments({ kullanici: user._id });
                if (itemCount === 0) continue;

                await sendPushNotification(
                    user._id,
                    '📅 Haftalık Stil Özeti',
                    `Yeni haftaya stilinle gir! ${itemCount} parçalık dolabın seni bekliyor. Bir kombin dene 👗`,
                    { screen: 'wardrobe' },
                );
                sent++;
            } catch (err) {
                console.error(`  ⚠️  Weekly notif hatası (${user._id}):`, err.message);
            }
        }

        console.log(`  ✅ Haftalık stil özeti tamamlandı. (${sent} bildirim)`);
    }, { timezone: 'Europe/Istanbul' });
};

// Tüm cron job'ları başlat
const startCronJobs = () => {
    scheduleWeatherNotifications();
    scheduleTravelReminders();
    scheduleWeeklySummary();
    console.log('⏰ Cron jobs başlatıldı (Europe/Istanbul). [08:00 hava | 09:00 seyahat | Pazar 10:00 haftalık]');
};

module.exports = { startCronJobs };
