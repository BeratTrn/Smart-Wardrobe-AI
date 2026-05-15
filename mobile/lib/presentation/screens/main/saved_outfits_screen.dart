// ─────────────────────────────────────────────────────────────────────────────
//  KOMBİNLERİM — Kaydedilen stil kombinlerinin listesi
//  BottomNav index 3 — Dark / Gold tema, premium kart tasarımı.
// ─────────────────────────────────────────────────────────────────────────────

import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/core/utils/nav_transitions.dart';
import 'package:smart_wardrobe_ai/data/models/clothing_item.dart';
import 'package:smart_wardrobe_ai/data/models/saved_outfit.dart';
import 'package:smart_wardrobe_ai/data/services/saved_outfits_store.dart';
import 'package:smart_wardrobe_ai/presentation/screens/item/add_item_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/favorites_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/home_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/wardrobe_screen.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_background.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_bottom_nav.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_text_styles.dart';

class SavedOutfitsScreen extends StatefulWidget {
  const SavedOutfitsScreen({super.key});

  @override
  State<SavedOutfitsScreen> createState() => _SavedOutfitsScreenState();
}

class _SavedOutfitsScreenState extends State<SavedOutfitsScreen>
    with SingleTickerProviderStateMixin {
  final _store = SavedOutfitsStore.instance;

  late final AnimationController _fadeCtrl;
  late final Animation<double> _fadeAnim;

  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fadeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    )..forward();
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);

    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    await _store.load();
    if (mounted) setState(() => _isLoading = false);
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    super.dispose();
  }

  void _onNavTap(int index) {
    if (index == 3) return; // Zaten bu ekrandayız
    switch (index) {
      case 0:
        Navigator.pushReplacement(context, slide(const HomeScreen()));
        break;
      case 1:
        Navigator.pushReplacement(context, slide(const FavoritesScreen()));
        break;
      case 2:
        Navigator.push(context, slideUp(const AddItemScreen()));
        break;
      case 4:
        Navigator.pushReplacement(context, slide(const WardrobeScreen()));
        break;
    }
  }

  void _confirmDelete(BuildContext ctx, SavedOutfit outfit) {
    showModalBottomSheet(
      context: ctx,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(22, 16, 22, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Indicator
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Kombini Sil',
              style: TextStyle(
                fontFamily: 'Cormorant',
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: AppColors.text,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              '"${outfit.baslik}" kombinini listeden kaldırmak istediğinize emin misiniz?',
              style: const TextStyle(
                color: AppColors.textSub,
                fontSize: 13,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 22),
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => Navigator.pop(ctx),
                    child: Container(
                      height: 48,
                      decoration: BoxDecoration(
                        color: AppColors.bg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: const Center(
                        child: Text(
                          'İptal',
                          style: TextStyle(
                            color: AppColors.textSub,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      Navigator.pop(ctx);
                      _store.delete(outfit.id);
                    },
                    child: Container(
                      height: 48,
                      decoration: BoxDecoration(
                        color: AppColors.error.withValues(alpha: .12),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: AppColors.error.withValues(alpha: .4),
                        ),
                      ),
                      child: const Center(
                        child: Text(
                          'Sil',
                          style: TextStyle(
                            color: AppColors.error,
                            fontWeight: FontWeight.w700,
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      extendBody: true,
      bottomNavigationBar:
          AppBottomNav(currentIndex: 3, onTap: _onNavTap),
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: FadeTransition(
            opacity: _fadeAnim,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Header ──────────────────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.fromLTRB(22, 16, 22, 0),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'STİL ARŞIVI',
                            style: AppTextStyles.label
                                .copyWith(letterSpacing: 2),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            'Kombinlerim',
                            style: TextStyle(
                              fontFamily: 'Cormorant',
                              fontSize: 32,
                              fontWeight: FontWeight.w700,
                              color: AppColors.text,
                              letterSpacing: -.3,
                            ),
                          ),
                        ],
                      ),
                      const Spacer(),
                      // Toplam sayaç — yüklenirken gizle
                      ValueListenableBuilder<List<SavedOutfit>>(
                        valueListenable: _store.outfits,
                        builder: (_, List<SavedOutfit> list, __) =>
                            (_isLoading || list.isEmpty)
                            ? const SizedBox.shrink()
                            : Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: AppColors.gold
                                      .withValues(alpha: .12),
                                  borderRadius:
                                      BorderRadius.circular(20),
                                  border: Border.all(
                                    color: AppColors.gold
                                        .withValues(alpha: .3),
                                  ),
                                ),
                                child: Text(
                                  '${list.length} kombin',
                                  style: AppTextStyles.label.copyWith(
                                    color: AppColors.gold,
                                    fontSize: 11,
                                  ),
                                ),
                              ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // ── İçerik: Yükleniyor / Boş / Liste ────────────────────────
                Expanded(
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 350),
                    switchInCurve: Curves.easeOut,
                    switchOutCurve: Curves.easeIn,
                    child: _isLoading
                        ? const _LoadingSpinner(key: ValueKey('loading'))
                        : ValueListenableBuilder<List<SavedOutfit>>(
                            key: const ValueKey('content'),
                            valueListenable: _store.outfits,
                            builder: (ctx, outfits, __) {
                              if (outfits.isEmpty) {
                                return _EmptyState(key: const ValueKey('empty'));
                              }
                              return ListView.separated(
                                key: const ValueKey('list'),
                                padding: const EdgeInsets.fromLTRB(22, 0, 22, 110),
                                itemCount: outfits.length,
                                separatorBuilder: (_, __) =>
                                    const SizedBox(height: 14),
                                itemBuilder: (_, i) => _OutfitCard(
                                  outfit: outfits[i],
                                  onDelete: () =>
                                      _confirmDelete(ctx, outfits[i]),
                                ),
                              );
                            },
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  BOŞ DURUM
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
//  YÜKLEME DURUMU
// ─────────────────────────────────────────────────────────────────────────────

class _LoadingSpinner extends StatelessWidget {
  const _LoadingSpinner({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 48,
            height: 48,
            child: CircularProgressIndicator(
              strokeWidth: 2.5,
              valueColor: AlwaysStoppedAnimation<Color>(AppColors.gold),
              backgroundColor: AppColors.gold.withValues(alpha: .12),
            ),
          ),
          const SizedBox(height: 18),
          Text(
            'Kombinler yükleniyor...',
            style: TextStyle(
              color: AppColors.textSub,
              fontSize: 13,
              letterSpacing: .3,
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  BOŞ DURUM
// ─────────────────────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  const _EmptyState({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // İkon
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppColors.gold.withValues(alpha: .07),
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.gold.withValues(alpha: .2),
                ),
              ),
              child: const Icon(
                Icons.style_outlined,
                color: AppColors.gold,
                size: 34,
              ),
            ),

            const SizedBox(height: 22),

            const Text(
              'Stil Arşiviniz Boş',
              style: TextStyle(
                fontFamily: 'Cormorant',
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: AppColors.text,
              ),
            ),

            const SizedBox(height: 10),

            const Text(
              'Henüz kaydedilmiş bir kombininiz yok.\nDolabınızdan yeni bir stil oluşturun.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.textSub,
                fontSize: 13,
                height: 1.6,
              ),
            ),

            const SizedBox(height: 28),

            // CTA butonu
            GestureDetector(
              onTap: () => Navigator.pushReplacement(
                context,
                slide(const WardrobeScreen()),
              ),
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 24, vertical: 14),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.gold, AppColors.goldLight],
                  ),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.gold.withValues(alpha: .4),
                      blurRadius: 16,
                      offset: const Offset(0, 5),
                    ),
                  ],
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.checkroom_outlined,
                        color: Colors.black, size: 18),
                    SizedBox(width: 8),
                    Text(
                      'Dolabıma Git',
                      style: TextStyle(
                        color: Colors.black,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  KOMBİN KARTI  (expandable description)
// ─────────────────────────────────────────────────────────────────────────────

class _OutfitCard extends StatefulWidget {
  final SavedOutfit  outfit;
  final VoidCallback onDelete;

  const _OutfitCard({required this.outfit, required this.onDelete});

  @override
  State<_OutfitCard> createState() => _OutfitCardState();
}

class _OutfitCardState extends State<_OutfitCard> {
  bool _isExpanded = false;

  // Açıklamanın gerçekten uzun olup olmadığını kontrol et
  // (kısa metinlerde "Devamını Oku" gösterme)
  bool get _hasLongText =>
      widget.outfit.aciklama.length > 90 ||
      widget.outfit.ipucu.length > 60;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: 0, sigmaY: 0),
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Görsel satırı
              if (widget.outfit.kiyafetler.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                  child: _ItemStrip(items: widget.outfit.kiyafetler),
                ),

              // ── Metin & aksiyon satırı
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 10, 12, 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Sol: başlık + genişleyebilir açıklama
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Occasion etiketi
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors.gold.withValues(alpha: .1),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(
                                color: AppColors.gold.withValues(alpha: .25),
                              ),
                            ),
                            child: Text(
                              widget.outfit.baslik.isNotEmpty
                                  ? widget.outfit.baslik
                                  : 'Kombin',
                              style: AppTextStyles.label.copyWith(
                                color: AppColors.gold,
                                fontSize: 9,
                                letterSpacing: 1.2,
                              ),
                            ),
                          ),

                          const SizedBox(height: 7),

                          // ── AnimatedSize ile genişleyen metin bölgesi ──────
                          AnimatedSize(
                            duration: const Duration(milliseconds: 220),
                            curve: Curves.easeInOut,
                            alignment: Alignment.topCenter,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Açıklama metni
                                if (widget.outfit.aciklama.isNotEmpty)
                                  Text(
                                    widget.outfit.aciklama,
                                    maxLines: _isExpanded ? null : 2,
                                    overflow: _isExpanded
                                        ? TextOverflow.visible
                                        : TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: AppColors.textSub,
                                      fontSize: 12,
                                      height: 1.55,
                                      fontStyle: FontStyle.italic,
                                    ),
                                  ),

                                // İpucu — daraltılmış halde gizli, açılınca görünür
                                if (widget.outfit.ipucu.isNotEmpty &&
                                    _isExpanded) ...[
                                  const SizedBox(height: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 9, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: AppColors.gold
                                          .withValues(alpha: .07),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color: AppColors.gold
                                            .withValues(alpha: .18),
                                      ),
                                    ),
                                    child: Row(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Icon(
                                          Icons.lightbulb_outline_rounded,
                                          color: AppColors.gold,
                                          size: 12,
                                        ),
                                        const SizedBox(width: 5),
                                        Expanded(
                                          child: Text(
                                            widget.outfit.ipucu,
                                            style: const TextStyle(
                                              color: AppColors.gold,
                                              fontSize: 11,
                                              height: 1.45,
                                              fontStyle: FontStyle.italic,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ]
                                // Daraltılmış halde tek satır ipucu önizlemesi
                                else if (widget.outfit.ipucu.isNotEmpty &&
                                    !_isExpanded) ...[
                                  const SizedBox(height: 5),
                                  Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Icon(
                                        Icons.lightbulb_outline_rounded,
                                        color: AppColors.gold,
                                        size: 12,
                                      ),
                                      const SizedBox(width: 4),
                                      Expanded(
                                        child: Text(
                                          widget.outfit.ipucu,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            color: AppColors.gold,
                                            fontSize: 11,
                                            fontStyle: FontStyle.italic,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ],
                            ),
                          ),

                          // ── Devamını Oku / Daralt toggle ──────────────────
                          if (_hasLongText) ...[
                            const SizedBox(height: 6),
                            GestureDetector(
                              onTap: () =>
                                  setState(() => _isExpanded = !_isExpanded),
                              behavior: HitTestBehavior.opaque,
                              child: Padding(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 2),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      _isExpanded
                                          ? 'Daralt'
                                          : 'Devamını Oku...',
                                      style: TextStyle(
                                        color: AppColors.goldDim
                                            .withValues(alpha: .85),
                                        fontSize: 11,
                                        fontWeight: FontWeight.w500,
                                        letterSpacing: .2,
                                      ),
                                    ),
                                    const SizedBox(width: 3),
                                    AnimatedRotation(
                                      turns: _isExpanded ? -.25 : .25,
                                      duration:
                                          const Duration(milliseconds: 220),
                                      child: Icon(
                                        Icons.chevron_right_rounded,
                                        size: 14,
                                        color: AppColors.goldDim
                                            .withValues(alpha: .85),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),

                    const SizedBox(width: 10),

                    // Sağ: Sil butonu
                    GestureDetector(
                      onTap: widget.onDelete,
                      child: Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          color: AppColors.error.withValues(alpha: .08),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: AppColors.error.withValues(alpha: .25),
                          ),
                        ),
                        child: const Icon(
                          Icons.delete_outline_rounded,
                          color: AppColors.error,
                          size: 16,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Kıyafet görselleri şeridi ──────────────────────────────────────────────

class _ItemStrip extends StatelessWidget {
  final List<ClothingItem> items;
  const _ItemStrip({required this.items});

  @override
  Widget build(BuildContext context) {
    final shown = items.take(4).toList();
    final extra = items.length - shown.length;

    return Row(
      children: [
        ...shown.map(
          (item) => Expanded(
            child: Padding(
              padding: const EdgeInsets.only(right: 6),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: AspectRatio(
                  aspectRatio: .82,
                  child: item.imageUrl != null
                      ? Image.network(
                          item.imageUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) =>
                              _Placeholder(),
                          loadingBuilder: (_, child, progress) =>
                              progress == null
                                  ? child
                                  : _Placeholder(),
                        )
                      : _Placeholder(),
                ),
              ),
            ),
          ),
        ),

        // "+N daha" göstergesi
        if (extra > 0)
          Container(
            width: 40,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.border),
            ),
            child: Center(
              child: Text(
                '+$extra',
                style: const TextStyle(
                  color: AppColors.muted,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _Placeholder extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    color: AppColors.surface,
    child: const Icon(
      Icons.checkroom_outlined,
      color: AppColors.muted,
      size: 20,
    ),
  );
}
