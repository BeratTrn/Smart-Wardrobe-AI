/// "Webden Kombin Öner" özelliğinde AI'ın gardırop dışından (web araması ile)
/// seçtiği bir ürünü temsil eder. Backend'deki Outfit/SavedOutfit modellerinin
/// `disUrunler` alanıyla birebir eşleşir (bkz. backend/models/SavedOutfit.js).
class WebProduct {
  final String ad;
  final String resimUrl;
  final String link;
  final double? fiyat;
  final String kaynak;

  const WebProduct({
    required this.ad,
    required this.resimUrl,
    required this.link,
    this.fiyat,
    this.kaynak = '',
  });

  factory WebProduct.fromJson(Map<String, dynamic> j) => WebProduct(
    ad: j['ad'] as String? ?? '',
    resimUrl: j['resimUrl'] as String? ?? '',
    link: j['link'] as String? ?? '',
    fiyat: (j['fiyat'] as num?)?.toDouble(),
    kaynak: j['kaynak'] as String? ?? '',
  );

  static List<WebProduct> listFromJson(dynamic raw) =>
      ((raw as List?) ?? [])
          .map((e) => WebProduct.fromJson(e as Map<String, dynamic>))
          .toList();

  Map<String, dynamic> toJson() => {
    'ad': ad,
    'resimUrl': resimUrl,
    'link': link,
    'fiyat': fiyat,
    'kaynak': kaynak,
  };
}
