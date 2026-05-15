import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/data/models/clothing_item.dart';

class ItemDetailScreen extends StatefulWidget {
  final ClothingItem item;
  const ItemDetailScreen({super.key, required this.item});

  @override
  State<ItemDetailScreen> createState() => _ItemDetailScreenState();
}

class _ItemDetailScreenState extends State<ItemDetailScreen>
    with SingleTickerProviderStateMixin {
  late bool _isFav;
  bool _toggling = false;

  late final AnimationController _heroCtrl;
  late final Animation<double> _heroAnim;

  @override
  void initState() {
    super.initState();
    _isFav = widget.item.favori;
    _heroCtrl =
        AnimationController(vsync: this, duration: const Duration(milliseconds: 800))
          ..forward();
    _heroAnim = CurvedAnimation(parent: _heroCtrl, curve: Curves.easeOutCubic);
  }

  @override
  void dispose() {
    _heroCtrl.dispose();
    super.dispose();
  }

  Future<void> _toggleFavorite() async {
    if (_toggling) return;
    setState(() => _toggling = true);
    HapticFeedback.lightImpact();
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? '';
    try {
      final res = await http.patch(
        Uri.parse('${ApiConstants.baseUrl}/items/${widget.item.id}/favorite'),
        headers: {'Authorization': 'Bearer $token'},
      ).timeout(const Duration(seconds: 6));
      if (!mounted) return;
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        setState(() => _isFav = body['favori'] as bool);
        HapticFeedback.selectionClick();
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Bağlantı hatası'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _toggling = false);
    }
  }

  Color get _accentColor => _catColor(widget.item.category);

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    return Scaffold(
      backgroundColor: AppColors.bg,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: GestureDetector(
          onTap: () => Navigator.pop(context, _isFav != widget.item.favori ? _isFav : null),
          child: Container(
            margin: const EdgeInsets.only(left: 16),
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.bg.withValues(alpha: .7),
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.border),
            ),
            child: const Icon(Icons.arrow_back_ios_new_rounded,
                color: AppColors.text, size: 18),
          ),
        ),
        actions: [
          GestureDetector(
            onTap: _toggleFavorite,
            child: Container(
              margin: const EdgeInsets.only(right: 16),
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: _isFav
                    ? const Color(0xFFE05C5C).withValues(alpha: .15)
                    : AppColors.bg.withValues(alpha: .7),
                shape: BoxShape.circle,
                border: Border.all(
                  color: _isFav
                      ? const Color(0xFFE05C5C).withValues(alpha: .5)
                      : AppColors.border,
                ),
              ),
              child: _toggling
                  ? const Padding(
                      padding: EdgeInsets.all(12),
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Color(0xFFE05C5C)),
                    )
                  : AnimatedSwitcher(
                      duration: const Duration(milliseconds: 300),
                      transitionBuilder: (child, anim) =>
                          ScaleTransition(scale: anim, child: child),
                      child: Icon(
                        _isFav
                            ? Icons.favorite_rounded
                            : Icons.favorite_border_rounded,
                        key: ValueKey(_isFav),
                        color: _isFav
                            ? const Color(0xFFE05C5C)
                            : AppColors.muted,
                        size: 22,
                      ),
                    ),
            ),
          ),
        ],
      ),
      body: FadeTransition(
        opacity: _heroAnim,
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Hero Görsel ───────────────────────────────────
              _HeroImage(item: item, accentColor: _accentColor),

              // ── İçerik ───────────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(22, 24, 22, 40),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Kategori badge + AI onay
                    Row(
                      children: [
                        _CategoryBadge(
                            label: item.category, color: _accentColor),
                        if (item.aiDogrulandi) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 9, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.gold.withValues(alpha: .12),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                  color: AppColors.gold.withValues(alpha: .3)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.auto_awesome_rounded,
                                    color: AppColors.gold, size: 11),
                                const SizedBox(width: 4),
                                Text(
                                  'AI Onaylı',
                                  style: TextStyle(
                                    color: AppColors.gold,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                    letterSpacing: .5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),

                    const SizedBox(height: 14),

                    // İsim
                    Text(
                      item.name,
                      style: const TextStyle(
                        fontFamily: 'Cormorant',
                        fontSize: 32,
                        fontWeight: FontWeight.w700,
                        color: AppColors.text,
                        height: 1.1,
                      ),
                    ),

                    if (item.marka != null && item.marka!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        item.marka!,
                        style: const TextStyle(
                            color: AppColors.muted,
                            fontSize: 13,
                            letterSpacing: .5),
                      ),
                    ],

                    const SizedBox(height: 28),

                    // ── Detay Kartları ────────────────────────
                    _DetailGrid(item: item, accentColor: _accentColor),

                    // Notlar
                    if (item.notlar != null && item.notlar!.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      _NotlarCard(notlar: item.notlar!),
                    ],

                    const SizedBox(height: 28),

                    // ── Favori Butonu ─────────────────────────
                    GestureDetector(
                      onTap: _toggleFavorite,
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        width: double.infinity,
                        height: 54,
                        decoration: BoxDecoration(
                          gradient: _isFav
                              ? const LinearGradient(colors: [
                                  Color(0xFFE05C5C),
                                  Color(0xFFB03A3A),
                                ])
                              : null,
                          color: _isFav ? null : AppColors.surface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: _isFav
                                ? Colors.transparent
                                : AppColors.border,
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              _isFav
                                  ? Icons.favorite_rounded
                                  : Icons.favorite_border_rounded,
                              color: _isFav ? Colors.white : AppColors.muted,
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              _isFav
                                  ? 'Favorilerden Çıkar'
                                  : 'Favorilere Ekle',
                              style: TextStyle(
                                color: _isFav ? Colors.white : AppColors.textSub,
                                fontWeight: FontWeight.w600,
                                fontSize: 15,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Hero Görsel Widget ────────────────────────────────────────────────────────
class _HeroImage extends StatelessWidget {
  final ClothingItem item;
  final Color accentColor;
  const _HeroImage({required this.item, required this.accentColor});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 380,
      width: double.infinity,
      child: Stack(
        children: [
          // Arka plan gradient
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  accentColor.withValues(alpha: .18),
                  AppColors.bg,
                ],
              ),
            ),
          ),
          // Görsel
          if (item.imageUrl != null)
            Positioned.fill(
              child: Image.network(
                item.imageUrl!,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => _Placeholder(color: accentColor),
              ),
            )
          else
            _Placeholder(color: accentColor),
          // Alt gradient overlay
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            height: 100,
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.transparent, AppColors.bg],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Placeholder extends StatelessWidget {
  final Color color;
  const _Placeholder({required this.color});
  @override
  Widget build(BuildContext context) => Center(
        child: Icon(Icons.checkroom_outlined,
            color: color.withValues(alpha: .3), size: 80),
      );
}

// ── Kategori Badge ────────────────────────────────────────────────────────────
class _CategoryBadge extends StatelessWidget {
  final String label;
  final Color color;
  const _CategoryBadge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: color.withValues(alpha: .15),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withValues(alpha: .4)),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: color,
            fontSize: 12,
            fontWeight: FontWeight.w700,
            letterSpacing: .5,
          ),
        ),
      );
}

