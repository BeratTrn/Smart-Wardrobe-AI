import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/presentation/screens/auth/login_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/profile/dialogs/about_dialog.dart';
import 'package:smart_wardrobe_ai/presentation/screens/profile/dialogs/confirm_dialog.dart';
import 'package:smart_wardrobe_ai/presentation/screens/profile/dialogs/info_dialog.dart';
import 'package:smart_wardrobe_ai/data/models/user_profile.dart';
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
  // ── State
  UserProfile? _profile;
  bool _loading = true;

  // ── Tercihler
  bool _notifEnabled = true;
  bool _darkMode = true;
  String _selectedLang = 'Türkçe';

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
      _darkMode = prefs.getBool('pref_darkMode') ?? true;
      _selectedLang = prefs.getString('pref_lang') ?? 'Türkçe';
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

        setState(() {
          _profile = UserProfile(
            id: p.id,
            name: p.name,
            email: p.email,
            totalItems: itemCount,
            totalOutfits: 0,
            totalFavorites: favCount,
          );
          _loading = false;
        });
      } else {
        setState(() => _loading = false);
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
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
          child: ProfileHeader(profile: _profile, onEditTap: _showEditProfile),
        ),

        // ── İstatistik satırı
        if (_profile != null)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 22),
              child: ProfileStatsRow(profile: _profile!),
            ),
          ),

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
