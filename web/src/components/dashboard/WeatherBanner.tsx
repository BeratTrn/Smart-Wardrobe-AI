"use client";

import { useWeather } from "@/lib/hooks/useWeather";

const WeatherEmoji: Record<string, string> = {
  "açık": "☀️", "güneşli": "☀️", "parçalı bulutlu": "⛅", "bulutlu": "☁️",
  "kapalı": "☁️", "yağmurlu": "🌧️", "sağanak": "🌧️", "karlı": "❄️",
  "sisli": "🌫️", "fırtınalı": "⛈️", "rüzgarlı": "💨",
};

function getOutfitNudge(temp: number): string {
  if (temp >= 30) return "Light fabrics only — linen, cotton. Stay cool.";
  if (temp >= 24) return "A tee and shorts day. Maybe a light cardigan for evening.";
  if (temp >= 18) return "Jeans and a light top, or a midi dress. Layer if needed.";
  if (temp >= 12) return "Layer up — a jacket or blazer over a shirt works well.";
  if (temp >= 6)  return "Coat weather. Don't forget a scarf.";
  if (temp >= 0)  return "Heavy coat, boots, and knits. Stay warm.";
  return "Bundle up — this is serious cold.";
}

export function WeatherBanner() {
  const { weather, isLoading } = useWeather();

  if (isLoading) {
    return <div className="glass rounded-2xl h-20 skeleton" />;
  }
  if (!weather) return null;

  const emoji = Object.entries(WeatherEmoji).find(([k]) =>
    weather.durum.toLowerCase().includes(k)
  )?.[1] ?? "🌡️";

  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-5 relative overflow-hidden">
      <div className="absolute right-0 top-0 h-full w-32 bg-[radial-gradient(ellipse_at_right,var(--color-gold)/8%,transparent_70%)] pointer-events-none" />
      <div className="text-4xl flex-shrink-0">{emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold">{weather.sicaklik}°C</span>
          <span className="text-sm text-muted capitalize">{weather.durum}</span>
          <span className="text-[12px] text-muted hidden sm:inline">
            Feels {weather.hissedilen}°C · {weather.nem}% humidity
          </span>
        </div>
        <p className="text-[12px] text-muted mt-0.5 flex items-center gap-1">
          <span>📍</span>
          <span className="truncate">{weather.konum ?? weather.sehir}</span>
        </p>
      </div>
      <div className="hidden md:block text-right flex-shrink-0 max-w-[220px]">
        <p className="text-[12px] text-muted leading-relaxed">{getOutfitNudge(weather.sicaklik)}</p>
      </div>
    </div>
  );
}
