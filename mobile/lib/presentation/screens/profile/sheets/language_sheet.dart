import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/profile/profile_shared_widgets.dart';

/// Dil seçim bottom sheet'i
class LanguageSheet extends StatelessWidget {
  final String selected;
  final List<String> languages;
  final ValueChanged<String> onSelect;

  const LanguageSheet({
    super.key,
    required this.selected,
    required this.languages,
    required this.onSelect,
  });

  static const Map<String, String> _flags = {
    'Türkçe': '🇹🇷',
    'English': '🇬🇧',
    'Deutsch': '🇩🇪',
    'Français': '🇫🇷',
  };

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(22, 24, 22, 40),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const ProfileSheetHandle(),
          const SizedBox(height: 20),
          const Text(
            'Dil Seç',
            style: TextStyle(
              fontFamily: 'Cormorant',
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppColors.text,
            ),
          ),
          const SizedBox(height: 16),
          ...languages.map((lang) => _LanguageItem(
                lang: lang,
                flag: _flags[lang] ?? '🌐',
                isSelected: lang == selected,
                onTap: () {
                  HapticFeedback.selectionClick();
                  onSelect(lang);
                  Navigator.pop(context);
                },
              )),
        ],
      ),
    );
  }
}

class _LanguageItem extends StatelessWidget {
  final String lang;
  final String flag;
  final bool isSelected;
  final VoidCallback onTap;

  const _LanguageItem({
    required this.lang,
    required this.flag,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: isSelected ? AppColors.gold.withValues(alpha: .10) : AppColors.bg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isSelected ? AppColors.gold : AppColors.border,
          width: isSelected ? 1.5 : 1,
        ),
      ),
      child: Row(
        children: [
          Text(flag, style: const TextStyle(fontSize: 20)),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              lang,
              style: TextStyle(
                color: isSelected ? AppColors.gold : AppColors.text,
                fontSize: 15,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ),
          if (isSelected)
            const Icon(Icons.check_rounded, color: AppColors.gold, size: 18),
        ],
      ),
    ),
  );
}
