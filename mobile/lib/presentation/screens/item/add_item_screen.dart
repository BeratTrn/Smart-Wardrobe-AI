import 'dart:typed_data';

import 'package:easy_localization/easy_localization.dart';
import 'package:image/image.dart' as img;
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/core/theme/app_theme_extension.dart';
import 'package:smart_wardrobe_ai/data/services/api_service.dart';
import 'package:smart_wardrobe_ai/presentation/screens/auth/login_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/item/camera_extract_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/home_screen.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_background.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_text_styles.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/wardrobe/app_filter_chip.dart';

class AddItemScreen extends StatefulWidget {
  const AddItemScreen({super.key});

  @override
  State<AddItemScreen> createState() => _AddItemScreenState();
}

class _AddItemScreenState extends State<AddItemScreen>
    with SingleTickerProviderStateMixin {
  final _picker = ImagePicker();
  final _nameCtrl = TextEditingController();
  final _colorCtrl = TextEditingController();

  Uint8List? _imageBytes;
  String _imageName = 'photo.jpg';

  // State machine
  // pick → analyzing → review → saving → done
  String _step = 'pick';

  // Form değerleri
  String _selectedCategory = '';
  String _selectedSeason = 'add_item.all_seasons'.tr();
  String _selectedStyle = 'add_item.casual'.tr();
  // Backend enum (Item.cinsiyet): 'Unisex' | 'Kadın' | 'Erkek'
  String _selectedGender = 'Unisex';

  final List<(String value, String label)> _genders = [
    ('Unisex', 'add_item.gender_unisex'.tr()),
    ('Kadın', 'add_item.gender_female'.tr()),
    ('Erkek', 'add_item.gender_male'.tr()),
  ];

  // Backend MongoDB enum değerleri — her zaman Türkçe kalmalı
  static const List<String> _categories = [
    'Dış Giyim',
    'Üst Giyim',
    'Elbise',
    'Alt Giyim',
    'Ayakkabı',
    'Aksesuar',
  ];
  final List<String> _seasons = [
    'add_item.spring'.tr(),
    'add_item.summer'.tr(),
    'add_item.autumn'.tr(),
    'add_item.winter'.tr(),
    'add_item.all_seasons'.tr(),
  ];
  final List<String> _styles = [
    'add_item.casual'.tr(),
    'add_item.classic'.tr(),
    'add_item.sport'.tr(),
    'add_item.street'.tr(),
    'add_item.minimal'.tr(),
    'add_item.chic'.tr(),
    'add_item.formal'.tr(),
  ];

  late final AnimationController _pulseCtrl;
  late final Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(
      begin: .6,
      end: 1.0,
    ).animate(CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    _nameCtrl.dispose();
    _colorCtrl.dispose();
    super.dispose();
  }

  /// Görsel baytlarından dominant rengi hesaplar (piksel örnekleme).
  /// Her 8. pikseli tarar, R/G/B bileşenlerini ortalar → hex döner.
  String _dominantColorHex(Uint8List bytes) {
    try {
      final decoded = img.decodeImage(bytes);
      if (decoded == null) return '#808080';

      // En fazla 100x100 örnekle (hız için)
      final resized = decoded.width > 100 || decoded.height > 100
          ? img.copyResize(decoded, width: 100, height: 100)
          : decoded;

      int rSum = 0, gSum = 0, bSum = 0, count = 0;

      for (int y = 0; y < resized.height; y++) {
        for (int x = 0; x < resized.width; x++) {
          final pixel = resized.getPixel(x, y);
          final r = pixel.r.toInt();
          final g = pixel.g.toInt();
          final b = pixel.b.toInt();
          final a = pixel.a.toInt();
          // Şeffaf ve çok açık/koyu pikselleri atla (arka plan gürültüsü)
          if (a < 50) continue;
          final brightness = (r + g + b) / 3;
          if (brightness < 20 || brightness > 235) continue;
          rSum += r;
          gSum += g;
          bSum += b;
          count++;
        }
      }

      if (count == 0) return '#808080';
      final rAvg = (rSum / count).round().clamp(0, 255);
      final gAvg = (gSum / count).round().clamp(0, 255);
      final bAvg = (bSum / count).round().clamp(0, 255);
      return '#${rAvg.toRadixString(16).padLeft(2, '0')}${gAvg.toRadixString(16).padLeft(2, '0')}${bAvg.toRadixString(16).padLeft(2, '0')}'.toUpperCase();
    } catch (_) {
      return '#808080';
    }
  }

  // 1. Fotoğraf seç

  Future<void> _pick(ImageSource source) async {
    final xf = await _picker.pickImage(source: source, imageQuality: 85);
    if (xf == null) return;

    final bytes = await xf.readAsBytes();
    setState(() {
      _imageBytes = bytes;
      _imageName = xf.name.isNotEmpty ? xf.name : 'photo.jpg';
      _step = 'analyzing';
    });
    await _getAiPreview(bytes, _imageName);
  }

  /// Kamera: canlı önizleme + dokunarak kıyafet/aksesuar seçimi
  /// (segmentasyon ile şeffaf arka planlı kesim) ekranını açar.
  Future<void> _openCameraExtract() async {
    final result = await Navigator.push<CameraExtractResult>(
      context,
      MaterialPageRoute(builder: (_) => const CameraExtractScreen()),
    );
    if (result == null) return;

    setState(() {
      _imageBytes = result.bytes;
      _imageName = result.filename;
      _step = 'analyzing';
    });
    await _getAiPreview(result.bytes, _imageName);
  }

  // 2. AI Önizleme (kayıt YOK)
  /// Görüntüyü yalnızca FastAPI motoruna gönderir.
  /// Başarılı veya başarısız olsun, her zaman 'review' adımına geçer.
  /// Başarısızlık durumunda form boş kalır ve kullanıcı manuel doldurur.
  Future<void> _getAiPreview(Uint8List bytes, String filename) async {
    if (!mounted) return;
    try {
      final result = await ApiService.instance.analyzeItemOnly(
        imageBytes: bytes,
        filename: filename,
      );

      if (!mounted) return;

      // Rengi client-side piksel analizinden hesapla (backend renginden daha doğru)
      final localColor = _dominantColorHex(bytes);

      // AI tahminlerini forma aktar
      setState(() {
        // Sadece geçerli backend enum değerlerini kabul et
        if (_categories.contains(result.kategori)) _selectedCategory = result.kategori;
        _colorCtrl.text = localColor;
        _step = 'review';
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.statusCode == 401) {
        setState(() => _step = 'pick');
        _snack('add_item.session_expired'.tr());
        await Future.delayed(const Duration(seconds: 2));
        if (mounted) {
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (_) => const LoginScreen()),
            (_) => false,
          );
        }
      } else {
        // AI hata verdi ama kullanıcı yine de manuel doldurup kaydedebilir
        setState(() => _step = 'review');
        _snack('add_item.ai_analysis_failed'.tr(), isError: false);
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _step = 'review');
      _snack('add_item.server_connection_failed'.tr(), isError: false);
    }
  }

  // 3. Kullanıcı onayı sonrası kaydet

  Future<void> _save() async {
    if (_imageBytes == null) {
      _snack('add_item.please_select_photo'.tr());
      return;
    }
    if (_selectedCategory.isEmpty) {
      _snack('add_item.please_select_category'.tr());
      return;
    }

    setState(() => _step = 'saving');

    try {
      // Kullanıcının onayladığı kategori ve rengi body'de gönder.
      // Backend bu değerleri AI tahminlerine göre önceliklendirir.
      await ApiService.instance.uploadItem(
        imageBytes: _imageBytes!,
        filename: _imageName,
        kategori: _selectedCategory,
        renk: _colorCtrl.text.trim(),
        mevsim: _selectedSeason,
        stil: _selectedStyle,
        cinsiyet: _selectedGender,
      );

      if (!mounted) return;
      setState(() => _step = 'done');
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.statusCode == 401) {
        setState(() => _step = 'pick');
        _snack('add_item.session_expired'.tr());
        await Future.delayed(const Duration(seconds: 2));
        if (mounted) {
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (_) => const LoginScreen()),
            (_) => false,
          );
        }
      } else {
        setState(() => _step = 'review');
        _snack(e.message);
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _step = 'review');
      _snack('add_item.server_not_responding'.tr());
    }
  }

  void _reset() => setState(() {
    _step = 'pick';
    _imageBytes = null;
    _imageName = 'photo.jpg';
    _selectedCategory = '';
    _selectedSeason = 'add_item.all_seasons'.tr();
    _selectedStyle = 'add_item.casual'.tr();
    _selectedGender = 'Unisex';
    _nameCtrl.clear();
    _colorCtrl.clear();
  });

  void _snack(String msg, {bool isError = true}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? AppColors.error : AppColors.success,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  // Build

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColorsExtension.of(context).bg,
      body: AppBackground(
        child: SafeArea(
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 380),
            transitionBuilder: (child, anim) => FadeTransition(
              opacity: CurvedAnimation(parent: anim, curve: Curves.easeOut),
              child: child,
            ),
            child: _buildStep(),
          ),
        ),
      ),
    );
  }

  Widget _buildStep() {
    switch (_step) {
      case 'pick':
        return _PickStep(
          key: const ValueKey('pick'),
          onBack: () => Navigator.pop(context),
          onCamera: _openCameraExtract,
          onGallery: () => _pick(ImageSource.gallery),
        );
      case 'analyzing':
        return _AnalyzingStep(
          key: const ValueKey('analyzing'),
          imageBytes: _imageBytes,
          pulseAnim: _pulseAnim,
        );
      case 'review':
        return _ReviewStep(
          key: const ValueKey('review'),
          imageBytes: _imageBytes,
          nameCtrl: _nameCtrl,
          colorCtrl: _colorCtrl,
          selectedCategory: _selectedCategory,
          selectedSeason: _selectedSeason,
          selectedStyle: _selectedStyle,
          selectedGender: _selectedGender,
          categories: _categories,
          seasons: _seasons,
          styles: _styles,
          genders: _genders,
          onCategoryChange: (v) => setState(() => _selectedCategory = v),
          onSeasonChange: (v) => setState(() => _selectedSeason = v),
          onStyleChange: (v) => setState(() => _selectedStyle = v),
          onGenderChange: (v) => setState(() => _selectedGender = v),
          onBack: _reset,
          onSave: _save,
        );
      case 'saving':
        return const _SavingStep(key: ValueKey('saving'));
      case 'done':
        return _DoneStep(
          key: const ValueKey('done'),
          name: _nameCtrl.text.trim().isNotEmpty
              ? _nameCtrl.text.trim()
              : 'add_item.garment'.tr(),
          onAddAnother: _reset,
          onGoWardrobe: () => Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (_) => const HomeScreen()),
            (_) => false,
          ),
        );
      default:
        return const SizedBox.shrink();
    }
  }
}

