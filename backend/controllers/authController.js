const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // Dijital kart paketimiz

// --- KAYIT OLMA (REGISTER) KODU ---
const registerUser = async (req, res) => {
    try {
        const { kullaniciAdi, email, sifre } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ mesaj: 'Bu e-posta adresi zaten kullanımda!' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(sifre, salt);

        const newUser = new User({
            kullaniciAdi,
            email,
            sifre: hashedPassword
        });

        await newUser.save();

        res.status(201).json({
            mesaj: 'Kullanıcı başarıyla kaydedildi! 🎉',
            kullanici: { id: newUser._id, kullaniciAdi: newUser.kullaniciAdi, email: newUser.email }
        });

    } catch (error) {
        console.error("Kayıt Hatası:", error);
        res.status(500).json({ mesaj: 'Sunucu hatası, kayıt yapılamadı.' });
    }
};

// --- GİRİŞ YAPMA (LOGIN) KODU ---
const loginUser = async (req, res) => {
    try {
        const { email, sifre } = req.body;

        // 1. Bu e-posta ile bir kullanıcı var mı?
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ mesaj: 'Kullanıcı bulunamadı!' });
        }

        // 2. Şifre doğru mu? (Kriptolu şifreyi çözüp karşılaştırır)
        const isMatch = await bcrypt.compare(sifre, user.sifre);
        if (!isMatch) {
            return res.status(400).json({ mesaj: 'Geçersiz şifre!' });
        }

        // 3. Şifre doğruysa Dijital Kart (Token) oluştur!
        const token = jwt.sign(
            { id: user._id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '30d' } // Kartın geçerlilik süresi 30 gün
        );

        // 4. Kartı ve kullanıcı bilgilerini gönder
        res.status(200).json({
            mesaj: 'Giriş başarılı! 🔑',
            token: token,
            kullanici: { id: user._id, kullaniciAdi: user.kullaniciAdi, email: user.email }
        });

    } catch (error) {
        console.error("Giriş Hatası:", error);
        res.status(500).json({ mesaj: 'Sunucu hatası, giriş yapılamadı.' });
    }
};

// İki fonksiyonu da dışa aktar
module.exports = { registerUser, loginUser };