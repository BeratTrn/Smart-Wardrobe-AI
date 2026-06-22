import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/core/theme/app_theme_extension.dart';

/// Standart onay / iptal iletişim kutusu
class ProfileConfirmDialog extends StatelessWidget {
  final String title;
  final String body;
  final String confirmLabel;
  final bool isDanger;

  const ProfileConfirmDialog({
    super.key,
    required this.title,
    required this.body,
    required this.confirmLabel,
    this.isDanger = false,
  });

  @override
  Widget build(BuildContext context) => Dialog(
    backgroundColor: AppColorsExtension.of(context).card,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // İkon
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: (isDanger ? AppColors.error : AppColors.gold).withValues(
                alpha: .12,
              ),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isDanger
                  ? Icons.warning_amber_rounded
                  : Icons.check_circle_outline_rounded,
              color: isDanger ? AppColors.error : AppColors.gold,
              size: 24,
            ),
          ),
          const SizedBox(height: 14),
          // Başlık
          Text(
            title,
            style: TextStyle(
              fontFamily: 'Cormorant',
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppColorsExtension.of(context).text,
            ),
          ),
          const SizedBox(height: 8),
          // Açıklama
          Text(
            body,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColorsExtension.of(context).textSub,
              fontSize: 13,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 24),
          // Butonlar
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => Navigator.pop(context, false),
                  child: Container(
                    height: 46,
                    decoration: BoxDecoration(
                      color: AppColorsExtension.of(context).surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColorsExtension.of(context).border),
                    ),
                    child: Center(
                      child: Text(
                        'confirm.cancel'.tr(),
                        style: TextStyle(
                          color: AppColorsExtension.of(context).textSub,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: GestureDetector(
                  onTap: () => Navigator.pop(context, true),
                  child: Container(
                    height: 46,
                    decoration: BoxDecoration(
                      color: isDanger ? AppColors.error : AppColors.gold,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        confirmLabel,
                        style: TextStyle(
                          color: isDanger ? Colors.white : Colors.black,
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}
