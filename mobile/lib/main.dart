import 'dart:convert';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/core/controllers/app_settings_controller.dart';
import 'package:smart_wardrobe_ai/core/theme/app_theme_extension.dart';
import 'package:smart_wardrobe_ai/presentation/screens/auth/login_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/home_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/startup/onboarding_screen.dart';

// Supported locales — language code only.
// Translation files are assets/translations/de.json etc. (no country suffix).
// useOnlyLangCode: true in the EasyLocalization widget matches this convention.
const _supportedLocales = [
  Locale('tr'),
  Locale('en'),
  Locale('de'),
  Locale('fr'),
];

// easy_localization 3.0.x stores its selected locale under this key.
// Source: EasyLocalizationController._saveLocale() → prefs.setString('locale', ...)
const _easyLocStorageKey = 'locale';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Step 1: Load SharedPreferences
  final prefs = await SharedPreferences.getInstance();

  // Step 2: Resolve start screen + sync theme & locale from backend
  // Runs before EasyLocalization.ensureInitialized() so any locale written
  // to SharedPreferences is picked up when EasyLocalization reads them.
  final boot = await _resolveStartScreen(prefs);

  // Step 3: Apply theme (no flicker — runApp hasn't been called yet)
  final savedLangCode = prefs.getString('pref_language') ?? 'tr';
  AppSettingsController.instance.init(
    isDark: boot.isDark,
    language: savedLangCode,
  );

  // Step 4: Force-sync EasyLocalization's own cache key from pref_language
  // pref_language is written on every locale change and on every successful
  // /auth/me response.  It is always the authoritative value.
  // EasyLocalization.ensureInitialized() reads SharedPreferences['locale']
  // (EasyLocalizationController.initEasyLocation).  By overwriting that key
  // with our verified value NOW — before ensureInitialized() — we guarantee
  // frame 1 matches the user's saved language, even if EasyLocalization's own
  // cache drifted (e.g. stale 'tr' left from a previous install).
  await prefs.setString(_easyLocStorageKey, savedLangCode);

  // Step 5: EasyLocalization reads the freshly-written, correct key
  await EasyLocalization.ensureInitialized();

  // Step 6: Date formatting for every supported locale
  await Future.wait([
    initializeDateFormatting('tr_TR', null),
    initializeDateFormatting('en_US', null),
    initializeDateFormatting('de_DE', null),
    initializeDateFormatting('fr_FR', null),
  ]);

  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  runApp(
    EasyLocalization(
      supportedLocales: _supportedLocales,
      path: 'assets/translations',
      fallbackLocale: const Locale('tr'),
      // useOnlyLangCode strips country codes when building the asset path, so
      // EasyLocalization looks for 'de.json' instead of 'de-DE.json'.
      // Our translation files are named without country codes (de.json etc.),
      // so this flag must be true for file loading to succeed.
      useOnlyLangCode: true,
      // startLocale: belt-and-suspenders for fresh installs where _savedLocale
      // is null (step 4 already wrote the key for any returning user, making
      // startLocale effectively inert for them).
      startLocale: Locale(savedLangCode),
      child: SmartWardrobeApp(
        startScreen: boot.screen,
        savedLangCode: savedLangCode,
      ),
    ),
  );
}

// Boot result

class _BootResult {
  final Widget screen;
  final bool isDark;
  const _BootResult({required this.screen, required this.isDark});
}

// Start-screen resolver + cross-device settings sync
// Single /auth/me call that handles both routing and settings sync.
// Updates AppSettingsController and pref_darkMode/pref_language in
// SharedPreferences before EasyLocalization.ensureInitialized() reads them.

