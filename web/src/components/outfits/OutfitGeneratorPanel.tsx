"use client";

import { useState } from "react";
import { Sparkles, Lightbulb } from "lucide-react";
import type { Season, OutfitGeneratePayload, WeatherData } from "@/types";

const EVENTS   = ["Günlük","İş","Parti","Spor","Romantik","Seyahat"];
const WEATHER_FEELS = ["Sıcak","Ilık","Serin","Soğuk"];
const STYLES   = ["Günlük","Klasik","Spor","Sokak","Minimal","Şık","Resmi"];

const WEATHER_TO_SEASON: Record<string, Season> = {
  "Sıcak": "Yaz",
  "Ilık":  "İlkbahar",
  "Serin": "Sonbahar",
  "Soğuk": "Kış",
};

const BG  = "#111110";
const SBG = "#161614";
const BDR = "1px solid #1E1E18";
const ABD = "1px solid rgba(201,168,76,0.25)";
const IBG = "rgba(201,168,76,0.12)";

interface OutfitGeneratorPanelProps {
  onGenerate: (payload: OutfitGeneratePayload) => void;
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
  const [event,   setEvent]   = useState("Günlük");
  const [hava,    setHava]    = useState("Ilık");
  const [stil,    setStil]    = useState("Günlük");
  const [useCurrentWeather, setUseCurrentWeather] = useState(!!weather);

  const handleGenerate = () => {
    const payload: OutfitGeneratePayload = {};
    payload.etkinlik = event;
    payload.mevsim   = WEATHER_TO_SEASON[hava];
    if (useCurrentWeather && weather) payload.havaDurumu = weather;
    onGenerate(payload);
  };

  return (
    <div className="rounded-2xl p-6 space-y-6" style={{ background: BG, border: BDR }}>
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted mb-1">KOMBİN</p>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-black text-text leading-tight">AI Kombin Üretici</h2>
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
        <SectionLabel>DURUM</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {EVENTS.map((ev) => (
            <PillBtn key={ev} label={ev} active={event === ev} onClick={() => setEvent(ev)} />
          ))}
        </div>
      </div>

      {/* HAVA */}
      <div>
        <SectionLabel>HAVA</SectionLabel>
        {weather && (
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => setUseCurrentWeather((v) => !v)}
              className="relative h-5 w-9 rounded-full transition-colors flex-shrink-0"
              style={{ background: useCurrentWeather ? "var(--color-gold)" : "#2A2A22" }}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                style={{ transform: useCurrentWeather ? "translateX(16px)" : "translateX(2px)" }}
              />
            </button>
            <span className="text-[12px] text-muted">
              Şu anki hava: {weather.sehir}, {weather.sicaklik}°C
            </span>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {WEATHER_FEELS.map((h) => (
            <PillBtn key={h} label={h} active={hava === h} onClick={() => setHava(h)} />
          ))}
        </div>
      </div>

      {/* STİL */}
      <div>
        <SectionLabel>STİL</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <PillBtn key={s} label={s} active={stil === s} onClick={() => setStil(s)} />
          ))}
        </div>
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
            Kombinler hazırlanıyor…
          </>
        ) : (
          <><Sparkles className="h-4 w-4" /> Kombin Oluştur</>
        )}
      </button>

      {/* Hint */}
      <div className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: SBG, border: BDR }}>
        <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: IBG }}>
          <Lightbulb className="h-3.5 w-3.5 text-gold" />
        </div>
        <p className="text-[12px] text-muted leading-relaxed">
          Durum, hava ve stilini seç — AI dolabından senin için en uygun kombinleri seçsin.
        </p>
      </div>
    </div>
  );
}
