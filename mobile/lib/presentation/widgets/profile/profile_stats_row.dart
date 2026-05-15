import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/data/models/user_profile.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_text_styles.dart';

/// 3-column premium stats card: Kıyafet | Kombin | Favori
/// Each column has a gold icon, large number, and label.
/// The card uses a subtle gold-glow border + glassmorphism background.
class ProfileStatsRow extends StatelessWidget {
  final UserProfile profile;
  const ProfileStatsRow({super.key, required this.profile});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 18),
          decoration: BoxDecoration(
            color: AppColors.surface.withValues(alpha: .92),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: AppColors.gold.withValues(alpha: .20),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.gold.withValues(alpha: .06),
                blurRadius: 20,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Row(
            children: [
              _StatItem(
                icon: Icons.checkroom_outlined,
                value: '${profile.totalItems}',
                label: 'Kıyafet',
              ),
              _VertDivider(),
              _StatItem(
                icon: Icons.auto_awesome_rounded,
                value: '${profile.totalOutfits}',
                label: 'Kombin',
              ),
              _VertDivider(),
              _StatItem(
                icon: Icons.favorite_border_rounded,
                value: '${profile.totalFavorites}',
                label: 'Favori',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final IconData icon;
  final String value, label;
  const _StatItem({
    required this.icon,
    required this.value,
    required this.label,
  });

  @override
  Widget build(BuildContext context) => Expanded(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Icon in a subtle gold tinted pill
            Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: AppColors.gold.withValues(alpha: .10),
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.gold.withValues(alpha: .22),
                  width: .8,
                ),
              ),
              child: Icon(icon, color: AppColors.goldLight, size: 15),
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(
                fontFamily: 'Cormorant',
                fontSize: 26,
                fontWeight: FontWeight.w700,
                color: AppColors.gold,
                letterSpacing: -.5,
              ),
            ),
            const SizedBox(height: 2),
            Text(label, style: AppTextStyles.caption.copyWith(fontSize: 11)),
          ],
        ),
      );
}

class _VertDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
        width: 1,
        height: 50,
        color: AppColors.border,
      );
}
