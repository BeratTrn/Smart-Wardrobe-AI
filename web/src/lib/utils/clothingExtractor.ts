//  Clothing Extractor
//  Kameradan çekilen "üzerinde" fotoğraftan, dokunulan noktadaki
//  kıyafet/aksesuar bölgesini MediaPipe Selfie Multiclass segmentasyon
//  modeli ile bulur, şeffaf arka planlı bir "cutout" görseli üretir.

import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";

// selfie_multiclass_256x256 sınıf indeksleri
// 0: background, 1: hair, 2: body-skin, 3: face-skin, 4: clothes, 5: others (accessories)
const TARGET_CLASSES = new Set([4, 5]);

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite";

let segmenterPromise: Promise<ImageSegmenter> | null = null;

async function getSegmenter(): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
      return ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      });
    })();
  }
  return segmenterPromise;
}

export interface SegmentationResult {
  /** Mask sınıf değerleri (maskWidth x maskHeight) */
  categoryMask: Uint8Array;
  maskWidth: number;
  maskHeight: number;
  imageWidth: number;
  imageHeight: number;
}

export interface ExtractResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

/** Dosyayı HTMLImageElement'e yükler. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Görsel üzerinde segmentasyon çalıştırır. Sonuç tüm dokunma seçimleri için cache'lenebilir. */
export async function segmentImage(
  image: HTMLImageElement
): Promise<SegmentationResult> {
  const segmenter = await getSegmenter();
  const result = segmenter.segment(image);

  try {
    const mask = result.categoryMask;
    if (!mask) {
      throw new Error("Segmentasyon maskesi alınamadı.");
    }
    const categoryMask = Uint8Array.from(mask.getAsUint8Array());
    return {
      categoryMask,
      maskWidth: mask.width,
      maskHeight: mask.height,
      imageWidth: image.naturalWidth || image.width,
      imageHeight: image.naturalHeight || image.height,
    };
  } finally {
    result.close();
  }
}

/** Maskede (sx,sy) içeren ve TARGET_CLASSES'e ait bağlı bölgeyi flood-fill ile bulur. */
function floodFillComponent(
  mask: Uint8Array,
  w: number,
  h: number,
  startX: number,
  startY: number
): Uint8Array | null {
  const startIdx = startY * w + startX;
  if (!TARGET_CLASSES.has(mask[startIdx])) return null;

  const selected = new Uint8Array(w * h);
  const stack: number[] = [startIdx];
  selected[startIdx] = 1;

  while (stack.length) {
    const idx = stack.pop()!;
    const x = idx % w;
    const y = (idx - x) / w;

    if (x > 0) {
      const n = idx - 1;
      if (!selected[n] && TARGET_CLASSES.has(mask[n])) { selected[n] = 1; stack.push(n); }
    }
    if (x < w - 1) {
      const n = idx + 1;
      if (!selected[n] && TARGET_CLASSES.has(mask[n])) { selected[n] = 1; stack.push(n); }
    }
    if (y > 0) {
      const n = idx - w;
      if (!selected[n] && TARGET_CLASSES.has(mask[n])) { selected[n] = 1; stack.push(n); }
    }
    if (y < h - 1) {
      const n = idx + w;
      if (!selected[n] && TARGET_CLASSES.has(mask[n])) { selected[n] = 1; stack.push(n); }
    }
  }

  return selected;
}

/** `selected` ızgarasını (0/1) (x,y) noktasında bilinear örnekler -> yumuşak kenar (0..1). */
function sampleAlpha(
  selected: Uint8Array,
  w: number,
  h: number,
  x: number,
  y: number
): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, w - 1);
  const y1 = Math.min(y0 + 1, h - 1);
  const cx0 = Math.max(0, Math.min(w - 1, x0));
  const cy0 = Math.max(0, Math.min(h - 1, y0));
  const fx = x - x0;
  const fy = y - y0;

  const v00 = selected[cy0 * w + cx0];
  const v10 = selected[cy0 * w + x1];
  const v01 = selected[y1 * w + cx0];
  const v11 = selected[y1 * w + x1];

  const top = v00 * (1 - fx) + v10 * fx;
  const bottom = v01 * (1 - fx) + v11 * fx;
  return top * (1 - fy) + bottom * fy;
}

const MAX_OUTPUT_DIM = 1024;
const PADDING_RATIO = 0.06; // bbox etrafına eklenecek pay (mask ızgarası birimiyle orantılı)

