import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/core/theme/app_theme_extension.dart';
import 'package:smart_wardrobe_ai/data/services/api_service.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/profile/profile_shared_widgets.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_background.dart';

// Data

class _Shape {
  final String key;
  final String label;
  final String description;
  final String index;
  const _Shape({
    required this.key,
    required this.label,
    required this.description,
    required this.index,
  });
}

class _Fit {
  final String key;
  final String label;
  final String description;
  final IconData icon;
  const _Fit({
    required this.key,
    required this.label,
    required this.description,
    required this.icon,
  });
}

final List<_Shape> _shapes = [
  _Shape(
    key: 'kum_saati',
    label: 'body_profile.hourglass'.tr(),
    description: 'body_profile.hourglass_desc'.tr(),
    index: '01',
  ),
  _Shape(
    key: 'armut',
    label: 'body_profile.pear'.tr(),
    description: 'body_profile.pear_desc'.tr(),
    index: '02',
  ),
  _Shape(
    key: 'ters_ucgen',
    label: 'body_profile.inverted_triangle'.tr(),
    description: 'body_profile.inverted_triangle_desc'.tr(),
    index: '03',
  ),
  _Shape(
    key: 'dikdortgen',
    label: 'body_profile.rectangle'.tr(),
    description: 'body_profile.rectangle_desc'.tr(),
    index: '04',
  ),
];

final List<_Fit> _fits = [
  _Fit(
    key: 'slim',
    label: 'body_profile.slim'.tr(),
    description: 'body_profile.slim_desc'.tr(),
    icon: Icons.compress_rounded,
  ),
  _Fit(
    key: 'regular',
    label: 'body_profile.regular'.tr(),
    description: 'body_profile.regular_desc'.tr(),
    icon: Icons.remove_rounded,
  ),
  _Fit(
    key: 'oversize',
    label: 'body_profile.oversize'.tr(),
    description: 'body_profile.oversize_desc'.tr(),
    icon: Icons.open_in_full_rounded,
  ),
];

// Screen

class BodyProfileScreen extends StatefulWidget {
  const BodyProfileScreen({super.key});

  @override
  State<BodyProfileScreen> createState() => _BodyProfileScreenState();
}

