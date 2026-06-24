import 'dart:convert';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/core/theme/app_theme_extension.dart';
import 'package:smart_wardrobe_ai/data/services/api_service.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_background.dart';

class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({super.key});

  @override
  State<NotificationSettingsScreen> createState() =>
      _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState extends State<NotificationSettingsScreen>
    with SingleTickerProviderStateMixin {
  bool _loading = true;
  bool _saving = false;

  bool _dailyWeatherAI = true;
  bool _travelReminders = true;
  bool _weeklyStyle = true;
  String _defaultCity = 'Istanbul';

  final _cityCtrl = TextEditingController();

  late final AnimationController _fadeCtrl;
  late final Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _fadeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    )..forward();
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);
    _loadPreferences();
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    _cityCtrl.dispose();
    super.dispose();
  }

  // Veri Yükleme

  Future<void> _loadPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? '';

    try {
      final res = await http
          .get(
            Uri.parse('${ApiConstants.baseUrl}/auth/me'),
            headers: {'Authorization': 'Bearer $token'},
          )
          .timeout(const Duration(seconds: 8));

      if (!mounted) return;

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final kullanici = data['kullanici'] as Map<String, dynamic>? ?? {};
        final notifPrefs =
            kullanici['notificationPreferences'] as Map<String, dynamic>? ?? {};
        final city = kullanici['defaultCity'] as String? ?? 'Istanbul';

        setState(() {
          _dailyWeatherAI = notifPrefs['dailyWeatherAI'] as bool? ?? true;
          _travelReminders = notifPrefs['travelReminders'] as bool? ?? true;
          _weeklyStyle = notifPrefs['weeklyStyle'] as bool? ?? true;
          _defaultCity = city;
          _cityCtrl.text = city;
          _loading = false;
        });
        return;
      }
    } catch (_) {}

    // Fallback: SharedPreferences cache
    if (!mounted) return;
    setState(() {
      _dailyWeatherAI = prefs.getBool('notif_weather') ?? true;
      _travelReminders = prefs.getBool('notif_travel') ?? true;
      _weeklyStyle = prefs.getBool('notif_weekly') ?? true;
      _defaultCity = prefs.getString('notif_city') ?? 'Istanbul';
      _cityCtrl.text = _defaultCity;
      _loading = false;
    });
  }

  // Preference Güncelleme

  Future<void> _updateToggle({
    bool? dailyWeatherAI,
    bool? travelReminders,
    bool? weeklyStyle,
  }) async {
    // Önceki değerleri rollback için sakla
    final prevWeather = _dailyWeatherAI;
    final prevTravel = _travelReminders;
    final prevWeekly = _weeklyStyle;

    // Optimistic UI — hemen güncelle
    setState(() {
      if (dailyWeatherAI != null) _dailyWeatherAI = dailyWeatherAI;
      if (travelReminders != null) _travelReminders = travelReminders;
      if (weeklyStyle != null) _weeklyStyle = weeklyStyle;
    });

    try {
      await ApiService.instance.updateNotificationPreferences(
        dailyWeatherAI: dailyWeatherAI,
        travelReminders: travelReminders,
        weeklyStyle: weeklyStyle,
      );

      // Başarılı — SharedPreferences'ı da güncelle
      final prefs = await SharedPreferences.getInstance();
      if (dailyWeatherAI != null)
        prefs.setBool('notif_weather', dailyWeatherAI);
      if (travelReminders != null)
        prefs.setBool('notif_travel', travelReminders);
      if (weeklyStyle != null) prefs.setBool('notif_weekly', weeklyStyle);
    } on ApiException catch (e) {
      // Rollback — API başarısız oldu, eski değerlere dön
      if (!mounted) return;
      setState(() {
        _dailyWeatherAI = prevWeather;
        _travelReminders = prevTravel;
        _weeklyStyle = prevWeekly;
      });
      _showSnack(e.message, isError: true);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _dailyWeatherAI = prevWeather;
        _travelReminders = prevTravel;
        _weeklyStyle = prevWeekly;
      });
      _showSnack('notifications.changes_could_not_be_saved'.tr(), isError: true);
    }
  }

  Future<void> _saveCity() async {
    final city = _cityCtrl.text.trim();
    if (city.isEmpty) {
      _showSnack('notifications.city_name_cannot_be_empty'.tr(), isError: true);
      return;
    }
    if (city == _defaultCity) return;

    setState(() => _saving = true);

    try {
      await ApiService.instance.updateNotificationPreferences(
        defaultCity: city,
      );

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('notif_city', city);

      if (!mounted) return;
      setState(() => _defaultCity = city);
      _showSnack('notifications.city_saved'.tr() + ' ✅');
    } on ApiException catch (e) {
      if (!mounted) return;
      // Rollback text field
      _cityCtrl.text = _defaultCity;
      _showSnack(e.message, isError: true);
    } catch (_) {
      if (!mounted) return;
      _cityCtrl.text = _defaultCity;
      _showSnack('notifications.city_could_not_be_saved'.tr(), isError: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showSnack(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: AppColorsExtension.of(context).surface,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: isError
                ? AppColors.error.withValues(alpha: .5)
                : AppColors.gold.withValues(alpha: .4),
          ),
        ),
      ),
    );
  }

  // Build

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColorsExtension.of(context).bg,
      body: AppBackground(
        child: SafeArea(
          child: FadeTransition(
            opacity: _fadeAnim,
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(
                      color: AppColors.gold,
                      strokeWidth: 2,
                    ),
                  )
                : _buildBody(),
          ),
        ),
      ),
    );
  }

  Widget _buildBody() {
    return CustomScrollView(
      physics: const BouncingScrollPhysics(),
      slivers: [
        SliverToBoxAdapter(child: _buildTopBar()),
        SliverToBoxAdapter(child: _buildHeader()),
        SliverToBoxAdapter(child: _buildNotifCards()),
        SliverToBoxAdapter(child: _buildCitySection()),
        const SliverToBoxAdapter(child: SizedBox(height: 40)),
      ],
    );
  }

  // Üst Bar

  Widget _buildTopBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 22, 0),
      child: Row(
        children: [
          _GlassButton(
            icon: Icons.arrow_back_ios_new_rounded,
            onTap: () => Navigator.pop(context),
          ),
          const SizedBox(width: 12),
          Text(
            'notifications.notification_settings'.tr(),
            style: TextStyle(
              fontFamily: 'Cormorant',
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppColorsExtension.of(context).text,
              letterSpacing: -.3,
            ),
          ),
        ],
      ),
    );
  }

  // Başlık Banner

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 20, 22, 0),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              AppColors.gold.withValues(alpha: .12),
              AppColors.goldLight.withValues(alpha: .04),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: AppColors.gold.withValues(alpha: .25),
            width: .8,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.gold.withValues(alpha: .25),
                    AppColors.goldLight.withValues(alpha: .12),
                  ],
                ),
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.gold.withValues(alpha: .4),
                  width: .8,
                ),
              ),
              child: const Icon(
                Icons.notifications_active_outlined,
                color: AppColors.goldLight,
                size: 22,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'notifications.ai_notification_engine'.tr(),
                    style: TextStyle(
                      fontFamily: 'Cormorant',
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      color: AppColorsExtension.of(context).text,
                    ),
                  ),
                  SizedBox(height: 3),
                  Text(
                    'notifications.personalized_recommendations_based_on_your_real_wardrobe_and_weather'
                        .tr(),
                    style: TextStyle(
                      color: AppColorsExtension.of(context).muted,
                      fontSize: 11,
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Bildirim Kartları

  Widget _buildNotifCards() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 20, 22, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionLabel(label: 'notifications.notification_types'.tr()),
          const SizedBox(height: 10),
          _NotifTile(
            icon: Icons.wb_sunny_outlined,
            title: 'notifications.weather_and_outfit'.tr(),
            subtitle:
                'notifications.every_morning_at_0800_ai_outfit_recommendation_based_on_your_wardrobe'
                    .tr(),
            badge: 'AI',
            value: _dailyWeatherAI,
            onChanged: (v) => _updateToggle(dailyWeatherAI: v),
          ),
          const SizedBox(height: 10),
          _NotifTile(
            icon: Icons.flight_takeoff_rounded,
            title: 'notifications.travel_reminders'.tr(),
            subtitle: 'notifications.tomorrow_your_trip_check_your_suitcase'
                .tr(),
            value: _travelReminders,
            onChanged: (v) => _updateToggle(travelReminders: v),
          ),
          const SizedBox(height: 10),
          _NotifTile(
            icon: Icons.calendar_month_outlined,
            title: 'notifications.weekly_style_summary'.tr(),
            subtitle: 'notifications.every_sunday_at_1000_plan_your_week'.tr(),
            value: _weeklyStyle,
            onChanged: (v) => _updateToggle(weeklyStyle: v),
          ),
        ],
      ),
    );
  }

  // Şehir Alanı

  Widget _buildCitySection() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 24, 22, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionLabel(label: 'notifications.weather_city'.tr()),
          const SizedBox(height: 10),
          Container(
            decoration: BoxDecoration(
              color: AppColorsExtension.of(context).surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColorsExtension.of(context).border),
            ),
            padding: const EdgeInsets.fromLTRB(16, 4, 8, 4),
            child: Row(
              children: [
                Icon(
                  Icons.location_city_outlined,
                  color: AppColorsExtension.of(context).muted,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _cityCtrl,
                    style: TextStyle(
                      color: AppColorsExtension.of(context).text,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                    decoration: InputDecoration(
                      border: InputBorder.none,
                      hintText: 'notifications.e_g_istanbul_ankara'.tr(),
                      hintStyle: TextStyle(
                        color: AppColorsExtension.of(context).muted,
                        fontSize: 13,
                      ),
                      isDense: true,
                      contentPadding: EdgeInsets.symmetric(vertical: 14),
                    ),
                    textCapitalization: TextCapitalization.words,
                    onSubmitted: (_) => _saveCity(),
                  ),
                ),
                const SizedBox(width: 6),
                _saving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          color: AppColors.gold,
                          strokeWidth: 2,
                        ),
                      )
                    : GestureDetector(
                        onTap: _saveCity,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [AppColors.gold, AppColors.goldLight],
                            ),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            'notifications.save'.tr(),
                            style: TextStyle(
                              color: Colors.black,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              letterSpacing: .3,
                            ),
                          ),
                        ),
                      ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: EdgeInsets.only(left: 4),
            child: Text(
              'notifications.morning_weather_notifications_are_sent_according_to_this_city'
                  .tr(),
              style: TextStyle(color: AppColorsExtension.of(context).muted, fontSize: 11),
            ),
          ),
        ],
      ),
    );
  }
}

