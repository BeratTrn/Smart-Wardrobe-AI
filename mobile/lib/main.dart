import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/presentation/screens/auth/login_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/home_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/startup/onboarding_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Portrait lock
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Şeffaf status bar
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(0xFF0A0A0A),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  final startScreen = await _resolveStartScreen();

  runApp(SmartWardrobeApp(startScreen: startScreen));
}

// SharedPreferences'e göre ve backend'i doğrulayarak başlangıç ekranını belirler.
Future<Widget> _resolveStartScreen() async {
  final prefs = await SharedPreferences.getInstance();

  // 1. Onboarding tamamlanmamışsa oraya gönder
  final onboardingDone = prefs.getBool('onboardingDone') ?? false;
  if (!onboardingDone) return const OnboardingScreen();

  // 2. Token yoksa Login'e gönder
  final token = prefs.getString('token') ?? '';
  if (token.isEmpty) return const LoginScreen();

  // 3. Token var — backend'e doğrulat (/api/auth/me)
  try {
    final res = await http
        .get(
          Uri.parse('${ApiConstants.baseUrl}/auth/me'),
          headers: {'Authorization': 'Bearer $token'},
        )
        .timeout(const Duration(seconds: 8));

    if (res.statusCode == 200) {
      // Token geçerli → Ana sayfaya
      return const HomeScreen();
    } else {
      // Token geçersiz/süresi dolmuş → temizle ve Login'e
      await prefs.remove('token');
      await prefs.remove('userName');
      return const LoginScreen();
    }
  } catch (_) {
    // Sunucuya ulaşılamadı (internet yok vb.) →
    // Token'ı silmeden Login'e yönlendir (internet geldiğinde tekrar dener)
    return const LoginScreen();
  }
}

// UYGULAMA KÖKÜ

class SmartWardrobeApp extends StatelessWidget {
  final Widget startScreen;
  const SmartWardrobeApp({super.key, required this.startScreen});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Smart Wardrobe AI',
      debugShowCheckedModeBanner: false,
      theme: _buildTheme(),
      home: startScreen,
    );
  }

  ThemeData _buildTheme() {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: const Color(0xFF0A0A0A),
      colorScheme: const ColorScheme.dark(
        primary: Color(0xFFC9A84C),
        secondary: Color(0xFFE8C97A),
        surface: Color(0xFF141414),
        error: Color(0xFFB04040),
      ),
      fontFamily: 'Cormorant',
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: CupertinoPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),
      splashFactory: NoSplash.splashFactory,
      highlightColor: Colors.transparent,
      splashColor: Colors.transparent,
    );
  }
}
