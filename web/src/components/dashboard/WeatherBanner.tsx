"use client";

import { Thermometer, Droplets, Wind, MapPin, Sparkles } from "lucide-react";
import { useWeather } from "@/lib/hooks/useWeather";

function resolveIcon(durum: string): string {
  const d = durum.toLowerCase();
  if (d.includes("açık") || d.includes("güneşli")) return "☀️";
  if (d.includes("parçalı")) return "⛅";
  if (d.includes("bulutlu"))  return "☁️";
  if (d.includes("sağanak") || d.includes("yağmurlu")) return "🌧️";
  if (d.includes("karlı"))   return "❄️";
  if (d.includes("sisli"))   return "🌫️";
  if (d.includes("fırtınalı")) return "⛈️";
  if (d.includes("rüzgarlı")) return "💨";
  return "🌡️";
}

function getStyleNudge(temp: number): string {
  if (temp >= 30) return "Hafif kumaşlar ideal — keten ve pamuk tercih et.";
  if (temp >= 24) return "Tişört ve şort günü. Akşam için ince bir hırka al.";
  if (temp >= 18) return "Jean ve hafif üst harika. Gerekirse katmanlı giy.";
  if (temp >= 12) return "Ceket veya blazer zamanı. Üstünü katmanla.";
  if (temp >= 6)  return "Mont hava. Atkı ve bere ihmal etme.";
  return "Kalın mont, bot ve örgü kıyafetler şart.";
}

const S   = "var(--color-bg)";
const C   = "var(--color-surface)";
const B   = "1px solid var(--color-border)";
const IA  = "var(--color-gold-dim)";
const GLOW = "radial-gradient(circle at top right, var(--color-gold-dim) 0%, transparent 65%)";

export function WeatherBanner() {
  const { weather, isLoading } = useWeather();

  if (isLoading) {
    return (
      <div className="rounded-[20px] overflow-hidden" style={{ background: S, border: B }}>
        <div className="p-5">
          <div className="skeleton h-5 w-32 rounded mb-4" />
          <div className="skeleton h-14 w-24 rounded mb-5" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1,2,3,4].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const icon = resolveIcon(weather.durum);
  const city = weather.konum ?? weather.sehir ?? "—";

  const details = [
    { Icon: Thermometer, label: "Hissedilen", value: `${weather.hissedilen}°` },
    { Icon: Droplets,    label: "Nem",        value: `%${weather.nem}` },
    { Icon: Wind,        label: "Rüzgar",     value: "—" },
    { Icon: MapPin,      label: "Konum",      value: city },
  ];

  return (
    <div className="rounded-[20px] overflow-hidden relative" style={{ background: S, border: B }}>
      {/* Ambient gold glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 right-0 w-80 h-60 rounded-full"
        style={{ background: GLOW }}
      />

      <div className="relative p-5">
        {/* Top section: icon + condition + big temperature */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-4">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: IA }}
            >
              {icon}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "var(--color-muted)" }}>
                {city}
              </p>
              <p className="text-base font-semibold text-text capitalize">{weather.durum}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[52px] font-black text-text leading-none tracking-tighter">
              {weather.sicaklik}°
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mb-5" style={{ background: "var(--color-border)" }} />

        {/* Details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {details.map(({ Icon, label, value }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-xl p-3"
              style={{ background: C }}
            >
              <div
                className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: IA }}
              >
                <Icon className="h-3.5 w-3.5 text-gold" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider leading-none mb-1" style={{ color: "var(--color-muted)" }}>
                  {label}
                </p>
                <p className="text-[13px] font-semibold text-text truncate leading-none">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Style nudge */}
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: C, border: B }}
        >
          <Sparkles className="h-3.5 w-3.5 text-gold flex-shrink-0" />
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
            {getStyleNudge(weather.sicaklik)}
          </p>
        </div>
      </div>
    </div>
  );
}
