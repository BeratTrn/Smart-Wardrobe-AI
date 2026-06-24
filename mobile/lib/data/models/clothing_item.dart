import 'package:easy_localization/easy_localization.dart';

class ClothingItem {
  final String id;
  final String name;
  final String category;
  final String? imageUrl;
  final String? color;
  final String? season;
  final String? stil;
  final String? marka;
  final String? notlar;
  final bool favori;
  final bool aiDogrulandi;

  const ClothingItem({
    required this.id,
    required this.name,
    required this.category,
    this.imageUrl,
    this.color,
    this.season,
    this.stil,
    this.marka,
    this.notlar,
    this.favori = false,
    this.aiDogrulandi = false,
  });

  // Backend'de `ad` alanı opsiyoneldir ve girilmediğinde `null` değil boş
  // string ('') olarak saklanır (bkz. backend/models/Item.js: default: '').
  // Bu yüzden `??` (sadece null'u yakalar) yeterli değildir — boş string de
  // varsayılana düşürülmeli, aksi halde dolapta isimsiz kıyafetler boş görünür.
  static String _nonEmptyOr(dynamic raw, String fallback) {
    if (raw is String && raw.trim().isNotEmpty) return raw;
    return fallback;
  }

  factory ClothingItem.fromJson(Map<String, dynamic> j) => ClothingItem(
        id:          j['_id']          ?? '',
        name:        _nonEmptyOr(j['ad'], _nonEmptyOr(j['name'], 'add_item.garment'.tr())),
        category:    j['kategori']     ?? j['category'] ?? '',
        imageUrl:    j['resimUrl']     ?? j['imageUrl'],
        color:       j['renk']         ?? j['color'],
        season:      j['mevsim']       ?? j['season'],
        stil:        j['stil'],
        marka:       j['marka'],
        notlar:      j['notlar'],
        favori:      j['favori']       ?? false,
        aiDogrulandi: j['aiDogrulandi'] ?? false,
      );

  ClothingItem copyWith({bool? favori}) => ClothingItem(
        id:          id,
        name:        name,
        category:    category,
        imageUrl:    imageUrl,
        color:       color,
        season:      season,
        stil:        stil,
        marka:       marka,
        notlar:      notlar,
        favori:      favori ?? this.favori,
        aiDogrulandi: aiDogrulandi,
      );
}