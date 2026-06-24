//  Clothing Extractor (Mobile)
//  Web sürümündeki (web/src/lib/utils/clothingExtractor.ts) ile
//  AYNI MediaPipe "selfie_multiclass_256x256" segmentasyon modelini
//  cihaz üzerinde (tflite_flutter) çalıştırır. Kullanıcının dokunduğu
//  noktadaki kıyafet/aksesuar bölgesini flood-fill ile bulur ve
//  şeffaf arka planlı bir "cutout" PNG üretir.

import 'dart:typed_data';
import 'dart:math' as math;

import 'package:image/image.dart' as img;
import 'package:tflite_flutter/tflite_flutter.dart';

/// selfie_multiclass_256x256 sınıf indeksleri
/// 0: background, 1: hair, 2: body-skin, 3: face-skin, 4: clothes, 5: others (accessories)
const Set<int> kClothingTargetClasses = {4, 5};

const String kSegmentationModelAsset =
    'assets/models/selfie_multiclass_256x256.tflite';

const int _kInputSize = 256;
const int _kMaxOutputDim = 1024;
const double _kPaddingRatio = 0.06;

/// Segmentasyon sonucu: model çıkışından üretilen sınıf maskesi.
class SegmentationResult {
  final Uint8List categoryMask; // maskWidth * maskHeight, değer 0..5
  final int maskWidth;
  final int maskHeight;
  final int imageWidth;
  final int imageHeight;

  SegmentationResult({
    required this.categoryMask,
    required this.maskWidth,
    required this.maskHeight,
    required this.imageWidth,
    required this.imageHeight,
  });
}

/// Kesilen kıyafet/aksesuar görseli (şeffaf arka planlı PNG).
class ExtractResult {
  final Uint8List pngBytes;
  final int width;
  final int height;

  ExtractResult({
    required this.pngBytes,
    required this.width,
    required this.height,
  });
}

class ClothingExtractor {
  ClothingExtractor._();

  static Interpreter? _interpreter;
  static Future<Interpreter>? _loadingFuture;

  /// Modeli yükler (lazy + singleton). İlk çağrıda biraz zaman alabilir.
  static Future<Interpreter> _getInterpreter() {
    final existing = _interpreter;
    if (existing != null) return Future.value(existing);

    _loadingFuture ??= Interpreter.fromAsset(kSegmentationModelAsset).then((
      interpreter,
    ) {
      _interpreter = interpreter;
      return interpreter;
    });
    return _loadingFuture!;
  }

  /// Modeli önceden ısıtmak için (ör. kamera ekranı açılırken) çağrılabilir.
  static Future<void> warmUp() => _getInterpreter();

  /// Görsel üzerinde segmentasyon çalıştırır.
  /// Sonuç, aynı fotoğraf için yapılacak tüm dokunma seçimlerinde
  /// tekrar kullanılabilir (cache'lenebilir).
  static Future<SegmentationResult> segmentImage(img.Image image) async {
    final interpreter = await _getInterpreter();

    final resized = img.copyResize(
      image,
      width: _kInputSize,
      height: _kInputSize,
      interpolation: img.Interpolation.linear,
    );

    // Girdi tensörü: [1, 256, 256, 3], float32, normalize edilmiş 0..1
    final input = List.generate(
      1,
      (_) => List.generate(
        _kInputSize,
        (y) => List.generate(_kInputSize, (x) {
          final p = resized.getPixel(x, y);
          return [p.r / 255.0, p.g / 255.0, p.b / 255.0];
        }),
      ),
    );

    // Çıkış tensörü: [1, 256, 256, 6] (sınıf skorları)
    final output = List.generate(
      1,
      (_) => List.generate(
        _kInputSize,
        (_) => List.generate(_kInputSize, (_) => List.filled(6, 0.0)),
      ),
    );

    interpreter.run(input, output);

    final mask = Uint8List(_kInputSize * _kInputSize);
    for (var y = 0; y < _kInputSize; y++) {
      for (var x = 0; x < _kInputSize; x++) {
        final scores = output[0][y][x];
        var bestIdx = 0;
        var bestVal = scores[0];
        for (var c = 1; c < scores.length; c++) {
          final v = scores[c];
          if (v > bestVal) {
            bestVal = v;
            bestIdx = c;
          }
        }
        mask[y * _kInputSize + x] = bestIdx;
      }
    }

    return SegmentationResult(
      categoryMask: mask,
      maskWidth: _kInputSize,
      maskHeight: _kInputSize,
      imageWidth: image.width,
      imageHeight: image.height,
    );
  }

  /// Maskede (startX, startY) içeren ve kClothingTargetClasses'a ait
  /// bağlı bölgeyi flood-fill (BFS) ile bulur.
  static Uint8List? _floodFillComponent(
    Uint8List mask,
    int w,
    int h,
    int startX,
    int startY,
  ) {
    final startIdx = startY * w + startX;
    if (!kClothingTargetClasses.contains(mask[startIdx])) return null;

    final selected = Uint8List(w * h);
    final stack = <int>[startIdx];
    selected[startIdx] = 1;

    while (stack.isNotEmpty) {
      final idx = stack.removeLast();
      final x = idx % w;
      final y = (idx - x) ~/ w;

      if (x > 0) {
        final n = idx - 1;
        if (selected[n] == 0 && kClothingTargetClasses.contains(mask[n])) {
          selected[n] = 1;
          stack.add(n);
        }
      }
      if (x < w - 1) {
        final n = idx + 1;
        if (selected[n] == 0 && kClothingTargetClasses.contains(mask[n])) {
          selected[n] = 1;
          stack.add(n);
        }
      }
      if (y > 0) {
        final n = idx - w;
        if (selected[n] == 0 && kClothingTargetClasses.contains(mask[n])) {
          selected[n] = 1;
          stack.add(n);
        }
      }
      if (y < h - 1) {
        final n = idx + w;
        if (selected[n] == 0 && kClothingTargetClasses.contains(mask[n])) {
          selected[n] = 1;
          stack.add(n);
        }
      }
    }

    return selected;
  }

