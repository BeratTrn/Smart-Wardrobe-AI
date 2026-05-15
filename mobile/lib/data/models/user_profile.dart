class UserProfile {
  final String id;
  final String name;
  final String email;
  final String profilePhoto; // asset yolu, Cloudinary URL veya boş string
  final int totalItems;
  final int totalOutfits;
  final int totalFavorites;

  const UserProfile({
    required this.id,
    required this.name,
    required this.email,
    this.profilePhoto = '',
    required this.totalItems,
    required this.totalOutfits,
    required this.totalFavorites,
  });

  factory UserProfile.fromJson(Map<String, dynamic> j) => UserProfile(
    id: j['_id'] ?? '',
    name: j['kullaniciAdi'] ?? j['name'] ?? '',
    email: j['email'] ?? '',
    profilePhoto: j['profilFoto'] ?? j['profilePhoto'] ?? '',
    totalItems: j['toplamKiyafet'] ?? j['totalItems'] ?? 0,
    totalOutfits: j['toplamKombin'] ?? j['totalOutfits'] ?? 0,
    totalFavorites: j['toplamFavori'] ?? j['totalFavorites'] ?? 0,
  );

  UserProfile copyWith({
    String? id,
    String? name,
    String? email,
    String? profilePhoto,
    int? totalItems,
    int? totalOutfits,
    int? totalFavorites,
  }) => UserProfile(
    id: id ?? this.id,
    name: name ?? this.name,
    email: email ?? this.email,
    profilePhoto: profilePhoto ?? this.profilePhoto,
    totalItems: totalItems ?? this.totalItems,
    totalOutfits: totalOutfits ?? this.totalOutfits,
    totalFavorites: totalFavorites ?? this.totalFavorites,
  );
}
