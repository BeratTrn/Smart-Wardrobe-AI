import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/presentation/screens/auth/login_screen.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_background.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_text_styles.dart';

// ─── MODEL ────────────────────────────────────────────────────────────────────

class UserProfile {
  final String id;
  final String name;
  final String email;
  final int totalItems;
  final int totalOutfits;
  final int totalFavorites;

  const UserProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.totalItems,
    required this.totalOutfits,
    required this.totalFavorites,
  });

  factory UserProfile.fromJson(Map<String, dynamic> j) => UserProfile(
    id: j['_id'] ?? '',
    name: j['kullaniciAdi'] ?? j['name'] ?? '',
    email: j['email'] ?? '',
    totalItems: j['toplamKiyafet'] ?? j['totalItems'] ?? 0,
    totalOutfits: j['toplamKombin'] ?? j['totalOutfits'] ?? 0,
    totalFavorites: j['toplamFavori'] ?? j['totalFavorites'] ?? 0,
  );
}

// ─── SCREEN ───────────────────────────────────────────────────────────────────

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen>
    with SingleTickerProviderStateMixin {
  UserProfile? _profile;
  bool _loading = true;

  // Ayarlar (sadece bildirim + dil + tema kaldı)
  bool _notifEnabled = true;
  bool _darkMode = true;
  String _selectedLang = 'Türkçe';

  late final AnimationController _fadeCtrl;
  late final Animation<double> _fadeAnim;

  static const _languages = ['Türkçe', 'English', 'Deutsch', 'Français'];

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

  // ── Kullanıcı bilgilerini backend'den çek  GET /api/auth/me
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
        // Yanıt: { kullanici: { _id, kullaniciAdi, email, ... } }
        final kullanici = data['kullanici'] ?? data;
        setState(() {
          _profile = UserProfile.fromJson(kullanici);
          _loading = false;
        });
      } else {
        setState(() => _loading = false);
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ── Çıkış yap
  Future<void> _logout() async {
    final confirmed = await _confirm(
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

  // ── Hesabı sil
  Future<void> _deleteAccount() async {
    final confirmed = await _confirm(
      title: 'Hesabı Sil',
      body: 'Tüm veriler kalıcı olarak silinecek.\nBu işlem geri alınamaz.',
      confirmLabel: 'Evet, Sil',
      isDanger: true,
    );
    if (!confirmed || !mounted) return;

    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? '';

    try {
      await http.delete(
        Uri.parse('${ApiConstants.baseUrl}/kullanici'),
        headers: {'Authorization': 'Bearer $token'},
      );
      await prefs.clear();
      if (!mounted) return;
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (_) => false,
      );
    } catch (_) {}
  }

  // ── Profili düzenle (bottom sheet)
  void _showEditProfile() async {
    final updated = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _EditProfileSheet(profile: _profile),
    );
    if (updated == true) _fetch(); // Güncellendiyse bilgileri yenile
  }

  // ── Şifre değiştir (bottom sheet)
  void _showChangePassword() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _ChangePasswordSheet(),
    );
  }

  // ── Dil seçici (bottom sheet)
  void _showLanguagePicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _LanguageSheet(
        selected: _selectedLang,
        languages: _languages,
        onSelect: (lang) {
          setState(() => _selectedLang = lang);
          _savePref('pref_lang', lang);
        },
      ),
    );
  }

  // ── Gizlilik politikası (dialog)
  void _showPrivacy() {
    _showInfoDialog(
      title: 'Gizlilik Politikası',
      icon: Icons.privacy_tip_outlined,
      content:
          'Smart Wardrobe AI olarak kişisel verilerinizin güvenliğini ön planda tutuyoruz.\n\n'
          '• Kıyafet fotoğraflarınız yalnızca sizin gardirop hesabınızda saklanır.\n\n'
          '• Üçüncü taraflarla hiçbir kişisel veriniz paylaşılmaz.\n\n'
          '• Hesabınızı sildiğinizde tüm verileriniz kalıcı olarak kaldırılır.\n\n'
          '• JWT tabanlı kimlik doğrulama ile güvenli erişim sağlanır.',
    );
  }

  // ── Yardım & Destek (dialog)
  void _showHelp() {
    _showInfoDialog(
      title: 'Yardım & Destek',
      icon: Icons.help_outline_rounded,
      content:
          'Herhangi bir sorunla karşılaştığında bize ulaşabilirsin:\n\n'
          '📧  destek@smartwardrobe.ai\n\n'
          '🌐  smartwardrobe.ai/destek\n\n'
          'Sık sorulan sorular ve kullanım kılavuzu için web sitemizi ziyaret edebilirsin. '
          'Yanıt süremiz genellikle 24 saattir.',
    );
  }

  // ── Hakkında (dialog)
  void _showAbout() {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: AppColors.card,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.gold, AppColors.goldLight],
                  ),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.gold.withOpacity(.3),
                      blurRadius: 16,
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.checkroom_rounded,
                  color: Colors.black,
                  size: 26,
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'Smart Wardrobe AI',
                style: TextStyle(
                  fontFamily: 'Cormorant',
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: AppColors.text,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Versiyon 1.0.0',
                style: AppTextStyles.caption.copyWith(color: AppColors.muted),
              ),
              const SizedBox(height: 12),
              const Text(
                'AI destekli akıllı gardırop asistanın.\nHer gün en iyi kombinini seç.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppColors.textSub,
                  fontSize: 13,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 24),
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: const Center(
                    child: Text(
                      'Kapat',
                      style: TextStyle(color: AppColors.textSub, fontSize: 14),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showInfoDialog({
    required String title,
    required IconData icon,
    required String content,
  }) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: AppColors.card,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.gold.withOpacity(.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(icon, color: AppColors.gold, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      title,
                      style: const TextStyle(
                        fontFamily: 'Cormorant',
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: AppColors.text,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Divider(height: 1, color: AppColors.border),
              const SizedBox(height: 16),
              Text(
                content,
                style: const TextStyle(
                  color: AppColors.textSub,
                  fontSize: 13,
                  height: 1.6,
                ),
              ),
              const SizedBox(height: 24),
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: const Center(
                    child: Text(
                      'Tamam',
                      style: TextStyle(color: AppColors.textSub, fontSize: 14),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<bool> _confirm({
    required String title,
    required String body,
    required String confirmLabel,
    bool isDanger = false,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (_) => _ConfirmDialog(
        title: title,
        body: body,
        confirmLabel: confirmLabel,
        isDanger: isDanger,
      ),
    );
    return result ?? false;
  }

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
                : CustomScrollView(
                    physics: const BouncingScrollPhysics(),
                    slivers: [
                      // ── Geri butonu + başlık
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 12, 22, 0),
                          child: Row(
                            children: [
                              _GlassButton(
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
                              // Yenile butonu
                              _GlassButton(
                                icon: Icons.refresh_rounded,
                                onTap: _fetch,
                              ),
                            ],
                          ),
                        ),
                      ),

                      // ── Profil başlığı (DB'den çekilen bilgilerle)
                      SliverToBoxAdapter(
                        child: _ProfileHeader(
                          profile: _profile,
                          onEditTap: _showEditProfile,
                        ),
                      ),

                      // ── İstatistik satırı
                      if (_profile != null)
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 22),
                            child: _StatsRow(profile: _profile!),
                          ),
                        ),

                      // ── Görünüm & Dil
                      _gap(),
                      _SectionLabel(label: 'GÖRÜNÜM & DİL'),
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(22, 10, 22, 0),
                          child: _SettingsCard(
                            children: [
                              _ToggleTile(
                                icon: Icons.dark_mode_outlined,
                                label: 'Karanlık Tema',
                                subtitle: 'Koyu arka plan modu',
                                value: _darkMode,
                                onChanged: (v) {
                                  setState(() => _darkMode = v);
                                  _savePref('pref_darkMode', v);
                                },
                              ),
                              const _Divider(),
                              _NavTile(
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
                        ),
                      ),

                      // ── Bildirimler
                      _gap(),
                      _SectionLabel(label: 'BİLDİRİMLER'),
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(22, 10, 22, 0),
                          child: _SettingsCard(
                            children: [
                              _ToggleTile(
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
                        ),
                      ),

                      // ── Hesap
                      _gap(),
                      _SectionLabel(label: 'HESAP'),
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(22, 10, 22, 0),
                          child: _SettingsCard(
                            children: [
                              _NavTile(
                                icon: Icons.person_outline_rounded,
                                label: 'Profili Düzenle',
                                onTap: _showEditProfile,
                              ),
                              const _Divider(),
                              _NavTile(
                                icon: Icons.lock_outline_rounded,
                                label: 'Şifre Değiştir',
                                onTap: _showChangePassword,
                              ),
                              const _Divider(),
                              _NavTile(
                                icon: Icons.privacy_tip_outlined,
                                label: 'Gizlilik Politikası',
                                onTap: _showPrivacy,
                              ),
                              const _Divider(),
                              _NavTile(
                                icon: Icons.help_outline_rounded,
                                label: 'Yardım & Destek',
                                onTap: _showHelp,
                              ),
                              const _Divider(),
                              _NavTile(
                                icon: Icons.info_outline_rounded,
                                label: 'Hakkında',
                                onTap: _showAbout,
                              ),
                            ],
                          ),
                        ),
                      ),

                      // ── Oturum
                      _gap(),
                      _SectionLabel(label: 'OTURUM'),
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(22, 10, 22, 0),
                          child: _SettingsCard(
                            children: [
                              _NavTile(
                                icon: Icons.logout_rounded,
                                label: 'Çıkış Yap',
                                iconColor: AppColors.error,
                                textColor: AppColors.error,
                                onTap: _logout,
                              ),
                              const _Divider(),
                              _NavTile(
                                icon: Icons.delete_forever_outlined,
                                label: 'Hesabı Kalıcı Olarak Sil',
                                iconColor: AppColors.error,
                                textColor: AppColors.error,
                                onTap: _deleteAccount,
                              ),
                            ],
                          ),
                        ),
                      ),

                      // ── Footer
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(22, 32, 22, 48),
                          child: Column(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [
                                      AppColors.gold,
                                      AppColors.goldLight,
                                    ],
                                  ),
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppColors.gold.withOpacity(.2),
                                      blurRadius: 12,
                                    ),
                                  ],
                                ),
                                child: const Icon(
                                  Icons.checkroom_rounded,
                                  color: Colors.black,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(height: 10),
                              const Text(
                                'Smart Wardrobe AI',
                                style: TextStyle(
                                  fontFamily: 'Cormorant',
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textSub,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                'v1.0.0',
                                style: AppTextStyles.caption.copyWith(
                                  fontSize: 11,
                                  color: AppColors.muted,
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
    );
  }

  Widget _gap() => const SliverToBoxAdapter(child: SizedBox(height: 8));
}

// ─── PROFİL BAŞLIĞI ───────────────────────────────────────────────────────────

class _ProfileHeader extends StatelessWidget {
  final UserProfile? profile;
  final VoidCallback onEditTap;
  const _ProfileHeader({required this.profile, required this.onEditTap});

  @override
  Widget build(BuildContext context) {
    final initial = (profile?.name.isNotEmpty == true)
        ? profile!.name[0].toUpperCase()
        : 'S';

    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 20, 22, 20),
      child: Row(
        children: [
          // Avatar
          GestureDetector(
            onTap: onEditTap,
            child: Stack(
              children: [
                Hero(
                  tag: 'profile_avatar',
                  child: Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppColors.gold, AppColors.goldLight],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.gold.withOpacity(.35),
                          blurRadius: 18,
                          offset: const Offset(0, 5),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        initial,
                        style: const TextStyle(
                          fontFamily: 'Cormorant',
                          fontSize: 32,
                          fontWeight: FontWeight.w700,
                          color: Colors.black,
                        ),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.border, width: 1.5),
                    ),
                    child: const Icon(
                      Icons.edit_outlined,
                      color: AppColors.textSub,
                      size: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          // İsim + e-posta
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  // DB'den gelen kullaniciAdi (yoksa —)
                  profile?.name.isNotEmpty == true ? profile!.name : '—',
                  style: const TextStyle(
                    fontFamily: 'Cormorant',
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: AppColors.text,
                    letterSpacing: -.3,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  profile?.email ?? '',
                  style: AppTextStyles.caption.copyWith(fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── İSTATİSTİK SATIRI ────────────────────────────────────────────────────────

class _StatsRow extends StatelessWidget {
  final UserProfile profile;
  const _StatsRow({required this.profile});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          _StatItem(value: '${profile.totalItems}', label: 'Kıyafet'),
          _VertDivider(),
          _StatItem(value: '${profile.totalOutfits}', label: 'Kombin'),
          _VertDivider(),
          _StatItem(value: '${profile.totalFavorites}', label: 'Favori'),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final String value, label;
  const _StatItem({required this.value, required this.label});

  @override
  Widget build(BuildContext context) => Expanded(
    child: Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            fontFamily: 'Cormorant',
            fontSize: 26,
            fontWeight: FontWeight.w700,
            color: AppColors.gold,
          ),
        ),
        const SizedBox(height: 2),
        Text(label, style: AppTextStyles.caption.copyWith(fontSize: 11)),
      ],
    ),
  );
}

class _VertDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) =>
      Container(width: 1, height: 30, color: AppColors.border);
}

// ─── SETTINGS BİLEŞENLERİ ────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});

  @override
  Widget build(BuildContext context) => SliverToBoxAdapter(
    child: Padding(
      padding: const EdgeInsets.fromLTRB(22, 20, 22, 0),
      child: Text(label, style: AppTextStyles.label.copyWith(letterSpacing: 2)),
    ),
  );
}

class _SettingsCard extends StatelessWidget {
  final List<Widget> children;
  const _SettingsCard({required this.children});

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: AppColors.border),
    ),
    child: Column(children: children),
  );
}

