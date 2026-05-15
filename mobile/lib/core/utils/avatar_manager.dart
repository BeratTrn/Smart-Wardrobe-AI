/// Avatar varlıklarını ve profil fotoğrafı tipini yöneten yardımcı sınıf.
class AvatarManager {
  AvatarManager._();

  /// Uygulamaya gömülü tüm avatar varlıklarının yolları.
  static const List<String> all = [
    'assets/images/avatars/erkek_avatar_1.png',
    'assets/images/avatars/erkek_avatar_2.png',
    'assets/images/avatars/erkek_avatar_3.png',
    'assets/images/avatars/erkek_avatar_4.png',
    'assets/images/avatars/kiz_avatar_1.png',
    'assets/images/avatars/kiz_avatar_2.png',
    'assets/images/avatars/kiz_avatar_3.png',
    'assets/images/avatars/kiz_avatar_4.png',
  ];

  /// Yol bir uygulama varlığına mı işaret ediyor?
  static bool isAsset(String? path) =>
      path != null && path.startsWith('assets/');

  /// Yol bir ağ kaynağına mı (Cloudinary vb.) işaret ediyor?
  static bool isNetwork(String? path) =>
      path != null &&
      (path.startsWith('http://') || path.startsWith('https://'));

  /// Geçerli bir profil fotoğrafı var mı?
  static bool hasPhoto(String? path) => path != null && path.isNotEmpty;
}
