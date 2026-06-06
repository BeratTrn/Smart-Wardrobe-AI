import 'dart:io'; // Platform kontrolü için gerekli

import 'package:flutter/foundation.dart';

class ApiConstants {
  ApiConstants._();

  // ─── 🚀 GELİŞTİRİCİ AYARLARI ──────────────────────────────────────────────

  /// Production URL — Render.com'da Docker ile deploy edilmiş backend
  static const String _productionUrl =
      'https://smart-wardrobe-ai-2nwd.onrender.com/api';

  static const bool _kIsEmulator = false;
  static const String _physicalDeviceIp = '10.50.0.180'; // local test için

  static String get baseUrl {
    if (kIsWeb) {
      return _productionUrl;
    }
    if (_kIsEmulator) {
      if (Platform.isAndroid) {
        return 'http://10.0.2.2:3000/api';
      } else {
        return 'http://localhost:3000/api';
      }
    }
    // Fiziksel cihaz: Production (Render.com)
    return _productionUrl;
  }

  // --- API Anahtarları ve Diğer Sabitler ---
  static const String googleClientId =
      '743327952521-btdahvqrg64r8r3iin2sqqalck7bfdbk.apps.googleusercontent.com';
}
