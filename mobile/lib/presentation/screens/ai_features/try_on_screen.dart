import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_wardrobe_ai/data/models/clothing_item.dart';
import 'package:smart_wardrobe_ai/core/constants/api_constants.dart';
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/presentation/screens/item/add_item_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/favorites_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/home_screen.dart';
import 'package:smart_wardrobe_ai/presentation/screens/main/wardrobe_screen.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_background.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_bottom_nav.dart';
import 'package:smart_wardrobe_ai/presentation/widgets/shared/app_text_styles.dart';
import 'package:smart_wardrobe_ai/core/utils/nav_transitions.dart';

class TryOnScreen extends StatefulWidget {
  const TryOnScreen({super.key});

  @override
  State<TryOnScreen> createState() => _TryOnScreenState();
}

class _TryOnScreenState extends State<TryOnScreen>
    with TickerProviderStateMixin {
  final _picker = ImagePicker();

  File? _userPhoto;
  ClothingItem? _selectedItem;
  String? _resultUrl;
  String _step = 'photo';

  List<ClothingItem> _wardrobe = [];
  bool _loadingWardrobe = true;

  late final AnimationController _pulseCtrl;
  late final AnimationController _resultCtrl;
  late final Animation<double> _pulseAnim;
  late final Animation<double> _resultAnim;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(
      begin: .92,
      end: 1.06,
    ).animate(CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut));
    _resultCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _resultAnim = CurvedAnimation(parent: _resultCtrl, curve: Curves.easeOut);
    _fetchWardrobe();
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    _resultCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchWardrobe() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? '';
    try {
      final res = await http
          .get(
            Uri.parse('${ApiConstants.baseUrl}/kiyafetler'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(const Duration(seconds: 8));
      if (!mounted) return;
      if (res.statusCode == 200) {
        final raw = jsonDecode(res.body);
        final list = (raw['kiyafetler'] ?? raw) as List;
        setState(() {
          _wardrobe = list.map((e) => ClothingItem.fromJson(e)).toList();
          _loadingWardrobe = false;
        });
      } else {
        setState(() => _loadingWardrobe = false);
      }
    } catch (_) {
      if (mounted) setState(() => _loadingWardrobe = false);
    }
  }

  Future<void> _pickPhoto(ImageSource source) async {
    final xf = await _picker.pickImage(source: source, imageQuality: 90);
    if (xf == null) return;
    setState(() {
      _userPhoto = File(xf.path);
      _step = 'clothing';
    });
  }

  Future<void> _startTryOn() async {
    if (_userPhoto == null || _selectedItem == null) return;
    setState(() {
      _step = 'processing';
      _resultUrl = null;
    });
    _resultCtrl.reset();
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? '';
    try {
      final req =
          http.MultipartRequest(
              'POST',
              Uri.parse('${ApiConstants.baseUrl}/tryon'),
            )
            ..headers['Authorization'] = 'Bearer $token'
            ..fields['kiyafetId'] = _selectedItem!.id
            ..files.add(
              await http.MultipartFile.fromPath('userPhoto', _userPhoto!.path),
            );
      final streamed = await req.send().timeout(const Duration(seconds: 45));
      final res = await http.Response.fromStream(streamed);
      final data = jsonDecode(res.body);
      if (!mounted) return;
      if (res.statusCode == 200) {
        setState(() {
          _resultUrl = data['sonucUrl'] ?? data['resultUrl'];
          _step = 'result';
        });
        _resultCtrl.forward();
      } else {
        setState(() => _step = 'clothing');
        _snack(data['mesaj'] ?? 'Try-on başarısız oldu.');
      }
    } catch (_) {
      if (mounted) {
        setState(() => _step = 'clothing');
        _snack('Sunucuya bağlanılamadı.');
      }
    }
  }

  void _reset() => setState(() {
    _step = 'photo';
    _userPhoto = null;
    _selectedItem = null;
    _resultUrl = null;
  });

  void _snack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: AppColors.error,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  void _onNavTap(int index) {
    if (index == 3) return;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      extendBody: true,
      bottomNavigationBar: AppBottomNav(currentIndex: 3, onTap: _onNavTap),
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(22, 16, 22, 0),
                child: Row(
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'SANAL PROVA',
                          style: AppTextStyles.label.copyWith(letterSpacing: 2),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Try On',
                          style: TextStyle(
                            fontFamily: 'Cormorant',
                            fontSize: 32,
                            fontWeight: FontWeight.w700,
                            color: AppColors.text,
                          ),
                        ),
                      ],
                    ),
                    const Spacer(),
                    if (_step != 'photo')
                      GestureDetector(
                        onTap: _reset,
                        child: Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            shape: BoxShape.circle,
                            border: Border.all(color: AppColors.border),
                          ),
                          child: const Icon(
                            Icons.refresh_rounded,
                            color: AppColors.textSub,
                            size: 20,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(22, 14, 22, 0),
                child: _StepBar(current: _step),
              ),
              const SizedBox(height: 14),
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 350),
                  transitionBuilder: (child, anim) => FadeTransition(
                    opacity: CurvedAnimation(
                      parent: anim,
                      curve: Curves.easeOut,
                    ),
                    child: child,
                  ),
                  child: _buildStep(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStep() {
    switch (_step) {
      case 'photo':
        return _PhotoStep(
          key: const ValueKey('photo'),
          onGallery: () => _pickPhoto(ImageSource.gallery),
          onCamera: () => _pickPhoto(ImageSource.camera),
        );
      case 'clothing':
        return _ClothingStep(
          key: const ValueKey('clothing'),
          userPhoto: _userPhoto,
          wardrobe: _wardrobe,
          loading: _loadingWardrobe,
          selected: _selectedItem,
          onSelect: (item) => setState(() => _selectedItem = item),
          onStart: _selectedItem != null ? _startTryOn : null,
        );
      case 'processing':
        return _ProcessingStep(
          key: const ValueKey('processing'),
          pulseAnim: _pulseAnim,
          userPhoto: _userPhoto,
          clothing: _selectedItem,
        );
      case 'result':
        return _ResultStep(
          key: const ValueKey('result'),
          resultUrl: _resultUrl,
          clothingName: _selectedItem?.name ?? '',
          fadeAnim: _resultAnim,
          onRetry: _reset,
          onTryAnother: () => setState(() {
            _step = 'clothing';
            _selectedItem = null;
            _resultUrl = null;
          }),
        );
      default:
        return const SizedBox.shrink();
    }
  }
}

