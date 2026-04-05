const { havaDurumuGetir, sehirHavaDurumu } = require('../services/weatherService');

// @route  GET /api/weather?enlem=41&boylam=29
// @desc   Koordinata göre hava durumu
// @access Private
const getWeatherByCoords = async (req, res) => {
    try {
        const { enlem, boylam } = req.query;

        if (!enlem || !boylam) {
            return res.status(400).json({ mesaj: 'Enlem ve boylam gereklidir.' });
        }

        const hava = await havaDurumuGetir(enlem, boylam);
        res.status(200).json({ havaDurumu: hava });

    } catch (error) {
        console.error('Hava Durumu Hatası:', error.message);
        res.status(503).json({ mesaj: 'Hava durumu bilgisi alınamadı. API erişim sorunu.' });
    }
};

// @route  GET /api/weather/city?sehir=Istanbul
// @desc   Şehir adına göre hava durumu
// @access Private
const getWeatherByCity = async (req, res) => {
    try {
        const { sehir } = req.query;

        if (!sehir) {
            return res.status(400).json({ mesaj: 'Şehir adı gereklidir.' });
        }

        const hava = await sehirHavaDurumu(sehir);
        res.status(200).json({ havaDurumu: hava });

    } catch (error) {
        console.error('Şehir Hava Durumu Hatası:', error.message);
        if (error.response && error.response.status === 404) {
            return res.status(404).json({ mesaj: 'Şehir bulunamadı.' });
        }
        res.status(503).json({ mesaj: 'Hava durumu bilgisi alınamadı.' });
    }
};

module.exports = { getWeatherByCoords, getWeatherByCity };
