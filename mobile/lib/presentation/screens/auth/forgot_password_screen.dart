import 'dart:convert';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/auth/auth_widgets.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailCtrl = TextEditingController();
  bool _loading = false;
  bool _sent = false;

  Future<void> _send() async {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty) {
      showAuthSnack(context, 'forgot_password.enter_your_email_address'.tr());
      return;
    }

    setState(() => _loading = true);

    try {
      final res = await http.post(
        Uri.parse('${ApiConstants.baseUrl}/auth/forgot-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email}),
      );
      if (!mounted) return;

      if (res.statusCode == 200) {
        setState(() => _sent = true);
      } else {
        final data = jsonDecode(res.body);
        showAuthSnack(context, data['mesaj'] ?? 'İşlem başarısız.');
      }
    } catch (_) {
      if (mounted) showAuthSnack(context, 'Sunucuya bağlanılamadı.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AuthColors.bg,
      body: AuthBackground(
        child: SafeArea(
          child: Padding(
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
                const SizedBox(height: 48),

                // AnimatedSwitcher: form - başarı
                Expanded(
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 500),
                    transitionBuilder: (child, anim) => FadeTransition(
                      opacity: anim,
                      child: SlideTransition(
                        position:
                            Tween<Offset>(
                              begin: const Offset(0, .06),
                              end: Offset.zero,
                            ).animate(
                              CurvedAnimation(
                                parent: anim,
                                curve: Curves.easeOut,
                              ),
                            ),
                        child: child,
                      ),
                    ),
                    child: _sent
                        ? _SuccessView(
                            key: const ValueKey('success'),
                            email: _emailCtrl.text,
                            onResend: () => setState(() => _sent = false),
                          )
                        : _FormView(
                            key: const ValueKey('form'),
                            emailCtrl: _emailCtrl,
                            loading: _loading,
                            onSend: _send,
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

// Form

class _FormView extends StatelessWidget {
  final TextEditingController emailCtrl;
  final bool loading;
  final VoidCallback onSend;

  const _FormView({
    super.key,
    required this.emailCtrl,
    required this.loading,
    required this.onSend,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'forgot_password.reset_password'.tr(),
          style: TextStyle(
            fontFamily: 'Cormorant',
            fontSize: 44,
            fontWeight: FontWeight.w700,
            height: 1.05,
            color: AuthColors.text,
            letterSpacing: -1,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          'forgot_password.reset_password_subtitle'.tr(),
          style: TextStyle(color: AuthColors.muted, fontSize: 14, height: 1.5),
        ),
        const SizedBox(height: 36),
        AuthTextField(
          controller: emailCtrl,
          hint: 'forgot_password.email'.tr(),
          icon: Icons.mail_outline_rounded,
          keyboardType: TextInputType.emailAddress,
        ),
        const SizedBox(height: 24),
        AuthPrimaryButton(
          label: 'forgot_password.send_reset_link'.tr(),
          onTap: onSend,
          loading: loading,
        ),
      ],
    );
  }
}

// Başarı

class _SuccessView extends StatelessWidget {
  final String email;
  final VoidCallback onResend;

  const _SuccessView({super.key, required this.email, required this.onResend});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: 1),
          duration: const Duration(milliseconds: 700),
          curve: Curves.elasticOut,
          builder: (_, v, child) => Transform.scale(scale: v, child: child),
          child: Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AuthColors.gold, AuthColors.goldLight],
              ),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: AuthColors.gold.withValues(alpha: .4),
                  blurRadius: 24,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: const Icon(
              Icons.mark_email_read_outlined,
              color: Colors.black,
              size: 36,
            ),
          ),
        ),
        const SizedBox(height: 28),
        Text(
          'forgot_password.email_sent'.tr(),
          style: TextStyle(
            fontFamily: 'Cormorant',
            fontSize: 44,
            fontWeight: FontWeight.w700,
            height: 1.05,
            color: AuthColors.text,
            letterSpacing: -1,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          '$email' + ' ' + 'forgot_password.reset_link_sent_to_email'.tr(),
          style: const TextStyle(
            color: AuthColors.muted,
            fontSize: 14,
            height: 1.55,
          ),
        ),
        const SizedBox(height: 32),
        GestureDetector(
          onTap: onResend,
          child: RichText(
            text: TextSpan(
              text: 'forgot_password.email_not_received'.tr() + ' ',
              style: TextStyle(color: AuthColors.muted, fontSize: 14),
              children: [
                TextSpan(
                  text: 'forgot_password.resend'.tr(),
                  style: TextStyle(
                    color: AuthColors.gold,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
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
        border: Border.all(color: AuthColors.border),
      ),
      child: const Icon(
        Icons.arrow_back_ios_new_rounded,
        color: AuthColors.text,
        size: 16,
      ),
    ),
  );
}