// ADIM 1 — Fotoğraf Seç

class _PickStep extends StatelessWidget {
  final VoidCallback onBack, onCamera, onGallery;
  const _PickStep({
    super.key,
    required this.onBack,
    required this.onCamera,
    required this.onGallery,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 26),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 20),
          _BackBtn(onTap: onBack),
          const SizedBox(height: 36),
          Text(
            'add_item.add_garment'.tr(),
            style: TextStyle(
              fontFamily: 'Cormorant',
              fontSize: 52,
              fontWeight: FontWeight.w700,
              height: 1.05,
              color: AppColorsExtension.of(context).text,
              letterSpacing: -1,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'add_item.ai_photo_analyzes'.tr() + ' ✨',
            style: TextStyle(
              color: AppColorsExtension.of(context).textSub,
              fontSize: 14,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 40),
          GestureDetector(
            onTap: onGallery,
            child: Container(
              height: 190,
              width: double.infinity,
              decoration: BoxDecoration(
                color: AppColorsExtension.of(context).surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.goldDim, width: 1.5),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          AppColors.gold.withValues(alpha: .2),
                          AppColors.goldLight.withValues(alpha: .08),
                        ],
                      ),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.cloud_upload_outlined,
                      color: AppColors.gold,
                      size: 28,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'add_item.select_from_gallery'.tr(),
                    style: TextStyle(
                      color: AppColorsExtension.of(context).text,
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'add_item.jpg_png_supported'.tr(),
                    style: TextStyle(color: AppColorsExtension.of(context).muted, fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: onCamera,
            child: Container(
              height: 54,
              decoration: BoxDecoration(
                color: AppColorsExtension.of(context).surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColorsExtension.of(context).border, width: 1.5),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.camera_alt_rounded,
                    color: AppColors.gold,
                    size: 21,
                  ),
                  SizedBox(width: 9),
                  Text(
                    'add_item.camera'.tr(),
                    style: TextStyle(
                      color: AppColorsExtension.of(context).text,
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.gold.withValues(alpha: .06),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.gold.withValues(alpha: .2)),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.auto_awesome_rounded,
                  color: AppColors.goldLight,
                  size: 17,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'add_item.cnn_analyzes'.tr(),
                    style: TextStyle(
                      color: AppColorsExtension.of(context).textSub,
                      fontSize: 12,
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 30),
        ],
      ),
    );
  }
}

// ADIM 2 — AI Analiz Ediliyor

class _AnalyzingStep extends StatelessWidget {
  final Uint8List? imageBytes;
  final Animation<double> pulseAnim;
  const _AnalyzingStep({super.key, this.imageBytes, required this.pulseAnim});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Stack(
              alignment: Alignment.center,
              children: [
                AnimatedBuilder(
                  animation: pulseAnim,
                  builder: (_, __) => Transform.scale(
                    scale: pulseAnim.value,
                    child: Container(
                      width: 200,
                      height: 200,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AppColors.gold.withValues(alpha: .3),
                          width: 2,
                        ),
                      ),
                    ),
                  ),
                ),
                AnimatedBuilder(
                  animation: pulseAnim,
                  builder: (_, __) => Transform.scale(
                    scale: 1.4 - pulseAnim.value * .4,
                    child: Container(
                      width: 160,
                      height: 160,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AppColors.gold.withValues(alpha: .2),
                          width: 1.5,
                        ),
                      ),
                    ),
                  ),
                ),
                ClipOval(
                  child: SizedBox(
                    width: 130,
                    height: 130,
                    child: imageBytes != null
                        ? Image.memory(imageBytes!, fit: BoxFit.cover)
                        : Container(color: AppColorsExtension.of(context).surface),
                  ),
                ),
                Positioned(
                  bottom: 20,
                  right: 20,
                  child: Container(
                    width: 34,
                    height: 34,
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [AppColors.gold, AppColors.goldLight],
                      ),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.auto_awesome_rounded,
                      color: Colors.black,
                      size: 17,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 40),
            Text(
              'add_item.analyzing'.tr(),
              style: TextStyle(
                fontFamily: 'Cormorant',
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: AppColorsExtension.of(context).text,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'add_item.cnn_analyzing'.tr() + ' ✨',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColorsExtension.of(context).textSub,
                fontSize: 14,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 36),
            SizedBox(
              width: 180,
              child: LinearProgressIndicator(
                backgroundColor: AppColorsExtension.of(context).border,
                valueColor: const AlwaysStoppedAnimation<Color>(AppColors.gold),
                minHeight: 2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ADIM 3 — AI Sonucunu Onayla / Düzelt

class _ReviewStep extends StatelessWidget {
  final Uint8List? imageBytes;
  final TextEditingController nameCtrl, colorCtrl;
  final String selectedCategory, selectedSeason, selectedStyle, selectedGender;
  final List<String> categories, seasons, styles;
  final List<(String value, String label)> genders;
  final ValueChanged<String> onCategoryChange,
      onSeasonChange,
      onStyleChange,
      onGenderChange;
  final VoidCallback onBack, onSave;

  const _ReviewStep({
    super.key,
    required this.imageBytes,
    required this.nameCtrl,
    required this.colorCtrl,
    required this.selectedCategory,
    required this.selectedSeason,
    required this.selectedStyle,
    required this.selectedGender,
    required this.categories,
    required this.seasons,
    required this.styles,
    required this.genders,
    required this.onCategoryChange,
    required this.onSeasonChange,
    required this.onStyleChange,
    required this.onGenderChange,
    required this.onBack,
    required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 20),
          Row(
            children: [
              _BackBtn(onTap: onBack),
              const Spacer(),
              // AI Önizleme rozeti
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: AppColors.gold.withValues(alpha: .12),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: AppColors.gold.withValues(alpha: .3),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.auto_awesome_rounded,
                      color: AppColors.goldLight,
                      size: 12,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      'add_item.ai_preview'.tr(),
                      style: AppTextStyles.label.copyWith(
                        color: AppColors.goldLight,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Uyarı notu
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.gold.withValues(alpha: .07),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.gold.withValues(alpha: .2)),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.info_outline_rounded,
                  color: AppColors.gold,
                  size: 16,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'add_item.ai_prediction_wrong'.tr() +
                        'add_item.when_add_to_closet'.tr(),
                    style: TextStyle(
                      color: AppColorsExtension.of(context).textSub,
                      fontSize: 12,
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          // Görsel + Ad / Renk
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: SizedBox(
                  width: 115,
                  height: 145,
                  child: imageBytes != null
                      ? Image.memory(imageBytes!, fit: BoxFit.cover)
                      : Container(color: AppColorsExtension.of(context).surface),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'add_item.name_optional'.tr(),
                      style: AppTextStyles.label,
                    ),
                    const SizedBox(height: 6),
                    _DarkField(
                      controller: nameCtrl,
                      hint: 'add_item.garment_name'.tr(),
                    ),
                    const SizedBox(height: 12),
                    Text('add_item.color'.tr(), style: AppTextStyles.label),
                    const SizedBox(height: 10),
                    _ColorCircleSwatch(hexValue: colorCtrl),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 22),

          // KATEGORİ (AI'ın yanlış tahmin ettiği yer burası — dropdown)
          Text(
            'add_item.category'.tr(),
            style: AppTextStyles.label.copyWith(letterSpacing: 1.2),
          ),
          const SizedBox(height: 4),
          Text(
            'add_item.ai_prediction_wrong_fill_correct'.tr(),
            style: AppTextStyles.caption.copyWith(color: AppColorsExtension.of(context).muted),
          ),
          const SizedBox(height: 10),
          _CategoryDropdown(
            selected: selectedCategory,
            options: categories,
            onChanged: onCategoryChange,
          ),

          const SizedBox(height: 18),

          // MEVSİM
          Text(
            'add_item.season'.tr(),
            style: AppTextStyles.label.copyWith(letterSpacing: 1.2),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: seasons
                .map(
                  (s) => AppFilterChip(
                    label: s,
                    selected: selectedSeason == s,
                    onTap: () => onSeasonChange(s),
                  ),
                )
                .toList(),
          ),

          const SizedBox(height: 18),

          // STİL
          Text(
            'add_item.style'.tr(),
            style: AppTextStyles.label.copyWith(letterSpacing: 1.2),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: styles
                .map(
                  (s) => AppFilterChip(
                    label: s,
                    selected: selectedStyle == s,
                    onTap: () => onStyleChange(s),
                  ),
                )
                .toList(),
          ),

          const SizedBox(height: 18),

          // CİNSİYET
          Text(
            'add_item.gender'.tr(),
            style: AppTextStyles.label.copyWith(letterSpacing: 1.2),
          ),
          const SizedBox(height: 4),
          Text(
            'add_item.gender_hint'.tr(),
            style: AppTextStyles.caption.copyWith(color: AppColorsExtension.of(context).muted),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: genders
                .map(
                  (g) => AppFilterChip(
                    label: g.$2,
                    selected: selectedGender == g.$1,
                    onTap: () => onGenderChange(g.$1),
                  ),
                )
                .toList(),
          ),

          const SizedBox(height: 30),

          // Kaydet butonu
          GestureDetector(
            onTap: onSave,
            child: Container(
              height: 56,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.gold, AppColors.goldLight],
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.gold.withValues(alpha: .35),
                    blurRadius: 18,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Center(
                child: Text(
                  'add_item.add_to_closet'.tr(),
                  style: TextStyle(
                    color: Colors.black,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    letterSpacing: .6,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }
}

// ADIM 4 — Kaydediliyor

class _SavingStep extends StatelessWidget {
  const _SavingStep({super.key});
  @override
  Widget build(BuildContext context) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const CircularProgressIndicator(color: AppColors.gold, strokeWidth: 2),
        const SizedBox(height: 18),
        Text(
          'add_item.adding_to_closet'.tr(),
          style: TextStyle(
            color: AppColorsExtension.of(context).textSub,
            fontSize: 15,
          ),
        ),
      ],
    ),
  );
}

// ADIM 5 — Tamamlandı

class _DoneStep extends StatelessWidget {
  final String name;
  final VoidCallback onAddAnother, onGoWardrobe;
  const _DoneStep({
    super.key,
    required this.name,
    required this.onAddAnother,
    required this.onGoWardrobe,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: 1),
              duration: const Duration(milliseconds: 700),
              curve: Curves.elasticOut,
              builder: (_, v, child) => Transform.scale(scale: v, child: child),
              child: Container(
                width: 88,
                height: 88,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.gold, AppColors.goldLight],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.gold.withValues(alpha: .4),
                      blurRadius: 28,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.check_rounded,
                  color: Colors.black,
                  size: 42,
                ),
              ),
            ),
            const SizedBox(height: 26),
            Text(
              'add_item.added'.tr(),
              style: TextStyle(
                fontFamily: 'Cormorant',
                fontSize: 40,
                fontWeight: FontWeight.w700,
                color: AppColorsExtension.of(context).text,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '"$name" ' + 'add_item.added_successfully'.tr(),
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColorsExtension.of(context).textSub,
                fontSize: 15,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 36),
            GestureDetector(
              onTap: onGoWardrobe,
              child: Container(
                height: 54,
                width: double.infinity,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.gold, AppColors.goldLight],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.gold.withValues(alpha: .35),
                      blurRadius: 18,
                      offset: const Offset(0, 5),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    'add_item.go_to_closet'.tr(),
                    style: TextStyle(
                      color: Colors.black,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            GestureDetector(
              onTap: onAddAnother,
              child: Container(
                height: 50,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: AppColorsExtension.of(context).surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColorsExtension.of(context).border, width: 1.5),
                ),
                child: Center(
                  child: Text(
                    'add_item.add_another'.tr(),
                    style: TextStyle(
                      color: AppColorsExtension.of(context).textSub,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Kategori Dropdown — Chips yerine dropdown (7 seçenek için daha temiz UX)

class _CategoryDropdown extends StatelessWidget {
  final String selected;
  final List<String> options;
  final ValueChanged<String> onChanged;

  const _CategoryDropdown({
    required this.selected,
    required this.options,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: AppColorsExtension.of(context).surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: selected.isEmpty
              ? AppColors.error.withValues(alpha: .5)
              : AppColors.gold,
          width: 1.5,
        ),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: selected.isEmpty ? null : selected,
          isExpanded: true,
          dropdownColor: AppColorsExtension.of(context).card,
          iconEnabledColor: AppColors.gold,
          iconDisabledColor: AppColorsExtension.of(context).muted,
          hint: Text(
            'add_item.select_category'.tr(),
            style: TextStyle(color: AppColorsExtension.of(context).muted, fontSize: 14),
          ),
          style: TextStyle(color: AppColorsExtension.of(context).text, fontSize: 14),
          items: options
              .map(
                (o) => DropdownMenuItem(
                  value: o,
                  child: Row(
                    children: [
                      Icon(
                        _categoryIcon(o),
                        color: selected == o
                            ? AppColors.gold
                            : AppColorsExtension.of(context).textSub,
                        size: 18,
                      ),
                      const SizedBox(width: 10),
                      Text(_categoryLabel(o)),
                    ],
                  ),
                ),
              )
              .toList(),
          onChanged: (v) {
            if (v != null) onChanged(v);
          },
        ),
      ),
    );
  }

  /// Backend Turkish değerini arayüz diline çevirir
  String _categoryLabel(String backendValue) {
    switch (backendValue) {
      case 'Dış Giyim': return 'add_item.outerwear'.tr();
      case 'Üst Giyim': return 'add_item.topwear'.tr();
      case 'Elbise':    return 'add_item.dress'.tr();
      case 'Alt Giyim': return 'add_item.bottomwear'.tr();
      case 'Ayakkabı':  return 'add_item.shoes'.tr();
      case 'Aksesuar':  return 'add_item.accessories'.tr();
      default: return backendValue;
    }
  }

  IconData _categoryIcon(String cat) {
    switch (cat) {
      case 'Üst Giyim':
        return Icons.dry_cleaning_outlined;
      case 'Alt Giyim':
        return Icons.checkroom_outlined;
      case 'Elbise':
        return Icons.woman_outlined;
      case 'Ayakkabı':
        return Icons.run_circle_outlined;
      case 'Aksesuar':
        return Icons.watch_outlined;
      case 'Dış Giyim':
        return Icons.layers_outlined;
      default:
        return Icons.category_outlined;
    }
  }
}

// Renk dairesel swatch (HEX kodunu parse eder, geçersizse göstermez)

class _ColorCircleSwatch extends StatefulWidget {
  final TextEditingController hexValue;
  const _ColorCircleSwatch({required this.hexValue});

  @override
  State<_ColorCircleSwatch> createState() => _ColorCircleSwatchState();
}

class _ColorCircleSwatchState extends State<_ColorCircleSwatch> {
  @override
  void initState() {
    super.initState();
    widget.hexValue.addListener(_rebuild);
  }

  @override
  void dispose() {
    widget.hexValue.removeListener(_rebuild);
    super.dispose();
  }

  void _rebuild() => setState(() {});

  Color? _parse(String raw) {
    final s = raw.trim().replaceAll('#', '');
    if (s.length != 6) return null;
    final val = int.tryParse(s, radix: 16);
    if (val == null) return null;
    return Color(0xFF000000 | val);
  }

  @override
  Widget build(BuildContext context) {
    final color = _parse(widget.hexValue.text);
    if (color == null) return const SizedBox.shrink();

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white24, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: .5),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
    );
  }
}

// Yardımcı widget'lar

class _DarkField extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  const _DarkField({required this.controller, required this.hint});

  @override
  Widget build(BuildContext context) => TextField(
    controller: controller,
    style: TextStyle(color: AppColorsExtension.of(context).text, fontSize: 14),
    cursorColor: AppColors.gold,
    decoration: InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: AppColorsExtension.of(context).muted, fontSize: 14),
      filled: true,
      fillColor: AppColorsExtension.of(context).surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: AppColorsExtension.of(context).border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.gold, width: 1.5),
      ),
    ),
  );
}

class _BackBtn extends StatelessWidget {
  final VoidCallback onTap;
  const _BackBtn({required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: AppColorsExtension.of(context).surface,
        shape: BoxShape.circle,
        border: Border.all(color: AppColorsExtension.of(context).border, width: 1.5),
      ),
      child: Icon(
        Icons.arrow_back_ios_new_rounded,
        color: AppColorsExtension.of(context).text,
        size: 16,
      ),
    ),
  );
}
