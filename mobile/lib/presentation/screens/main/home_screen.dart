import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/data/models/clothing_item.dart';
import 'package:smart_wardrobe_ai/presentation/screens/ai_features/try_on_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/item/add_item_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/favorites_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/wardrobe_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/profile/profile_screen.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_background.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_bottom_nav.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_text_styles.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/wardrobe/clothing_card.dart';
import 'package:smart_wardrobe_ai/core/utils/nav_transitions.dart';
import 'package:smart_wardrobe_ai/data/models/generated_outfit.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with SingleTickerProviderStateMixin {
  final int _navIndex = 0;

  String _userName = 'Kullanıcı';
  bool _loading = true;
  List<GeneratedOutfit> _outfits = [];
  List<ClothingItem> _recentItems = [];

  String _weatherDesc = 'Yükleniyor...';
  String _weatherTemp = '--°';
  IconData _weatherIcon = Icons.wb_cloudy_rounded;

  late final AnimationController _fadeCtrl;
  late final Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _fadeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    )..forward();
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);
    _loadData();
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? '';
    final name = prefs.getString('userName') ?? 'Kullanıcı';

    if (!mounted) return;
    setState(() {
      _userName = name;
      _loading = true;
    });

    try {
      try {
        final wRes = await http.get(
            Uri.parse('${ApiConstants.baseUrl}/weather/city?sehir=Istanbul'),
            headers: {'Authorization': 'Bearer $token'}).timeout(const Duration(seconds: 5));
        if (wRes.statusCode == 200) {
          final wData = jsonDecode(utf8.decode(wRes.bodyBytes))['havaDurumu'];
          _weatherTemp = '${wData['sicaklik']}°';
          final desc = wData['durum'] as String;
          _weatherDesc = desc[0].toUpperCase() + desc.substring(1);
          final mainState = wData['ana_durum'] as String;
          if (mainState.contains('Clear')) _weatherIcon = Icons.wb_sunny_rounded;
          else if (mainState.contains('Rain')) _weatherIcon = Icons.water_drop_rounded;
          else if (mainState.contains('Snow')) _weatherIcon = Icons.ac_unit_rounded;
          else _weatherIcon = Icons.wb_cloudy_rounded;
        }
      } catch (_) {}

      try {
        final iRes = await http.get(Uri.parse('${ApiConstants.baseUrl}/kiyafetler'),
            headers: {'Authorization': 'Bearer $token'}).timeout(const Duration(seconds: 5));
        if (iRes.statusCode == 200) {
          final raw = jsonDecode(utf8.decode(iRes.bodyBytes));
          final list = (raw['kiyafetler'] ?? raw) as List;
          final all = list.map((e) => ClothingItem.fromJson(e)).toList();
          _recentItems = all.take(6).toList();
        }
      } catch (_) {}

      try {
        final oRes = await http.get(Uri.parse('${ApiConstants.baseUrl}/outfits'),
            headers: {'Authorization': 'Bearer $token'}).timeout(const Duration(seconds: 5));
        if (oRes.statusCode == 200) {
          final raw = jsonDecode(utf8.decode(oRes.bodyBytes));
          final list = (raw['kombinler'] as List? ?? []);
          _outfits = list.map((e) => GeneratedOutfit.fromJson(e)).toList();
        }
      } catch (_) {}
    } catch (_) {}

    if (mounted) setState(() => _loading = false);
  }

  void _onNavTap(int index) {
    if (index == _navIndex) return;
    switch (index) {
      case 0:
        break;
      case 1:
        Navigator.pushReplacement(context, slide(const FavoritesScreen()));
        break;
      case 2:
        Navigator.push(
          context,
          slideUp(const AddItemScreen()),
        ).then((_) => _loadData());
        break;
      case 3:
        Navigator.pushReplacement(context, slide(const TryOnScreen()));
        break;
      case 4:
        Navigator.pushReplacement(context, slide(const WardrobeScreen()));
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      extendBody: true,
      bottomNavigationBar: AppBottomNav(
        currentIndex: _navIndex,
        onTap: _onNavTap,
      ),
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: FadeTransition(
            opacity: _fadeAnim,
            child: RefreshIndicator(
              color: AppColors.gold,
              backgroundColor: AppColors.surface,
              onRefresh: _loadData,
              child: CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(22, 16, 22, 0),
                      child: _TopBar(
                        userName: _userName,
                        weatherTemp: _weatherTemp,
                        weatherDesc: _weatherDesc,
                        weatherIcon: _weatherIcon,
                        onProfileTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const ProfileScreen(),
                            ),
                          ).then((_) => _loadData());
                        },
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(22, 28, 22, 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _AiBadge(),
                          const SizedBox(height: 10),
                          _SectionHeader(
                            title: 'Bugün Ne Giysem?',
                            action: 'Tümünü gör',
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '$_weatherTemp $_weatherDesc için AI önerileri',
                            style: AppTextStyles.caption,
                          ),
                        ],
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: SizedBox(
                      height: 320,
                      child: _loading
                          ? const _ShimmerRow()
                          : _outfits.isEmpty
                          ? const _EmptyRecommendation()
                          : ListView.builder(
                              scrollDirection: Axis.horizontal,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 22,
                              ),
                              itemCount: _outfits.length,
                              itemBuilder: (_, i) => _OutfitCarouselCard(
                                outfit: _outfits[i],
                                onTryOn: () => Navigator.pushReplacement(
                                    context, slide(const TryOnScreen())),
                              ),
                            ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(22, 28, 22, 16),
                      child: _SectionHeader(title: 'Kategoriler'),
                    ),
                  ),
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 22),
                    sliver: SliverToBoxAdapter(child: _CategoryGrid()),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(22, 28, 22, 16),
                      child: _SectionHeader(
                        title: 'Son Eklenenler',
                        action: 'Dolabım',
                        onAction: () => Navigator.pushReplacement(
                          context,
                          slide(const WardrobeScreen()),
                        ),
                      ),
                    ),
                  ),
                  _loading
                      ? const SliverToBoxAdapter(child: _ShimmerGrid())
                      : _recentItems.isEmpty
                      ? const SliverToBoxAdapter(child: _EmptyWardrobe())
                      : SliverPadding(
                          padding: const EdgeInsets.fromLTRB(22, 0, 22, 100),
                          sliver: SliverGrid(
                            delegate: SliverChildBuilderDelegate((_, i) {
                              final item = _recentItems[i];
                              return ClothingCard(
                                name: item.name,
                                category: item.category,
                                imageUrl: item.imageUrl,
                                accentColor: _categoryColor(item.category),
                              );
                            }, childCount: _recentItems.length),
                            gridDelegate:
                                const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 2,
                                  mainAxisSpacing: 14,
                                  crossAxisSpacing: 14,
                                  childAspectRatio: .75,
                                ),
                          ),
                        ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

