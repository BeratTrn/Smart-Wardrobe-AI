import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/core/utils/avatar_manager.dart';
import 'package:smart_wardrobe_ai/data/services/api_service.dart';
import 'package:smart_wardrobe_ai/presentation/screens/auth/login_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/profile/dialogs/about_dialog.dart';
import 'package:smart_wardrobe_ai/presentation/screens/profile/dialogs/confirm_dialog.dart';
import 'package:smart_wardrobe_ai/presentation/screens/profile/dialogs/info_dialog.dart';
import 'package:smart_wardrobe_ai/data/models/user_profile.dart';
import 'package:smart_wardrobe_ai/presentation/screens/profile/sheets/avatar_sheet.dart';
import 'package:smart_wardrobe_ai/presentation/screens/profile/sheets/change_password_sheet.dart';
import 'package:smart_wardrobe_ai/presentation/screens/profile/sheets/edit_profile_sheet.dart';
import 'package:smart_wardrobe_ai/presentation/screens/profile/sheets/language_sheet.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/profile/profile_footer.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/profile/profile_header.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/profile/profile_settings_tiles.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/profile/profile_shared_widgets.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/profile/profile_stats_row.dart';
import 'package:smart_wardrobe_ai/presentation/screens/profile/body_profile_screen.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_background.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen>
    with SingleTickerProviderStateMixin {
  // ── State
  UserProfile? _profile;
  bool _loading = true;

  // ── Profil fotoğrafı
  String? _profilePhoto;
  bool    _photoUploading = false;

  // ── Tercihler
  bool _notifEnabled = true;
  bool _darkMode = true;
  String _selectedLang = 'Türkçe';

  // ── AI Asistan Ayarları
  String _stilTonu = 'Samimi';

  // ── Animasyon
  late final AnimationController _fadeCtrl;
  late final Animation<double> _fadeAnim;

  static const _languages = ['Türkçe', 'English', 'Deutsch', 'Français'];

  // ─────────────────────────────────────── Lifecycle ──

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

  // ─────────────────────────────────────── Veri / Tercihler ──

  Future<void> _loadPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      _notifEnabled = prefs.getBool('pref_notif') ?? true;
      _darkMode     = prefs.getBool('pref_darkMode') ?? true;
      _selectedLang = prefs.getString('pref_lang') ?? 'Türkçe';
      _stilTonu     = prefs.getString('pref_stilTonu') ?? 'Samimi';
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

          final results = await Future.wait([itemsFuture, favsFuture]);

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
        } catch (_) {
          // Hata durumunda varsayılan 0 kalır
        }

        if (!mounted) return;

        final p = UserProfile.fromJson(kullanici);

        // API'den gelen profil fotoğrafını senkronize et
        if (p.profilePhoto.isNotEmpty) {
          prefs.setString('pref_profilePhoto', p.profilePhoto);
        }

        setState(() {
          _profile = UserProfile(
            id: p.id,
            name: p.name,
            email: p.email,
            profilePhoto: p.profilePhoto,
            totalItems: itemCount,
            totalOutfits: 0,
            totalFavorites: favCount,
          );
          if (p.profilePhoto.isNotEmpty) _profilePhoto = p.profilePhoto;
          _loading = false;
        });
      } else {
        setState(() => _loading = false);
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ─────────────────────────────────────── Profil Fotoğrafı ──

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
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: EdgeInsets.fromLTRB(
          24, 16, 24, 24 + MediaQuery.of(ctx).padding.bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle
            Container(
              width: 36, height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),

            // Header
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Fotoğraf Ekle',
                style: TextStyle(
                  fontFamily: 'Cormorant',
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: AppColors.text,
                  letterSpacing: -.2,
                ),
              ),
            ),
            const SizedBox(height: 4),
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Nereden eklemek istiyorsun?',
                style: TextStyle(color: AppColors.muted, fontSize: 11),
              ),
            ),
            const SizedBox(height: 20),

            // Seçenekler
            _PhotoPickerOption(
              icon: Icons.camera_alt_outlined,
              label: 'Kamera',
              subtitle: 'Fotoğraf çek',
              onTap: () {
                Navigator.pop(ctx);
                _pickPhoto(ImageSource.camera);
              },
            ),
            const SizedBox(height: 10),
            _PhotoPickerOption(
              icon: Icons.photo_library_outlined,
              label: 'Galeri',
              subtitle: 'Galeride seç',
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

  /// Seçilen avatarı kaydeder ve API'ye gönderir.
  Future<void> _handleAvatarSelected(String assetPath) async {
    setState(() {
      _profilePhoto    = assetPath;
      _photoUploading  = true;
    });

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('pref_profilePhoto', assetPath);
      await ApiService.instance.updateProfilePhotoAvatar(assetPath);
    } on ApiException catch (e) {
      if (!mounted) return;
      _showSnackBar(e.message, isError: true);
    } catch (_) {
      if (!mounted) return;
      _showSnackBar('Profil fotoğrafı kaydedilemedi.', isError: true);
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

      final bytes    = await picked.readAsBytes();
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
            ? 'Fotoğraf erişim izni gerekli.'
            : 'Fotoğraf yüklenemedi, tekrar dene.',
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
        backgroundColor: AppColors.surface,
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

  // ─────────────────────────────────────── Aksiyonlar ──

  Future<void> _logout() async {
    final confirmed = await _showConfirm(
      title: 'Çıkış Yap',
      body: 'Hesabından çıkmak istediğine emin misin?',
      confirmLabel: 'Çıkış Yap',
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
      title: 'Hesabı Sil',
      body: 'Tüm veriler kalıcı olarak silinecek.\nBu işlem geri alınamaz.',
      confirmLabel: 'Evet, Sil',
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
        const SnackBar(
          content: Text('Sunucuya bağlanılamadı. Lütfen tekrar deneyin.'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  // ─────────────────────────────────────── Sheet / Dialog açıcılar ──

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
        selected: _selectedLang,
        languages: _languages,
        onSelect: (lang) {
          setState(() => _selectedLang = lang);
          _savePref('pref_lang', lang);
        },
      ),
    );
  }

  void _showPrivacy() {
    showDialog(
      context: context,
      builder: (_) => const ProfileInfoDialog(
        title: 'Gizlilik Politikası',
        icon: Icons.privacy_tip_outlined,
        content:
            'Smart Wardrobe AI olarak kişisel verilerinizin güvenliğini ön planda tutuyoruz.\n\n'
            '• Kıyafet fotoğraflarınız yalnızca sizin gardirop hesabınızda saklanır.\n\n'
            '• Üçüncü taraflarla hiçbir kişisel veriniz paylaşılmaz.\n\n'
            '• Hesabınızı sildiğinizde tüm verileriniz kalıcı olarak kaldırılır.\n\n'
            '• JWT tabanlı kimlik doğrulama ile güvenli erişim sağlanır.',
      ),
    );
  }

  void _showHelp() {
    showDialog(
      context: context,
      builder: (_) => const ProfileInfoDialog(
        title: 'Yardım & Destek',
        icon: Icons.help_outline_rounded,
        content:
            'Herhangi bir sorunla karşılaştığında bize ulaşabilirsin:\n\n'
            '📧  destek@smartwardrobe.ai\n\n'
            '🌐  smartwardrobe.ai/destek\n\n'
            'Sık sorulan sorular ve kullanım kılavuzu için web sitemizi ziyaret edebilirsin. '
            'Yanıt süremiz genellikle 24 saattir.',
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

  // ─────────────────────────────────────── Build ──

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
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
        // ── Geri butonu + başlık
        SliverToBoxAdapter(child: _buildTopBar()),

        // ── Profil başlığı
        SliverToBoxAdapter(
          child: ProfileHeader(
            profile: _profile,
            profilePhoto: _profilePhoto,
            uploading: _photoUploading,
            onAvatarTap: _showAvatarSheet,
            onCameraTap: _showPhotoPickerSheet,
          ),
        ),

        // ── İstatistik satırı
        if (_profile != null)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 22),
              child: ProfileStatsRow(profile: _profile!),
            ),
          ),

        // ── AI Asistan Ayarları
        const SliverToBoxAdapter(child: SizedBox(height: 8)),
        ProfileSectionLabel(label: 'AI ASİSTAN AYARLARI'),
        SliverToBoxAdapter(child: _buildAiCard()),

        // ── Görünüm & Dil
        const SliverToBoxAdapter(child: SizedBox(height: 8)),
        ProfileSectionLabel(label: 'GÖRÜNÜM & DİL'),
        SliverToBoxAdapter(child: _buildAppearanceCard()),

        // ── Bildirimler
        const SliverToBoxAdapter(child: SizedBox(height: 8)),
        ProfileSectionLabel(label: 'BİLDİRİMLER'),
        SliverToBoxAdapter(child: _buildNotifCard()),

        // ── Hesap
        const SliverToBoxAdapter(child: SizedBox(height: 8)),
        ProfileSectionLabel(label: 'HESAP'),
        SliverToBoxAdapter(child: _buildAccountCard()),

        // ── Oturum
        const SliverToBoxAdapter(child: SizedBox(height: 8)),
        ProfileSectionLabel(label: 'OTURUM'),
        SliverToBoxAdapter(child: _buildSessionCard()),

        // ── Footer
        const SliverToBoxAdapter(child: ProfileFooter()),
      ],
    );
  }

  // ── Üst bar
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
          const Text(
            'Profil & Ayarlar',
            style: TextStyle(
              fontFamily: 'Cormorant',
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppColors.text,
              letterSpacing: -.3,
            ),
          ),
          const Spacer(),
          ProfileGlassButton(icon: Icons.refresh_rounded, onTap: _fetch),
        ],
      ),
    );
  }

  // ── AI Asistan Ayarları kartı
  Widget _buildAiCard() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 10, 22, 0),
      child: ProfileSettingsCard(
        children: [
          ProfileNavTile(
            icon: Icons.record_voice_over_outlined,
            label: 'Stil Danışmanı Tonu',
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _stilTonu,
                  style: const TextStyle(
                    color: AppColors.gold,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(width: 4),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: AppColors.muted,
                  size: 20,
                ),
              ],
            ),
            onTap: _showStilTonuSheet,
          ),
          const ProfileTileDivider(),
          ProfileNavTile(
            icon: Icons.accessibility_new_rounded,
            label: 'Vücut Profili & Tercihler',
            onTap: _showVucutProfili,
          ),
        ],
      ),
    );
  }

  /// Stil danışmanı tonu seçme bottom sheet
  void _showStilTonuSheet() {
    // Tone options: name + description + icon
    const tones = [
      (
        'Profesyonel',
        'Resmi, net ve kurumsal bir stil. Ofis & iş toplantıları için.',
        Icons.business_center_outlined,
      ),
      (
        'Samimi',
        'Enerjik ve neşeli bir dost gibi. Günlük, eğlenceli öneriler.',
        Icons.emoji_emotions_outlined,
      ),
      (
        'Sert / Moda Eleştirmeni',
        'Kompromi yok. Cesur, dürüst ve yüksek standartlı.',
        Icons.star_border_rounded,
      ),
    ];

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Container(
          decoration: const BoxDecoration(
            color: AppColors.surface,
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
                    color: AppColors.border,
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
                      gradient: LinearGradient(colors: [
                        AppColors.gold.withValues(alpha: .18),
                        AppColors.goldLight.withValues(alpha: .08),
                      ]),
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
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Stil Danışmanı Tonu',
                        style: TextStyle(
                          fontFamily: 'Cormorant',
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: AppColors.text,
                        ),
                      ),
                      Text(
                        'AI\'ın sana nasıl hitap edeceğini seç',
                        style: TextStyle(
                          color: AppColors.muted,
                          fontSize: 11,
                          letterSpacing: .2,
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 20),
              const Divider(color: AppColors.border, height: 1),
              const SizedBox(height: 16),

              // Tone options
              ...tones.map((t) {
                final isSelected = _stilTonu == t.$1;
                return GestureDetector(
                  onTap: () {
                    setModalState(() {});
                    setState(() => _stilTonu = t.$1);
                    _savePref('pref_stilTonu', t.$1);
                    Navigator.pop(ctx);
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
                          : AppColors.bg,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: isSelected
                            ? AppColors.gold.withValues(alpha: .45)
                            : AppColors.border,
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
                                : AppColors.surface,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isSelected
                                  ? AppColors.gold.withValues(alpha: .35)
                                  : AppColors.border,
                            ),
                          ),
                          child: Icon(
                            t.$3,
                            color: isSelected
                                ? AppColors.goldLight
                                : AppColors.muted,
                            size: 17,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                t.$1,
                                style: TextStyle(
                                  color: isSelected
                                      ? AppColors.goldLight
                                      : AppColors.text,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                t.$2,
                                style: const TextStyle(
                                  color: AppColors.muted,
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

  // ── Görünüm & Dil kartı
  Widget _buildAppearanceCard() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 10, 22, 0),
      child: ProfileSettingsCard(
        children: [
          ProfileToggleTile(
            icon: Icons.dark_mode_outlined,
            label: 'Karanlık Tema',
            subtitle: 'Koyu arka plan modu',
            value: _darkMode,
            onChanged: (v) {
              setState(() => _darkMode = v);
              _savePref('pref_darkMode', v);
            },
          ),
          const ProfileTileDivider(),
          ProfileNavTile(
            icon: Icons.language_rounded,
            label: 'Dil',
            trailing: Text(
              _selectedLang,
              style: const TextStyle(
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

  // ── Bildirimler kartı
  Widget _buildNotifCard() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 10, 22, 0),
      child: ProfileSettingsCard(
        children: [
          ProfileToggleTile(
            icon: Icons.notifications_outlined,
            label: 'Bildirimler',
            subtitle: 'Push bildirimlerini al',
            value: _notifEnabled,
            onChanged: (v) {
              setState(() => _notifEnabled = v);
              _savePref('pref_notif', v);
            },
          ),
        ],
      ),
    );
  }

  // ── Hesap kartı
  Widget _buildAccountCard() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 10, 22, 0),
      child: ProfileSettingsCard(
        children: [
          ProfileNavTile(
            icon: Icons.person_outline_rounded,
            label: 'Profili Düzenle',
            onTap: _showEditProfile,
          ),
          const ProfileTileDivider(),
          ProfileNavTile(
            icon: Icons.lock_outline_rounded,
            label: 'Şifre Değiştir',
            onTap: _showChangePassword,
          ),
          const ProfileTileDivider(),
          ProfileNavTile(
            icon: Icons.privacy_tip_outlined,
            label: 'Gizlilik Politikası',
            onTap: _showPrivacy,
          ),
          const ProfileTileDivider(),
          ProfileNavTile(
            icon: Icons.help_outline_rounded,
            label: 'Yardım & Destek',
            onTap: _showHelp,
          ),
          const ProfileTileDivider(),
          ProfileNavTile(
            icon: Icons.info_outline_rounded,
            label: 'Hakkında',
            onTap: _showAbout,
          ),
        ],
      ),
    );
  }

  // ── Oturum kartı
  Widget _buildSessionCard() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 10, 22, 0),
      child: ProfileSettingsCard(
        children: [
          ProfileNavTile(
            icon: Icons.logout_rounded,
            label: 'Çıkış Yap',
            iconColor: AppColors.error,
            textColor: AppColors.error,
            onTap: _logout,
          ),
          const ProfileTileDivider(),
          ProfileNavTile(
            icon: Icons.delete_forever_outlined,
            label: 'Hesabı Kalıcı Olarak Sil',
            iconColor: AppColors.error,
            textColor: AppColors.error,
            onTap: _deleteAccount,
          ),
        ],
      ),
    );
  }
}

// ── Fotoğraf kaynağı seçenek satırı ─────────────────────────────────────────

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
            color: AppColors.bg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [
                    AppColors.gold.withValues(alpha: .14),
                    AppColors.goldLight.withValues(alpha: .06),
                  ]),
                  borderRadius: BorderRadius.circular(11),
                  border: Border.all(
                    color: AppColors.gold.withValues(alpha: .30),
                  ),
                ),
                child: Icon(icon, color: AppColors.goldLight, size: 18),
              ),
              const SizedBox(width: 14),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      fontFamily: 'Cormorant',
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppColors.text,
                      letterSpacing: -.1,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: AppColors.muted,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
              const Spacer(),
              const Icon(
                Icons.chevron_right_rounded,
                color: AppColors.muted,
                size: 20,
              ),
            ],
          ),
        ),
      );
}
