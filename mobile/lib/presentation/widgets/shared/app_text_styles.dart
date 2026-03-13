import 'package:flutter/material.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';

class AppTextStyles {
  AppTextStyles._();

  static const String _displayFont = 'Cormorant';

  static TextStyle display(double size) => TextStyle(
        fontFamily: _displayFont,
        fontSize: size,
        fontWeight: FontWeight.w700,
        color: AppColors.text,
        letterSpacing: -1,
        height: 1.05,
      );

  static const TextStyle label = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w600,
    color: AppColors.muted,
    letterSpacing: 1.2,
  );

  static const TextStyle caption = TextStyle(
    fontSize: 12,
    color: AppColors.textSub,
    height: 1.4,
  );

  static const TextStyle body = TextStyle(
    fontSize: 14,
    color: AppColors.textSub,
    height: 1.5,
  );
}