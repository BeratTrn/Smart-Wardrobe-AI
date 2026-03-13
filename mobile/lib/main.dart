import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
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

// SharedPreferences'e göre başlangıç ekranını belirler.
Future<Widget> _resolveStartScreen() async {
  final prefs = await SharedPreferences.getInstance();

  final onboardingDone = prefs.getBool('onboardingDone') ?? false;
  if (!onboardingDone) return const OnboardingScreen();

  final token = prefs.getString('token') ?? '';
  if (token.isEmpty) return const LoginScreen();

  return const HomeScreen();
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
