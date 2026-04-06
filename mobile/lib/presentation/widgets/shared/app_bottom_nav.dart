import 'package:flutter/material.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';

/// Uygulamanın 5 sekmeli alt navigasyon çubuğu.
/// Her ekran bu widget'ı kendi Scaffold'una ekler.
/// [onTap] index 2 (Ekle) için push işlemini ekran halleder.
class AppBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const AppBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  static const List<_NavItem> _items = [
    _NavItem(
      activeIcon: Icons.home_rounded,
      icon: Icons.home_outlined,
      label: 'Home',
    ),
    _NavItem(
      activeIcon: Icons.favorite_rounded,
      icon: Icons.favorite_border_rounded,
      label: 'Favori',
    ),
    _NavItem(
      activeIcon: Icons.add_circle_rounded,
      icon: Icons.add_circle_rounded,
      label: 'Ekle',
    ),
    _NavItem(
      activeIcon: Icons.style_rounded,
      icon: Icons.style_outlined,
      label: 'Dene',
    ),
    _NavItem(
      activeIcon: Icons.checkroom_rounded,
      icon: Icons.checkroom_outlined,
      label: 'Dolap',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).padding.bottom;

    return Container(
      height: 68 + bottomPadding,
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border, width: 1)),
      ),
      padding: EdgeInsets.only(bottom: bottomPadding),
      child: Row(
        children: List.generate(_items.length, (i) => _buildTab(context, i)),
      ),
    );
  }

  Widget _buildTab(BuildContext context, int index) {
    final item = _items[index];
    final active = index == currentIndex;
    final isAdd = index == 2;

    return Expanded(
      child: GestureDetector(
        onTap: () => onTap(index),
        behavior: HitTestBehavior.opaque,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (isAdd) _AddButton() else _TabIcon(item: item, active: active),
            if (!isAdd) ...[
              const SizedBox(height: 3),
              _TabLabel(label: item.label, active: active),
            ],
          ],
        ),
      ),
    );
  }
}

// Alt widget'lar

class _AddButton extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    width: 46,
    height: 46,
    decoration: BoxDecoration(
      gradient: const LinearGradient(
        colors: [AppColors.gold, AppColors.goldLight],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      borderRadius: BorderRadius.circular(14),
      boxShadow: [
        BoxShadow(
          color: AppColors.gold.withValues(alpha: .4),
          blurRadius: 14,
          offset: const Offset(0, 4),
        ),
      ],
    ),
    child: const Icon(Icons.add_rounded, color: Colors.black, size: 26),
  );
}

class _TabIcon extends StatelessWidget {
  final _NavItem item;
  final bool active;
  const _TabIcon({required this.item, required this.active});

  @override
  Widget build(BuildContext context) => Icon(
    active ? item.activeIcon : item.icon,
    color: active ? AppColors.gold : AppColors.muted,
    size: 22,
  );
}

class _TabLabel extends StatelessWidget {
  final String label;
  final bool active;
  const _TabLabel({required this.label, required this.active});

  @override
  Widget build(BuildContext context) => Text(
    label,
    style: TextStyle(
      fontSize: 10,
      fontWeight: active ? FontWeight.w600 : FontWeight.w400,
      color: active ? AppColors.gold : AppColors.muted,
    ),
  );
}

// Model

class _NavItem {
  final IconData activeIcon;
  final IconData icon;
  final String label;

  const _NavItem({
    required this.activeIcon,
    required this.icon,
    required this.label,
  });
}
