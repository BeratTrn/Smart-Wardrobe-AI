// ─────────────────────────────────────────────────────────────────────────────
//  Smart Lookbook — Kişisel Stil Yayını
//  Outfit Generator'dan gelen GeneratedOutfit'i premium bir magazine spread
//  olarak sunar. dart:io kullanılmaz → Flutter Web + Android + iOS uyumlu.
// ─────────────────────────────────────────────────────────────────────────────

import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/data/models/clothing_item.dart';
import 'package:smart_wardrobe_ai/data/models/generated_outfit.dart';
import 'package:smart_wardrobe_ai/data/services/api_service.dart';
import 'package:smart_wardrobe_ai/data/services/saved_outfits_store.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/home_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/saved_outfits_screen.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_background.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_text_styles.dart';

// ─────────────────────────────────────────────────────────────────────────────
//  ROOT SCREEN
// ─────────────────────────────────────────────────────────────────────────────

class TryOnScreen extends StatefulWidget {
  /// Outfit Generator'dan gelen kombin.  null ise boş lookbook açılır.
  final GeneratedOutfit? outfit;

  const TryOnScreen({super.key, this.outfit});

  @override
  State<TryOnScreen> createState() => _TryOnScreenState();
}

class _TryOnScreenState extends State<TryOnScreen>
    with TickerProviderStateMixin {
  // ── Image picker (Web + Mobile uyumlu — dart:io yok) ─────────────────────
  final _picker = ImagePicker();
  Uint8List? _photoBytes;
  XFile? _xFile;

  // ── UI state ──────────────────────────────────────────────────────────────
  bool _saved = false;  // initState'te store'dan güncellenir
  bool _saving = false; // API isteği sürerken true

  final _store = SavedOutfitsStore.instance;

  // ── Kategorize edilmiş kıyafetler ─────────────────────────────────────────
  late final List<ClothingItem> _tops;
  late final List<ClothingItem> _bottoms;
  late final List<ClothingItem> _shoes;
  late final List<ClothingItem> _others;

  // ── Staggered entry animasyonları ─────────────────────────────────────────
  late final AnimationController _entryCtrl;
  late final List<Animation<double>> _fades;
  late final List<Animation<Offset>> _slides;

  // ── Shimmer (header pulse) ────────────────────────────────────────────────
  late final AnimationController _shimmerCtrl;
  late final Animation<double> _shimmerAnim;

  @override
  void initState() {
    super.initState();
    _categorize();

    // Daha önce kaydedilmişse "Kaydedildi" durumunda başla
    if (widget.outfit != null) {
      _saved = _store.isSaved(widget.outfit!.id);
    }

    // ── Shimmer loop
    _shimmerCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    )..repeat();
    _shimmerAnim = CurvedAnimation(parent: _shimmerCtrl, curve: Curves.linear);

    // ── Staggered entry
    final total =
        (_tops.length + _bottoms.length + _shoes.length + _others.length).clamp(
          1,
          10,
        );

    _entryCtrl = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: 500 + total * 120),
    );

    _fades = [];
    _slides = [];

    for (int i = 0; i < total; i++) {
      final t0 = i / total * 0.55;
      final t1 = (t0 + 0.45).clamp(0.0, 1.0);

      _fades.add(
        Tween<double>(begin: 0, end: 1).animate(
          CurvedAnimation(
            parent: _entryCtrl,
            curve: Interval(t0, t1, curve: Curves.easeOut),
          ),
        ),
      );
      _slides.add(
        Tween<Offset>(begin: const Offset(0, -.35), end: Offset.zero).animate(
          CurvedAnimation(
            parent: _entryCtrl,
            curve: Interval(t0, t1, curve: Curves.easeOutCubic),
          ),
        ),
      );
    }

    // Bir frame sonra animasyonu başlat (build tamamlandıktan sonra)
    WidgetsBinding.instance.addPostFrameCallback((_) => _entryCtrl.forward());
  }

  @override
  void dispose() {
    _entryCtrl.dispose();
    _shimmerCtrl.dispose();
    super.dispose();
  }

  // ── Kıyafetleri kategorilere ayır ────────────────────────────────────────

  void _categorize() {
    final items = widget.outfit?.items ?? [];
    final tops = <ClothingItem>[];
    final bottoms = <ClothingItem>[];
    final shoes = <ClothingItem>[];
    final others = <ClothingItem>[];

    for (final item in items) {
      final c = item.category.toLowerCase();
      if (c.contains('üst') || c.contains('ust')) {
        tops.add(item);
      } else if (c.contains('alt')) {
        bottoms.add(item);
      } else if (c.contains('ayak')) {
        shoes.add(item);
      } else {
        others.add(item); // elbise, dış giyim, aksesuar
      }
    }

    _tops = tops;
    _bottoms = bottoms;
    _shoes = shoes;
    _others = others;
  }

  // ── Fotoğraf seç (XFile → bytes, Web uyumlu) ─────────────────────────────

  Future<void> _pickPhoto() async {
    final xf = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 90,
    );
    if (xf == null) return;
    final bytes = await xf.readAsBytes();
    if (!mounted) return;
    setState(() {
      _xFile = xf;
      _photoBytes = bytes;
    });
  }

  // ── Kaydet → API'ye gönder + Snackbar + "Kombinlerime Git" aksiyonu ────────

  Future<void> _saveOutfit() async {
    if (widget.outfit == null || _saving || _saved) return;

    setState(() => _saving = true);

    try {
      await _store.save(widget.outfit!);
      if (!mounted) return;
      setState(() {
        _saved = true;
        _saving = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Text('✨', style: TextStyle(fontSize: 14)),
              SizedBox(width: 8),
              Text(
                'Stil kombinlerinize kaydedildi!',
                style: TextStyle(fontWeight: FontWeight.w500),
              ),
            ],
          ),
          backgroundColor: AppColors.success,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          duration: const Duration(seconds: 3),
          action: SnackBarAction(
            label: 'Kombinlerim →',
            textColor: Colors.white,
            onPressed: () {
              Navigator.of(context).popUntil((route) => route.isFirst);
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (_) => const SavedOutfitsScreen()),
              );
            },
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e is ApiException ? e.message : 'Kombin kaydedilemedi.',
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    }
  }

  // ── Paylaş (stub — share_plus ile genişletilebilir) ───────────────────────

  void _shareOutfit() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Paylaşma özelliği yakında aktif olacak.'),
        backgroundColor: AppColors.surface,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    // Stagger wrapper — animIdx, build sırasında senkron artar
    int animIdx = 0;

    Widget stagger(Widget child) {
      if (animIdx >= _fades.length) return child;
      final fade = _fades[animIdx];
      final slide = _slides[animIdx];
      animIdx++;
      return SlideTransition(
        position: slide,
        child: FadeTransition(opacity: fade, child: child),
      );
    }

    return PopScope(
      canPop: Navigator.canPop(context),
      onPopInvoked: (didPop) {
        if (!didPop) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => const HomeScreen()),
          );
        }
      },
      child: Scaffold(
        backgroundColor: AppColors.bg,
        body: AppBackground(
          child: SafeArea(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Header ──────────────────────────────────────────────────
                  _LookbookHeader(
                    onBack: () {
                      if (Navigator.canPop(context)) {
                        Navigator.pop(context);
                      } else {
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(builder: (_) => const HomeScreen()),
                        );
                      }
                    },
                  ),

                  const SizedBox(height: 18),

                  // ── Spread Bölümü ────────────────────────────────────────────
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 18),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Sol: Kullanıcı fotoğrafı
                        _UserPhotoPanel(
                          photoBytes: _photoBytes,
                          onTap: _pickPhoto,
                        ),

                        const SizedBox(width: 16),

                        // Sağ: Kıyafet galerisii
                        Expanded(
                          child: _WardrobeGallery(
                            tops: _tops,
                            bottoms: _bottoms,
                            shoes: _shoes,
                            others: _others,
                            stagger: stagger,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 22),

                  // ── Stilistin Notu ────────────────────────────────────────────
                  if ((widget.outfit?.description ?? '').isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 18),
                      child: _StylistNoteCard(
                        note: widget.outfit!.description,
                        tip: widget.outfit!.ipucu,
                      ),
                    ),

                  const SizedBox(height: 20),

                  // ── Aksiyon Butonları ─────────────────────────────────────────
                  Padding(
                    padding: const EdgeInsets.fromLTRB(18, 0, 18, 30),
                    child: _ActionRow(
                      saved: _saved,
                      saving: _saving,
                      onSave: _saveOutfit,
                      onShare: _shareOutfit,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  HEADER
// ─────────────────────────────────────────────────────────────────────────────

class _LookbookHeader extends StatelessWidget {
  final VoidCallback onBack;
  const _LookbookHeader({required this.onBack});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 0),
      child: Row(
        children: [
          // ← Dolabım
          GestureDetector(
            onTap: onBack,
            behavior: HitTestBehavior.opaque,
            child: Padding(
              padding: const EdgeInsets.only(right: 8, bottom: 4, top: 4),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.arrow_back_ios_new_rounded,
                    color: AppColors.gold,
                    size: 14,
                  ),
                  const SizedBox(width: 3),
                  Text(
                    'Dolabım',
                    style: AppTextStyles.label.copyWith(
                      color: AppColors.gold,
                      fontSize: 12,
                      letterSpacing: .5,
                    ),
                  ),
                ],
              ),
            ),
          ),

          const Spacer(),

          // Başlık
          Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Text(
                'LOOKBOOK',
                style: TextStyle(
                  fontFamily: 'Cormorant',
                  fontSize: 21,
                  fontWeight: FontWeight.w700,
                  color: AppColors.text,
                  letterSpacing: 4,
                ),
              ),
              Text(
                'KİŞİSEL STİL YAYINI',
                style: AppTextStyles.label.copyWith(
                  fontSize: 8,
                  letterSpacing: 2.5,
                  color: AppColors.muted,
                ),
              ),
            ],
          ),

          const Spacer(),

          // AI Engine badge
          _AiEngineBadge(),
        ],
      ),
    );
  }
}