Color _categoryColor(String cat) {
  switch (cat.toLowerCase()) {
    case 'üstler':
    case 'üst':
    case 'tops':
      return AppColors.catTops;
    case 'altlar':
    case 'alt':
    case 'bottoms':
      return AppColors.catBottoms;
    case 'ayakkabı':
    case 'shoes':
      return AppColors.catShoes;
    case 'aksesuar':
    case 'accessory':
      return AppColors.catAccessory;
    case 'elbiseler':
    case 'elbise':
      return AppColors.catOnePiece;
    case 'dış giyim':
    case 'outerwear':
      return AppColors.catOuterwear;
    default:
      return AppColors.gold;
  }
}

class _TopBar extends StatelessWidget {
  final String userName, weatherTemp, weatherDesc;
  final IconData weatherIcon;
  final VoidCallback onProfileTap;
  const _TopBar({
    required this.userName,
    required this.weatherTemp,
    required this.weatherDesc,
    required this.weatherIcon,
    required this.onProfileTap,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Merhaba,',
                style: AppTextStyles.label.copyWith(letterSpacing: 1),
              ),
              const SizedBox(height: 2),
              Text(
                userName,
                style: const TextStyle(
                  fontFamily: 'Cormorant',
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  color: AppColors.text,
                  letterSpacing: -.5,
                ),
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(weatherIcon, color: AppColors.goldLight, size: 15),
              const SizedBox(width: 5),
              Text(
                '$weatherTemp $weatherDesc',
                style: const TextStyle(
                  color: AppColors.textSub,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 10),
        GestureDetector(
          onTap: onProfileTap,
          child: Hero(
            tag: 'profile_avatar',
            child: Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.gold, AppColors.goldLight],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.gold.withValues(alpha: .3),
                    blurRadius: 10,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(
                Icons.person_rounded,
                color: Colors.black,
                size: 20,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _AiBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(
      gradient: LinearGradient(
        colors: [
          AppColors.gold.withValues(alpha: .18),
          AppColors.goldLight.withValues(alpha: .08),
        ],
      ),
      borderRadius: BorderRadius.circular(20),
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
          'AI ÖNERİSİ',
          style: AppTextStyles.label.copyWith(
            color: AppColors.goldLight,
            letterSpacing: 1.4,
            fontSize: 10,
          ),
        ),
      ],
    ),
  );
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final String? action;
  final VoidCallback? onAction;
  const _SectionHeader({required this.title, this.action, this.onAction});

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Text(
        title,
        style: const TextStyle(
          color: AppColors.text,
          fontSize: 18,
          fontWeight: FontWeight.w600,
        ),
      ),
      const Spacer(),
      if (action != null)
        GestureDetector(
          onTap: onAction,
          child: Text(
            action!,
            style: const TextStyle(
              color: AppColors.gold,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
    ],
  );
}

class _OutfitCarouselCard extends StatelessWidget {
  final GeneratedOutfit outfit;
  final VoidCallback onTryOn;
  const _OutfitCarouselCard({required this.outfit, required this.onTryOn});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(right: 14),
      width: MediaQuery.of(context).size.width * 0.82,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (outfit.items.isNotEmpty)
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: outfit.items.take(3).map((item) {
                        return Expanded(
                          child: Container(
                            decoration: const BoxDecoration(
                              border: Border(right: BorderSide(color: AppColors.bg, width: 2)),
                            ),
                            child: item.imageUrl != null
                                ? Image.network(item.imageUrl!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _ImgPlaceholder(color: AppColors.gold))
                                : _ImgPlaceholder(color: AppColors.gold),
                          ),
                        );
                      }).toList(),
                    )
                  else
                    _ImgPlaceholder(color: AppColors.gold),
                  
                  // Gradient overlay
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            Colors.black.withValues(alpha: 0.6)
                          ],
                        ),
                      ),
                    ),
                  ),
                  
                  // Try on Button
                  Positioned(
                    bottom: 12,
                    right: 12,
                    child: GestureDetector(
                      onTap: onTryOn,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [AppColors.gold, AppColors.goldLight],
                          ),
                          borderRadius: BorderRadius.circular(30),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.gold.withValues(alpha: 0.4),
                              blurRadius: 8,
                            )
                          ],
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.face_retouching_natural_rounded, color: Colors.black, size: 16),
                            SizedBox(width: 6),
                            Text('Üzerinde Dene', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 13)),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  outfit.occasion.isNotEmpty ? outfit.occasion : 'Sana Özel Kombin',
                  style: const TextStyle(
                    color: AppColors.text,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  outfit.description.isNotEmpty ? outfit.description : 'Yapay zeka tarafından sizin için özenle oluşturuldu.',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.textSub,
                    fontSize: 12,
                    height: 1.4,
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

class _ImgPlaceholder extends StatelessWidget {
  final Color color;
  const _ImgPlaceholder({required this.color});
  @override
  Widget build(BuildContext context) => Container(
    color: color.withValues(alpha: .08),
    child: Center(
      child: Icon(
        Icons.checkroom_outlined,
        color: color.withValues(alpha: .4),
        size: 36,
      ),
    ),
  );
}

class _CategoryGrid extends StatelessWidget {
  static const _cats = [
    (Icons.dry_cleaning_outlined, 'Üstler', AppColors.catTops),
    (Icons.straighten_rounded, 'Altlar', AppColors.catBottoms),
    (Icons.hiking_rounded, 'Ayakkabı', AppColors.catShoes),
    (Icons.watch_rounded, 'Aksesuar', AppColors.catAccessory),
    (Icons.layers_rounded, 'Elbiseler', AppColors.catOnePiece),
    (Icons.wind_power_rounded, 'Dış Giyim', AppColors.catOuterwear),
  ];

  @override
  Widget build(BuildContext context) => GridView.builder(
    shrinkWrap: true,
    physics: const NeverScrollableScrollPhysics(),
    itemCount: _cats.length,
    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
      crossAxisCount: 3,
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 1.1,
    ),
    itemBuilder: (_, i) {
      final c = _cats[i];
      return Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: c.$3.withValues(alpha: .12),
                shape: BoxShape.circle,
              ),
              child: Icon(c.$1, color: c.$3, size: 20),
            ),
            const SizedBox(height: 7),
            Text(
              c.$2,
              style: const TextStyle(
                color: AppColors.textSub,
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      );
    },
  );
}