class _ToggleTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _ToggleTile({
    required this.icon,
    required this.label,
    this.subtitle,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 10, 12, 10),
    child: Row(
      children: [
        Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            color: AppColors.bg,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.border),
          ),
          child: Icon(icon, color: AppColors.textSub, size: 17),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  color: AppColors.text,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (subtitle != null)
                Text(
                  subtitle!,
                  style: AppTextStyles.caption.copyWith(fontSize: 11),
                ),
            ],
          ),
        ),
        Switch(
          value: value,
          onChanged: onChanged,
          activeColor: AppColors.gold,
          activeTrackColor: AppColors.goldDim,
          inactiveTrackColor: AppColors.border,
          inactiveThumbColor: AppColors.muted,
          trackOutlineColor: WidgetStateProperty.all(Colors.transparent),
        ),
      ],
    ),
  );
}

class _NavTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color iconColor;
  final Color textColor;
  final Widget? trailing;

  const _NavTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.iconColor = AppColors.textSub,
    this.textColor = AppColors.text,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    behavior: HitTestBehavior.opaque,
    child: Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: AppColors.bg,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.border),
            ),
            child: Icon(icon, color: iconColor, size: 17),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                color: textColor,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          trailing ??
              Icon(
                Icons.chevron_right_rounded,
                color: AppColors.muted,
                size: 20,
              ),
        ],
      ),
    ),
  );
}

