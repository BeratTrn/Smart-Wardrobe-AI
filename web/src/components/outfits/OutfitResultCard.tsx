"use client";

import { ThumbsUp, ThumbsDown, Bookmark, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { OutfitItemThumbnail } from "./OutfitItemThumbnail";
import type { Outfit, OutfitRecommendation, PopulatedItem, WeatherData } from "@/types";

// ── Normalisation ─────────────────────────────────────────────────────────────
interface NormalizedOutfit {
  id: string;
  baslik: string;
  aciklama: string;
  ipucu: string;
  kiyafetler: PopulatedItem[];
  havaDurumu?: WeatherData;
  etkinlik?: string;
  begeniyor?: boolean | null;
  kaydedildi?: boolean;
}

function normalizeRecommendation(r: OutfitRecommendation): NormalizedOutfit {
  return {
    id: r.id,
    baslik: r.baslik,
    aciklama: r.aciklama,
    ipucu: r.ipucu,
    kiyafetler: r.kiyafetler as PopulatedItem[],
    havaDurumu: r.havaDurumu,
    etkinlik: r.etkinlik,
  };
}

function normalizeOutfit(o: Outfit): NormalizedOutfit {
  return {
    id: o._id,
    baslik: o.baslik,
    aciklama: o.aiAciklama,
    ipucu: "",
    kiyafetler: o.kiyafetler,
    havaDurumu: o.havaDurumu,
    etkinlik: o.etkinlik,
    begeniyor: o.begeniyor,
    kaydedildi: o.kaydedildi,
  };
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface OutfitResultCardProps {
  outfit: Outfit | OutfitRecommendation;
  showActions?: boolean;
  showRemove?: boolean;
  isFresh?: boolean;
  highlight?: boolean;
  onFeedback?: (id: string, begeniyor: boolean) => void;
  onSave?: (id: string) => void;
  onRemove?: (id: string) => void;
  isFeedbackLoading?: boolean;
  isSaveLoading?: boolean;
  isRemoveLoading?: boolean;
}

export function OutfitResultCard({
  outfit,
  showActions = false,
  showRemove = false,
  isFresh = false,
  highlight = false,
  onFeedback,
  onSave,
  onRemove,
  isFeedbackLoading,
  isSaveLoading,
  isRemoveLoading,
}: OutfitResultCardProps) {
  const data =
    "aiAciklama" in outfit
      ? normalizeOutfit(outfit as Outfit)
      : normalizeRecommendation(outfit as OutfitRecommendation);

  return (
    <article
      className={cn(
        "glass rounded-2xl overflow-hidden transition-all duration-300",
        isFresh && "ring-1 ring-gold/40",
        highlight && "ring-1 ring-gold animate-pulse-slow"
      )}
    >
      {/* Top accent bar */}
      {(isFresh || highlight) && (
        <div className="h-0.5 w-full bg-gold-gradient" />
      )}

      <div className="p-5 space-y-4">
        {/* Title + badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-snug">{data.baslik}</h3>
            {data.etkinlik && (
              <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                {data.etkinlik}
              </span>
            )}
          </div>

          {/* Weather badge */}
          {data.havaDurumu && (
            <div className="flex-shrink-0 text-right">
              <p className="text-[12px] text-muted">{data.havaDurumu.sehir}</p>
              <p className="text-[13px] font-semibold text-gold">{data.havaDurumu.sicaklik}°C</p>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-[13px] text-muted leading-relaxed line-clamp-3">{data.aciklama}</p>

        {/* Tip */}
        {data.ipucu && (
          <div className="rounded-xl bg-gold/5 border border-gold/15 px-4 py-3">
            <p className="text-[12px] text-gold-light leading-relaxed">💡 {data.ipucu}</p>
          </div>
        )}

        {/* Item thumbnails */}
        {data.kiyafetler.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {data.kiyafetler.map((item) => (
              <OutfitItemThumbnail key={item._id} item={item} size={52} />
            ))}
          </div>
        )}

        {/* Actions */}
        {(showActions || showRemove) && (
          <div className="flex items-center gap-2 pt-1 border-t border-white/5">
            {showActions && (
              <>
                {/* Thumbs up */}
                <button
                  onClick={() => onFeedback?.(data.id, true)}
                  disabled={isFeedbackLoading}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border transition-colors",
                    data.begeniyor === true
                      ? "border-success bg-success/10 text-success"
                      : "border-border text-muted hover:border-success/40 hover:text-success"
                  )}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  Like
                </button>

                {/* Thumbs down */}
                <button
                  onClick={() => onFeedback?.(data.id, false)}
                  disabled={isFeedbackLoading}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border transition-colors",
                    data.begeniyor === false
                      ? "border-danger bg-danger/10 text-danger"
                      : "border-border text-muted hover:border-danger/40 hover:text-danger"
                  )}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                  Dislike
                </button>

                {/* Save */}
                <button
                  onClick={() => onSave?.(data.id)}
                  disabled={isSaveLoading || data.kaydedildi}
                  className={cn(
                    "ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border transition-colors",
                    data.kaydedildi
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-border text-muted hover:border-gold/40 hover:text-gold"
                  )}
                >
                  <Bookmark className="h-3.5 w-3.5" fill={data.kaydedildi ? "currentColor" : "none"} />
                  {data.kaydedildi ? "Saved" : "Save"}
                </button>
              </>
            )}

            {showRemove && (
              <button
                onClick={() => onRemove?.(data.id)}
                disabled={isRemoveLoading}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border border-border text-muted hover:border-danger/40 hover:text-danger transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
