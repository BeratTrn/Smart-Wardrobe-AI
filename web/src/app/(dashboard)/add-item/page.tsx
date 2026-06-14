"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Loader2, Sparkles, CloudUpload, Info, ChevronDown, Camera, Palette, RotateCcw, X, RefreshCcw, Scissors, Hand, ImageIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useAnalyzeItem, useAddItem } from "@/lib/hooks/useItems";
import {
  segmentImage,
  extractRegionAtPoint,
  loadImage,
  blobToFile,
  type SegmentationResult,
  type ExtractResult,
} from "@/lib/utils/clothingExtractor";
import type { ItemCategory, ItemSeason, ItemStyle } from "@/types";

const CATEGORIES: { value: ItemCategory; label: string; icon: string }[] = [
  { value: "Üst Giyim",    label: "Üst Giyim",    icon: "👕" },
  { value: "Alt Giyim",    label: "Alt Giyim",     icon: "👖" },
  { value: "Elbise & Etek",label: "Elbise & Etek", icon: "👗" },
  { value: "Dış Giyim",    label: "Dış Giyim",     icon: "🧥" },
  { value: "Ayakkabı",     label: "Ayakkabı",      icon: "👟" },
  { value: "Aksesuar",     label: "Aksesuar",      icon: "⌚" },
];

const SEASONS: ItemSeason[] = ["İlkbahar", "Yaz", "Sonbahar", "Kış", "Tüm Mevsimler"];
const STYLES: ItemStyle[]   = ["Günlük", "Klasik", "Spor", "Sokak", "Minimal", "Şık", "Resmi"];

