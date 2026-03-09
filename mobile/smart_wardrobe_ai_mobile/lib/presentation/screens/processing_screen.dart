import 'package:flutter/material.dart';

class ProcessingScreen extends StatefulWidget {
  const ProcessingScreen({super.key});

  @override
  State<ProcessingScreen> createState() => _ProcessingScreenState();
}

class _ProcessingScreenState extends State<ProcessingScreen> {
  @override
  void initState() {
    super.initState();
    // Simüle edilmiş AI analizi süresi
    Future.delayed(const Duration(seconds: 3), () {
      Navigator.pushReplacementNamed(context, '/confirm_results');
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(color: Color(0xFF8B5CF6)),
            const SizedBox(height: 40),
            const Text("Analiz Ediliyor", style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            const Text("Yapay Zeka kıyafetini inceliyor...", style: TextStyle(color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}