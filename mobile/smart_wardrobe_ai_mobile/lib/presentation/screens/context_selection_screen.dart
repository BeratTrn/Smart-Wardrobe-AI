import 'package:flutter/material.dart';

class ContextSelectionScreen extends StatefulWidget {
  const ContextSelectionScreen({super.key});

  @override
  State<ContextSelectionScreen> createState() => _ContextSelectionScreenState();
}

class _ContextSelectionScreenState extends State<ContextSelectionScreen> {
  String selectedContext = "İş / Ofis"; // Varsayılan seçim

  // Tasarımdaki seçenekler
  final List<Map<String, dynamic>> contexts = [
    {"name": "İş / Ofis", "icon": Icons.work_outline},
    {"name": "Okul", "icon": Icons.school_outlined},
    {"name": "Arkadaş Buluşması", "icon": Icons.coffee_outlined},
    {"name": "Spor", "icon": Icons.fitness_center_outlined},
    {"name": "Düğün / Davet", "icon": Icons.nightlife_outlined},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(backgroundColor: Colors.transparent, elevation: 0),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Nereye\nGidiyorsun?", 
              style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            const Text("Sana en uygun stili bulmamız için birini seç.", 
              style: TextStyle(color: Colors.grey, fontSize: 16)),
            const SizedBox(height: 32),
            Expanded(
              child: GridView.builder(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2, crossAxisSpacing: 16, mainAxisSpacing: 16),
                itemCount: contexts.length,
                itemBuilder: (context, index) {
                  final item = contexts[index];
                  final isSelected = selectedContext == item["name"];
                  return GestureDetector(
                    onTap: () => setState(() => selectedContext = item["name"]),
                    child: Container(
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFF8B5CF6).withOpacity(0.2) : const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: isSelected ? const Color(0xFF8B5CF6) : Colors.transparent, width: 2),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(item["icon"], color: isSelected ? const Color(0xFF8B5CF6) : Colors.white, size: 40),
                          const SizedBox(height: 12),
                          Text(item["name"], style: TextStyle(color: isSelected ? Colors.white : Colors.grey, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF8B5CF6),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                onPressed: () => Navigator.pushNamed(context, '/recommendation_result'),
                child: const Text("Kombin Oluştur", style: TextStyle(color: Colors.white, fontSize: 18)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}