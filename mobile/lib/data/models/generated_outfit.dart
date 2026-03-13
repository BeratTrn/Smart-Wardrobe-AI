import 'package:smart_wardrobe_ai/data/models/clothing_item.dart';

class GeneratedOutfit {
  final String id;
  final String occasion;
  final String description;
  final List<ClothingItem> items;

  const GeneratedOutfit({
    required this.id,
    required this.occasion,
    required this.description,
    required this.items,
  });

  factory GeneratedOutfit.fromJson(Map<String, dynamic> j) => GeneratedOutfit(
    id: j['_id'] ?? DateTime.now().millisecondsSinceEpoch.toString(),
    occasion: j['durum'] ?? j['occasion'] ?? '',
    description: j['aciklama'] ?? j['description'] ?? '',
    items: ((j['parcalar'] ?? j['items']) as List? ?? [])
        .map((e) => ClothingItem.fromJson(e as Map<String, dynamic>))
        .toList(),
  );
}