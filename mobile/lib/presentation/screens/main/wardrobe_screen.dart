import 'dart:convert';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/core/theme/app_theme_extension.dart';
import 'package:smart_wardrobe_ai/core/utils/nav_transitions.dart';
import 'package:smart_wardrobe_ai/data/models/clothing_item.dart';
import 'package:smart_wardrobe_ai/presentation/screens/ai_features/outfit_generator_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/saved_outfits_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/item/add_item_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/item/item_detail_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/favorites_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/home_screen.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_background.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_bottom_nav.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_text_styles.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/wardrobe/app_filter_chip.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/wardrobe/clothing_card.dart';

class WardrobeScreen extends StatefulWidget {
  const WardrobeScreen({super.key});

  @override
  State<WardrobeScreen> createState() => _WardrobeScreenState();
}

class _WardrobeScreenState extends State<WardrobeScreen>
    with SingleTickerProviderStateMixin {
  List<ClothingItem> _all = [];
  List<ClothingItem> _filtered = [];
  bool _loading = true;
  String _activeFilter = 'wardrobe.all'.tr();

  final List<String> _filters = [
    'wardrobe.all'.tr(),
    'wardrobe.topwear'.tr(),
    'wardrobe.bottomwear'.tr(),
    'wardrobe.dress'.tr(),
    'wardrobe.outerwear'.tr(),
    'wardrobe.shoes'.tr(),
    'wardrobe.accessories'.tr(),
  ];

  late final AnimationController _fadeCtrl;
  late final Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _fadeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    )..forward();
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
      final res = await http
          .get(
            Uri.parse('${ApiConstants.baseUrl}/items'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(const Duration(seconds: 8));
      if (!mounted) return;
      if (res.statusCode == 200) {
        final raw = jsonDecode(res.body);
        final list = (raw['kiyafetler'] ?? raw) as List;
        final items = list.map((e) => ClothingItem.fromJson(e)).toList();
        setState(() {
          _all = items;
          _loading = false;
        });
        _applyFilter(_activeFilter);
      } else {
        setState(() => _loading = false);
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _applyFilter(String filter) {
    setState(() {
      _activeFilter = filter;
      _filtered = filter == 'wardrobe.all'.tr()
          ? List.from(_all)
          : _all.where((item) => item.category == filter).toList();
    });
  }

  Future<void> _delete(ClothingItem item) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? '';
    try {
      await http.delete(
        Uri.parse('${ApiConstants.baseUrl}/items/${item.id}'),
        headers: {'Authorization': 'Bearer $token'},
      );
      setState(() {
        _all.removeWhere((e) => e.id == item.id);
        _applyFilter(_activeFilter);
      });
    } catch (_) {}
  }

  void _showDeleteDialog(ClothingItem item) {
    showDialog(
      context: context,
      builder: (_) => _DeleteDialog(
        name: item.name,
        onConfirm: () {
          Navigator.pop(context);
          _delete(item);
        },
      ),
    );
  }

  void _onNavTap(int index) {
    if (index == 4) return;
    switch (index) {
      case 0:
        Navigator.pushReplacement(context, slide(const HomeScreen()));
        break;
      case 1:
        Navigator.pushReplacement(context, slide(const FavoritesScreen()));
        break;
      case 2:
        Navigator.push(
          context,
          slideUp(const AddItemScreen()),
        ).then((_) => _fetch());
        break;
      case 3:
        Navigator.pushReplacement(context, slide(const SavedOutfitsScreen()));
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColorsExtension.of(context).bg,
      extendBody: true,
      bottomNavigationBar: AppBottomNav(currentIndex: 4, onTap: _onNavTap),
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
                  child: Row(
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'wardrobe.my_wardrobe'.tr(),
                            style: AppTextStyles.label.copyWith(
                              letterSpacing: 2,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'wardrobe.wardrobe'.tr(),
                            style: TextStyle(
                              fontFamily: 'Cormorant',
                              fontSize: 30,
                              fontWeight: FontWeight.w700,
                              color: AppColorsExtension.of(context).text,
                            ),
                          ),
                        ],
                      ),
                      const Spacer(),
                      GestureDetector(
                        onTap: () => Navigator.push(
                          context,
                          slideUp(const OutfitGeneratorScreen()),
                        ),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.gold.withValues(alpha: .1),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: AppColors.gold.withValues(alpha: .3),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.auto_awesome_rounded,
                                color: AppColors.gold,
                                size: 15,
                              ),
                              const SizedBox(width: 5),
                              Text(
                                'wardrobe.outfits'.tr(),
                                style: AppTextStyles.label.copyWith(
                                  color: AppColors.gold,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(22, 6, 22, 0),
                  child: Text(
                    '${_filtered.length} ' + 'wardrobe.garment'.tr(),
                    style: AppTextStyles.caption,
                  ),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  height: 38,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 22),
                    itemCount: _filters.length,
                    itemBuilder: (_, i) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: AppFilterChip(
                        label: _filters[i],
                        selected: _activeFilter == _filters[i],
                        onTap: () => _applyFilter(_filters[i]),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Expanded(
                  child: _loading
                      ? const Center(
                          child: CircularProgressIndicator(
                            color: AppColors.gold,
                            strokeWidth: 2,
                          ),
                        )
                      : _filtered.isEmpty
                      ? _EmptyState(filter: _activeFilter)
                      : RefreshIndicator(
                          color: AppColors.gold,
                          backgroundColor: AppColorsExtension.of(context).surface,
                          onRefresh: _fetch,
                          child: GridView.builder(
                            padding: const EdgeInsets.fromLTRB(22, 0, 22, 100),
                            itemCount: _filtered.length,
                            gridDelegate:
                                const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 2,
                                  mainAxisSpacing: 14,
                                  crossAxisSpacing: 14,
                                  childAspectRatio: .72,
                                ),
                            itemBuilder: (_, i) {
                              final item = _filtered[i];
                              return GestureDetector(
                                onTap: () async {
                                  final newFav = await Navigator.push<bool?>(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) =>
                                          ItemDetailScreen(item: item),
                                    ),
                                  );
                                  // Favori durumu değiştiyse listeyi yenile
                                  if (newFav != null) _fetch();
                                },
                                child: ClothingCard(
                                  name: item.name,
                                  category: item.category,
                                  imageUrl: item.imageUrl,
                                  accentColor: _catColor(item.category),
                                  showRemove: true,
                                  onRemove: () => _showDeleteDialog(item),
                                ),
                              );
                            },
                          ),
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

Color _catColor(String cat) {
  switch (cat) {
    case 'Üst Giyim':
      return AppColors.catTops;
    case 'Alt Giyim':
      return AppColors.catBottoms;
    case 'Ayakkabı':
      return AppColors.catShoes;
    case 'Aksesuar':
      return AppColors.catAccessory;
    case 'Elbise':
      return AppColors.catOnePiece;
    case 'Dış Giyim':
      return AppColors.catOuterwear;
    case 'Spor Giyim':
      return AppColors.catTops;
    default:
      return AppColors.gold;
  }
}

class _EmptyState extends StatelessWidget {
  final String filter;
  const _EmptyState({required this.filter});

  @override
  Widget build(BuildContext context) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 70,
          height: 70,
          decoration: BoxDecoration(
            color: AppColorsExtension.of(context).surface,
            shape: BoxShape.circle,
            border: Border.all(color: AppColorsExtension.of(context).border),
          ),
          child: Icon(
            Icons.checkroom_outlined,
            color: AppColorsExtension.of(context).muted,
            size: 30,
          ),
        ),
        const SizedBox(height: 14),
        Text(
          filter == 'wardrobe.all'.tr()
              ? 'wardrobe.empty_wardrobe'.tr()
              : '"$filter" ' + 'wardrobe.empty_category'.tr(),
          style: TextStyle(color: AppColorsExtension.of(context).textSub, fontSize: 14),
        ),
        const SizedBox(height: 5),
        Text(
          'wardrobe.add_garment_prompt'.tr(),
          style: TextStyle(color: AppColorsExtension.of(context).muted, fontSize: 12),
        ),
      ],
    ),
  );
}

class _DeleteDialog extends StatelessWidget {
  final String name;
  final VoidCallback onConfirm;
  const _DeleteDialog({required this.name, required this.onConfirm});

  @override
  Widget build(BuildContext context) => Dialog(
    backgroundColor: AppColorsExtension.of(context).card,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: AppColors.error.withValues(alpha: .12),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.delete_outline_rounded,
              color: AppColors.error,
              size: 26,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'wardrobe.delete_garment'.tr(),
            style: TextStyle(
              fontFamily: 'Cormorant',
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppColorsExtension.of(context).text,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '"$name" ' + 'wardrobe.delete_garment_confirm'.tr(),
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColorsExtension.of(context).textSub,
              fontSize: 14,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    height: 46,
                    decoration: BoxDecoration(
                      color: AppColorsExtension.of(context).surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColorsExtension.of(context).border),
                    ),
                    child: Center(
                      child: Text(
                        'wardrobe.cancel'.tr(),
                        style: TextStyle(color: AppColorsExtension.of(context).textSub),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: GestureDetector(
                  onTap: onConfirm,
                  child: Container(
                    height: 46,
                    decoration: BoxDecoration(
                      color: AppColors.error,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        'wardrobe.delete'.tr(),
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}
