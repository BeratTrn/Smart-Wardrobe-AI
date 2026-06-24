import 'dart:convert';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/core/controllers/app_settings_controller.dart';
import 'package:smart_wardrobe_ai/core/theme/app_theme_extension.dart';
import 'package:smart_wardrobe_ai/data/models/user_profile.dart';
import 'package:smart_wardrobe_ai/data/services/api_service.dart';
import 'package:smart_wardrobe_ai/presentation/screens/auth/login_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/profile/body_profile_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/profile/dialogs/about_dialog.dart';
import 'package:smart_wardrobe_ai/presentation/screens/profile/dialogs/confirm_dialog.dart';
import 'package:smart_wardrobe_ai/presentation/screens/profile/dialogs/info_dialog.dart';
import 'package:smart_wardrobe_ai/presentation/screens/profile/notification_settings_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/profile/sheets/avatar_sheet.dart';
import 'package:smart_wardrobe_ai/presentation/screens/profile/sheets/change_password_sheet.dart';
import 'package:smart_wardrobe_ai/presentation/screens/profile/sheets/edit_profile_sheet.dart';
import 'package:smart_wardrobe_ai/presentation/screens/profile/sheets/language_sheet.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/profile/profile_footer.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/profile/profile_header.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/profile/profile_settings_tiles.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/profile/profile_shared_widgets.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/profile/profile_stats_row.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_background.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen>
    with SingleTickerProviderStateMixin {
  // State
  UserProfile? _profile;
  bool _loading = true;

  // Profil fotoğrafı
  String? _profilePhoto;
  bool _photoUploading = false;

  // Tercihler
  bool _notifEnabled = true;
  // _darkMode ve _selectedLang artık AppSettingsController / easy_localization
  // tarafından yönetilir — state'te tutulmuyor.

  // AI Asistan Ayarları — '' = kullanıcı hiç seçmemiş (boş kalır).
  // 'professional' | 'friendly' | 'harsh'
  String _stilTonu = '';

  // Animasyon
  late final AnimationController _fadeCtrl;
  late final Animation<double> _fadeAnim;

  static const _languages = ['Türkçe', 'English', 'Deutsch', 'Français'];

  // Locale yardımcıları

  static String _localeToDisplay(Locale locale) {
    switch (locale.languageCode) {
      case 'en':
        return 'English';
      case 'de':
        return 'Deutsch';
      case 'fr':
        return 'Français';
      default:
        return 'Türkçe';
    }
  }

  static Locale _displayToLocale(String display) {
    switch (display) {
      case 'English':
        return const Locale('en');
      case 'Deutsch':
        return const Locale('de');
      case 'Français':
        return const Locale('fr');
      default:
        return const Locale('tr');
    }
  }

  static String _displayToLangCode(String display) {
    switch (display) {
      case 'English':
        return 'en';
      case 'Deutsch':
        return 'de';
      case 'Français':
        return 'fr';
      default:
        return 'tr';
    }
  }

  // Lifecycle

  @override
  void initState() {
    super.initState();
    _fadeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 550),
    )..forward();
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);
    _fetch();
    _loadPrefs();
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    super.dispose();
  }

  // Veri / Tercihler

  Future<void> _loadPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      _notifEnabled = prefs.getBool('pref_notif') ?? true;
      // Tema: AppSettingsController.instance.isDark (zaten hazır)
      // Dil: context.locale (easy_localization tarafından yönetiliyor)
      // Bu sadece anlık/yerel önbellek — _fetch() backend'den gelen
      // gerçek değeri aldığında bunun üzerine yazacak.
      _stilTonu = prefs.getString('pref_stilTonu') ?? '';
      // Önce yerel cache'i yükle — API sonucuyla sync edilecek
      _profilePhoto = prefs.getString('pref_profilePhoto');
    });
  }

  Future<void> _savePref(String key, dynamic value) async {
    final prefs = await SharedPreferences.getInstance();
    if (value is bool) await prefs.setBool(key, value);
    if (value is String) await prefs.setString(key, value);
  }

  /// GET /api/auth/me — kullanıcı bilgilerini backend'den çek
  Future<void> _fetch() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? '';
    setState(() => _loading = true);

    try {
      final res = await http
          .get(
            Uri.parse('${ApiConstants.baseUrl}/auth/me'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(const Duration(seconds: 8));

      if (!mounted) return;

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final kullanici = data['kullanici'] ?? data;

        int itemCount = 0;
        int favCount = 0;
        int outfitCount = 0;

        try {
          final itemsFuture = http
              .get(
                Uri.parse('${ApiConstants.baseUrl}/items'),
                headers: {'Authorization': 'Bearer $token'},
              )
              .timeout(const Duration(seconds: 5));

          final favsFuture = http
              .get(
                Uri.parse('${ApiConstants.baseUrl}/items/favorites'),
                headers: {'Authorization': 'Bearer $token'},
              )
              .timeout(const Duration(seconds: 5));

          final savedOutfitsFuture = http
              .get(
                Uri.parse('${ApiConstants.baseUrl}/saved-outfits'),
                headers: {'Authorization': 'Bearer $token'},
              )
              .timeout(const Duration(seconds: 5));

          final results = await Future.wait([
            itemsFuture,
            favsFuture,
            savedOutfitsFuture,
          ]);

          if (results[0].statusCode == 200) {
            final rawItems = jsonDecode(results[0].body);
            final list = (rawItems['kiyafetler'] ?? rawItems) as List;
            itemCount = list.length;
          }
          if (results[1].statusCode == 200) {
            final rawFavs = jsonDecode(results[1].body);
            final favList = (rawFavs['favoriler'] ?? rawFavs) as List;
            favCount = favList.length;
          }
          if (results[2].statusCode == 200) {
            final rawOutfits = jsonDecode(results[2].body);
            final outfitList = (rawOutfits['kombinler'] ?? rawOutfits) as List;
            outfitCount = outfitList.length;
          }
        } catch (_) {
          // Hata durumunda varsayılan 0 kalır
        }

        if (!mounted) return;

        final p = UserProfile.fromJson(kullanici);

        // API'den gelen profil fotoğrafını senkronize et
        if (p.profilePhoto.isNotEmpty) {
          prefs.setString('pref_profilePhoto', p.profilePhoto);
        }

        // Backend'den gelen stil danışmanı tonu otoriter kaynaktır —
        // yerel önbelleği günceller (cihaz/platform fark etmeden senkron olsun).
        await prefs.setString('pref_stilTonu', p.stilTonu);

        setState(() {
          _profile = UserProfile(
            id: p.id,
            name: p.name,
            email: p.email,
            profilePhoto: p.profilePhoto,
            totalItems: itemCount,
            totalOutfits: outfitCount,
            totalFavorites: favCount,
            cinsiyet: p.cinsiyet,
            stilTonu: p.stilTonu,
          );
          if (p.profilePhoto.isNotEmpty) _profilePhoto = p.profilePhoto;
          _stilTonu = p.stilTonu;
          _loading = false;
        });
      } else {
        setState(() => _loading = false);
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  // Profil Fotoğrafı

  /// Avatar seçim sheet'ini açar.
  void _showAvatarSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => AvatarSheet(
        currentPhoto: _profilePhoto,
        onSelected: _handleAvatarSelected,
      ),
    );
  }

  /// Kamera / Galeri seçim sheet'ini açar.
  void _showPhotoPickerSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: BoxDecoration(
          color: AppColorsExtension.of(context).surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: EdgeInsets.fromLTRB(
          24,
          16,
          24,
          24 + MediaQuery.of(ctx).padding.bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppColorsExtension.of(context).border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),

            // Header
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'add_photo'.tr(),
                style: TextStyle(
                  fontFamily: 'Cormorant',
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: AppColorsExtension.of(context).text,
                  letterSpacing: -.2,
                ),
              ),
            ),
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'photo_source'.tr(),
                style: TextStyle(color: AppColorsExtension.of(context).muted, fontSize: 11),
              ),
            ),
            const SizedBox(height: 20),

            // Seçenekler
            _PhotoPickerOption(
              icon: Icons.camera_alt_outlined,
              label: 'camera'.tr(),
              subtitle: 'add_photo'.tr(),
              onTap: () {
                Navigator.pop(ctx);
                _pickPhoto(ImageSource.camera);
              },
            ),
            const SizedBox(height: 10),
            _PhotoPickerOption(
              icon: Icons.photo_library_outlined,
              label: 'gallery'.tr(),
              subtitle: 'gallery_subtitle'.tr(),
              onTap: () {
                Navigator.pop(ctx);
                _pickPhoto(ImageSource.gallery);
              },
            ),
          ],
        ),
      ),
    );
  }

  /// Seçilen avatarı Cloudinary'e yükler ve API'ye kaydeder.
  Future<void> _handleAvatarSelected(String assetPath) async {
    setState(() {
      _photoUploading = true;
    });

    try {
      final prefs = await SharedPreferences.getInstance();

      // Asset dosyasını byte array olarak oku
      final byteData = await rootBundle.load(assetPath);
      final bytes = byteData.buffer.asUint8List();
      final filename = assetPath.split('/').last;

      // Fotoğrafı Cloudinary'e yükle (ApiService içindeki uploadProfilePhoto)
      final url = await ApiService.instance.uploadProfilePhoto(
        imageBytes: bytes,
        filename: filename,
      );

      if (url.isEmpty) throw Exception('URL boş döndü.');

      await prefs.setString('pref_profilePhoto', url);

      if (!mounted) return;
      setState(() => _profilePhoto = url);
    } on ApiException catch (e) {
      if (!mounted) return;
      _showSnackBar(e.message, isError: true);
    } catch (_) {
      if (!mounted) return;
      _showSnackBar('profile_photo_not_saved'.tr(), isError: true);
    } finally {
      if (mounted) setState(() => _photoUploading = false);
    }
  }

  /// Galeriden veya kameradan fotoğraf seçip yükler.
  Future<void> _pickPhoto(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: source,
        imageQuality: 82,
        maxWidth: 800,
        maxHeight: 800,
      );
      if (picked == null || !mounted) return;

      setState(() => _photoUploading = true);

      final bytes = await picked.readAsBytes();
      final filename = picked.name;

      final url = await ApiService.instance.uploadProfilePhoto(
        imageBytes: bytes,
        filename: filename,
      );

      if (url.isEmpty) throw Exception('URL boş döndü.');

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('pref_profilePhoto', url);

      if (!mounted) return;
      setState(() => _profilePhoto = url);
    } on ApiException catch (e) {
      if (!mounted) return;
      _showSnackBar(e.message, isError: true);
    } catch (e) {
      if (!mounted) return;
      _showSnackBar(
        e.toString().contains('permission')
            ? 'add_photo_access_denied'.tr()
            : 'profile_photo_upload_failed'.tr(),
        isError: true,
      );
    } finally {
      if (mounted) setState(() => _photoUploading = false);
    }
  }

  void _showSnackBar(String msg, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
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

  // Aksiyonlar

  Future<void> _logout() async {
    final confirmed = await _showConfirm(
      title: 'logout_title'.tr(),
      body: 'logout_body'.tr(),
      confirmLabel: 'logout_title'.tr(),
      isDanger: true,
    );
    if (!confirmed || !mounted) return;

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('userName');
    if (!mounted) return;

    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  Future<void> _deleteAccount() async {
    final confirmed = await _showConfirm(
      title: 'delete_account_title'.tr(),
      body: 'delete_account_body'.tr(),
      confirmLabel: 'delete_account_confirm'.tr(),
      isDanger: true,
    );
    if (!confirmed || !mounted) return;

    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? '';

    try {
      final res = await http
          .delete(
            Uri.parse('${ApiConstants.baseUrl}/auth/me'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(const Duration(seconds: 10));

      if (!mounted) return;

      if (res.statusCode == 200) {
        await prefs.clear();
        if (!mounted) return;
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const LoginScreen()),
          (_) => false,
        );
      } else {
        if (!mounted) return;
        final body = jsonDecode(res.body);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(body['mesaj'] ?? 'Hesap silinemedi.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('outfit_generator.connection_error'.tr()),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  // Sheet / Dialog açıcılar

  void _showEditProfile() async {
    final updated = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => EditProfileSheet(profile: _profile),
    );
    if (updated == true) _fetch();
  }

  void _showChangePassword() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const ChangePasswordSheet(),
    );
  }

  void _showLanguagePicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => LanguageSheet(
        selected: _localeToDisplay(context.locale),
        languages: _languages,
        onSelect: (lang) async {
          final langCode = _displayToLangCode(lang);
          // 1) Anında UI güncellemesi — easy_localization widget ağacını yeniden inşa eder
          await context.setLocale(_displayToLocale(lang));
          // 2) Yedek anahtar — soğuk başlatmada _resolveStartScreen tarafından okunur
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('pref_language', langCode);
          // 3) Backend'e fire-and-forget senkronizasyon
          ApiService.instance.updateAppSettings(language: langCode).ignore();
        },
      ),
    );
  }

  void _showPrivacy() {
    showDialog(
      context: context,
      builder: (_) => ProfileInfoDialog(
        title: 'privacy_policy_title'.tr(),
        icon: Icons.privacy_tip_outlined,
        content:
            'privacy_policy_body'.tr() +
            'privacy_policy_item1'.tr() +
            'privacy_policy_item2'.tr() +
            'privacy_policy_item3'.tr() +
            'privacy_policy_item4'.tr(),
      ),
    );
  }

  void _showHelp() {
    showDialog(
      context: context,
      builder: (_) => ProfileInfoDialog(
        title: 'Yardım & Destek',
        icon: Icons.help_outline_rounded,
        content:
            'privacy_policy_contact'.tr() +
            '📧  smartwardrobeai@gmail.com\n\n' +
            'privacy_policy_faq'.tr() +
            'privacy_policy_response_time'.tr(),
      ),
    );
  }

  void _showAbout() {
    showDialog(context: context, builder: (_) => const ProfileAboutDialog());
  }

  Future<bool> _showConfirm({
    required String title,
    required String body,
    required String confirmLabel,
    bool isDanger = false,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (_) => ProfileConfirmDialog(
        title: title,
        body: body,
        confirmLabel: confirmLabel,
        isDanger: isDanger,
      ),
    );
    return result ?? false;
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
        // Geri butonu + başlık
        SliverToBoxAdapter(child: _buildTopBar()),

        // Profil başlığı
        SliverToBoxAdapter(
          child: ProfileHeader(
            profile: _profile,
            profilePhoto: _profilePhoto,
            uploading: _photoUploading,
            onAvatarTap: _showAvatarSheet,
            onCameraTap: _showPhotoPickerSheet,
          ),
        ),

        // İstatistik satırı
        if (_profile != null)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 22),
              child: ProfileStatsRow(profile: _profile!),
            ),
          ),

        // AI Asistan Ayarları
        const SliverToBoxAdapter(child: SizedBox(height: 8)),
        ProfileSectionLabel(label: 'profile.ai_settings'.tr()),
        SliverToBoxAdapter(child: _buildAiCard()),

        // Görünüm & Dil
        const SliverToBoxAdapter(child: SizedBox(height: 8)),
        ProfileSectionLabel(label: 'profile.appearance'.tr()),
        SliverToBoxAdapter(child: _buildAppearanceCard()),

        // Bildirimler
        const SliverToBoxAdapter(child: SizedBox(height: 8)),
        ProfileSectionLabel(label: 'profile.notifications'.tr()),
        SliverToBoxAdapter(child: _buildNotifCard()),

        // Hesap
        const SliverToBoxAdapter(child: SizedBox(height: 8)),
        ProfileSectionLabel(label: 'profile.account'.tr()),
        SliverToBoxAdapter(child: _buildAccountCard()),

        // Oturum
        const SliverToBoxAdapter(child: SizedBox(height: 8)),
        ProfileSectionLabel(label: 'profile.session'.tr()),
        SliverToBoxAdapter(child: _buildSessionCard()),

        // Footer
        const SliverToBoxAdapter(child: ProfileFooter()),
      ],
    );
  }

  // Üst bar
  Widget _buildTopBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 22, 0),
      child: Row(
        children: [
          ProfileGlassButton(
            icon: Icons.arrow_back_ios_new_rounded,
            onTap: () => Navigator.pop(context),
          ),
          const SizedBox(width: 12),
          Text(
            'profile.title'.tr(),
            style: TextStyle(
              fontFamily: 'Cormorant',
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppColorsExtension.of(context).text,
              letterSpacing: -.3,
            ),
          ),
          const Spacer(),
          ProfileGlassButton(icon: Icons.refresh_rounded, onTap: _fetch),
        ],
      ),
    );
  }

  // AI Asistan Ayarları kartı
  Widget _buildAiCard() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 10, 22, 0),
      child: ProfileSettingsCard(
        children: [
          ProfileNavTile(
            icon: Icons.record_voice_over_outlined,
            label: 'profile.style_advisor_tone'.tr(),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _stilTonu.isEmpty
                      ? 'style_advisor_not_selected'.tr()
                      : 'style_advisor_$_stilTonu'.tr(),
                  style: TextStyle(
                    color: _stilTonu.isEmpty ? AppColorsExtension.of(context).muted : AppColors.gold,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(width: 4),
                Icon(
                  Icons.chevron_right_rounded,
                  color: AppColorsExtension.of(context).muted,
                  size: 20,
                ),
              ],
            ),
            onTap: _showStilTonuSheet,
          ),
          const ProfileTileDivider(),
          ProfileNavTile(
            icon: Icons.accessibility_new_rounded,
            label: 'profile.body_profile'.tr(),
            onTap: _showVucutProfili,
          ),
        ],
      ),
    );
  }

  /// Stil danışmanı tonu seçme bottom sheet
  void _showStilTonuSheet() {
    // Tone options: backend enum değeri + isim/açıklama key'i + ikon
    const tones = [
      (
        'professional',
        'style_advisor_professional',
        'style_advisor_professional_description',
        Icons.business_center_outlined,
      ),
      (
        'friendly',
        'style_advisor_friendly',
        'style_advisor_friendly_description',
        Icons.emoji_emotions_outlined,
      ),
      (
        'harsh',
        'style_advisor_harsh',
        'style_advisor_harsh_description',
        Icons.star_border_rounded,
      ),
    ];

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Container(
          decoration: BoxDecoration(
            color: AppColorsExtension.of(context).surface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.fromLTRB(
            22,
            16,
            22,
            22 + MediaQuery.of(ctx).viewInsets.bottom,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColorsExtension.of(context).border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          AppColors.gold.withValues(alpha: .18),
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
                      Icons.record_voice_over_outlined,
                      color: AppColors.goldLight,
                      size: 16,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'style_advisor_tone'.tr(),
                        style: TextStyle(
                          fontFamily: 'Cormorant',
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: AppColorsExtension.of(context).text,
                        ),
                      ),
                      Text(
                        'style_advisor_tone_description'.tr(),
                        style: TextStyle(
                          color: AppColorsExtension.of(context).muted,
                          fontSize: 11,
                          letterSpacing: .2,
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 20),
              Divider(color: AppColorsExtension.of(context).border, height: 1),
              const SizedBox(height: 16),

              // Tone options
              ...tones.map((t) {
                final isSelected = _stilTonu == t.$1;
                return GestureDetector(
                  onTap: () async {
                    final eskiTon = _stilTonu;
                    final yeniTon = t.$1;

                    // Optimistic UI — hemen seçili göster ve sheet'i kapat.
                    setModalState(() {});
                    setState(() => _stilTonu = yeniTon);
                    Navigator.pop(ctx);

                    // Backend'e kaydet — AI kombin önerisi/açıklaması bu tonu kullanır.
                    // Yerel önbelleğe SADECE backend onayladıktan sonra yazıyoruz;
                    // aksi halde kayıt başarısız olsa bile bir dahaki açılışta
                    // (hot restart/yeniden başlatma) yanlışlıkla "kayıtlı" görünebilir.
                    try {
                      await ApiService.instance.updateStyleAdvisorTone(yeniTon);
                      await _savePref('pref_stilTonu', yeniTon);
                    } catch (e) {
                      if (!mounted) return;
                      // Kayıt başarısız oldu — eski değere geri dön, kullanıcıyı bilgilendir.
                      setState(() => _stilTonu = eskiTon);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            e is ApiException
                                ? e.message
                                : 'profile.style_advisor_tone'.tr(),
                          ),
                          backgroundColor: AppColorsExtension.of(context).surface,
                        ),
                      );
                    }
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 14,
                    ),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.gold.withValues(alpha: .08)
                          : AppColorsExtension.of(context).bg,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: isSelected
                            ? AppColors.gold.withValues(alpha: .45)
                            : AppColorsExtension.of(context).border,
                        width: isSelected ? 1.2 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: isSelected
                                ? AppColors.gold.withValues(alpha: .15)
                                : AppColorsExtension.of(context).surface,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isSelected
                                  ? AppColors.gold.withValues(alpha: .35)
                                  : AppColorsExtension.of(context).border,
                            ),
                          ),
                          child: Icon(
                            t.$4,
                            color: isSelected
                                ? AppColors.goldLight
                                : AppColorsExtension.of(context).muted,
                            size: 17,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                t.$2.tr(),
                                style: TextStyle(
                                  color: isSelected
                                      ? AppColors.goldLight
                                      : AppColorsExtension.of(context).text,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                t.$3.tr(),
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
                        AnimatedOpacity(
                          opacity: isSelected ? 1.0 : 0.0,
                          duration: const Duration(milliseconds: 200),
                          child: Container(
                            width: 20,
                            height: 20,
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                colors: [AppColors.gold, AppColors.goldLight],
                              ),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.check_rounded,
                              color: Colors.black,
                              size: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  /// Vücut profili ekranına yönlendir
  void _showVucutProfili() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const BodyProfileScreen()),
    );
  }

  // Görünüm & Dil kartı
  Widget _buildAppearanceCard() {
    final isDark = AppSettingsController.instance.isDark;
    final currentLang = _localeToDisplay(context.locale);

    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 10, 22, 0),
      child: ProfileSettingsCard(
        children: [
          ProfileToggleTile(
            icon: isDark ? Icons.dark_mode_outlined : Icons.light_mode_outlined,
            label: isDark
                ? 'profile.dark_theme'.tr()
                : 'profile.light_theme'.tr(),
            subtitle: isDark
                ? 'profile.dark_theme_subtitle'.tr()
                : 'profile.light_theme_subtitle'.tr(),
            value: isDark,
            // setTheme → notifyListeners → MaterialApp themeMode değişir → anlık UI tepkisi
            onChanged: (v) => AppSettingsController.instance.setTheme(v),
          ),
          const ProfileTileDivider(),
          ProfileNavTile(
            icon: Icons.language_rounded,
            label: 'profile.language'.tr(),
            trailing: Text(
              currentLang,
              style: TextStyle(
                color: AppColors.gold,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
            onTap: _showLanguagePicker,
          ),
        ],
      ),
    );
  }

  // Bildirimler kartı
  Widget _buildNotifCard() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 10, 22, 0),
      child: ProfileSettingsCard(
        children: [
          ProfileNavTile(
            icon: Icons.notifications_active_outlined,
            label: 'profile.notifications_settings'.tr(),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 7,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppColors.gold, AppColors.goldLight],
                    ),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    'AI',
                    style: TextStyle(
                      color: Colors.black,
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                      letterSpacing: .5,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Icon(
                  Icons.chevron_right_rounded,
                  color: AppColorsExtension.of(context).muted,
                  size: 20,
                ),
              ],
            ),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => const NotificationSettingsScreen(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Hesap kartı
  Widget _buildAccountCard() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 10, 22, 0),
      child: ProfileSettingsCard(
        children: [
          ProfileNavTile(
            icon: Icons.person_outline_rounded,
            label: 'profile.edit_profile'.tr(),
            onTap: _showEditProfile,
          ),
          const ProfileTileDivider(),
          ProfileNavTile(
            icon: Icons.lock_outline_rounded,
            label: 'profile.change_password'.tr(),
            onTap: _showChangePassword,
          ),
          const ProfileTileDivider(),
          ProfileNavTile(
            icon: Icons.privacy_tip_outlined,
            label: 'profile.privacy_policy'.tr(),
            onTap: _showPrivacy,
          ),
          const ProfileTileDivider(),
          ProfileNavTile(
            icon: Icons.help_outline_rounded,
            label: 'profile.help_support'.tr(),
            onTap: _showHelp,
          ),
          const ProfileTileDivider(),
          ProfileNavTile(
            icon: Icons.info_outline_rounded,
            label: 'profile.about'.tr(),
            onTap: _showAbout,
          ),
        ],
      ),
    );
  }

  // Oturum kartı
  Widget _buildSessionCard() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 10, 22, 0),
      child: ProfileSettingsCard(
        children: [
          ProfileNavTile(
            icon: Icons.logout_rounded,
            label: 'profile.logout'.tr(),
            iconColor: AppColors.error,
            textColor: AppColors.error,
            onTap: _logout,
          ),
          const ProfileTileDivider(),
          ProfileNavTile(
            icon: Icons.delete_forever_outlined,
            label: 'profile.delete_account'.tr(),
            iconColor: AppColors.error,
            textColor: AppColors.error,
            onTap: _deleteAccount,
          ),
        ],
      ),
    );
  }
}

// Fotoğraf kaynağı seçenek satırı

class _PhotoPickerOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback onTap;

  const _PhotoPickerOption({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: () {
      HapticFeedback.selectionClick();
      onTap();
    },
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      decoration: BoxDecoration(
        color: AppColorsExtension.of(context).bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColorsExtension.of(context).border),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.gold.withValues(alpha: .14),
                  AppColors.goldLight.withValues(alpha: .06),
                ],
              ),
              borderRadius: BorderRadius.circular(11),
              border: Border.all(color: AppColors.gold.withValues(alpha: .30)),
            ),
            child: Icon(icon, color: AppColors.goldLight, size: 18),
          ),
          const SizedBox(width: 14),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontFamily: 'Cormorant',
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColorsExtension.of(context).text,
                  letterSpacing: -.1,
                ),
              ),
              Text(
                subtitle,
                style: TextStyle(color: AppColorsExtension.of(context).muted, fontSize: 11),
              ),
            ],
          ),
          const Spacer(),
          Icon(
            Icons.chevron_right_rounded,
            color: AppColorsExtension.of(context).muted,
            size: 20,
          ),
        ],
      ),
    ),
  );
}
