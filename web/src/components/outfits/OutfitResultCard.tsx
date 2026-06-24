"use client";

import { useState } from "react";
import Image from "next/image";
import { Bookmark, ThumbsUp, ThumbsDown, Shirt, Sparkles, Lightbulb, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { WebProductCard } from "@/components/outfits/WebProductCard";
import type { Outfit, OutfitRecommendation, PopulatedItem, WeatherData, WebProduct } from "@/types";
import { useT } from "@/lib/i18n";

const BDR = "1px solid var(--color-border)";
const SBG = "var(--color-surface)";
const IBG = "var(--color-gold-dim)";
const ABD = "1px solid var(--color-gold-border)";

const CAT_KEY: Record<string, string> = {
  "Üst Giyim": "wardrobe.topwear", "Alt Giyim": "wardrobe.bottomwear", "Elbise": "wardrobe.dress",
  "Dış Giyim": "wardrobe.outerwear", "Ayakkabı": "wardrobe.shoes", "Aksesuar": "wardrobe.accessories",
};

interface NormalizedOutfit {
  id: string; baslik: string; aciklama: string; ipucu: string;
  kiyafetler: PopulatedItem[]; disUrunler?: WebProduct[]; havaDurumu?: WeatherData; etkinlik?: string;
  begeniyor?: boolean | null; kaydedildi?: boolean;
}

function normalizeRecommendation(r: OutfitRecommendation): NormalizedOutfit {
  return { id: r.id, baslik: r.baslik, aciklama: r.aciklama, ipucu: r.ipucu,
    kiyafetler: r.kiyafetler as PopulatedItem[], disUrunler: r.disUrunler, havaDurumu: r.havaDurumu, etkinlik: r.etkinlik };
}
function normalizeOutfit(o: Outfit): NormalizedOutfit {
  return { id: o._id, baslik: o.baslik, aciklama: o.aiAciklama, ipucu: "",
    kiyafetler: o.kiyafetler, disUrunler: o.disUrunler, havaDurumu: o.havaDurumu, etkinlik: o.etkinlik,
    begeniyor: o.begeniyor, kaydedildi: o.kaydedildi };
}

interface OutfitResultCardProps {
  outfit: Outfit | OutfitRecommendation;
  showActions?: boolean; showRemove?: boolean; isFresh?: boolean; highlight?: boolean;
  onFeedback?: (id: string, begeniyor: boolean) => void;
  onSave?: (outfit: OutfitRecommendation) => void; onRemove?: (id: string) => void;
  onTryOn?: (id: string) => void;
  isFeedbackLoading?: boolean; isSaveLoading?: boolean; isRemoveLoading?: boolean;
}

export function OutfitResultCard({ outfit, showActions = false, isFresh = false,
  highlight = false, onFeedback, onSave, onRemove, onTryOn, showRemove = false,
  isFeedbackLoading, isSaveLoading, isRemoveLoading }: OutfitResultCardProps) {

  const { t } = useT();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!outfit) return null;

  const data = "aiAciklama" in outfit ? normalizeOutfit(outfit as Outfit) : normalizeRecommendation(outfit as OutfitRecommendation);
  const items = data.kiyafetler.slice(0, 3);

  return (
    <article
      className={cn("rounded-2xl overflow-hidden transition-all duration-300", isFresh && "ring-1 ring-gold/30", highlight && "ring-1 ring-gold")}
      style={{ background: "var(--color-bg)", border: BDR }}
    >
      {/* Gold top bar on fresh results */}
      {(isFresh || highlight) && <div className="h-0.5 w-full bg-gold-gradient" />}

      {/* Lookbook image grid */}
      {items.length > 0 && (
        <div className={cn("grid gap-0.5", items.length === 1 ? "grid-cols-1" : items.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
          {items.map((item, idx) => (
            <div key={item._id} className="relative" style={{ aspectRatio: items.length === 1 ? "16/9" : "1/1" }}>
              <Image
                src={item.resimUrl}
                alt={item.kategori}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
              {/* Category label */}
              <div className="absolute bottom-2 left-2">
                <span
                  className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(0,0,0,0.65)", color: "#B0A898", backdropFilter: "blur(6px)" }}
                >
                  {CAT_KEY[item.kategori] ? t(CAT_KEY[item.kategori]) : item.kategori}
                </span>
              </div>
              {idx === 0 && (
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Title + remove button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              {(data.etkinlik || data.baslik) && (
                <span
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                  style={{ background: "transparent", border: "1px solid var(--color-gold-border)", color: "var(--color-gold)" }}
                >
                  {data.baslik || data.etkinlik}
                </span>
              )}
              {isFresh && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full text-gold"
                  style={{ background: IBG, border: ABD }}
                >
                  <Sparkles className="h-2.5 w-2.5" /> {t("web.outfits.new_badge")}
                </span>
              )}
            </div>
          </div>
          
          {showRemove && !showActions && !onTryOn ? (
            <button
              onClick={() => onRemove?.(data.id)}
              disabled={isRemoveLoading}
              className="flex-shrink-0 h-8 w-8 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(248,113,113,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
            </button>
          ) : data.havaDurumu ? (
            <div className="flex-shrink-0 text-right">
              <p className="text-[11px] text-muted">{data.havaDurumu.sehir}</p>
              <p className="text-sm font-bold text-gold">{data.havaDurumu.sicaklik}°C</p>
            </div>
          ) : null}
        </div>

        {/* Stilistin Notu */}
        <div className={cn("space-y-3", !showRemove && "rounded-xl p-4")} style={!showRemove ? { background: SBG, border: BDR } : {}}>
          {!showRemove && (
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-gold" /> {t("try_on.stylist_note")}
            </p>
          )}
          <p
            onClick={() => setIsExpanded(true)}
            className={cn("text-[13px] text-text-sub leading-relaxed cursor-pointer", !isExpanded && "line-clamp-4")}
          >
            {data.aciklama}
          </p>
          {(isExpanded || !showRemove) && data.ipucu && (
            <div className="flex items-start gap-2.5 rounded-lg px-3 py-2.5" style={{ background: IBG, border: "1px solid var(--color-gold-dim)" }}>
              <Lightbulb className="h-3.5 w-3.5 text-gold flex-shrink-0 mt-0.5" />
              <p className="text-[12px] leading-relaxed italic" style={{ color: "var(--color-gold)" }}>
                {data.ipucu}
              </p>
            </div>
          )}
          {showRemove && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[11px] font-semibold flex items-center gap-1 mt-1 hover:opacity-80 transition"
              style={{ color: "var(--color-gold)" }}
            >
              {isExpanded ? `${t("saved_outfits.narrow_down")} ^` : `${t("saved_outfits.read_more")} ∨`}
            </button>
          )}
        </div>

        {/* Parça sayısı */}
        {data.kiyafetler.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Shirt className="h-3.5 w-3.5 text-muted" />
            <span className="text-[12px] text-muted">{data.kiyafetler.length} {t("home.items")}</span>
          </div>
        )}

        {/* Web'den önerilen ürünler */}
        {data.disUrunler && data.disUrunler.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted flex items-center gap-1.5">
              <ShoppingBag className="h-3 w-3 text-gold" /> {t("web.outfits.web_suggestions")}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {data.disUrunler.map((urun, idx) => (
                <WebProductCard key={`${urun.link}-${idx}`} product={urun} />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {(showActions || onTryOn) && (
          <div className="pt-2 border-t mt-2" style={{ borderColor: "var(--color-border)" }}>
            {onTryOn && (
              <button
                onClick={() => onTryOn(data.id)}
                className="w-full py-3 rounded-xl bg-gold-gradient text-black font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                👤 {t("outfit_generator.try_on")}
              </button>
            )}
            
            {showActions && !onTryOn && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onFeedback?.(data.id, true)}
                  disabled={isFeedbackLoading}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-colors",
                    data.begeniyor === true
                      ? "text-success bg-success/10"
                      : "text-muted hover:text-success"
                  )}
                  style={{ border: data.begeniyor === true ? "1px solid rgba(74,140,92,0.4)" : BDR }}
                >
                  <ThumbsUp className="h-3.5 w-3.5" /> {t("web.outfits.like")}
                </button>
                <button
                  onClick={() => onFeedback?.(data.id, false)}
                  disabled={isFeedbackLoading}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-colors",
                    data.begeniyor === false
                      ? "text-danger bg-danger/10"
                      : "text-muted hover:text-danger"
                  )}
                  style={{ border: data.begeniyor === false ? "1px solid rgba(176,64,64,0.4)" : BDR }}
                >
                  <ThumbsDown className="h-3.5 w-3.5" /> {t("web.outfits.dislike")}
                </button>
                <button
                  onClick={() => {
                    if (onSave && !("aiAciklama" in outfit)) {
                      onSave(outfit as OutfitRecommendation);
                    }
                  }}
                  disabled={isSaveLoading || data.kaydedildi}
                  className={cn(
                    "ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[12px] font-semibold transition-all",
                    data.kaydedildi
                      ? "text-gold"
                      : "bg-gold-gradient text-black hover:opacity-90"
                  )}
                  style={data.kaydedildi ? { border: ABD, background: IBG } : {}}
                >
                  <Bookmark className="h-3.5 w-3.5" fill={data.kaydedildi ? "currentColor" : "none"} />
                  {data.kaydedildi ? t("try_on.saved") : t("try_on.save_outfit")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
