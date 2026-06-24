import 'package:smart_wardrobe_ai/data/models/clothing_item.dart';

/// Backend /api/travel yanıtındaki tek bir seyahat bavulunu temsil eder.
/// onerilenkiyafetler, backend tarafından populate edilmiş ClothingItem listesidir.
class TravelSuitcase {
  final String id;
  final String sehir;
  final DateTime baslangicTarihi;
  final DateTime bitisTarihi;
  final int gunSayisi;
  final String havaDurumuOzeti;
  final double? havaSicakligi;
  final String havaIkonu;
  final bool tahminiHava;
  final List<ClothingItem> onerilenkiyafetler;
  final String aiAciklamasi;
  final String aiIpucu;
  final DateTime? createdAt;

  const TravelSuitcase({
    required this.id,
    required this.sehir,
    required this.baslangicTarihi,
    required this.bitisTarihi,
    required this.gunSayisi,
    required this.havaDurumuOzeti,
    this.havaSicakligi,
    required this.havaIkonu,
    required this.tahminiHava,
    required this.onerilenkiyafetler,
    required this.aiAciklamasi,
    required this.aiIpucu,
    this.createdAt,
  });

  factory TravelSuitcase.fromJson(Map<String, dynamic> j) => TravelSuitcase(
        id: j['_id'] as String? ?? '',
        sehir: j['sehir'] as String? ?? '',
        baslangicTarihi:
            DateTime.tryParse(j['baslangicTarihi'] as String? ?? '') ??
                DateTime.now(),
        bitisTarihi:
            DateTime.tryParse(j['bitisTarihi'] as String? ?? '') ??
                DateTime.now(),
        gunSayisi: (j['gunSayisi'] as num?)?.toInt() ?? 1,
        havaDurumuOzeti: j['havaDurumuOzeti'] as String? ?? '',
        havaSicakligi: (j['havaSicakligi'] as num?)?.toDouble(),
        havaIkonu: j['havaIkonu'] as String? ?? '01d',
        tahminiHava: j['tahminiHava'] as bool? ?? false,
        onerilenkiyafetler:
            ((j['onerilenkiyafetler']) as List? ?? [])
                .map((e) => ClothingItem.fromJson(e as Map<String, dynamic>))
                .toList(),
        aiAciklamasi: j['aiAciklamasi'] as String? ?? '',
        aiIpucu: j['aiIpucu'] as String? ?? '',
        createdAt: j['createdAt'] != null
            ? DateTime.tryParse(j['createdAt'] as String)
            : null,
      );
}