  /// `selected` ızgarasını (0/1) (x, y) noktasında bilinear örnekler
  /// -> yumuşak kenar (0..1).
  static double _sampleAlpha(
    Uint8List selected,
    int w,
    int h,
    double x,
    double y,
  ) {
    final x0 = x.floor();
    final y0 = y.floor();
    final x1 = math.min(x0 + 1, w - 1);
    final y1 = math.min(y0 + 1, h - 1);
    final cx0 = math.max(0, math.min(w - 1, x0));
    final cy0 = math.max(0, math.min(h - 1, y0));
    final fx = x - x0;
    final fy = y - y0;

    final v00 = selected[cy0 * w + cx0];
    final v10 = selected[cy0 * w + x1];
    final v01 = selected[y1 * w + cx0];
    final v11 = selected[y1 * w + x1];

    final top = v00 * (1 - fx) + v10 * fx;
    final bottom = v01 * (1 - fx) + v11 * fx;
    return top * (1 - fy) + bottom * fy;
  }

  /// (point.dx, point.dy) [0..1 normalize, görsel koordinatları] noktasındaki
  /// kıyafet/aksesuar bölgesini bulur ve şeffaf arka planlı bir cutout PNG
  /// üretir. Dokunulan nokta kıyafet/aksesuar değilse `null` döner.
  static Future<ExtractResult?> extractRegionAtPoint(
    img.Image image,
    SegmentationResult segmentation,
    double pointX,
    double pointY,
  ) async {
    final mw = segmentation.maskWidth;
    final mh = segmentation.maskHeight;
    final iw = segmentation.imageWidth;
    final ih = segmentation.imageHeight;
    final mask = segmentation.categoryMask;

    final startX = math.max(0, math.min(mw - 1, (pointX * mw).round()));
    final startY = math.max(0, math.min(mh - 1, (pointY * mh).round()));

    final selected = _floodFillComponent(mask, mw, mh, startX, startY);
    if (selected == null) return null;

    // Bağlı bölgenin sınırlayıcı kutusu (mask koordinatlarında)
    var minX = mw, maxX = -1, minY = mh, maxY = -1;
    for (var y = 0; y < mh; y++) {
      for (var x = 0; x < mw; x++) {
        if (selected[y * mw + x] != 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;

    // Pay ekle (mask birimiyle)
    final padX = math.max(1.0, (maxX - minX) * _kPaddingRatio);
    final padY = math.max(1.0, (maxY - minY) * _kPaddingRatio);
    final fMinX = math.max(0.0, minX - padX);
    final fMinY = math.max(0.0, minY - padY);
    final fMaxX = math.min(mw - 1.0, maxX + padX);
    final fMaxY = math.min(mh - 1.0, maxY + padY);

    final scaleX = iw / mw;
    final scaleY = ih / mh;

    final cropX0 = (fMinX * scaleX).floor();
    final cropY0 = (fMinY * scaleY).floor();
    final cropX1 = ((fMaxX + 1) * scaleX).ceil();
    final cropY1 = ((fMaxY + 1) * scaleY).ceil();
    final cropW = math.max(1, math.min(iw, cropX1) - cropX0);
    final cropH = math.max(1, math.min(ih, cropY1) - cropY0);

    // Kaynak görselden bbox bölgesini kırp (tam çözünürlük)
    final cropped = img.copyCrop(
      image,
      x: cropX0,
      y: cropY0,
      width: cropW,
      height: cropH,
    );

    // Çıkış boyutu (büyükse küçült)
    final scale = math.min(1.0, _kMaxOutputDim / math.max(cropW, cropH));
    final outW = math.max(1, (cropW * scale).round());
    final outH = math.max(1, (cropH * scale).round());

    final resizedCrop = (outW == cropW && outH == cropH)
        ? cropped
        : img.copyResize(
            cropped,
            width: outW,
            height: outH,
            interpolation: img.Interpolation.linear,
          );

    final out = img.Image(width: outW, height: outH, numChannels: 4);

    for (var oy = 0; oy < outH; oy++) {
      for (var ox = 0; ox < outW; ox++) {
        final p = resizedCrop.getPixel(ox, oy);

        // outCanvas -> kaynak (tam görsel) koordinatı
        final fullX = cropX0 + ox / scale;
        final fullY = cropY0 + oy / scale;
        // tam görsel koordinatı -> mask koordinatı
        final mx = fullX / scaleX;
        final my = fullY / scaleY;
        final alpha = _sampleAlpha(selected, mw, mh, mx, my);

        out.setPixelRgba(
          ox,
          oy,
          p.r.toInt(),
          p.g.toInt(),
          p.b.toInt(),
          (alpha * 255).round(),
        );
      }
    }

    final pngBytes = img.encodePng(out);

    return ExtractResult(pngBytes: pngBytes, width: outW, height: outH);
  }
}
