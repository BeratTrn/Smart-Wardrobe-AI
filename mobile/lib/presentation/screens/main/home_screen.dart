import 'dart:convert';
import 'dart:math' as math;
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:geolocator/geolocator.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/data/models/clothing_item.dart';
import 'package:smart_wardrobe_ai/data/models/saved_outfit.dart';
import 'package:smart_wardrobe_ai/data/services/saved_outfits_store.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/saved_outfits_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/item/add_item_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/favorites_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/wardrobe_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/profile/profile_screen.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_background.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_bottom_nav.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_text_styles.dart';
import 'package:smart_wardrobe_ai/core/utils/nav_transitions.dart';

// ─────────────────────────── Category helpers ────────────────────────────────

bool _isCat(String cat, List<String> keys) =>
    keys.any((k) => cat.toLowerCase().contains(k));

Color _categoryColor(String cat) {
  final c = cat.toLowerCase();
  if (_isCat(c, ['üst', 'top', 'gömlek', 'tişört', 'bluz']))
    return AppColors.catTops;
  if (_isCat(c, ['alt', 'bottom', 'pantolon', 'etek', 'şort']))
    return AppColors.catBottoms;
  if (_isCat(c, ['ayakkabı', 'shoe', 'bot', 'sneaker']))
    return AppColors.catShoes;
  if (_isCat(c, ['aksesuar', 'accessory'])) return AppColors.catAccessory;
  if (_isCat(c, ['elbise', 'dress', 'tulum'])) return AppColors.catOnePiece;
  if (_isCat(c, ['dış', 'outer', 'mont', 'ceket']))
    return AppColors.catOuterwear;
  return AppColors.gold;
}

