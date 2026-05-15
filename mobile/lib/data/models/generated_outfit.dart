import 'package:smart_wardrobe_ai/data/models/clothing_item.dart';

class GeneratedOutfit {
  final String id;
  final String occasion;   // baslik / etkinlik
  final String description; // aciklama
  final String ipucu;       // AI style tip
  final List<ClothingItem> items;

  const GeneratedOutfit({
    required this.id,
    required this.occasion,
    required this.description,
    this.ipucu = '',
    required this.items,
  });

  factory GeneratedOutfit.fromJson(Map<String, dynamic> j) => GeneratedOutfit(
    // Backend /api/outfits/recommend returns 'id'; older paths use '_id'
    id: j['id'] as String? ??
        j['_id'] as String? ??
        DateTime.now().millisecondsSinceEpoch.toString(),
    // Accept 'baslik' (new), 'etkinlik', 'durum', 'occasion' (legacy)
    occasion: j['baslik'] as String? ??
        j['etkinlik'] as String? ??
        j['durum'] as String? ??
        j['occasion'] as String? ??
        '',
    description: j['aciklama'] as String? ?? j['description'] as String? ?? '',
    ipucu: j['ipucu'] as String? ?? '',
    items: ((j['kiyafetler'] ?? j['parcalar'] ?? j['items']) as List? ?? [])
        .map((e) => ClothingItem.fromJson(e as Map<String, dynamic>))
        .toList(),
  );
}
