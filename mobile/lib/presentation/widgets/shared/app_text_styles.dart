import 'package:flutter/material.dart';
import 'package:smart_wardrobe_ai/core/theme/app_theme_extension.dart';

class AppTextStyles {
  AppTextStyles._();

  static const String _displayFont = 'Cormorant';

  /// Başlık — renk otomatik olarak mevcut temadan okunur.
  static TextStyle display(BuildContext context, double size) {
    final c = AppColorsExtension.of(context);
    return TextStyle(
      fontFamily: _displayFont,
      fontSize: size,
      fontWeight: FontWeight.w700,
      color: c.text,
      letterSpacing: -1,
      height: 1.05,
    );
  }

  /// Küçük büyük harf etiket (section labels).
  /// Renk ekranda `.copyWith(color: c.muted)` ile override edilir.
  static const TextStyle label = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w600,
    color: Color(0xFF6A6458), // dark muted fallback; override with c.muted
    letterSpacing: 1.2,
  );

  static const TextStyle caption = TextStyle(
    fontSize: 12,
    color: Color(0xFFB0A898), // dark textSub fallback; override with c.textSub
    height: 1.4,
  );

  static const TextStyle body = TextStyle(
    fontSize: 14,
    color: Color(0xFFB0A898), // dark textSub fallback
    height: 1.5,
  );
}
