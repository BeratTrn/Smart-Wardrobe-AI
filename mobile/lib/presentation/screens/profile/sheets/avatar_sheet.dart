import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/core/utils/avatar_manager.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/profile/profile_shared_widgets.dart';

/// Avatar seçme bottom sheet — 4×2 grid, tek tıkla seç ve kapat.
class AvatarSheet extends StatefulWidget {
  final String? currentPhoto;
  final ValueChanged<String> onSelected;

  const AvatarSheet({super.key, required this.onSelected, this.currentPhoto});

  @override
  State<AvatarSheet> createState() => _AvatarSheetState();
}

class _AvatarSheetState extends State<AvatarSheet> {
  late String? _hovered;

  @override
  void initState() {
    super.initState();
    _hovered = widget.currentPhoto;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsets.fromLTRB(
        24,
        16,
        24,
        28 + MediaQuery.of(context).padding.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Handle
          const Center(child: ProfileSheetHandle()),
          const SizedBox(height: 22),

          // ── Header
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppColors.gold.withValues(alpha: .18),
                      AppColors.goldLight.withValues(alpha: .08),
                    ],
                  ),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: AppColors.gold.withValues(alpha: .30),
                    width: .8,
                  ),
                ),
                child: const Icon(
                  Icons.face_retouching_natural_rounded,
                  color: AppColors.goldLight,
                  size: 18,
                ),
              ),
              const SizedBox(width: 12),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Avatar Seç',
                    style: TextStyle(
                      fontFamily: 'Cormorant',
                      fontSize: 21,
                      fontWeight: FontWeight.w700,
                      color: AppColors.text,
                      letterSpacing: -.2,
                    ),
                  ),
                  Text(
                    'Profil fotoğrafını özelleştir',
                    style: TextStyle(
                      color: AppColors.muted,
                      fontSize: 11,
                      letterSpacing: .2,
                    ),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 6),

          // ── Bölüm etiketi: Erkek
          _SectionLabel('ERKEK'),
          const SizedBox(height: 10),
          _AvatarRow(
            paths: AvatarManager.all.sublist(0, 4),
            selected: _hovered,
            onTap: _onTap,
          ),

          const SizedBox(height: 16),

          // ── Bölüm etiketi: Kadın
          _SectionLabel('KADIN'),
          const SizedBox(height: 10),
          _AvatarRow(
            paths: AvatarManager.all.sublist(4, 8),
            selected: _hovered,
            onTap: _onTap,
          ),

          const SizedBox(height: 8),
        ],
      ),
    );
  }

  void _onTap(String path) {
    HapticFeedback.selectionClick();
    setState(() => _hovered = path);
    // Seçimi bildir ve sheet'i kapat
    widget.onSelected(path);
    Navigator.pop(context);
  }
}

// ─── Row of 4 avatars ─────────────────────────────────────────────────────────

class _AvatarRow extends StatelessWidget {
  final List<String> paths;
  final String? selected;
  final ValueChanged<String> onTap;

  const _AvatarRow({
    required this.paths,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: paths
          .map(
            (p) =>
                _AvatarCell(path: p, isSelected: selected == p, onTap: onTap),
          )
          .toList(),
    );
  }
}

// ─── Single avatar cell ───────────────────────────────────────────────────────

class _AvatarCell extends StatelessWidget {
  final String path;
  final bool isSelected;
  final ValueChanged<String> onTap;

  const _AvatarCell({
    required this.path,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onTap(path),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
        width: 72,
        height: 72,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
            color: isSelected
                ? AppColors.gold.withValues(alpha: .85)
                : AppColors.border,
            width: isSelected ? 2.5 : 1.5,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppColors.gold.withValues(alpha: .35),
                    blurRadius: 18,
                    spreadRadius: 2,
                  ),
                ]
              : null,
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Avatar image
            ClipOval(
              child: Image.asset(
                path,
                width: 68,
                height: 68,
                fit: BoxFit.cover,
              ),
            ),
            // Selection overlay
            if (isSelected)
              Positioned(
                bottom: 2,
                right: 2,
                child: Container(
                  width: 20,
                  height: 20,
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [AppColors.gold, AppColors.goldLight],
                    ),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_rounded,
                    color: Colors.black,
                    size: 12,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ─── Section label ────────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Container(width: 14, height: 1, color: AppColors.goldDim),
      const SizedBox(width: 6),
      Text(
        text,
        style: const TextStyle(
          color: AppColors.muted,
          fontSize: 9,
          fontWeight: FontWeight.w600,
          letterSpacing: 2.5,
        ),
      ),
    ],
  );
}
