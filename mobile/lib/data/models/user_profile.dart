class UserProfile {
  final String id;
  final String name;
  final String email;
  final String profilePhoto; // asset yolu, Cloudinary URL veya boş string
  final int totalItems;
  final int totalOutfits;
  final int totalFavorites;
  // Kombin önerilerinde (gardırop + web) cinsiyete uygun olmayan parçaları
  // filtrelemek için kullanılır. 'Erkek' | 'Kadın' | 'Belirtilmemiş'
  final String cinsiyet;
  // AI Stil Danışmanı'nın hitap tonu. 'professional' | 'friendly' | 'harsh' | ''
  // (boş = kullanıcı hiç seçmemiş, varsayılan davranışta 'friendly' gibi davranılır)
  final String stilTonu;
  // Vücut şekli: 'kum_saati' | 'armut' | 'ters_ucgen' | 'dikdortgen' | ''
  final String vucutSekli;
  // Kalıp tercihi: 'slim' | 'regular' | 'oversize' | ''
  final String vucutKalip;

  const UserProfile({
    required this.id,
    required this.name,
    required this.email,
    this.profilePhoto = '',
    required this.totalItems,
    required this.totalOutfits,
    required this.totalFavorites,
    this.cinsiyet = 'Belirtilmemiş',
    this.stilTonu = '',
    this.vucutSekli = '',
    this.vucutKalip = '',
  });

  factory UserProfile.fromJson(Map<String, dynamic> j) {
    final vucut = j['vucut'] as Map<String, dynamic>?;
    return UserProfile(
      id: j['_id'] ?? '',
      name: j['kullaniciAdi'] ?? j['name'] ?? '',
      email: j['email'] ?? '',
      profilePhoto: j['profilFoto'] ?? j['profilePhoto'] ?? '',
      totalItems: j['toplamKiyafet'] ?? j['totalItems'] ?? 0,
      totalOutfits: j['toplamKombin'] ?? j['totalOutfits'] ?? 0,
      totalFavorites: j['toplamFavori'] ?? j['totalFavorites'] ?? 0,
      cinsiyet: j['cinsiyet'] ?? 'Belirtilmemiş',
      stilTonu: j['stilTonu'] ?? '',
      vucutSekli: vucut?['sekil'] ?? '',
      vucutKalip: vucut?['kalip'] ?? '',
    );
  }

  UserProfile copyWith({
    String? id,
    String? name,
    String? email,
    String? profilePhoto,
    int? totalItems,
    int? totalOutfits,
    int? totalFavorites,
    String? cinsiyet,
    String? stilTonu,
    String? vucutSekli,
    String? vucutKalip,
  }) => UserProfile(
    id: id ?? this.id,
    name: name ?? this.name,
    email: email ?? this.email,
    profilePhoto: profilePhoto ?? this.profilePhoto,
    totalItems: totalItems ?? this.totalItems,
    totalOutfits: totalOutfits ?? this.totalOutfits,
    totalFavorites: totalFavorites ?? this.totalFavorites,
    cinsiyet: cinsiyet ?? this.cinsiyet,
    stilTonu: stilTonu ?? this.stilTonu,
    vucutSekli: vucutSekli ?? this.vucutSekli,
    vucutKalip: vucutKalip ?? this.vucutKalip,
  );
}
