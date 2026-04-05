const multer = require('multer');

// Test ortamında Cloudinary yükleme — gerçek API'ye bağlanma
if (process.env.NODE_ENV === 'test') {
    const upload = multer({ storage: multer.memoryStorage() });
    const cloudinary = { uploader: { destroy: async () => ({}) } };
    module.exports = { upload, cloudinary };
} else {
    const cloudinary = require('cloudinary').v2;
    const { CloudinaryStorage } = require('multer-storage-cloudinary');

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    const storage = new CloudinaryStorage({
        cloudinary,
        params: {
            folder: 'smart-wardrobe',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }]
        }
    });

    const fileFilter = (req, file, cb) => {
        const izinliTipler = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (izinliTipler.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Sadece resim dosyaları yüklenebilir! (jpg, jpeg, png, webp)'), false);
        }
    };

    const upload = multer({
        storage,
        fileFilter,
        limits: { fileSize: 5 * 1024 * 1024 }
    });

    module.exports = { upload, cloudinary };
}
