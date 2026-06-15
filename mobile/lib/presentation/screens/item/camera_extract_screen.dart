//  Camera Extract Screen
//  Web'deki "kamera aç → poz ver → kıyafete dokun → kes" akışının
//  Flutter karşılığı. Canlı kamera önizlemesi (camera paketi) ve
//  on-device segmentasyon (ClothingExtractor / tflite_flutter)
//  kullanılarak dokunulan kıyafet/aksesuar şeffaf arka planlı bir
//  PNG olarak kesilir.

import 'dart:typed_data';

import 'package:camera/camera.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;
import 'package:smart_wardrobe_ai/core/constants/app_colors.dart';
import 'package:smart_wardrobe_ai/core/utils/clothing_extractor.dart';

/// Bu ekrandan dönen sonuç: ya kesilmiş (şeffaf) kıyafet PNG'i,
/// ya da kullanıcının "tüm fotoğrafı kullan" dediği orijinal kare.
class CameraExtractResult {
  final Uint8List bytes;
  final String filename;

  const CameraExtractResult({required this.bytes, required this.filename});
}

enum _CamStep { live, select, preview }

class CameraExtractScreen extends StatefulWidget {
  const CameraExtractScreen({super.key});

  @override
  State<CameraExtractScreen> createState() => _CameraExtractScreenState();
}

class _CameraExtractScreenState extends State<CameraExtractScreen> {
  CameraController? _controller;
  List<CameraDescription> _cameras = [];
  Future<void>? _initFuture;
  String? _cameraError;

  _CamStep _step = _CamStep.live;

  Uint8List? _capturedBytes;
  img.Image? _capturedImage;

  SegmentationResult? _segmentation;
  bool _busy = false;
  String? _hint;

  ExtractResult? _extractResult;

