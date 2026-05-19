import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/data/services/api_service.dart';

/// Uygulama genelinde tema (dark/light) ve dil ayarlarını yönetir.
/// Singleton — `AppSettingsController.instance` ile erişilir.
class AppSettingsController extends ChangeNotifier {
  AppSettingsController._();
  static final AppSettingsController instance = AppSettingsController._();

  ThemeMode _themeMode = ThemeMode.dark;
  String _language = 'tr';

  ThemeMode get themeMode => _themeMode;
  bool get isDark => _themeMode == ThemeMode.dark;
  String get language => _language;

  /// `main()` içinde `runApp()` öncesinde çağrılır — SharedPreferences'tan
  /// yüklenen değerle ilk frame için doğru tema hazır olur (flicker olmaz).
  /// notifyListeners çağrılmaz çünkü widget ağacı henüz oluşturulmamıştır.
  void init({required bool isDark, String language = 'tr'}) {
    _themeMode = isDark ? ThemeMode.dark : ThemeMode.light;
    _language = language;
    _applySystemUiStyle(isDark);
  }

  /// Kullanıcı ayarlar ekranından temayı değiştirdiğinde çağrılır.
  /// Anında UI'ı günceller, SharedPreferences'a kaydeder ve backend'e senkronize eder.
  Future<void> setTheme(bool isDark) async {
    _themeMode = isDark ? ThemeMode.dark : ThemeMode.light;
    _applySystemUiStyle(isDark);
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('pref_darkMode', isDark);

    // Backend'e fire-and-forget senkronizasyon
    ApiService.instance
        .updateAppSettings(theme: isDark ? 'dark' : 'light')
        .ignore();
  }

  /// Backend'den gelen tema/dil değerlerini uygular — backend'e tekrar senkronize ETmez.
  /// Giriş sonrası ve profil yüklemesinde çapraz cihaz senkronizasyonu için kullanılır.
  /// [language] null geçilirse mevcut değer korunur.
  Future<void> applyBackendSettings({
    required bool isDark,
    String? language,
  }) async {
    _themeMode = isDark ? ThemeMode.dark : ThemeMode.light;
    if (language != null) _language = language;
    _applySystemUiStyle(isDark);
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('pref_darkMode', isDark);
    if (language != null) {
      await prefs.setString('pref_language', language);
    }
  }

  void _applySystemUiStyle(bool isDark) {
    SystemChrome.setSystemUIOverlayStyle(
      SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness:
            isDark ? Brightness.light : Brightness.dark,
        systemNavigationBarColor:
            isDark ? const Color(0xFF0A0A0A) : const Color(0xFFF8F6F0),
        systemNavigationBarIconBrightness:
            isDark ? Brightness.light : Brightness.dark,
      ),
    );
  }
}
