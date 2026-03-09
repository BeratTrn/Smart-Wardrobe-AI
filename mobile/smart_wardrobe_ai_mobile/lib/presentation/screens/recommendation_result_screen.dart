import 'package:flutter/material.dart';

class RecommendationResultScreen extends StatelessWidget {
  const RecommendationResultScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(backgroundColor: Colors.transparent, title: const Text("Günün Kombini"), centerTitle: true),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            // AI Stilist Notu
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(16)),
              child: Row(
                children: const [
                  Icon(Icons.auto_awesome, color: Color(0xFF8B5CF6)),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      "Bugün hava yağmurlu olduğu için sana botlarını ve üzerine su geçirmeyen trençkotunu önerdim.",
                      style: TextStyle(color: Colors.white70, fontStyle: FontStyle.italic),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 30),
            
            // Kombin Görselleştirme Alanı
            Expanded(
              child: Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B).withOpacity(0.5),
                  borderRadius: BorderRadius.circular(32),
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _buildClothingItem("Trençkot", "Dış Giyim"),
                      const SizedBox(height: 10),
                      _buildClothingItem("Jean", "Alt Giyim"),
                      const SizedBox(height: 10),
                      _buildClothingItem("Bot", "Ayakkabı"),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 30),
            
            // Aksiyon Butonları
            Row(
              children: [
                _actionButton(Icons.close, Colors.redAccent, () => Navigator.pop(context)),
                const SizedBox(width: 16),
                Expanded(
                  child: SizedBox(
                    height: 56,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF8B5CF6),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                      onPressed: () {},
                      child: const Text("Kombini Kaydet", style: TextStyle(color: Colors.white, fontSize: 18)),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                _actionButton(Icons.refresh, Colors.blueAccent, () {}),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildClothingItem(String name, String category) {
    return Container(
      width: 200,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: [
          const Icon(Icons.check_circle_outline, color: Color(0xFF8B5CF6), size: 20),
          const SizedBox(width: 10),
          Text(name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _actionButton(IconData icon, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: color.withOpacity(0.2), shape: BoxShape.circle),
        child: Icon(icon, color: color),
      ),
    );
  }
}