Future<_BootResult> _resolveStartScreen(SharedPreferences prefs) async {
  bool isDark = prefs.getBool('pref_darkMode') ?? true;

  final onboardingDone = prefs.getBool('onboardingDone') ?? false;
  if (!onboardingDone) {
    return _BootResult(screen: const OnboardingScreen(), isDark: isDark);
  }

  final token = prefs.getString('token') ?? '';
  if (token.isEmpty) {
    return _BootResult(screen: const LoginScreen(), isDark: isDark);
  }

  try {
    final res = await http
        .get(
          Uri.parse('${ApiConstants.baseUrl}/auth/me'),
          headers: {
            'Authorization': 'Bearer $token',
            'Accept': 'application/json',
          },
        )
        .timeout(const Duration(seconds: 8));

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final user = data['kullanici'] as Map<String, dynamic>? ?? {};

      // Sync theme (cross-device
      final backendTheme = user['theme'] as String?;
      if (backendTheme != null) {
        isDark = backendTheme == 'dark';
      }

      // Sync locale (cross-device)
      // Store ONLY the language code.  Consistent with useOnlyLangCode: true
      // and our assets/translations/de.json naming convention.
      final backendLang = user['language'] as String?;

      // Also write to EasyLocalization's key; step 4 in main() will do a
      // redundant write, but doing it here too covers the case where
      // pref_language is set exclusively by the backend sync path.
      if (backendLang != null) {
        await prefs.setString(_easyLocStorageKey, backendLang);
      }

      // Commit both values to the controller so notifyListeners() fires
      // the reactive listener in SmartWardrobeApp the moment the backend
      // responds — even if EasyLocalization's initial frame already rendered.
      await AppSettingsController.instance.applyBackendSettings(
        isDark: isDark,
        language: backendLang,
      );

      return _BootResult(screen: const HomeScreen(), isDark: isDark);
    }

    if (res.statusCode == 401) {
      await prefs.remove('token');
      await prefs.remove('userName');
    }

    return _BootResult(screen: const LoginScreen(), isDark: isDark);
  } catch (_) {
    // Network unavailable — trust local SharedPreferences and local token.
    return _BootResult(screen: const HomeScreen(), isDark: isDark);
  }
}

// APP ROOT

class SmartWardrobeApp extends StatefulWidget {
  final Widget startScreen;

  /// The authoritative language code read from pref_language during boot.
  /// Used by the post-frame failsafe to guarantee locale sync on frame 1.
  final String savedLangCode;

  const SmartWardrobeApp({
    super.key,
    required this.startScreen,
    required this.savedLangCode,
  });

  @override
  State<SmartWardrobeApp> createState() => _SmartWardrobeAppState();
}

