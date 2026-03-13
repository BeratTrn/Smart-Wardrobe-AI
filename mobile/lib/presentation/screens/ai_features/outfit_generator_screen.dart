import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/data/models/clothing_item.dart';
import 'package:smart_wardrobe_ai/data/models/generated_outfit.dart';
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
  // Filtre seçimleri
  String _occasion = 'Günlük';
  String _weather = 'Ilık';
  String _style = 'Casual';

  static const _occasions = [
    'Günlük',
    'İş',
    'Parti',
    'Spor',
    'Romantik',
    'Seyahat',
  ];
  static const _weathers = ['Sıcak', 'Ilık', 'Serin', 'Soğuk'];
  static const _styles = ['Casual', 'Minimal', 'Klasik', 'Sokak', 'Spor'];

  bool _generating = false;
  bool _hasGenerated = false;
  List<GeneratedOutfit> _outfits = [];

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

  // API
  Future<void> _generate() async {
    setState(() {
      _generating = true;
      _hasGenerated = true;
      _outfits = [];
    });
    _resultCtrl.reset();

    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? '';

    try {
      final res = await http
          .post(
            Uri.parse('${ApiConstants.baseUrl}/kombinler/olustur'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode({
              'durum': _occasion,
              'hava': _weather,
              'stil': _style,
            }),
          )
          .timeout(const Duration(seconds: 30));

      if (!mounted) return;

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final raw = data['kombinler'] ?? data['outfits'] ?? [data];
        setState(() {
          _outfits = (raw as List)
              .map((e) => GeneratedOutfit.fromJson(e))
              .toList();
          _generating = false;
        });
        _resultCtrl.forward();
      } else {
        setState(() => _generating = false);
        _snack('Kombin oluşturulamadı.');
      }
    } catch (_) {
      if (mounted) {
        setState(() => _generating = false);
        _snack('Sunucuya bağlanılamadı.');
      }
    }
  }

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
        res.statusCode == 200 ? 'Kombin kaydedildi ✓' : 'Kaydedilemedi.',
        isError: res.statusCode != 200,
      );
    } catch (_) {
      _snack('Sunucuya bağlanılamadı.');
    }
  }

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

  // build
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
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
                      // Filtreler
                      _FilterSection(
                        title: 'DURUM',
                        options: _occasions,
                        selected: _occasion,
                        onSelect: (v) => setState(() => _occasion = v),
                      ),
                      const SizedBox(height: 18),
                      _FilterSection(
                        title: 'HAVA',
                        options: _weathers,
                        selected: _weather,
                        onSelect: (v) => setState(() => _weather = v),
                      ),
                      const SizedBox(height: 18),
                      _FilterSection(
                        title: 'STİL',
                        options: _styles,
                        selected: _style,
                        onSelect: (v) => setState(() => _style = v),
                      ),
                      const SizedBox(height: 26),

                      // Generate butonu
                      _GenerateButton(
                        loading: _generating,
                        onTap: _generating ? null : _generate,
                      ),
                      const SizedBox(height: 26),

                      // Sonuçlar
                      if (_generating)
                        _ShimmerResults(anim: _shimmerAnim)
                      else if (_outfits.isNotEmpty)
                        _ResultList(
                          outfits: _outfits,
                          anim: _resultAnim,
                          onSave: _save,
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
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'KOMBİN',
                style: AppTextStyles.label.copyWith(letterSpacing: 2),
              ),
              const SizedBox(height: 2),
              const Text(
                'AI Kombin Üretici',
                style: TextStyle(
                  fontFamily: 'Cormorant',
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  color: AppColors.text,
                ),
              ),
            ],
          ),
          const Spacer(),
          _AiBadge(),
          const SizedBox(width: 10),
          GestureDetector(
            onTap: onBack,
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.surface,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.border),
              ),
              child: const Icon(
                Icons.close_rounded,
                color: AppColors.textSub,
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
          AppColors.gold.withOpacity(.18),
          AppColors.goldLight.withOpacity(.08),
        ],
      ),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: AppColors.gold.withOpacity(.3)),
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
          'GPT-4o',
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
              color: AppColors.gold.withOpacity(.4),
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
              : const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.auto_awesome_rounded,
                      color: Colors.black,
                      size: 19,
                    ),
                    SizedBox(width: 8),
                    Text(
                      'Kombin Oluştur',
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

  const _ResultList({
    required this.outfits,
    required this.anim,
    required this.onSave,
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
              const Text(
                'Önerilen Kombinler',
                style: TextStyle(
                  color: AppColors.text,
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              Text('${outfits.length} kombin', style: AppTextStyles.caption),
            ],
          ),
          const SizedBox(height: 14),
          ...outfits.map(
            (o) => Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: _OutfitCard(outfit: o, onSave: () => onSave(o)),
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

  const _OutfitCard({required this.outfit, required this.onSave});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Görsel satırı
          if (outfit.items.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
              child: Row(
                children: outfit.items
                    .take(3)
                    .map(
                      (item) => Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: _ItemThumbnail(item: item),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),

          // Bilgi satırı
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        outfit.occasion,
                        style: const TextStyle(
                          color: AppColors.text,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (outfit.description.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          outfit.description,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: AppTextStyles.caption.copyWith(height: 1.4),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                GestureDetector(
                  onTap: onSave,
                  child: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: AppColors.gold.withOpacity(.12),
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.gold.withOpacity(.3)),
                    ),
                    child: const Icon(
                      Icons.bookmark_border_rounded,
                      color: AppColors.gold,
                      size: 19,
                    ),
                  ),
                ),
              ],
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
    color: AppColors.surface,
    child: const Icon(
      Icons.checkroom_outlined,
      color: AppColors.muted,
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
          color: Color.lerp(AppColors.surface, AppColors.border, anim.value),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border),
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
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: AppColors.gold.withOpacity(.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.lightbulb_outline_rounded,
              color: AppColors.gold,
              size: 21,
            ),
          ),
          const SizedBox(width: 14),
          const Expanded(
            child: Text(
              'Durum, hava ve stilini seç — AI dolabından senin için en uygun kombinleri seçsin.',
              style: TextStyle(
                color: AppColors.textSub,
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