// Yardımcı Widgetlar

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});

  @override
  Widget build(BuildContext context) => Text(
    label,
    style: TextStyle(
      color: AppColorsExtension.of(context).muted,
      fontSize: 10,
      fontWeight: FontWeight.w600,
      letterSpacing: 1.2,
    ),
  );
}

class _NotifTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String? badge;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _NotifTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
    this.badge,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
      decoration: BoxDecoration(
        color: value
            ? AppColors.gold.withValues(alpha: .06)
            : AppColorsExtension.of(context).surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: value
              ? AppColors.gold.withValues(alpha: .35)
              : AppColorsExtension.of(context).border,
          width: value ? 1.0 : .8,
        ),
      ),
      child: Row(
        children: [
          // İkon
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: value
                  ? AppColors.gold.withValues(alpha: .15)
                  : AppColorsExtension.of(context).bg,
              borderRadius: BorderRadius.circular(11),
              border: Border.all(
                color: value
                    ? AppColors.gold.withValues(alpha: .35)
                    : AppColorsExtension.of(context).border,
              ),
            ),
            child: Icon(
              icon,
              color: value ? AppColors.goldLight : AppColorsExtension.of(context).muted,
              size: 18,
            ),
          ),
          const SizedBox(width: 14),

          // Metin
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        color: value ? AppColorsExtension.of(context).text : AppColorsExtension.of(context).muted,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (badge != null) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [AppColors.gold, AppColors.goldLight],
                          ),
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: Text(
                          badge!,
                          style: TextStyle(
                            color: Colors.black,
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            letterSpacing: .5,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: AppColorsExtension.of(context).muted,
                    fontSize: 11,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),

          // Toggle
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: AppColors.gold,
            activeTrackColor: AppColors.gold.withValues(alpha: .3),
            inactiveThumbColor: AppColorsExtension.of(context).muted,
            inactiveTrackColor: AppColorsExtension.of(context).border,
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
        ],
      ),
    );
  }
}

class _GlassButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _GlassButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      width: 38,
      height: 38,
      decoration: BoxDecoration(
        color: AppColorsExtension.of(context).surface,
        borderRadius: BorderRadius.circular(11),
        border: Border.all(color: AppColorsExtension.of(context).border),
      ),
      child: Icon(icon, color: AppColorsExtension.of(context).muted, size: 17),
    ),
  );
}
