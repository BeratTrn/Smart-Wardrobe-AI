"use client";

import { useState } from "react";
import { Sparkles, Lightbulb, Globe } from "lucide-react";
import type { Season, OutfitGeneratePayload, WeatherData } from "@/types";
import { useT } from "@/lib/i18n";

const EVENTS   = ["Günlük","İş","Parti","Spor","Romantik","Seyahat"];
const WEATHER_FEELS = ["Sıcak","Ilık","Serin","Soğuk"];
const STYLES   = ["Günlük","Klasik","Spor","Sokak","Minimal","Şık","Resmi"];

const EVENT_KEY: Record<string, string> = {
  "Günlük": "outfit_generator.daily", "İş": "outfit_generator.work", "Parti": "outfit_generator.party",
  "Spor": "outfit_generator.sport", "Romantik": "outfit_generator.romantic", "Seyahat": "outfit_generator.travel",
};
const WEATHER_FEEL_KEY: Record<string, string> = {
  "Sıcak": "outfit_generator.hot", "Ilık": "outfit_generator.warm", "Serin": "outfit_generator.cool", "Soğuk": "outfit_generator.cold",
};
const STYLE_KEY: Record<string, string> = {
  "Günlük": "add_item.casual", "Klasik": "add_item.classic", "Spor": "add_item.sport",
  "Sokak": "add_item.street", "Minimal": "add_item.minimal", "Şık": "add_item.chic", "Resmi": "add_item.formal",
};

const WEATHER_TO_SEASON: Record<string, Season> = {
  "Sıcak": "Yaz",
  "Ilık":  "İlkbahar",
  "Serin": "Sonbahar",
  "Soğuk": "Kış",
};

const BG  = "var(--color-bg)";
const SBG = "var(--color-surface)";
const BDR = "1px solid var(--color-border)";
const ABD = "1px solid var(--color-gold-border)";
const IBG = "var(--color-gold-dim)";

interface OutfitGeneratorPanelProps {
  onGenerate: (payload: OutfitGeneratePayload, webdenOner: boolean) => void;
  isLoading: boolean;
  weather?: WeatherData | null;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted mb-2.5">{children}</p>;
}

function PillBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 flex-shrink-0"
      style={
        active
          ? { background: "var(--color-gold)", color: "#000" }
          : { background: SBG, color: "var(--color-text-sub)", border: BDR }
      }
    >
      {label}
    </button>
  );
}

export function OutfitGeneratorPanel({ onGenerate, isLoading, weather }: OutfitGeneratorPanelProps) {
  const { t } = useT();
  const [event,   setEvent]   = useState("Günlük");
  const [hava,    setHava]    = useState("Ilık");
  const [stil,    setStil]    = useState("Günlük");
  // Toggle UI'ı kaldırıldı — gerçek hava verisi varsa sessizce kullanılır.
  const useCurrentWeather = !!weather;
  const [webdenOner, setWebdenOner] = useState(false);

  const handleGenerate = () => {
    const payload: OutfitGeneratePayload = {};
    payload.etkinlik = event;
    payload.mevsim   = WEATHER_TO_SEASON[hava];
    if (useCurrentWeather && weather) payload.havaDurumu = weather;
    onGenerate(payload, webdenOner);
  };

  return (
    <div className="rounded-2xl p-6 space-y-6" style={{ background: BG, border: BDR }}>
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted mb-1">{t("outfit_generator.outfit_upper")}</p>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-black text-text leading-tight">{t("outfit_generator.outfit_generator")}</h2>
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold text-gold flex-shrink-0"
            style={{ background: IBG, border: ABD }}
          >
            <Sparkles className="h-3 w-3" /> AI Engine
          </div>
        </div>
      </div>

      {/* DURUM */}
      <div>
        <SectionLabel>{t("outfit_generator.status")}</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {EVENTS.map((ev) => (
            <PillBtn key={ev} label={t(EVENT_KEY[ev])} active={event === ev} onClick={() => setEvent(ev)} />
          ))}
        </div>
      </div>

      {/* HAVA */}
      <div>
        <SectionLabel>{t("outfit_generator.weather")}</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {WEATHER_FEELS.map((h) => (
            <PillBtn key={h} label={t(WEATHER_FEEL_KEY[h])} active={hava === h} onClick={() => setHava(h)} />
          ))}
        </div>
      </div>

      {/* STİL */}
      <div>
        <SectionLabel>{t("outfit_generator.style")}</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <PillBtn key={s} label={t(STYLE_KEY[s])} active={stil === s} onClick={() => setStil(s)} />
          ))}
        </div>
      </div>

      {/* WEBDEN ÖNER */}
      <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: SBG, border: BDR }}>
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: IBG }}>
            <Globe className="h-3.5 w-3.5 text-gold" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-text leading-tight">{t("web.outfits.suggest_from_web")}</p>
            <p className="text-[11px] text-muted leading-snug">{t("web.outfits.suggest_from_web_desc")}</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={webdenOner}
          onClick={() => setWebdenOner((v) => !v)}
          className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none"
          style={{ background: webdenOner ? "var(--color-gold)" : "var(--color-border)" }}
        >
          <span
            className="h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out"
            style={{ transform: webdenOner ? "translateX(20px)" : "translateX(0px)" }}
          />
        </button>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isLoading}
        className="w-full py-3.5 rounded-2xl bg-gold-gradient text-black font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <span className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
            {t("web.outfits.preparing")}
          </>
        ) : (
          <><Sparkles className="h-4 w-4" /> {t("outfit_generator.create_outfit")}</>
        )}
      </button>

      {/* Hint */}
      <div className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: SBG, border: BDR }}>
        <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: IBG }}>
          <Lightbulb className="h-3.5 w-3.5 text-gold" />
        </div>
        <p className="text-[12px] text-muted leading-relaxed">
          {t("outfit_generator.select_condition")}
        </p>
      </div>
    </div>
  );
}
