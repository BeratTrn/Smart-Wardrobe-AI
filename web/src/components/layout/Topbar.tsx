"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, Sun, Moon, Cloud, CloudRain, Wind, Droplets, Thermometer, MapPin, X } from "lucide-react";
import { useUIStore } from "@/lib/store/uiStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useThemeStore } from "@/lib/store/themeStore";
import { useProfile } from "@/lib/hooks/useUsers";
import { useWeather } from "@/lib/hooks/useWeather";

function getWeatherIcon(durum: string) {
  const d = durum?.toLowerCase() || "";
  if (d.includes("güneş") || d.includes("açık") || d.includes("sıcak")) return <Sun className="w-4 h-4 text-yellow-400" />;
  if (d.includes("yağmur") || d.includes("sağanak")) return <CloudRain className="w-4 h-4 text-blue-400" />;
  return <Cloud className="w-4 h-4 text-gray-400" />;
}

export function Topbar() {
  const { openMobileSidebar } = useUIStore();
  const { user } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const { data } = useProfile();
  
  const [weatherModalOpen, setWeatherModalOpen] = useState(false);
  const { weather, isLoading: weatherLoading } = useWeather();

  const displayName = user?.kullaniciAdi ?? user?.ad ?? "Kullanıcı";
  // Only use the photo if it's a valid absolute URL (backend sometimes returns relative paths)
  const rawPhoto = data?.kullanici?.profilFoto ?? null;
  const profilePhoto =
    rawPhoto && (rawPhoto.startsWith("http://") || rawPhoto.startsWith("https://"))
      ? rawPhoto
      : null;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header
      className="flex h-[72px] flex-shrink-0 items-center gap-4 px-5 md:px-7 border-b"
      style={{ background: "#0D0D0D", borderColor: "#1A1A15" }}
    >
      {/* Mobile hamburger */}
      <button
        className="lg:hidden p-2 rounded-xl text-muted hover:text-text hover:bg-white/5 transition-colors"
        onClick={openMobileSidebar}
        aria-label="Menüyü aç"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Greeting */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted leading-none mb-0.5 font-medium">Merhaba,</p>
        <p className="text-[15px] font-bold text-text leading-none truncate">{displayName}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Weather Badge */}
        {!weatherLoading && weather && (
          <button
            onClick={() => setWeatherModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 hover:bg-white/5 mr-1"
            style={{ background: "#1A1A16", border: "1px solid rgba(201,168,76,0.2)" }}
            title="Hava Durumu Detayları"
          >
            {getWeatherIcon(weather.durum)}
            <span className="text-[13px] font-bold text-text">{Math.round(weather.sicaklik)}° <span className="hidden sm:inline font-medium opacity-80">{weather.durum}</span></span>
          </button>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="h-9 w-9 rounded-xl flex items-center justify-center text-muted hover:text-gold hover:bg-gold/10 transition-all duration-200"
          title={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Avatar */}
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-2xl pl-1 pr-3 py-1.5 hover:bg-white/5 transition-colors group"
        >
          <div
            className="h-9 w-9 rounded-full overflow-hidden flex items-center justify-center text-[13px] font-bold text-black flex-shrink-0 ring-2 ring-gold/25 group-hover:ring-gold/50 transition-all"
            style={{
              background: profilePhoto
                ? "transparent"
                : "linear-gradient(135deg, #C9A84C 0%, #E8C97A 100%)",
            }}
          >
            {profilePhoto ? (
              <Image
                src={profilePhoto}
                alt={displayName}
                width={36}
                height={36}
                className="object-cover w-full h-full"
              />
            ) : (
              initials
            )}
          </div>
          <span className="hidden sm:block text-[13px] font-semibold text-text">
            {displayName}
          </span>
        </Link>
      </div>

      {/* Weather Modal */}
      {weatherModalOpen && weather && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
          onClick={() => setWeatherModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-sm rounded-[24px] p-6 animate-in fade-in zoom-in-95 duration-200 shadow-2xl"
            style={{ background: "#1A1A16", border: "1px solid rgba(201,168,76,0.28)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header: Close button */}
            <div className="absolute top-4 right-4 flex items-center justify-center">
              <button 
                onClick={() => setWeatherModalOpen(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: "#222218", color: "#888" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Main Info */}
            <div className="flex flex-col items-center mt-2 mb-8">
              <div className="h-16 w-16 mb-4 flex items-center justify-center rounded-2xl" style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.28)" }}>
                {React.cloneElement(getWeatherIcon(weather.durum) as React.ReactElement, { className: "w-8 h-8", style: { color: "#C9A84C" } })}
              </div>
              <h2 className="text-4xl font-black text-text mb-1">{Math.round(weather.sicaklik)}°</h2>
              <p className="text-lg font-semibold text-muted">{weather.durum}</p>
              <p className="text-sm text-muted mt-1">{weather.konum || weather.sehir}</p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl" style={{ background: "#141412", border: "1px solid #222218" }}>
                <Thermometer className="h-5 w-5 mb-2" style={{ color: "#C9A84C" }} />
                <span className="text-xs text-muted font-medium mb-1">Hissedilen</span>
                <span className="text-sm font-bold text-text">{Math.round(weather.hissedilen)}°</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl" style={{ background: "#141412", border: "1px solid #222218" }}>
                <Droplets className="h-5 w-5 mb-2" style={{ color: "#C9A84C" }} />
                <span className="text-xs text-muted font-medium mb-1">Nem</span>
                <span className="text-sm font-bold text-text">%{weather.nem}</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl" style={{ background: "#141412", border: "1px solid #222218" }}>
                <Wind className="h-5 w-5 mb-2" style={{ color: "#C9A84C" }} />
                <span className="text-xs text-muted font-medium mb-1">Rüzgar</span>
                <span className="text-sm font-bold text-text">{weather.ruzgar || 0} km/h</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl" style={{ background: "#141412", border: "1px solid #222218" }}>
                <MapPin className="h-5 w-5 mb-2" style={{ color: "#C9A84C" }} />
                <span className="text-xs text-muted font-medium mb-1">Konum</span>
                <span className="text-sm font-bold text-text truncate w-full text-center">{weather.konum || weather.sehir || "Bilinmiyor"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
