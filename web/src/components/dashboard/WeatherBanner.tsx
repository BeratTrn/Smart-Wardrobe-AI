"use client";

import { cn } from "@/lib/utils/cn";
import { useWeather } from "@/lib/hooks/useWeather";
import { MapPin, Thermometer, Droplets, Wind } from "lucide-react";

// ── Weather icon mapping (OWM icon codes or condition strings) ────────

function WeatherEmoji({ durum }: { durum: string }) {
  const d = durum.toLowerCase();
  if (d.includes("thunderstorm") || d.includes("fırtına")) return <>&#9928;</>;
  if (d.includes("drizzle") || d.includes("çisele"))       return <>&#127746;</>;
  if (d.includes("rain") || d.includes("yağmur"))          return <>&#127783;</>;
  if (d.includes("snow") || d.includes("kar"))             return <>&#10052;</>;
  if (d.includes("fog") || d.includes("sis") || d.includes("mist")) return <>&#127787;</>;
  if (d.includes("cloud") || d.includes("bulut"))          return <>&#9925;</>;
  if (d.includes("clear") || d.includes("açık"))           return <>&#9728;</>;
  return <>&#127754;</>;
}

// ── Outfit nudge based on temperature ────────────────────────────────

function getOutfitNudge(temp: number): string {
  if (temp <= 0)  return "Bundle up — reach for your heaviest coat and layered knits.";
  if (temp <= 8)  return "Cold out — a warm coat and scarf will serve you well today.";
  if (temp <= 14) return "Chilly — light jacket weather. Perfect for a layered look.";
  if (temp <= 19) return "Mild day — a smart casual outfit with a light cardigan is ideal.";
  if (temp <= 24) return "Comfortable — great for your favourite everyday pieces.";
  if (temp <= 29) return "Warm day — lightweight fabrics and breathable styles recommended.";
  return "Hot outside — keep it light, breezy, and minimal today.";
}

// ── Component ─────────────────────────────────────────────────────────

export function WeatherBanner() {
  const { weather, isLoading, isError } = useWeather();

  if (isError) return null; // Fail silently — dashboard works without weather

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border",
        "bg-card shadow-card",
        "flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 px-6 py-5"
      )}
    >
      {/* Decorative gold orb */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 w-48 h-48 rounded-full opacity-[0.06]"
        style={{
          background: "radial-gradient(circle, var(--color-gold) 0%, transparent 70%)",
        }}
      />

      {isLoading ? (
        /* Skeleton */
        <div className="flex items-center gap-5 w-full">
          <div className="w-14 h-14 skeleton rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 skeleton rounded" />
            <div className="h-3 w-64 skeleton rounded" />
          </div>
          <div className="hidden sm:flex gap-4">
            {[48, 56, 40].map((w, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-8 skeleton rounded" />
                <div className={cn("h-5 skeleton rounded", `w-${w > 48 ? "14" : "12"}`)} />
              </div>
            ))}
          </div>
        </div>
      ) : weather ? (
        <>
          {/* Big weather emoji */}
          <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 text-3xl">
            <WeatherEmoji durum={weather.durum} />
          </div>

          {/* Location + nudge */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <MapPin size={11} className="text-muted shrink-0" />
              <p className="text-xs text-muted font-medium truncate">{weather.konum}</p>
            </div>
            <p className="text-sm text-text font-medium leading-snug">
              {getOutfitNudge(weather.sicaklik)}
            </p>
          </div>

          {/* Stat chips */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Temperature */}
            <div className="text-center">
              <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5 flex items-center gap-1">
                <Thermometer size={9} />Now
              </p>
              <p className="text-2xl font-bold text-text leading-none">
                {Math.round(weather.sicaklik)}
                <span className="text-sm font-medium text-muted">°C</span>
              </p>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-border" />

            {/* Feels like */}
            {weather.hissedilen !== undefined && (
              <div className="text-center hidden sm:block">
                <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">
                  Feels
                </p>
                <p className="text-base font-semibold text-text-sub leading-none">
                  {Math.round(weather.hissedilen)}°
                </p>
              </div>
            )}

            {/* Humidity */}
            {weather.nem !== undefined && (
              <div className="text-center hidden sm:block">
                <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5 flex items-center gap-1 justify-center">
                  <Droplets size={9} />Hum
                </p>
                <p className="text-base font-semibold text-text-sub leading-none">
                  {weather.nem}%
                </p>
              </div>
            )}

            {/* Condition label */}
            <div className="text-center hidden md:block">
              <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5 flex items-center gap-1 justify-center">
                <Wind size={9} />Sky
              </p>
              <p className="text-xs font-semibold text-text-sub leading-none capitalize max-w-[72px] truncate">
                {weather.durum}
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
