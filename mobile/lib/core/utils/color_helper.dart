import 'dart:math';
import 'package:flutter/material.dart';

/// Converts clothing HEX color codes to human-readable Turkish names.
///
/// Algorithm: Euclidean distance in the linear RGB color space.
/// Using Flutter's Color guarantees the same channel extraction logic
/// the framework uses, avoiding off-by-one bit-shift errors.
class ColorHelper {
  ColorHelper._();

  // Canonical palette — representative HEX chosen to match real fabric colours.
  static const Map<String, Color> _palette = {
    'Beyaz': Color(0xFFFFFFFF), // #FFFFFF
    'Krem': Color(0xFFFFF8DC), // #FFF8DC  warm cream
    'Bej': Color(0xFFF5DEB3), // #F5DEB3  wheat / bej
    'Açık Gri': Color(0xFFD3D3D3), // #D3D3D3  light grey
    'Gri': Color(0xFF9E9E9E), // #9E9E9E  medium grey
    'Koyu Gri': Color(0xFF424242), // #424242  charcoal
    'Siyah': Color(0xFF000000), // #000000
    'Açık Mavi': Color(0xFFADD8E6), // #ADD8E6  light blue
    'Mavi': Color(0xFF1E88E5), // #1E88E5  standard blue
    'Koyu Mavi': Color(0xFF0D47A1), // #0D47A1  dark blue
    'Lacivert': Color(0xFF1A237E), // #1A237E  navy
    'Kırmızı': Color(0xFFCC0000), // #CC0000  red
    'Bordo': Color(0xFF7B1B2B), // #7B1B2B  burgundy/wine
    'Pembe': Color(0xFFFFC0CB), // #FFC0CB  pink
    'Mor': Color(0xFF6A1B9A), // #6A1B9A  purple
    'Lila': Color(0xFFCE93D8), // #CE93D8  lilac/lavender
    'Yeşil': Color(0xFF2E7D32), // #2E7D32  forest green
    'Koyu Yeşil': Color(0xFF1B5E20), // #1B5E20  dark green
    'Haki': Color(0xFF8D8C4B), // #8D8C4B  khaki
    'Zeytin': Color(0xFF556B2F), // #556B2F  olive
    'Sarı': Color(0xFFFFD600), // #FFD600  yellow
    'Hardal': Color(0xFFD4A017), // #D4A017  mustard
    'Turuncu': Color(0xFFE65100), // #E65100  deep orange
    'Kahverengi': Color(0xFF6D4C41), // #6D4C41  brown
    'Koyu Kahve': Color(0xFF3E2723), // #3E2723  dark brown
  };

  // ── Public API ──────────────────────────────────────────────────────────────

  /// Returns the Turkish name of the closest palette colour to [hexCode].
  ///
  /// [hexCode] accepts "#RRGGBB" or "RRGGBB" (case-insensitive).
  /// Returns an empty string when the input cannot be parsed.
  static String getNearestTurkishColorName(String hexCode) {
    final input = _parseHex(hexCode);
    if (input == null) return '';

    final ir = input.red.toDouble();
    final ig = input.green.toDouble();
    final ib = input.blue.toDouble();

    String best = '';
    double minDist = double.infinity;

    for (final MapEntry<String, Color> entry in _palette.entries) {
      final c = entry.value;
      final dist = sqrt(
        pow(ir - c.red, 2) + pow(ig - c.green, 2) + pow(ib - c.blue, 2),
      );
      if (dist < minDist) {
        minDist = dist;
        best = entry.key;
      }
    }
    return best;
  }

  /// Returns `true` when [raw] is a 6-digit hex string (with or without #).
  static bool isHex(String raw) {
    final s = raw.trim().replaceAll('#', '');
    return s.length == 6 && int.tryParse(s, radix: 16) != null;
  }

  /// Display-ready label:
  /// - HEX input  → "Lacivert (#1A237E)"
  /// - Plain text → returned as-is (e.g. "Lacivert")
  static String getDisplayLabel(String raw) {
    if (raw.isEmpty) return raw;
    if (!isHex(raw)) return raw;
    final name = getNearestTurkishColorName(raw);
    if (name.isEmpty) return raw;
    final hex = raw.trim().toUpperCase();
    final formatted = hex.startsWith('#') ? hex : '#$hex';
    return '$name ($formatted)';
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  static Color? _parseHex(String raw) {
    final s = raw.trim().replaceAll('#', '');
    if (s.length != 6) return null;
    final val = int.tryParse(s, radix: 16);
    if (val == null) return null;
    return Color(0xFF000000 | val); // add full opacity channel
  }
}
