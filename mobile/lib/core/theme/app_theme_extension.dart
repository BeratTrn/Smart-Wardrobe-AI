import 'package:flutter/material.dart';

/// Flutter ThemeExtension — tüm özel renkleri tutup hem dark hem light temada
/// milimetrik olarak korunur.  Statik [AppColors] sabitlerine gerek kalmadan
/// `AppColorsExtension.of(context).bg` şeklinde erişilir.
class AppColorsExtension extends ThemeExtension<AppColorsExtension> {
  const AppColorsExtension({
    required this.bg,
    required this.surface,
    required this.card,
    required this.border,
    required this.gold,
    required this.goldLight,
    required this.goldDim,
    required this.text,
    required this.textSub,
    required this.muted,
    required this.success,
    required this.error,
    required this.info,
    required this.catTops,
    required this.catBottoms,
    required this.catShoes,
    required this.catAccessory,
    required this.catOnePiece,
    required this.catOuterwear,
  });

  final Color bg;
  final Color surface;
  final Color card;
  final Color border;
  final Color gold;
  final Color goldLight;
  final Color goldDim;
  final Color text;
  final Color textSub;
  final Color muted;
  final Color success;
  final Color error;
  final Color info;
  final Color catTops;
  final Color catBottoms;
  final Color catShoes;
  final Color catAccessory;
  final Color catOnePiece;
  final Color catOuterwear;

  // ── Hazır paletler ──────────────────────────────────────────────────────────

  /// Mevcut lüks karanlık tema — hiçbir renk kodu değiştirilmedi.
  static const dark = AppColorsExtension(
    bg:           Color(0xFF0A0A0A),
    surface:      Color(0xFF141414),
    card:         Color(0xFF1A1A17),
    border:       Color(0xFF272720),
    gold:         Color(0xFFC9A84C),
    goldLight:    Color(0xFFE8C97A),
    goldDim:      Color(0xFF6B5820),
    text:         Color(0xFFF5F0E8),
    textSub:      Color(0xFFB0A898),
    muted:        Color(0xFF6A6458),
    success:      Color(0xFF4A8C5C),
    error:        Color(0xFFB04040),
    info:         Color(0xFF3A6EA8),
    catTops:      Color(0xFF5A7A9C),
    catBottoms:   Color(0xFF7A5A9C),
    catShoes:     Color(0xFF9C7A5A),
    catAccessory: Color(0xFF5A9C7A),
    catOnePiece:  Color(0xFF9C5A7A),
    catOuterwear: Color(0xFF6A8C6A),
  );

  /// Premium "Ivory & Gold" açık tema — Chanel/High-End esintisi.
  /// Altın vurgu (#C9A84C) dark temadan birebir korundu.
  static const light = AppColorsExtension(
    bg:           Color(0xFFF8F6F0), // Warm ivory — sıcak, soft off-white
    surface:      Color(0xFFFFFFFF), // Pure white cards — subtle lift effect
    card:         Color(0xFFFAF9F6), // Slightly warm white for nested cards
    border:       Color(0xFFE0DED7), // Warm gray divider
    gold:         Color(0xFFC9A84C), // Aynı gold — brand consistency
    goldLight:    Color(0xFFB8942A), // Biraz daha koyu gold (ivory'de okunabilirlik)
    goldDim:      Color(0xFFEDD9A0), // Subtle gold tint
    text:         Color(0xFF1A1A1A), // Deep charcoal — luxury readability
    textSub:      Color(0xFF757575), // Medium gray subtitles
    muted:        Color(0xFFAAAAAA), // Light muted
    success:      Color(0xFF3A7A4C),
    error:        Color(0xFF9A3030),
    info:         Color(0xFF2A5E98),
    catTops:      Color(0xFF4A6A8C),
    catBottoms:   Color(0xFF6A4A8C),
    catShoes:     Color(0xFF8C6A4A),
    catAccessory: Color(0xFF4A8C6A),
    catOnePiece:  Color(0xFF8C4A6A),
    catOuterwear: Color(0xFF5A7C5A),
  );

  // ── Kolay erişim ─────────────────────────────────────────────────────────────

  /// `Theme.of(context).extension<AppColorsExtension>()!` yerine kısa yol.
  static AppColorsExtension of(BuildContext context) =>
      Theme.of(context).extension<AppColorsExtension>()!;

  // ── ThemeExtension impl ──────────────────────────────────────────────────────

  @override
  AppColorsExtension copyWith({
    Color? bg, Color? surface, Color? card, Color? border,
    Color? gold, Color? goldLight, Color? goldDim,
    Color? text, Color? textSub, Color? muted,
    Color? success, Color? error, Color? info,
    Color? catTops, Color? catBottoms, Color? catShoes,
    Color? catAccessory, Color? catOnePiece, Color? catOuterwear,
  }) => AppColorsExtension(
    bg:           bg           ?? this.bg,
    surface:      surface      ?? this.surface,
    card:         card         ?? this.card,
    border:       border       ?? this.border,
    gold:         gold         ?? this.gold,
    goldLight:    goldLight    ?? this.goldLight,
    goldDim:      goldDim      ?? this.goldDim,
    text:         text         ?? this.text,
    textSub:      textSub      ?? this.textSub,
    muted:        muted        ?? this.muted,
    success:      success      ?? this.success,
    error:        error        ?? this.error,
    info:         info         ?? this.info,
    catTops:      catTops      ?? this.catTops,
    catBottoms:   catBottoms   ?? this.catBottoms,
    catShoes:     catShoes     ?? this.catShoes,
    catAccessory: catAccessory ?? this.catAccessory,
    catOnePiece:  catOnePiece  ?? this.catOnePiece,
    catOuterwear: catOuterwear ?? this.catOuterwear,
  );

  @override
  AppColorsExtension lerp(AppColorsExtension? other, double t) {
    if (other == null) return this;
    return AppColorsExtension(
      bg:           Color.lerp(bg,           other.bg,           t)!,
      surface:      Color.lerp(surface,      other.surface,      t)!,
      card:         Color.lerp(card,         other.card,         t)!,
      border:       Color.lerp(border,       other.border,       t)!,
      gold:         Color.lerp(gold,         other.gold,         t)!,
      goldLight:    Color.lerp(goldLight,    other.goldLight,    t)!,
      goldDim:      Color.lerp(goldDim,      other.goldDim,      t)!,
      text:         Color.lerp(text,         other.text,         t)!,
      textSub:      Color.lerp(textSub,      other.textSub,      t)!,
      muted:        Color.lerp(muted,        other.muted,        t)!,
      success:      Color.lerp(success,      other.success,      t)!,
      error:        Color.lerp(error,        other.error,        t)!,
      info:         Color.lerp(info,         other.info,         t)!,
      catTops:      Color.lerp(catTops,      other.catTops,      t)!,
      catBottoms:   Color.lerp(catBottoms,   other.catBottoms,   t)!,
      catShoes:     Color.lerp(catShoes,     other.catShoes,     t)!,
      catAccessory: Color.lerp(catAccessory, other.catAccessory, t)!,
      catOnePiece:  Color.lerp(catOnePiece,  other.catOnePiece,  t)!,
      catOuterwear: Color.lerp(catOuterwear, other.catOuterwear, t)!,
    );
  }
}