// ── Detay Grid (Renk, Mevsim, Stil) ──────────────────────────────────────────
class _DetailGrid extends StatelessWidget {
  final ClothingItem item;
  final Color accentColor;
  const _DetailGrid({required this.item, required this.accentColor});

  @override
  Widget build(BuildContext context) {
    final tiles = <_DetailTile>[];
    if (item.color != null && item.color!.isNotEmpty) {
      tiles.add(_DetailTile(
          icon: Icons.palette_outlined,
          label: 'Renk',
          value: item.color!,
          swatchColor: _hexToColor(item.color!)));
    }
    if (item.season != null && item.season!.isNotEmpty) {
      tiles.add(_DetailTile(
          icon: Icons.wb_sunny_outlined, label: 'Mevsim', value: item.season!));
    }
    if (item.stil != null && item.stil!.isNotEmpty) {
      tiles.add(_DetailTile(
          icon: Icons.style_outlined, label: 'Stil', value: item.stil!));
    }
    if (tiles.isEmpty) return const SizedBox.shrink();

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 2.4,
      children: tiles
          .map((t) => _DetailCard(tile: t, accentColor: accentColor))
          .toList(),
    );
  }
}

class _DetailTile {
  final IconData icon;
  final String label;
  final String value;
  final Color? swatchColor;
  const _DetailTile(
      {required this.icon, required this.label, required this.value, this.swatchColor});
}

class _DetailCard extends StatelessWidget {
  final _DetailTile tile;
  final Color accentColor;
  const _DetailCard({required this.tile, required this.accentColor});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: accentColor.withValues(alpha: .12),
                borderRadius: BorderRadius.circular(9),
              ),
              child: Icon(tile.icon, color: accentColor, size: 17),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(tile.label,
                      style: const TextStyle(
                          color: AppColors.muted,
                          fontSize: 10,
                          letterSpacing: .5)),
                  const SizedBox(height: 4),
                  if (tile.swatchColor != null)
                    Container(
                      width: 26,
                      height: 26,
                      decoration: BoxDecoration(
                        color: tile.swatchColor,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.border, width: 1.5),
                        boxShadow: [
                          BoxShadow(
                            color: tile.swatchColor!.withValues(alpha: .4),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                    )
                  else
                    Text(tile.value,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            color: AppColors.text,
                            fontSize: 13,
                            fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ],
        ),
      );
}

// ── Notlar Kartı ─────────────────────────────────────────────────────────────
class _NotlarCard extends StatelessWidget {
  final String notlar;
  const _NotlarCard({required this.notlar});

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.notes_rounded, color: AppColors.muted, size: 15),
                SizedBox(width: 6),
                Text('Notlar',
                    style: TextStyle(
                        color: AppColors.muted,
                        fontSize: 11,
                        letterSpacing: .5)),
              ],
            ),
            const SizedBox(height: 8),
            Text(notlar,
                style: const TextStyle(
                    color: AppColors.textSub, fontSize: 13, height: 1.5)),
          ],
        ),
      );
}

// ── HEX → Flutter Color ───────────────────────────────────────────────────────
Color? _hexToColor(String raw) {
  final s = raw.trim().replaceAll('#', '');
  if (s.length != 6) return null;
  final val = int.tryParse(s, radix: 16);
  if (val == null) return null;
  return Color(0xFF000000 | val);
}

// ── Kategori rengi ────────────────────────────────────────────────────────────
Color _catColor(String cat) {
  switch (cat.toLowerCase()) {
    case 'üstler':
    case 'üst':
    case 'üst giyim':
      return AppColors.catTops;
    case 'altlar':
    case 'alt':
    case 'alt giyim':
      return AppColors.catBottoms;
    case 'ayakkabı':
      return AppColors.catShoes;
    case 'aksesuar':
      return AppColors.catAccessory;
    case 'elbiseler':
    case 'elbise':
    case 'elbise & etek':
      return AppColors.catOnePiece;
    case 'dış giyim':
      return AppColors.catOuterwear;
    default:
      return AppColors.gold;
  }
}
