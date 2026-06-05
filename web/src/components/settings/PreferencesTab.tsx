"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Sun, Plane, CalendarDays, Building2, Bell, Sparkles } from "lucide-react";
import { preferencesSchema, type PreferencesFormData } from "@/lib/validations/settings";
import { useUpdatePreferences } from "@/lib/hooks/useUsers";
import { useThemeStore } from "@/lib/store/themeStore";
import { getErrorMessage } from "@/lib/utils/errors";
import type { UserProfile } from "@/types";

const SBG = "#161614";
const BDR = "1px solid #1E1E18";
const GBD = "1px solid var(--color-gold)";
const IBG = "rgba(201,168,76,0.12)";
const ABD = "1px solid rgba(201,168,76,0.25)";

interface PreferencesTabProps { profile: UserProfile; }

const LANGUAGES = [
  { value: "tr", label: "Türkçe", flag: "🇹🇷" },
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "de", label: "Deutsch", flag: "🇩🇪" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
] as const;

const NOTIF_ITEMS = [
  {
    key: "dailyWeatherAI" as const,
    Icon: Sun,
    label: "Hava Durumu & Kombin",
    desc: "Her sabah 08:00'de dolabına göre AI kombin önerisi",
    badge: "AI",
  },
  {
    key: "travelReminders" as const,
    Icon: Plane,
    label: "Seyahat Hatırlatıcıları",
    desc: "Yarınki seyahatin için bavulunu kontrol et",
    badge: null,
  },
  {
    key: "weeklyStyle" as const,
    Icon: CalendarDays,
    label: "Haftalık Stil Özeti",
    desc: "Her Pazar 10:00'da haftanı planla",
    badge: null,
  },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative h-6 w-11 rounded-full transition-colors flex-shrink-0"
      style={{ background: checked ? "var(--color-gold)" : "#2A2A22" }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? "translateX(20px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted mb-3">{children}</p>;
}

export function PreferencesTab({ profile }: PreferencesTabProps) {
  const { setTheme } = useThemeStore();
  const [saved, setSaved] = useState(false);
  const updatePrefs = useUpdatePreferences(() => setSaved(true));

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<PreferencesFormData>({
      resolver: zodResolver(preferencesSchema),
      defaultValues: {
        defaultCity: profile.defaultCity ?? "Istanbul",
        theme: profile.theme ?? "dark",
        language: profile.language ?? "tr",
        dailyWeatherAI: profile.notificationPreferences?.dailyWeatherAI ?? true,
        travelReminders: profile.notificationPreferences?.travelReminders ?? true,
        weeklyStyle: profile.notificationPreferences?.weeklyStyle ?? true,
      },
    });

  const currentTheme = watch("theme");
  const currentLang  = watch("language");

  const onSubmit = (data: PreferencesFormData) => {
    setSaved(false);
    setTheme(data.theme);
    updatePrefs.mutate({
      defaultCity: data.defaultCity, theme: data.theme, language: data.language,
      dailyWeatherAI: data.dailyWeatherAI, travelReminders: data.travelReminders, weeklyStyle: data.weeklyStyle,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">

      {/* Notification Engine banner */}
      <div className="rounded-xl p-4 flex items-start gap-4" style={{ background: IBG, border: ABD }}>
        <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(201,168,76,0.2)" }}>
          <Bell className="h-5 w-5 text-gold" />
        </div>
        <div>
          <p className="text-sm font-bold text-text">AI Bildirim Motoru</p>
          <p className="text-[12px] text-muted leading-relaxed mt-0.5">
            Gerçek dolabın ve hava durumuna göre kişiselleştirilmiş öneriler alırsın.
          </p>
        </div>
      </div>

      {/* Bildirim türleri */}
      <div>
        <SectionLabel>BİLDİRİM TÜRLERİ</SectionLabel>
        <div className="space-y-2">
          {NOTIF_ITEMS.map(({ key, Icon, label, desc, badge }) => (
            <div key={key} className="flex items-center gap-4 rounded-xl p-4" style={{ background: SBG, border: BDR }}>
              <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: IBG }}>
                <Icon className="h-4 w-4 text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-text">{label}</p>
                  {badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-black" style={{ background: "var(--color-gold)" }}>
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted leading-relaxed mt-0.5">{desc}</p>
              </div>
              <Toggle checked={watch(key)} onChange={(v) => setValue(key, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* Hava durumu şehri */}
      <div>
        <SectionLabel>HAVA DURUMU ŞEHRİ</SectionLabel>
        <div className="flex items-center gap-3 rounded-xl p-3 pr-3" style={{ background: SBG, border: BDR }}>
          <Building2 className="h-4 w-4 text-muted flex-shrink-0" />
          <input
            placeholder="Istanbul"
            {...register("defaultCity")}
            className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-gold-gradient text-black text-xs font-bold hover:opacity-90 transition-opacity flex-shrink-0"
          >
            Kaydet
          </button>
        </div>
        {errors.defaultCity && (
          <p className="text-[11px] text-danger mt-1">{errors.defaultCity.message}</p>
        )}
        <p className="text-[11px] text-muted mt-2">Sabah hava durumu bildirimleri bu şehre göre gönderilir.</p>
      </div>

      {/* Tema */}
      <div>
        <SectionLabel>GÖRÜNÜM</SectionLabel>
        <div className="flex gap-2">
          {(["dark","light"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setValue("theme", t)}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-all"
              style={
                currentTheme === t
                  ? { background: IBG, border: GBD, color: "var(--color-gold)" }
                  : { background: SBG, border: BDR, color: "var(--color-muted)" }
              }
            >
              {t === "dark" ? "🌙 Karanlık" : "☀️ Açık"}
            </button>
          ))}
        </div>
      </div>

      {/* Dil */}
      <div>
        <SectionLabel>DİL</SectionLabel>
        <div className="space-y-2">
          {LANGUAGES.map((lang) => {
            const active = currentLang === lang.value;
            return (
              <button
                key={lang.value}
                type="button"
                onClick={() => setValue("language", lang.value)}
                className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all"
                style={{ background: SBG, border: active ? GBD : BDR }}
              >
                <span className="text-lg flex-shrink-0">{lang.flag}</span>
                <span className="text-sm font-medium" style={{ color: active ? "var(--color-gold)" : "var(--color-text)" }}>
                  {lang.label}
                </span>
                {active && (
                  <span className="ml-auto text-gold">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {updatePrefs.isError && (
        <p className="text-sm text-danger">{getErrorMessage(updatePrefs.error)}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={updatePrefs.isPending}
          className="px-6 py-2.5 rounded-xl bg-gold-gradient text-black font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {updatePrefs.isPending ? "Kaydediliyor…" : "Tercihleri Kaydet"}
        </button>
        {saved && !updatePrefs.isPending && (
          <div className="flex items-center gap-1.5 text-success text-sm">
            <CheckCircle className="h-4 w-4" /> Kaydedildi
          </div>
        )}
      </div>
    </form>
  );
}