class _AiEngineBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
    decoration: BoxDecoration(
      gradient: LinearGradient(
        colors: [
          AppColors.gold.withValues(alpha: .16),
          AppColors.goldLight.withValues(alpha: .06),
        ],
      ),
      borderRadius: BorderRadius.circular(8),
      border: Border.all(color: AppColors.gold.withValues(alpha: .3)),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(
          Icons.auto_awesome_rounded,
          color: AppColors.goldLight,
          size: 11,
        ),
        const SizedBox(width: 4),
        Text(
          'AI Engine',
          style: AppTextStyles.label.copyWith(
            color: AppColors.goldLight,
            fontSize: 10,
          ),
        ),
      ],
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  KULLANICI FOTOĞRAFI PANELİ (sol)
// ─────────────────────────────────────────────────────────────────────────────

class _UserPhotoPanel extends StatelessWidget {
  final Uint8List? photoBytes;
  final VoidCallback onTap;

  const _UserPhotoPanel({required this.photoBytes, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final hasPhoto = photoBytes != null;

    return SizedBox(
      width: 144,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Ana fotoğraf çerçevesi
          GestureDetector(
            onTap: onTap,
            child: Container(
              height: 300,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                color: AppColors.surface,
                border: Border.all(
                  color: hasPhoto
                      ? AppColors.gold.withValues(alpha: .55)
                      : AppColors.border,
                  width: hasPhoto ? 1.5 : 1.0,
                ),
                // Altın halo gölgesi — yalnızca fotoğraf seçildiyse
                boxShadow: hasPhoto
                    ? [
                        BoxShadow(
                          color: AppColors.gold.withValues(alpha: .22),
                          blurRadius: 28,
                          spreadRadius: 2,
                          offset: const Offset(0, 6),
                        ),
                        BoxShadow(
                          color: AppColors.gold.withValues(alpha: .07),
                          blurRadius: 60,
                          spreadRadius: 10,
                        ),
                      ]
                    : null,
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(15),
                child: hasPhoto
                    ? Image.memory(photoBytes!, fit: BoxFit.cover)
                    : _PhotoPlaceholder(onTap: onTap),
              ),
            ),
          ),

          const SizedBox(height: 8),

          // ── Değiştir / Ekle butonu
          GestureDetector(
            onTap: onTap,
            child: Container(
              height: 32,
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(9),
                border: Border.all(
                  color: hasPhoto
                      ? AppColors.border
                      : AppColors.gold.withValues(alpha: .35),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    hasPhoto
                        ? Icons.edit_outlined
                        : Icons.add_photo_alternate_outlined,
                    color: hasPhoto ? AppColors.muted : AppColors.gold,
                    size: 13,
                  ),
                  const SizedBox(width: 5),
                  Text(
                    hasPhoto ? 'Değiştir' : 'Fotoğraf Ekle',
                    style: TextStyle(
                      color: hasPhoto ? AppColors.muted : AppColors.gold,
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PhotoPlaceholder extends StatelessWidget {
  final VoidCallback onTap;
  const _PhotoPlaceholder({required this.onTap});

  @override
  Widget build(BuildContext context) => Column(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      // Noktalı daire — manuel dashed border
      Container(
        width: 58,
        height: 58,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.gold.withValues(alpha: .35)),
          color: AppColors.gold.withValues(alpha: .06),
        ),
        child: const Icon(
          Icons.person_outline_rounded,
          color: AppColors.gold,
          size: 28,
        ),
      ),
      const SizedBox(height: 14),
      const Text(
        'Fotoğrafınızı\nEkleyin',
        textAlign: TextAlign.center,
        style: TextStyle(color: AppColors.textSub, fontSize: 12, height: 1.4),
      ),
      const SizedBox(height: 6),
      Text(
        '↑ Dokunun',
        style: TextStyle(
          color: AppColors.gold.withValues(alpha: .6),
          fontSize: 10,
          letterSpacing: .5,
        ),
      ),
    ],
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  KIYAFet GALERİSİ (sağ taraf — asma / raf bölümleri)
// ─────────────────────────────────────────────────────────────────────────────

class _WardrobeGallery extends StatelessWidget {
  final List<ClothingItem> tops, bottoms, shoes, others;

  /// Stagger animasyonu sarmalayıcı — TryOnScreenState'ten geliyor.
  /// Her çağrıda bir sonraki animasyonu alır.
  final Widget Function(Widget) stagger;

  const _WardrobeGallery({
    required this.tops,
    required this.bottoms,
    required this.shoes,
    required this.others,
    required this.stagger,
  });

  @override
  Widget build(BuildContext context) {
    final isEmpty =
        tops.isEmpty && bottoms.isEmpty && shoes.isEmpty && others.isEmpty;

    if (isEmpty) {
      return const SizedBox(
        height: 260,
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.checkroom_outlined, color: AppColors.border, size: 32),
              SizedBox(height: 10),
              Text(
                'Kombin öğesi yok.',
                style: TextStyle(color: AppColors.muted, fontSize: 12),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── ÜST GİYİM — ahşap askı ────────────────────────────────────────
        if (tops.isNotEmpty) ...[
          _GalleryLabel(icon: Icons.dry_cleaning_rounded, label: 'ÜST GİYİM'),
          const SizedBox(height: 8),
          Wrap(
            spacing: 10,
            runSpacing: 14,
            children: tops
                .map((item) => stagger(_HangerItem(item: item)))
                .toList(),
          ),
          const SizedBox(height: 18),
        ],

        // ── ALT GİYİM — yüzen raf ──────────────────────────────────────────
        if (bottoms.isNotEmpty) ...[
          _GalleryLabel(icon: Icons.layers_rounded, label: 'ALT GİYİM'),
          const SizedBox(height: 8),
          _FloatingShelfRow(
            children: bottoms
                .map((item) => stagger(_ShelfItem(item: item)))
                .toList(),
          ),
          const SizedBox(height: 18),
        ],

        // ── AYAKKABI — yüzen raf ────────────────────────────────────────────
        if (shoes.isNotEmpty) ...[
          _GalleryLabel(icon: Icons.directions_walk_rounded, label: 'AYAKKABI'),
          const SizedBox(height: 8),
          _FloatingShelfRow(
            children: shoes
                .map((item) => stagger(_ShelfItem(item: item)))
                .toList(),
          ),
          const SizedBox(height: 18),
        ],

        // ── DİĞER (elbise, dış giyim, aksesuar) ────────────────────────────
        if (others.isNotEmpty) ...[
          _GalleryLabel(icon: Icons.auto_awesome_outlined, label: 'DİĞER'),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: others
                .map((item) => stagger(_MiniCard(item: item)))
                .toList(),
          ),
        ],
      ],
    );
  }
}

// ── Küçük kategori etiketi ─────────────────────────────────────────────────

class _GalleryLabel extends StatelessWidget {
  final IconData icon;
  final String label;
  const _GalleryLabel({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Icon(icon, size: 11, color: AppColors.gold.withValues(alpha: .65)),
      const SizedBox(width: 5),
      Text(
        label,
        style: AppTextStyles.label.copyWith(
          fontSize: 9,
          letterSpacing: 2,
          color: AppColors.gold.withValues(alpha: .65),
        ),
      ),
    ],
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ASKILI ÜST GİYİM  (custom painter ile ahşap askı)
// ─────────────────────────────────────────────────────────────────────────────

class _HangerItem extends StatelessWidget {
  final ClothingItem item;
  const _HangerItem({required this.item});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 78,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Ahşap askı
          SizedBox(
            width: 78,
            height: 40,
            child: CustomPaint(painter: _HangerPainter()),
          ),
          // Kıyafet görseli — askının hemen altında asılı görünüm
          Container(
            width: 72,
            height: 86,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(7),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: .50),
                  blurRadius: 12,
                  offset: const Offset(2, 5),
                ),
                BoxShadow(
                  color: Colors.black.withValues(alpha: .20),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(7),
              child: _ItemImage(url: item.imageUrl),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  YÜZEN RAF  (alt giyim / ayakkabı için)
// ─────────────────────────────────────────────────────────────────────────────

class _FloatingShelfRow extends StatelessWidget {
  final List<Widget> children;
  const _FloatingShelfRow({required this.children});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Ürünler rafın üstünde sıralanıyor
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: children
              .map(
                (w) => Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: w,
                ),
              )
              .toList(),
        ),
        // Rafın kendisi (akrlik/cam görünüm)
        const SizedBox(height: 3),
        Container(
          height: 10,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0xFF3C3C30), Color(0xFF1C1C14)],
            ),
            borderRadius: BorderRadius.circular(4),
            border: Border(
              top: BorderSide(
                color: AppColors.gold.withValues(alpha: .30),
                width: 1.2,
              ),
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.gold.withValues(alpha: .08),
                blurRadius: 8,
                offset: const Offset(0, -3),
              ),
              BoxShadow(
                color: Colors.black.withValues(alpha: .55),
                blurRadius: 10,
                offset: const Offset(0, 5),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ShelfItem extends StatelessWidget {
  final ClothingItem item;
  const _ShelfItem({required this.item});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 68,
      height: 78,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(7),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: .45),
            blurRadius: 10,
            offset: const Offset(1, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(7),
        child: _ItemImage(url: item.imageUrl),
      ),
    );
  }
}

class _MiniCard extends StatelessWidget {
  final ClothingItem item;
  const _MiniCard({required this.item});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 68,
      height: 78,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: .35),
            blurRadius: 8,
            offset: const Offset(1, 3),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(7),
        child: _ItemImage(url: item.imageUrl),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GÖRSEL WİDGET — Shimmer yükleme + ağ görseli
// ─────────────────────────────────────────────────────────────────────────────

class _ItemImage extends StatelessWidget {
  final String? url;
  const _ItemImage({this.url});

  @override
  Widget build(BuildContext context) {
    if (url == null || url!.isEmpty) {
      return Container(
        color: AppColors.surface,
        child: const Icon(
          Icons.checkroom_outlined,
          color: AppColors.muted,
          size: 22,
        ),
      );
    }

    return Image.network(
      url!,
      fit: BoxFit.cover,
      loadingBuilder: (_, child, progress) =>
          progress == null ? child : const _ShimmerBox(),
      errorBuilder: (_, __, ___) => Container(
        color: AppColors.surface,
        child: const Icon(
          Icons.broken_image_outlined,
          color: AppColors.muted,
          size: 18,
        ),
      ),
    );
  }
}

// Animasyonlu shimmer kutusu (yükleme durumu için)
class _ShimmerBox extends StatefulWidget {
  const _ShimmerBox();

  @override
  State<_ShimmerBox> createState() => _ShimmerBoxState();
}

class _ShimmerBoxState extends State<_ShimmerBox>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _ctrl,
    builder: (_, __) => Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment(-1.5 + _ctrl.value * 3.5, 0),
          end: Alignment(0.5 + _ctrl.value * 3.5, 0),
          colors: const [
            Color(0xFF141414),
            Color(0xFF272720),
            Color(0xFF141414),
          ],
        ),
      ),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  AHŞAP ASKA PAINTER
//  Görseli gerçekçi tutmak için ince gradyan + altın kanca.
// ─────────────────────────────────────────────────────────────────────────────

class _HangerPainter extends CustomPainter {
  const _HangerPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;

