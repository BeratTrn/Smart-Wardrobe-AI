import 'package:flutter/material.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';

// AUTH RENK PALETİ (auth ekranlarına özgü)

class AuthColors {
  AuthColors._();
  static const Color bg = Color(0xFF0A0A0A);
  static const Color card = Color(0xFF131310);
  static const Color border = Color(0xFF2A2A22);
  static const Color gold = Color(0xFFC9A84C);
  static const Color goldLight = Color(0xFFE8C97A);
  static const Color text = Color(0xFFF5F0E8);
  static const Color muted = Color(0xFF6A6458);
  static const Color error = Color(0xFFB04040);
  static const Color success = Color(0xFF4A8C5C);
}

// AUTH ARKA PLAN

class AuthBackground extends StatelessWidget {
  final Widget child;
  const AuthBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Container(color: AuthColors.bg),
        Positioned(
          top: -120,
          right: -80,
          child: _GlowOrb(color: AuthColors.gold.withValues(alpha: .12), size: 300),
        ),
        Positioned(
          bottom: -60,
          left: -60,
          child: _GlowOrb(color: AuthColors.gold.withValues(alpha: .07), size: 200),
        ),
        child,
      ],
    );
  }
}

class _GlowOrb extends StatelessWidget {
  final Color color;
  final double size;
  const _GlowOrb({required this.color, required this.size});

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      gradient: RadialGradient(colors: [color, Colors.transparent]),
    ),
  );
}

// AUTH LOGO

class AuthLogo extends StatelessWidget {
  const AuthLogo({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AuthColors.gold, AuthColors.goldLight],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(
            Icons.checkroom_rounded,
            color: Colors.black,
            size: 20,
          ),
        ),
        const SizedBox(width: 9),
        const Text(
          'StyleX',
          style: TextStyle(
            fontFamily: 'Cormorant',
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AuthColors.text,
            letterSpacing: -.5,
          ),
        ),
      ],
    );
  }
}

// AUTH TEXT FIELD

class AuthTextField extends StatefulWidget {
  final TextEditingController controller;
  final String hint;
  final IconData icon;
  final bool isPassword;
  final TextInputType keyboardType;
  final String? errorText;

  const AuthTextField({
    super.key,
    required this.controller,
    required this.hint,
    required this.icon,
    this.isPassword = false,
    this.keyboardType = TextInputType.text,
    this.errorText,
  });

  @override
  State<AuthTextField> createState() => _AuthTextFieldState();
}

class _AuthTextFieldState extends State<AuthTextField> {
  bool _obscure = true;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: widget.controller,
      obscureText: widget.isPassword && _obscure,
      keyboardType: widget.keyboardType,
      style: const TextStyle(color: AuthColors.text, fontSize: 15),
      cursorColor: AuthColors.gold,
      decoration: InputDecoration(
        hintText: widget.hint,
        hintStyle: const TextStyle(color: AuthColors.muted, fontSize: 14),
        errorText: widget.errorText,
        prefixIcon: Icon(widget.icon, color: AuthColors.muted, size: 20),
        suffixIcon: widget.isPassword
            ? GestureDetector(
                onTap: () => setState(() => _obscure = !_obscure),
                child: Icon(
                  _obscure
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                  color: AuthColors.muted,
                  size: 20,
                ),
              )
            : null,
        filled: true,
        fillColor: AuthColors.card,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 16,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AuthColors.border, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AuthColors.gold, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AuthColors.error, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AuthColors.error, width: 1.5),
        ),
      ),
    );
  }
}

// AUTH PRIMARY BUTTON

class AuthPrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;
  final bool loading;

  const AuthPrimaryButton({
    super.key,
    required this.label,
    required this.onTap,
    this.loading = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: loading ? null : onTap,
      child: Container(
        height: 56,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AuthColors.gold, AuthColors.goldLight],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: AuthColors.gold.withValues(alpha: .35),
              blurRadius: 20,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Center(
          child: loading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    color: Colors.black,
                    strokeWidth: 2.5,
                  ),
                )
              : Text(
                  label,
                  style: const TextStyle(
                    color: Colors.black,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    letterSpacing: .5,
                  ),
                ),
        ),
      ),
    );
  }
}

// AUTH SOCIAL BUTTON  (Google / Apple)

class AuthSocialButton extends StatelessWidget {
  final Widget icon;
  final String label;
  final VoidCallback onTap;

  const AuthSocialButton({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 52,
        decoration: BoxDecoration(
          color: AuthColors.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AuthColors.border, width: 1.5),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            icon,
            const SizedBox(width: 10),
            Text(
              label,
              style: const TextStyle(
                color: AuthColors.text,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// AUTH DIVIDER

class AuthDivider extends StatelessWidget {
  const AuthDivider({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Expanded(child: Divider(color: AuthColors.border, thickness: 1)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Text(
            'veya',
            style: TextStyle(color: AuthColors.muted, fontSize: 12),
          ),
        ),
        const Expanded(child: Divider(color: AuthColors.border, thickness: 1)),
      ],
    );
  }
}

// GOOGLE İKONU (custom painter)

class GoogleIcon extends StatelessWidget {
  final double size;
  const GoogleIcon({super.key, this.size = 20});

  @override
  Widget build(BuildContext context) =>
      CustomPaint(size: Size(size, size), painter: _GooglePainter());
}

class _GooglePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final r = size.width / 2;

    final segments = [
      (Colors.red, -0.52, 0.52),
      (Colors.green, 0.52, 1.57),
      (Colors.yellow, 1.57, 2.62),
      (Colors.blue, 2.62, 3.67),
    ];

    for (final s in segments) {
      final paint = Paint()
        ..color = s.$1 as Color
        ..style = PaintingStyle.stroke
        ..strokeWidth = size.width * .2;
      canvas.drawArc(
        Rect.fromCircle(center: Offset(cx, cy), radius: r * .75),
        s.$2,
        (s.$3) - (s.$2),
        false,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_) => false;
}

// SNACKBAR YARDIMCISI

void showAuthSnack(
  BuildContext context,
  String message, {
  bool isError = true,
}) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(message),
      backgroundColor: isError ? AppColors.error : AppColors.success,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      margin: const EdgeInsets.all(16),
    ),
  );
}
