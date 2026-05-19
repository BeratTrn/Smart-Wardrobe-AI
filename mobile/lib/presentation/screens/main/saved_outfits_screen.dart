// ─────────────────────────────────────────────────────────────────────────────
//  KOMBİNLERİM — Kaydedilen stil kombinlerinin listesi
//  BottomNav index 3 — Dark / Gold tema, premium kart tasarımı.
// ─────────────────────────────────────────────────────────────────────────────

import 'dart:ui' as ui;

import 'package:calendar_date_picker2/calendar_date_picker2.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/core/theme/app_theme_extension.dart';
import 'package:smart_wardrobe_ai/core/utils/nav_transitions.dart';
import 'package:smart_wardrobe_ai/data/models/clothing_item.dart';
import 'package:smart_wardrobe_ai/data/models/saved_outfit.dart';
import 'package:smart_wardrobe_ai/data/models/travel_suitcase.dart';
import 'package:smart_wardrobe_ai/data/services/api_service.dart';
import 'package:smart_wardrobe_ai/data/services/saved_outfits_store.dart';
import 'package:smart_wardrobe_ai/presentation/screens/item/add_item_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/favorites_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/home_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/wardrobe_screen.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_background.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_bottom_nav.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_text_styles.dart';

class SavedOutfitsScreen extends StatefulWidget {
  const SavedOutfitsScreen({super.key});

  @override
  State<SavedOutfitsScreen> createState() => _SavedOutfitsScreenState();
}

