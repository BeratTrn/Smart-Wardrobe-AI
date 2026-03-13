class ClothingItem {
  final String id;
  final String name;
  final String category;
  final String? imageUrl;
  final String? color;
  final String? season;

  const ClothingItem({
    required this.id,
    required this.name,
    required this.category,
    this.imageUrl,
    this.color,
    this.season,
  });

  factory ClothingItem.fromJson(Map<String, dynamic> j) => ClothingItem(
        id:       j['_id']      ?? '',
        name:     j['ad']       ?? j['name']     ?? 'Kıyafet',
        category: j['kategori'] ?? j['category'] ?? '',
        imageUrl: j['resimUrl'] ?? j['imageUrl'],
        color:    j['renk']     ?? j['color'],
        season:   j['mevsim']   ?? j['season'],
      );
}