// Colors
const BG = "transparent"; 
const SURFACE = "#161614";
const BORDER = "#222218";
const GOLD = "#C9A84C";

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
          ? { background: "linear-gradient(135deg, #C9A84C 0%, #E8C97A 100%)", color: "#000", boxShadow: "0 2px 10px rgba(201,168,76,0.2)" }
          : { background: SURFACE, color: "rgba(255,255,255,0.7)", border: `1px solid ${BORDER}` }
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
  const router = useRouter();
  const [step, setStep]             = useState<Step>("drop");
  const [preview, setPreview]       = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [ad, setAd]                 = useState("");
  const [kategori, setKategori]     = useState<ItemCategory>("Üst Giyim");
  const [renk, setRenk]             = useState("");
  const [mevsimler, setMevsimler]   = useState<ItemSeason[]>(["Tüm Mevsimler"]);
  const [stiller, setStiller]       = useState<ItemStyle[]>(["Günlük"]);
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
      alert("Kameraya erişilemedi veya izin verilmedi.");
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

  // ── Kıyafet Çıkarma (Extract) Yardımcıları ───────────────────
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
      setExtractHint("Otomatik kıyafet algılama başlatılamadı. Tüm fotoğrafı kullanabilirsin.");
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
        setExtractHint("Burada bir kıyafet algılanamadı. Üzerindeki kıyafete dokunmayı dene.");
        return;
      }
      setExtractResult(result);
      setExtractStage("preview");
    } catch {
      setExtractHint("Kesme işlemi başarısız oldu, tekrar dener misin?");
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
    setMevsimler(["Tüm Mevsimler"]); setStiller(["Günlük"]); setMarka("");
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
      marka: marka || undefined,
    });
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-2xl mx-auto mt-4">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted uppercase mb-1">YENİ PARÇA</p>
          <h1 className="text-3xl sm:text-4xl font-black text-text leading-none mb-2">Kıyafet Ekle.</h1>
          <p className="text-[13px] text-muted max-w-sm">
            AI fotoğrafı analiz eder, sen onaylarsın — ardından dolabına eklenir <Sparkles className="inline h-3.5 w-3.5 text-gold ml-1" />
          </p>
        </div>

        {step === "confirm" && (
          <button
            onClick={resetState}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold text-white/70 hover:text-white transition-colors flex-shrink-0"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
          >
            <RotateCcw className="h-4 w-4" /> Yeniden Başla
          </button>
        )}
      </div>

      <div className="mt-2">
        {/* ── Step 1: Drop or Camera ────────────────────────── */}
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
                    : "bg-[#111110] hover:bg-[#161614]"
                )}
                style={{ border: `1px solid ${GOLD}40` }}
              >
                <input {...getInputProps()} ref={fileInputRef} />
                <div
                  className="h-[80px] w-[80px] rounded-full mx-auto mb-6 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-lg"
                  style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.15) 0%, rgba(201,168,76,0.05) 100%)", border: `1px solid ${GOLD}30` }}
                >
                  <CloudUpload className="h-10 w-10 text-gold" strokeWidth={2} />
                </div>
                <p className="text-[18px] font-bold text-white mb-2">
                  {isDragActive ? "Bırak, yükleyelim!" : "Galeriden seç"}
                </p>
                <p className="text-[14px] text-white/40">JPG, PNG desteklenir</p>
              </div>

              {/* Camera Button */}
              <button
                onClick={() => startCamera("environment")}
                className="w-full py-4.5 rounded-[24px] flex items-center justify-center gap-3 font-bold text-[16px] text-white/90 hover:text-white transition-all duration-200"
                style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
              >
                <Camera className="h-5 w-5 text-gold" />
                Kamerayı Aç
              </button>
            </div>

            {/* Info banner bottom */}
            <div
              className="flex items-start gap-3.5 rounded-2xl p-5"
              style={{ background: "rgba(201,168,76,0.05)", border: `1px solid ${GOLD}25` }}
            >
              <Sparkles className="h-5 w-5 text-gold flex-shrink-0 mt-0.5" />
              <p className="text-[14px] text-white/70 leading-relaxed font-medium">
                CNN modeli kategori ve rengi tahmin eder. Sen onayladıktan sonra dolaba kaydedilir.
              </p>
            </div>
          </div>
        )}

        {/* ── Camera View ──────────────────────────────────── */}
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
              style={{ background: "linear-gradient(135deg, #C9A84C 0%, #E8C97A 100%)", boxShadow: "0 8px 30px rgba(201,168,76,0.3)" }}
            >
              <Camera className="h-6 w-6" />
              Fotoğraf Çek
            </button>
          </div>
        )}

        {/* ── Extract: Kıyafeti Seç ────────────────────────── */}
        {step === "drop" && extractStage === "select" && capturedDataUrl && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-300">
            <div
              className="relative w-full aspect-[3/4] sm:aspect-video rounded-[32px] overflow-hidden bg-black shadow-2xl"
              style={{ border: `1px solid ${BORDER}` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedDataUrl}
                alt="Çekilen fotoğraf"
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
                  style={{ background: "rgba(0,0,0,0.55)", border: `1px solid ${GOLD}40` }}
                >
                  <Hand className="h-4 w-4 text-gold" />
                  {segmenting ? "Kıyafetler algılanıyor…" : "Çıkarmak istediğin kıyafete dokun"}
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
                style={{ background: "rgba(201,168,76,0.05)", border: `1px solid ${GOLD}25` }}
              >
                <Info className="h-5 w-5 text-gold flex-shrink-0 mt-0.5" />
                <p className="text-[14px] text-white/80 leading-relaxed">{extractHint}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={useFullPhoto}
                className="flex-1 py-4 rounded-[20px] flex items-center justify-center gap-2 font-bold text-[15px] text-white/90 hover:text-white transition-all duration-200"
                style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
              >
                <ImageIcon className="h-5 w-5 text-gold" />
                Tüm Fotoğrafı Kullan
              </button>
              <button
                onClick={retakePhoto}
                className="flex-1 py-4 rounded-[20px] flex items-center justify-center gap-2 font-bold text-[15px] text-white/90 hover:text-white transition-all duration-200"
                style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
              >
                <RefreshCcw className="h-5 w-5 text-gold" />
                Tekrar Çek
              </button>
            </div>
          </div>
        )}

        {/* ── Extract: Kesilen Kıyafet Önizleme ────────────────────────── */}
        {step === "drop" && extractStage === "preview" && extractResult && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold text-gold mx-auto"
              style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)" }}
            >
              <Scissors className="h-4 w-4" />
              Kıyafet bulundu!
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
                alt="Kesilen kıyafet"
                className="max-h-full max-w-full object-contain p-6"
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={useExtractedCutout}
                className="w-full py-4.5 rounded-[20px] font-bold text-[17px] text-black transition-all duration-300 hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #C9A84C 0%, #E8C97A 100%)", boxShadow: "0 8px 30px rgba(201,168,76,0.3)" }}
              >
                <Sparkles className="h-5 w-5" />
                Bu Kıyafeti Kullan
              </button>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={backToSelect}
                  className="flex-1 py-4 rounded-[20px] flex items-center justify-center gap-2 font-bold text-[15px] text-white/90 hover:text-white transition-all duration-200"
                  style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                >
                  <Hand className="h-5 w-5 text-gold" />
                  Başka Nokta Seç
                </button>
                <button
                  onClick={retakePhoto}
                  className="flex-1 py-4 rounded-[20px] flex items-center justify-center gap-2 font-bold text-[15px] text-white/90 hover:text-white transition-all duration-200"
                  style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                >
                  <RefreshCcw className="h-5 w-5 text-gold" />
                  Tekrar Çek
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Analyzing ────────────────────────────── */}
        {step === "analyze" && (
          <div className="flex flex-col items-center justify-center py-20 gap-8 animate-in fade-in duration-300">
            {preview && (
              <div className="relative h-[280px] w-[210px] rounded-[24px] overflow-hidden shadow-2xl" style={{ border: `1px solid ${BORDER}` }}>
                <Image src={preview} alt="Yükleniyor" fill className="object-cover" />
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full blur-xl bg-gold/40 animate-pulse" />
                    <Loader2 className="h-14 w-14 text-gold animate-spin relative z-10" />
                  </div>
                </div>
              </div>
            )}
            <div className="text-center space-y-3">
              <p className="text-[26px] font-bold text-white">AI analiz ediyor</p>
              <p className="text-[15px] text-white/50">Kategori, renk ve stil belirleniyor...</p>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirm ──────────────────────────────── */}
        {step === "confirm" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            
            {/* Info banner */}
            <div
              className="flex items-center justify-between gap-4 rounded-2xl p-5"
              style={{ background: "rgba(201,168,76,0.05)", border: `1px solid ${GOLD}25` }}
            >
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-gold flex-shrink-0 mt-0.5" />
                <p className="text-[14px] text-white/80 leading-relaxed">
                  AI tahmini yanlışsa aşağıdan düzelt. <strong className="text-white">"Dolaba Ekle"</strong> butonuna bastığında seçtiğin bilgiler kaydedilir.
                </p>
              </div>
              <div
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold text-gold shrink-0"
                style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)" }}
              >
                <Sparkles className="h-4 w-4" />
                AI Önerisi
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
              {/* Image */}
              {preview && (
                <div className="relative h-48 w-full sm:w-36 rounded-[24px] overflow-hidden flex-shrink-0 shadow-lg" style={{ border: `1px solid ${BORDER}`, background: '#f4f4f4' }}>
                  <Image src={preview} alt="Önizleme" fill className="object-cover" />
                </div>
              )}

              {/* Right: name + color */}
              <div className="flex-1 space-y-6">
                <div>
                  <SectionLabel>AD (opsiyonel)</SectionLabel>
                  <input
                    value={ad}
                    onChange={(e) => setAd(e.target.value)}
                    placeholder="Kıyafet adı"
                    className="w-full rounded-[16px] px-4 py-4 text-[15px] font-medium text-white placeholder:text-white/30 outline-none transition-all"
                    style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                    onFocus={(e) => e.target.style.borderColor = GOLD}
                    onBlur={(e) => e.target.style.borderColor = BORDER}
                  />
                </div>
                <div>
                  <SectionLabel>RENK</SectionLabel>
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
                      placeholder="Renk (ör: Mavi)"
                      className="flex-1 rounded-[16px] px-4 py-4 text-[15px] font-medium text-white placeholder:text-white/30 outline-none transition-all"
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
              <SectionLabel subtitle="AI tahmini yanlışsa doğrusunu seç.">KATEGORİ</SectionLabel>
              <div className="relative mt-3">
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value as ItemCategory)}
                  className="w-full appearance-none rounded-[16px] px-5 py-4 text-[16px] font-bold text-white outline-none pr-12 cursor-pointer shadow-sm transition-all"
                  style={{ background: SURFACE, border: `1px solid ${GOLD}60` }}
                  onFocus={(e) => e.target.style.boxShadow = `0 0 0 1px ${GOLD}`}
                  onBlur={(e) => e.target.style.boxShadow = 'none'}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value} className="bg-[#161614] text-white py-2">
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gold pointer-events-none" />
              </div>
            </div>

            {/* Season pills */}
            <div>
              <SectionLabel>MEVSİM</SectionLabel>
              <div className="flex flex-wrap gap-3 mt-2">
                {SEASONS.map((s) => (
                  <PillBtn key={s} label={s} active={mevsimler.includes(s)} onClick={() => toggleMevsim(s)} />
                ))}
              </div>
            </div>

            {/* Style pills */}
            <div>
              <SectionLabel>STİL</SectionLabel>
              <div className="flex flex-wrap gap-3 mt-2">
                {STYLES.map((s) => (
                  <PillBtn key={s} label={s} active={stiller.includes(s)} onClick={() => toggleStil(s)} />
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
                style={{ background: "linear-gradient(135deg, #C9A84C 0%, #E8C97A 100%)", boxShadow: "0 8px 30px rgba(201,168,76,0.3)" }}
              >
                {addItem.isPending ? (
                  <><Loader2 className="h-6 w-6 animate-spin" /> Ekleniyor…</>
                ) : (
                  "Dolaba Ekle"
                )}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