// ─────────────────────────── HomeScreen ─────────────────────────────────────

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  static const int _navIndex = 0;

  // ── Singleton store — reactive SavedOutfit list ───────────────────────────
  final _store = SavedOutfitsStore.instance;

  // ── State ─────────────────────────────────────────────────────────────────
  String _userName = 'Kullanıcı';
  String _profilFoto = '';
  bool _itemsLoading = true; // guards items + scorecard sections
  bool _outfitsLoading = true; // guards lookbook independently

  List<ClothingItem> _recentItems = [];
  List<ClothingItem> _allItems = [];

  String _weatherDesc = 'Yükleniyor...';
  String _weatherTemp = '--°';
  IconData _weatherIcon = Icons.wb_cloudy_rounded;

  // ── Animations ────────────────────────────────────────────────────────────
  late final AnimationController _fadeCtrl;
  late final Animation<double> _fadeAnim;

  /// Staggered card entrance — fired once both data sources are ready.
  late final AnimationController _cardCtrl;

  @override
  void initState() {
    super.initState();

    _fadeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    )..forward();
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);

    _cardCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    );

    _loadData();
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    _cardCtrl.dispose();
    super.dispose();
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  Future<void> _loadData() async {
    if (mounted) {
      setState(() {
        _itemsLoading = true;
        _outfitsLoading = true;
      });
    }

    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? '';
    final name = prefs.getString('userName') ?? 'Kullanıcı';

    if (!mounted) return;
    setState(() {
      _userName = name;
      // Show cached photo immediately while the network fetch runs
      _profilFoto = prefs.getString('pref_profilePhoto') ?? '';
    });

    if (token.isEmpty) {
      if (mounted) {
        setState(() {
          _weatherDesc = 'Oturum yok';
          _itemsLoading = false;
          _outfitsLoading = false;
        });
      }
      return;
    }

    // Fire weather in background — never blocks other fetches
    _loadWeather(token);

    // Items + outfits + profile photo in parallel
    await Future.wait([_fetchItems(token), _fetchOutfits(), _fetchProfile(token)]);

    // Trigger staggered card entrance
    if (mounted) _cardCtrl.forward(from: 0);
  }

  Future<void> _fetchItems(String token) async {
    try {
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
          _allItems = all;
          _recentItems = all.take(6).toList();
          _itemsLoading = false;
        });
      } else {
        setState(() => _itemsLoading = false);
      }
    } catch (_) {
      if (mounted) setState(() => _itemsLoading = false);
    }
  }

  Future<void> _fetchOutfits() async {
    try {
      // Updates _store.outfits ValueNotifier → ValueListenableBuilder auto-rebuilds
      await _store.load();
    } catch (_) {
      // store.load() is internally non-fatal
    } finally {
      if (mounted) setState(() => _outfitsLoading = false);
    }
  }

  Future<void> _fetchProfile(String token) async {
    try {
      final res = await http
          .get(
            Uri.parse('${ApiConstants.baseUrl}/auth/me'),
            headers: {'Authorization': 'Bearer $token'},
          )
          .timeout(const Duration(seconds: 8));

      if (!mounted || res.statusCode != 200) return;

      final kullanici =
          (jsonDecode(res.body) as Map<String, dynamic>)['kullanici']
              as Map<String, dynamic>?;
      if (kullanici == null) return;

      final foto = kullanici['profilFoto'] as String? ?? '';
      final name = kullanici['kullaniciAdi'] as String? ?? '';

      // Persist so next cold-start shows instantly
      final prefs = await SharedPreferences.getInstance();
      if (foto.isNotEmpty) await prefs.setString('pref_profilePhoto', foto);
      if (name.isNotEmpty) await prefs.setString('userName', name);

      if (!mounted) return;
      setState(() {
        if (foto.isNotEmpty) _profilFoto = foto;
        if (name.isNotEmpty) _userName = name;
      });
    } catch (_) {
      // Non-fatal — cached values remain visible
    }
  }

  // ── Weather ───────────────────────────────────────────────────────────────

  Future<void> _loadWeather(String token) async {
    try {
      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) {
        if (mounted) setState(() => _weatherDesc = 'Konum kapalı');
        return;
      }
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
        if (perm == LocationPermission.denied) {
          if (mounted) setState(() => _weatherDesc = 'İzin reddedildi');
          return;
        }
      }
      if (perm == LocationPermission.deniedForever) {
        if (mounted) setState(() => _weatherDesc = 'İzin engellendi');
        return;
      }

      Position? pos;
      try {
        pos = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.low,
            timeLimit: Duration(seconds: 4),
          ),
        );
      } catch (_) {
        pos = await Geolocator.getLastKnownPosition();
        if (pos == null) {
          if (mounted) setState(() => _weatherDesc = 'Konum bulunamadı');
          return;
        }
      }

      final res = await http
          .get(
            Uri.parse(
              '${ApiConstants.baseUrl}/weather'
              '?enlem=${pos.latitude}&boylam=${pos.longitude}',
            ),
            headers: {'Authorization': 'Bearer $token'},
          )
          .timeout(const Duration(seconds: 8));

      if (res.statusCode == 200) {
        _parseWeather(res.body);
      } else {
        if (mounted) setState(() => _weatherDesc = 'Hava bilgisi yok');
      }
    } catch (_) {
      if (mounted) setState(() => _weatherDesc = 'Bağlantı hatası');
    }
  }

  void _parseWeather(String body) {
    if (!mounted) return;
    try {
      final data = jsonDecode(body)['havaDurumu'];
      if (data == null) return;
      setState(() {
        _weatherTemp = '${data['sicaklik']}°';
        final desc = (data['durum'] as String?) ?? '';
        _weatherDesc = desc.isNotEmpty
            ? desc[0].toUpperCase() + desc.substring(1)
            : '';
        final main = (data['ana_durum'] as String?) ?? '';
        if (main.contains('Clear'))
          _weatherIcon = Icons.wb_sunny_rounded;
        else if (main.contains('Rain') || main.contains('Drizzle'))
          _weatherIcon = Icons.water_drop_rounded;
        else if (main.contains('Snow'))
          _weatherIcon = Icons.ac_unit_rounded;
        else if (main.contains('Thunderstorm'))
          _weatherIcon = Icons.flash_on_rounded;
        else
          _weatherIcon = Icons.wb_cloudy_rounded;
      });
    } catch (_) {
      if (mounted) setState(() => _weatherDesc = 'Veri ayrıştırılamadı');
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

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
        Navigator.pushReplacement(context, slide(const SavedOutfitsScreen()));
        break;
      case 4:
        Navigator.pushReplacement(context, slide(const WardrobeScreen()));
        break;
    }
  }

  // ── Build ─────────────────────────────────────────────────────────────────

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
                physics: const BouncingScrollPhysics(
                  parent: AlwaysScrollableScrollPhysics(),
                ),
                slivers: [
                  // ── Top Bar ──────────────────────────────────────────────
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(22, 16, 22, 0),
                      child: _TopBar(
                        userName: _userName,
                        profilFoto: _profilFoto,
                        weatherTemp: _weatherTemp,
                        weatherDesc: _weatherDesc,
                        weatherIcon: _weatherIcon,
                        onProfileTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const ProfileScreen(),
                          ),
                        ).then((_) => _loadData()),
                      ),
                    ),
                  ),

                  // ══════════════════════════════════════════════════════════
                  //  SECTION 1 — "Sana Özel Kombinler"  (real saved outfits)
                  // ══════════════════════════════════════════════════════════
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(22, 28, 22, 14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _AiBadge(),
                          const SizedBox(height: 10),
                          _SectionHeader(
                            title: 'Sana Özel Kombinler',
                            action: 'Tümünü Gör',
                            onAction: () => Navigator.pushReplacement(
                              context,
                              slide(const SavedOutfitsScreen()),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '$_weatherTemp · $_weatherDesc için kaydedilmiş kombinler',
                            style: AppTextStyles.caption,
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Lookbook carousel — driven by SavedOutfitsStore
                  SliverToBoxAdapter(
                    child: SizedBox(
                      height: 300,
                      child: _outfitsLoading
                          ? const _GoldShimmerRow(itemWidth: 280)
                          : ValueListenableBuilder<List<SavedOutfit>>(
                              valueListenable: _store.outfits,
                              builder: (_, outfits, __) {
                                if (outfits.isEmpty)
                                  return const _EmptyLookbook();
                                return _LookbookCarousel(
                                  outfits: outfits,
                                  cardCtrl: _cardCtrl,
                                );
                              },
                            ),
                    ),
                  ),

                  // ══════════════════════════════════════════════════════════
                  //  SECTION 2 — Stil Profilin  (Style Scorecard)
                  // ══════════════════════════════════════════════════════════
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(22, 28, 22, 0),
                      child: _itemsLoading
                          ? const _GoldShimmerCard(height: 160)
                          : _StyleScorecardCard(items: _allItems),
                    ),
                  ),

                  // ══════════════════════════════════════════════════════════
                  //  SECTION 3 — "Son Eklenenler"  (horizontal thumbnail row)
                  // ══════════════════════════════════════════════════════════
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(22, 28, 22, 14),
                      child: _SectionHeader(
                        title: 'Son Eklenenler',
                        action: 'Tümünü Gör',
                        onAction: () => Navigator.pushReplacement(
                          context,
                          slide(const WardrobeScreen()),
                        ),
                      ),
                    ),
                  ),

                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 110),
                      child: _itemsLoading
                          ? const _GoldShimmerRow(itemWidth: 130, height: 170)
                          : _recentItems.isEmpty
                          ? const _EmptyWardrobe()
                          : _RecentItemsRow(items: _recentItems),
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

// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 1 — Lookbook Carousel
// ═══════════════════════════════════════════════════════════════════════════

class _LookbookCarousel extends StatelessWidget {
  final List<SavedOutfit> outfits;
  final AnimationController cardCtrl;

  const _LookbookCarousel({required this.outfits, required this.cardCtrl});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 22),
      itemCount: outfits.length,
      itemBuilder: (_, i) {
        // Stagger: each card entrance is offset by 150 ms
        final start = (i * 0.15).clamp(0.0, 0.7);
        final end = (start + 0.55).clamp(0.0, 1.0);
        final anim = CurvedAnimation(
          parent: cardCtrl,
          curve: Interval(start, end, curve: Curves.easeOutCubic),
        );
        return Padding(
          padding: const EdgeInsets.only(right: 14),
          child: AnimatedBuilder(
            animation: anim,
            builder: (_, child) => Opacity(
              opacity: anim.value,
              child: Transform.translate(
                offset: Offset(0, 28 * (1 - anim.value)),
                child: child,
              ),
            ),
            child: _LookbookCard(outfit: outfits[i]),
          ),
        );
      },
    );
  }
}

// ── Individual lookbook card  (SavedOutfit) ──────────────────────────────────

class _LookbookCard extends StatelessWidget {
  final SavedOutfit outfit;
  const _LookbookCard({required this.outfit});

  /// Derive a style tag: prefer clothing piece stil, fall back to first word of baslik.
  String get _styleTag {
    final items = outfit.kiyafetler;
    if (items.isNotEmpty && (items.first.stil?.isNotEmpty ?? false)) {
      return items.first.stil!;
    }
    final words = outfit.baslik.trim().split(' ');
    return words.isNotEmpty && words.first.isNotEmpty ? words.first : 'Kombin';
  }

