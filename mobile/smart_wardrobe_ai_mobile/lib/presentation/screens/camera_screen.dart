import 'package:flutter/material.dart';

class CameraScreen extends StatelessWidget {
  const CameraScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Kamera Önizleme (Placeholder)
          const Center(child: Icon(Icons.camera_alt, color: Colors.white, size: 100)),
          
          // AI Tarıyor Etiketi
          Positioned(
            top: 60,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFF8B5CF6)),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Text("✨ AI TARIYOR", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ),
          ),

          // Kapatma Butonu
          Positioned(top: 60, left: 24, child: IconButton(icon: const Icon(Icons.close, color: Colors.white), onPressed: () => Navigator.pop(context))),

          // Alt Kontroller
          Positioned(
            bottom: 50,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                const Icon(Icons.photo_library, color: Colors.white, size: 30),
                GestureDetector(
                  onTap: () => Navigator.pushNamed(context, '/processing'),
                  child: Container(
                    height: 80,
                    width: 80,
                    decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 4)),
                    child: Container(margin: const EdgeInsets.all(5), decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle)),
                  ),
                ),
                const Icon(Icons.flash_off, color: Colors.white, size: 30),
              ],
            ),
          ),
        ],
      ),
    );
  }
}