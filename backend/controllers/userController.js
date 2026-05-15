const User = require('../models/User');

// @route  PUT /api/users/profile
// @access Private
const updateProfile = async (req, res) => {
    try {
        const { kullaniciAdi, tercihler } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { kullaniciAdi, tercihler },
            { new: true, runValidators: true }
        ).select('-sifre');

        res.status(200).json({
            mesaj: 'Profil güncellendi. ✅',
            kullanici: updatedUser
        });
    } catch (error) {
        res.status(500).json({ mesaj: 'Profil güncellenemedi.' });
    }
};

// @route  PUT /api/users/profile/body
// @access Private
const updateBodyProfile = async (req, res) => {
    try {
        const { bodyShape, fitPreference } = req.body;

        if (!bodyShape && !fitPreference) {
            return res.status(400).json({ mesaj: 'En az bir vücut tercihi gönderilmelidir.' });
        }

        const allowedShapes = ['kum_saati', 'armut', 'ters_ucgen', 'dikdortgen'];
        const allowedFits   = ['slim', 'regular', 'oversize'];

        if (bodyShape && !allowedShapes.includes(bodyShape)) {
            return res.status(400).json({ mesaj: 'Geçersiz vücut şekli değeri.' });
        }
        if (fitPreference && !allowedFits.includes(fitPreference)) {
            return res.status(400).json({ mesaj: 'Geçersiz kalıp tercihi değeri.' });
        }

        const update = {};
        if (bodyShape)     update['vucut.sekil'] = bodyShape;
        if (fitPreference) update['vucut.kalip'] = fitPreference;

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $set: update },
            { new: true, runValidators: true }
        ).select('-sifre');

        res.status(200).json({
            mesaj: 'Vücut profili güncellendi. ✅',
            vucut: updatedUser.vucut
        });
    } catch (error) {
        console.error('Vücut Profili Güncelleme Hatası:', error);
        res.status(500).json({ mesaj: 'Vücut profili güncellenemedi.' });
    }
};

// @route  PUT /api/users/profile/photo        (avatar asset path — JSON body)
// @access Private
const updateProfilePhoto = async (req, res) => {
    try {
        const { profilFoto } = req.body;

        if (!profilFoto || typeof profilFoto !== 'string' || profilFoto.trim() === '') {
            return res.status(400).json({ mesaj: 'Geçerli bir profil fotoğrafı yolu gönderilmelidir.' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { profilFoto: profilFoto.trim() },
            { new: true }
        ).select('-sifre');

        res.status(200).json({
            mesaj: 'Profil fotoğrafı güncellendi. ✅',
            profilFoto: updatedUser.profilFoto,
        });
    } catch (error) {
        console.error('Profil Foto Güncelleme Hatası:', error);
        res.status(500).json({ mesaj: 'Profil fotoğrafı güncellenemedi.' });
    }
};

// @route  PUT /api/users/profile/photo/upload  (gerçek fotoğraf — multipart)
// @access Private
const uploadProfilePhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ mesaj: 'Fotoğraf gönderilmedi.' });
        }

        // multer-cloudinary storage → req.file.path = Cloudinary secure URL
        const profilFoto = req.file.path;

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { profilFoto },
            { new: true }
        ).select('-sifre');

        res.status(200).json({
            mesaj: 'Profil fotoğrafı yüklendi. ✅',
            profilFoto: updatedUser.profilFoto,
        });
    } catch (error) {
        console.error('Profil Foto Yükleme Hatası:', error);
        res.status(500).json({ mesaj: 'Profil fotoğrafı yüklenemedi.' });
    }
};

module.exports = {
    updateProfile,
    updateBodyProfile,
    updateProfilePhoto,
    uploadProfilePhoto,
};
