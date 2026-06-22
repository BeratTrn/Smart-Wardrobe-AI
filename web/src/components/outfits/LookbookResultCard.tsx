"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  Bookmark, Sparkles, Lightbulb, User, Camera, Loader2, Shirt, Footprints, ShoppingBag, ExternalLink,
} from "lucide-react";
import type { Outfit, OutfitRecommendation, PopulatedItem, WeatherData, WebProduct } from "@/types";

const BDR = "1px solid var(--color-border)";
const SBG = "var(--color-surface)";
const IBG = "var(--color-gold-dim)";
const ABD = "1px solid var(--color-gold-border)";

// Map category -> label + icon
function slotMeta(kategori: string): { label: string; icon: React.ElementType } {
  const k = kategori.toLowerCase();
  if (k.includes("ust") || k.includes("ust") || k.includes("shirt") || k.includes("jacket") ||
      k.includes("tshirt") || k.includes("bluz") || k.includes("sweat") || k.includes("gom") ||
      ["mont", "hirka", "kazak", "tisort", "gomlek"].some((x) => k.includes(x))) {
    return { label: "UST GIYIM", icon: Shirt };
  }
  if (k.includes("ayak") || k.includes("shoe") || k.includes("boot") || k.includes("sneaker")) {
    return { label: "AYAKKABI", icon: Footprints };
  }
  return { label: "ALT GIYIM", icon: Shirt };
}

interface NormalizedOutfit {
  id: string; baslik: string; aciklama: string; ipucu: string;
  kiyafetler: PopulatedItem[]; disUrunler?: WebProduct[]; havaDurumu?: WeatherData; etkinlik?: string;
  begeniyor?: boolean | null; kaydedildi?: boolean;
}

function normalize(outfit: Outfit | OutfitRecommendation): NormalizedOutfit {
  if ("aiAciklama" in outfit) {
    const o = outfit as Outfit;
    return { id: o._id, baslik: o.baslik, aciklama: o.aiAciklama, ipucu: "",
      kiyafetler: o.kiyafetler, disUrunler: o.disUrunler, havaDurumu: o.havaDurumu, etkinlik: o.etkinlik,
      begeniyor: o.begeniyor, kaydedildi: o.kaydedildi };
  }
  const r = outfit as OutfitRecommendation;
  return { id: r.id, baslik: r.baslik, aciklama: r.aciklama, ipucu: r.ipucu,
    kiyafetler: r.kiyafetler as PopulatedItem[], disUrunler: r.disUrunler, havaDurumu: r.havaDurumu, etkinlik: r.etkinlik };
}

interface LookbookResultCardProps {
  outfit: Outfit | OutfitRecommendation;
  onSave?: (id: string) => void;
  isSaveLoading?: boolean;
}

