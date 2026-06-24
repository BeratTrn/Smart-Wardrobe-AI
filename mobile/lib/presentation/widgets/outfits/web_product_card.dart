//  WEB'DEN ÖNERİLEN ÜRÜN KARTI
//  "Web'den öner" özelliği ile AI'ın gardırop dışından seçtiği ürünleri
//  gösterir (görsel, isim, fiyat, "Satın Al"). Hem AI Kombin Üretici sonuç
//  ekranında hem de Stil Arşivi'ndeki kayıtlı kombinlerde kullanılır — web
//  uygulamasındaki WebProductCard ile aynı tasarım/davranış.

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/core/theme/app_theme_extension.dart';
import 'package:smart_wardrobe_ai/data/models/web_product.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_text_styles.dart';

/// "Web'den Öneriler" başlığı + en fazla 2 ürün kartından oluşan bölüm.
/// Kartlar sabit (küçük) genişliktedir — 1 ürün önerildiğinde dahi tüm satır
/// genişliğine gerilip orantısız büyümez (web'deki kompakt gösterimle aynı).
class WebProductsSection extends StatelessWidget {
  final List<WebProduct> products;
  const WebProductsSection({super.key, required this.products});

  @override
  Widget build(BuildContext context) {
    if (products.isEmpty) return const SizedBox.shrink();
    final shown = products.take(2).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(
              Icons.shopping_bag_outlined,
              color: AppColors.gold,
              size: 13,
            ),
            const SizedBox(width: 6),
            Text(
              'outfit_generator.web_suggestions'.tr().toUpperCase(),
              style: AppTextStyles.label.copyWith(letterSpacing: 1.5),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (var i = 0; i < shown.length; i++)
              Padding(
                padding: EdgeInsets.only(right: i == shown.length - 1 ? 0 : 8),
                child: WebProductCard(product: shown[i]),
              ),
          ],
        ),
      ],
    );
  }
}

/// Tek bir web ürünü kartı — dokununca harici tarayıcıda ürün sayfasını açar.
class WebProductCard extends StatelessWidget {
  final WebProduct product;
  const WebProductCard({super.key, required this.product});

  String? get _fiyatMetni {
    final f = product.fiyat;
    if (f == null) return null;
    return '${f.toStringAsFixed(0)} TL';
  }

  Future<void> _open() async {
    if (product.link.isEmpty) return;
    final uri = Uri.tryParse(product.link);
    if (uri == null) return;
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      // Bağlantı açılamazsa sessizce yoksay — kritik olmayan bir aksiyon
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _open,
      child: Container(
        // Sabit genişlik — tek ürün önerildiğinde dahi satırın tamamını
        // doldurup orantısız büyümesini önler.
        width: 126,
        decoration: BoxDecoration(
          color: AppColorsExtension.of(context).surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColorsExtension.of(context).border),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                AspectRatio(
                  aspectRatio: 1,
                  child: product.resimUrl.isNotEmpty
                      ? Image.network(
                          product.resimUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const _WebProductPlaceholder(),
                        )
                      : const _WebProductPlaceholder(),
                ),
                Positioned(
                  top: 6,
                  left: 6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColorsExtension.of(context).bg.withValues(alpha: .55),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.gold.withValues(alpha: .4)),
                    ),
                    child: Text(
                      '🔗 ' + 'outfit_generator.try_this_too'.tr(),
                      style: const TextStyle(
                        color: AppColors.goldLight,
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(9, 7, 9, 9),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.ad,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: AppColorsExtension.of(context).text,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          _fiyatMetni ?? product.kaynak,
                          style: TextStyle(
                            color: _fiyatMetni != null ? AppColors.gold : AppColorsExtension.of(context).muted,
                            fontSize: _fiyatMetni != null ? 12 : 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      Icon(
                        Icons.north_east_rounded,
                        color: AppColorsExtension.of(context).muted,
                        size: 11,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WebProductPlaceholder extends StatelessWidget {
  const _WebProductPlaceholder();

  @override
  Widget build(BuildContext context) => Container(
    color: AppColorsExtension.of(context).bg,
    child: Icon(
      Icons.shopping_bag_outlined,
      color: AppColorsExtension.of(context).muted,
      size: 20,
    ),
  );
}
