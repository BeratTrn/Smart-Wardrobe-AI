import 'package:flutter/material.dart';
import 'package:smart_wardrobe_ai/presentation/screens/login_screen.dart';

void main() {
  runApp(const SmartWardrobeAI());
}

class SmartWardrobeAI extends StatelessWidget {
  const SmartWardrobeAI({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Smart Wardrobe AI',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      debugShowCheckedModeBanner:
          false, // Sağ üstteki çirkin DEBUG yazısını kaldırır
      home: const LoginScreen(), // Uygulama açılır açılmaz Login ekranına gider
    );
  }
}
