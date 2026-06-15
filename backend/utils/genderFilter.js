/**
 * Kullanıcının cinsiyetine göre kombin önerilerinde (gardırop + web) karşı
 * cinsiyete ait parçaların önerilmesini engellemek için kullanılan yardımcılar.
 *
 * - Item.cinsiyet enum: 'Erkek' | 'Kadın' | 'Unisex' (varsayılan: 'Unisex')
 * - User.cinsiyet enum: 'Erkek' | 'Kadın' | 'Belirtilmemiş' (varsayılan: 'Belirtilmemiş')
 *
 * Kullanıcı cinsiyetini belirtmemişse (Belirtilmemiş) hiçbir filtre uygulanmaz —
 * mevcut davranış değişmez (geriye dönük uyumluluk).
 */

/**
 * Item.find() sorgusuna eklenecek MongoDB filtre parçasını döner.
 * - Erkek kullanıcı  -> 'Kadın' olarak işaretlenmiş parçalar hariç tutulur
 * - Kadın kullanıcı  -> 'Erkek' olarak işaretlenmiş parçalar hariç tutulur
 * - Belirtilmemiş    -> filtre yok ({})
 *
 * Not: `$ne` operatörü, `cinsiyet` alanı hiç set edilmemiş (eski) kayıtları da
 * eşleştirir (yani "Unisex" gibi davranırlar) — bu, mevcut gardıroplar için
 * geriye dönük uyumluluğu sağlar.
 *
 * @param {string} userCinsiyet - req.user.cinsiyet ('Erkek' | 'Kadın' | 'Belirtilmemiş')
 * @returns {Object} Mongo filtre parçası
 */
const getGenderItemFilter = (userCinsiyet) => {
    if (userCinsiyet === 'Erkek') return { cinsiyet: { $ne: 'Kadın' } };
    if (userCinsiyet === 'Kadın') return { cinsiyet: { $ne: 'Erkek' } };
    return {};
};

/**
 * Web ürün arama sorgusuna ("lacivert günlük yaz ayakkabı" gibi) eklenecek
 * cinsiyet terimini döner. Kullanıcı cinsiyetini belirtmemişse boş string
 * döner (arama sorgusu değişmez).
 *
 * @param {string} userCinsiyet - req.user.cinsiyet ('Erkek' | 'Kadın' | 'Belirtilmemiş')
 * @returns {string} 'erkek' | 'kadın' | ''
 */
const getGenderSearchTerm = (userCinsiyet) => {
    if (userCinsiyet === 'Erkek') return 'erkek';
    if (userCinsiyet === 'Kadın') return 'kadın';
    return '';
};

module.exports = { getGenderItemFilter, getGenderSearchTerm };
