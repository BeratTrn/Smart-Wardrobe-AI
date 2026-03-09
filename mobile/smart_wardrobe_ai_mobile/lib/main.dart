import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:smart_wardrobe_ai/presentation/screens/camera_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/confirm_results_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/context_selection_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/dashboard_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/login_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/onboarding_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/processing_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/recommendation_result_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/register_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/splash_screen.dart';

// Ekranları import ediyoruz

void main() {
  runApp(const SmartWardrobeAI());
}

class SmartWardrobeAI extends StatelessWidget {
  const SmartWardrobeAI({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Smart Wardrobe AI',
      debugShowCheckedModeBanner: false,

      // Global Tema Yapılandırması (Tasarımlarındaki Dark Mode)
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F172A), // Ana arka plan
        primaryColor: const Color(0xFF8B5CF6), // Tasarımdaki Mor Renk
        textTheme: GoogleFonts.poppinsTextTheme(
          Theme.of(context).textTheme,
        ).apply(bodyColor: Colors.white, displayColor: Colors.white),
        useMaterial3: true,
      ),

      // Başlangıç Ekranı
      initialRoute: '/',

      // Rota Yönetimi (Navigation Map)
      routes: {
        '/': (context) => const SplashScreen(),
        '/onboarding': (context) => const OnboardingScreen(),
        '/login': (context) => const LoginScreen(),
        '/register': (context) => const RegisterScreen(),
        '/dashboard': (context) => const DashboardScreen(),
        '/camera': (context) => const CameraScreen(),
        '/processing': (context) => const ProcessingScreen(),
        '/confirm_results': (context) => const ConfirmResultsScreen(),
        '/context_selection': (context) => const ContextSelectionScreen(),
        '/recommendation_result': (context) =>
            const RecommendationResultScreen(),
      },
    );
  }
}
