class UserProfile {
  final String id;
  final String name;
  final String email;
  final int totalItems;
  final int totalOutfits;
  final int totalFavorites;

  const UserProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.totalItems,
    required this.totalOutfits,
    required this.totalFavorites,
  });

  factory UserProfile.fromJson(Map<String, dynamic> j) => UserProfile(
    id: j['_id'] ?? '',
    name: j['kullaniciAdi'] ?? j['name'] ?? '',
    email: j['email'] ?? '',
    totalItems: j['toplamKiyafet'] ?? j['totalItems'] ?? 0,
    totalOutfits: j['toplamKombin'] ?? j['totalOutfits'] ?? 0,
    totalFavorites: j['toplamFavori'] ?? j['totalFavorites'] ?? 0,
  );
}