  @override
  Widget build(BuildContext context) {
    final items = outfit.kiyafetler;

    return Container(
      width: 280,
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: AppColors.gold.withValues(alpha: .22),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: .45),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
          BoxShadow(
            color: AppColors.gold.withValues(alpha: .05),
            blurRadius: 32,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Stack(
        children: [
          // ── Mosaic of clothing images ─────────────────────────────────
          ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: _OutfitMosaic(items: items),
          ),

          // ── Bottom gradient ───────────────────────────────────────────
          Positioned.fill(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      Colors.black.withValues(alpha: .12),
                      Colors.black.withValues(alpha: .82),
                    ],
                    stops: const [0.30, 0.55, 1.0],
                  ),
                ),
              ),
            ),
          ),

          // ── ✨ KAYITLI badge — top right ──────────────────────────────
          Positioned(
            top: 12,
            right: 12,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.gold.withValues(alpha: .18),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: AppColors.gold.withValues(alpha: .4),
                      width: .8,
                    ),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('✨', style: TextStyle(fontSize: 11)),
                      SizedBox(width: 4),
                      Text(
                        'KAYITLI',
                        style: TextStyle(
                          color: AppColors.goldLight,
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.1,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // ── Style tag — top left ──────────────────────────────────────
          Positioned(
            top: 12,
            left: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: .45),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: Colors.white.withValues(alpha: .1),
                  width: .8,
                ),
              ),
              child: Text(
                _styleTag.toUpperCase(),
                style: const TextStyle(
                  color: AppColors.textSub,
                  fontSize: 9,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.2,
                ),
              ),
            ),
          ),

          // ── Bottom info strip ─────────────────────────────────────────
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Outfit title
                  Text(
                    outfit.baslik.isNotEmpty ? outfit.baslik : 'Kombin',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontFamily: 'Cormorant',
                      color: AppColors.text,
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -.3,
                    ),
                  ),

                  // Tip preview
                  if (outfit.ipucu.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(
                          Icons.lightbulb_outline_rounded,
                          color: AppColors.gold,
                          size: 11,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            outfit.ipucu,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.gold,
                              fontSize: 10,
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ] else if (outfit.aciklama.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      outfit.aciklama,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textSub,
                        fontSize: 10,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ],

                  const SizedBox(height: 10),

                  // Piece count pill
                  if (items.isNotEmpty) _ItemCountPill(count: items.length),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ItemCountPill extends StatelessWidget {
  final int count;
  const _ItemCountPill({required this.count});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
    decoration: BoxDecoration(
      color: AppColors.gold.withValues(alpha: .12),
      borderRadius: BorderRadius.circular(20),
      border: Border.all(
        color: AppColors.gold.withValues(alpha: .28),
        width: .8,
      ),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(
          Icons.checkroom_outlined,
          color: AppColors.goldLight,
          size: 11,
        ),
        const SizedBox(width: 4),
        Text(
          '$count parça',
          style: const TextStyle(
            color: AppColors.goldLight,
            fontSize: 10,
            fontWeight: FontWeight.w600,
            letterSpacing: .4,
          ),
        ),
      ],
    ),
  );
}

// ── Outfit image mosaic ──────────────────────────────────────────────────────
//  0 items  → full placeholder
//  1 item   → single full-frame
//  2 items  → top 60% / bottom 40%  (full width each)
//  3+ items → top 60% / bottom-left + bottom-right at 40%

class _OutfitMosaic extends StatelessWidget {
  final List<ClothingItem> items;
  const _OutfitMosaic({required this.items});

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return const _MosaicPlaceholder(
        icon: Icons.checkroom_outlined,
        color: AppColors.gold,
      );
    }
    if (items.length == 1) return _MosaicCell(item: items[0]);

    final top = items[0];
    final mid = items[1];
    final bottom = items.length > 2 ? items[2] : null;

    return Column(
      children: [
        Expanded(flex: 6, child: _MosaicCell(item: top)),
        Expanded(
          flex: 4,
          child: Row(
            children: [
              Expanded(
                child: _MosaicCell(
                  item: mid,
                  topBorder: true,
                  rightBorder: bottom != null,
                ),
              ),
              if (bottom != null)
                Expanded(child: _MosaicCell(item: bottom, topBorder: true)),
            ],
          ),
        ),
      ],
    );
  }
}

class _MosaicCell extends StatelessWidget {
  final ClothingItem item;
  final bool topBorder;
  final bool rightBorder;

  const _MosaicCell({
    required this.item,
    this.topBorder = false,
    this.rightBorder = false,
  });

