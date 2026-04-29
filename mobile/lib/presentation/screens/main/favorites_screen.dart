import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/data/models/clothing_item.dart';
import 'package:smart_wardrobe_ai/presentation/screens/ai_features/try_on_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/item/add_item_screen.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_background.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_bottom_nav.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_text_styles.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/wardrobe/clothing_card.dart';
import 'package:smart_wardrobe_ai/core/utils/nav_transitions.dart';
import 'package:smart_wardrobe_ai/presentation/screens/item/item_detail_screen.dart';

import 'home_screen.dart';
import 'wardrobe_screen.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen>
    with SingleTickerProviderStateMixin {
  List<ClothingItem> _favorites = [];
  bool    _loading  = true;
  String  _viewMode = 'grid';

  late final AnimationController _fadeCtrl;
  late final Animation<double>   _fadeAnim;

  @override
  void initState() {
    super.initState();
    _fadeCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 600))
      ..forward();
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);
    _fetch();
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? '';
    try {
      final res = await http.get(
        Uri.parse('${ApiConstants.baseUrl}/items/favorites'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 8));
      if (!mounted) return;
      if (res.statusCode == 200) {
        final raw  = jsonDecode(res.body);
        final list = (raw['favoriler'] ?? raw) as List;
        setState(() {
          _favorites = list.map((e) => ClothingItem.fromJson(e)).toList();
          _loading   = false;
        });
      } else {
        setState(() => _loading = false);
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _unfavorite(ClothingItem item) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? '';
    try {
      final res = await http.patch(
        Uri.parse('${ApiConstants.baseUrl}/items/${item.id}/favorite'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (res.statusCode == 200) {
        setState(() => _favorites.removeWhere((e) => e.id == item.id));
      }
    } catch (_) {}
  }

  void _onNavTap(int index) {
    if (index == 1) return;
    switch (index) {
      case 0: Navigator.pushReplacement(context, slide(const HomeScreen())); break;
      case 2: Navigator.push(context, slideUp(const AddItemScreen())).then((_) => _fetch()); break;
      case 3: Navigator.pushReplacement(context, slide(const TryOnScreen())); break;
      case 4: Navigator.pushReplacement(context, slide(const WardrobeScreen())); break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      extendBody: true,
      bottomNavigationBar: AppBottomNav(currentIndex: 1, onTap: _onNavTap),
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: FadeTransition(
            opacity: _fadeAnim,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(22, 16, 22, 0),
                  child: Row(children: [
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('FAVORİLERİM',
                          style: AppTextStyles.label.copyWith(letterSpacing: 2)),
                      const SizedBox(height: 2),
                      const Text('Beğendiklerim',
                          style: TextStyle(
                            fontFamily: 'Cormorant', fontSize: 30,
                            fontWeight: FontWeight.w700, color: AppColors.text,
                          )),
                    ]),
                    const Spacer(),
                    _ViewToggle(
                      mode: _viewMode,
                      onToggle: (m) => setState(() => _viewMode = m),
                    ),
                  ]),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(22, 6, 22, 14),
                  child: Text('${_favorites.length} favori kıyafet',
                      style: AppTextStyles.caption),
                ),
                Expanded(
                  child: _loading
                      ? const Center(child: CircularProgressIndicator(
                          color: AppColors.gold, strokeWidth: 2))
                      : _favorites.isEmpty
                          ? const _EmptyFavorites()
                          : RefreshIndicator(
                              color: AppColors.gold,
                              backgroundColor: AppColors.surface,
                              onRefresh: _fetch,
                              child: _viewMode == 'grid'
                                  ? _GridFavorites(items: _favorites, onUnfavorite: _unfavorite)
                                  : _ListFavorites(items: _favorites, onUnfavorite: _unfavorite),
                            ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ViewToggle extends StatelessWidget {
  final String mode;
  final ValueChanged<String> onToggle;
  const _ViewToggle({required this.mode, required this.onToggle});

  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(children: [
          _ToggleBtn(icon: Icons.grid_view_rounded, active: mode == 'grid', onTap: () => onToggle('grid')),
          _ToggleBtn(icon: Icons.view_list_rounded, active: mode == 'list', onTap: () => onToggle('list')),
        ]),
      );
}

class _ToggleBtn extends StatelessWidget {
  final IconData icon;
  final bool active;
  final VoidCallback onTap;
  const _ToggleBtn({required this.icon, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          width: 36, height: 36,
          decoration: BoxDecoration(
            color: active ? AppColors.gold : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: active ? Colors.black : AppColors.muted, size: 18),
        ),
      );
}

class _GridFavorites extends StatelessWidget {
  final List<ClothingItem> items;
  final ValueChanged<ClothingItem> onUnfavorite;
  const _GridFavorites({required this.items, required this.onUnfavorite});

  @override
  Widget build(BuildContext context) => GridView.builder(
        padding: const EdgeInsets.fromLTRB(22, 0, 22, 100),
        itemCount: items.length,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2, mainAxisSpacing: 14, crossAxisSpacing: 14, childAspectRatio: .72,
        ),
        itemBuilder: (_, i) {
          final item = items[i];
          return Stack(children: [
            GestureDetector(
              onTap: () async {
                final changed = await Navigator.push<bool?>(
                  context,
                  MaterialPageRoute(builder: (_) => ItemDetailScreen(item: item)),
                );
                if (changed == false) onUnfavorite(item);
              },
              child: ClothingCard(
                name: item.name,
                category: item.category,
                imageUrl: item.imageUrl,
                accentColor: _catColor(item.category),
              ),
            ),
            Positioned(
              top: 8, right: 8,
              child: GestureDetector(
                onTap: () => onUnfavorite(item),
                child: Container(
                  width: 30, height: 30,
                  decoration: BoxDecoration(
                    color: AppColors.bg.withValues(alpha: .75), shape: BoxShape.circle),
                  child: const Icon(Icons.favorite_rounded,
                      color: Color(0xFFE05C5C), size: 15),
                ),
              ),
            ),
          ]);
        },
      );
}

class _ListFavorites extends StatelessWidget {
  final List<ClothingItem> items;
  final ValueChanged<ClothingItem> onUnfavorite;
  const _ListFavorites({required this.items, required this.onUnfavorite});

  @override
  Widget build(BuildContext context) => ListView.builder(
        padding: const EdgeInsets.fromLTRB(22, 0, 22, 100),
        itemCount: items.length,
        itemBuilder: (_, i) {
          final item  = items[i];
          final color = _catColor(item.category);
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(children: [
              ClipRRect(
                borderRadius: const BorderRadius.horizontal(left: Radius.circular(15)),
                child: SizedBox(
                  width: 88, height: 88,
                  child: item.imageUrl != null
                      ? Image.network(item.imageUrl!, fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                              color: color.withValues(alpha: .1),
                              child: Icon(Icons.checkroom_outlined, color: color.withValues(alpha: .4))))
                      : Container(color: color.withValues(alpha: .1),
                          child: Icon(Icons.checkroom_outlined, color: color.withValues(alpha: .4))),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(item.name,
                      style: const TextStyle(
                          color: AppColors.text, fontSize: 14, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: .12), borderRadius: BorderRadius.circular(6)),
                    child: Text(item.category,
                        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
                  ),
                ]),
              ),
              GestureDetector(
                onTap: () => onUnfavorite(item),
                child: const Padding(
                  padding: EdgeInsets.all(16),
                  child: Icon(Icons.favorite_rounded, color: Color(0xFFE05C5C), size: 22),
                ),
              ),
            ]),
          );
        },
      );
}

class _EmptyFavorites extends StatelessWidget {
  const _EmptyFavorites();
  @override
  Widget build(BuildContext context) => Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 76, height: 76,
            decoration: BoxDecoration(
              color: AppColors.surface, shape: BoxShape.circle,
              border: Border.all(color: AppColors.border),
            ),
            child: const Icon(Icons.favorite_border_rounded, color: AppColors.muted, size: 32),
          ),
          const SizedBox(height: 14),
          const Text('Henüz favori yok',
              style: TextStyle(color: AppColors.textSub, fontSize: 15)),
          const SizedBox(height: 5),
          const Text('Kıyafetlerine ❤️ basarak ekle',
              style: TextStyle(color: AppColors.muted, fontSize: 13)),
        ]),
      );
}

Color _catColor(String cat) {
  switch (cat.toLowerCase()) {
    case 'üstler': case 'üst': return AppColors.catTops;
    case 'altlar': case 'alt': return AppColors.catBottoms;
    case 'ayakkabı': return AppColors.catShoes;
    case 'aksesuar': return AppColors.catAccessory;
    case 'elbiseler': case 'elbise': return AppColors.catOnePiece;
    case 'dış giyim': return AppColors.catOuterwear;
    default: return AppColors.gold;
  }
}