/**
 * (point.x, point.y) [0..1 normalize, görsel koordinatları] noktasındaki kıyafet/aksesuar
 * bölgesini bulur ve şeffaf arka planlı bir cutout PNG üretir.
 * Dokunulan nokta kıyafet/aksesuar değilse `null` döner.
 */
export async function extractRegionAtPoint(
  image: HTMLImageElement,
  segmentation: SegmentationResult,
  point: { x: number; y: number }
): Promise<ExtractResult | null> {
  const { categoryMask, maskWidth: mw, maskHeight: mh, imageWidth: iw, imageHeight: ih } = segmentation;

  const startX = Math.max(0, Math.min(mw - 1, Math.round(point.x * mw)));
  const startY = Math.max(0, Math.min(mh - 1, Math.round(point.y * mh)));

  const selected = floodFillComponent(categoryMask, mw, mh, startX, startY);
  if (!selected) return null;

  // Bağlı bölgenin sınırlayıcı kutusu (mask koordinatlarında)
  let minX = mw, maxX = -1, minY = mh, maxY = -1;
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      if (selected[y * mw + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;

  // Pay ekle (mask birimiyle)
  const padX = Math.max(1, (maxX - minX) * PADDING_RATIO);
  const padY = Math.max(1, (maxY - minY) * PADDING_RATIO);
  minX = Math.max(0, minX - padX);
  minY = Math.max(0, minY - padY);
  maxX = Math.min(mw - 1, maxX + padX);
  maxY = Math.min(mh - 1, maxY + padY);

  const scaleX = iw / mw;
  const scaleY = ih / mh;

  const cropX0 = Math.floor(minX * scaleX);
  const cropY0 = Math.floor(minY * scaleY);
  const cropX1 = Math.ceil((maxX + 1) * scaleX);
  const cropY1 = Math.ceil((maxY + 1) * scaleY);
  const cropW = Math.max(1, Math.min(iw, cropX1) - cropX0);
  const cropH = Math.max(1, Math.min(ih, cropY1) - cropY0);

  // Kaynak görseli tam çözünürlükte çiz
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = iw;
  srcCanvas.height = ih;
  const srcCtx = srcCanvas.getContext("2d");
  if (!srcCtx) throw new Error("Canvas context alınamadı.");
  srcCtx.drawImage(image, 0, 0, iw, ih);
  const srcData = srcCtx.getImageData(cropX0, cropY0, cropW, cropH);

  // Çıkış boyutu (büyükse küçült)
  const scale = Math.min(1, MAX_OUTPUT_DIM / Math.max(cropW, cropH));
  const outW = Math.max(1, Math.round(cropW * scale));
  const outH = Math.max(1, Math.round(cropH * scale));

  const outCanvas = document.createElement("canvas");
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) throw new Error("Canvas context alınamadı.");

  const outData = outCtx.createImageData(outW, outH);

  for (let oy = 0; oy < outH; oy++) {
    for (let ox = 0; ox < outW; ox++) {
      // outCanvas -> srcData koordinatı
      const sx = Math.min(cropW - 1, Math.floor(ox / scale));
      const sy = Math.min(cropH - 1, Math.floor(oy / scale));
      const srcIdx = (sy * cropW + sx) * 4;

      // srcData -> mask koordinatı (tam görsel koordinatına çevirip mask oranına böl)
      const fullX = cropX0 + sx;
      const fullY = cropY0 + sy;
      const mx = fullX / scaleX;
      const my = fullY / scaleY;
      const alpha = sampleAlpha(selected, mw, mh, mx, my);

      const outIdx = (oy * outW + ox) * 4;
      outData.data[outIdx] = srcData.data[srcIdx];
      outData.data[outIdx + 1] = srcData.data[srcIdx + 1];
      outData.data[outIdx + 2] = srcData.data[srcIdx + 2];
      outData.data[outIdx + 3] = Math.round(alpha * 255);
    }
  }

  outCtx.putImageData(outData, 0, 0);

  const blob: Blob | null = await new Promise((resolve) =>
    outCanvas.toBlob((b) => resolve(b), "image/png")
  );
  if (!blob) throw new Error("Görsel oluşturulamadı.");

  const dataUrl = outCanvas.toDataURL("image/png");

  return { blob, dataUrl, width: outW, height: outH };
}

/** Blob'u File nesnesine çevirir. */
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type || "image/png" });
}
