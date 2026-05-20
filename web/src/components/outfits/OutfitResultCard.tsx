"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Bookmark, BookmarkCheck, Trash2, Cloud, Thermometer, MapPin } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { OutfitItemThumbnail } from "./OutfitItemThumbnail";
import type { Outfit, OutfitRecommendation, PopulatedItem, WeatherData } from "@/types";

// ── Normalised display shape ──────────────────────────────────────────
// Both the fresh recommendation and stored Outfit docs are mapped here
// so the card never needs an if/else on shape.

interface NormalizedOutfit {
  id: string;
  baslik: string;
  aciklama: string;
  ipucu: string;
  etkinlik?: string;
  kiyafetler: PopulatedItem[];
  havaDurumu?: WeatherData | { sicaklik: number; durum: string; konum: string };
  begeniyor: boolean | null;
  kaydedildi: boolean;
}

function normalizeRecommendation(r: OutfitRecommendation): NormalizedOutfit {
  return {
    id:         r.id,
    baslik:     r.baslik,
    aciklama:   r.aciklama,
    ipucu:      r.ipucu,
    etkinlik:   r.etkinlik,
    kiyafetler: r.kiyafetler as unknown as PopulatedItem[],
    havaDurumu: r.havaDurumu,
    begeniyor:  null,
    kaydedildi: false,
  };
}

function normalizeOutfit(o: Outfit): NormalizedOutfit {
  return {
    id:         o._id,
    baslik:     o.baslik,
    aciklama:   o.aiAciklama,
    ipucu:      "",
    etkinlik:   o.baglam?.etkinlik,
    kiyafetler: o.kiyafetler,
    havaDurumu: o.baglam?.havaDurumu as NormalizedOutfit["havaDurumu"],
    begeniyor:  o.begeniyor,
    kaydedildi: o.kaydedildi,
  };
}

// ── Weather badge ─────────────────────────────────────────────────────

function WeatherBadge({
  weather,
}: {
  weather: NormalizedOutfit["havaDurumu"];
}) {
  if (!weather) return null;
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface border border-border text-xs text-text-sub">
      <span className="flex items-center gap-1">
        <Thermometer size={12} className="text-gold/70" />
        {weather.sicaklik}°C
      </span>
      <span className="flex items-center gap-1">
        <Cloud size={12} className="text-gold/70" />
        {weather.durum}
      </span>
      {weather.konum && (
        <span className="flex items-center gap-1">
          <MapPin size={12} className="text-gold/70" />
          {weather.konum}
        </span>
      )}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────

interface OutfitResultCardProps {
  /** Pass either a fresh recommendation or a stored outfit — both accepted */
  outfit: OutfitRecommendation | Outfit;
  /** Whether this came from the recommend endpoint (not yet stored) */
  isFresh?: boolean;
  /** Show feedback + bookmark actions (outfits page) */
  showActions?: boolean;
  /** Show remove action instead (saved-outfits page) */
  showRemove?: boolean;
  onFeedback?: (id: string, begeniyor: boolean) => void;
  onSave?: (id: string) => void;
  onRemove?: (id: string) => void;
  isFeedbackLoading?: boolean;
  isSaveLoading?: boolean;
  isRemoveLoading?: boolean;
  /** Highlight as the freshly generated card */
  highlight?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────

export function OutfitResultCard({
  outfit,
  isFresh = false,
  showActions = true,
  showRemove = false,
  onFeedback,
  onSave,
  onRemove,
  isFeedbackLoading = false,
  isSaveLoading = false,
  isRemoveLoading = false,
  highlight = false,
}: OutfitResultCardProps) {
  const [localSaved, setLocalSaved] = useState(false);

  const data: NormalizedOutfit = "aiAciklama" in outfit
    ? normalizeOutfit(outfit as Outfit)
    : normalizeRecommendation(outfit as OutfitRecommendation);

  const isSaved = data.kaydedildi || localSaved;

  const handleSave = () => {
    if (isSaved || !onSave) return;
    setLocalSaved(true);
    onSave(data.id);
  };

  return (
    <article
      className={cn(
        "rounded-2xl border transition-all duration-300",
        highlight
          ? "border-gold/40 bg-gradient-to-b from-gold/5 to-card shadow-card"
          : "border-border bg-card hover:border-border/80"
      )}
    >
      {/* Fresh indicator */}
      {isFresh && (
        <div className="px-5 pt-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-gold uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            New AI Suggestion
          </span>
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Title + event */}
        <div className="space-y-0.5">
          <h3 className="text-base font-semibold text-text leading-tight">
            {data.baslik}
          </h3>
          {data.etkinlik && (
            <p className="text-xs text-muted">{data.etkinlik}</p>
          )}
        </div>

        {/* Weather context */}
        <WeatherBadge weather={data.havaDurumu} />

        {/* AI description */}
        <p className="text-sm text-text-sub leading-relaxed">{data.aciklama}</p>

        {/* Styling tip */}
        {data.ipucu && (
          <div className="flex gap-2.5 rounded-xl bg-gold/5 border border-gold/15 px-3.5 py-2.5">
            <span className="text-gold text-sm mt-0.5 shrink-0">✦</span>
            <p className="text-xs text-text-sub leading-relaxed">{data.ipucu}</p>
          </div>
        )}

        {/* Item thumbnails */}
        {data.kiyafetler.length > 0 && (
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
            {data.kiyafetler.map((item, i) => (
              <OutfitItemThumbnail
                key={item._id ?? i}
                item={item}
                size="md"
              />
            ))}
          </div>
        )}

        {/* Action bar */}
        {(showActions || showRemove) && (
          <div className="flex items-center gap-2 pt-1 border-t border-border/60">
            {showActions && (
              <>
                {/* Thumbs up */}
                <button
                  disabled={isFeedbackLoading}
                  onClick={() => onFeedback?.(data.id, true)}
                  aria-label="Thumbs up"
                  className={cn(
                    "flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-all duration-150",
                    data.begeniyor === true
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-border text-text-sub hover:border-success/30 hover:text-success",
                    isFeedbackLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <ThumbsUp size={13} />
                  Like
                </button>

                {/* Thumbs down */}
                <button
                  disabled={isFeedbackLoading}
                  onClick={() => onFeedback?.(data.id, false)}
                  aria-label="Thumbs down"
                  className={cn(
                    "flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-all duration-150",
                    data.begeniyor === false
                      ? "border-danger/40 bg-danger/10 text-danger"
                      : "border-border text-text-sub hover:border-danger/30 hover:text-danger",
                    isFeedbackLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <ThumbsDown size={13} />
                  Dislike
                </button>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Bookmark */}
                <button
                  disabled={isSaved || isSaveLoading}
                  onClick={handleSave}
                  aria-label={isSaved ? "Saved" : "Save outfit"}
                  className={cn(
                    "flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-all duration-150",
                    isSaved
                      ? "border-gold/40 bg-gold/10 text-gold cursor-default"
                      : "border-border text-text-sub hover:border-gold/40 hover:text-gold",
                    isSaveLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isSaved ? (
                    <><BookmarkCheck size={13} /> Saved</>
                  ) : (
                    <><Bookmark size={13} /> Save</>
                  )}
                </button>
              </>
            )}

            {showRemove && (
              <button
                disabled={isRemoveLoading}
                onClick={() => onRemove?.(data.id)}
                aria-label="Remove saved outfit"
                className={cn(
                  "ml-auto flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-all duration-150",
                  "border-border text-text-sub hover:border-danger/30 hover:text-danger",
                  isRemoveLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                <Trash2 size={13} />
                Remove
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
