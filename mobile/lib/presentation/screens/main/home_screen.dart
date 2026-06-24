import 'dart:convert';
import 'dart:math' as math;
import 'dart:ui';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/core/theme/app_theme_extension.dart';
import 'package:smart_wardrobe_ai/core/utils/nav_transitions.dart';
import 'package:smart_wardrobe_ai/data/models/clothing_item.dart';
import 'package:smart_wardrobe_ai/data/models/saved_outfit.dart';
import 'package:smart_wardrobe_ai/data/services/notification_service.dart';
import 'package:smart_wardrobe_ai/data/services/saved_outfits_store.dart';
import 'package:smart_wardrobe_ai/presentation/screens/item/add_item_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/favorites_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/saved_outfits_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/wardrobe_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/profile/profile_screen.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_background.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_bottom_nav.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_text_styles.dart';

// Category helpers

bool _isCat(String cat, List<String> keys) =>
    keys.any((k) => cat.toLowerCase().contains(k));

// Ağ isteği — tek seferlik otomatik tekrar deneme
//
// Bazı emülatörlerde/cihazlarda uygulama soğuk başlatıldığında (ilk açılış)
// ağ arayüzü/DNS henüz tam hazır olmuyor; initState'te paralel ateşlenen ilk
// istek grubu (items/outfits/profile/weather) bu yüzden başarısız oluyor,
// ama kullanıcı birkaç saniye sonra elle "aşağı kaydır" (refresh) yaptığında
// ağ artık hazır olduğu için aynı istek başarılı oluyor — kullanıcıya "veriler
// hemen gelmiyor, kaydırınca geliyor" gibi görünüyor. Kalıcı bir çözüm için
// ilk denemenin başarısız olması durumunda kısa bir gecikmeyle bir kez daha
// deniyoruz; böylece kullanıcı manuel yenilemeye gerek kalmadan veriyi görür.
Future<T> _withRetry<T>(
  Future<T> Function() action, {
  int retries = 1,
  Duration delay = const Duration(milliseconds: 900),
}) async {
  for (var attempt = 0; ; attempt++) {
    try {
      return await action();
    } catch (e) {
      if (attempt >= retries) rethrow;
      await Future.delayed(delay);
    }
  }
}

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