class _SavedOutfitsScreenState extends State<SavedOutfitsScreen>
    with TickerProviderStateMixin {
  final _store = SavedOutfitsStore.instance;

  late final AnimationController _fadeCtrl;
  late final Animation<double> _fadeAnim;
  late final TabController _tabCtrl;

  bool _isLoading = true;
  bool _suitcasesLoading = true;
  List<TravelSuitcase> _suitcases = [];
  int _currentTab = 0;

  @override
  void initState() {
    super.initState();

    _fadeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    )..forward();
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);

    _tabCtrl = TabController(length: 2, vsync: this)
      ..addListener(_onTabChanged);

    _loadData();
  }

  void _onTabChanged() {
    // Update immediately so the title animates while the tab slides.
    if (_currentTab != _tabCtrl.index) {
      setState(() => _currentTab = _tabCtrl.index);
    }
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _suitcasesLoading = true;
    });
    await Future.wait([
      _store.load(),
      ApiService.instance
          .getSuitcases()
          .then((list) {
            if (mounted) setState(() => _suitcases = list);
          })
          .catchError((_) {
            if (mounted) setState(() => _suitcases = []);
          }),
    ]);
    if (mounted) {
      setState(() {
        _isLoading = false;
        _suitcasesLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _tabCtrl
      ..removeListener(_onTabChanged)
      ..dispose();
    _fadeCtrl.dispose();
    super.dispose();
  }

  void _onNavTap(int index) {
    if (index == 3) return;
    switch (index) {
      case 0:
        Navigator.pushReplacement(context, slide(const HomeScreen()));
        break;
      case 1:
        Navigator.pushReplacement(context, slide(const FavoritesScreen()));
        break;
      case 2:
        Navigator.push(context, slideUp(const AddItemScreen()));
        break;
      case 4:
        Navigator.pushReplacement(context, slide(const WardrobeScreen()));
        break;
    }
  }

  Future<void> _deleteSuitcase(TravelSuitcase suitcase) async {
    final prev = List<TravelSuitcase>.from(_suitcases);
    setState(() => _suitcases.removeWhere((s) => s.id == suitcase.id));
    try {
      await ApiService.instance.deleteSuitcase(suitcase.id);
    } catch (_) {
      if (mounted) setState(() => _suitcases = prev);
    }
  }

  void _confirmDeleteSuitcase(BuildContext ctx, TravelSuitcase suitcase) {
    showModalBottomSheet(
      context: ctx,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(22, 16, 22, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'saved_outfits.delete_bag'.tr(),
              style: TextStyle(
                fontFamily: 'Cormorant',
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: AppColors.text,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              '"${suitcase.sehir}" ' + 'saved_outfits.delete_bag_confirm'.tr(),
              style: const TextStyle(
                color: AppColors.textSub,
                fontSize: 13,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 22),
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => Navigator.pop(ctx),
                    child: Container(
                      height: 48,
                      decoration: BoxDecoration(
                        color: AppColors.bg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Center(
                        child: Text(
                          'saved_outfits.cancel'.tr(),
                          style: TextStyle(
                            color: AppColors.textSub,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      Navigator.pop(ctx);
                      _deleteSuitcase(suitcase);
                    },
                    child: Container(
                      height: 48,
                      decoration: BoxDecoration(
                        color: AppColors.error.withValues(alpha: .12),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: AppColors.error.withValues(alpha: .4),
                        ),
                      ),
                      child: Center(
                        child: Text(
                          'saved_outfits.delete'.tr(),
                          style: TextStyle(
                            color: AppColors.error,
                            fontWeight: FontWeight.w700,
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

  void _confirmDelete(BuildContext ctx, SavedOutfit outfit) {
    showModalBottomSheet(
      context: ctx,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(22, 16, 22, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'saved_outfits.delete_outfit'.tr(),
              style: TextStyle(
                fontFamily: 'Cormorant',
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: AppColors.text,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              '"${outfit.baslik}" ' +
                  'saved_outfits.delete_outfit_confirm'.tr(),
              style: const TextStyle(
                color: AppColors.textSub,
                fontSize: 13,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 22),
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => Navigator.pop(ctx),
                    child: Container(
                      height: 48,
                      decoration: BoxDecoration(
                        color: AppColors.bg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Center(
                        child: Text(
                          'saved_outfits.cancel'.tr(),
                          style: TextStyle(
                            color: AppColors.textSub,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      Navigator.pop(ctx);
                      _store.delete(outfit.id);
                    },
                    child: Container(
                      height: 48,
                      decoration: BoxDecoration(
                        color: AppColors.error.withValues(alpha: .12),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: AppColors.error.withValues(alpha: .4),
                        ),
                      ),
                      child: Center(
                        child: Text(
                          'saved_outfits.delete'.tr(),
                          style: TextStyle(
                            color: AppColors.error,
                            fontWeight: FontWeight.w700,
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

  void _showTravelPlanSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _TravelPlanSheet(
        onSuccess: (suitcase) {
          setState(() => _suitcases.insert(0, suitcase));
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                '${suitcase.sehir} ' +
                    'saved_outfits.outfit_bag_ready'.tr() +
                    ' 🧳',
                style: const TextStyle(color: AppColors.text),
              ),
              backgroundColor: AppColors.surface,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: AppColors.gold.withValues(alpha: .4)),
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      extendBody: true,
      bottomNavigationBar: AppBottomNav(currentIndex: 3, onTap: _onNavTap),
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: FadeTransition(
            opacity: _fadeAnim,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Dynamic Header ────────────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.fromLTRB(22, 16, 22, 0),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'saved_outfits.style_archive'.tr(),
                            style: AppTextStyles.label.copyWith(
                              color: AppColorsExtension.of(context).textSub,
                              letterSpacing: 2,
                            ),
                          ),
                          const SizedBox(height: 2),
                          // Animated title swap on tab change
                          AnimatedSwitcher(
                            duration: const Duration(milliseconds: 280),
                            transitionBuilder: (child, anim) => FadeTransition(
                              opacity: anim,
                              child: SlideTransition(
                                position: Tween<Offset>(
                                  begin: const Offset(0, .15),
                                  end: Offset.zero,
                                ).animate(anim),
                                child: child,
                              ),
                            ),
                            child: Text(
                              _currentTab == 0
                                  ? 'saved_outfits.my_outfits'.tr()
                                  : 'saved_outfits.travel_bags'.tr(),
                              key: ValueKey(_currentTab),
                              style: TextStyle(
                                fontFamily: 'Cormorant',
                                fontSize: 32,
                                fontWeight: FontWeight.w700,
                                color: AppColorsExtension.of(context).text,
                                letterSpacing: -.3,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const Spacer(),
                      // Counter badge — outfit count on tab 0, suitcase count on tab 1
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 220),
                        child: _currentTab == 0
                            ? ValueListenableBuilder<List<SavedOutfit>>(
                                key: const ValueKey('outfitBadge'),
                                valueListenable: _store.outfits,
                                builder: (_, list, __) =>
                                    (_isLoading || list.isEmpty)
                                    ? const SizedBox.shrink()
                                    : _CountBadge(
                                        label:
                                            '${list.length} ' +
                                            'saved_outfits.outfit'.tr(),
                                      ),
                              )
                            : (!_suitcasesLoading && _suitcases.isNotEmpty)
                            ? _CountBadge(
                                key: const ValueKey('suitcaseBadge'),
                                label:
                                    '${_suitcases.length} ' +
                                    'saved_outfits.bag'.tr(),
                              )
                            : const SizedBox.shrink(key: ValueKey('noBadge')),
                      ),
                    ],
                  ),
                ),

                // ── Custom Gold TabBar ─────────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.fromLTRB(22, 14, 22, 0),
                  child: Container(
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      color: AppColorsExtension.of(context).surface,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: AppColorsExtension.of(context).border,
                      ),
                    ),
                    child: TabBar(
                      controller: _tabCtrl,
                      indicator: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [AppColors.gold, AppColors.goldLight],
                        ),
                        borderRadius: BorderRadius.circular(11),
                      ),
                      indicatorSize: TabBarIndicatorSize.tab,
                      dividerColor: Colors.transparent,
                      labelColor: Colors.black,
                      unselectedLabelColor: AppColors.muted,
                      labelStyle: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        letterSpacing: .2,
                      ),
                      unselectedLabelStyle: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                      tabs: [
                        Tab(height: 36, text: 'saved_outfits.my_outfits'.tr()),
                        Tab(height: 36, text: 'saved_outfits.travel_bags'.tr()),
                      ],
                    ),
                  ),
                ),

                // ── Tab views ──────────────────────────────────────────────────
                Expanded(
                  child: TabBarView(
                    controller: _tabCtrl,
                    physics: const NeverScrollableScrollPhysics(),
                    children: [_buildKombinim(), _buildSeyahat()],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ── Tab 1: kombin listesi ──────────────────────────────────────────────────

  Widget _buildKombinim() {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 350),
      switchInCurve: Curves.easeOut,
      switchOutCurve: Curves.easeIn,
      child: _isLoading
          ? const _LoadingSpinner(key: ValueKey('loading'))
          : ValueListenableBuilder<List<SavedOutfit>>(
              key: const ValueKey('content'),
              valueListenable: _store.outfits,
              builder: (ctx, outfits, __) {
                if (outfits.isEmpty) {
                  return _EmptyState(key: const ValueKey('empty'));
                }
                return ListView.separated(
                  key: const ValueKey('list'),
                  padding: const EdgeInsets.fromLTRB(22, 16, 22, 110),
                  itemCount: outfits.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 14),
                  itemBuilder: (_, i) => _OutfitCard(
                    outfit: outfits[i],
                    onDelete: () => _confirmDelete(ctx, outfits[i]),
                  ),
                );
              },
            ),
    );
  }

  // ── Tab 2: seyahat bavulu ──────────────────────────────────────────────────

  Widget _buildSeyahat() {
    if (_suitcasesLoading) {
      return const _LoadingSpinner(key: ValueKey('suitcaseLoading'));
    }
    if (_suitcases.isEmpty) {
      return SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(22, 22, 22, 110),
        child: _TravelBannerCard(onPack: _showTravelPlanSheet),
      );
    }
    return Stack(
      children: [
        ListView.separated(
          padding: const EdgeInsets.fromLTRB(22, 16, 22, 120),
          itemCount: _suitcases.length,
          separatorBuilder: (_, __) => const SizedBox(height: 14),
          itemBuilder: (ctx, i) => _SuitcaseCard(
            suitcase: _suitcases[i],
            onDelete: () => _confirmDeleteSuitcase(ctx, _suitcases[i]),
          ),
        ),
        Positioned(
          right: 22,
          bottom: 100,
          child: GestureDetector(
            onTap: _showTravelPlanSheet,
            child: Container(
              height: 48,
              padding: const EdgeInsets.symmetric(horizontal: 18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.gold, AppColors.goldLight],
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.gold.withValues(alpha: .45),
                    blurRadius: 20,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.add_rounded, color: Colors.black, size: 18),
                  SizedBox(width: 7),
                  Text(
                    'saved_outfits.new_trip'.tr(),
                    style: TextStyle(
                      color: Colors.black,
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      letterSpacing: .2,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

//  SEYAHAT BANNER KARTI

class _TravelBannerCard extends StatelessWidget {
  final VoidCallback onPack;
  const _TravelBannerCard({required this.onPack});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: 14, sigmaY: 14),
        child: Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: const Color(0xFF0D0D0D).withValues(alpha: .90),
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
                color: Colors.black.withValues(alpha: .5),
                blurRadius: 28,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Stack(
            children: [
              // Decorative plane icon
              Positioned(
                right: -24,
                top: -24,
                child: Opacity(
                  opacity: .045,
                  child: const Icon(
                    Icons.flight_rounded,
                    size: 200,
                    color: AppColors.gold,
                  ),
                ),
              ),

              Padding(
                padding: const EdgeInsets.all(22),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // AI badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            AppColors.gold.withValues(alpha: .18),
                            AppColors.goldLight.withValues(alpha: .07),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: AppColors.gold.withValues(alpha: .35),
                          width: .8,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.auto_awesome_rounded,
                            color: AppColors.goldLight,
                            size: 12,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            'saved_outfits.ai_travel'.tr(),
                            style: AppTextStyles.label.copyWith(
                              color: AppColors.goldLight,
                              fontSize: 10,
                              letterSpacing: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 18),

                    Text(
                      'saved_outfits.upcoming_trip'.tr() + ' ✈️',
                      style: TextStyle(
                        fontFamily: 'Cormorant',
                        fontSize: 26,
                        fontWeight: FontWeight.w700,
                        color: AppColors.text,
                        letterSpacing: -.3,
                        height: 1.2,
                      ),
                    ),

                    const SizedBox(height: 10),

                    Text(
                      'saved_outfits.choose_destination_and_date'.tr() +
                          'saved_outfits.prepare_capsule_wardrobe'.tr(),
                      style: TextStyle(
                        color: AppColors.textSub,
                        fontSize: 13,
                        height: 1.65,
                        letterSpacing: .1,
                      ),
                    ),

                    const SizedBox(height: 22),

                    // CTA button — "Yakında" text removed
                    GestureDetector(
                      onTap: onPack,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 18,
                          vertical: 11,
                        ),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [AppColors.gold, AppColors.goldLight],
                          ),
                          borderRadius: BorderRadius.circular(13),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.gold.withValues(alpha: .4),
                              blurRadius: 16,
                              offset: const Offset(0, 5),
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.luggage_rounded,
                              color: Colors.black,
                              size: 15,
                            ),
                            SizedBox(width: 7),
                            Text(
                              'saved_outfits.prepare_bag'.tr(),
                              style: TextStyle(
                                color: Colors.black,
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                letterSpacing: .2,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 4),
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

//  SEYAHAT PLANI — Modal Bottom Sheet

class _TravelPlanSheet extends StatefulWidget {
  final ValueChanged<TravelSuitcase> onSuccess;
  const _TravelPlanSheet({required this.onSuccess});

  @override
  State<_TravelPlanSheet> createState() => _TravelPlanSheetState();
}

class _TravelPlanSheetState extends State<_TravelPlanSheet> {
  final _cityCtrl = TextEditingController();
  DateTimeRange? _dateRange;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _cityCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDateRange() async {
    final now = DateTime.now();
    await showGeneralDialog<void>(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'saved_outfits.close'.tr(),
      barrierColor: Colors.black.withValues(alpha: .72),
      transitionDuration: const Duration(milliseconds: 280),
      transitionBuilder: (_, anim, __, child) => FadeTransition(
        opacity: CurvedAnimation(parent: anim, curve: Curves.easeOut),
        child: ScaleTransition(
          scale: Tween<double>(
            begin: .93,
            end: 1.0,
          ).animate(CurvedAnimation(parent: anim, curve: Curves.easeOutCubic)),
          child: child,
        ),
      ),
      pageBuilder: (_, __, ___) => _DateRangePickerDialog(
        initialValue: _dateRange != null
            ? [_dateRange!.start, _dateRange!.end]
            : [now, now.add(const Duration(days: 7))],
        firstDate: now,
        onConfirm: (range) => setState(() => _dateRange = range),
      ),
    );
  }

  String get _dateLabel {
    if (_dateRange == null) return 'saved_outfits.select_date_range'.tr();
    final fmt = DateFormat('d MMM', 'tr_TR');
    return '${fmt.format(_dateRange!.start)}  →  ${fmt.format(_dateRange!.end)}';
  }

  Future<void> _submit() async {
    final city = _cityCtrl.text.trim();
    if (city.isEmpty || _dateRange == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('saved_outfits.please_enter_destination_and_date'.tr()),
          backgroundColor: AppColors.surface,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: AppColors.error.withValues(alpha: .4)),
          ),
        ),
      );
      return;
    }
    setState(() => _isSubmitting = true);
    try {
      final suitcase = await ApiService.instance.generateSuitcase(
        sehir: city,
        baslangicTarihi: _dateRange!.start.toIso8601String().split('T').first,
        bitisTarihi: _dateRange!.end.toIso8601String().split('T').first,
      );
      if (!mounted) return;
      Navigator.pop(context);
      widget.onSuccess(suitcase);
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e.toString().replaceFirst('Exception: ', ''),
            style: const TextStyle(color: AppColors.text),
          ),
          backgroundColor: AppColors.surface,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: AppColors.error.withValues(alpha: .4)),
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;

    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      child: BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: 24, sigmaY: 24),
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFF111111).withValues(alpha: .96),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            border: Border.all(
              color: AppColors.gold.withValues(alpha: .15),
              width: 1,
            ),
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: EdgeInsets.fromLTRB(22, 0, 22, 24 + bottom),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Drag handle
                  const SizedBox(height: 12),
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: AppColors.border,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // ── Sheet header ─────────────────────────────────────────
                  Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [AppColors.gold, AppColors.goldLight],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
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
                        child: const Icon(
                          Icons.luggage_rounded,
                          color: Colors.black,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'saved_outfits.new_trip_plan'.tr(),
                            style: AppTextStyles.label.copyWith(
                              letterSpacing: 1.6,
                              fontSize: 9,
                              color: AppColors.goldLight,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'saved_outfits.new_trip_plan_2'.tr(),
                            style: TextStyle(
                              fontFamily: 'Cormorant',
                              fontSize: 22,
                              fontWeight: FontWeight.w700,
                              color: AppColors.text,
                              letterSpacing: -.2,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),

                  const SizedBox(height: 28),

                  // ── Destination city field ────────────────────────────────
                  Text(
                    'saved_outfits.destination_city'.tr(),
                    style: AppTextStyles.label.copyWith(
                      fontSize: 9,
                      letterSpacing: 1.5,
                      color: AppColors.muted,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: TextField(
                      controller: _cityCtrl,
                      style: const TextStyle(
                        color: AppColors.text,
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                      ),
                      cursorColor: AppColors.gold,
                      textCapitalization: TextCapitalization.words,
                      decoration: InputDecoration(
                        hintText: 'saved_outfits.destination_city_placeholder'
                            .tr(),
                        hintStyle: TextStyle(
                          color: AppColors.muted.withValues(alpha: .6),
                          fontSize: 14,
                        ),
                        prefixIcon: const Icon(
                          Icons.location_on_outlined,
                          color: AppColors.gold,
                          size: 20,
                        ),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 15,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 18),

                  // ── Date range selector ───────────────────────────────────
                  Text(
                    'saved_outfits.travel_dates'.tr(),
                    style: AppTextStyles.label.copyWith(
                      fontSize: 9,
                      letterSpacing: 1.5,
                      color: AppColors.muted,
                    ),
                  ),
                  const SizedBox(height: 8),
                  GestureDetector(
                    onTap: _pickDateRange,
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 15,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: _dateRange != null
                              ? AppColors.gold.withValues(alpha: .45)
                              : AppColors.border,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.date_range_rounded,
                            color: _dateRange != null
                                ? AppColors.gold
                                : AppColors.muted,
                            size: 20,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              _dateLabel,
                              style: TextStyle(
                                color: _dateRange != null
                                    ? AppColors.text
                                    : AppColors.muted.withValues(alpha: .6),
                                fontSize: _dateRange != null ? 15 : 14,
                                fontWeight: _dateRange != null
                                    ? FontWeight.w600
                                    : FontWeight.w400,
                                letterSpacing: _dateRange != null ? .2 : 0,
                              ),
                            ),
                          ),
                          if (_dateRange != null)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.gold.withValues(alpha: .1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                '${_dateRange!.duration.inDays} ' +
                                    'saved_outfits.days'.tr(),
                                style: AppTextStyles.label.copyWith(
                                  color: AppColors.goldLight,
                                  fontSize: 10,
                                ),
                              ),
                            )
                          else
                            Icon(
                              Icons.chevron_right_rounded,
                              color: AppColors.muted.withValues(alpha: .5),
                              size: 18,
                            ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 28),

                  // ── Submit CTA ────────────────────────────────────────────
                  GestureDetector(
                    onTap: _isSubmitting ? null : _submit,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: double.infinity,
                      height: 54,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: _isSubmitting
                              ? [
                                  AppColors.gold.withValues(alpha: .6),
                                  AppColors.goldLight.withValues(alpha: .6),
                                ]
                              : [AppColors.gold, AppColors.goldLight],
                          begin: Alignment.centerLeft,
                          end: Alignment.centerRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.gold.withValues(
                              alpha: _isSubmitting ? .2 : .45,
                            ),
                            blurRadius: 22,
                            offset: const Offset(0, 7),
                          ),
                        ],
                      ),
                      child: _isSubmitting
                          ? Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      Colors.black,
                                    ),
                                  ),
                                ),
                                SizedBox(width: 12),
                                Text(
                                  'saved_outfits.ai_is_preparing_your_bag'.tr(),
                                  style: TextStyle(
                                    color: Colors.black,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: .1,
                                  ),
                                ),
                              ],
                            )
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.auto_awesome_rounded,
                                  color: Colors.black,
                                  size: 17,
                                ),
                                SizedBox(width: 9),
                                Text(
                                  'saved_outfits.prepare_bag_with_ai'.tr() +
                                      ' ✨',
                                  style: TextStyle(
                                    color: Colors.black,
                                    fontSize: 15,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: .2,
                                  ),
                                ),
                              ],
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

// ─────────────────────────────────────────────────────────────────────────────
//  YÜKLEME DURUMU
// ─────────────────────────────────────────────────────────────────────────────

class _LoadingSpinner extends StatelessWidget {
  const _LoadingSpinner({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 48,
            height: 48,
            child: CircularProgressIndicator(
              strokeWidth: 2.5,
              valueColor: AlwaysStoppedAnimation<Color>(AppColors.gold),
              backgroundColor: AppColors.gold.withValues(alpha: .12),
            ),
          ),
          const SizedBox(height: 18),
          Text(
            'saved_outfits.outfits_loading'.tr(),
            style: TextStyle(
              color: AppColors.textSub,
              fontSize: 13,
              letterSpacing: .3,
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  BOŞ DURUM
// ─────────────────────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  const _EmptyState({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppColors.gold.withValues(alpha: .07),
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.gold.withValues(alpha: .2)),
              ),
              child: const Icon(
                Icons.style_outlined,
                color: AppColors.gold,
                size: 34,
              ),
            ),

            const SizedBox(height: 22),

            Text(
              'saved_outfits.empty_closet_title'.tr(),
              style: TextStyle(
                fontFamily: 'Cormorant',
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: AppColors.text,
              ),
            ),

            const SizedBox(height: 10),

            Text(
              'saved_outfits.empty_closet_message'.tr(),
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.textSub,
                fontSize: 13,
                height: 1.6,
              ),
            ),

            const SizedBox(height: 28),

            GestureDetector(
              onTap: () => Navigator.pushReplacement(
                context,
                slide(const WardrobeScreen()),
              ),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.gold, AppColors.goldLight],
                  ),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.gold.withValues(alpha: .4),
                      blurRadius: 16,
                      offset: const Offset(0, 5),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.checkroom_outlined,
                      color: Colors.black,
                      size: 18,
                    ),
                    SizedBox(width: 8),
                    Text(
                      'saved_outfits.go_to_closet'.tr(),
                      style: TextStyle(
                        color: Colors.black,
                        fontSize: 14,
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
}

// ─────────────────────────────────────────────────────────────────────────────
//  KOMBİN KARTI  (expandable description)
// ─────────────────────────────────────────────────────────────────────────────

class _OutfitCard extends StatefulWidget {
  final SavedOutfit outfit;
  final VoidCallback onDelete;

  const _OutfitCard({required this.outfit, required this.onDelete});

  @override
  State<_OutfitCard> createState() => _OutfitCardState();
}

class _OutfitCardState extends State<_OutfitCard> {
  bool _isExpanded = false;

  bool get _hasLongText =>
      widget.outfit.aciklama.length > 90 || widget.outfit.ipucu.length > 60;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: 0, sigmaY: 0),
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (widget.outfit.kiyafetler.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                  child: _ItemStrip(items: widget.outfit.kiyafetler),
                ),

              Padding(
                padding: const EdgeInsets.fromLTRB(14, 10, 12, 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.gold.withValues(alpha: .1),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(
                                color: AppColors.gold.withValues(alpha: .25),
                              ),
                            ),
                            child: Text(
                              widget.outfit.baslik.isNotEmpty
                                  ? widget.outfit.baslik
                                  : 'saved_outfits.outfit'.tr(),
                              style: AppTextStyles.label.copyWith(
                                color: AppColors.gold,
                                fontSize: 9,
                                letterSpacing: 1.2,
                              ),
                            ),
                          ),

                          const SizedBox(height: 7),

                          AnimatedSize(
                            duration: const Duration(milliseconds: 220),
                            curve: Curves.easeInOut,
                            alignment: Alignment.topCenter,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (widget.outfit.aciklama.isNotEmpty)
                                  Text(
                                    widget.outfit.aciklama,
                                    maxLines: _isExpanded ? null : 2,
                                    overflow: _isExpanded
                                        ? TextOverflow.visible
                                        : TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: AppColors.textSub,
                                      fontSize: 12,
                                      height: 1.55,
                                      fontStyle: FontStyle.italic,
                                    ),
                                  ),

                                if (widget.outfit.ipucu.isNotEmpty &&
                                    _isExpanded) ...[
                                  const SizedBox(height: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 9,
                                      vertical: 6,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppColors.gold.withValues(
                                        alpha: .07,
                                      ),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color: AppColors.gold.withValues(
                                          alpha: .18,
                                        ),
                                      ),
                                    ),
                                    child: Row(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Icon(
                                          Icons.lightbulb_outline_rounded,
                                          color: AppColors.gold,
                                          size: 12,
                                        ),
                                        const SizedBox(width: 5),
                                        Expanded(
                                          child: Text(
                                            widget.outfit.ipucu,
                                            style: const TextStyle(
                                              color: AppColors.gold,
                                              fontSize: 11,
                                              height: 1.45,
                                              fontStyle: FontStyle.italic,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ] else if (widget.outfit.ipucu.isNotEmpty &&
                                    !_isExpanded) ...[
                                  const SizedBox(height: 5),
                                  Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Icon(
                                        Icons.lightbulb_outline_rounded,
                                        color: AppColors.gold,
                                        size: 12,
                                      ),
                                      const SizedBox(width: 4),
                                      Expanded(
                                        child: Text(
                                          widget.outfit.ipucu,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            color: AppColors.gold,
                                            fontSize: 11,
                                            fontStyle: FontStyle.italic,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ],
                            ),
                          ),

                          if (_hasLongText) ...[
                            const SizedBox(height: 6),
                            GestureDetector(
                              onTap: () =>
                                  setState(() => _isExpanded = !_isExpanded),
                              behavior: HitTestBehavior.opaque,
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 2,
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      _isExpanded
                                          ? 'saved_outfits.narrow_down'.tr()
                                          : 'saved_outfits.read_more'.tr(),
                                      style: TextStyle(
                                        color: AppColors.goldDim.withValues(
                                          alpha: .85,
                                        ),
                                        fontSize: 11,
                                        fontWeight: FontWeight.w500,
                                        letterSpacing: .2,
                                      ),
                                    ),
                                    const SizedBox(width: 3),
                                    AnimatedRotation(
                                      turns: _isExpanded ? -.25 : .25,
                                      duration: const Duration(
                                        milliseconds: 220,
                                      ),
                                      child: Icon(
                                        Icons.chevron_right_rounded,
                                        size: 14,
                                        color: AppColors.goldDim.withValues(
                                          alpha: .85,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),

                    const SizedBox(width: 10),

                    GestureDetector(
                      onTap: widget.onDelete,
                      child: Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          color: AppColors.error.withValues(alpha: .08),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: AppColors.error.withValues(alpha: .25),
                          ),
                        ),
                        child: const Icon(
                          Icons.delete_outline_rounded,
                          color: AppColors.error,
                          size: 16,
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

// ── Kıyafet görselleri şeridi ──────────────────────────────────────────────

class _ItemStrip extends StatelessWidget {
  final List<ClothingItem> items;
  const _ItemStrip({required this.items});

  @override
  Widget build(BuildContext context) {
    final shown = items.take(4).toList();
    final extra = items.length - shown.length;

    return Row(
      children: [
        ...shown.map(
          (item) => Expanded(
            child: Padding(
              padding: const EdgeInsets.only(right: 6),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: AspectRatio(
                  aspectRatio: .82,
                  child: item.imageUrl != null
                      ? Image.network(
                          item.imageUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _Placeholder(),
                          loadingBuilder: (_, child, progress) =>
                              progress == null ? child : _Placeholder(),
                        )
                      : _Placeholder(),
                ),
              ),
            ),
          ),
        ),

        if (extra > 0)
          Container(
            width: 40,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.border),
            ),
            child: Center(
              child: Text(
                '+$extra',
                style: const TextStyle(
                  color: AppColors.muted,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _Placeholder extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    color: AppColors.surface,
    child: const Icon(
      Icons.checkroom_outlined,
      color: AppColors.muted,
      size: 20,
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SAYAÇ ROZET — küçük gold pill
// ─────────────────────────────────────────────────────────────────────────────

class _CountBadge extends StatelessWidget {
  final String label;
  const _CountBadge({super.key, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.gold.withValues(alpha: .12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.gold.withValues(alpha: .3)),
      ),
      child: Text(
        label,
        style: AppTextStyles.label.copyWith(
          color: AppColors.gold,
          fontSize: 11,
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SEYAHAT BAVUL KARTI
// ─────────────────────────────────────────────────────────────────────────────

class _SuitcaseCard extends StatefulWidget {
  final TravelSuitcase suitcase;
  final VoidCallback onDelete;

  const _SuitcaseCard({required this.suitcase, required this.onDelete});

  @override
  State<_SuitcaseCard> createState() => _SuitcaseCardState();
}

class _SuitcaseCardState extends State<_SuitcaseCard> {
  bool _isExpanded = false;

  bool get _hasLongText =>
      widget.suitcase.aiAciklamasi.length > 90 ||
      widget.suitcase.aiIpucu.length > 60;

  @override
  Widget build(BuildContext context) {
    final s = widget.suitcase;
    final fmt = DateFormat('d MMM', 'tr_TR');
    final dateLabel =
        '${fmt.format(s.baslangicTarihi)}  →  ${fmt.format(s.bitisTarihi)}';

    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Gold top accent bar
            Container(
              height: 3,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppColors.gold, AppColors.goldLight],
                ),
                borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
              ),
            ),

            // City header row
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 12, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          s.sehir.toUpperCase(),
                          style: const TextStyle(
                            fontFamily: 'Cormorant',
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            color: AppColors.text,
                            letterSpacing: -.3,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Row(
                          children: [
                            const Icon(
                              Icons.date_range_rounded,
                              color: AppColors.muted,
                              size: 12,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              dateLabel,
                              style: const TextStyle(
                                color: AppColors.textSub,
                                fontSize: 12,
                                letterSpacing: .1,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.gold.withValues(alpha: .1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                '${s.gunSayisi} ' + 'saved_outfits.days'.tr(),
                                style: AppTextStyles.label.copyWith(
                                  color: AppColors.goldLight,
                                  fontSize: 10,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  // Weather chip
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (s.havaSicakligi != null)
                              Text(
                                '${s.havaSicakligi!.round()}°C',
                                style: const TextStyle(
                                  color: AppColors.text,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            if (s.havaSicakligi != null)
                              const SizedBox(width: 6),
                            Text(
                              s.havaDurumuOzeti,
                              style: const TextStyle(
                                color: AppColors.textSub,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (s.tahminiHava) ...[
                        const SizedBox(height: 4),
                        Text(
                          'saved_outfits.estimated_weather'.tr(),
                          style: TextStyle(
                            color: AppColors.muted.withValues(alpha: .6),
                            fontSize: 9,
                            letterSpacing: .3,
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(width: 10),
                  GestureDetector(
                    onTap: widget.onDelete,
                    child: Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        color: AppColors.error.withValues(alpha: .08),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: AppColors.error.withValues(alpha: .25),
                        ),
                      ),
                      child: const Icon(
                        Icons.delete_outline_rounded,
                        color: AppColors.error,
                        size: 16,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Item strip
            if (s.onerilenkiyafetler.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                child: _ItemStrip(items: s.onerilenkiyafetler),
              ),

            // AI explanation + tip
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
              child: AnimatedSize(
                duration: const Duration(milliseconds: 220),
                curve: Curves.easeInOut,
                alignment: Alignment.topCenter,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (s.aiAciklamasi.isNotEmpty)
                      Text(
                        s.aiAciklamasi,
                        maxLines: _isExpanded ? null : 2,
                        overflow: _isExpanded
                            ? TextOverflow.visible
                            : TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.textSub,
                          fontSize: 12,
                          height: 1.55,
                          fontStyle: FontStyle.italic,
                        ),
                      ),

                    if (s.aiIpucu.isNotEmpty && _isExpanded) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 9,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.gold.withValues(alpha: .07),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: AppColors.gold.withValues(alpha: .18),
                          ),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(
                              Icons.lightbulb_outline_rounded,
                              color: AppColors.gold,
                              size: 12,
                            ),
                            const SizedBox(width: 5),
                            Expanded(
                              child: Text(
                                s.aiIpucu,
                                style: const TextStyle(
                                  color: AppColors.gold,
                                  fontSize: 11,
                                  height: 1.45,
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ] else if (s.aiIpucu.isNotEmpty && !_isExpanded) ...[
                      const SizedBox(height: 5),
                      Row(
                        children: [
                          const Icon(
                            Icons.lightbulb_outline_rounded,
                            color: AppColors.gold,
                            size: 12,
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              s.aiIpucu,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: AppColors.gold,
                                fontSize: 11,
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],

                    if (_hasLongText) ...[
                      const SizedBox(height: 6),
                      GestureDetector(
                        onTap: () => setState(() => _isExpanded = !_isExpanded),
                        behavior: HitTestBehavior.opaque,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 2),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                _isExpanded
                                    ? 'saved_outfits.narrow_down'.tr()
                                    : 'saved_outfits.read_more'.tr(),
                                style: TextStyle(
                                  color: AppColors.goldDim.withValues(
                                    alpha: .85,
                                  ),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                  letterSpacing: .2,
                                ),
                              ),
                              const SizedBox(width: 3),
                              AnimatedRotation(
                                turns: _isExpanded ? -.25 : .25,
                                duration: const Duration(milliseconds: 220),
                                child: Icon(
                                  Icons.chevron_right_rounded,
                                  size: 14,
                                  color: AppColors.goldDim.withValues(
                                    alpha: .85,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  PREMIUM TARİH ARALIĞI SEÇİCİ — Glassmorphic centered dialog
// ─────────────────────────────────────────────────────────────────────────────

class _DateRangePickerDialog extends StatefulWidget {
  final List<DateTime?> initialValue;
  final DateTime firstDate;
  final ValueChanged<DateTimeRange> onConfirm;

  const _DateRangePickerDialog({
    required this.initialValue,
    required this.firstDate,
    required this.onConfirm,
  });

  @override
  State<_DateRangePickerDialog> createState() => _DateRangePickerDialogState();
}

class _DateRangePickerDialogState extends State<_DateRangePickerDialog> {
  late List<DateTime?> _value;

  bool get _isRangeComplete =>
      _value.length == 2 && _value[0] != null && _value[1] != null;

  @override
  void initState() {
    super.initState();
    _value = List.from(widget.initialValue);
  }

  void _confirm() {
    if (!_isRangeComplete) return;
    widget.onConfirm(DateTimeRange(start: _value[0]!, end: _value[1]!));
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Material(
        color: Colors.transparent,
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 18),
          decoration: BoxDecoration(
            color: const Color(0xFF111111),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.gold.withValues(alpha: .25)),
            boxShadow: [
              BoxShadow(
                color: AppColors.gold.withValues(alpha: .08),
                blurRadius: 48,
                spreadRadius: 6,
              ),
              BoxShadow(
                color: Colors.black.withValues(alpha: .65),
                blurRadius: 36,
                offset: const Offset(0, 16),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // ── Header ────────────────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.fromLTRB(18, 18, 18, 6),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [AppColors.gold, AppColors.goldLight],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.gold.withValues(alpha: .35),
                              blurRadius: 12,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.date_range_rounded,
                          color: Colors.black,
                          size: 16,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'saved_outfits.travel_dates'.tr(),
                            style: TextStyle(
                              color: AppColors.muted,
                              fontSize: 9,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 1.4,
                            ),
                          ),
                          SizedBox(height: 1),
                          Text(
                            'saved_outfits.select_date_range'.tr(),
                            style: TextStyle(
                              fontFamily: 'Cormorant',
                              fontSize: 19,
                              fontWeight: FontWeight.w700,
                              color: AppColors.text,
                              letterSpacing: -.2,
                            ),
                          ),
                        ],
                      ),
                      const Spacer(),
                      GestureDetector(
                        onTap: () => Navigator.pop(context),
                        child: Container(
                          width: 30,
                          height: 30,
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: const Icon(
                            Icons.close_rounded,
                            color: AppColors.muted,
                            size: 15,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Calendar ──────────────────────────────────────────────
                Theme(
                  data: ThemeData.dark().copyWith(
                    colorScheme: const ColorScheme.dark(
                      primary: AppColors.gold,
                      onPrimary: Colors.black,
                      surface: Color(0xFF111111),
                      onSurface: AppColors.text,
                    ),
                  ),
                  child: CalendarDatePicker2(
                    config: CalendarDatePicker2Config(
                      calendarType: CalendarDatePicker2Type.range,
                      firstDate: widget.firstDate,
                      lastDate: widget.firstDate.add(const Duration(days: 365)),
                      selectedDayHighlightColor: AppColors.gold,
                      selectedRangeHighlightColor: AppColors.gold.withValues(
                        alpha: .15,
                      ),
                      selectedDayTextStyle: const TextStyle(
                        color: Colors.black,
                        fontWeight: FontWeight.w800,
                        fontSize: 13,
                      ),
                      dayTextStyle: const TextStyle(
                        color: AppColors.text,
                        fontSize: 13,
                      ),
                      disabledDayTextStyle: TextStyle(
                        color: AppColors.muted.withValues(alpha: .35),
                        fontSize: 13,
                      ),
                      weekdayLabelTextStyle: TextStyle(
                        color: AppColors.muted.withValues(alpha: .7),
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        letterSpacing: .5,
                      ),
                      controlsTextStyle: const TextStyle(
                        color: AppColors.text,
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                        fontFamily: 'Cormorant',
                        letterSpacing: -.2,
                      ),
                      lastMonthIcon: const Icon(
                        Icons.chevron_left_rounded,
                        color: AppColors.gold,
                        size: 22,
                      ),
                      nextMonthIcon: const Icon(
                        Icons.chevron_right_rounded,
                        color: AppColors.gold,
                        size: 22,
                      ),
                      weekdayLabels: const [
                        'Paz',
                        'Pzt',
                        'Sal',
                        'Çar',
                        'Per',
                        'Cum',
                        'Cmt',
                      ],
                    ),
                    value: _value,
                    onValueChanged: (vals) => setState(() => _value = vals),
                  ),
                ),

                // ── Selected range chip ────────────────────────────────────
                if (_isRangeComplete)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(18, 0, 18, 12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.gold.withValues(alpha: .08),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: AppColors.gold.withValues(alpha: .22),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.flight_takeoff_rounded,
                            color: AppColors.gold,
                            size: 13,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            '${DateFormat('d MMM', 'tr_TR').format(_value[0]!)}  →  ${DateFormat('d MMM', 'tr_TR').format(_value[1]!)}',
                            style: const TextStyle(
                              color: AppColors.gold,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              letterSpacing: .3,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 7,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.gold.withValues(alpha: .15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              '${_value[1]!.difference(_value[0]!).inDays} ' +
                                  'saved_outfits.days'.tr(),
                              style: const TextStyle(
                                color: AppColors.goldLight,
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                // ── Action buttons ─────────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => Navigator.pop(context),
                          child: Container(
                            height: 46,
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Center(
                              child: Text(
                                'saved_outfits.cancel'.tr(),
                                style: TextStyle(
                                  color: AppColors.muted,
                                  fontWeight: FontWeight.w500,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: GestureDetector(
                          onTap: _isRangeComplete ? _confirm : null,
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            height: 46,
                            decoration: BoxDecoration(
                              gradient: _isRangeComplete
                                  ? const LinearGradient(
                                      colors: [
                                        AppColors.gold,
                                        AppColors.goldLight,
                                      ],
                                    )
                                  : null,
                              color: _isRangeComplete
                                  ? null
                                  : AppColors.surface,
                              borderRadius: BorderRadius.circular(12),
                              border: _isRangeComplete
                                  ? null
                                  : Border.all(color: AppColors.border),
                              boxShadow: _isRangeComplete
                                  ? [
                                      BoxShadow(
                                        color: AppColors.gold.withValues(
                                          alpha: .4,
                                        ),
                                        blurRadius: 14,
                                        offset: const Offset(0, 5),
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Center(
                              child: Text(
                                'saved_outfits.confirm'.tr(),
                                style: TextStyle(
                                  color: _isRangeComplete
                                      ? Colors.black
                                      : AppColors.muted,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                ),
                              ),
                            ),
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
      ),
    );
  }
}