class _SmartWardrobeAppState extends State<SmartWardrobeApp> {
  @override
  void initState() {
    super.initState();

    // Reactive locale listener
    // Fires whenever AppSettingsController notifies — e.g. when the backend
    // /auth/me response arrives and applyBackendSettings() is called.
    // This closes the race condition where EasyLocalization renders the first
    // frame in the fallback locale before the network call completes.
    AppSettingsController.instance.addListener(_onSettingsChanged);

    // Post-frame locale failsafe
    // Runs exactly once after the first frame.  Catches any divergence that
    // occurred before the listener was registered (e.g. stale EasyLocalization
    // cache from a previous install with country-code locales).
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _syncLocale();
    });
  }

  @override
  void dispose() {
    AppSettingsController.instance.removeListener(_onSettingsChanged);
    super.dispose();
  }

  void _onSettingsChanged() {
    if (!mounted) return;
    _syncLocale();
  }

  void _syncLocale() {
    final expected = Locale(AppSettingsController.instance.language);
    if (context.locale.languageCode != expected.languageCode) {
      context.setLocale(expected);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: AppSettingsController.instance,
      builder: (context, _) {
        return MaterialApp(
          title: 'Smart Wardrobe AI',
          debugShowCheckedModeBanner: false,

          // Tema
          themeMode: AppSettingsController.instance.themeMode,
          theme: _buildLightTheme(),
          darkTheme: _buildDarkTheme(),

          // Lokalizasyon
          locale: context.locale,
          supportedLocales: context.supportedLocales,
          localizationsDelegates: EasyLocalization.of(context)!.delegates,

          home: widget.startScreen,
        );
      },
    );
  }

  // Lüks karanlık tema — orijinal renkler korundu
  ThemeData _buildDarkTheme() {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: const Color(0xFF0A0A0A),
      fontFamily: 'Cormorant',
      colorScheme: const ColorScheme.dark(
        primary: Color(0xFFC9A84C),
        secondary: Color(0xFFE8C97A),
        surface: Color(0xFF141414),
        error: Color(0xFFB04040),
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(
          color: Color(0xFFF5F0E8),
          fontFamily: 'Cormorant',
        ),
        displayMedium: TextStyle(
          color: Color(0xFFF5F0E8),
          fontFamily: 'Cormorant',
        ),
        displaySmall: TextStyle(
          color: Color(0xFFF5F0E8),
          fontFamily: 'Cormorant',
        ),
        headlineLarge: TextStyle(color: Color(0xFFF5F0E8)),
        headlineMedium: TextStyle(color: Color(0xFFF5F0E8)),
        headlineSmall: TextStyle(color: Color(0xFFF5F0E8)),
        titleLarge: TextStyle(color: Color(0xFFF5F0E8)),
        titleMedium: TextStyle(color: Color(0xFFB0A898)),
        titleSmall: TextStyle(color: Color(0xFFB0A898)),
        bodyLarge: TextStyle(color: Color(0xFFF5F0E8)),
        bodyMedium: TextStyle(color: Color(0xFFF5F0E8)),
        bodySmall: TextStyle(color: Color(0xFFB0A898)),
        labelLarge: TextStyle(color: Color(0xFFF5F0E8)),
        labelMedium: TextStyle(color: Color(0xFFB0A898)),
        labelSmall: TextStyle(color: Color(0xFF6A6458)),
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: CupertinoPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),
      splashFactory: NoSplash.splashFactory,
      highlightColor: Colors.transparent,
      splashColor: Colors.transparent,
      extensions: const [AppColorsExtension.dark],
    );
  }

  // Premium "Ivory & Gold" açık tema
  ThemeData _buildLightTheme() {
    return ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: const Color(0xFFF8F6F0),
      fontFamily: 'Cormorant',
      colorScheme: const ColorScheme.light(
        primary: Color(0xFFC9A84C),
        secondary: Color(0xFFB8942A),
        surface: Color(0xFFFFFFFF),
        error: Color(0xFF9A3030),
        onPrimary: Color(0xFF1A1A1A),
        onSurface: Color(0xFF1A1A1A),
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(
          color: Color(0xFF1A1A1A),
          fontFamily: 'Cormorant',
        ),
        displayMedium: TextStyle(
          color: Color(0xFF1A1A1A),
          fontFamily: 'Cormorant',
        ),
        displaySmall: TextStyle(
          color: Color(0xFF1A1A1A),
          fontFamily: 'Cormorant',
        ),
        headlineLarge: TextStyle(color: Color(0xFF1A1A1A)),
        headlineMedium: TextStyle(color: Color(0xFF1A1A1A)),
        headlineSmall: TextStyle(color: Color(0xFF1A1A1A)),
        titleLarge: TextStyle(color: Color(0xFF1A1A1A)),
        titleMedium: TextStyle(color: Color(0xFF1A1A1A)),
        titleSmall: TextStyle(color: Color(0xFF757575)),
        bodyLarge: TextStyle(color: Color(0xFF1A1A1A)),
        bodyMedium: TextStyle(color: Color(0xFF1A1A1A)),
        bodySmall: TextStyle(color: Color(0xFF757575)),
        labelLarge: TextStyle(color: Color(0xFF1A1A1A)),
        labelMedium: TextStyle(color: Color(0xFF757575)),
        labelSmall: TextStyle(color: Color(0xFF757575)),
      ),
      cardTheme: CardThemeData(
        color: const Color(0xFFFFFFFF),
        elevation: 0,
        shadowColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFFE0DED7)),
        ),
      ),
      dividerColor: const Color(0xFFE0DED7),
      dividerTheme: const DividerThemeData(
        color: Color(0xFFE0DED7),
        thickness: 1,
      ),
      iconTheme: const IconThemeData(color: Color(0xFF1A1A1A)),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: CupertinoPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),
      splashFactory: NoSplash.splashFactory,
      highlightColor: Colors.transparent,
      splashColor: Colors.transparent,
      extensions: const [AppColorsExtension.light],
    );
  }
}
