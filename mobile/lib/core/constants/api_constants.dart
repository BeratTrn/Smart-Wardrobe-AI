import 'package:flutter/foundation.dart';

class ApiConstants {
  ApiConstants._();

  // ─── PLATFORM'A GÖRE URL SEÇİMİ ─────────────────────────────────────────
  //
  //  [Web]              : kIsWeb == true  → localhost:3000
  //  [Android Emülatör] : _kIsEmulator = true yapın → 10.0.2.2:3000
  //  [Fiziksel Cihaz]   : _kIsEmulator = false yapın → Wi-Fi IP
  //  [iOS Simülatör]    : _kIsEmulator = true yapın → localhost:3000
  //
  // !! Fiziksel cihazda test ediyorsanız _kIsEmulator = false yapın
  //    ve aşağıdaki _physicalDeviceIp adresini kendi ağınızdaki IP ile değiştirin.
  // ─────────────────────────────────────────────────────────────────────────

  /// Android emülatöründe mi çalışıyorsunuz?
  /// true  → Android Emülatör / iOS Simülatör
  /// false → Fiziksel cihaz (Wi-Fi)
  static const bool _kIsEmulator = true;

  /// Fiziksel cihaz için yerel ağ IP'niz (router'dan bakın)
  static const String _physicalDeviceIp = '192.168.1.103';

  static String get baseUrl {
    if (kIsWeb) {
      // Flutter Web — backend aynı makinede
      return 'http://localhost:3000/api';
    }
    if (_kIsEmulator) {
      // Android Emülatör: host makinesi = 10.0.2.2
      // iOS Simülatör   : host makinesi = localhost
      return 'http://10.0.2.2:3000/api';
    }
    // Fiziksel cihaz: aynı Wi-Fi'daki Node.js backend IP'si
    return 'http://$_physicalDeviceIp:3000/api';
  }

  static const String googleClientId =
      '743327952521-btdahvqrg64r8r3iin2sqqalck7bfdbk.apps.googleusercontent.com';
}
