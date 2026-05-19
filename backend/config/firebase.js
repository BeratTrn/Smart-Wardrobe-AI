const admin = require('firebase-admin');

const initFirebase = () => {
    if (process.env.NODE_ENV === 'test') return;

    if (!admin.apps.length) {
        // Lazy-require so the file is never touched in test/CI environments
        const serviceAccount = require('../smart-wardrobe-ai-firebase-service-account.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('🔥 Firebase Admin başarıyla başlatıldı!');
    }
};

module.exports = { initFirebase };