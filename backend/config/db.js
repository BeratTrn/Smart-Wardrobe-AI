const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // .env dosyasındaki linki kullanarak veritabanına bağlan
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB Başarıyla Bağlandı: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB Bağlantı Hatası: ${error.message}`);
        process.exit(1); // Hata olursa sunucuyu güvenle durdur
    }
};

module.exports = connectDB;