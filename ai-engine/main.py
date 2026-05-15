# ============================================================
#  Smart Wardrobe AI — FastAPI Microservice
#  Endpoints : POST /analyze-item/
#  Features  : TF Classification + Category-Aware Color Extraction
# ============================================================

import numpy as np
import cv2
from sklearn.cluster import KMeans
import tensorflow as tf
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

# ── CONSTANTS ────────────────────────────────────────────────
MODEL_PATH  = "wardrobe_model.h5"
IMG_SIZE    = (224, 224)
# Alphabetical order matches tf.keras directory scan output
CLASS_NAMES = ["aksesuar", "alt_giyim", "ayakkabi", "dis_giyim", "elbise", "ust_giyim"]

# ── GLOBAL MODEL HANDLE ──────────────────────────────────────
model = None

# ── STARTUP / SHUTDOWN (lifespan) ────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    try:
        model = tf.keras.models.load_model(MODEL_PATH)
        print(f"[OK] Model yuklendi: {MODEL_PATH}")
    except Exception as e:
        print(f"[HATA] Model yuklenemedi: {e}")
        model = None
    yield
    print("[OK] Servis kapatiliyor.")

app = FastAPI(
    title="Smart Wardrobe AI Engine",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CROP MAP: category → (y_start_ratio, y_end_ratio, x_start_ratio, x_end_ratio)
# Ratios are fractions of the full image dimensions [0.0 – 1.0].
# Clothing items are typically centered horizontally, so x stays at [0.15, 0.85]
# to shave off edge shadows while keeping the full garment width.
CROP_MAP = {
    "ust_giyim":  (0.05, 0.55, 0.15, 0.85),   # upper-center  (chest/torso area)
    "dis_giyim":  (0.05, 0.60, 0.10, 0.90),   # upper-center  (slightly wider for coats)
    "elbise":     (0.05, 0.65, 0.15, 0.85),   # upper-center  (long garment, keep more height)
    "alt_giyim":  (0.45, 0.95, 0.15, 0.85),   # lower-center  (waist-to-hem)
    "ayakkabi":   (0.55, 1.00, 0.10, 0.90),   # bottom region (full shoe visible)
    "aksesuar":   (0.25, 0.75, 0.25, 0.75),   # absolute center square
}


# ── HELPER: CATEGORY-AWARE DOMINANT COLOR (KMeans + spatial weighting) ───────
def get_dominant_color(image_bytes: bytes, category_name: str, k: int = 4) -> str:
    """
    Returns the dominant HEX color of the clothing item in the image.

    Pipeline:
      1. Category-aware crop  — narrows the region to the garment area.
      2. Gaussian spatial mask — pixels near the center of the crop are
         sampled with up to ~9× more probability than edge pixels, so
         background bleed-in is suppressed even if the crop isn't perfect.
      3. HSV-based pixel filter — removes near-pure-white studio backgrounds
         (V > 245 AND S < 20) and heavy shadows (V < 35).  The thresholds
         are intentionally conservative so white/light-coloured garments
         are NOT filtered out.
      4. Center-biased KMeans  — k=4 clusters on the spatially-sampled
         pixels.
      5. Cluster selection     — colorful clusters (S > 40/255) are
         preferred; if everything is neutral (white/grey/beige garment)
         the brightest cluster is returned instead.
    """
    # ── 1. Decode raw bytes → RGB ──────────────────────────────────────────────
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    h, w = img.shape[:2]

    # ── 2. Category-aware primary crop ────────────────────────────────────────
    y0_r, y1_r, x0_r, x1_r = CROP_MAP.get(category_name, (0.05, 0.95, 0.05, 0.95))
    y0, y1 = int(h * y0_r), int(h * y1_r)
    x0, x1 = int(w * x0_r), int(w * x1_r)
    region = img[y0:y1, x0:x1]
    if region.size == 0:
        region = img

    # ── 3. Resize to fixed canvas for consistent weight geometry ──────────────
    CANVAS = 120
    region = cv2.resize(region, (CANVAS, CANVAS))

    # ── 4. Gaussian spatial weight map (σ = 30% of canvas width) ─────────────
    cx, cy = CANVAS / 2.0, CANVAS / 2.0
    sigma  = CANVAS * 0.30
    Y, X   = np.ogrid[:CANVAS, :CANVAS]
    weight_map  = np.exp(-((X - cx) ** 2 + (Y - cy) ** 2) / (2 * sigma ** 2))
    weight_flat = weight_map.flatten().astype(np.float64)

    pixels_rgb = region.reshape(-1, 3).astype(np.float32)  # (14400, 3)

    # ── 5. HSV-based pixel filter ─────────────────────────────────────────────
    hsv        = cv2.cvtColor(region, cv2.COLOR_RGB2HSV)
    pixels_hsv = hsv.reshape(-1, 3).astype(np.float32)
    S = pixels_hsv[:, 1]   # saturation [0, 255]
    V = pixels_hsv[:, 2]   # brightness [0, 255]

    not_shadow     = V > 35                    # keep: not a heavy shadow / black BG
    not_pure_white = ~((V > 245) & (S < 20))  # keep: not a near-perfect white (studio BG)
                                               # white GARMENTS have texture → V ≤ 245
    valid_mask = not_shadow & not_pure_white
    if valid_mask.sum() < k:
        valid_mask = not_shadow        # relax white filter if too few pixels remain
    if valid_mask.sum() < k:
        valid_mask = np.ones(len(pixels_rgb), dtype=bool)   # last resort: use all

    valid_pixels  = pixels_rgb[valid_mask]
    valid_weights = weight_flat[valid_mask]

    # ── 6. Center-biased sampling → KMeans ────────────────────────────────────
    total_w = valid_weights.sum()
    probs   = valid_weights / total_w

    n_sample  = min(len(valid_pixels), 3000)
    sample_idx = np.random.default_rng(42).choice(
        len(valid_pixels), size=n_sample, replace=False, p=probs
    )
    sampled = valid_pixels[sample_idx]

    n_clusters = min(k, len(sampled))
    km = KMeans(n_clusters=n_clusters, random_state=42, n_init="auto")
    km.fit(sampled)

    centers = km.cluster_centers_                                    # (k, 3) float
    counts  = np.bincount(km.labels_, minlength=n_clusters)

    # ── 7. Cluster selection — colorful > neutral ─────────────────────────────
    centers_u8  = np.clip(centers, 0, 255).astype(np.uint8).reshape(1, n_clusters, 3)
    centers_hsv = cv2.cvtColor(centers_u8, cv2.COLOR_RGB2HSV).reshape(n_clusters, 3).astype(np.float32)
    saturations  = centers_hsv[:, 1]   # [0, 255]
    brightnesses = centers_hsv[:, 2]   # [0, 255]

    COLORFUL_S = 40  # threshold between "coloured fabric" and "neutral"
    colorful   = saturations > COLORFUL_S

    if colorful.any():
        # Pick the most-represented colourful cluster
        scored          = counts.astype(float)
        scored[~colorful] = 0.0
        best = int(np.argmax(scored))
    else:
        # White shirt, beige, grey → return the brightest neutral cluster
        best = int(np.argmax(brightnesses))

    rgb = np.clip(centers[best], 0, 255).astype(int)
    return "#{:02X}{:02X}{:02X}".format(*rgb)


# ── HELPER: CATEGORY PREDICTION ──────────────────────────────
def predict_category(image_bytes: bytes) -> tuple[str, str]:
    """
    Classifies the clothing item using the loaded TF model.
    Returns (category_name, confidence_percentage).
    """
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, IMG_SIZE)

    # CRITICAL: Use MobileNetV2's own preprocess_input (scales to [-1, 1]).
    # Training in Colab used preprocess_input → inference MUST use the same
    # transform. Dividing by 255 alone (→ [0,1]) causes systematic misclassification.
    img_array = tf.keras.utils.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)                          # (1,224,224,3)
    img_array = tf.keras.applications.mobilenet_v2.preprocess_input(img_array)

    predictions = model.predict(img_array, verbose=0)
    idx         = int(np.argmax(predictions[0]))
    confidence  = float(predictions[0][idx]) * 100

    return CLASS_NAMES[idx], f"%{confidence:.1f}"


# ── ENDPOINT: POST /analyze-item/ ────────────────────────────
@app.post("/analyze-item/")
async def analyze_item(file: UploadFile = File(...)):
    """
    Receives a clothing image, runs color extraction and
    category classification, returns a structured JSON result.
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model yuklenemedi, servis hazir degil.")

    # Validate file type early
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Sadece gorsel dosyalari kabul edilir.")

    image_bytes = await file.read()

    try:
        # 1. Classify first — category drives the crop region for color extraction
        category, confidence = predict_category(image_bytes)
        # 2. Extract dominant color from the category-specific crop
        dominant_color = get_dominant_color(image_bytes, category)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analiz hatasi: {str(e)}")

    return JSONResponse(content={
        "status": "success",
        "analysis": {
            "dominant_color": dominant_color,
            "category":       category,
            "confidence":     confidence,
        }
    })


# ── HEALTH CHECK ─────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": model is not None}