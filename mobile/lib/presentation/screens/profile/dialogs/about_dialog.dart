import 'package:flutter/material.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_text_styles.dart';

/// "Smart Wardrobe AI hakkında" dialog
class ProfileAboutDialog extends StatelessWidget {
  const ProfileAboutDialog({super.key});

  @override
  Widget build(BuildContext context) => Dialog(
    backgroundColor: AppColors.card,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    child: Padding(
      padding: const EdgeInsets.all(28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // ── Logo
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.gold, AppColors.goldLight],
              ),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: AppColors.gold.withValues(alpha: .3),
                  blurRadius: 16,
                ),
              ],
            ),
            child: const Icon(
              Icons.checkroom_rounded,
              color: Colors.black,
              size: 26,
            ),
          ),
          const SizedBox(height: 14),
          // ── Uygulama adı
          const Text(
            'Smart Wardrobe AI',
            style: TextStyle(
              fontFamily: 'Cormorant',
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppColors.text,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Versiyon 1.0.0',
            style: AppTextStyles.caption.copyWith(color: AppColors.muted),
          ),
          const SizedBox(height: 12),
          const Text(
            'AI destekli akıllı gardırop asistanın.\nHer gün en iyi kombinini seç.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.textSub,
              fontSize: 13,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 24),
          // ── Kapat
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
                  'Kapat',
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