// HomeScreen

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  static const int _navIndex = 0;

  // Singleton store — reactive SavedOutfit list
  final _store = SavedOutfitsStore.instance;

  // State
  String _userName = 'Kullanıcı';
  String _profilFoto = '';
  bool _itemsLoading = true; // guards items + scorecard sections
  bool _outfitsLoading = true; // guards lookbook independently

  List<ClothingItem> _recentItems = [];
  List<ClothingItem> _allItems = [];

  String _weatherDesc = 'home.loading'.tr();
  String _weatherTemp = '--°';
  IconData _weatherIcon = Icons.wb_cloudy_rounded;
  String _weatherFeelsLike = '--°';
  String _weatherHumidity = '--%';
  String _weatherWind = '-- km/h';
  String _weatherCity = '';

  // Animations
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

    // Push bildirimleri — izin iste, FCM token'ı al ve backend'e kaydet.
    // Web'deki AppShell.tsx'in mobil karşılığı: kullanıcı giriş yaptıktan
    // sonra (HomeScreen her açılışta) çalışır, token yoksa/değiştiyse
    // backend'e gönderir; izin zaten verilmişse sessizce tazeler.
    NotificationService.instance.init();
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    _cardCtrl.dispose();
    super.dispose();
  }

  // Data loading

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
          _weatherDesc = 'home.no_session'.tr();
          _itemsLoading = false;
          _outfitsLoading = false;
        });
      }
      return;
    }

    // Fire weather in background — never blocks other fetches
    _loadWeather(token);

    // Items + outfits + profile photo in parallel
    await Future.wait([
      _fetchItems(token),
      _fetchOutfits(),
      _fetchProfile(token),
    ]);

    // Trigger staggered card entrance
    if (mounted) _cardCtrl.forward(from: 0);
  }

  Future<void> _fetchItems(String token) async {
    try {
      final res = await _withRetry(
        () => http
            .get(
              Uri.parse('${ApiConstants.baseUrl}/items'),
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer $token',
              },
            )
            .timeout(const Duration(seconds: 10)),
      );

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
      final res = await _withRetry(
        () => http
            .get(
              Uri.parse('${ApiConstants.baseUrl}/auth/me'),
              headers: {'Authorization': 'Bearer $token'},
            )
            .timeout(const Duration(seconds: 8)),
      );

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

  // Weather

  Future<void> _loadWeather(String token) async {
    try {
      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) {
        if (mounted)
          setState(() => _weatherDesc = 'home.location_disabled'.tr());
        return;
      }
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
        if (perm == LocationPermission.denied) {
          if (mounted)
            setState(() => _weatherDesc = 'home.permission_denied'.tr());
          return;
        }
      }
      if (perm == LocationPermission.deniedForever) {
        if (mounted)
          setState(
            () => _weatherDesc = 'home.permission_denied_permanently'.tr(),
          );
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
          if (mounted)
            setState(() => _weatherDesc = 'home.location_not_found'.tr());
          return;
        }
      }

      // pos burada her zaman non-null (yukarıdaki dallar null ise erken
      // return ediyor) ama closure içinde Dart bunu otomatik daraltamıyor —
      // closure'a sabit bir non-null kopya yakalatıyoruz.
      final safePos = pos;
      final res = await _withRetry(
        () => http
            .get(
              Uri.parse(
                '${ApiConstants.baseUrl}/weather'
                '?enlem=${safePos.latitude}&boylam=${safePos.longitude}',
              ),
              headers: {'Authorization': 'Bearer $token'},
            )
            .timeout(const Duration(seconds: 8)),
      );

      if (res.statusCode == 200) {
        _parseWeather(res.body);
      } else {
        if (mounted) setState(() => _weatherDesc = 'home.no_weather_info'.tr());
      }
    } catch (_) {
      if (mounted) setState(() => _weatherDesc = 'home.connection_error'.tr());
    }
  }

  void _parseWeather(String body) {
    if (!mounted) return;
    try {
      final data = jsonDecode(body)['havaDurumu'];
      if (data == null) return;
      setState(() {
        _weatherTemp = '${data['sicaklik']}°';
        _weatherFeelsLike = '${data['hissedilen']}°';
        _weatherHumidity = '%${data['nem']}';
        _weatherWind = '${data['ruzgar']} km/h';
        _weatherCity = (data['konum'] as String?) ?? '';
        final desc = (data['durum'] as String?) ?? '';
        _weatherDesc = desc.isNotEmpty
            ? desc[0].toUpperCase() + desc.substring(1)
            : '';
        final ikon = (data['ikon'] as String?) ?? '';
        final main = (data['ana_durum'] as String?) ?? '';
        if (ikon.startsWith('01') || main.contains('Clear'))
          _weatherIcon = Icons.wb_sunny_rounded;
        else if (ikon.startsWith('09') ||
            ikon.startsWith('10') ||
            main.contains('Rain') ||
            main.contains('Drizzle'))
          _weatherIcon = Icons.water_drop_rounded;
        else if (ikon.startsWith('13') || main.contains('Snow'))
          _weatherIcon = Icons.ac_unit_rounded;
        else if (ikon.startsWith('11') || main.contains('Thunderstorm'))
          _weatherIcon = Icons.flash_on_rounded;
        else
          _weatherIcon = Icons.wb_cloudy_rounded;
      });
    } catch (_) {
      if (mounted) setState(() => _weatherDesc = 'Veri ayrıştırılamadı');
    }
  }

  // Weather Detail

  void _showWeatherDetail() {
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'home.close'.tr(),
      barrierColor: Colors.black.withValues(alpha: .4),
      transitionDuration: const Duration(milliseconds: 300),
      pageBuilder: (ctx, _, __) => _WeatherDetailDialog(
        temp: _weatherTemp,
        feelsLike: _weatherFeelsLike,
        humidity: _weatherHumidity,
        wind: _weatherWind,
        city: _weatherCity,
        desc: _weatherDesc,
        mainIcon: _weatherIcon,
      ),
      transitionBuilder: (ctx, anim, _, child) {
        final curve = CurvedAnimation(parent: anim, curve: Curves.easeOutCubic);
        return FadeTransition(
          opacity: CurvedAnimation(parent: anim, curve: Curves.easeOut),
          child: SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0, -0.06),
              end: Offset.zero,
            ).animate(curve),
            child: child,
          ),
        );
      },
    );
  }

  // Navigation

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

  // Build

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColorsExtension.of(context).bg,
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
              backgroundColor: AppColorsExtension.of(context).surface,
              onRefresh: _loadData,
              child: CustomScrollView(
                physics: const BouncingScrollPhysics(
                  parent: AlwaysScrollableScrollPhysics(),
                ),
                slivers: [
                  // Top Bar
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
                        onWeatherTap: _showWeatherDetail,
                      ),
                    ),
                  ),

                  //  SECTION 1 — "Sana Özel Kombinler"  (real saved outfits)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(22, 28, 22, 14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _AiBadge(),
                          const SizedBox(height: 10),
                          _SectionHeader(
                            title: 'home.my_outfits'.tr(),
                            action: 'home.see_all'.tr(),
                            onAction: () => Navigator.pushReplacement(
                              context,
                              slide(const SavedOutfitsScreen()),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'home.outfits_subtitle'.tr(
                              namedArgs: {
                                'temp': _weatherTemp,
                                'desc': _weatherDesc,
                              },
                            ),
                            style: AppTextStyles.caption.copyWith(
                              color: AppColorsExtension.of(context).textSub,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Lookbook carousel — driven by SavedOutfitsStore
                  SliverToBoxAdapter(
                    child: SizedBox(
                      height: 242,
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

                  //  SECTION 2 — Stil Profilin  (Style Scorecard)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(22, 28, 22, 0),
                      child: _itemsLoading
                          ? const _GoldShimmerCard(height: 160)
                          : _StyleScorecardCard(items: _allItems),
                    ),
                  ),

                  //  SECTION 3 — "Son Eklenenler"  (horizontal thumbnail row)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(22, 28, 22, 14),
                      child: _SectionHeader(
                        title: 'home.recent_items'.tr(),
                        action: 'home.see_all'.tr(),
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

//  SECTION 1 — Lookbook Carousel

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

// Individual lookbook card  (SavedOutfit)

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

  // Toplam parça sayısı — web'deki RecentOutfits.tsx ile aynı mantık:
  // gardırop kıyafetleri + (varsa) web'den seçilen ürünler toplanır.
  // "Web'den öner" kullanılmış olsun olmasın aynı şekilde hesaplanır.
  int get _toplamParca => outfit.kiyafetler.length + outfit.disUrunler.length;

  // Resim alanının sabit yüksekliği — 1 parçalık kombinler (örn. web
  // destekli öneriler) tüm kartı doldurup orantısız büyümesin, her zaman
  // kompakt ve tutarlı görünsün (web'deki küçük önizleme ile aynı mantık).
  static const double _mosaicHeight = 150;

  // Kolaj görselleri — gardırop kıyafetleri + (varsa) web'den seçilen
  // ürünler birlikte gösterilir (web'deki OutfitCollage ile aynı mantık).
  List<_CollageImage> get _collageImages => [
    ...outfit.kiyafetler.map(
      (k) => _CollageImage(src: k.imageUrl, category: k.category),
    ),
    ...outfit.disUrunler.map(
      (p) => _CollageImage(src: p.resimUrl, isWeb: true),
    ),
  ].where((img) => img.src != null && img.src!.isNotEmpty).toList();

  @override
  Widget build(BuildContext context) {
    final images = _collageImages;

    return Container(
      width: 280,
      decoration: BoxDecoration(
        color: AppColorsExtension.of(context).card,
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
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Resim alanı (sabit boy + rozetler)
          SizedBox(
            height: _mosaicHeight,
            child: Stack(
              fit: StackFit.expand,
              children: [
                _OutfitMosaic(images: images),

                // Hafif alt gradyan — sadece rozetlerin okunabilirliği için
                const Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.transparent, Color(0x33000000)],
                        stops: [0.55, 1.0],
                      ),
                    ),
                  ),
                ),

                // KAYITLI badge — top right
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
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('✨', style: TextStyle(fontSize: 11)),
                            SizedBox(width: 4),
                            Text(
                              'home.saved'.tr(),
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

                // Style tag — top left
                Positioned(
                  top: 12,
                  left: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 9,
                      vertical: 4,
                    ),
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
                      style: TextStyle(
                        color: AppColorsExtension.of(context).textSub,
                        fontSize: 9,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Bilgi paneli (düz kart zemini üzerinde — fotoğrafın üstüne
          // bindirilmiyor, web'deki kompakt kart görünümüyle aynı: sadece
          // başlık + parça sayısı, ipucu/açıklama metni yok)
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Outfit title
                Text(
                  outfit.baslik.isNotEmpty ? outfit.baslik : 'Kombin',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: 'Cormorant',
                    color: AppColorsExtension.of(context).text,
                    fontSize: 19,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -.3,
                  ),
                ),
                const SizedBox(height: 8),

                // Parça sayısı — web'deki gibi gardırop + web'den seçilen
                // ürünlerin toplamı (Web'den öner kullanılsın kullanılmasın
                // aynı mantık: kiyafetler.length + disUrunler.length).
                if (_toplamParca > 0) _ItemCountPill(count: _toplamParca),
              ],
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
          '$count ' + 'home.items'.tr(),
          style: TextStyle(
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

// Kolaj görseli — gardırop kıyafeti veya web'den seçilen ürün olabilir.
// Web kaynaklıysa küçük bir 🛍️ rozetiyle işaretlenir (web'deki WebBadge ile aynı).
class _CollageImage {
  final String? src;
  final bool isWeb;
  final String category;
  const _CollageImage({this.src, this.isWeb = false, this.category = ''});
}

// Outfit image mosaic
//  0 görsel  → full placeholder
//  1 görsel  → single full-frame
//  2 görsel  → top 60% / bottom 40%  (full width each)
//  3+ görsel → top 60% / bottom-left + bottom-right at 40%

class _OutfitMosaic extends StatelessWidget {
  final List<_CollageImage> images;
  const _OutfitMosaic({required this.images});

  @override
  Widget build(BuildContext context) {
    if (images.isEmpty) {
      return const _MosaicPlaceholder(
        icon: Icons.checkroom_outlined,
        color: AppColors.gold,
      );
    }
    if (images.length == 1) return _MosaicCell(image: images[0]);

    final top = images[0];
    final mid = images[1];
    final bottom = images.length > 2 ? images[2] : null;

    return Column(
      children: [
        Expanded(flex: 6, child: _MosaicCell(image: top)),
        Expanded(
          flex: 4,
          child: Row(
            children: [
              Expanded(
                child: _MosaicCell(
                  image: mid,
                  topBorder: true,
                  rightBorder: bottom != null,
                ),
              ),
              if (bottom != null)
                Expanded(child: _MosaicCell(image: bottom, topBorder: true)),
            ],
          ),
        ),
      ],
    );
  }
}

class _MosaicCell extends StatelessWidget {
  final _CollageImage image;
  final bool topBorder;
  final bool rightBorder;

  const _MosaicCell({
    required this.image,
    this.topBorder = false,
    this.rightBorder = false,
  });

  @override
  Widget build(BuildContext context) {
    final url = image.src;
    final color = _categoryColor(image.category);
    return Stack(
      fit: StackFit.expand,
      children: [
        Container(
          decoration: BoxDecoration(
            border: Border(
              top: topBorder
                  ? BorderSide(color: AppColorsExtension.of(context).bg.withValues(alpha: .7), width: 2)
                  : BorderSide.none,
              right: rightBorder
                  ? BorderSide(color: AppColorsExtension.of(context).bg.withValues(alpha: .7), width: 2)
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
        ),

        // Web'den seçildiğini gösteren küçük rozet — web'deki WebBadge ile aynı
        if (image.isWeb)
          Positioned(
            top: 4,
            right: 4,
            child: Container(
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                color: AppColors.gold.withValues(alpha: .92),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.shopping_bag_rounded,
                color: Colors.black,
                size: 10,
              ),
            ),
          ),
      ],
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

//  SECTION 2 — Style Scorecard  (Glassmorphism)

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

  static const _stilColors = <String, Color>{
    // Türkçe
    'Casual': Color(0xFFD4A853),
    'Günlük': Color(0xFFD4A853),
    'Spor': Color(0xFF4FC3F7),
    'Klasik': Color(0xFF9E9E9E),
    'Formal': Color(0xFF9E9E9E),
    'Sokak': Color(0xFF80CBC4),
    'Streetwear': Color(0xFF80CBC4),
    'Şık': Color(0xFFCE93D8),
    'Elegant': Color(0xFFCE93D8),
    'Resmi': Color(0xFF90A4AE),
    'Bohemian': Color(0xFFFFB74D),
    'Minimal': Color(0xFFB0BEC5),
    'Diğer': Color(0xFF546E7A),
  };

  @override
  Widget build(BuildContext context) {
    final counts = _stilCounts;
    final total = items.length;
    final dominant = _dominantStil;
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
              // Header
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
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'home.style_profile_title'.tr(),
                        style: TextStyle(
                          fontFamily: 'Cormorant',
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: AppColorsExtension.of(context).text,
                          letterSpacing: -.3,
                        ),
                      ),
                      Text(
                        'home.style_profile_subtitle'.tr(),
                        style: TextStyle(
                          color: AppColorsExtension.of(context).muted,
                          fontSize: 11,
                          letterSpacing: .3,
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 18),
              Divider(color: AppColorsExtension.of(context).border, height: 1),
              const SizedBox(height: 18),

              // Donut + özet satırı
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Donut chart
                  SizedBox(
                    width: 90,
                    height: 90,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        CustomPaint(
                          size: const Size(90, 90),
                          painter: _DoughnutPainter(
                            slices: slices,
                            total: total,
                            trackColor: AppColorsExtension.of(context).surface,
                          ),
                        ),
                        Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '$total',
                              style: TextStyle(
                                color: AppColorsExtension.of(context).text,
                                fontSize: 22,
                                fontWeight: FontWeight.w700,
                                fontFamily: 'Cormorant',
                              ),
                            ),
                            Text(
                              'home.pieces'.tr(),
                              style: TextStyle(
                                color: AppColorsExtension.of(context).muted,
                                fontSize: 9,
                                letterSpacing: .5,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(width: 18),

                  // Baskın stil + toplam
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _StatRow(
                          icon: Icons.style_outlined,
                          label: 'home.dominant_style'.tr(),
                          value: dominant,
                          valueColor:
                              _stilColors[dominant] ?? AppColors.goldLight,
                        ),
                        const SizedBox(height: 10),
                        _StatRow(
                          icon: Icons.checkroom_outlined,
                          label: 'home.total_items'.tr(),
                          value: 'home.total_items_count'.tr(
                            namedArgs: {'count': '$total'},
                          ),
                          valueColor: AppColorsExtension.of(context).text,
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              // Stil dağılımı — progress bar'lı liste
              if (slices.isNotEmpty) ...[
                const SizedBox(height: 20),
                Divider(color: AppColorsExtension.of(context).border, height: 1),
                const SizedBox(height: 16),
                ...slices.take(4).map((s) {
                  final pct = total > 0 ? s.count / total : 0.0;
                  final pctLabel = '${(pct * 100).round()}%';
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: s.color,
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: s.color.withValues(alpha: .5),
                                    blurRadius: 4,
                                    spreadRadius: 1,
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                s.label,
                                style: TextStyle(
                                  color: s.color,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  letterSpacing: .2,
                                ),
                              ),
                            ),
                            Text(
                              pctLabel,
                              style: TextStyle(
                                color: s.color.withValues(alpha: .85),
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 5),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: Stack(
                            children: [
                              Container(
                                height: 4,
                                width: double.infinity,
                                color: s.color.withValues(alpha: .1),
                              ),
                              FractionallySizedBox(
                                widthFactor: pct.toDouble(),
                                child: Container(
                                  height: 4,
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [
                                        s.color.withValues(alpha: .6),
                                        s.color,
                                      ],
                                    ),
                                    borderRadius: BorderRadius.circular(4),
                                    boxShadow: [
                                      BoxShadow(
                                        color: s.color.withValues(alpha: .4),
                                        blurRadius: 4,
                                        offset: const Offset(0, 1),
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
                  );
                }),
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
      Icon(icon, color: AppColorsExtension.of(context).muted, size: 13),
      const SizedBox(width: 6),
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: AppColorsExtension.of(context).muted,
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

//  SECTION 3 — "Son Eklenenler"  Horizontal thumbnail carousel

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
        color: AppColorsExtension.of(context).card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColorsExtension.of(context).border),
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
                  style: TextStyle(
                    color: AppColorsExtension.of(context).text,
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

//  Gold Shimmer Widgets  (no extra package)

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
                  AppColorsExtension.of(context).surface,
                  Color.lerp(
                    AppColorsExtension.of(context).surface,
                    AppColors.gold.withValues(alpha: .08),
                    _anim.value,
                  )!,
                  AppColorsExtension.of(context).surface,
                ],
                stops: const [0.0, 0.5, 1.0],
              ),
              border: Border.all(color: AppColorsExtension.of(context).border),
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
            AppColorsExtension.of(context).surface,
            Color.lerp(
              AppColorsExtension.of(context).surface,
              AppColors.gold.withValues(alpha: .08),
              _anim.value,
            )!,
            AppColorsExtension.of(context).surface,
          ],
          stops: const [0.0, 0.5, 1.0],
        ),
        border: Border.all(color: AppColorsExtension.of(context).border),
      ),
    ),
  );
}

//  Empty States

class _EmptyLookbook extends StatelessWidget {
  const _EmptyLookbook();

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 22),
    child: Container(
      decoration: BoxDecoration(
        color: AppColorsExtension.of(context).surface,
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
          Text(
            'home.empty_lookbook'.tr(),
            style: TextStyle(
              color: AppColorsExtension.of(context).textSub,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 6),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40),
            child: Text(
              'home.empty_lookbook_subtitle'.tr(),
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColorsExtension.of(context).muted,
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
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.checkroom_outlined,
                    color: Colors.black,
                    size: 15,
                  ),
                  const SizedBox(width: 7),
                  Text(
                    'home.go_to_wardrobe'.tr(),
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
        color: AppColorsExtension.of(context).surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColorsExtension.of(context).border),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.checkroom_outlined,
            color: AppColorsExtension.of(context).muted,
            size: 30,
          ),
          const SizedBox(height: 10),
          Text(
            'home.empty_items'.tr(),
            style: TextStyle(color: AppColorsExtension.of(context).muted, fontSize: 13),
          ),
          const SizedBox(height: 4),
          Text(
            'home.add_to_wardrobe'.tr(),
            style: TextStyle(color: AppColorsExtension.of(context).muted, fontSize: 11),
          ),
        ],
      ),
    ),
  );
}

//  Shared UI Widgets

class _TopBar extends StatelessWidget {
  final String userName, profilFoto, weatherTemp, weatherDesc;
  final IconData weatherIcon;
  final VoidCallback onProfileTap;
  final VoidCallback onWeatherTap;

  const _TopBar({
    required this.userName,
    required this.profilFoto,
    required this.weatherTemp,
    required this.weatherDesc,
    required this.weatherIcon,
    required this.onProfileTap,
    required this.onWeatherTap,
  });

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'home.greeting'.tr(),
              style: AppTextStyles.label.copyWith(
                color: AppColorsExtension.of(context).textSub,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              userName,
              style: TextStyle(
                fontFamily: 'Cormorant',
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: AppColorsExtension.of(context).text,
                letterSpacing: -.5,
              ),
            ),
          ],
        ),
      ),
      GestureDetector(
        onTap: onWeatherTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          decoration: BoxDecoration(
            color: AppColorsExtension.of(context).surface,
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: AppColorsExtension.of(context).border),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(weatherIcon, color: AppColors.goldLight, size: 14),
              const SizedBox(width: 5),
              Text(
                '$weatherTemp $weatherDesc',
                style: TextStyle(
                  color: AppColorsExtension.of(context).textSub,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(width: 3),
              Icon(
                Icons.keyboard_arrow_down_rounded,
                color: AppColorsExtension.of(context).muted,
                size: 14,
              ),
            ],
          ),
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

//  Profile Avatar  (network / asset / initial fallback)

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
          'home.ai_badge'.tr(),
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
        style: TextStyle(
          color: AppColorsExtension.of(context).text,
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
              style: TextStyle(
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

//  Donut Chart

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
  final Color trackColor;
  const _DoughnutPainter({
    required this.slices,
    required this.total,
    required this.trackColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = size.width / 2 - 8;
    const sw = 11.0;

    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = trackColor
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

//  Weather Detail Dialog

class _WeatherDetailDialog extends StatelessWidget {
  final String temp, feelsLike, humidity, wind, city, desc;
  final IconData mainIcon;

  const _WeatherDetailDialog({
    required this.temp,
    required this.feelsLike,
    required this.humidity,
    required this.wind,
    required this.city,
    required this.desc,
    required this.mainIcon,
  });

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: const Alignment(0, -0.5),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 22),
        child: Material(
          color: Colors.transparent,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
              child: Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF0C0C0C).withValues(alpha: .93),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: AppColors.gold.withValues(alpha: .28),
                    width: 1,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.gold.withValues(alpha: .07),
                      blurRadius: 48,
                      spreadRadius: 6,
                    ),
                    BoxShadow(
                      color: Colors.black.withValues(alpha: .55),
                      blurRadius: 32,
                      offset: const Offset(0, 12),
                    ),
                  ],
                ),
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // ── Handle
                    Container(
                      width: 32,
                      height: 3,
                      decoration: BoxDecoration(
                        color: AppColorsExtension.of(context).border,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Header: icon + city + desc + temp
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                AppColors.gold.withValues(alpha: .22),
                                AppColors.goldLight.withValues(alpha: .08),
                              ],
                            ),
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: AppColors.gold.withValues(alpha: .35),
                              width: .8,
                            ),
                          ),
                          child: Icon(
                            mainIcon,
                            color: AppColors.goldLight,
                            size: 22,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (city.isNotEmpty)
                                Text(
                                  city,
                                  style: TextStyle(
                                    color: AppColorsExtension.of(context).muted,
                                    fontSize: 10,
                                    letterSpacing: .6,
                                  ),
                                ),
                              Text(
                                desc.isNotEmpty ? desc : 'Hava Durumu',
                                style: TextStyle(
                                  fontFamily: 'Cormorant',
                                  color: AppColorsExtension.of(context).text,
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: -.2,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          temp,
                          style: TextStyle(
                            fontFamily: 'Cormorant',
                            color: AppColorsExtension.of(context).text,
                            fontSize: 42,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -1.5,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 18),
                    Divider(
                      color: AppColors.gold.withValues(alpha: .15),
                      height: 1,
                    ),
                    const SizedBox(height: 16),

                    // Metrics 2×2 grid
                    Row(
                      children: [
                        Expanded(
                          child: _WeatherMetric(
                            icon: Icons.thermostat_outlined,
                            label: 'home.feels_like'.tr(),
                            value: feelsLike,
                          ),
                        ),
                        Container(
                          width: 1,
                          height: 48,
                          color: AppColorsExtension.of(context).border,
                        ),
                        Expanded(
                          child: _WeatherMetric(
                            icon: Icons.water_drop_outlined,
                            label: 'home.humidity'.tr(),
                            value: humidity,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Divider(color: AppColorsExtension.of(context).border, height: 1),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Expanded(
                          child: _WeatherMetric(
                            icon: Icons.air_rounded,
                            label: 'home.wind'.tr(),
                            value: wind,
                          ),
                        ),
                        Container(
                          width: 1,
                          height: 48,
                          color: AppColorsExtension.of(context).border,
                        ),
                        Expanded(
                          child: _WeatherMetric(
                            icon: Icons.location_on_outlined,
                            label: 'home.location'.tr(),
                            value: city.isNotEmpty
                                ? city.split(',').first.trim()
                                : '--',
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 14),

                    // Dismiss hint
                    Text(
                      'home.tap_outside_to_close'.tr(),
                      style: TextStyle(
                        color: AppColorsExtension.of(context).muted.withValues(alpha: .5),
                        fontSize: 9,
                        letterSpacing: .4,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _WeatherMetric extends StatelessWidget {
  final IconData icon;
  final String label, value;

  const _WeatherMetric({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    child: Row(
      children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: AppColors.gold.withValues(alpha: .1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: AppColors.gold.withValues(alpha: .2),
              width: .8,
            ),
          ),
          child: Icon(icon, color: AppColors.goldLight, size: 14),
        ),
        const SizedBox(width: 10),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(
                color: AppColorsExtension.of(context).muted,
                fontSize: 9,
                letterSpacing: .5,
              ),
            ),
            Text(
              value,
              style: TextStyle(
                color: AppColorsExtension.of(context).text,
                fontSize: 14,
                fontWeight: FontWeight.w600,
                letterSpacing: -.2,
              ),
            ),
          ],
        ),
      ],
    ),
  );
}

//  Color name → Color

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
