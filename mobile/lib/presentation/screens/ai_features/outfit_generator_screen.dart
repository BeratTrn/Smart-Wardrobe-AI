import 'dart:convert';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/core/theme/app_theme_extension.dart';
import 'package:smart_wardrobe_ai/data/models/clothing_item.dart';
import 'package:smart_wardrobe_ai/data/models/generated_outfit.dart';
import 'package:smart_wardrobe_ai/data/services/api_service.dart';
import 'package:smart_wardrobe_ai/presentation/screens/ai_features/try_on_screen.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/outfits/web_product_card.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_background.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_text_styles.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/wardrobe/app_filter_chip.dart';

class OutfitGeneratorScreen extends StatefulWidget {
  const OutfitGeneratorScreen({super.key});

  @override
  State<OutfitGeneratorScreen> createState() => _OutfitGeneratorScreenState();
}

class _OutfitGeneratorScreenState extends State<OutfitGeneratorScreen>
    with TickerProviderStateMixin {
  //  Filtre seçimleri
  String _occasion = 'outfit_generator.daily'.tr();
  String _weather = 'outfit_generator.warm'.tr();
  String _style = 'outfit_generator.casual'.tr();

  final List<String> _occasions = [
    'outfit_generator.daily'.tr(),
    'outfit_generator.work'.tr(),
    'outfit_generator.party'.tr(),
    'outfit_generator.sport'.tr(),
    'outfit_generator.romantic'.tr(),
    'outfit_generator.travel'.tr(),
  ];
  final List<String> _weathers = [
    'outfit_generator.hot'.tr(),
    'outfit_generator.warm'.tr(),
    'outfit_generator.cool'.tr(),
    'outfit_generator.cold'.tr(),
  ];
  final List<String> _styles = [
    'outfit_generator.casual'.tr(),
    'outfit_generator.classic'.tr(),
    'outfit_generator.sport'.tr(),
    'outfit_generator.street'.tr(),
    'outfit_generator.minimal'.tr(),
    'outfit_generator.chic'.tr(),
    'outfit_generator.formal'.tr(),
  ];

  //  State
  bool _generating = false;
  bool _hasGenerated = false;
  List<GeneratedOutfit> _outfits = [];
  // Web'in OutfitGeneratorPanel'indeki "Web'den öner" anahtarıyla aynı —
  // açıkken /outfits/web-recommend kullanılır (gardırop + web ürünleri).
  bool _webdenOner = false;

  //  Animasyonlar
  late final AnimationController _shimmerCtrl;
  late final AnimationController _resultCtrl;
  late final Animation<double> _shimmerAnim;
  late final Animation<double> _resultAnim;

  @override
  void initState() {
    super.initState();

    _shimmerCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
    _shimmerAnim = CurvedAnimation(parent: _shimmerCtrl, curve: Curves.linear);

    _resultCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _resultAnim = CurvedAnimation(parent: _resultCtrl, curve: Curves.easeOut);
  }

  @override
  void dispose() {
    _shimmerCtrl.dispose();
    _resultCtrl.dispose();
    super.dispose();
  }

  //  API: Kombin Oluştur

  Future<void> _generate() async {
    setState(() {
      _generating = true;
      _hasGenerated = true;
      _outfits = [];
    });
    _resultCtrl.reset();

    try {
      final outfit = await ApiService.instance.generateOutfit(
        etkinlik: _occasion,
        // sehir varsayılan olarak 'Istanbul'; gelecekte konum izni eklenebilir
        webdenOner: _webdenOner,
      );

      if (!mounted) return;

      setState(() {
        _outfits = [outfit];
        _generating = false;
      });
      _resultCtrl.forward();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _generating = false);
      _snack(e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _generating = false);
      _snack('outfit_generator.connection_error'.tr());
    }
  }

  //  API: Kombin Kaydet

  Future<void> _save(GeneratedOutfit outfit) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? '';

    try {
      final res = await http.post(
        Uri.parse('${ApiConstants.baseUrl}/kombinler/kaydet'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'kombinId': outfit.id}),
      );
      _snack(
        res.statusCode == 200
            ? 'outfit_generator.outfit_saved'.tr()
            : 'outfit_generator.outfit_not_saved'.tr(),
        isError: res.statusCode != 200,
      );
    } catch (_) {
      _snack('outfit_generator.connection_error'.tr());
    }
  }

  //  Navigasyon: Smart Lookbook

  void _onTryOn(GeneratedOutfit outfit) {
    Navigator.push(
      context,
      PageRouteBuilder(
        // outfit geçiriliyor → Lookbook kıyafetleri + stilist notunu gösterir
        pageBuilder: (_, animation, __) => TryOnScreen(outfit: outfit),
        transitionsBuilder: (_, animation, __, child) {
          // Aşağıdan yukarıya kayma geçişi
          final tween = Tween<Offset>(
            begin: const Offset(0, 1),
            end: Offset.zero,
          ).chain(CurveTween(curve: Curves.easeOutCubic));
          return SlideTransition(
            position: animation.drive(tween),
            child: child,
          );
        },
        transitionDuration: const Duration(milliseconds: 380),
      ),
    );
  }

  // Snackbar

  void _snack(String msg, {bool isError = true}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? AppColors.error : AppColors.success,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  // Build

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColorsExtension.of(context).bg,
      body: AppBackground(
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _Header(onBack: () => Navigator.pop(context)),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(22, 20, 22, 40),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // ── Filtreler
                      _FilterSection(
                        title: 'outfit_generator.status'.tr(),
                        options: _occasions,
                        selected: _occasion,
                        onSelect: (v) => setState(() => _occasion = v),
                      ),
                      const SizedBox(height: 18),
                      _FilterSection(
                        title: 'outfit_generator.weather'.tr(),
                        options: _weathers,
                        selected: _weather,
                        onSelect: (v) => setState(() => _weather = v),
                      ),
                      const SizedBox(height: 18),
                      _FilterSection(
                        title: 'outfit_generator.style'.tr(),
                        options: _styles,
                        selected: _style,
                        onSelect: (v) => setState(() => _style = v),
                      ),
                      const SizedBox(height: 18),

                      // ── Web'den öner anahtarı
                      _WebToggleRow(
                        value: _webdenOner,
                        onChanged: (v) => setState(() => _webdenOner = v),
                      ),
                      const SizedBox(height: 26),

                      // ── Generate butonu
                      _GenerateButton(
                        loading: _generating,
                        onTap: _generating ? null : _generate,
                      ),
                      const SizedBox(height: 26),

                      // ── Sonuçlar
                      if (_generating)
                        _ShimmerResults(anim: _shimmerAnim)
                      else if (_outfits.isNotEmpty)
                        _ResultList(
                          outfits: _outfits,
                          anim: _resultAnim,
                          onSave: _save,
                          onTryOn: _onTryOn,
                        )
                      else if (!_hasGenerated)
                        const _InitialHint(),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// HEADER

class _Header extends StatelessWidget {
  final VoidCallback onBack;
  const _Header({required this.onBack});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 16, 22, 0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'outfit_generator.outfit_upper'.tr(),
                  style: AppTextStyles.label.copyWith(letterSpacing: 2),
                ),
                const SizedBox(height: 2),
                Text(
                  'outfit_generator.outfit_generator'.tr(),
                  style: TextStyle(
                    fontFamily: 'Cormorant',
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    color: AppColorsExtension.of(context).text,
                  ),
                ),
                const SizedBox(height: 4),
                _AiBadge(),
              ],
            ),
          ),
          const SizedBox(width: 10),
          GestureDetector(
            onTap: onBack,
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColorsExtension.of(context).surface,
                shape: BoxShape.circle,
                border: Border.all(color: AppColorsExtension.of(context).border),
              ),
              child: Icon(
                Icons.close_rounded,
                color: AppColorsExtension.of(context).textSub,
                size: 20,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AiBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(
      gradient: LinearGradient(
        colors: [
          AppColors.gold.withValues(alpha: .18),
          AppColors.goldLight.withValues(alpha: .08),
        ],
      ),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: AppColors.gold.withValues(alpha: .3)),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(
          Icons.auto_awesome_rounded,
          color: AppColors.goldLight,
          size: 13,
        ),
        const SizedBox(width: 5),
        Text(
          'AI Engine',
          style: AppTextStyles.label.copyWith(
            color: AppColors.goldLight,
            fontSize: 11,
          ),
        ),
      ],
    ),
  );
}

