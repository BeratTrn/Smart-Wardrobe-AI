"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Season, OutfitGeneratePayload, WeatherData } from "@/types";

const SEASONS: Season[] = ["Yaz", "Kış", "İlkbahar", "Sonbahar", "Tüm Mevsimler"];
const EVENTS = ["Günlük", "İş", "Spor", "Özel Gün", "Gece Dışarı", "Piknik"];

interface OutfitGeneratorPanelProps {
  onGenerate: (payload: OutfitGeneratePayload) => void;
  isLoading: boolean;
  weather?: WeatherData | null;
}

export function OutfitGeneratorPanel({
  onGenerate,
  isLoading,
  weather,
}: OutfitGeneratorPanelProps) {
  const [season, setSeason] = useState<Season | "">("");
  const [event, setEvent] = useState("");
  const [useWeather, setUseWeather] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: OutfitGeneratePayload = {};
    if (season) payload.mevsim = season;
    if (event) payload.etkinlik = event;
    if (useWeather && weather) payload.havaDurumu = weather;
    onGenerate(payload);
  };

  return (
    <div className="glass rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-gold" />
        <h2 className="font-semibold">Generate Outfit</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Season */}
        <div>
          <label className="text-[12px] text-muted mb-2 block">Season (optional)</label>
          <div className="flex flex-wrap gap-2">
            {SEASONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeason(season === s ? "" : s)}
                className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
                  season === s
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-border text-muted hover:border-gold/40"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Event */}
        <div>
          <label className="text-[12px] text-muted mb-2 block">Event (optional)</label>
          <div className="flex flex-wrap gap-2">
            {EVENTS.map((ev) => (
              <button
                key={ev}
                type="button"
                onClick={() => setEvent(event === ev ? "" : ev)}
                className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
                  event === ev
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-border text-muted hover:border-gold/40"
                }`}
              >
                {ev}
              </button>
            ))}
          </div>
        </div>

        {/* Weather toggle */}
        {weather && (
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              role="checkbox"
              aria-checked={useWeather}
              onClick={() => setUseWeather((v) => !v)}
              className={`h-5 w-9 rounded-full transition-colors relative ${
                useWeather ? "bg-gold" : "bg-white/10"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  useWeather ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </div>
            <span className="text-[13px] text-muted">
              Use current weather ({weather.sehir}, {weather.sicaklik}°C)
            </span>
          </label>
        )}

        <Button type="submit" fullWidth loading={isLoading} className="mt-2">
          {isLoading ? "Claude is styling you..." : "Generate outfit"}
        </Button>
      </form>
    </div>
  );
}
