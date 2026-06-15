import 'package:flutter/material.dart';
import 'package:smart_wardrobe_ai/core/theme/app_theme_extension.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_text_styles.dart';

/// Bölüm başlığı (GÖRÜNÜM & DİL, BİLDİRİMLER, vb.)
class ProfileSectionLabel extends StatelessWidget {
  final String label;
  const ProfileSectionLabel({super.key, required this.label});

  @override
  Widget build(BuildContext context) {
    final c = AppColorsExtension.of(context);
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(22, 20, 22, 0),
        child: Text(
          label,
          style: AppTextStyles.label.copyWith(
            color: c.muted,
            letterSpacing: 2,
          ),
        ),
      ),
    );
  }
}

/// Kart konteyneri — ayar tile'larını sarar.
/// Light modda beyaz kart + hafif gölge, dark modda surface rengi.
class ProfileSettingsCard extends StatelessWidget {
  final List<Widget> children;
  const ProfileSettingsCard({super.key, required this.children});

  @override
  Widget build(BuildContext context) {
    final c = AppColorsExtension.of(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
        boxShadow: isDark
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: .03),
                  offset: const Offset(0, 4),
                  blurRadius: 20,
                ),
              ],
      ),
      child: Column(children: children),
    );
  }
}

/// Switch'li ayar satırı
class ProfileToggleTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  const ProfileToggleTile({
    super.key,
    required this.icon,
    required this.label,
    this.subtitle,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final c = AppColorsExtension.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 12, 10),
      child: Row(
        children: [
          _IconBox(icon: icon, color: c.textSub),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: c.text,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (subtitle != null)
                  Text(
                    subtitle!,
                    style: AppTextStyles.caption.copyWith(
                      color: c.muted,
                      fontSize: 11,
                    ),
                  ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: c.gold,
            activeTrackColor: c.goldDim,
            inactiveTrackColor: c.border,
            inactiveThumbColor: c.muted,
            trackOutlineColor: WidgetStateProperty.all(Colors.transparent),
          ),
        ],
      ),
    );
  }
}

/// Ok ikonlu (chevron) ayar satırı
class ProfileNavTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? iconColor;
  final Color? textColor;
  final Widget? trailing;

  const ProfileNavTile({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
    this.iconColor,
    this.textColor,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    final c = AppColorsExtension.of(context);
    final resolvedIcon = iconColor ?? c.textSub;
    final resolvedText = textColor ?? c.text;

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
        child: Row(
          children: [
            _IconBox(icon: icon, color: resolvedIcon),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: resolvedText,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            trailing ??
                Icon(Icons.chevron_right_rounded, color: c.muted, size: 20),
          ],
        ),
      ),
    );
  }
}

/// Ayarlar satırları arasındaki ince ayırıcı
class ProfileTileDivider extends StatelessWidget {
  const ProfileTileDivider({super.key});

  @override
  Widget build(BuildContext context) {
    final c = AppColorsExtension.of(context);
    return Divider(
      height: 1,
      thickness: 1,
      color: c.border,
      indent: 62,
    );
  }
}

// Yardımcı: ikon kutusu (tema-aware)
class _IconBox extends StatelessWidget {
  final IconData icon;
  final Color color;
  const _IconBox({required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    final c = AppColorsExtension.of(context);
    return Container(
      width: 34,
      height: 34,
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: c.border),
      ),
      child: Icon(icon, color: color, size: 17),
    );
  }
}