class _Divider extends StatelessWidget {
  const _Divider();

  @override
  Widget build(BuildContext context) => const Divider(
    height: 1,
    thickness: 1,
    color: AppColors.border,
    indent: 62,
  );
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
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Icon(icon, color: AppColors.textSub, size: 16),
    ),
  );
}

// ─── ONAY DİYALOĞU ───────────────────────────────────────────────────────────

class _ConfirmDialog extends StatelessWidget {
  final String title, body, confirmLabel;
  final bool isDanger;
  const _ConfirmDialog({
    required this.title,
    required this.body,
    required this.confirmLabel,
    this.isDanger = false,
  });

  @override
  Widget build(BuildContext context) => Dialog(
    backgroundColor: AppColors.card,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: (isDanger ? AppColors.error : AppColors.gold).withOpacity(
                .12,
              ),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isDanger
                  ? Icons.warning_amber_rounded
                  : Icons.check_circle_outline_rounded,
              color: isDanger ? AppColors.error : AppColors.gold,
              size: 24,
            ),
          ),
          const SizedBox(height: 14),
          Text(
            title,
            style: const TextStyle(
              fontFamily: 'Cormorant',
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppColors.text,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            body,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.textSub,
              fontSize: 13,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => Navigator.pop(context, false),
                  child: Container(
                    height: 46,
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: const Center(
                      child: Text(
                        'İptal',
                        style: TextStyle(
                          color: AppColors.textSub,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: GestureDetector(
                  onTap: () => Navigator.pop(context, true),
                  child: Container(
                    height: 46,
                    decoration: BoxDecoration(
                      color: isDanger ? AppColors.error : AppColors.gold,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        confirmLabel,
                        style: TextStyle(
                          color: isDanger ? Colors.white : Colors.black,
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
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

// ─── ŞİFRE DEĞİŞTİR SHEET ────────────────────────────────────────────────────
// PUT /api/auth/change-password  { mevcutSifre, yeniSifre }

class _ChangePasswordSheet extends StatefulWidget {
  const _ChangePasswordSheet();

  @override
  State<_ChangePasswordSheet> createState() => _ChangePasswordSheetState();
}

class _ChangePasswordSheetState extends State<_ChangePasswordSheet> {
  final _currentCtrl = TextEditingController();
  final _newCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _loading = false;
  String? _error;
  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  @override
  void dispose() {
    _currentCtrl.dispose();
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = null);

    final current = _currentCtrl.text.trim();
    final newPass = _newCtrl.text.trim();
    final confirm = _confirmCtrl.text.trim();

    if (current.isEmpty || newPass.isEmpty || confirm.isEmpty) {
      setState(() => _error = 'Lütfen tüm alanları doldurun.');
      return;
    }
    if (newPass != confirm) {
      setState(() => _error = 'Yeni şifreler eşleşmiyor.');
      return;
    }
    if (newPass.length < 6) {
      setState(() => _error = 'Yeni şifre en az 6 karakter olmalı.');
      return;
    }

    setState(() => _loading = true);

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';

      // PUT /api/auth/change-password  { mevcutSifre, yeniSifre }
      final res = await http
          .put(
            Uri.parse('${ApiConstants.baseUrl}/auth/change-password'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode({'mevcutSifre': current, 'yeniSifre': newPass}),
          )
          .timeout(const Duration(seconds: 10));

      if (!mounted) return;

      if (res.statusCode == 200) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Şifren başarıyla güncellendi ✓'),
            backgroundColor: AppColors.success,
          ),
        );
      } else {
        final data = jsonDecode(res.body);
        setState(() {
          _error = data['mesaj'] ?? 'Şifre değiştirilemedi.';
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Bağlantı hatası. Tekrar dene.';
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(
        22,
        24,
        22,
        MediaQuery.of(context).viewInsets.bottom + 32,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SheetHandle(),
          const SizedBox(height: 20),
          const Text(
            'Şifre Değiştir',
            style: TextStyle(
              fontFamily: 'Cormorant',
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppColors.text,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Güvenliğin için mevcut şifreni doğrula',
            style: TextStyle(color: AppColors.muted, fontSize: 12),
          ),
          const SizedBox(height: 20),
          _PasswordField(
            ctrl: _currentCtrl,
            label: 'Mevcut Şifre',
            obscure: _obscureCurrent,
            onToggle: () => setState(() => _obscureCurrent = !_obscureCurrent),
          ),
          const SizedBox(height: 12),
          _PasswordField(
            ctrl: _newCtrl,
            label: 'Yeni Şifre',
            obscure: _obscureNew,
            onToggle: () => setState(() => _obscureNew = !_obscureNew),
          ),
          const SizedBox(height: 12),
          _PasswordField(
            ctrl: _confirmCtrl,
            label: 'Yeni Şifre (Tekrar)',
            obscure: _obscureConfirm,
            onToggle: () => setState(() => _obscureConfirm = !_obscureConfirm),
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(
                  Icons.error_outline,
                  color: AppColors.error,
                  size: 14,
                ),
                const SizedBox(width: 6),
                Text(
                  _error!,
                  style: const TextStyle(color: AppColors.error, fontSize: 12),
                ),
              ],
            ),
          ],
          const SizedBox(height: 20),
          _GoldButton(
            label: 'Şifreyi Güncelle',
            loading: _loading,
            onTap: _submit,
          ),
        ],
      ),
    );
  }
}

// ─── PROFİL DÜZENLE SHEET ────────────────────────────────────────────────────
// PUT /api/auth/update  { kullaniciAdi }

class _EditProfileSheet extends StatefulWidget {
  final UserProfile? profile;
  const _EditProfileSheet({required this.profile});

  @override
  State<_EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends State<_EditProfileSheet> {
  late final TextEditingController _nameCtrl;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.profile?.name ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'Kullanıcı adı boş olamaz.');
      return;
    }
    if (name.length < 3) {
      setState(() => _error = 'En az 3 karakter olmalı.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';

      // PUT /api/auth/update  { kullaniciAdi }
      final res = await http
          .put(
            Uri.parse('${ApiConstants.baseUrl}/auth/update'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode({'kullaniciAdi': name}),
          )
          .timeout(const Duration(seconds: 10));

      if (!mounted) return;

      if (res.statusCode == 200) {
        // SharedPreferences'teki userName'i de güncelle (home ekranı için)
        await prefs.setString('userName', name);
        Navigator.pop(context, true); // true = güncellendi, yenile
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profil güncellendi ✓'),
            backgroundColor: AppColors.success,
          ),
        );
      } else {
        final data = jsonDecode(res.body);
        setState(() {
          _error = data['mesaj'] ?? 'Güncelleme başarısız.';
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Bağlantı hatası. Tekrar dene.';
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(
        22,
        24,
        22,
        MediaQuery.of(context).viewInsets.bottom + 32,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SheetHandle(),
          const SizedBox(height: 20),
          const Text(
            'Profili Düzenle',
            style: TextStyle(
              fontFamily: 'Cormorant',
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppColors.text,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Kullanıcı adını değiştirebilirsin',
            style: TextStyle(color: AppColors.muted, fontSize: 12),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _nameCtrl,
            style: const TextStyle(color: AppColors.text, fontSize: 14),
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(
              labelText: 'Kullanıcı Adı',
              labelStyle: const TextStyle(color: AppColors.muted, fontSize: 13),
              prefixIcon: const Icon(
                Icons.person_outline_rounded,
                color: AppColors.muted,
                size: 18,
              ),
              filled: true,
              fillColor: AppColors.bg,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 14,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.gold),
              ),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(
                  Icons.error_outline,
                  color: AppColors.error,
                  size: 14,
                ),
                const SizedBox(width: 6),
                Text(
                  _error!,
                  style: const TextStyle(color: AppColors.error, fontSize: 12),
                ),
              ],
            ),
          ],
          const SizedBox(height: 20),
          _GoldButton(label: 'Kaydet', loading: _loading, onTap: _save),
        ],
      ),
    );
  }
}

// ─── DİL SEÇİCİ SHEET ─────────────────────────────────────────────────────────

class _LanguageSheet extends StatelessWidget {
  final String selected;
  final List<String> languages;
  final ValueChanged<String> onSelect;
  const _LanguageSheet({
    required this.selected,
    required this.languages,
    required this.onSelect,
  });

  static const _flags = {
    'Türkçe': '🇹🇷',
    'English': '🇬🇧',
    'Deutsch': '🇩🇪',
    'Français': '🇫🇷',
  };

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(22, 24, 22, 40),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SheetHandle(),
          const SizedBox(height: 20),
          const Text(
            'Dil Seç',
            style: TextStyle(
              fontFamily: 'Cormorant',
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppColors.text,
            ),
          ),
          const SizedBox(height: 16),
          ...languages.map((lang) {
            final isSelected = lang == selected;
            return GestureDetector(
              onTap: () {
                HapticFeedback.selectionClick();
                onSelect(lang);
                Navigator.pop(context);
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppColors.gold.withOpacity(.10)
                      : AppColors.bg,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isSelected ? AppColors.gold : AppColors.border,
                    width: isSelected ? 1.5 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    Text(
                      _flags[lang] ?? '🌐',
                      style: const TextStyle(fontSize: 20),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Text(
                        lang,
                        style: TextStyle(
                          color: isSelected ? AppColors.gold : AppColors.text,
                          fontSize: 15,
                          fontWeight: isSelected
                              ? FontWeight.w600
                              : FontWeight.w400,
                        ),
                      ),
                    ),
                    if (isSelected)
                      const Icon(
                        Icons.check_rounded,
                        color: AppColors.gold,
                        size: 18,
                      ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}

// ─── PAYLAŞILAN KÜÇÜK BİLEŞENLER ─────────────────────────────────────────────

// Bottom sheet tutamacı
class _SheetHandle extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Center(
    child: Container(
      width: 36,
      height: 4,
      decoration: BoxDecoration(
        color: AppColors.border,
        borderRadius: BorderRadius.circular(2),
      ),
    ),
  );
}

// Altın gradient buton
class _GoldButton extends StatelessWidget {
  final String label;
  final bool loading;
  final VoidCallback onTap;
  const _GoldButton({
    required this.label,
    required this.loading,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: loading ? null : onTap,
    child: Container(
      height: 52,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.gold, AppColors.goldLight],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: AppColors.gold.withOpacity(.3),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Center(
        child: loading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  color: Colors.black,
                  strokeWidth: 2,
                ),
              )
            : Text(
                label,
                style: const TextStyle(
                  color: Colors.black,
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                ),
              ),
      ),
    ),
  );
}

// Şifre text field
class _PasswordField extends StatelessWidget {
  final TextEditingController ctrl;
  final String label;
  final bool obscure;
  final VoidCallback onToggle;
  const _PasswordField({
    required this.ctrl,
    required this.label,
    required this.obscure,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) => TextField(
    controller: ctrl,
    obscureText: obscure,
    style: const TextStyle(color: AppColors.text, fontSize: 14),
    decoration: InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: AppColors.muted, fontSize: 13),
      filled: true,
      fillColor: AppColors.bg,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.gold),
      ),
      suffixIcon: GestureDetector(
        onTap: onToggle,
        child: Icon(
          obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
          color: AppColors.muted,
          size: 18,
        ),
      ),
    ),
  );
}
