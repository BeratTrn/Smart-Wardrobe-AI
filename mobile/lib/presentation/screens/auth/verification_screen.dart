import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/home_screen.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/auth/auth_widgets.dart';

class VerificationScreen extends StatefulWidget {
  final String email;
  const VerificationScreen({super.key, required this.email});

  @override
  State<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends State<VerificationScreen>
    with TickerProviderStateMixin {
  // 6 ayrı OTP input controller + focus node
  final List<TextEditingController> _controllers =
      List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());

  bool _loading = false;
  String? _errorMessage;

  // Geri sayım (yeniden gönder butonu)
  int _resendCountdown = 60;
  Timer? _timer;
  bool _canResend = false;

  Map<String, dynamic> _safeJsonDecode(String body) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic>) return decoded;
    } catch (_) {}
    return {};
  }

  // Animasyon — hata sallama efekti
  late AnimationController _shakeController;
  late Animation<double> _shakeAnimation;

  @override
  void initState() {
    super.initState();
    _startCountdown();

    _shakeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _shakeAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _shakeController, curve: Curves.elasticIn),
    );
  }

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    for (final f in _focusNodes) {
      f.dispose();
    }
    _timer?.cancel();
    _shakeController.dispose();
    super.dispose();
  }

  // ── Geri sayım başlat ──────────────────────────────────────────────────
  void _startCountdown() {
    _resendCountdown = 60;
    _canResend = false;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() {
        if (_resendCountdown > 0) {
          _resendCountdown--;
        } else {
          _canResend = true;
          t.cancel();
        }
      });
    });
  }

  // ── 6 kutunun değerini birleştir ───────────────────────────────────────
  String get _otpValue =>
      _controllers.map((c) => c.text).join();

  // ── OTP bir kutuya girildiğinde ────────────────────────────────────────
  void _onOtpInput(int index, String value) {
    // Hata mesajını temizle
    if (_errorMessage != null) setState(() => _errorMessage = null);

    if (value.isNotEmpty && index < 5) {
      _focusNodes[index + 1].requestFocus();
    }
    // Son kutu dolunca klavyeyi kapat
    if (index == 5 && value.isNotEmpty) {
      _focusNodes[index].unfocus();
    }
    setState(() {});
  }

  // ── Backspace ile geri dön ─────────────────────────────────────────────
  void _onBackspace(int index) {
    if (_controllers[index].text.isEmpty && index > 0) {
      _controllers[index - 1].clear();
      _focusNodes[index - 1].requestFocus();
    }
    setState(() {});
  }

  // ── Doğrulama isteği gönder ────────────────────────────────────────────
  Future<void> _verify() async {
    final otp = _otpValue;
    if (otp.length < 6) {
      setState(() => _errorMessage = 'Lütfen 6 haneli kodu eksiksiz girin.');
      _shakeController.forward(from: 0);
      return;
    }

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final res = await http
          .post(
            Uri.parse('${ApiConstants.baseUrl}/auth/verify-email'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'email': widget.email,
              'otpCode': otp,
            }),
          )
          .timeout(const Duration(seconds: 12));

      if (!mounted) return;
      final data = jsonDecode(res.body);

      if (res.statusCode == 200) {
        // ✅ Doğrulama başarılı — Token'ı kaydet, HomeScreen'e git
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', data['token'] ?? '');

        final k = data['kullanici'];
        if (k != null) {
          await prefs.setString('userName', k['kullaniciAdi'] ?? '');
        }

        if (!mounted) return;
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const HomeScreen()),
          (_) => false,
        );
      } else {
        // ❌ Hatalı kod — ekranda kal, hata göster
        setState(() {
          _errorMessage = data['mesaj'] ?? 'Hatalı doğrulama kodu.';
        });
        _shakeController.forward(from: 0);
        // Tüm kutuları temizle
        for (final c in _controllers) {
          c.clear();
        }
        _focusNodes[0].requestFocus();
      }
    } on TimeoutException {
      if (mounted) {
        setState(() => _errorMessage = 'Sunucu zaman aşımına uğradı. Tekrar deneyin.');
        _shakeController.forward(from: 0);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _errorMessage = 'Sunucuya bağlanılamadı.');
        _shakeController.forward(from: 0);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ── Kodu yeniden gönder ────────────────────────────────────────────────
  Future<void> _resendCode() async {
    if (!_canResend) return;

    setState(() => _loading = true);

    try {
      final res = await http
          .post(
            Uri.parse('${ApiConstants.baseUrl}/auth/resend-verification'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': widget.email}),
          )
          .timeout(const Duration(seconds: 12));

      if (!mounted) return;
      final data = _safeJsonDecode(res.body);

      if (res.statusCode == 200) {
        showAuthSnack(
          context,
          data['mesaj'] ?? 'Yeni kod e-posta adresinize gönderildi.',
        );
        _startCountdown();
        for (final c in _controllers) {
          c.clear();
        }
        _focusNodes[0].requestFocus();
        setState(() => _errorMessage = null);
      } else {
        if (data['emailSendFailed'] == true) {
          showAuthSnack(
            context,
            data['mesaj'] ??
                'Kod gönderilemedi. Lütfen internetinizi kontrol edip tekrar deneyin.',
          );
        } else {
          showAuthSnack(context, data['mesaj'] ?? 'Kod gönderilemedi.');
        }
      }
    } catch (_) {
      if (mounted) showAuthSnack(context, 'Sunucuya bağlanılamadı.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ── UI ────────────────────────────────────────────────────────────────
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

                // Logo + geri butonu
                Row(
                  children: [
                    const AuthLogo(),
                    const Spacer(),
                    _BackButton(onTap: () => Navigator.pop(context)),
                  ],
                ),
                const SizedBox(height: 40),

                // Başlık
                const Text(
                  'E-posta\nDoğrulama.',
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

                // Açıklama
                RichText(
                  text: TextSpan(
                    style: const TextStyle(
                      color: AuthColors.muted,
                      fontSize: 14,
                      height: 1.5,
                    ),
                    children: [
                      const TextSpan(text: '6 haneli doğrulama kodu\n'),
                      TextSpan(
                        text: widget.email,
                        style: const TextStyle(
                          color: AuthColors.gold,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const TextSpan(
                        text: '\nadresine gönderildi.',
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 44),

                // OTP kutucukları
                AnimatedBuilder(
                  animation: _shakeAnimation,
                  builder: (context, child) {
                    final shake = _shakeAnimation.value;
                    final offset =
                        (shake < 0.5 ? shake : 1.0 - shake) * 2 * 10;
                    return Transform.translate(
                      offset: Offset(offset, 0),
                      child: child,
                    );
                  },
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: List.generate(
                      6,
                      (i) => _OtpBox(
                        controller: _controllers[i],
                        focusNode: _focusNodes[i],
                        hasError: _errorMessage != null,
                        onChanged: (val) => _onOtpInput(i, val),
                        onBackspace: () => _onBackspace(i),
                      ),
                    ),
                  ),
                ),

                // Hata mesajı
                if (_errorMessage != null) ...[
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      const Icon(
                        Icons.error_outline_rounded,
                        color: AuthColors.error,
                        size: 16,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(
                            color: AuthColors.error,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],

                const SizedBox(height: 36),

                // Doğrula butonu
                AuthPrimaryButton(
                  label: 'Doğrula',
                  onTap: _verify,
                  loading: _loading,
                ),

                const SizedBox(height: 28),

                // Yeniden gönder
                Center(
                  child: _canResend
                      ? GestureDetector(
                          onTap: _resendCode,
                          child: const Text(
                            'Kodu tekrar gönder',
                            style: TextStyle(
                              color: AuthColors.gold,
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        )
                      : Text(
                          'Kodu tekrar gönder ($_resendCountdown sn)',
                          style: const TextStyle(
                            color: AuthColors.muted,
                            fontSize: 13,
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

// ── OTP tek kutu widget ────────────────────────────────────────────────────
class _OtpBox extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final bool hasError;
  final ValueChanged<String> onChanged;
  final VoidCallback onBackspace;

  const _OtpBox({
    required this.controller,
    required this.focusNode,
    required this.hasError,
    required this.onChanged,
    required this.onBackspace,
  });

  @override
  Widget build(BuildContext context) {
    final isFilled = controller.text.isNotEmpty;
    return SizedBox(
      width: 46,
      height: 58,
      child: KeyboardListener(
        focusNode: FocusNode(),
        onKeyEvent: (event) {
          if (event is KeyDownEvent &&
              event.logicalKey == LogicalKeyboardKey.backspace) {
            onBackspace();
          }
        },
        child: TextField(
          controller: controller,
          focusNode: focusNode,
          onChanged: onChanged,
          maxLength: 1,
          keyboardType: TextInputType.number,
          textAlign: TextAlign.center,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: hasError ? AuthColors.error : AuthColors.gold,
            fontFamily: 'Cormorant',
          ),
          decoration: InputDecoration(
            counterText: '',
            filled: true,
            fillColor: isFilled
                ? AuthColors.gold.withAlpha(20)
                : AuthColors.card,
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: hasError
                    ? AuthColors.error
                    : isFilled
                        ? AuthColors.gold
                        : AuthColors.border,
                width: 1.5,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: hasError ? AuthColors.error : AuthColors.gold,
                width: 2,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ── Geri butonu ────────────────────────────────────────────────────────────
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
