import 'package:flutter/material.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';

class AppBackground extends StatelessWidget {
  final Widget child;
  const AppBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Stack(children: [
      Container(color: AppColors.bg),
      Positioned(
        top: -100, right: -100,
        child: _GlowOrb(color: AppColors.gold.withOpacity(.10), size: 320),
      ),
      Positioned(
        bottom: 80, left: -80,
        child: _GlowOrb(color: AppColors.gold.withOpacity(.06), size: 220),
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