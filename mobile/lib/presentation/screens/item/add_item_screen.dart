import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/presentation/screens/auth/login_screen.dart';
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

  File? _image;
  String _step = 'pick'; // pick | analyzing | review | saving | done
  String _selectedCategory = '';
  String _selectedSeason = '';

  late final AnimationController _pulseCtrl;
  late final Animation<double> _pulseAnim;

  static const _categories = [
    'Üst Giyim',
    'Alt Giyim',
    'Elbise & Etek',
    'Ayakkabı',
    'Aksesuar',
    'Dış Giyim',
  ];
  static const _seasons = [
    'İlkbahar',
    'Yaz',
    'Sonbahar',
    'Kış',
    'Tüm Mevsimler',
  ];

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

  Future<void> _pick(ImageSource source) async {
    final xf = await _picker.pickImage(source: source, imageQuality: 85);
    if (xf == null) return;
    setState(() {
      _image = File(xf.path);
      _step = 'analyzing';
    });
    await _analyze();
  }

  Future<void> _analyze() async {
    // Analiz API yoksa direkt review adımına geç,
    // kullanıcı bilgileri manuel girebilir.
    if (!mounted) return;
    setState(() => _step = 'review');
  }

  Future<void> _save() async {
    if (_nameCtrl.text.trim().isEmpty) {
      _snack('Kıyafet adı girin.', isError: true);
      return;
    }
    if (_selectedCategory.isEmpty) {
      _snack('Lütfen bir kategori seçin.', isError: true);
      return;
    }
    if (_selectedSeason.isEmpty) {
      _snack('Lütfen bir mevsim seçin.', isError: true);
      return;
    }
    setState(() => _step = 'saving');

    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? '';

    // Token yoksa oturum sona ermiş — login'e yönlendir
    if (token.isEmpty) {
      if (mounted) {
        setState(() => _step = 'review');
        _snack(
          'Oturumunuz sona erdi, lütfen tekrar giriş yapın.',
          isError: true,
        );
        await Future.delayed(const Duration(seconds: 2));
        if (mounted) {
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (_) => const LoginScreen()),
            (_) => false,
          );
        }
      }
      return;
    }

    try {
      // http.Client ile gönder — Authorization header güvenilir şekilde iletilir
      final uri = Uri.parse('${ApiConstants.baseUrl}/items/add');
      final req = http.MultipartRequest('POST', uri);

      req.headers['Authorization'] = 'Bearer ${token.trim()}';
      req.headers['Accept'] = 'application/json';

      req.fields['ad'] = _nameCtrl.text.trim();
      req.fields['kategori'] = _selectedCategory;
      req.fields['renk'] = _colorCtrl.text.trim();
      req.fields['mevsim'] = _selectedSeason;

      if (_image != null) {
        req.files.add(await http.MultipartFile.fromPath('resim', _image!.path));
      }

      final client = http.Client();
      try {
        final streamed = await client
            .send(req)
            .timeout(const Duration(seconds: 30));
        final res = await http.Response.fromStream(streamed);

        if (!mounted) return;

        if (res.statusCode == 201) {
          setState(() => _step = 'done');
        } else {
          Map<String, dynamic> body = {};
          try {
            body = jsonDecode(res.body) as Map<String, dynamic>;
          } catch (_) {}
          final mesaj = body['mesaj'] ?? 'Kaydedilemedi (${res.statusCode})';
          setState(() => _step = 'review');
          _snack(mesaj, isError: true);
        }
      } finally {
        client.close();
      }
    } on TimeoutException catch (_) {
      if (mounted) {
        setState(() => _step = 'review');
        _snack('Sunucu yanıt vermedi, tekrar dene.', isError: true);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _step = 'review');
        _snack('Sunucuya bağlanılamadı.', isError: true);
      }
    }
  }

  void _reset() => setState(() {
    _step = 'pick';
    _image = null;
    _nameCtrl.clear();
    _colorCtrl.clear();
    _selectedCategory = '';
    _selectedSeason = '';
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
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
          onCamera: () => _pick(ImageSource.camera),
          onGallery: () => _pick(ImageSource.gallery),
        );
      case 'analyzing':
        return _AnalyzingStep(
          key: const ValueKey('analyzing'),
          image: _image,
          pulseAnim: _pulseAnim,
        );
      case 'review':
        return _ReviewStep(
          key: const ValueKey('review'),
          image: _image,
          nameCtrl: _nameCtrl,
          colorCtrl: _colorCtrl,
          selectedCategory: _selectedCategory,
          selectedSeason: _selectedSeason,
          categories: _categories,
          seasons: _seasons,
          onCategoryChange: (v) => setState(() => _selectedCategory = v),
          onSeasonChange: (v) => setState(() => _selectedSeason = v),
          onBack: _reset,
          onSave: _save,
        );
      case 'saving':
        return const _SavingStep(key: ValueKey('saving'));
      case 'done':
        return _DoneStep(
          key: const ValueKey('done'),
          name: _nameCtrl.text,
          onAddAnother: _reset,
          onGoWardrobe: () => Navigator.pop(context),
        );
      default:
        return const SizedBox.shrink();
    }
  }
}

