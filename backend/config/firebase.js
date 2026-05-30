const admin = require('firebase-admin');

const initFirebase = () => {
    if (process.env.NODE_ENV === 'test') return;

    if (!admin.apps.length) {
        try {
            let credential;

            if (process.env.FIREBASE_SERVICE_ACCOUNT) {
                // Render.com: env variable olarak JSON string
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
                credential = admin.credential.cert(serviceAccount);
            } else {
                // Local geliştirme: dosyadan oku
                const serviceAccount = require('../smart-wardrobe-ai-firebase-service-account.json');
                credential = admin.credential.cert(serviceAccount);
            }

            admin.initializeApp({ credential });
            console.log('🔥 Firebase Admin başarıyla başlatıldı!');
        } catch (err) {
            console.warn('⚠️ Firebase başlatılamadı (push bildirimleri devre dışı):', err.message);
        }
    }
};

module.exports = { initFirebase };