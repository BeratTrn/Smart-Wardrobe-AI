"use client";

import { useAddItem, useAnalyzeItem } from "@/lib/hooks/useItems";
import {
  blobToFile,
  extractRegionAtPoint,
  loadImage,
  segmentImage,
  type ExtractResult,
  type SegmentationResult,
} from "@/lib/utils/clothingExtractor";
import { cn } from "@/lib/utils/cn";
import type { ItemCategory, ItemCinsiyet, ItemSeason, ItemStyle } from "@/types";
import { Camera, ChevronDown, CloudUpload, Hand, ImageIcon, Info, Loader2, RefreshCcw, RotateCcw, Scissors, Sparkles, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useT } from "@/lib/i18n";

function getCategories(t: (key: string) => string): { value: ItemCategory; label: string; icon: string }[] {
  return [
    { value: "Üst Giyim",  label: t("wardrobe.topwear"),     icon: "👕" },
    { value: "Alt Giyim",  label: t("wardrobe.bottomwear"),  icon: "👖" },
    { value: "Elbise",     label: t("wardrobe.dress"),       icon: "👗" },
    { value: "Dış Giyim",  label: t("wardrobe.outerwear"),   icon: "🧥" },
    { value: "Ayakkabı",   label: t("wardrobe.shoes"),       icon: "👟" },
    { value: "Aksesuar",   label: t("wardrobe.accessories"), icon: "⌚" },
  ];
}

const SEASONS: ItemSeason[] = ["İlkbahar", "Yaz", "Sonbahar", "Kış", "Tüm Mevsimler"];
const STYLES: ItemStyle[]   = ["Günlük", "Klasik", "Spor", "Sokak", "Minimal", "Şık", "Resmi"];

const SEASON_KEY: Record<string, string> = {
  "İlkbahar": "add_item.spring", "Yaz": "add_item.summer", "Sonbahar": "add_item.autumn",
  "Kış": "add_item.winter", "Tüm Mevsimler": "add_item.all_seasons",
};
const STYLE_KEY: Record<string, string> = {
  "Günlük": "add_item.casual", "Klasik": "add_item.classic", "Spor": "add_item.sport",
  "Sokak": "add_item.street", "Minimal": "add_item.minimal", "Şık": "add_item.chic", "Resmi": "add_item.formal",
};

function getCinsiyetler(t: (key: string) => string): { value: ItemCinsiyet; label: string }[] {
  return [
    { value: "Unisex", label: t("add_item.gender_unisex") },
    { value: "Kadın",  label: t("add_item.gender_female") },
    { value: "Erkek",  label: t("add_item.gender_male") },
  ];
}

// Colors
const BG = "transparent"; 
const SURFACE = "var(--color-surface)";
const BORDER = "var(--color-border)";
const GOLD = "var(--color-gold)";

type Step = "drop" | "analyze" | "confirm";

function PillBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-5 py-2.5 rounded-full text-[13px] font-bold transition-all duration-200 flex-shrink-0"
      )}
      style={
        active
          ? { background: "linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-light) 100%)", color: "#000", boxShadow: "0 2px 10px rgba(201,168,76,0.2)" }
          : { background: SURFACE, color: "var(--color-text-sub)", border: `1px solid ${BORDER}` }
      }
    >
      {label}
    </button>
  );
}

function SectionLabel({ children, subtitle }: { children: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted">{children}</p>
      {subtitle && <p className="text-[12px] text-muted/70 mt-0.5">{subtitle}</p>}
    </div>
  );
}

