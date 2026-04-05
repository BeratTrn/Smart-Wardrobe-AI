import 'package:flutter/material.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_text_styles.dart';

/// Sayfanın alt kısmındaki logo + versiyon footer'ı
class ProfileFooter extends StatelessWidget {
  const ProfileFooter({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 32, 22, 48),
      child: Column(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.gold, AppColors.goldLight],
              ),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: AppColors.gold.withOpacity(.2),
                  blurRadius: 12,
                ),
              ],
            ),
            child: const Icon(
              Icons.checkroom_rounded,
              color: Colors.black,
              size: 20,
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'Smart Wardrobe AI',
            style: TextStyle(
              fontFamily: 'Cormorant',
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppColors.textSub,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            'v1.0.0',
            style: AppTextStyles.caption.copyWith(fontSize: 11, color: AppColors.muted),
          ),
        ],
      ),
    );
  }
}
