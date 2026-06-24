/**
 * Test/debug sırasında biriken eski/yinelenen FCM token'larını temizler.
 * (Tarayıcı servis çalışanı (service worker) yeniden kaydolduğunda Firebase
 * bazen yeni bir token üretir; eskisi otomatik silinmez, bu da aynı cihaza
 * çift bildirim gitmesine yol açar.)
 *
 * Kullanım (backend/ klasöründe):
 *   node scripts/clearFcmTokens.js kullanici@email.com
 *
 * Çalıştırdıktan sonra ilgili tarayıcıda Ayarlar sayfasını yenile —
 * tek ve güncel bir token otomatik olarak yeniden kaydedilecek.
 */
require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

const EMAIL = process.argv[2];

async function main() {
    if (!EMAIL) {
        console.error('Kullanım: node scripts/clearFcmTokens.js kullanici@email.com');
        process.exit(1);
    }

    await connectDB();

    const user = await User.findOne({ email: EMAIL }).select('_id email fcmTokens');
    if (!user) {
        console.error(`❌ Kullanıcı bulunamadı: ${EMAIL}`);
        process.exit(1);
    }

    const before = user.fcmTokens?.length || 0;
    user.fcmTokens = [];
    await user.save();

    console.log(`✅ ${user.email}: ${before} token silindi. Tarayıcıda Ayarlar sayfasını yenile, tek bir güncel token otomatik kaydolacak.`);
    process.exit(0);
}

main().catch((err) => {
    console.error('Beklenmeyen hata:', err);
    process.exit(1);
});
