const admin = require('firebase-admin');
const User = require('../models/User');

/**
 * Belirtilen kullanıcının tüm kayıtlı cihazlarına FCM push bildirimi gönderir.
 * Süresi dolmuş veya geçersiz token'ları MongoDB'den temizler.
 *
 * @param {string} userId      - MongoDB User _id
 * @param {string} title       - Bildirim başlığı
 * @param {string} body        - Bildirim metni
 * @param {Object} dataPayload - İsteğe bağlı ekstra key-value verisi (tüm değerler string olmalı)
 */
const sendPushNotification = async (userId, title, body, dataPayload = {}) => {
    if (process.env.NODE_ENV === 'test') return;

    const user = await User.findById(userId).select('fcmTokens');

    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
        return;
    }

    const message = {
        notification: { title, body },
        data: dataPayload,
        tokens: user.fcmTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    if (response.failureCount === 0) return;

    // Hatalı (süresi dolmuş / kaldırılmış) token'ları temizle
    const expiredTokens = [];
    response.responses.forEach((res, idx) => {
        if (!res.success) {
            const code = res.error?.code;
            if (
                code === 'messaging/registration-token-not-registered' ||
                code === 'messaging/invalid-registration-token'
            ) {
                expiredTokens.push(user.fcmTokens[idx]);
            }
        }
    });

    if (expiredTokens.length > 0) {
        await User.findByIdAndUpdate(userId, {
            $pull: { fcmTokens: { $in: expiredTokens } },
        });
    }
};

module.exports = { sendPushNotification };
