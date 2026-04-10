const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    // DEBUG: Gelen header'ı logla
    console.log(`[AUTH DEBUG] ${req.method} ${req.path} | Authorization: ${req.headers.authorization ? req.headers.authorization.substring(0, 30) + '...' : 'YOK'}`);

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Token'dan kullanıcıyı veritabanından çek (şifre hariç)
            req.user = await User.findById(decoded.id).select('-sifre');

            if (!req.user) {
                return res.status(401).json({ mesaj: 'Kullanıcı bulunamadı, token geçersiz.' });
            }

            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ mesaj: 'Oturum süresi doldu, lütfen tekrar giriş yapın.' });
            }
            return res.status(401).json({ mesaj: 'Yetkisiz erişim, geçersiz token.' });
        }
    }

    if (!token) {
        return res.status(401).json({ mesaj: 'Yetkisiz erişim, lütfen giriş yapın.' });
    }
};

module.exports = { protect };