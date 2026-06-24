import 'dart:convert';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/core/controllers/app_settings_controller.dart';
import 'package:smart_wardrobe_ai/presentation/screens/auth/sign_up_screen.dart';
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
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  bool _loading = false;
  bool _googleLoading = false;

  final _googleSignIn = GoogleSignIn(
    clientId: ApiConstants.googleClientId,
    serverClientId: ApiConstants.googleClientId,
    scopes: ['email'],
  );

  late final AnimationController _floatCtrl;
  late final Animation<double> _floatAnim;

  @override
  void initState() {
    super.initState();
    _floatCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2500),
    )..repeat(reverse: true);
    _floatAnim = Tween<double>(
      begin: -6,
      end: 6,
    ).animate(CurvedAnimation(parent: _floatCtrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _floatCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final email = _emailCtrl.text.trim();
    final password = _passwordCtrl.text.trim();

    if (email.isEmpty || password.isEmpty) {
      showAuthSnack(context, 'login.please_fill_in_all_fields'.tr());
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

        final k = data['kullanici'] as Map<String, dynamic>?;
        final userName = k != null ? (k['kullaniciAdi'] as String? ?? '') : '';
        await prefs.setString('userName', userName);

        // Çapraz cihaz senkronizasyonu — backend'in tema ve dil tercihini uygula
        if (k != null && mounted) {
          await _applyBackendSettings(k);
        }

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

  /// Backend kullanici nesnesindeki tema ve dil tercihlerini yerel olarak uygular.
  Future<void> _applyBackendSettings(Map<String, dynamic> kullanici) async {
    final theme = kullanici['theme'] as String?;
    final lang = kullanici['language'] as String?;

    if (theme != null) {
      await AppSettingsController.instance.applyBackendSettings(
        isDark: theme == 'dark',
      );
    }
    if (lang != null && mounted) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('pref_language', lang);
      await context.setLocale(_langCodeToLocale(lang));
    }
  }

  static Locale _langCodeToLocale(String code) {
    switch (code) {
      case 'en':
        return const Locale('en');
      case 'de':
        return const Locale('de');
      case 'fr':
        return const Locale('fr');
      default:
        return const Locale('tr');
    }
  }

  Future<void> _signInWithGoogle() async {
    setState(() => _googleLoading = true);
    try {
      // Önce çıkış yap ki her seferinde hesap seçme ekranı gelsin
      await _googleSignIn.signOut();

      final googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        setState(() => _googleLoading = false);
        return;
      }
      final googleAuth = await googleUser.authentication;
      final idToken = googleAuth.idToken;

      if (idToken == null) {
        if (mounted) showAuthSnack(context, 'Google token alınamadı.');
        setState(() => _googleLoading = false);
        return;
      }

      final res = await http.post(
        Uri.parse('${ApiConstants.baseUrl}/auth/google'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'idToken': idToken}),
      );
      final data = jsonDecode(res.body);

      if (!mounted) return;

      if (res.statusCode == 200) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', data['token'] ?? '');
        final k = data['kullanici'] as Map<String, dynamic>?;
        await prefs.setString(
          'userName',
          k != null ? (k['kullaniciAdi'] as String? ?? '') : '',
        );

        // Çapraz cihaz senkronizasyonu — backend'in tema ve dil tercihini uygula
        if (k != null && mounted) {
          await _applyBackendSettings(k);
        }

        if (!mounted) return;
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const HomeScreen()),
          (_) => false,
        );
      } else {
        showAuthSnack(
          context,
          data['mesaj'] ?? 'login.google_sign_in_failed'.tr(),
        );
      }
    } catch (_) {
      if (mounted)
        showAuthSnack(
          context,
          'login.google_sign_in_failed_could_not_use'.tr(),
        );
    } finally {
      if (mounted) setState(() => _googleLoading = false);
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

                // animasyonlu ikon
                Center(
                  child: AnimatedBuilder(
                    animation: _floatAnim,
                    builder: (_, child) => Transform.translate(
                      offset: Offset(0, _floatAnim.value),
                      child: child,
                    ),
                    child: Container(
                      width: 88,
                      height: 88,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            AuthColors.gold.withValues(alpha: .2),
                            AuthColors.goldLight.withValues(alpha: .06),
                          ],
                        ),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AuthColors.gold.withValues(alpha: .25),
                          width: 1.5,
                        ),
                      ),
                      child: const Icon(
                        Icons.checkroom_rounded,
                        color: AuthColors.gold,
                        size: 42,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 36),

                Text(
                  'login.welcome_back'.tr(),
                  style: TextStyle(
                    fontFamily: 'Cormorant',
                    fontSize: 44,
                    fontWeight: FontWeight.w700,
                    height: 1.05,
                    color: AuthColors.text,
                    letterSpacing: -1,
                  ),
                ),

                const SizedBox(height: 32),

                // alanlar
                AuthTextField(
                  controller: _emailCtrl,
                  hint: 'login.email'.tr(),
                  icon: Icons.mail_outline_rounded,
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 14),
                AuthTextField(
                  controller: _passwordCtrl,
                  hint: 'login.password'.tr(),
                  icon: Icons.lock_outline_rounded,
                  isPassword: true,
                ),

                // şifremi unuttum
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const ForgotPasswordScreen(),
                      ),
                    ),
                    child: Text(
                      'login.forgot_password'.tr(),
                      style: TextStyle(
                        color: AuthColors.gold,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 8),

                AuthPrimaryButton(
                  label: 'login.sign_in'.tr(),
                  onTap: _login,
                  loading: _loading,
                ),

                const SizedBox(height: 24),
                const AuthDivider(),
                const SizedBox(height: 24),

                // sosyal
                AuthSocialButton(
                  icon: _googleLoading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AuthColors.gold,
                          ),
                        )
                      : GoogleIcon(),
                  label: 'login.sign_in_with_google'.tr(),
                  onTap: _googleLoading ? () {} : _signInWithGoogle,
                ),

                const SizedBox(height: 32),

                // kayıt ol
                Center(
                  child: GestureDetector(
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const SignUpScreen()),
                    ),
                    child: RichText(
                      text: TextSpan(
                        text: 'login.not_have_account'.tr(),
                        style: const TextStyle(
                          color: AuthColors.muted,
                          fontSize: 14,
                        ),
                        children: [
                          TextSpan(
                            text: 'login.sign_up'.tr(),
                            style: const TextStyle(
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
