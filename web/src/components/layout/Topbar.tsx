"use client";

import { useProfile, useUpdatePreferences } from "@/lib/hooks/useUsers";
import { useWeather } from "@/lib/hooks/useWeather";
import { useAuthStore } from "@/lib/store/authStore";
import { useThemeStore } from "@/lib/store/themeStore";
import { useLanguageStore } from "@/lib/store/languageStore";
import { useUIStore } from "@/lib/store/uiStore";
import { useT } from "@/lib/i18n";
import { Cloud, CloudRain, Droplets, MapPin, Menu, Moon, Sun, Thermometer, Wind, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

function getWeatherIcon(durum: string) {
  const d = durum?.toLowerCase() || "";
  if (d.includes("güneş") || d.includes("açık") || d.includes("sıcak")) return <Sun className="w-4 h-4 text-yellow-400" />;
  if (d.includes("yağmur") || d.includes("sağanak")) return <CloudRain className="w-4 h-4 text-blue-400" />;
  return <Cloud className="w-4 h-4 text-gray-400" />;
}

export function Topbar() {
  const { openMobileSidebar } = useUIStore();
  const { user } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { setLanguage } = useLanguageStore();
  const { t } = useT();
  const { data } = useProfile();
  const updatePrefs = useUpdatePreferences();

  const [weatherModalOpen, setWeatherModalOpen] = useState(false);
  const { weather, isLoading: weatherLoading } = useWeather();

  // Sunucuda kayıtlı son tema ve dil tercihini uygula (cihazlar arası senkron).
  const prefsSynced = useRef(false);
  useEffect(() => {
    const savedTheme = data?.kullanici?.theme;
    const savedLang = data?.kullanici?.language;
    if (!prefsSynced.current && (savedTheme || savedLang)) {
      prefsSynced.current = true;
      if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
      if (savedLang === "tr" || savedLang === "en" || savedLang === "de" || savedLang === "fr") setLanguage(savedLang);
    }
  }, [data?.kullanici?.theme, data?.kullanici?.language, setTheme, setLanguage]);

  const handleThemeToggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    updatePrefs.mutate({ theme: next });
  };

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
      style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      {/* Mobile hamburger */}
      <button
        className="lg:hidden p-2 rounded-xl text-muted hover:text-text hover:bg-white/5 transition-colors"
        onClick={openMobileSidebar}
        aria-label={t("web.topbar.menu_aria")}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Greeting */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted leading-none mb-0.5 font-medium">{t("home.greeting")}</p>
        <p className="text-[15px] font-bold text-text leading-none truncate">{displayName}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Weather Badge */}
        {!weatherLoading && weather && (
          <button
            onClick={() => setWeatherModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 hover:bg-white/5 mr-1"
            style={{ background: "var(--color-card)", border: "1px solid var(--color-gold-dim)"}}
            title={t("web.topbar.weather_details")}
          >
            {getWeatherIcon(weather.durum)}
            <span className="text-[13px] font-bold text-text">{Math.round(weather.sicaklik)}° <span className="hidden sm:inline font-medium opacity-80">{weather.durum}</span></span>
          </button>
        )}

        {/* Theme toggle */}
        <button
          onClick={handleThemeToggle}
          className="h-9 w-9 rounded-xl flex items-center justify-center text-muted hover:text-gold hover:bg-gold/10 transition-all duration-200"
          title={theme === "dark" ? t("web.topbar.switch_to_light") : t("web.topbar.switch_to_dark")}
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
                : "linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-light) 100%)",
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
          style={{ background: "var(--color-overlay)", backdropFilter: "blur(6px)" }}
          onClick={() => setWeatherModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-sm rounded-[24px] p-6 animate-in fade-in zoom-in-95 duration-200 shadow-2xl"
            style={{ background: "var(--color-card)", border: "1px solid var(--color-gold-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header: Close button */}
            <div className="absolute top-4 right-4 flex items-center justify-center">
              <button 
                onClick={() => setWeatherModalOpen(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: "var(--color-bg)", color: "var(--color-muted)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Main Info */}
            <div className="flex flex-col items-center mt-2 mb-8">
              <div className="h-16 w-16 mb-4 flex items-center justify-center rounded-2xl" style={{ background: "var(--color-gold-dim)", border: "1px solid var(--color-gold-border)" }}>
                {React.cloneElement(getWeatherIcon(weather.durum) as React.ReactElement<React.SVGProps<SVGSVGElement>>, { className: "w-8 h-8", style: { color: "var(--color-gold)" }})}
              </div>
              <h2 className="text-4xl font-black text-text mb-1">{Math.round(weather.sicaklik)}°</h2>
              <p className="text-lg font-semibold text-muted">{weather.durum}</p>
              <p className="text-sm text-muted mt-1">{weather.konum || weather.sehir}</p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)"}}>
                <Thermometer className="h-5 w-5 mb-2" style={{ color: "var(--color-gold)" }} />
                <span className="text-xs text-muted font-medium mb-1">{t("home.feels_like")}</span>
                <span className="text-sm font-bold text-text">{Math.round(weather.hissedilen)}°</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)"}}>
                <Droplets className="h-5 w-5 mb-2" style={{ color: "var(--color-gold)" }} />
                <span className="text-xs text-muted font-medium mb-1">{t("home.humidity")}</span>
                <span className="text-sm font-bold text-text">%{weather.nem}</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)"}}>
                <Wind className="h-5 w-5 mb-2" style={{ color: "var(--color-gold)" }} />
                <span className="text-xs text-muted font-medium mb-1">{t("home.wind")}</span>
                <span className="text-sm font-bold text-text">{weather.ruzgar || 0} km/h</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                <MapPin className="h-5 w-5 mb-2" style={{ color: "var(--color-gold)" }} />
                <span className="text-xs text-muted font-medium mb-1">{t("home.location")}</span>
                <span className="text-sm font-bold text-text truncate w-full text-center">{weather.konum || weather.sehir || t("web.topbar.unknown_location")}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
