import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/presentation/screens/auth/sign_up_screen.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/home_screen.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/auth/auth_widgets.dart';

import 'forgot_password_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _emailCtrl    = TextEditingController();
  final _passwordCtrl = TextEditingController();

  bool _loading = false;

  late final AnimationController _floatCtrl;
  late final Animation<double>   _floatAnim;

  @override
  void initState() {
    super.initState();
    _floatCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 2500))
      ..repeat(reverse: true);
    _floatAnim = Tween<double>(begin: -6, end: 6).animate(
        CurvedAnimation(parent: _floatCtrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _floatCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final email    = _emailCtrl.text.trim();
    final password = _passwordCtrl.text.trim();

    if (email.isEmpty || password.isEmpty) {
      showAuthSnack(context, 'Lütfen tüm alanları doldurun.');
      return;
    }

    setState(() => _loading = true);

    try {
      final res = await http.post(
        Uri.parse('${ApiConstants.baseUrl}/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'sifre': password}),
      );
      final data = jsonDecode(res.body);

      if (!mounted) return;

      if (res.statusCode == 200) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', data['token'] ?? '');
        await prefs.setString('userName', data['kullaniciAdi'] ?? data['name'] ?? '');
        if (!mounted) return;
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const HomeScreen()),
          (_) => false,
        );
      } else {
        showAuthSnack(context, data['mesaj'] ?? 'Giriş başarısız.');
      }
    } catch (_) {
      if (mounted) showAuthSnack(context, 'Sunucuya bağlanılamadı.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
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
                const AuthLogo(),
                const SizedBox(height: 48),

                // — animasyonlu ikon
                Center(
                  child: AnimatedBuilder(
                    animation: _floatAnim,
                    builder: (_, child) => Transform.translate(
                        offset: Offset(0, _floatAnim.value), child: child),
                    child: Container(
                      width: 88, height: 88,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: [
                          AuthColors.gold.withOpacity(.2),
                          AuthColors.goldLight.withOpacity(.06),
                        ]),
                        shape: BoxShape.circle,
                        border: Border.all(
                            color: AuthColors.gold.withOpacity(.25), width: 1.5),
                      ),
                      child: const Icon(Icons.checkroom_rounded,
                          color: AuthColors.gold, size: 42),
                    ),
                  ),
                ),

                const SizedBox(height: 36),

                Text('Tekrar\nHoş Geldin.',
                    style: TextStyle(
                      fontFamily: 'Cormorant',
                      fontSize: 44,
                      fontWeight: FontWeight.w700,
                      height: 1.05,
                      color: AuthColors.text,
                      letterSpacing: -1,
                    )),

                const SizedBox(height: 32),

                // — alanlar
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

                // — şifremi unuttum
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () => Navigator.push(context,
                        MaterialPageRoute(
                            builder: (_) => const ForgotPasswordScreen())),
                    child: const Text('Şifremi unuttum?',
                        style: TextStyle(
                            color: AuthColors.gold,
                            fontSize: 13,
                            fontWeight: FontWeight.w500)),
                  ),
                ),

                const SizedBox(height: 8),

                AuthPrimaryButton(
                    label: 'Giriş Yap',
                    onTap: _login,
                    loading: _loading),

                const SizedBox(height: 24),
                const AuthDivider(),
                const SizedBox(height: 24),

                // — sosyal
                AuthSocialButton(
                  icon: const GoogleIcon(),
                  label: 'Google ile giriş yap',
                  onTap: () {},
                ),
                const SizedBox(height: 12),
                AuthSocialButton(
                  icon: const Icon(Icons.apple_rounded,
                      color: AuthColors.text, size: 22),
                  label: 'Apple ile giriş yap',
                  onTap: () {},
                ),

                const SizedBox(height: 32),

                // — kayıt ol
                Center(
                  child: GestureDetector(
                    onTap: () => Navigator.push(context,
                        MaterialPageRoute(
                            builder: (_) => const SignUpScreen())),
                    child: RichText(
                      text: const TextSpan(
                        text: 'Hesabın yok mu? ',
                        style: TextStyle(
                            color: AuthColors.muted, fontSize: 14),
                        children: [
                          TextSpan(
                            text: 'Hemen kaydol',
                            style: TextStyle(
                                color: AuthColors.gold,
                                fontWeight: FontWeight.w600),
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