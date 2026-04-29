import 'package:flutter/foundation.dart';

class ApiConstants {
  ApiConstants._();

  // Platform'a göre otomatik URL seçimi:
  // - Web (tarayıcı): localhost
  // - Android Emülatör: 10.0.2.2 (emülatörün host makinesi)
  // - Fiziksel Cihaz: yerel ağ IP'si (aşağıdan değiştir)
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:3000/api';
    }
    // Mobil uygulamanın kesintisiz (uyarı sayfasına takılmadan) çalışması için Wi-Fi IP'niz:
    return 'http://192.168.1.103:3000/api';
  }

  static const String googleClientId =
      '743327952521-btdahvqrg64r8r3iin2sqqalck7bfdbk.apps.googleusercontent.com';
}