export function LookbookResultCard({ outfit, onSave, isSaveLoading }: LookbookResultCardProps) {
  const data  = normalize(outfit);
  const items = data.kiyafetler.slice(0, 3);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUserPhoto(URL.createObjectURL(file));
    setTimeout(() => setUploading(false), 400);
  };

  return (
    <article
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--color-bg)", border: BDR }}
    >
      {/* Gold top accent */}
      <div className="h-0.5 w-full bg-gold-gradient" />

      {/* LOOKBOOK header */}
      <div className="px-6 pt-5 pb-3 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-muted mb-0.5">
            LOOKBOOK
          </p>
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted/60">KISISEL STIL YAYINI</p>
        </div>
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-gold"
          style={{ background: IBG, border: ABD }}
        >
          <Sparkles className="h-2.5 w-2.5" /> AI Engine
        </div>
      </div>

      {/* Main 2-col layout */}
      <div className="px-4 pb-4 flex gap-4 items-start">

        {/* Left: user photo upload */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative flex-shrink-0 w-36 rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-3 transition-all hover:opacity-90"
          style={{
            height: "320px",
            background: SBG,
            border: userPhoto ? "1px solid var(--color-gold-border)" : "1px solid var(--color-border)",
          }}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 text-gold animate-spin" />
          ) : userPhoto ? (
            <Image src={userPhoto} alt="Your photo" fill className="object-cover" sizes="144px" />
          ) : (
            <>
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center"
                style={{ border: "2px solid rgba(201,168,76,0.4)" }}
              >
                <User className="h-7 w-7 text-gold/60" />
              </div>
              <div className="text-center px-3">
                <p className="text-[11px] font-semibold text-text/70 leading-snug">
                  Fotografinizi Ekleyin
                </p>
                <div className="flex items-center justify-center gap-1 mt-1.5">
                  <Camera className="h-3 w-3 text-muted" />
                  <span className="text-[10px] text-muted">Dokunun</span>
                </div>
              </div>
            </>
          )}
          {userPhoto && (
            <div
              className="absolute bottom-2 right-2 h-7 w-7 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <Camera className="h-3.5 w-3.5 text-white" />
            </div>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />

        {/* Right: outfit pieces stacked */}
        <div className="flex-1 min-w-0 space-y-3">
          {items.map((item) => {
            const meta = slotMeta(item.kategori);
            const MetaIcon = meta.icon;
            return (
              <div key={item._id} className="space-y-1.5">
                {/* Category label */}
                <div className="flex items-center gap-1.5">
                  <MetaIcon className="h-3 w-3 text-gold" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold">
                    {meta.label}
                  </span>
                </div>
                {/* Item photo */}
                <div
                  className="relative w-full rounded-xl overflow-hidden"
                  style={{ height: "88px" }}
                >
                  <Image
                    src={item.resimUrl}
                    alt={item.kategori}
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                </div>
                {/* Item name bar */}
                <div
                  className="h-1.5 rounded-full"
                  style={{ background: "rgba(201,168,76,0.25)", width: "80%" }}
                />
              </div>
            );
          })}
          {(data.disUrunler ?? []).map((urun, idx) => (
            <a
              key={`${urun.link}-${idx}`}
              href={urun.link}
              target="_blank"
              rel="noopener noreferrer"
              className="space-y-1.5 group block"
            >
              {/* Category label */}
              <div className="flex items-center gap-1.5">
                <ShoppingBag className="h-3 w-3 text-gold" />
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold">
                  WEB'DEN
                </span>
              </div>
              {/* Item photo */}
              <div
                className="relative w-full rounded-xl overflow-hidden"
                style={{ height: "88px" }}
              >
                {urun.resimUrl ? (
                  <Image
                    src={urun.resimUrl}
                    alt={urun.ad}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="200px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-surface)]">
                    <ShoppingBag className="h-5 w-5 text-muted" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white px-2.5 py-1 rounded-full bg-black/60">
                    Satın Al <ExternalLink className="h-2.5 w-2.5" />
                  </span>
                </div>
              </div>
              {/* Item name bar */}
              <div
                className="h-1.5 rounded-full"
                style={{ background: "rgba(201,168,76,0.25)", width: "80%" }}
              />
            </a>
          ))}
        </div>
      </div>

      {/* Stylist Note */}
      <div className="px-4 pb-4">
        <div className="rounded-xl p-4 space-y-3" style={{ background: SBG, border: BDR }}>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-gold" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
              STILISTIN NOTU
            </p>
          </div>
          <p className="text-[13px] leading-relaxed text-text/80 italic">
            &quot;{data.aciklama}&quot;
          </p>
          {data.ipucu && (
            <div
              className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
              style={{ background: IBG, border: "1px solid var(--color-gold-dim)" }}
            >
              <Lightbulb className="h-3.5 w-3.5 text-gold flex-shrink-0 mt-0.5" />
              <p className="text-[12px] leading-relaxed italic" style={{ color: "var(--color-gold)" }}>
                {data.ipucu}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Save button */}
      <div className="px-4 pb-5">
        <button
          type="button"
          onClick={() => onSave?.(data.id)}
          disabled={isSaveLoading || !!data.kaydedildi}
          className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
          style={
            data.kaydedildi
              ? { background: IBG, border: ABD, color: "var(--color-gold)" }
              : { background: "linear-gradient(135deg,var(--color-gold),#E8C96A,var(--color-gold))", color: "#000" }
          }
        >
          {isSaveLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Bookmark className="h-4 w-4" fill={data.kaydedildi ? "currentColor" : "none"} />
              {data.kaydedildi ? "Kaydedildi" : "Stilimi Kaydet"}
            </>
          )}
        </button>
      </div>
    </article>
  );
}
