import 'package:smart_wardrobe_ai/data/models/clothing_item.dart';

/// Backend /api/saved-outfits yanıtındaki tek bir kayıtlı kombini temsil eder.
/// kiyafetler, backend tarafından populate edilmiş tam ClothingItem nesneleridir.
class SavedOutfit {
  final String id;
  final String baslik;
  final String aciklama;
  final String ipucu;
  final WeatherContext? havaDurumu;
  final List<ClothingItem> kiyafetler;
  final String kullaniciFoto;
  final DateTime? createdAt;

  const SavedOutfit({
    required this.id,
    required this.baslik,
    required this.aciklama,
    this.ipucu = '',
    this.havaDurumu,
    this.kiyafetler = const [],
    this.kullaniciFoto = '',
    this.createdAt,
  });

  factory SavedOutfit.fromJson(Map<String, dynamic> j) {
    final hw = j['havaDurumu'] as Map<String, dynamic>?;
    return SavedOutfit(
      id: j['_id'] as String? ?? '',
      baslik: j['baslik'] as String? ?? '',
      aciklama: j['aciklama'] as String? ?? '',
      ipucu: j['ipucu'] as String? ?? '',
      havaDurumu: hw != null ? WeatherContext.fromJson(hw) : null,
      kiyafetler: ((j['kiyafetler']) as List? ?? [])
          .map((e) => ClothingItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      kullaniciFoto: j['kullaniciFoto'] as String? ?? '',
      createdAt: j['createdAt'] != null
          ? DateTime.tryParse(j['createdAt'] as String)
          : null,
    );
  }
}

class WeatherContext {
  final double? sicaklik;
  final String? durum;
  final String? konum;

  const WeatherContext({this.sicaklik, this.durum, this.konum});

  factory WeatherContext.fromJson(Map<String, dynamic> j) => WeatherContext(
        sicaklik: (j['sicaklik'] as num?)?.toDouble(),
        durum: j['durum'] as String?,
        konum: j['konum'] as String?,
      );
}
