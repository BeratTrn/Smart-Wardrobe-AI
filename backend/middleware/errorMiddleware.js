// Bulunamadı (404) Handler
const notFound = (req, res, next) => {
    const error = new Error(`${req.originalUrl} - Endpoint bulunamadı`);
    res.status(404);
    next(error);
};

// Global Hata Handler
const errorHandler = (err, req, res, next) => {
    // Mongoose CastError (geçersiz ObjectId)
    if (err.name === 'CastError') {
        return res.status(400).json({ mesaj: 'Geçersiz ID formatı.' });
    }

    // Mongoose ValidationError
    if (err.name === 'ValidationError') {
        const mesajlar = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({ mesaj: mesajlar.join(', ') });
    }

    // MongoDB Duplicate Key (unique constraint)
    if (err.code === 11000) {
        const alan = Object.keys(err.keyValue)[0];
        return res.status(400).json({ mesaj: `Bu ${alan} zaten kullanımda.` });
    }

    // Multer hatası
    if (err.message && err.message.includes('Sadece resim')) {
        return res.status(400).json({ mesaj: err.message });
    }

    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        mesaj: err.message || 'Sunucu hatası',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = { notFound, errorHandler };