class _EmptyWardrobe extends StatelessWidget {
  const _EmptyWardrobe();
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.fromLTRB(22, 0, 22, 100),
    height: 150,
    decoration: BoxDecoration(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: AppColors.border),
    ),
    child: const Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.checkroom_outlined, color: AppColors.muted, size: 34),
        SizedBox(height: 10),
        Text(
          'Henüz kıyafet yok',
          style: TextStyle(color: AppColors.muted, fontSize: 14),
        ),
        SizedBox(height: 4),
        Text(
          '+ butonuna bas, dolabını oluştur',
          style: TextStyle(color: AppColors.muted, fontSize: 12),
        ),
      ],
    ),
  );
}

class _EmptyRecommendation extends StatelessWidget {
  const _EmptyRecommendation();
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 22),
    child: Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: const Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.auto_awesome_rounded, color: AppColors.goldDim, size: 32),
          SizedBox(height: 8),
          Text(
            'Öneri için kıyafet ekle',
            style: TextStyle(color: AppColors.muted, fontSize: 13),
          ),
        ],
      ),
    ),
  );
}

class _ShimmerRow extends StatelessWidget {
  const _ShimmerRow();
  @override
  Widget build(BuildContext context) => ListView.builder(
    scrollDirection: Axis.horizontal,
    padding: const EdgeInsets.symmetric(horizontal: 22),
    itemCount: 2,
    itemBuilder: (_, __) => Container(
      width: MediaQuery.of(context).size.width * 0.82,
      margin: const EdgeInsets.only(right: 14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.border),
      ),
    ),
  );
}

class _ShimmerGrid extends StatelessWidget {
  const _ShimmerGrid();
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 22),
    child: GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 4,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 14,
        crossAxisSpacing: 14,
        childAspectRatio: .75,
      ),
      itemBuilder: (_, __) => Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
      ),
    ),
  );
}
