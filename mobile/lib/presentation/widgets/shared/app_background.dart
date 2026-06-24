import 'package:flutter/material.dart';
import 'package:smart_wardrobe_ai/core/theme/app_theme_extension.dart';

/// Uygulama genelinde kullanılan gradient arka plan.
/// Dark modda derin siyah + altın glow orb'ları.
/// Light modda ivory zemin + altın glow orb'ları (daha hafif opaklık).
class AppBackground extends StatelessWidget {
  final Widget child;
  const AppBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final c = AppColorsExtension.of(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Stack(children: [
      Container(color: c.bg),
      Positioned(
        top: -100, right: -100,
        child: _GlowOrb(
          color: c.gold.withValues(alpha: isDark ? .10 : .07),
          size: 320,
        ),
      ),
      Positioned(
        bottom: 80, left: -80,
        child: _GlowOrb(
          color: c.gold.withValues(alpha: isDark ? .06 : .04),
          size: 220,
        ),
      ),
      child,
    ]);
  }
}

class _GlowOrb extends StatelessWidget {
  final Color color;
  final double size;
  const _GlowOrb({required this.color, required this.size});

  @override
  Widget build(BuildContext context) => Container(
        width: size, height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(colors: [color, Colors.transparent]),
        ),
      );
}

/// Glassmorphism kart — dark modda siyah cam, light modda beyaz cam.
/// Tüm ekranlarda aynı backdrop blur efekti korunur.
class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final BorderRadius? borderRadius;

  const GlassCard({
    super.key,
    required this.child,
    this.padding,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final c = AppColorsExtension.of(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: isDark
            ? Colors.black.withValues(alpha: .35)
            : Colors.white.withValues(alpha: .40),
        borderRadius: borderRadius ?? BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: .06)
              : c.border.withValues(alpha: .60),
        ),
        boxShadow: isDark
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: .03),
                  offset: const Offset(0, 4),
                  blurRadius: 20,
                ),
              ],
      ),
      child: child,
    );
  }
}