// FILTER SECTION

class _FilterSection extends StatelessWidget {
  final String title;
  final List<String> options;
  final String selected;
  final ValueChanged<String> onSelect;

  const _FilterSection({
    required this.title,
    required this.options,
    required this.selected,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: AppTextStyles.label.copyWith(letterSpacing: 1.5)),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: options
              .map(
                (o) => AppFilterChip(
                  label: o,
                  selected: selected == o,
                  onTap: () => onSelect(o),
                ),
              )
              .toList(),
        ),
      ],
    );
  }
}

// WEB'DEN ÖNER ANAHTARI

class _WebToggleRow extends StatelessWidget {
  final bool value;
  final ValueChanged<bool> onChanged;

  const _WebToggleRow({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
      decoration: BoxDecoration(
        color: value ? AppColors.gold.withValues(alpha: .06) : AppColorsExtension.of(context).surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: value
              ? AppColors.gold.withValues(alpha: .35)
              : AppColorsExtension.of(context).border,
          width: value ? 1.0 : .8,
        ),
      ),
      child: Row(
        children: [
          // İkon
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: value ? AppColors.gold.withValues(alpha: .15) : AppColorsExtension.of(context).bg,
              borderRadius: BorderRadius.circular(11),
              border: Border.all(
                color: value
                    ? AppColors.gold.withValues(alpha: .35)
                    : AppColorsExtension.of(context).border,
              ),
            ),
            child: Icon(
              Icons.public_rounded,
              color: value ? AppColors.goldLight : AppColorsExtension.of(context).muted,
              size: 18,
            ),
          ),
          const SizedBox(width: 14),

          // Metin
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'outfit_generator.suggest_from_web'.tr(),
                  style: TextStyle(
                    color: value ? AppColorsExtension.of(context).text : AppColorsExtension.of(context).muted,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  'outfit_generator.suggest_from_web_desc'.tr(),
                  style: TextStyle(
                    color: AppColorsExtension.of(context).muted,
                    fontSize: 11,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),

          // Anahtar
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: AppColors.gold,
            activeTrackColor: AppColors.gold.withValues(alpha: .3),
            inactiveThumbColor: AppColorsExtension.of(context).muted,
            inactiveTrackColor: AppColorsExtension.of(context).border,
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
        ],
      ),
    );
  }
}