// ADIM 1 — Seç
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
          const Text(
            'Kıyafet\nEkle.',
            style: TextStyle(
              fontFamily: 'Cormorant',
              fontSize: 52,
              fontWeight: FontWeight.w700,
              height: 1.05,
              color: AppColors.text,
              letterSpacing: -1,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'AI fotoğrafı analiz edip dolabına otomatik ekleyecek ✨',
            style: TextStyle(
              color: AppColors.textSub,
              fontSize: 14,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 40),

          // — büyük galeri alanı
          GestureDetector(
            onTap: onGallery,
            child: Container(
              height: 190,
              width: double.infinity,
              decoration: BoxDecoration(
                color: AppColors.surface,
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
                  const Text(
                    'Galeriden seç',
                    style: TextStyle(
                      color: AppColors.text,
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'JPG, PNG desteklenir',
                    style: TextStyle(color: AppColors.muted, fontSize: 12),
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
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border, width: 1.5),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.camera_alt_rounded,
                    color: AppColors.gold,
                    size: 21,
                  ),
                  SizedBox(width: 9),
                  Text(
                    'Kamerayı Aç',
                    style: TextStyle(
                      color: AppColors.text,
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),

          const Spacer(),

          // — AI not
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.gold.withValues(alpha: .06),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.gold.withValues(alpha: .2)),
            ),
            child: const Row(
              children: [
                Icon(
                  Icons.auto_awesome_rounded,
                  color: AppColors.goldLight,
                  size: 17,
                ),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'GPT-4o Vision fotoğrafınızdaki kıyafeti saniyeler içinde analiz eder.',
                    style: TextStyle(
                      color: AppColors.textSub,
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

// ADIM 2 — Analiz
class _AnalyzingStep extends StatelessWidget {
  final File? image;
  final Animation<double> pulseAnim;
  const _AnalyzingStep({super.key, this.image, required this.pulseAnim});

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
                    child: image != null
                        ? Image.file(image!, fit: BoxFit.cover)
                        : Container(color: AppColors.surface),
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

            const Text(
              'Analiz ediliyor...',
              style: TextStyle(
                fontFamily: 'Cormorant',
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: AppColors.text,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'GPT-4o kıyafetin rengini, kategorisini\nve mevsimini belirliyor',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.textSub,
                fontSize: 14,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 36),
            SizedBox(
              width: 180,
              child: LinearProgressIndicator(
                backgroundColor: AppColors.border,
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

// ADIM 3 — İnceleme
class _ReviewStep extends StatelessWidget {
  final File? image;
  final TextEditingController nameCtrl, colorCtrl;
  final String selectedCategory, selectedSeason;
  final List<String> categories, seasons;
  final ValueChanged<String> onCategoryChange, onSeasonChange;
  final VoidCallback onBack, onSave;

  const _ReviewStep({
    super.key,
    required this.image,
    required this.nameCtrl,
    required this.colorCtrl,
    required this.selectedCategory,
    required this.selectedSeason,
    required this.categories,
    required this.seasons,
    required this.onCategoryChange,
    required this.onSeasonChange,
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
                      'AI Tamamladı',
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
          const SizedBox(height: 22),

          // — görsel + ad/renk
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: SizedBox(
                  width: 115,
                  height: 145,
                  child: image != null
                      ? Image.file(image!, fit: BoxFit.cover)
                      : Container(color: AppColors.surface),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('AD', style: AppTextStyles.label),
                    const SizedBox(height: 6),
                    _DarkField(controller: nameCtrl, hint: 'Kıyafet adı'),
                    const SizedBox(height: 12),
                    Text('RENK', style: AppTextStyles.label),
                    const SizedBox(height: 6),
                    _DarkField(controller: colorCtrl, hint: 'Örn: Siyah'),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 22),

          Text(
            'KATEGORİ',
            style: AppTextStyles.label.copyWith(letterSpacing: 1.2),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: categories
                .map(
                  (c) => AppFilterChip(
                    label: c,
                    selected: selectedCategory == c,
                    onTap: () => onCategoryChange(c),
                  ),
                )
                .toList(),
          ),

          const SizedBox(height: 18),

          Text(
            'MEVSİM',
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

          const SizedBox(height: 30),

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
              child: const Center(
                child: Text(
                  'Dolaba Ekle',
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
  Widget build(BuildContext context) => const Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        CircularProgressIndicator(color: AppColors.gold, strokeWidth: 2),
        SizedBox(height: 18),
        Text(
          'Dolaba ekleniyor...',
          style: TextStyle(color: AppColors.textSub, fontSize: 15),
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
            const Text(
              'Eklendi!',
              style: TextStyle(
                fontFamily: 'Cormorant',
                fontSize: 40,
                fontWeight: FontWeight.w700,
                color: AppColors.text,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '"$name" dolabına başarıyla eklendi.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.textSub,
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
                child: const Center(
                  child: Text(
                    'Dolabıma Git',
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
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border, width: 1.5),
                ),
                child: const Center(
                  child: Text(
                    'Bir Tane Daha Ekle',
                    style: TextStyle(
                      color: AppColors.textSub,
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

// Yardımcılar
class _DarkField extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  const _DarkField({required this.controller, required this.hint});

  @override
  Widget build(BuildContext context) => TextField(
    controller: controller,
    style: const TextStyle(color: AppColors.text, fontSize: 14),
    cursorColor: AppColors.gold,
    decoration: InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: AppColors.muted, fontSize: 14),
      filled: true,
      fillColor: AppColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border),
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
        color: AppColors.surface,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.border, width: 1.5),
      ),
      child: const Icon(
        Icons.arrow_back_ios_new_rounded,
        color: AppColors.text,
        size: 16,
      ),
    ),
  );
}