class _BodyProfileScreenState extends State<BodyProfileScreen>
    with SingleTickerProviderStateMixin {
  String? _selectedShape;
  String? _selectedFit;
  bool _saving = false;

  late final AnimationController _fadeCtrl;
  late final Animation<double> _fadeAnim;

  static const _prefShape = 'pref_bodyShape';
  static const _prefFit = 'pref_bodyFit';

  @override
  void initState() {
    super.initState();
    _fadeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    )..forward();
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);
    _loadPrefs();
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    // 1) Anlık görünüm için yerel önbellekten göster (network beklemeden).
    setState(() {
      _selectedShape = prefs.getString(_prefShape);
      _selectedFit = prefs.getString(_prefFit);
    });

    // 2) Otoriter kaynak backend'dir — web'de veya başka bir cihazda
    // kaydedilmiş olabilecek gerçek değeri çek ve üzerine yaz. Tek backend/
    // tek veritabanı olduğu için web ile mobil aynı `vucut` alanını paylaşır.
    final kullanici = await ApiService.instance.fetchMe();
    if (!mounted || kullanici == null) return;

    final vucut = kullanici['vucut'] as Map<String, dynamic>?;
    final sunucudakiSekil = (vucut?['sekil'] as String?) ?? '';
    final sunucudakiKalip = (vucut?['kalip'] as String?) ?? '';

    setState(() {
      _selectedShape = sunucudakiSekil.isNotEmpty ? sunucudakiSekil : null;
      _selectedFit = sunucudakiKalip.isNotEmpty ? sunucudakiKalip : null;
    });

    // Yerel önbelleği de senkron tut (offline ilk açılış için).
    if (sunucudakiSekil.isNotEmpty) {
      await prefs.setString(_prefShape, sunucudakiSekil);
    } else {
      await prefs.remove(_prefShape);
    }
    if (sunucudakiKalip.isNotEmpty) {
      await prefs.setString(_prefFit, sunucudakiKalip);
    } else {
      await prefs.remove(_prefFit);
    }
  }

  void _showSnackBar(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColorsExtension.of(context).surface,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: isError
                ? AppColors.error.withValues(alpha: .50)
                : AppColors.gold.withValues(alpha: .40),
          ),
        ),
      ),
    );
  }

  Future<void> _save() async {
    // Her iki alan da seçilmeli
    if (_selectedShape == null || _selectedFit == null) {
      _showSnackBar(
        'body_profile.please_select_body_shape_and_fit'.tr(),
        isError: true,
      );
      return;
    }

    setState(() => _saving = true);
    HapticFeedback.mediumImpact();

    try {
      // API'ye gönder
      await ApiService.instance.updateBodyProfile(
        bodyShape: _selectedShape!,
        fitPreference: _selectedFit!,
      );

      // Yerel cache'i güncelle (offline destek)
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefShape, _selectedShape!);
      await prefs.setString(_prefFit, _selectedFit!);

      if (!mounted) return;
      _showSnackBar('body_profile.preferences_saved_successfully'.tr());
      Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (!mounted) return;
      _showSnackBar(e.message, isError: true);
    } catch (_) {
      if (!mounted) return;
      _showSnackBar('body_profile.error_occurred'.tr(), isError: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColorsExtension.of(context).bg,
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: FadeTransition(
            opacity: _fadeAnim,
            child: Column(
              children: [
                _buildTopBar(),
                Expanded(
                  child: CustomScrollView(
                    physics: const BouncingScrollPhysics(),
                    slivers: [
                      // AI context banner
                      SliverToBoxAdapter(child: _buildAiBanner()),

                      // SECTION 1 — Vücut Şekli
                      SliverToBoxAdapter(
                        child: _SectionHeader(
                          label: 'body_profile.body_shape'.tr(),
                          subtitle: 'body_profile.select_body_shape'.tr(),
                        ),
                      ),
                      SliverToBoxAdapter(child: _buildShapeList()),

                      // SECTION 2 — Kalıp Tercihi
                      SliverToBoxAdapter(
                        child: _SectionHeader(
                          label: 'body_profile.fit_preference'.tr(),
                          subtitle: 'body_profile.how_do_you_like_to_dress'
                              .tr(),
                        ),
                      ),
                      SliverToBoxAdapter(child: _buildFitList()),

                      // Save button
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(24, 40, 24, 52),
                          child: _FloatingSaveButton(
                            loading: _saving,
                            onTap: _save,
                          ),
                        ),
                      ),

                      const SliverToBoxAdapter(child: SizedBox(height: 24)),
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

  Widget _buildTopBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 22, 4),
      child: Row(
        children: [
          ProfileGlassButton(
            icon: Icons.arrow_back_ios_new_rounded,
            onTap: () => Navigator.pop(context),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'body_profile.body_profile'.tr(),
                  style: TextStyle(
                    fontFamily: 'Cormorant',
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                    color: AppColorsExtension.of(context).text,
                    letterSpacing: -.4,
                    height: 1.1,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'body_profile.personal_data_for_ai_combinations'.tr(),
                  style: TextStyle(
                    color: AppColorsExtension.of(context).muted,
                    fontSize: 11,
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

  Widget _buildAiBanner() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              AppColors.gold.withValues(alpha: .09),
              AppColors.goldLight.withValues(alpha: .03),
            ],
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppColors.gold.withValues(alpha: .20),
            width: .8,
          ),
        ),
        child: Row(
          children: [
            const Icon(
              Icons.auto_awesome_rounded,
              color: AppColors.goldLight,
              size: 12,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'body_profile.ai_stylist_will_recommend_combinations_for_your_body_type'
                    .tr(),
                style: TextStyle(
                  color: AppColors.goldLight.withValues(alpha: .78),
                  fontSize: 11,
                  height: 1.5,
                  letterSpacing: .1,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildShapeList() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: List.generate(_shapes.length, (i) {
          final s = _shapes[i];
          return Padding(
            padding: EdgeInsets.only(bottom: i < _shapes.length - 1 ? 10 : 0),
            child: _SelectionRow(
              leading: _LeadingIndex(
                index: s.index,
                isSelected: _selectedShape == s.key,
              ),
              label: s.label,
              description: s.description,
              isSelected: _selectedShape == s.key,
              onTap: () {
                HapticFeedback.selectionClick();
                setState(() => _selectedShape = s.key);
              },
            ),
          );
        }),
      ),
    );
  }

  Widget _buildFitList() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: List.generate(_fits.length, (i) {
          final f = _fits[i];
          return Padding(
            padding: EdgeInsets.only(bottom: i < _fits.length - 1 ? 10 : 0),
            child: _SelectionRow(
              leading: _LeadingIcon(
                icon: f.icon,
                isSelected: _selectedFit == f.key,
              ),
              label: f.label,
              description: f.description,
              isSelected: _selectedFit == f.key,
              onTap: () {
                HapticFeedback.selectionClick();
                setState(() => _selectedFit = f.key);
              },
            ),
          );
        }),
      ),
    );
  }
}

//  Section header

class _SectionHeader extends StatelessWidget {
  final String label;
  final String subtitle;
  const _SectionHeader({required this.label, required this.subtitle});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(24, 36, 24, 14),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(width: 18, height: 1, color: AppColors.goldDim),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color: AppColorsExtension.of(context).muted,
                fontSize: 9.5,
                fontWeight: FontWeight.w600,
                letterSpacing: 2.8,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          subtitle,
          style: TextStyle(
            color: AppColorsExtension.of(context).textSub,
            fontSize: 13.5,
            letterSpacing: .1,
            height: 1.3,
          ),
        ),
      ],
    ),
  );
}