// GENERATE BUTTON

class _GenerateButton extends StatelessWidget {
  final bool loading;
  final VoidCallback? onTap;

  const _GenerateButton({required this.loading, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 56,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppColors.gold, AppColors.goldLight],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: AppColors.gold.withValues(alpha: .4),
              blurRadius: 20,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Center(
          child: loading
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.black,
                  ),
                )
              : Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.auto_awesome_rounded,
                      color: Colors.black,
                      size: 19,
                    ),
                    SizedBox(width: 8),
                    Text(
                      'outfit_generator.create_outfit'.tr(),
                      style: TextStyle(
                        color: Colors.black,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        letterSpacing: .4,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}

// RESULT LIST

class _ResultList extends StatelessWidget {
  final List<GeneratedOutfit> outfits;
  final Animation<double> anim;
  final ValueChanged<GeneratedOutfit> onSave;
  final ValueChanged<GeneratedOutfit> onTryOn; // ← YENİ

  const _ResultList({
    required this.outfits,
    required this.anim,
    required this.onSave,
    required this.onTryOn,
  });

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: anim,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'outfit_generator.recommended_outfit'.tr(),
                style: TextStyle(
                  color: AppColorsExtension.of(context).text,
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              Text(
                '${outfits.length} ' + 'outfit_generator.outfit'.tr(),
                style: AppTextStyles.caption,
              ),
            ],
          ),
          const SizedBox(height: 14),
          ...outfits.map(
            (o) => Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: _OutfitCard(
                outfit: o,
                onSave: () => onSave(o),
                onTryOn: () => onTryOn(o), // ← YENİ
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// OUTFIT CARD

class _OutfitCard extends StatelessWidget {
  final GeneratedOutfit outfit;
  final VoidCallback onSave;
  final VoidCallback onTryOn; // ← YENİ

  const _OutfitCard({
    required this.outfit,
    required this.onSave,
    required this.onTryOn,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColorsExtension.of(context).card,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColorsExtension.of(context).border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Görsel satırı (sabit küçük boy — az parça olsa da büyümez)
          if (outfit.items.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: outfit.items
                    .take(3)
                    .map(
                      (item) => Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: SizedBox(
                          width: 84,
                          child: _ItemThumbnail(item: item),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),

          // Bilgi satırı
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 4),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        outfit.occasion,
                        style: TextStyle(
                          color: AppColorsExtension.of(context).text,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (outfit.description.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          outfit.description,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          style: AppTextStyles.caption.copyWith(height: 1.4),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Stil ipucu (varsa)
          if (outfit.ipucu.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.lightbulb_outline_rounded,
                    color: AppColors.gold,
                    size: 14,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      outfit.ipucu,
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.gold,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // Web'den önerilen ürünler (varsa)
          if (outfit.disUrunler.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
              child: WebProductsSection(products: outfit.disUrunler),
            ),

          // "Üzerinde Dene" butonu
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
            child: GestureDetector(
              onTap: onTryOn,
              child: Container(
                height: 48,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.gold, AppColors.goldLight],
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                  ),
                  borderRadius: BorderRadius.circular(13),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.gold.withValues(alpha: .35),
                      blurRadius: 14,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.person_search_rounded,
                      color: Colors.black,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'outfit_generator.try_on'.tr(),
                      style: TextStyle(
                        color: Colors.black,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        letterSpacing: .3,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ItemThumbnail extends StatelessWidget {
  final ClothingItem item;
  const _ItemThumbnail({required this.item});

  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(10),
    child: AspectRatio(
      aspectRatio: .85,
      child: item.imageUrl != null
          ? Image.network(
              item.imageUrl!,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => _ThumbPlaceholder(),
            )
          : _ThumbPlaceholder(),
    ),
  );
}

class _ThumbPlaceholder extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    color: AppColorsExtension.of(context).surface,
    child: Icon(
      Icons.checkroom_outlined,
      color: AppColorsExtension.of(context).muted,
      size: 22,
    ),
  );
}

// SHIMMER İSKELET

class _ShimmerResults extends StatelessWidget {
  final Animation<double> anim;
  const _ShimmerResults({required this.anim});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _ShimmerCard(anim: anim),
        const SizedBox(height: 14),
        _ShimmerCard(anim: anim),
      ],
    );
  }
}

class _ShimmerCard extends StatelessWidget {
  final Animation<double> anim;
  const _ShimmerCard({required this.anim});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: anim,
      builder: (_, __) => Container(
        height: 170,
        decoration: BoxDecoration(
          color: Color.lerp(AppColorsExtension.of(context).surface, AppColorsExtension.of(context).border, anim.value),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColorsExtension.of(context).border),
        ),
      ),
    );
  }
}

// İLK AÇILIŞ İPUCU

class _InitialHint extends StatelessWidget {
  const _InitialHint();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColorsExtension.of(context).surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColorsExtension.of(context).border),
      ),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: AppColors.gold.withValues(alpha: .1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.lightbulb_outline_rounded,
              color: AppColors.gold,
              size: 21,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              'outfit_generator.select_condition'.tr(),
              style: TextStyle(
                color: AppColorsExtension.of(context).textSub,
                fontSize: 13,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