  @override
  Widget build(BuildContext context) {
    final url = item.imageUrl;
    final color = _categoryColor(item.category);
    return Container(
      decoration: BoxDecoration(
        border: Border(
          top: topBorder
              ? BorderSide(color: AppColors.bg.withValues(alpha: .7), width: 2)
              : BorderSide.none,
          right: rightBorder
              ? BorderSide(color: AppColors.bg.withValues(alpha: .7), width: 2)
              : BorderSide.none,
        ),
      ),
      child: (url != null && url.isNotEmpty)
          ? Image.network(
              url,
              fit: BoxFit.cover,
              width: double.infinity,
              height: double.infinity,
              errorBuilder: (_, __, ___) => _MosaicPlaceholder(
                icon: Icons.checkroom_outlined,
                color: color,
              ),
              loadingBuilder: (_, child, prog) => prog == null
                  ? child
                  : _MosaicPlaceholder(
                      icon: Icons.checkroom_outlined,
                      color: color,
                    ),
            )
          : _MosaicPlaceholder(icon: Icons.checkroom_outlined, color: color),
    );
  }
}

class _MosaicPlaceholder extends StatelessWidget {
  final IconData icon;
  final Color color;
  const _MosaicPlaceholder({required this.icon, required this.color});

  @override
  Widget build(BuildContext context) => Container(
    color: color.withValues(alpha: .07),
    child: Center(
      child: Icon(icon, color: color.withValues(alpha: .3), size: 30),
    ),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 2 — Style Scorecard  (Glassmorphism)
// ═══════════════════════════════════════════════════════════════════════════

class _StyleScorecardCard extends StatelessWidget {
  final List<ClothingItem> items;
  const _StyleScorecardCard({required this.items});

  Map<String, int> get _stilCounts {
    final m = <String, int>{};
    for (final i in items) {
      final s = (i.stil?.isNotEmpty == true) ? i.stil! : 'Diğer';
      m[s] = (m[s] ?? 0) + 1;
    }
    return m;
  }

  String get _dominantStil {
    if (_stilCounts.isEmpty) return 'Casual';
    return _stilCounts.entries.reduce((a, b) => a.value >= b.value ? a : b).key;
  }

  List<Color> get _topColors {
    final map = <String, int>{};
    for (final i in items) {
      final c = i.color?.toLowerCase().trim();
      if (c?.isNotEmpty == true) map[c!] = (map[c] ?? 0) + 1;
    }
    return (map.entries.toList()..sort((a, b) => b.value.compareTo(a.value)))
        .take(5)
        .map((e) => _nameToColor(e.key))
        .toList();
  }

  static const _stilColors = <String, Color>{
    'Casual': AppColors.gold,
    'Formal': Color(0xFF9E9E9E),
    'Spor': Color(0xFF4FC3F7),
    'Elegant': Color(0xFFCE93D8),
    'Bohemian': Color(0xFFFFB74D),
    'Streetwear': Color(0xFF80CBC4),
    'Diğer': Color(0xFF455A64),
  };

  @override
  Widget build(BuildContext context) {
    final counts = _stilCounts;
    final total = items.length;
    final dominant = _dominantStil;
    final topColors = _topColors;
    final slices = counts.entries
        .map(
          (e) => _DonutSlice(
            label: e.key,
            count: e.value,
            color: _stilColors[e.key] ?? AppColors.gold,
          ),
        )
        .toList();

    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFF0E0E0E).withValues(alpha: .88),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: AppColors.gold.withValues(alpha: .22),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.gold.withValues(alpha: .06),
                blurRadius: 32,
                spreadRadius: 4,
              ),
            ],
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Header ──────────────────────────────────────────────────
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          AppColors.gold.withValues(alpha: .2),
                          AppColors.goldLight.withValues(alpha: .08),
                        ],
                      ),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: AppColors.gold.withValues(alpha: .3),
                        width: .8,
                      ),
                    ),
                    child: const Icon(
                      Icons.analytics_outlined,
                      color: AppColors.goldLight,
                      size: 16,
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Stil Profilin',
                        style: TextStyle(
                          fontFamily: 'Cormorant',
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: AppColors.text,
                          letterSpacing: -.3,
                        ),
                      ),
                      Text(
                        'Dolap analizi',
                        style: TextStyle(
                          color: AppColors.muted,
                          fontSize: 11,
                          letterSpacing: .3,
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 18),
              const Divider(color: Color(0xFF272720), height: 1),
              const SizedBox(height: 18),

              // ── Stats row ────────────────────────────────────────────────
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Donut chart
                  SizedBox(
                    width: 96,
                    height: 96,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        CustomPaint(
                          size: const Size(96, 96),
                          painter: _DoughnutPainter(
                            slices: slices,
                            total: total,
                          ),
                        ),
                        Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '$total',
                              style: const TextStyle(
                                color: AppColors.text,
                                fontSize: 20,
                                fontWeight: FontWeight.w700,
                                fontFamily: 'Cormorant',
                              ),
                            ),
                            const Text(
                              'Parça',
                              style: TextStyle(
                                color: AppColors.muted,
                                fontSize: 9,
                                letterSpacing: .5,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(width: 20),

                  // Right stats
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _StatRow(
                          icon: Icons.style_outlined,
                          label: 'Baskın Stil',
                          value: dominant,
                          valueColor: AppColors.goldLight,
                        ),
                        const SizedBox(height: 10),
                        _StatRow(
                          icon: Icons.checkroom_outlined,
                          label: 'Toplam Parça',
                          value: '$total kıyafet',
                          valueColor: AppColors.text,
                        ),
                        if (topColors.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              const Icon(
                                Icons.palette_outlined,
                                color: AppColors.muted,
                                size: 13,
                              ),
                              const SizedBox(width: 5),
                              const Text(
                                'Renk Paleti',
                                style: TextStyle(
                                  color: AppColors.muted,
                                  fontSize: 10,
                                  letterSpacing: .5,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: topColors
                                .map(
                                  (c) => Container(
                                    width: 20,
                                    height: 20,
                                    margin: const EdgeInsets.only(right: 5),
                                    decoration: BoxDecoration(
                                      color: c,
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: Colors.white.withValues(
                                          alpha: .12,
                                        ),
                                        width: 1.5,
                                      ),
                                      boxShadow: [
                                        BoxShadow(
                                          color: c.withValues(alpha: .5),
                                          blurRadius: 5,
                                          spreadRadius: 1,
                                        ),
                                      ],
                                    ),
                                  ),
                                )
                                .toList(),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),

              // ── Legend chips ─────────────────────────────────────────────
              if (slices.isNotEmpty) ...[
                const SizedBox(height: 16),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: slices.take(4).map((s) {
                    final pct = total > 0 ? (s.count / total * 100).round() : 0;
                    return Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: s.color.withValues(alpha: .1),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: s.color.withValues(alpha: .25),
                          width: .8,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: s.color,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 5),
                          Text(
                            '${s.label}  $pct%',
                            style: TextStyle(
                              color: s.color,
                              fontSize: 10,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _StatRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color valueColor;

  const _StatRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.valueColor,
  });

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Icon(icon, color: AppColors.muted, size: 13),
      const SizedBox(width: 6),
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: AppColors.muted,
              fontSize: 9,
              letterSpacing: .5,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              color: valueColor,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    ],
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 3 — "Son Eklenenler"  Horizontal thumbnail carousel
// ═══════════════════════════════════════════════════════════════════════════

class _RecentItemsRow extends StatelessWidget {
  final List<ClothingItem> items;
  const _RecentItemsRow({required this.items});

  @override
  Widget build(BuildContext context) {
    final display = items.take(6).toList();
    return SizedBox(
      height: 170,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 22),
        itemCount: display.length,
        itemBuilder: (_, i) => Padding(
          padding: const EdgeInsets.only(right: 12),
          child: _RecentItemCard(item: display[i]),
        ),
      ),
    );
  }
}

class _RecentItemCard extends StatelessWidget {
  final ClothingItem item;
  const _RecentItemCard({required this.item});

  @override
  Widget build(BuildContext context) {
    final accent = _categoryColor(item.category);
    return Container(
      width: 130,
      // height is constrained by the SizedBox(height: 170) parent
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: .3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Thumbnail (takes ~70% of the height)
          Expanded(
            child: Stack(
              fit: StackFit.expand,
              children: [
                (item.imageUrl?.isNotEmpty == true)
                    ? Image.network(
                        item.imageUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _MosaicPlaceholder(
                          icon: Icons.checkroom_outlined,
                          color: accent,
                        ),
                        loadingBuilder: (_, child, prog) => prog == null
                            ? child
                            : _MosaicPlaceholder(
                                icon: Icons.checkroom_outlined,
                                color: accent,
                              ),
                      )
                    : _MosaicPlaceholder(
                        icon: Icons.checkroom_outlined,
                        color: accent,
                      ),

                // Category colour dot
                Positioned(
                  top: 7,
                  left: 7,
                  child: Container(
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(
                      color: accent,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: accent.withValues(alpha: .6),
                          blurRadius: 4,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Name + category label
          Padding(
            padding: const EdgeInsets.fromLTRB(9, 7, 9, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.text,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: .1,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  item.category,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: accent.withValues(alpha: .85),
                    fontSize: 9,
                    letterSpacing: .3,
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

// ═══════════════════════════════════════════════════════════════════════════
//  Gold Shimmer Widgets  (no extra package)
// ═══════════════════════════════════════════════════════════════════════════

class _GoldShimmerRow extends StatefulWidget {
  final double itemWidth;
  final double height;
  const _GoldShimmerRow({required this.itemWidth, this.height = 300});

  @override
  State<_GoldShimmerRow> createState() => _GoldShimmerRowState();
}

class _GoldShimmerRowState extends State<_GoldShimmerRow>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
    _anim = CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => SizedBox(
    height: widget.height,
    child: ListView.builder(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 22),
      itemCount: 4,
      itemBuilder: (_, __) => Padding(
        padding: const EdgeInsets.only(right: 14),
        child: AnimatedBuilder(
          animation: _anim,
          builder: (_, __) => Container(
            width: widget.itemWidth,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: LinearGradient(
                colors: [
                  AppColors.surface,
                  Color.lerp(
                    AppColors.surface,
                    AppColors.gold.withValues(alpha: .08),
                    _anim.value,
                  )!,
                  AppColors.surface,
                ],
                stops: const [0.0, 0.5, 1.0],
              ),
              border: Border.all(color: AppColors.border),
            ),
          ),
        ),
      ),
    ),
  );
}

class _GoldShimmerCard extends StatefulWidget {
  final double height;
  const _GoldShimmerCard({required this.height});

  @override
  State<_GoldShimmerCard> createState() => _GoldShimmerCardState();
}

class _GoldShimmerCardState extends State<_GoldShimmerCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
    _anim = CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _anim,
    builder: (_, __) => Container(
      height: widget.height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: LinearGradient(
          colors: [
            AppColors.surface,
            Color.lerp(
              AppColors.surface,
              AppColors.gold.withValues(alpha: .08),
              _anim.value,
            )!,
            AppColors.surface,
          ],
          stops: const [0.0, 0.5, 1.0],
        ),
        border: Border.all(color: AppColors.border),
      ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Empty States
// ═══════════════════════════════════════════════════════════════════════════

class _EmptyLookbook extends StatelessWidget {
  const _EmptyLookbook();

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 22),
    child: Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.gold.withValues(alpha: .15)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.gold.withValues(alpha: .08),
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.gold.withValues(alpha: .2)),
            ),
            child: const Icon(
              Icons.style_outlined,
              color: AppColors.goldDim,
              size: 28,
            ),
          ),
          const SizedBox(height: 14),
          const Text(
            'Henüz kombin kaydetmediniz',
            style: TextStyle(
              color: AppColors.textSub,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 6),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 40),
            child: Text(
              'Dolabınızdan yeni stiller oluşturun ve burada görün',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.muted,
                fontSize: 11,
                height: 1.5,
              ),
            ),
          ),
          const SizedBox(height: 20),
          GestureDetector(
            onTap: () => Navigator.pushReplacement(
              context,
              slide(const WardrobeScreen()),
            ),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 11),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.gold, AppColors.goldLight],
                ),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.gold.withValues(alpha: .35),
                    blurRadius: 14,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.checkroom_outlined, color: Colors.black, size: 15),
                  SizedBox(width: 7),
                  Text(
                    'Dolabıma Git',
                    style: TextStyle(
                      color: Colors.black,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

class _EmptyWardrobe extends StatelessWidget {
  const _EmptyWardrobe();

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 22),
    child: Container(
      height: 140,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: const Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.checkroom_outlined, color: AppColors.muted, size: 30),
          SizedBox(height: 10),
          Text(
            'Henüz kıyafet yok',
            style: TextStyle(color: AppColors.muted, fontSize: 13),
          ),
          SizedBox(height: 4),
          Text(
            '+ butonuna bas, dolabını oluştur',
            style: TextStyle(color: AppColors.muted, fontSize: 11),
          ),
        ],
      ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Shared UI Widgets
// ═══════════════════════════════════════════════════════════════════════════

class _TopBar extends StatelessWidget {
  final String userName, profilFoto, weatherTemp, weatherDesc;
  final IconData weatherIcon;
  final VoidCallback onProfileTap;

  const _TopBar({
    required this.userName,
    required this.profilFoto,
    required this.weatherTemp,
    required this.weatherDesc,
    required this.weatherIcon,
    required this.onProfileTap,
  });

  @override
  Widget build(BuildContext context) => Row(
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
            Icon(weatherIcon, color: AppColors.goldLight, size: 14),
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
          child: _ProfileAvatar(foto: profilFoto, name: userName, size: 38),
        ),
      ),
    ],
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Profile Avatar  (network / asset / initial fallback)
// ═══════════════════════════════════════════════════════════════════════════

class _ProfileAvatar extends StatelessWidget {
  final String foto;
  final String name;
  final double size;

  const _ProfileAvatar({
    required this.foto,
    required this.name,
    required this.size,
  });

  ImageProvider? get _imageProvider {
    if (foto.startsWith('http://') || foto.startsWith('https://')) {
      return NetworkImage(foto);
    }
    if (foto.startsWith('assets/')) {
      return AssetImage(foto);
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final provider = _imageProvider;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: provider == null
            ? const LinearGradient(
                colors: [AppColors.gold, AppColors.goldLight],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              )
            : null,
        boxShadow: [
          BoxShadow(
            color: AppColors.gold.withValues(alpha: .3),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ClipOval(
        child: provider != null
            ? Image(
                image: provider,
                width: size,
                height: size,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => _Fallback(name: name, size: size),
              )
            : _Fallback(name: name, size: size),
      ),
    );
  }
}

class _Fallback extends StatelessWidget {
  final String name;
  final double size;
  const _Fallback({required this.name, required this.size});

  @override
  Widget build(BuildContext context) {
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '';
    return Container(
      color: Colors.transparent,
      alignment: Alignment.center,
      child: initial.isNotEmpty
          ? Text(
              initial,
              style: TextStyle(
                color: Colors.black,
                fontSize: size * 0.45,
                fontWeight: FontWeight.w700,
                fontFamily: 'Cormorant',
              ),
            )
          : Icon(Icons.person_rounded, color: Colors.black, size: size * 0.5),
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
    crossAxisAlignment: CrossAxisAlignment.center,
    children: [
      Text(
        title,
        style: const TextStyle(
          color: AppColors.text,
          fontSize: 18,
          fontWeight: FontWeight.w600,
          letterSpacing: -.2,
        ),
      ),
      const Spacer(),
      if (action != null)
        GestureDetector(
          onTap: onAction,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.gold.withValues(alpha: .08),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppColors.gold.withValues(alpha: .2),
                width: .8,
              ),
            ),
            child: Text(
              action!,
              style: const TextStyle(
                color: AppColors.gold,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ),
    ],
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Donut Chart
// ═══════════════════════════════════════════════════════════════════════════

class _DonutSlice {
  final String label;
  final int count;
  final Color color;
  const _DonutSlice({
    required this.label,
    required this.count,
    required this.color,
  });
}

class _DoughnutPainter extends CustomPainter {
  final List<_DonutSlice> slices;
  final int total;
  const _DoughnutPainter({required this.slices, required this.total});

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = size.width / 2 - 8;
    const sw = 11.0;

    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = AppColors.surface
        ..style = PaintingStyle.stroke
        ..strokeWidth = sw,
    );

    if (total == 0) return;

    const startAngle = -math.pi / 2;
    const gap = 0.04;
    var angle = startAngle;

    for (final s in slices) {
      if (s.count <= 0) continue;
      final sweep = (s.count / total) * 2 * math.pi - gap;
      if (sweep <= 0) continue;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        angle,
        sweep,
        false,
        Paint()
          ..color = s.color
          ..style = PaintingStyle.stroke
          ..strokeWidth = sw
          ..strokeCap = StrokeCap.round,
      );
      angle += sweep + gap;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter _) => true;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Color name → Color
// ═══════════════════════════════════════════════════════════════════════════

Color _nameToColor(String name) {
  switch (name) {
    case 'siyah':
      return const Color(0xFF1A1A1A);
    case 'beyaz':
      return const Color(0xFFF5F5F5);
    case 'kirmizi':
    case 'kırmızı':
      return const Color(0xFFE53935);
    case 'mavi':
      return const Color(0xFF1E88E5);
    case 'lacivert':
      return const Color(0xFF1A237E);
    case 'yesil':
    case 'yeşil':
      return const Color(0xFF43A047);
    case 'sarı':
    case 'sari':
      return const Color(0xFFFDD835);
    case 'turuncu':
      return const Color(0xFFFB8C00);
    case 'mor':
      return const Color(0xFF8E24AA);
    case 'pembe':
      return const Color(0xFFE91E63);
    case 'gri':
      return const Color(0xFF757575);
    case 'kahve':
    case 'kahverengi':
      return const Color(0xFF795548);
    case 'bej':
      return const Color(0xFFD7CCC8);
    case 'krem':
      return const Color(0xFFFFF8E1);
    case 'haki':
      return const Color(0xFF8D9B39);
    default:
      return AppColors.gold;
  }
}