//  Selection row — full-width elegant item

class _SelectionRow extends StatelessWidget {
  final Widget leading;
  final String label;
  final String description;
  final bool isSelected;
  final VoidCallback onTap;

  const _SelectionRow({
    required this.leading,
    required this.label,
    required this.description,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOut,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      decoration: BoxDecoration(
        gradient: isSelected
            ? LinearGradient(
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
                colors: [
                  AppColors.gold.withValues(alpha: .13),
                  AppColors.gold.withValues(alpha: .04),
                ],
              )
            : null,
        color: isSelected ? null : AppColorsExtension.of(context).surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isSelected
              ? AppColors.gold.withValues(alpha: .38)
              : AppColorsExtension.of(context).border,
          width: isSelected ? 1.2 : 1,
        ),
        boxShadow: isSelected
            ? [
                BoxShadow(
                  color: AppColors.gold.withValues(alpha: .16),
                  blurRadius: 22,
                  spreadRadius: 0,
                  offset: const Offset(0, 3),
                ),
                BoxShadow(
                  color: AppColors.gold.withValues(alpha: .07),
                  blurRadius: 44,
                  spreadRadius: 6,
                ),
              ]
            : null,
      ),
      child: Row(
        children: [
          // Leading widget (index number or icon)
          leading,

          // Thin divider
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 260),
              width: .8,
              height: 30,
              color: isSelected
                  ? AppColors.gold.withValues(alpha: .28)
                  : AppColorsExtension.of(context).border,
            ),
          ),

          // Label + description
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontFamily: 'Cormorant',
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: isSelected
                        ? AppColors.goldLight
                        : AppColorsExtension.of(context).text,
                    letterSpacing: -.2,
                    height: 1.1,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  description,
                  style: TextStyle(
                    color: isSelected
                        ? AppColorsExtension.of(context).textSub
                        : AppColorsExtension.of(context).muted,
                    fontSize: 11,
                    height: 1.4,
                    letterSpacing: .1,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(width: 12),

          // Selection indicator
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 220),
            switchInCurve: Curves.easeOut,
            switchOutCurve: Curves.easeIn,
            transitionBuilder: (child, anim) =>
                ScaleTransition(scale: anim, child: child),
            child: isSelected
                ? const Icon(
                    Icons.check_circle_rounded,
                    color: AppColors.gold,
                    size: 19,
                    key: ValueKey('on'),
                  )
                : Icon(
                    Icons.circle_outlined,
                    color: AppColorsExtension.of(context).border,
                    size: 19,
                    key: const ValueKey('off'),
                  ),
          ),
        ],
      ),
    ),
  );
}

// Leading widgets

class _LeadingIndex extends StatelessWidget {
  final String index;
  final bool isSelected;
  const _LeadingIndex({required this.index, required this.isSelected});

  @override
  Widget build(BuildContext context) => AnimatedDefaultTextStyle(
    duration: const Duration(milliseconds: 260),
    style: TextStyle(
      fontFamily: 'Cormorant',
      fontSize: 15,
      fontWeight: FontWeight.w600,
      color: isSelected ? AppColors.gold : AppColors.goldDim,
      letterSpacing: .8,
    ),
    child: Text(index),
  );
}

class _LeadingIcon extends StatelessWidget {
  final IconData icon;
  final bool isSelected;
  const _LeadingIcon({required this.icon, required this.isSelected});

  @override
  Widget build(BuildContext context) => AnimatedContainer(
    duration: const Duration(milliseconds: 260),
    width: 32,
    height: 32,
    decoration: BoxDecoration(
      color: isSelected
          ? AppColors.gold.withValues(alpha: .14)
          : AppColorsExtension.of(context).bg,
      borderRadius: BorderRadius.circular(9),
      border: Border.all(
        color: isSelected
            ? AppColors.gold.withValues(alpha: .35)
            : AppColorsExtension.of(context).border,
      ),
    ),
    child: Icon(
      icon,
      size: 15,
      color: isSelected
          ? AppColors.goldLight
          : AppColorsExtension.of(context).muted,
    ),
  );
}

//  Floating save button

class _FloatingSaveButton extends StatelessWidget {
  final bool loading;
  final VoidCallback onTap;
  const _FloatingSaveButton({required this.loading, required this.onTap});

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(18),
      boxShadow: [
        BoxShadow(
          color: AppColors.gold.withValues(alpha: .22),
          blurRadius: 28,
          spreadRadius: 0,
          offset: const Offset(0, 6),
        ),
        BoxShadow(
          color: AppColors.gold.withValues(alpha: .08),
          blurRadius: 56,
          spreadRadius: 8,
        ),
      ],
    ),
    child: ProfileGoldButton(
      label: 'body_profile.save'.tr(),
      loading: loading,
      onTap: onTap,
    ),
  );
}