    // ─── Altın kanca ─────────────────────────────────────────────────────────
    final hookPaint = Paint()
      ..color = AppColors.gold
      ..strokeWidth = 2.2
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    // Dikey gövde
    canvas.drawLine(
      Offset(cx, size.height * 0.65),
      Offset(cx, size.height * 0.20),
      hookPaint,
    );

    // Yuvarlak kanca halkası (yarı daire)
    final hookRect = Rect.fromCenter(
      center: Offset(cx + size.width * 0.065, size.height * 0.17),
      width: size.width * 0.13,
      height: size.height * 0.30,
    );
    canvas.drawArc(
      hookRect,
      3.14159,
      3.14159,
      false,
      hookPaint..strokeWidth = 2.0,
    );

    // ─── Ahşap çubuk (hafif içbükey eğri) ───────────────────────────────────
    final woodPaint = Paint()
      ..strokeWidth = 5.5
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    // Renk: koyu-açık-koyu ahşap gradyanı
    woodPaint.shader = ui.Gradient.linear(
      Offset(0, size.height * 0.60),
      Offset(0, size.height * 0.95),
      const [Color(0xFF9A6A3E), Color(0xFF4E2E10), Color(0xFF7A4E26)],
      [0.0, 0.50, 1.0],
    );

    final barPath = Path()
      ..moveTo(size.width * 0.04, size.height * 0.88)
      ..quadraticBezierTo(
        cx,
        size.height * 0.65,
        size.width * 0.96,
        size.height * 0.88,
      );
    canvas.drawPath(barPath, woodPaint);