export default function AddItemPage() {
  const { t } = useT();
  const CATEGORIES = getCategories(t);
  const CINSIYETLER = getCinsiyetler(t);
  const router = useRouter();
  const [step, setStep]             = useState<Step>("drop");
  const [preview, setPreview]       = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [ad, setAd]                 = useState("");
  const [kategori, setKategori]     = useState<ItemCategory>("Üst Giyim");
  const [renk, setRenk]             = useState("");
  const [mevsimler, setMevsimler]   = useState<ItemSeason[]>(["Tüm Mevsimler"]);
  const [stiller, setStiller]       = useState<ItemStyle[]>(["Günlük"]);
  const [cinsiyet, setCinsiyet]     = useState<ItemCinsiyet>("Unisex");
  const [marka, setMarka]           = useState("");

  const analyzeItem = useAnalyzeItem();
  const addItem     = useAddItem(() => {
    // Başarılı olduğunda dolaba yönlendir
    router.push("/wardrobe");
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Camera State
  const [cameraOpen, setCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Kıyafet Çıkarma (Extract) State — kameradan çekilen "üzerimde" fotoğraftan
  // dokunulan kıyafeti otomatik olarak kesip şeffaf arka planlı görsele çevirir.
  const [extractStage, setExtractStage] = useState<"idle" | "select" | "preview">("idle");
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [capturedImageEl, setCapturedImageEl] = useState<HTMLImageElement | null>(null);
  const [segmentation, setSegmentation] = useState<SegmentationResult | null>(null);
  const [segmenting, setSegmenting] = useState(false);
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null);
  const [extractHint, setExtractHint] = useState<string | null>(null);

  const startCamera = async (mode: "user" | "environment" = facingMode) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
      streamRef.current = stream;
      setCameraOpen(true);
      setFacingMode(mode);
      
      // Wait for React to render video element
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
      }, 100);
    } catch (err) {
      alert(t("add_item.camera_permission_denied"));
    }
  };

  const flipCamera = () => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    startCamera(newMode);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        stopCamera();
        beginExtraction(dataUrl);
      }
    }
  };

  // Kıyafet Çıkarma (Extract) Yardımcıları
  const resetExtractState = () => {
    setExtractStage("idle");
    setCapturedDataUrl(null);
    setCapturedImageEl(null);
    setSegmentation(null);
    setExtractResult(null);
    setExtractHint(null);
    setSegmenting(false);
  };

  // Çekilen fotoğraf için segmentasyonu başlatır ve "seç" adımına geçer.
  const beginExtraction = async (dataUrl: string) => {
    setCapturedDataUrl(dataUrl);
    setExtractStage("select");
    setExtractResult(null);
    setExtractHint(null);
    setSegmenting(true);
    try {
      const img = await loadImage(dataUrl);
      setCapturedImageEl(img);
      const seg = await segmentImage(img);
      setSegmentation(seg);
    } catch {
      setSegmentation(null);
      setExtractHint(t("web.add_item.auto_detect_failed"));
    } finally {
      setSegmenting(false);
    }
  };

  // Fotoğrafa dokunulduğunda o noktadaki kıyafeti kesip önizleme adımına geçer.
  const handlePhotoTap = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!capturedImageEl || !segmentation || segmenting) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setExtractHint(null);
    try {
      const result = await extractRegionAtPoint(capturedImageEl, segmentation, { x, y });
      if (!result) {
        setExtractHint(t("web.add_item.no_garment_detected"));
        return;
      }
      setExtractResult(result);
      setExtractStage("preview");
    } catch {
      setExtractHint(t("web.add_item.cut_failed"));
    }
  };

  // Kesilen (şeffaf arka planlı) kıyafeti analiz akışına gönderir.
  const useExtractedCutout = () => {
    if (!extractResult) return;
    const file = blobToFile(extractResult.blob, "kiyafet-cutout.png");
    resetExtractState();
    onDrop([file]);
  };

  // Kesme yapmadan, çekilen fotoğrafın tamamını analiz akışına gönderir.
  const useFullPhoto = async () => {
    if (!capturedDataUrl) return;
    const res = await fetch(capturedDataUrl);
    const blob = await res.blob();
    const file = blobToFile(blob, "camera-photo.jpg");
    resetExtractState();
    onDrop([file]);
  };

  // Yeniden fotoğraf çekmek için kameraya döner.
  const retakePhoto = () => {
    resetExtractState();
    startCamera(facingMode);
  };

  const backToSelect = () => {
    setExtractStage("select");
    setExtractResult(null);
    setExtractHint(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const resetState = () => {
    setStep("drop"); setPreview(null); setOriginalFile(null);
    setAd(""); setKategori("Üst Giyim"); setRenk("");
    setMevsimler(["Tüm Mevsimler"]); setStiller(["Günlük"]); setCinsiyet("Unisex"); setMarka("");
    resetExtractState();
  };

  const toggleMevsim = (m: ItemSeason) => setMevsimler([m]);

  const toggleStil = (s: ItemStyle) => setStiller([s]);

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0]; if (!file) return;
    setPreview(URL.createObjectURL(file));
    setOriginalFile(file);
    setStep("analyze");
    analyzeItem.mutate(file, {
      onSuccess: (data) => {
        setKategori(data.analiz.kategori); setRenk(data.analiz.renk);
        setMevsimler(data.analiz.mevsim?.length ? data.analiz.mevsim : ["Tüm Mevsimler"]);
        setStiller(data.analiz.stil?.length ? data.analiz.stil : ["Günlük"]);
        setStep("confirm");
      },
      onError: () => { setStep("drop"); setPreview(null); setOriginalFile(null); },
    });
  }, []); // eslint-disable-line

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "image/*": [] }, maxFiles: 1, disabled: step !== "drop",
    noClick: true, 
  });

  const handleSave = () => {
    if (!originalFile) return;
    addItem.mutate({
      file: originalFile,
      ad: ad || undefined,
      kategori,
      renk,
      mevsim: mevsimler[0] ?? "Tüm Mevsimler",
      stil: stiller[0] ?? "Günlük",
      cinsiyet,
      marka: marka || undefined,
    });
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-2xl mx-auto mt-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted uppercase mb-1">{t("web.add_item.kicker")}</p>
          <h1 className="text-3xl sm:text-4xl font-black text-text leading-none mb-2" style={{ whiteSpace: "pre-line" }}>{t("add_item.add_garment")}</h1>
          <p className="text-[13px] text-muted max-w-sm">
            {t("add_item.ai_photo_analyzes")} <Sparkles className="inline h-3.5 w-3.5 text-gold ml-1" />
          </p>
        </div>

        {step === "confirm" && (
          <button
            onClick={resetState}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold text-muted hover:text-text transition-colors flex-shrink-0"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
          >
            <RotateCcw className="h-4 w-4" /> {t("web.add_item.restart")}
          </button>
        )}
      </div>

      <div className="mt-2">
        {/* Step 1: Drop or Camera */}
        {step === "drop" && !cameraOpen && extractStage === "idle" && (
          <div className="space-y-6 flex flex-col h-full animate-in fade-in duration-300">
            
            <div className="flex-1 space-y-4">
              {/* Dropzone Card */}
              <div
                {...getRootProps()}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "relative rounded-[32px] p-12 text-center cursor-pointer transition-all duration-300 group flex flex-col items-center justify-center min-h-[300px]",
                  isDragActive
                    ? "border-gold bg-gold/5"
                    : "bg-[var(--color-bg)] hover:bg-[var(--color-surface)]"
                )}
                style={{ border: `1px solid var(--color-gold-border)` }}
              >
                <input {...getInputProps()} ref={fileInputRef} />
                <div
                  className="h-[80px] w-[80px] rounded-full mx-auto mb-6 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-lg"
                  style={{ background: "linear-gradient(135deg, var(--color-gold-dim) 0%, transparent 100%)", border: `1px solid var(--color-gold-border)` }}
                >
                  <CloudUpload className="h-10 w-10 text-gold" strokeWidth={2} />
                </div>
                <p className="text-[18px] font-bold text-text mb-2">
                  {isDragActive ? t("web.add_item.drop_here") : t("add_item.select_from_gallery")}
                </p>
                <p className="text-[14px] text-muted">{t("add_item.jpg_png_supported")}</p>
              </div>

              {/* Camera Button */}
              <button
                onClick={() => startCamera("environment")}
                className="w-full py-4.5 rounded-[24px] flex items-center justify-center gap-3 font-bold text-[16px] text-text-sub hover:text-text transition-all duration-200"
                style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
              >
                <Camera className="h-5 w-5 text-gold" />
                {t("add_item.camera")}
              </button>
            </div>

            {/* Info banner bottom */}
            <div
              className="flex items-start gap-3.5 rounded-2xl p-5"
              style={{ background: "var(--color-gold-dim)", border: `1px solid var(--color-gold-border)` }}
            >
              <Sparkles className="h-5 w-5 text-gold flex-shrink-0 mt-0.5" />
              <p className="text-[14px] text-text-sub leading-relaxed font-medium">
                {t("add_item.cnn_analyzes")}
              </p>
            </div>
          </div>
        )}

        {/* Camera View */}
        {step === "drop" && cameraOpen && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-300">
            <div className="relative w-full aspect-[3/4] sm:aspect-video rounded-[32px] overflow-hidden bg-black shadow-2xl" style={{ border: `1px solid ${BORDER}` }}>
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover" 
                playsInline 
                muted 
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Overlay close button */}
              <button 
                onClick={stopCamera}
                className="absolute top-4 right-4 h-11 w-11 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Flip camera button */}
              <button 
                onClick={flipCamera}
                className="absolute bottom-4 right-4 h-12 w-12 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-black/70 transition-colors border border-white/10"
              >
                <RefreshCcw className="h-5 w-5" />
              </button>
            </div>
            
            <button
              onClick={takePhoto}
              className="w-full py-5 rounded-[24px] font-bold text-[18px] text-black transition-all duration-300 hover:opacity-90 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-light) 100%)", boxShadow: "0 8px 30px rgba(201,168,76,0.3)" }}
            >
              <Camera className="h-6 w-6" />
              {t("add_item.capture_photo")}
            </button>
          </div>
        )}

        {/* Extract: Kıyafeti Seç */}
        {step === "drop" && extractStage === "select" && capturedDataUrl && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-300">
            <div
              className="relative w-full aspect-[3/4] sm:aspect-video rounded-[32px] overflow-hidden bg-black shadow-2xl"
              style={{ border: `1px solid ${BORDER}` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedDataUrl}
                alt={t("web.add_item.captured_photo_alt")}
                onClick={handlePhotoTap}
                className={cn(
                  "w-full h-full object-cover",
                  segmenting ? "cursor-wait" : "cursor-crosshair"
                )}
              />

              {/* Instruction banner */}
              <div className="absolute top-4 left-4 right-4 flex justify-center">
                <div
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold text-white backdrop-blur-md"
                  style={{ background: "rgba(0,0,0,0.55)", border: `1px solid var(--color-gold-border)` }}
                >
                  <Hand className="h-4 w-4 text-gold" />
                  {segmenting ? t("add_item.extract_analyzing") : t("add_item.extract_tap_hint")}
                </div>
              </div>

              {/* Close / cancel */}
              <button
                onClick={retakePhoto}
                className="absolute top-4 right-4 h-11 w-11 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Loading overlay */}
              {segmenting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Loader2 className="h-10 w-10 text-gold animate-spin" />
                </div>
              )}
            </div>

            {/* Hint / error message */}
            {extractHint && (
              <div
                className="flex items-start gap-3 rounded-2xl p-4"
                style={{ background: "var(--color-gold-dim)", border: `1px solid var(--color-gold-border)` }}
              >
                <Info className="h-5 w-5 text-gold flex-shrink-0 mt-0.5" />
                <p className="text-[14px] text-text-sub leading-relaxed">{extractHint}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={useFullPhoto}
                className="flex-1 py-4 rounded-[20px] flex items-center justify-center gap-2 font-bold text-[15px] text-text-sub hover:text-text transition-all duration-200"
                style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
              >
                <ImageIcon className="h-5 w-5 text-gold" />
                {t("add_item.extract_use_full_photo")}
              </button>
              <button
                onClick={retakePhoto}
                className="flex-1 py-4 rounded-[20px] flex items-center justify-center gap-2 font-bold text-[15px] text-text-sub hover:text-text transition-all duration-200"
                style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
              >
                <RefreshCcw className="h-5 w-5 text-gold" />
                {t("add_item.extract_retake_photo")}
              </button>
            </div>
          </div>
        )}

        {/* Extract: Kesilen Kıyafet Önizleme */}
        {step === "drop" && extractStage === "preview" && extractResult && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold text-gold mx-auto"
              style={{ background: "var(--color-gold-dim)", border: "1px solid var(--color-gold-border)" }}
            >
              <Scissors className="h-4 w-4" />
              {t("web.add_item.garment_found")}
            </div>

            <div
              className="relative w-full aspect-[3/4] sm:aspect-video rounded-[32px] overflow-hidden shadow-2xl flex items-center justify-center"
              style={{
                border: `1px solid ${BORDER}`,
                backgroundColor: "#1a1a17",
                backgroundImage:
                  "linear-gradient(45deg, #2a2a26 25%, transparent 25%), linear-gradient(-45deg, #2a2a26 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a26 75%), linear-gradient(-45deg, transparent 75%, #2a2a26 75%)",
                backgroundSize: "24px 24px",
                backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={extractResult.dataUrl}
                alt={t("web.add_item.cutout_photo_alt")}
                className="max-h-full max-w-full object-contain p-6"
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={useExtractedCutout}
                className="w-full py-4.5 rounded-[20px] font-bold text-[17px] text-black transition-all duration-300 hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-light) 100%)", boxShadow: "0 8px 30px rgba(201,168,76,0.3)" }}
              >
                <Sparkles className="h-5 w-5" />
                {t("add_item.extract_use_cutout")}
              </button>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={backToSelect}
                  className="flex-1 py-4 rounded-[20px] flex items-center justify-center gap-2 font-bold text-[15px] text-text-sub hover:text-text transition-all duration-200"
                  style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                >
                  <Hand className="h-5 w-5 text-gold" />
                  {t("web.add_item.pick_another_point")}
                </button>
                <button
                  onClick={retakePhoto}
                  className="flex-1 py-4 rounded-[20px] flex items-center justify-center gap-2 font-bold text-[15px] text-text-sub hover:text-text transition-all duration-200"
                  style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                >
                  <RefreshCcw className="h-5 w-5 text-gold" />
                  {t("add_item.extract_retake_photo")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Analyzing */}
        {step === "analyze" && (
          <div className="flex flex-col items-center justify-center py-20 gap-8 animate-in fade-in duration-300">
            {preview && (
              <div className="relative h-[280px] w-[210px] rounded-[24px] overflow-hidden shadow-2xl" style={{ border: `1px solid ${BORDER}` }}>
                <Image src={preview} alt={t("common.loading")} fill className="object-cover" />
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full blur-xl bg-gold/40 animate-pulse" />
                    <Loader2 className="h-14 w-14 text-gold animate-spin relative z-10" />
                  </div>
                </div>
              </div>
            )}
            <div className="text-center space-y-3">
              <p className="text-[26px] font-bold text-text">{t("web.add_item.ai_analyzing")}</p>
              <p className="text-[15px] text-muted">{t("web.add_item.determining")}</p>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            
            {/* Info banner */}
            <div
              className="flex items-center justify-between gap-4 rounded-2xl p-5"
              style={{ background: "var(--color-gold-dim)", border: `1px solid var(--color-gold-border)` }}
            >
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-gold flex-shrink-0 mt-0.5" />
                <p className="text-[14px] text-text-sub leading-relaxed">
                  {t("add_item.ai_prediction_wrong")} <strong className="text-text">"{t("add_item.add_to_closet")}"</strong> {t("add_item.when_add_to_closet")}
                </p>
              </div>
              <div
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold text-gold shrink-0"
                style={{ background: "var(--color-gold-dim)", border: "1px solid var(--color-gold-border)" }}
              >
                <Sparkles className="h-4 w-4" />
                {t("web.add_item.ai_suggestion")}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
              {/* Image */}
              {preview && (
                <div className="relative h-48 w-full sm:w-36 rounded-[24px] overflow-hidden flex-shrink-0 shadow-lg" style={{ border: `1px solid ${BORDER}`, background: '#f4f4f4' }}>
                  <Image src={preview} alt={t("web.add_item.preview_alt")} fill className="object-cover" />
                </div>
              )}

              {/* Right: name + color */}
              <div className="flex-1 space-y-6">
                <div>
                  <SectionLabel>{t("add_item.name_optional")}</SectionLabel>
                  <input
                    value={ad}
                    onChange={(e) => setAd(e.target.value)}
                    placeholder={t("add_item.garment_name")}
                    className="w-full rounded-[16px] px-4 py-4 text-[15px] font-medium text-text placeholder:text-muted outline-none transition-all"
                    style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                    onFocus={(e) => e.target.style.borderColor = GOLD}
                    onBlur={(e) => e.target.style.borderColor = BORDER}
                  />
                </div>
                <div>
                  <SectionLabel>{t("add_item.color")}</SectionLabel>
                  <div className="flex items-center gap-4">
                    <div
                      className="h-14 w-14 rounded-full flex-shrink-0 shadow-lg relative"
                      style={{ backgroundColor: renk || "#888", border: "2px solid rgba(255,255,255,0.1)" }}
                    >
                      <div className="absolute inset-0 rounded-full ring-1 ring-black/20 inset-ring" />
                    </div>
                    <input
                      value={renk}
                      onChange={(e) => setRenk(e.target.value)}
                      placeholder={t("web.add_item.color_placeholder")}
                      className="flex-1 rounded-[16px] px-4 py-4 text-[15px] font-medium text-text placeholder:text-muted outline-none transition-all"
                      style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                      onFocus={(e) => e.target.style.borderColor = GOLD}
                      onBlur={(e) => e.target.style.borderColor = BORDER}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Category dropdown */}
            <div>
              <SectionLabel subtitle={t("add_item.ai_prediction_wrong_fill_correct")}>{t("add_item.category")}</SectionLabel>
              <div className="relative mt-3">
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value as ItemCategory)}
                  className="w-full appearance-none rounded-[16px] px-5 py-4 text-[16px] font-bold text-text outline-none pr-12 cursor-pointer shadow-sm transition-all"
                  style={{ background: SURFACE, border: `1px solid var(--color-gold-border)` }}
                  onFocus={(e) => e.target.style.boxShadow = `0 0 0 1px ${GOLD}`}
                  onBlur={(e) => e.target.style.boxShadow = 'none'}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value} className="bg-[var(--color-surface)] text-text py-2">
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gold pointer-events-none" />
              </div>
            </div>

            {/* Season pills */}
            <div>
              <SectionLabel>{t("add_item.season")}</SectionLabel>
              <div className="flex flex-wrap gap-3 mt-2">
                {SEASONS.map((s) => (
                  <PillBtn key={s} label={t(SEASON_KEY[s])} active={mevsimler.includes(s)} onClick={() => toggleMevsim(s)} />
                ))}
              </div>
            </div>

            {/* Style pills */}
            <div>
              <SectionLabel>{t("add_item.style")}</SectionLabel>
              <div className="flex flex-wrap gap-3 mt-2">
                {STYLES.map((s) => (
                  <PillBtn key={s} label={t(STYLE_KEY[s])} active={stiller.includes(s)} onClick={() => toggleStil(s)} />
                ))}
              </div>
            </div>

            {/* Gender pills */}
            <div>
              <SectionLabel subtitle={t("add_item.gender_hint")}>{t("add_item.gender")}</SectionLabel>
              <div className="flex flex-wrap gap-3 mt-2">
                {CINSIYETLER.map((c) => (
                  <PillBtn key={c.value} label={c.label} active={cinsiyet === c.value} onClick={() => setCinsiyet(c.value)} />
                ))}
              </div>
            </div>

            {/* Save CTA */}
            <div className="pt-6">
              <button
                type="button"
                onClick={handleSave}
                disabled={addItem.isPending}
                className="w-full py-4.5 rounded-[20px] font-bold text-[17px] text-black transition-all duration-300 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-light) 100%)", boxShadow: "0 8px 30px rgba(201,168,76,0.3)" }}
              >
                {addItem.isPending ? (
                  <><Loader2 className="h-6 w-6 animate-spin" /> {t("add_item.adding_to_closet")}</>
                ) : (
                  t("add_item.add_to_closet")
                )}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
