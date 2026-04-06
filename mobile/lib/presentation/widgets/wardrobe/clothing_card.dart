import 'package:flutter/material.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';

class ClothingCard extends StatelessWidget {
  final String name;
  final String category;
  final String? imageUrl;
  final Color accentColor;
  final VoidCallback? onTap;
  final VoidCallback? onRemove;
  final bool showRemove;

  const ClothingCard({
    super.key,
    required this.name,
    required this.category,
    this.imageUrl,
    this.accentColor = AppColors.gold,
    this.onTap,
    this.onRemove,
    this.showRemove = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Stack(children: [
          _CardContent(
            name: name,
            category: category,
            imageUrl: imageUrl,
            accentColor: accentColor,
          ),
          if (showRemove)
            Positioned(
              top: 8, right: 8,
              child: _RemoveButton(onTap: onRemove),
            ),
        ]),
      ),
    );
  }
}

class _CardContent extends StatelessWidget {
  final String name;
  final String category;
  final String? imageUrl;
  final Color accentColor;

  const _CardContent({
    required this.name,
    required this.category,
    required this.imageUrl,
    required this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
            child: imageUrl != null
                ? Image.network(
                    imageUrl!,
                    fit: BoxFit.cover,
                    width: double.infinity,
                    errorBuilder: (_, __, ___) =>
                        _ImagePlaceholder(color: accentColor),
                  )
                : _ImagePlaceholder(color: accentColor),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppColors.text,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 3),
              _CategoryBadge(label: category, color: accentColor),
            ],
          ),
        ),
      ],
    );
  }
}

class _CategoryBadge extends StatelessWidget {
  final String label;
  final Color color;
  const _CategoryBadge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
        decoration: BoxDecoration(
          color: color.withValues(alpha: .15),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: color,
            fontSize: 10,
            fontWeight: FontWeight.w600,
            letterSpacing: .4,
          ),
        ),
      );
}

class _RemoveButton extends StatelessWidget {
  final VoidCallback? onTap;
  const _RemoveButton({this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          width: 28, height: 28,
          decoration: BoxDecoration(
            color: AppColors.bg.withValues(alpha: .8),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.close_rounded,
              color: AppColors.textSub, size: 16),
        ),
      );
}

class _ImagePlaceholder extends StatelessWidget {
  final Color color;
  const _ImagePlaceholder({required this.color});

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        height: double.infinity,
        color: color.withValues(alpha: .08),
        child: Icon(Icons.checkroom_outlined,
            color: color.withValues(alpha: .4), size: 36),
      );
}