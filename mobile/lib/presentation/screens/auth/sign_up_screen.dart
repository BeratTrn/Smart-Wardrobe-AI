import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/home_screen.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/auth/auth_widgets.dart';

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();

  bool _loading = false;
  bool _termsAccepted = false;

  double get _passwordStrength {
    final p = _passwordCtrl.text;
    if (p.length < 6) return .25;
    if (p.length < 8) return .50;
    if (!p.contains(RegExp(r'[A-Z]')) && !p.contains(RegExp(r'[0-9]')))
      return .60;
    if (p.length >= 12) return 1.0;
    return .80;
  }

  String get _strengthLabel {
    final s = _passwordStrength;
    if (s <= .25) return 'Zayıf';
    if (s <= .50) return 'Orta';
    if (s <= .80) return 'İyi';
    return 'Güçlü';
  }

  Color get _strengthColor {
    final s = _passwordStrength;
    if (s <= .25) return AuthColors.error;
    if (s <= .50) return Colors.orange;
    if (s <= .80) return Colors.yellow;
    return AuthColors.success;
  }

  Future<void> _register() async {
    if (_nameCtrl.text.trim().isEmpty ||
        _emailCtrl.text.trim().isEmpty ||
        _passwordCtrl.text.isEmpty) {
      showAuthSnack(context, 'Lütfen tüm alanları doldurun.');
      return;
    }
    if (_passwordCtrl.text != _confirmCtrl.text) {
      showAuthSnack(context, 'Şifreler eşleşmiyor.');
      return;
    }
    if (!_termsAccepted) {
      showAuthSnack(context, 'Koşulları kabul etmelisiniz.');
      return;
    }

    setState(() => _loading = true);

    try {
      final res = await http.post(
        Uri.parse('${ApiConstants.baseUrl}/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'kullaniciAdi': _nameCtrl.text.trim(),
          'email': _emailCtrl.text.trim(),
          'sifre': _passwordCtrl.text,
        }),
      );
      final data = jsonDecode(res.body);
      if (!mounted) return;

      if (res.statusCode == 201) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', data['token'] ?? '');
        await prefs.setString('userName', data['kullaniciAdi'] ?? '');
        if (!mounted) return;
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const HomeScreen()),
          (_) => false,
        );
      } else {
        showAuthSnack(context, data['mesaj'] ?? 'Kayıt başarısız.');
      }
    } catch (_) {
      if (mounted) showAuthSnack(context, 'Sunucuya bağlanılamadı.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AuthColors.bg,
      body: AuthBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 26),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 20),
                Row(
                  children: [
                    const AuthLogo(),
                    const Spacer(),
                    _BackButton(onTap: () => Navigator.pop(context)),
                  ],
                ),
                const SizedBox(height: 36),

                Text(
                  'Hesap\nOluştur.',
                  style: TextStyle(
                    fontFamily: 'Cormorant',
                    fontSize: 44,
                    fontWeight: FontWeight.w700,
                    height: 1.05,
                    color: AuthColors.text,
                    letterSpacing: -1,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Dolabını dijitale taşımaya başla.',
                  style: TextStyle(color: AuthColors.muted, fontSize: 14),
                ),

                const SizedBox(height: 32),

                AuthTextField(
                  controller: _nameCtrl,
                  hint: 'Ad Soyad',
                  icon: Icons.person_outline_rounded,
                ),
                const SizedBox(height: 14),
                AuthTextField(
                  controller: _emailCtrl,
                  hint: 'E-posta',
                  icon: Icons.mail_outline_rounded,
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 14),
                AuthTextField(
                  controller: _passwordCtrl,
                  hint: 'Şifre',
                  icon: Icons.lock_outline_rounded,
                  isPassword: true,
                ),

                // — şifre güç göstergesi
                if (_passwordCtrl.text.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  _PasswordStrengthBar(
                    strength: _passwordStrength,
                    label: _strengthLabel,
                    color: _strengthColor,
                  ),
                ],

                const SizedBox(height: 14),
                AuthTextField(
                  controller: _confirmCtrl,
                  hint: 'Şifre Tekrar',
                  icon: Icons.lock_outline_rounded,
                  isPassword: true,
                ),

                const SizedBox(height: 20),

                // — terms
                GestureDetector(
                  onTap: () => setState(() => _termsAccepted = !_termsAccepted),
                  child: Row(
                    children: [
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        width: 22,
                        height: 22,
                        decoration: BoxDecoration(
                          color: _termsAccepted
                              ? AuthColors.gold
                              : Colors.transparent,
                          border: Border.all(
                            color: _termsAccepted
                                ? AuthColors.gold
                                : AuthColors.border,
                            width: 1.5,
                          ),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: _termsAccepted
                            ? const Icon(
                                Icons.check_rounded,
                                color: Colors.black,
                                size: 14,
                              )
                            : null,
                      ),
                      const SizedBox(width: 10),
                      const Text(
                        'Kullanım koşullarını kabul ediyorum',
                        style: TextStyle(color: AuthColors.muted, fontSize: 13),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 28),
                AuthPrimaryButton(
                  label: 'Kayıt Ol',
                  onTap: _register,
                  loading: _loading,
                ),

                const SizedBox(height: 24),
                const AuthDivider(),
                const SizedBox(height: 24),

                AuthSocialButton(
                  icon: const GoogleIcon(),
                  label: 'Google ile kayıt ol',
                  onTap: () {},
                ),
                const SizedBox(height: 12),
                AuthSocialButton(
                  icon: const Icon(
                    Icons.apple_rounded,
                    color: AuthColors.text,
                    size: 22,
                  ),
                  label: 'Apple ile kayıt ol',
                  onTap: () {},
                ),

                const SizedBox(height: 32),

                Center(
                  child: GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: RichText(
                      text: const TextSpan(
                        text: 'Zaten hesabın var mı? ',
                        style: TextStyle(color: AuthColors.muted, fontSize: 14),
                        children: [
                          TextSpan(
                            text: 'Giriş yap',
                            style: TextStyle(
                              color: AuthColors.gold,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// Şifre güç çubuğu
class _PasswordStrengthBar extends StatelessWidget {
  final double strength;
  final String label;
  final Color color;

  const _PasswordStrengthBar({
    required this.strength,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: strength,
            backgroundColor: AuthColors.border,
            valueColor: AlwaysStoppedAnimation(color),
            minHeight: 4,
          ),
        ),
      ),
      const SizedBox(width: 10),
      Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    ],
  );
}

// Geri butonu
class _BackButton extends StatelessWidget {
  final VoidCallback onTap;
  const _BackButton({required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: AuthColors.card,
        shape: BoxShape.circle,
        border: Border.all(color: AuthColors.border, width: 1),
      ),
      child: const Icon(
        Icons.arrow_back_ios_new_rounded,
        color: AuthColors.text,
        size: 16,
      ),
    ),
  );
}
