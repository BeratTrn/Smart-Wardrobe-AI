import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/presentation/screens/auth/login_screen.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_background.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_text_styles.dart';

// MODEL

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

// SCREEN

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen>
    with SingleTickerProviderStateMixin {
  UserProfile? _profile;
  bool _loading = true;

  bool _notifEnabled = true;
  bool _aiAutoTag = true;
  bool _darkMode = true;

  late final AnimationController _fadeCtrl;
  late final Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _fadeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    )..forward();
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);
    _fetch();
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetch() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? '';

    try {
      final res = await http
          .get(
            Uri.parse('${ApiConstants.baseUrl}/kullanici/profil'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(const Duration(seconds: 8));

      if (!mounted) return;

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        setState(() {
          _profile = UserProfile.fromJson(
            data['kullanici'] ?? data['user'] ?? data,
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

  Future<void> _logout() async {
    final confirmed = await _confirm(
      title: 'Çıkış Yap',
      body: 'Hesabından çıkmak istediğine emin misin?',
      confirmLabel: 'Çıkış Yap',
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
    final confirmed = await _confirm(
      title: 'Hesabı Sil',
      body: 'Tüm veriler kalıcı olarak silinecek. Bu işlem geri alınamaz.',
      confirmLabel: 'Evet, Sil',
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

  Future<bool> _confirm({
    required String title,
    required String body,
    required String confirmLabel,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (_) =>
          _ConfirmDialog(title: title, body: body, confirmLabel: confirmLabel),
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
                    slivers: [
                      SliverToBoxAdapter(
                        child: _ProfileHeader(profile: _profile),
                      ),

                      if (_profile != null)
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 22),
                            child: _StatsRow(profile: _profile!),
                          ),
                        ),

                      _SectionLabel(label: 'AYARLAR'),
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(22, 10, 22, 0),
                          child: _SettingsCard(
                            children: [
                              _ToggleTile(
                                icon: Icons.notifications_outlined,
                                label: 'Bildirimler',
                                value: _notifEnabled,
                                onChanged: (v) =>
                                    setState(() => _notifEnabled = v),
                              ),
                              const _SettingsDivider(),
                              _ToggleTile(
                                icon: Icons.auto_awesome_outlined,
                                label: 'AI Otomatik Etiketleme',
                                value: _aiAutoTag,
                                onChanged: (v) =>
                                    setState(() => _aiAutoTag = v),
                              ),
                              const _SettingsDivider(),
                              _ToggleTile(
                                icon: Icons.dark_mode_outlined,
                                label: 'Karanlık Tema',
                                value: _darkMode,
                                onChanged: (v) => setState(() => _darkMode = v),
                              ),
                            ],
                          ),
                        ),
                      ),

                      _SectionLabel(label: 'HESAP'),
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(22, 10, 22, 0),
                          child: _SettingsCard(
                            children: [
                              _NavTile(
                                icon: Icons.person_outline_rounded,
                                label: 'Profili Düzenle',
                                onTap: () {},
                              ),
                              const _SettingsDivider(),
                              _NavTile(
                                icon: Icons.lock_outline_rounded,
                                label: 'Şifre Değiştir',
                                onTap: () {},
                              ),
                              const _SettingsDivider(),
                              _NavTile(
                                icon: Icons.help_outline_rounded,
                                label: 'Yardım & Destek',
                                onTap: () {},
                              ),
                              const _SettingsDivider(),
                              _NavTile(
                                icon: Icons.info_outline_rounded,
                                label: 'Hakkında',
                                onTap: () {},
                              ),
                            ],
                          ),
                        ),
                      ),

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
                              const _SettingsDivider(),
                              _NavTile(
                                icon: Icons.delete_outline_rounded,
                                label: 'Hesabı Sil',
                                iconColor: AppColors.error,
                                textColor: AppColors.error,
                                onTap: _deleteAccount,
                              ),
                            ],
                          ),
                        ),
                      ),

                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(22, 24, 22, 40),
                          child: Center(
                            child: Text(
                              'Smart Wardrobe AI  v1.0.0',
                              style: AppTextStyles.caption.copyWith(
                                fontSize: 11,
                                color: AppColors.muted,
                              ),
                            ),
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
}

// PROFİL BAŞLIĞI

class _ProfileHeader extends StatelessWidget {
  final UserProfile? profile;
  const _ProfileHeader({required this.profile});

  @override
  Widget build(BuildContext context) {
    final initial = (profile?.name.isNotEmpty == true)
        ? profile!.name[0].toUpperCase()
        : 'S';

    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 16, 22, 24),
      child: Column(
        children: [
          Stack(
            children: [
              Container(
                width: 88,
                height: 88,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.gold, AppColors.goldLight],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.gold.withOpacity(.3),
                      blurRadius: 20,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    initial,
                    style: const TextStyle(
                      fontFamily: 'Cormorant',
                      fontSize: 38,
                      fontWeight: FontWeight.w700,
                      color: Colors.black,
                    ),
                  ),
                ),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  width: 27,
                  height: 27,
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.border, width: 1.5),
                  ),
                  child: const Icon(
                    Icons.edit_outlined,
                    color: AppColors.textSub,
                    size: 13,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            profile?.name ?? '—',
            style: const TextStyle(
              fontFamily: 'Cormorant',
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: AppColors.text,
            ),
          ),
          const SizedBox(height: 3),
          Text(profile?.email ?? '', style: AppTextStyles.caption),
        ],
      ),
    );
  }
}

// İSTATİSTİK SATIRI

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
            fontSize: 28,
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
      Container(width: 1, height: 34, color: AppColors.border);
}

// AYARLAR BİLEŞENLERİ

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});

  @override
  Widget build(BuildContext context) => SliverToBoxAdapter(
    child: Padding(
      padding: const EdgeInsets.fromLTRB(22, 24, 22, 0),
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
  final bool value;
  final ValueChanged<bool> onChanged;

  const _ToggleTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    child: Row(
      children: [
        Icon(icon, color: AppColors.textSub, size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(color: AppColors.text, fontSize: 14),
          ),
        ),
        Switch(
          value: value,
          onChanged: onChanged,
          activeColor: AppColors.gold,
          inactiveTrackColor: AppColors.border,
          inactiveThumbColor: AppColors.muted,
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

  const _NavTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.iconColor = AppColors.textSub,
    this.textColor = AppColors.text,
  });

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Icon(icon, color: iconColor, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: TextStyle(color: textColor, fontSize: 14),
            ),
          ),
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

class _SettingsDivider extends StatelessWidget {
  const _SettingsDivider();

  @override
  Widget build(BuildContext context) => const Divider(
    height: 1,
    thickness: 1,
    color: AppColors.border,
    indent: 48,
  );
}

// ONAY DİYALOĞU

class _ConfirmDialog extends StatelessWidget {
  final String title, body, confirmLabel;
  const _ConfirmDialog({
    required this.title,
    required this.body,
    required this.confirmLabel,
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
          Text(
            title,
            style: const TextStyle(
              fontFamily: 'Cormorant',
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppColors.text,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            body,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.textSub,
              fontSize: 14,
              height: 1.4,
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
                        style: TextStyle(color: AppColors.textSub),
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
                      color: AppColors.error,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        confirmLabel,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
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
