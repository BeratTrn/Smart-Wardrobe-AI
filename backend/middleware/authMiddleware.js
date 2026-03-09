const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;

    // İstek başlıklarında (headers) kartımız var mı kontrol et
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Kart numarasını al (Bearer kelimesini at)
            token = req.headers.authorization.split(' ')[1];

            // Kartın sahte olup olmadığını kendi gizli şifremizle (.env) kontrol et
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Kart geçerliyse, kullanıcının kimliğini (id) sisteme tanıt!
            req.user = decoded; 

            // Güvenlikten başarıyla geçti, kapıyı aç ve asıl işleme (OpenAI'a) devam et
            next(); 
        } catch (error) {
            return res.status(401).json({ mesaj: 'Yetkisiz erişim, geçersiz dijital kart!' });
        }
    }

    if (!token) {
        return res.status(401).json({ mesaj: 'Yetkisiz erişim, lütfen giriş yapın!' });
    }
};

module.exports = { protect };