class _StepBar extends StatelessWidget {
  final String current;
  const _StepBar({required this.current});
  static const _steps = ['photo', 'clothing', 'processing', 'result'];
  static const _labels = ['Fotoğraf', 'Kıyafet', 'İşleniyor', 'Sonuç'];

  @override
  Widget build(BuildContext context) {
    final idx = _steps.indexOf(current);
    return Row(
      children: List.generate(_steps.length, (i) {
        final done = i < idx;
        final active = i == idx;
        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(right: i < _steps.length - 1 ? 4 : 0),
            child: Column(
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  height: 3,
                  decoration: BoxDecoration(
                    color: done || active ? AppColors.gold : AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  _labels[i],
                  style: TextStyle(
                    fontSize: 10,
                    color: active
                        ? AppColors.gold
                        : done
                        ? AppColors.goldDim
                        : AppColors.muted,
                    fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                  ),
                ),
              ],
            ),
          ),
        );
      }),
    );
  }
}

class _PhotoStep extends StatelessWidget {
  final VoidCallback onGallery, onCamera;
  const _PhotoStep({
    super.key,
    required this.onGallery,
    required this.onCamera,
  });

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 22),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Kendinizin\nFotoğrafını Ekle',
          style: TextStyle(
            fontFamily: 'Cormorant',
            fontSize: 34,
            fontWeight: FontWeight.w700,
            height: 1.1,
            color: AppColors.text,
            letterSpacing: -.5,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Kıyafeti üzerinizde görmek için önce bir fotoğraf ekleyin.',
          style: TextStyle(color: AppColors.textSub, fontSize: 14, height: 1.5),
        ),
        const SizedBox(height: 28),
        GestureDetector(
          onTap: onGallery,
          child: Container(
            height: 260,
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: AppColors.goldDim, width: 1.5),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 68,
                  height: 68,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppColors.gold.withOpacity(.18),
                        AppColors.goldLight.withOpacity(.06),
                      ],
                    ),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.person_add_alt_1_rounded,
                    color: AppColors.gold,
                    size: 30,
                  ),
                ),
                const SizedBox(height: 14),
                const Text(
                  'Galeriden Seç',
                  style: TextStyle(
                    color: AppColors.text,
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Tam boy fotoğraf önerilir',
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
            height: 52,
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border, width: 1.5),
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.camera_alt_rounded, color: AppColors.gold, size: 20),
                SizedBox(width: 8),
                Text(
                  'Kamerayı Aç',
                  style: TextStyle(
                    color: AppColors.text,
                    fontSize: 14,
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

class _ClothingStep extends StatelessWidget {
  final File? userPhoto;
  final List<ClothingItem> wardrobe;
  final bool loading;
  final ClothingItem? selected;
  final ValueChanged<ClothingItem> onSelect;
  final VoidCallback? onStart;

  const _ClothingStep({
    super.key,
    required this.userPhoto,
    required this.wardrobe,
    required this.loading,
    required this.selected,
    required this.onSelect,
    required this.onStart,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(22, 0, 22, 14),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: userPhoto != null
                    ? Image.file(
                        userPhoto!,
                        width: 66,
                        height: 86,
                        fit: BoxFit.cover,
                      )
                    : Container(
                        width: 66,
                        height: 86,
                        color: AppColors.surface,
                      ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Hangi kıyafeti denemek istiyorsun?',
                      style: TextStyle(
                        color: AppColors.text,
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                        height: 1.3,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      '${wardrobe.length} kıyafet mevcut',
                      style: AppTextStyles.caption,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: loading
              ? const Center(
                  child: CircularProgressIndicator(
                    color: AppColors.gold,
                    strokeWidth: 2,
                  ),
                )
              : wardrobe.isEmpty
              ? const Center(
                  child: Text(
                    'Dolabınızda kıyafet yok.',
                    style: TextStyle(color: AppColors.muted),
                  ),
                )
              : GridView.builder(
                  padding: const EdgeInsets.fromLTRB(22, 0, 22, 110),
                  itemCount: wardrobe.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: .72,
                  ),
                  itemBuilder: (_, i) {
                    final item = wardrobe[i];
                    final isSel = selected?.id == item.id;
                    return GestureDetector(
                      onTap: () => onSelect(item),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSel ? AppColors.gold : AppColors.border,
                            width: isSel ? 2 : 1,
                          ),
                        ),
                        child: Stack(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(11),
                              child: item.imageUrl != null
                                  ? Image.network(
                                      item.imageUrl!,
                                      fit: BoxFit.cover,
                                      width: double.infinity,
                                      height: double.infinity,
                                      errorBuilder: (_, __, ___) =>
                                          Container(color: AppColors.surface),
                                    )
                                  : Container(
                                      color: AppColors.surface,
                                      child: const Icon(
                                        Icons.checkroom_outlined,
                                        color: AppColors.muted,
                                      ),
                                    ),
                            ),
                            if (isSel)
                              Positioned(
                                top: 5,
                                right: 5,
                                child: Container(
                                  width: 20,
                                  height: 20,
                                  decoration: const BoxDecoration(
                                    color: AppColors.gold,
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
                  },
                ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(22, 0, 22, 22),
          child: GestureDetector(
            onTap: onStart,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              height: 54,
              decoration: BoxDecoration(
                gradient: onStart != null
                    ? const LinearGradient(
                        colors: [AppColors.gold, AppColors.goldLight],
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                      )
                    : null,
                color: onStart == null ? AppColors.surface : null,
                borderRadius: BorderRadius.circular(15),
                boxShadow: onStart != null
                    ? [
                        BoxShadow(
                          color: AppColors.gold.withOpacity(.35),
                          blurRadius: 16,
                          offset: const Offset(0, 5),
                        ),
                      ]
                    : null,
                border: onStart == null
                    ? Border.all(color: AppColors.border)
                    : null,
              ),
              child: Center(
                child: Text(
                  'Kıyafeti Dene',
                  style: TextStyle(
                    color: onStart != null ? Colors.black : AppColors.muted,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    letterSpacing: .4,
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _ProcessingStep extends StatelessWidget {
  final Animation<double> pulseAnim;
  final File? userPhoto;
  final ClothingItem? clothing;
  const _ProcessingStep({
    super.key,
    required this.pulseAnim,
    this.userPhoto,
    this.clothing,
  });

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 36),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: userPhoto != null
                    ? Image.file(
                        userPhoto!,
                        width: 95,
                        height: 125,
                        fit: BoxFit.cover,
                      )
                    : Container(
                        width: 95,
                        height: 125,
                        color: AppColors.surface,
                      ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: AnimatedBuilder(
                  animation: pulseAnim,
                  builder: (_, __) => Transform.scale(
                    scale: pulseAnim.value,
                    child: Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [AppColors.gold, AppColors.goldLight],
                        ),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.gold.withOpacity(.4),
                            blurRadius: 12,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.auto_awesome_rounded,
                        color: Colors.black,
                        size: 19,
                      ),
                    ),
                  ),
                ),
              ),
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: clothing?.imageUrl != null
                    ? Image.network(
                        clothing!.imageUrl!,
                        width: 95,
                        height: 125,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          width: 95,
                          height: 125,
                          color: AppColors.surface,
                        ),
                      )
                    : Container(
                        width: 95,
                        height: 125,
                        color: AppColors.surface,
                        child: const Icon(
                          Icons.checkroom_outlined,
                          color: AppColors.muted,
                        ),
                      ),
              ),
            ],
          ),
          const SizedBox(height: 36),
          const Text(
            'Prova yapılıyor...',
            style: TextStyle(
              fontFamily: 'Cormorant',
              fontSize: 28,
              fontWeight: FontWeight.w700,
              color: AppColors.text,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'AI kıyafeti üzerinize giydiriyor,\nbu birkaç saniye sürebilir.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.textSub,
              fontSize: 14,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: 160,
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

class _ResultStep extends StatelessWidget {
  final String? resultUrl;
  final String clothingName;
  final Animation<double> fadeAnim;
  final VoidCallback onRetry, onTryAnother;

  const _ResultStep({
    super.key,
    required this.resultUrl,
    required this.clothingName,
    required this.fadeAnim,
    required this.onRetry,
    required this.onTryAnother,
  });

  @override
  Widget build(BuildContext context) => FadeTransition(
    opacity: fadeAnim,
    child: SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(22, 0, 22, 110),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: resultUrl != null
                ? Image.network(
                    resultUrl!,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _ResultPlaceholder(),
                  )
                : _ResultPlaceholder(),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Prova Sonucu',
                      style: TextStyle(
                        fontFamily: 'Cormorant',
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: AppColors.text,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(clothingName, style: AppTextStyles.caption),
                  ],
                ),
              ),
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.border),
                ),
                child: const Icon(
                  Icons.share_outlined,
                  color: AppColors.textSub,
                  size: 19,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          GestureDetector(
            onTap: onTryAnother,
            child: Container(
              height: 54,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.gold, AppColors.goldLight],
                ),
                borderRadius: BorderRadius.circular(15),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.gold.withOpacity(.35),
                    blurRadius: 16,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: const Center(
                child: Text(
                  'Başka Kıyafet Dene',
                  style: TextStyle(
                    color: Colors.black,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),
          GestureDetector(
            onTap: onRetry,
            child: Container(
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(13),
                border: Border.all(color: AppColors.border),
              ),
              child: const Center(
                child: Text(
                  'Yeni Fotoğrafla Başla',
                  style: TextStyle(
                    color: AppColors.textSub,
                    fontSize: 13,
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

class _ResultPlaceholder extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    height: 360,
    color: AppColors.surface,
    child: const Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          Icons.image_not_supported_outlined,
          color: AppColors.muted,
          size: 44,
        ),
        SizedBox(height: 10),
        Text('Görsel yüklenemedi', style: TextStyle(color: AppColors.muted)),
      ],
    ),
  );
}
