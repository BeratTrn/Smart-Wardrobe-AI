import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:geolocator/geolocator.dart';
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
  List<ClothingItem> _recommendations = [];
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
    setState(() => _userName = name);

    if (token.isEmpty) {
      if (mounted) setState(() {
        _weatherDesc = 'Oturum yok';
        _loading = false;
      });
      return;
    }

    // Hava durumunu arka planda yükle (UI'yı bloklamasın)
    _loadWeather(token);

    try {
      // Doğru endpoint: /api/items
      final res = await http
          .get(
            Uri.parse('${ApiConstants.baseUrl}/items'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(const Duration(seconds: 10));

      if (!mounted) return;

      if (res.statusCode == 200) {
        final raw = jsonDecode(res.body);
        final list = (raw['items'] ?? raw['kiyafetler'] ?? raw) as List;
        final all = list.map((e) => ClothingItem.fromJson(e)).toList();
        setState(() {
          _recentItems = all.take(6).toList();
          _recommendations = all.take(3).toList();
          _loading = false;
        });
      } else {
        setState(() => _loading = false);
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadWeather(String token) async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) setState(() => _weatherDesc = 'Konum kapalı');
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (mounted) setState(() => _weatherDesc = 'İzin reddedildi');
          return;
        }
      }
      if (permission == LocationPermission.deniedForever) {
        if (mounted) setState(() => _weatherDesc = 'İzin engellendi');
        return;
      }

      Position? position;
      try {
        position = await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.low,
            timeLimit: const Duration(seconds: 4));
      } catch (e) {
        position = await Geolocator.getLastKnownPosition();
        if (position == null) {
          if (mounted) setState(() => _weatherDesc = 'Konum bulunamadı');
          return;
        }
      }
      
      final res = await http.get(
        Uri.parse('${ApiConstants.baseUrl}/weather?enlem=${position.latitude}&boylam=${position.longitude}'),
        headers: {'Authorization': 'Bearer $token'}
      ).timeout(const Duration(seconds: 8));

      if (res.statusCode == 200) {
        _setWeather(res.body);
      } else {
        if (mounted) setState(() => _weatherDesc = 'Hava durumu kapalı');
      }
    } catch (e) {
      if (mounted) setState(() {
         _weatherDesc = 'Bağlantı hatası';
      });
    }
  }

  void _setWeather(String body) {
    if (!mounted) return;
    try {
      final decoded = jsonDecode(body);
      final data = decoded['havaDurumu'];
      if (data == null) return;
      
      setState(() {
        _weatherTemp = '${data['sicaklik']}°';
        final desc = data['durum'] as String;
        _weatherDesc = desc.isNotEmpty ? desc[0].toUpperCase() + desc.substring(1) : '';
        
        final mainState = data['ana_durum'] as String;
        if (mainState.contains('Clear')) {
          _weatherIcon = Icons.wb_sunny_rounded;
        } else if (mainState.contains('Rain') || mainState.contains('Drizzle')) {
          _weatherIcon = Icons.water_drop_rounded;
        } else if (mainState.contains('Snow')) {
          _weatherIcon = Icons.ac_unit_rounded;
        } else if (mainState.contains('Thunderstorm')) {
          _weatherIcon = Icons.flash_on_rounded;
        } else {
          _weatherIcon = Icons.wb_cloudy_rounded;
        }
      });
    } catch (_) {
      if (mounted) setState(() => _weatherDesc = 'Veri ayrıştırılamadı');
    }
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
                      height: 230,
                      child: _loading
                          ? const _ShimmerRow()
                          : _recommendations.isEmpty
                          ? const _EmptyRecommendation()
                          : ListView.builder(
                              scrollDirection: Axis.horizontal,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 22,
                              ),
                              itemCount: _recommendations.length,
                              itemBuilder: (_, i) => Padding(
                                padding: const EdgeInsets.only(right: 14),
                                child: _RecommendationCard(
                                  item: _recommendations[i],
                                ),
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

class _RecommendationCard extends StatelessWidget {
  final ClothingItem item;
  const _RecommendationCard({required this.item});

  @override
  Widget build(BuildContext context) {
    final accent = _categoryColor(item.category);
    return Container(
      width: 150,
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(15),
              ),
              child: item.imageUrl != null
                  ? Image.network(
                      item.imageUrl!,
                      fit: BoxFit.cover,
                      width: double.infinity,
                      errorBuilder: (_, __, ___) =>
                          _ImgPlaceholder(color: accent),
                    )
                  : _ImgPlaceholder(color: accent),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.text,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  item.category,
                  style: TextStyle(color: accent, fontSize: 11),
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
    itemCount: 3,
    itemBuilder: (_, __) => Container(
      width: 150,
      margin: const EdgeInsets.only(right: 14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
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
