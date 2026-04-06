import 'package:flutter/material.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';


/// Gizlilik Politikası veya Yardım & Destek için bilgi diyaloğu
class ProfileInfoDialog extends StatelessWidget {
  final String title;
  final IconData icon;
  final String content;

  const ProfileInfoDialog({
    super.key,
    required this.title,
    required this.icon,
    required this.content,
  });

  @override
  Widget build(BuildContext context) => Dialog(
    backgroundColor: AppColors.card,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Başlık satırı
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.gold.withValues(alpha: .12),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: AppColors.gold, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontFamily: 'Cormorant',
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: AppColors.text,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(height: 1, color: AppColors.border),
          const SizedBox(height: 16),
          // ── İçerik
          Text(
            content,
            style: const TextStyle(
              color: AppColors.textSub,
              fontSize: 13,
              height: 1.6,
            ),
          ),
          const SizedBox(height: 24),
          // ── Kapat butonu
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: const Center(
                child: Text(
                  'Tamam',
                  style: TextStyle(color: AppColors.textSub, fontSize: 14),
                ),
              ),
            ),
          ),
        ],
      ),
    ),
  );
}
