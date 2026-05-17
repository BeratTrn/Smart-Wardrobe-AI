const admin = require('firebase-admin');
// JSON dosyasını direkt import ediyoruz
const serviceAccount = require('../smart-wardrobe-ai-firebase-service-account.json');

const initFirebase = () => {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('🔥 Firebase Admin başarıyla başlatıldı!');
    }
};

module.exports = { initFirebase };