import 'dart:io'; // Platform kontrolü için gerekli

import 'package:flutter/foundation.dart';

class ApiConstants {
  ApiConstants._();

  // ─── 🚀 GELİŞTİRİCİ AYARLARI ──────────────────────────────────────────────

  static const bool _kIsEmulator = false;
  static const String _physicalDeviceIp = '192.168.1.102';

  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:3000/api';
    }
    if (_kIsEmulator) {
      if (Platform.isAndroid) {
        return 'http://10.0.2.2:3000/api';
      } else {
        return 'http://localhost:3000/api';
      }
    }
    return 'http://$_physicalDeviceIp:3000/api';
  }

  // --- API Anahtarları ve Diğer Sabitler ---
  static const String googleClientId =
      '743327952521-btdahvqrg64r8r3iin2sqqalck7bfdbk.apps.googleusercontent.com';
}
