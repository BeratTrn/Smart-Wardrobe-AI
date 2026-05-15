import 'package:flutter/material.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/core/utils/avatar_manager.dart';
import 'package:smart_wardrobe_ai/data/models/user_profile.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_text_styles.dart';

/// Profil sayfasının üst bölümü.
///
/// İKİ ayrı dokunma bölgesi:
///  • Avatar dairesi  → [onAvatarTap]  — avatar seçici sheet'i açar
///  • Kamera rozeti   → [onCameraTap]  — galeri/kamera seçici açar
class ProfileHeader extends StatelessWidget {
  final UserProfile? profile;

  /// Null veya boş ise baş harfi gösterilir.
  final String? profilePhoto;

  /// Fotoğraf yüklenirken true — kamera rozetinde spinner gösterir.
  final bool uploading;

  final VoidCallback onAvatarTap;
  final VoidCallback onCameraTap;

  const ProfileHeader({
    super.key,
    required this.profile,
    required this.onAvatarTap,
    required this.onCameraTap,
    this.profilePhoto,
    this.uploading = false,
  });

  @override
  Widget build(BuildContext context) {
    final initial =
        (profile?.name.isNotEmpty == true) ? profile!.name[0].toUpperCase() : 'S';

    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 20, 22, 20),
      child: Row(
        children: [
          // ── Avatar + kamera rozeti
          SizedBox(
            width: 76,
            height: 76,
            child: Stack(
              children: [
                // Ana avatar dairesi
                GestureDetector(
                  onTap: onAvatarTap,
                  child: Hero(
                    tag: 'profile_avatar',
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 350),
                      switchInCurve: Curves.easeOut,
                      switchOutCurve: Curves.easeIn,
                      transitionBuilder: (child, anim) =>
                          FadeTransition(opacity: anim, child: child),
                      child: _AvatarCircle(
                        key: ValueKey(profilePhoto ?? '__initials__'),
                        profilePhoto: profilePhoto,
                        initial: initial,
                      ),
                    ),
                  ),
                ),

                // Kamera rozeti — ayrı gesture
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: GestureDetector(
                    onTap: uploading ? null : onCameraTap,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [AppColors.gold, AppColors.goldLight],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.bg, width: 2),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.gold.withValues(alpha: .50),
                            blurRadius: 10,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: uploading
                          ? const Padding(
                              padding: EdgeInsets.all(6),
                              child: CircularProgressIndicator(
                                color: Colors.black,
                                strokeWidth: 1.8,
                              ),
                            )
                          : const Icon(
                              Icons.camera_alt_rounded,
                              color: Colors.black,
                              size: 14,
                            ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(width: 16),

          // ── İsim + e-posta
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  profile?.name.isNotEmpty == true ? profile!.name : '—',
                  style: const TextStyle(
                    fontFamily: 'Cormorant',
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: AppColors.text,
                    letterSpacing: -.3,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  profile?.email ?? '',
                  style: AppTextStyles.caption.copyWith(fontSize: 12),
                ),
                const SizedBox(height: 6),
                // Avatar / kamera ipucu
                Row(
                  children: [
                    Icon(
                      Icons.touch_app_outlined,
                      size: 10,
                      color: AppColors.muted.withValues(alpha: .6),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Fotoğrafa dokun',
                      style: TextStyle(
                        color: AppColors.muted.withValues(alpha: .7),
                        fontSize: 10,
                        letterSpacing: .2,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Avatar dairesi — asset / network / baş harf ─────────────────────────────

class _AvatarCircle extends StatelessWidget {
  final String? profilePhoto;
  final String initial;

  const _AvatarCircle({
    super.key,
    required this.profilePhoto,
    required this.initial,
  });

  @override
  Widget build(BuildContext context) {
    final isAsset   = AvatarManager.isAsset(profilePhoto);
    final isNetwork = AvatarManager.isNetwork(profilePhoto);

    if (isAsset) {
      return _Circle(
        child: ClipOval(
          child: Image.asset(
            profilePhoto!,
            width: 72,
            height: 72,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => _Initials(initial),
          ),
        ),
      );
    }

    if (isNetwork) {
      return _Circle(
        child: ClipOval(
          child: Image.network(
            profilePhoto!,
            width: 72,
            height: 72,
            fit: BoxFit.cover,
            loadingBuilder: (_, child, progress) {
              if (progress == null) return child;
              return const Center(
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    color: AppColors.gold,
                    strokeWidth: 1.5,
                  ),
                ),
              );
            },
            errorBuilder: (_, __, ___) => _Initials(initial),
          ),
        ),
      );
    }

    // Fotoğraf yok → baş harf
    return _Circle(child: _Initials(initial));
  }
}

class _Circle extends StatelessWidget {
  final Widget child;
  const _Circle({required this.child});

  @override
  Widget build(BuildContext context) => Container(
        width: 72,
        height: 72,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppColors.gold, AppColors.goldLight],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: AppColors.gold.withValues(alpha: .35),
              blurRadius: 18,
              offset: const Offset(0, 5),
            ),
          ],
        ),
        child: child,
      );
}

class _Initials extends StatelessWidget {
  final String initial;
  const _Initials(this.initial);

  @override
  Widget build(BuildContext context) => Center(
        child: Text(
          initial,
          style: const TextStyle(
            fontFamily: 'Cormorant',
            fontSize: 32,
            fontWeight: FontWeight.w700,
            color: Colors.black,
          ),
        ),
      );
}
