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
    // Android emülatör için 10.0.2.2, fiziksel cihaz için kendi IP'ni yaz:
    return 'http://10.0.2.2:3000/api';
    // Fiziksel cihaz için şöyle değiştir: 'http://192.168.x.x:3000/api'
  }
}