  /// Dokunma koordinatını görsele göre normalize etmek için
  /// (AspectRatio kutusunun gerçek render boyutunu okumak amacıyla).
  final GlobalKey _tapBoxKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    // Modeli arka planda ısıt — ilk dokunuşta gecikmeyi azaltır.
    ClothingExtractor.warmUp();
    _initFuture = _initCamera();
  }

  Future<void> _initCamera() async {
    try {
      _cameras = await availableCameras();
      if (_cameras.isEmpty) {
        setState(() => _cameraError = 'add_item.camera_init_error'.tr());
        return;
      }
      // Kullanıcı kendi üstündeki kıyafete poz vereceği için ön kamerayı tercih et.
      final preferred = _cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
        orElse: () => _cameras.first,
      );
      await _openCamera(preferred);
    } catch (_) {
      if (mounted) {
        setState(() => _cameraError = 'add_item.camera_init_error'.tr());
      }
    }
  }

  Future<void> _openCamera(CameraDescription description) async {
    final old = _controller;
    final controller = CameraController(
      description,
      ResolutionPreset.high,
      enableAudio: false,
      imageFormatGroup: ImageFormatGroup.jpeg,
    );
    _controller = controller;
    await controller.initialize();
    await old?.dispose();
    if (mounted) setState(() {});
  }

  Future<void> _switchCamera() async {
    if (_cameras.length < 2 || _controller == null) return;
    final current = _controller!.description;
    final next = _cameras.firstWhere(
      (c) => c.lensDirection != current.lensDirection,
      orElse: () => current,
    );
    if (next == current) return;
    setState(() => _cameraError = null);
    await _openCamera(next);
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  // Fotoğraf çek

  Future<void> _capture() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized || _busy) {
      return;
    }
    setState(() => _busy = true);
    try {
      final xfile = await controller.takePicture();
      final bytes = await xfile.readAsBytes();
      var decoded = img.decodeImage(bytes);
      if (decoded == null) {
        throw Exception('decode-failed');
      }
      // EXIF yönlendirmesini uygula (bazı cihazlarda görsel yan yatık gelir).
      decoded = img.bakeOrientation(decoded);

      setState(() {
        _capturedBytes = img.encodeJpg(decoded!, quality: 92);
        _capturedImage = decoded;
        _step = _CamStep.select;
        _segmentation = null;
        _extractResult = null;
        _hint = null;
      });
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('add_item.camera_init_error'.tr())),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  // Dokunarak kıyafet seç

  Future<void> _onTapImage(double normX, double normY) async {
    final image = _capturedImage;
    if (image == null || _busy) return;

    setState(() {
      _busy = true;
      _hint = null;
    });

    try {
      _segmentation ??= await ClothingExtractor.segmentImage(image);
      final result = await ClothingExtractor.extractRegionAtPoint(
        image,
        _segmentation!,
        normX,
        normY,
      );

      if (!mounted) return;

      if (result == null) {
        setState(() {
          _busy = false;
          _hint = 'add_item.extract_no_garment'.tr();
        });
        return;
      }

      setState(() {
        _busy = false;
        _extractResult = result;
        _step = _CamStep.preview;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _hint = 'add_item.extract_no_garment'.tr();
      });
    }
  }

  void _retryFromSelect() {
    setState(() {
      _extractResult = null;
      _step = _CamStep.select;
      _hint = null;
    });
  }

  void _retake() {
    setState(() {
      _capturedBytes = null;
      _capturedImage = null;
      _segmentation = null;
      _extractResult = null;
      _hint = null;
      _step = _CamStep.live;
    });
  }

  void _useCutout() {
    final result = _extractResult;
    if (result == null) return;
    Navigator.pop(
      context,
      CameraExtractResult(bytes: result.pngBytes, filename: 'kiyafet.png'),
    );
  }

  void _useFullPhoto() {
    final bytes = _capturedBytes;
    if (bytes == null) return;
    Navigator.pop(
      context,
      CameraExtractResult(bytes: bytes, filename: 'fotograf.jpg'),
    );
  }

  // Build

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: switch (_step) {
          _CamStep.live => _buildLive(),
          _CamStep.select => _buildSelect(),
          _CamStep.preview => _buildPreview(),
        },
      ),
    );
  }

  Widget _buildLive() {
    if (_cameraError != null) {
      return _buildErrorState(_cameraError!);
    }

    return FutureBuilder<void>(
      future: _initFuture,
      builder: (context, snapshot) {
        final controller = _controller;
        if (controller == null || !controller.value.isInitialized) {
          return const Center(
            child: CircularProgressIndicator(color: AppColors.gold),
          );
        }

        return Stack(
          fit: StackFit.expand,
          children: [
            Center(child: CameraPreview(controller)),
            // Üst bar
            Positioned(
              top: 8,
              left: 8,
              right: 8,
              child: Row(
                children: [
                  _RoundIconButton(
                    icon: Icons.close,
                    onTap: () => Navigator.pop(context),
                  ),
                  const Spacer(),
                  if (_cameras.length > 1)
                    _RoundIconButton(
                      icon: Icons.cameraswitch_outlined,
                      onTap: _switchCamera,
                    ),
                ],
              ),
            ),
            // Alt bilgi + çekim butonu
            Positioned(
              left: 0,
              right: 0,
              bottom: 24,
              child: Column(
                children: [
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 32),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.45),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Text(
                      'add_item.extract_tap_hint'.tr(),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: AppColors.text,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  GestureDetector(
                    onTap: _busy ? null : _capture,
                    child: Container(
                      width: 74,
                      height: 74,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.gold, width: 4),
                      ),
                      child: Center(
                        child: _busy
                            ? const SizedBox(
                                width: 28,
                                height: 28,
                                child: CircularProgressIndicator(
                                  color: AppColors.gold,
                                  strokeWidth: 2.5,
                                ),
                              )
                            : Container(
                                width: 58,
                                height: 58,
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: AppColors.gold,
                                ),
                              ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildSelect() {
    final bytes = _capturedBytes;
    final image = _capturedImage;
    if (bytes == null || image == null) return _buildLive();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
          child: Row(
            children: [
              _RoundIconButton(icon: Icons.close, onTap: _retake),
              const Spacer(),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          child: Text(
            'add_item.extract_tap_hint'.tr(),
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.text,
              fontWeight: FontWeight.w600,
              fontSize: 15,
            ),
          ),
        ),
        Expanded(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: AspectRatio(
                aspectRatio: image.width / image.height,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: GestureDetector(
                        key: _tapBoxKey,
                        onTapDown: (details) {
                          final box =
                              _tapBoxKey.currentContext?.findRenderObject()
                                  as RenderBox?;
                          if (box == null) return;
                          // Box, AspectRatio sayesinde tam görsel oranındadır;
                          // dolayısıyla yerel konum / boyut = normalize koordinat.
                          final size = box.size;
                          final normX = (details.localPosition.dx / size.width)
                              .clamp(0.0, 1.0);
                          final normY = (details.localPosition.dy / size.height)
                              .clamp(0.0, 1.0);
                          _onTapImage(normX, normY);
                        },
                        child: Image.memory(bytes, fit: BoxFit.fill),
                      ),
                    ),
                    if (_busy)
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.35),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const CircularProgressIndicator(
                                color: AppColors.gold,
                              ),
                              const SizedBox(height: 12),
                              Text(
                                _segmentation == null
                                    ? 'add_item.extract_loading_model'.tr()
                                    : 'add_item.extract_analyzing'.tr(),
                                style: const TextStyle(color: AppColors.text),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
        if (_hint != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              _hint!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.error, fontSize: 13),
            ),
          ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _busy ? null : _retake,
                  icon: const Icon(
                    Icons.refresh,
                    size: 18,
                    color: AppColors.textSub,
                  ),
                  label: Text(
                    'add_item.extract_retake_photo'.tr(),
                    style: const TextStyle(color: AppColors.textSub),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.border),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton(
                  onPressed: _busy ? null : _useFullPhoto,
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.gold),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    'add_item.extract_use_full_photo'.tr(),
                    style: const TextStyle(
                      color: AppColors.gold,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPreview() {
    final result = _extractResult;
    if (result == null) return _buildSelect();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
          child: Row(
            children: [
              _RoundIconButton(icon: Icons.close, onTap: _retake),
              const Spacer(),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          child: Text(
            'add_item.extract_preview_title'.tr(),
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.text,
              fontWeight: FontWeight.w600,
              fontSize: 16,
            ),
          ),
        ),
        Expanded(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: AspectRatio(
                aspectRatio: result.width / result.height,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: CustomPaint(
                    painter: _CheckerboardPainter(),
                    child: Image.memory(result.pngBytes, fit: BoxFit.contain),
                  ),
                ),
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
          child: Column(
            children: [
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _useCutout,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.gold,
                    foregroundColor: AppColors.bg,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    'add_item.extract_use_cutout'.tr(),
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: _retryFromSelect,
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.border),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    'add_item.extract_retry'.tr(),
                    style: const TextStyle(color: AppColors.textSub),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildErrorState(String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.videocam_off_outlined,
              color: AppColors.muted,
              size: 48,
            ),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textSub),
            ),
            const SizedBox(height: 24),
            OutlinedButton(
              onPressed: () => Navigator.pop(context),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.border),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                'common.close'.tr(),
                style: const TextStyle(color: AppColors.textSub),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Yardımcı widget'lar

class _RoundIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _RoundIconButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.45),
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Icon(icon, color: AppColors.text, size: 22),
        ),
      ),
    );
  }
}

/// Şeffaf PNG önizlemesi için satranç tahtası deseni.
class _CheckerboardPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    const cell = 14.0;
    final light = Paint()..color = const Color(0xFF2A2A26);
    final dark = Paint()..color = const Color(0xFF1A1A17);

    for (double y = 0; y < size.height; y += cell) {
      for (double x = 0; x < size.width; x += cell) {
        final isEven = ((x / cell).floor() + (y / cell).floor()) % 2 == 0;
        canvas.drawRect(Rect.fromLTWH(x, y, cell, cell), isEven ? light : dark);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
