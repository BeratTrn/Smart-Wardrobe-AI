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


# ── HELPER: CATEGORY-AWARE DOMINANT COLOR (KMeans) ───────────
def get_dominant_color(image_bytes: bytes, category_name: str, k: int = 3) -> str:
    """
    Crops the image to the region most likely to contain the clothing item
    based on the predicted category, then finds the dominant color via
    KMeans clustering, ignoring near-white and near-black backgrounds.
    Returns a HEX color string, e.g. '#FF5733'.
    """
    # Decode raw bytes → BGR → RGB
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    h, w = img.shape[:2]

    # ── Smart crop based on predicted category ────────────────
    y0_r, y1_r, x0_r, x1_r = CROP_MAP.get(category_name, (0.0, 1.0, 0.0, 1.0))
    y0, y1 = int(h * y0_r), int(h * y1_r)
    x0, x1 = int(w * x0_r), int(w * x1_r)
    region = img[y0:y1, x0:x1]

    # Guard: if crop is somehow empty, fall back to full image
    if region.size == 0:
        region = img

    # Resize crop to 100×100 for fast KMeans
    region_small = cv2.resize(region, (100, 100))
    pixels = region_small.reshape(-1, 3).astype(np.float32)

    # ── Mask out near-white (studio bg) AND near-black shadows ─
    is_white = (pixels[:, 0] > 235) & (pixels[:, 1] > 235) & (pixels[:, 2] > 235)
    is_black = (pixels[:, 0] < 20)  & (pixels[:, 1] < 20)  & (pixels[:, 2] < 20)
    valid = pixels[~(is_white | is_black)]

    # If masking removed too many pixels, fall back to unmasked crop
    if len(valid) < k:
        valid = pixels

    kmeans = KMeans(n_clusters=k, random_state=42, n_init="auto")
    kmeans.fit(valid)

    # Pick the largest cluster — that's the garment's dominant color
    counts = np.bincount(kmeans.labels_)
    dominant_rgb = kmeans.cluster_centers_[np.argmax(counts)].astype(int)

    return "#{:02X}{:02X}{:02X}".format(*dominant_rgb)


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

    # Normalize to [0, 1] and add batch dimension
    img_array = tf.keras.utils.img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

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