    // ─── Uç kapakçıklar (daha koyu) ─────────────────────────────────────────
    final capPaint = Paint()
      ..color = const Color(0xFF3A1E08)
      ..strokeWidth = 6.0
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    canvas.drawCircle(
      Offset(size.width * 0.04, size.height * 0.88),
      1.0,
      capPaint,
    );
    canvas.drawCircle(
      Offset(size.width * 0.96, size.height * 0.88),
      1.0,
      capPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter old) => false;
}

// ─────────────────────────────────────────────────────────────────────────────
//  STİLİSTİN NOTU — Glassmorphism kart
// ─────────────────────────────────────────────────────────────────────────────

class _StylistNoteCard extends StatelessWidget {
  final String note;
  final String tip;
  const _StylistNoteCard({required this.note, required this.tip});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: 14, sigmaY: 14),
        child: Container(
          padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
          decoration: BoxDecoration(
            // Hafif cam efekti
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                AppColors.gold.withValues(alpha: .07),
                AppColors.card.withValues(alpha: .85),
                AppColors.surface.withValues(alpha: .60),
              ],
            ),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.gold.withValues(alpha: .22)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Başlık
              Row(
                children: [
                  const Text('✨', style: TextStyle(fontSize: 13)),
                  const SizedBox(width: 6),
                  Text(
                    'STİLİSTİN NOTU',
                    style: AppTextStyles.label.copyWith(
                      color: AppColors.gold,
                      fontSize: 9,
                      letterSpacing: 2.2,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 10),

              // AI açıklaması (italik, premium his)
              Text(
                '"$note"',
                style: const TextStyle(
                  color: AppColors.textSub,
                  fontSize: 13,
                  height: 1.65,
                  fontStyle: FontStyle.italic,
                  letterSpacing: .1,
                ),
              ),

              // İpucu (varsa)
              if (tip.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 11,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.gold.withValues(alpha: .08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: AppColors.gold.withValues(alpha: .18),
                    ),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.lightbulb_outline_rounded,
                        color: AppColors.gold,
                        size: 13,
                      ),
                      const SizedBox(width: 7),
                      Expanded(
                        child: Text(
                          tip,
                          style: const TextStyle(
                            color: AppColors.gold,
                            fontSize: 12,
                            height: 1.45,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  AKSİYON BUTONLARI
// ─────────────────────────────────────────────────────────────────────────────

class _ActionRow extends StatelessWidget {
  final bool saved;
  final bool saving;
  final VoidCallback onSave;
  final VoidCallback onShare;

  const _ActionRow({
    required this.saved,
    required this.saving,
    required this.onSave,
    required this.onShare,
  });

  @override
  Widget build(BuildContext context) {
    final inactive = saved || saving;

    return Row(
      children: [
        // ── Stilimi Kaydet (ana buton)
        Expanded(
          child: GestureDetector(
            onTap: inactive ? null : onSave,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              height: 52,
              decoration: BoxDecoration(
                gradient: inactive
                    ? null
                    : const LinearGradient(
                        colors: [AppColors.gold, AppColors.goldLight],
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                      ),
                color: inactive ? AppColors.surface : null,
                borderRadius: BorderRadius.circular(14),
                border: inactive ? Border.all(color: AppColors.border) : null,
                boxShadow: inactive
                    ? null
                    : [
                        BoxShadow(
                          color: AppColors.gold.withValues(alpha: .40),
                          blurRadius: 20,
                          offset: const Offset(0, 6),
                        ),
                      ],
              ),
              child: Center(
                child: saving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation(AppColors.gold),
                        ),
                      )
                    : Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            saved
                                ? Icons.check_circle_rounded
                                : Icons.bookmark_add_outlined,
                            color: saved ? AppColors.success : Colors.black,
                            size: 16,
                          ),
                          const SizedBox(width: 7),
                          Text(
                            saved ? 'Kaydedildi' : 'Stilimi Kaydet',
                            style: TextStyle(
                              color: saved ? AppColors.success : Colors.black,
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              letterSpacing: .3,
                            ),
                          ),
                        ],
                      ),
              ),
            ),
          ),
        ),

        const SizedBox(width: 10),

        // ── Paylaş (ikon buton)
        GestureDetector(
          onTap: onShare,
          child: Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: const Icon(
              Icons.ios_share_rounded,
              color: AppColors.textSub,
              size: 20,
            ),
          ),
        ),
      ],
    );
  }
}
