"use client";

import Image from "next/image";
import { X, Heart, Sparkles, Palette, Sun, Layers, Loader2 } from "lucide-react";
import type { Item } from "@/types";

interface ItemDetailModalProps {
  item: Item | null;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  isFavoriteLoading: boolean;
}

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  "Üst Giyim":     { bg: "rgba(90,122,156,0.2)",  text: "#7EB3E0" },
  "Alt Giyim":     { bg: "rgba(122,90,156,0.2)",  text: "#B07EE0" },
  "Elbise":        { bg: "rgba(156,90,122,0.2)",  text: "#E07EB0" },
  "Dış Giyim":     { bg: "rgba(106,140,106,0.2)", text: "#90C490" },
  "Ayakkabı":      { bg: "rgba(156,122,90,0.2)",  text: "#E0B07E" },
  "Aksesuar":      { bg: "rgba(90,156,122,0.2)",  text: "#7EE0B0" },
};

const SEASON_ICONS: Record<string, string> = {
  "Yaz": "☀️", "Kış": "❄️", "İlkbahar": "🌸", "Sonbahar": "🍂", "Tüm Mevsimler": "🌍",
};
const STYLE_ICONS: Record<string, string> = {
  "Günlük": "👕", "Spor": "🏃", "Şık": "✨", "Klasik": "👔",
  "Sokak": "🛹", "Minimal": "⬜", "Resmi": "👔",
};

export function ItemDetailModal({
  item, onClose, onToggleFavorite, isFavoriteLoading,
}: ItemDetailModalProps) {
  if (!item) return null;

  const cat = CAT_COLORS[item.kategori] ?? { bg: "rgba(201,168,76,0.15)", text: "var(--color-gold)" };
  const isFav = item.favori;

  const mevsimArr = Array.isArray(item.mevsim) ? item.mevsim : [item.mevsim];
  const stilArr   = Array.isArray(item.stil)   ? item.stil   : [item.stil];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 pointer-events-none">
        <div
          className="relative w-full max-w-lg pointer-events-auto rounded-[32px] overflow-hidden flex flex-col shadow-2xl"
          style={{
            background: "#0C0C0B",
            border: "1px solid #222218",
            boxShadow: "0 32px 80px -12px rgba(0,0,0,0.9), 0 0 0 1px rgba(201,168,76,0.08)",
            maxHeight: "92vh",
          }}
        >
          {/* ── Image Section ── */}
          <div className="relative w-full flex-shrink-0" style={{ aspectRatio: "4/3", background: "#F0F0EE" }}>
            <Image
              src={item.resimUrl}
              alt={item.kategori}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 512px"
              priority
            />

            {/* Top gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60 pointer-events-none" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 left-4 h-10 w-10 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <X className="h-5 w-5" />
            </button>

            {/* Favorite heart button (top-right) */}
            <button
              onClick={() => onToggleFavorite(item._id)}
              disabled={isFavoriteLoading}
              className="absolute top-4 right-4 h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 disabled:opacity-50"
              style={{
                background: isFav ? "rgba(239,68,68,0.25)" : "rgba(0,0,0,0.5)",
                backdropFilter: "blur(12px)",
                border: isFav ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {isFavoriteLoading ? (
                <Loader2 className="h-4 w-4 text-white animate-spin" />
              ) : (
                <Heart
                  className="h-5 w-5 transition-all duration-300"
                  fill={isFav ? "#EF4444" : "none"}
                  color={isFav ? "#EF4444" : "rgba(255,255,255,0.9)"}
                />
              )}
            </button>

            {/* Bottom: category badge */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2">
              <span
                className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
                style={{ background: cat.bg, color: cat.text, backdropFilter: "blur(8px)", border: `1px solid ${cat.text}30` }}
              >
                {item.kategori}
              </span>
              <span
                className="px-3 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1 text-gold"
                style={{ background: "rgba(201,168,76,0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(201,168,76,0.3)" }}
              >
                <Sparkles className="h-3 w-3" /> AI Onaylı
              </span>
            </div>
          </div>

          {/* ── Content Section ── */}
          <div className="flex-1 overflow-y-auto scrollbar-none">
            <div className="p-6 space-y-5">

              {/* Title + marka */}
              <div>
                <h2 className="text-2xl font-black text-white leading-tight">
                  {item.ad || "Kıyafet"}
                </h2>
                {item.aciklama && (
                  <p className="text-[13px] text-muted mt-1 leading-relaxed">{item.aciklama}</p>
                )}
              </div>

              {/* Properties grid */}
              <div className="grid grid-cols-2 gap-3">

                {/* Renk */}
                <div
                  className="rounded-2xl p-4 space-y-2"
                  style={{ background: "#161614", border: "1px solid #222218" }}
                >
                  <div className="flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5 text-muted" />
                    <span className="text-[11px] font-medium text-muted uppercase tracking-wider">Renk</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-6 w-6 rounded-full ring-2 ring-white/10 flex-shrink-0"
                      style={{ backgroundColor: item.renk?.toLowerCase() || "#888" }}
                    />
                    <span className="text-[13px] font-bold text-white capitalize truncate">
                      {item.renk || "Bilinmiyor"}
                    </span>
                  </div>
                </div>

                {/* Mevsim */}
                <div
                  className="rounded-2xl p-4 space-y-2"
                  style={{ background: "#161614", border: "1px solid #222218" }}
                >
                  <div className="flex items-center gap-1.5">
                    <Sun className="h-3.5 w-3.5 text-muted" />
                    <span className="text-[11px] font-medium text-muted uppercase tracking-wider">Mevsim</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {mevsimArr.map((m) => (
                      <span key={m} className="text-[12px] font-semibold text-white">
                        {SEASON_ICONS[m] ?? "🌀"} {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stil */}
                <div
                  className="rounded-2xl p-4 space-y-2 col-span-2"
                  style={{ background: "#161614", border: "1px solid #222218" }}
                >
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-muted" />
                    <span className="text-[11px] font-medium text-muted uppercase tracking-wider">Stil</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {stilArr.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-semibold"
                        style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", color: "var(--color-gold)" }}
                      >
                        {STYLE_ICONS[s] ?? "🎨"} {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Sticky Favorite Button ── */}
            <div
              className="sticky bottom-0 p-4 pt-3"
              style={{ background: "linear-gradient(to top, #0C0C0B 80%, transparent)", zIndex: 10 }}
            >
              <button
                onClick={() => onToggleFavorite(item._id)}
                disabled={isFavoriteLoading}
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2.5 font-bold text-[15px] transition-all duration-300 hover:opacity-90 disabled:opacity-50"
                style={
                  isFav
                    ? {
                        background: "rgba(239,68,68,0.12)",
                        border: "1px solid rgba(239,68,68,0.35)",
                        color: "#EF4444",
                      }
                    : {
                        background: "linear-gradient(135deg, #C9A84C 0%, #E8C97A 100%)",
                        color: "#000",
                        boxShadow: "0 4px 20px rgba(201,168,76,0.3)",
                      }
                }
              >
                {isFavoriteLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Heart
                    className="h-5 w-5"
                    fill={isFav ? "currentColor" : "none"}
                    strokeWidth={isFav ? 0 : 2.5}
                  />
                )}
                {isFav ? "Favorilerden Çıkar" : "Favorilere Ekle"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
