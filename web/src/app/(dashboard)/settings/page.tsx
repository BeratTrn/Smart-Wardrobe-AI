"use client";

import Image from "next/image";
import { useState, useCallback, useRef } from "react";
import {
  Camera, Loader2, ChevronRight, X,
  Settings, Activity, Bell, Shield,
  Sun, Moon, Globe, Sparkles,
  Plane, CalendarDays, Building2,
  ShieldCheck, FileText, HelpCircle, Info, LogOut, Trash2,
  Check, CheckCircle, AlertTriangle, User, Mail, Package,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useProfile, useUploadProfilePhoto, useUpdateProfile,
  useUpdatePreferences, useUpdateBodyProfile,
  useChangePassword, useDeleteAccount,
} from "@/lib/hooks/useUsers";
import { useWardrobeStats } from "@/lib/hooks/useStats";
import { useThemeStore } from "@/lib/store/themeStore";
import { profileSchema, preferencesSchema, changePasswordSchema } from "@/lib/validations/settings";
import type { ProfileFormData, PreferencesFormData, ChangePasswordFormData } from "@/lib/validations/settings";
import type { BodyShape, FitPreference, UserProfile } from "@/types";
import { getErrorMessage } from "@/lib/utils/errors";
import { cn } from "@/lib/utils/cn";

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG   = "#0E0E0C";
const S1   = "#141412";
const S2   = "#1A1A16";
const BDR  = "#222218";
const GOLD = "#C9A84C";
const GL   = "#E8C97A";
const IA   = "rgba(201,168,76,0.10)";
const GA   = "rgba(201,168,76,0.28)";

const b  = `1px solid ${BDR}`;
const gb = `1px solid ${GA}`;

// ── Shared helpers ────────────────────────────────────────────────────────────
function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="h-px flex-1" style={{ background: `linear-gradient(to right, ${GOLD}40, transparent)` }} />
      <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: GOLD }}>{children}</p>
      <span className="h-px flex-1" style={{ background: `linear-gradient(to left, ${GOLD}40, transparent)` }} />
    </div>
  );
}

function Row({
  icon: Icon, label, sub, value, danger, onClick, href, badge,
}: {
  icon: React.ElementType; label: string; sub?: string; value?: string;
  danger?: boolean; onClick?: () => void; href?: string; badge?: string;
}) {
  const Tag = href ? "a" : "button";
  const props: Record<string, unknown> = href
    ? { href }
    : { type: "button", onClick };
  return (
    <Tag
      {...props as any}
      className="group w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-200"
      style={{ background: S2, border: b }}
      onMouseEnter={(e: React.MouseEvent<HTMLElement>) => {
        (e.currentTarget as HTMLElement).style.borderColor = danger ? "rgba(239,68,68,0.3)" : GA;
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLElement>) => {
        (e.currentTarget as HTMLElement).style.borderColor = BDR;
      }}
    >
      <div
        className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200"
        style={{ background: danger ? "rgba(239,68,68,0.1)" : IA }}
      >
        <Icon className="h-4 w-4" style={{ color: danger ? "#ef4444" : GOLD }} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[13.5px] font-semibold leading-snug" style={{ color: danger ? "#ef4444" : "var(--color-text)" }}>
          {label}
        </p>
        {sub && <p className="text-[11px] text-muted leading-snug mt-0.5">{sub}</p>}
      </div>
      {badge && (
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded text-black" style={{ background: GOLD }}>
          {badge}
        </span>
      )}
      {value && <span className="text-[13px] font-semibold flex-shrink-0" style={{ color: GOLD }}>{value}</span>}
      <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 opacity-30 group-hover:opacity-70 transition-opacity" style={{ color: danger ? "#ef4444" : GOLD }} />
    </Tag>
  );
}

// ── Avatar Picker Modal ───────────────────────────────────────────────────────
const AVATARS = {
  erkek: [
    "/avatars/erkek_avatar_1.png",
    "/avatars/erkek_avatar_2.png",
    "/avatars/erkek_avatar_3.png",
    "/avatars/erkek_avatar_4.png",
  ],
  kadin: [
    "/avatars/kiz_avatar_1.png",
    "/avatars/kiz_avatar_2.png",
    "/avatars/kiz_avatar_3.png",
    "/avatars/kiz_avatar_4.png",
  ],
};

function AvatarPickerModal({
  open, onClose, currentSrc, onSelect,
}: {
  open: boolean; onClose: () => void;
  currentSrc: string | null;
  onSelect: (file: File) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  const handlePick = async (src: string) => {
    setSelected(src);
    setLoading(true);
    try {
      const res  = await fetch(src);
      const blob = await res.blob();
      const file = new File([blob], src.split("/").pop() ?? "avatar.png", { type: blob.type });
      onSelect(file);
      onClose();
    } catch {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-[24px] p-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
        style={{ background: "#1A1A16", border: gb }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center"
          style={{ background: S2, color: "#666" }}>
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: IA, border: gb }}>
            <Sparkles className="h-4.5 w-4.5" style={{ color: GOLD }} />
          </div>
          <div>
            <p className="text-[15px] font-black text-text">Avatar Seç</p>
            <p className="text-[11px] text-muted">Profil fotoğrafını özelleştir</p>
          </div>
        </div>

        {/* Erkek */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-px flex-1" style={{ background: GA }} />
            <span className="text-[10px] font-bold tracking-[0.2em] text-muted">ERKEK</span>
            <span className="h-px flex-1" style={{ background: GA }} />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {AVATARS.erkek.map((src) => {
              const isSelected = selected === src || (!selected && currentSrc === src);
              return (
                <button key={src} type="button" onClick={() => handlePick(src)} disabled={loading}
                  className="relative rounded-2xl overflow-hidden transition-all duration-200"
                  style={{
                    boxShadow: isSelected ? `0 0 0 2.5px ${GOLD}` : "none",
                    opacity: loading && selected !== src ? 0.5 : 1,
                  }}>
                  <img src={src} alt="avatar" className="w-full aspect-square object-cover rounded-2xl" />
                  {isSelected && (
                    <div className="absolute inset-0 flex items-end justify-end p-1.5 rounded-2xl"
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)" }}>
                      <div className="h-5 w-5 rounded-full flex items-center justify-center"
                        style={{ background: GOLD }}>
                        <Check className="h-3 w-3 text-black" strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Kadın */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="h-px flex-1" style={{ background: GA }} />
            <span className="text-[10px] font-bold tracking-[0.2em] text-muted">KADIN</span>
            <span className="h-px flex-1" style={{ background: GA }} />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {AVATARS.kadin.map((src) => {
              const isSelected = selected === src || (!selected && currentSrc === src);
              return (
                <button key={src} type="button" onClick={() => handlePick(src)} disabled={loading}
                  className="relative rounded-2xl overflow-hidden transition-all duration-200"
                  style={{
                    boxShadow: isSelected ? `0 0 0 2.5px ${GOLD}` : "none",
                    opacity: loading && selected !== src ? 0.5 : 1,
                  }}>
                  <img src={src} alt="avatar" className="w-full aspect-square object-cover rounded-2xl" />
                  {isSelected && (
                    <div className="absolute inset-0 flex items-end justify-end p-1.5 rounded-2xl"
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)" }}>
                      <div className="h-5 w-5 rounded-full flex items-center justify-center"
                        style={{ background: GOLD }}>
                        <Check className="h-3 w-3 text-black" strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: GOLD }} />
            Yükleniyor…
          </div>
        )}
      </div>
    </div>
  );
}

// ── Info Modal ────────────────────────────────────────────────────────────────
function InfoModal({ open, onClose, title, icon: Icon, children }: {
  open: boolean; onClose: () => void;
  title: string; icon: React.ElementType;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-[24px] p-6 animate-in fade-in zoom-in-95 duration-200"
        style={{ background: "#1A1A16", border: gb }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: S2, color: "#666" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#fff"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#666"; }}>
          <X className="h-4 w-4" />
        </button>

        {/* Icon + Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-11 w-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: IA, border: gb }}>
            <Icon className="h-5 w-5" style={{ color: GOLD }} />
          </div>
          <h3 className="text-[17px] font-black text-text">{title}</h3>
        </div>

        <div className="h-px mb-4" style={{ background: BDR }} />

        <div className="space-y-3 text-[13px] text-muted leading-relaxed">
          {children}
        </div>

        <button onClick={onClose}
          className="mt-6 w-full py-3 rounded-2xl text-[14px] font-bold text-black transition-all hover:opacity-90"
          style={{ background: `linear-gradient(135deg, ${GOLD}, ${GL})` }}>
          Tamam
        </button>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="relative h-6 w-11 rounded-full transition-all duration-300 flex-shrink-0 focus:outline-none"
      style={{ background: checked ? `linear-gradient(135deg, ${GOLD}, ${GL})` : "#2A2A22" }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full shadow-md transition-all duration-300"
        style={{
          transform: checked ? "translateX(20px)" : "translateX(2px)",
          background: checked ? "#000" : "#555",
        }}
      />
    </button>
  );
}

function GoldInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</label>
      <input
        {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e as any); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e as any); }}
        className="w-full rounded-xl px-4 py-3 text-[13.5px] font-medium text-text outline-none transition-all duration-200 placeholder:text-muted/50"
        style={{ background: S2, border: focused ? gb : b, boxShadow: focused ? `0 0 0 2px ${GOLD}18` : "none" }}
      />
    </div>
  );
}

// ── TAB SECTIONS ──────────────────────────────────────────────────────────────

// — Profil ——————————————————————————————————————————————
function ProfileSection({ profile }: { profile: UserProfile }) {
  const [saved, setSaved] = useState(false);
  const updateProfile = useUpdateProfile(() => setSaved(true));
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { kullaniciAdi: profile.kullaniciAdi },
  });
  const onSubmit = (data: ProfileFormData) => { setSaved(false); updateProfile.mutate({ kullaniciAdi: data.kullaniciAdi }); };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <SectionHead>Hesap Bilgileri</SectionHead>
      <div className="space-y-2">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: S2, border: b }}>
          <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: IA }}>
            <User className="h-4 w-4" style={{ color: GOLD }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Kullanıcı Adı</p>
            <p className="text-[13.5px] font-semibold text-text mt-0.5">{profile.kullaniciAdi}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: S2, border: b }}>
          <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: IA }}>
            <Globe className="h-4 w-4" style={{ color: GOLD }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">E-Posta</p>
            <p className="text-[13.5px] font-semibold text-text mt-0.5">{profile.email}</p>
          </div>
        </div>
      </div>

      <SectionHead>Profili Düzenle</SectionHead>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <GoldInput label="Kullanıcı Adı" placeholder="ör. fashionlover" {...register("kullaniciAdi")} />
        {errors.kullaniciAdi && <p className="text-[11px] text-red-400">{errors.kullaniciAdi.message}</p>}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">E-Posta</label>
          <input readOnly value={profile.email}
            className="w-full rounded-xl px-4 py-3 text-[13.5px] text-muted cursor-not-allowed outline-none"
            style={{ background: "#111110", border: b }} />
          <p className="text-[11px] text-muted">E-posta adresi değiştirilemez.</p>
        </div>
        {updateProfile.isError && <p className="text-sm text-red-400">{getErrorMessage(updateProfile.error)}</p>}
        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={!isDirty || updateProfile.isPending}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-black transition-all duration-200 disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${GOLD}, ${GL})` }}>
            {updateProfile.isPending ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
          </button>
          {saved && !updateProfile.isPending && (
            <div className="flex items-center gap-1.5 text-green-400 text-sm">
              <CheckCircle className="h-4 w-4" /> Kaydedildi
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

// — Vücut Profili ————————————————————————————————————————
const BODY_SHAPES: { value: BodyShape; label: string; desc: string; num: string }[] = [
  { value: "kum_saati",  label: "Kum Saati",  desc: "Omuz & kalça dengeli, bel belirgin",  num: "01" },
  { value: "armut",      label: "Armut",       desc: "Kalça omuzdan biraz daha geniş",      num: "02" },
  { value: "ters_ucgen", label: "Ters Üçgen",  desc: "Omuz kalçadan daha geniş",            num: "03" },
  { value: "dikdortgen", label: "Dikdörtgen",  desc: "Omuz, bel ve kalça hemen hemen eşit", num: "04" },
];
const FIT_PREFS: { value: FitPreference; label: string; desc: string }[] = [
  { value: "slim",     label: "Slim-fit",  desc: "Vücuda yakın, dar kesim"  },
  { value: "regular",  label: "Regular",   desc: "Standart, dengeli kesim"  },
  { value: "oversize", label: "Oversize",  desc: "Rahat, bol siluet"        },
];

function BodySection({ profile }: { profile: UserProfile }) {
  const [bodyShape,     setBodyShape]     = useState<BodyShape | "">((profile.vucut?.sekil as BodyShape) || "");
  const [fitPreference, setFitPreference] = useState<FitPreference | "">((profile.vucut?.kalip as FitPreference) || "");
  const [saved, setSaved] = useState(false);
  const updateBody = useUpdateBodyProfile(() => setSaved(true));

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5" style={{ background: IA, border: gb }}>
        <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
        <p className="text-[12.5px] leading-relaxed font-medium" style={{ color: GL }}>
          AI stilistiniz bu bilgileri kullanarak vücut tipine özel kombinler önerecek.
        </p>
      </div>

      <SectionHead>Vücut Şekli</SectionHead>
      <p className="text-[12px] text-muted -mt-2">Sana en yakın vücut tipini seç</p>
      <div className="grid grid-cols-2 gap-3">
        {BODY_SHAPES.map((s) => {
          const active = bodyShape === s.value;
          return (
            <button key={s.value} type="button" onClick={() => { setBodyShape(s.value); setSaved(false); }}
              className="relative flex flex-col gap-2.5 rounded-2xl p-4 text-left transition-all duration-200"
              style={{ background: active ? IA : S2, border: active ? gb : b,
                       boxShadow: active ? `0 0 20px ${GOLD}18` : "none" }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black" style={{ color: active ? GOLD : "#444" }}>{s.num}</span>
                <div className="h-5 w-5 rounded-full flex items-center justify-center transition-all"
                  style={{ border: active ? "none" : "2px solid #2A2A22", background: active ? GOLD : "transparent" }}>
                  {active && <Check className="h-3 w-3 text-black" strokeWidth={3} />}
                </div>
              </div>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: active ? GOLD : "var(--color-text)" }}>{s.label}</p>
                <p className="text-[11px] text-muted leading-snug mt-0.5">{s.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      <SectionHead>Kalıp Tercihi</SectionHead>
      <p className="text-[12px] text-muted -mt-2">Nasıl giyinmeyi seversin?</p>
      <div className="space-y-2">
        {FIT_PREFS.map((f) => {
          const active = fitPreference === f.value;
          return (
            <button key={f.value} type="button" onClick={() => { setFitPreference(f.value); setSaved(false); }}
              className="w-full flex items-center gap-4 rounded-2xl px-4 py-3.5 text-left transition-all duration-200"
              style={{ background: active ? IA : S2, border: active ? gb : b,
                       boxShadow: active ? `0 0 16px ${GOLD}14` : "none" }}>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: active ? GOLD : "var(--color-text)" }}>{f.label}</p>
                <p className="text-[11px] text-muted mt-0.5">{f.desc}</p>
              </div>
              <div className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                style={{ border: active ? "none" : "2px solid #2A2A22", background: active ? GOLD : "transparent" }}>
                {active && <Check className="h-3 w-3 text-black" strokeWidth={3} />}
              </div>
            </button>
          );
        })}
      </div>

      {updateBody.isError && <p className="text-sm text-red-400">{getErrorMessage(updateBody.error)}</p>}
      <div className="flex items-center gap-3 pt-1">
        <button type="button" onClick={() => { setSaved(false); updateBody.mutate({ bodyShape: bodyShape || undefined, fitPreference: fitPreference || undefined }); }}
          disabled={updateBody.isPending || (!bodyShape && !fitPreference)}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-black transition-all disabled:opacity-40"
          style={{ background: `linear-gradient(135deg, ${GOLD}, ${GL})` }}>
          {updateBody.isPending ? "Kaydediliyor…" : "Profili Kaydet"}
        </button>
        {saved && !updateBody.isPending && (
          <div className="flex items-center gap-1.5 text-green-400 text-sm"><CheckCircle className="h-4 w-4" /> Kaydedildi</div>
        )}
      </div>
    </div>
  );
}

// — Görünüm & Bildirimler ————————————————————————————————
const LANGUAGES = [
  { value: "tr", label: "Türkçe", flag: "🇹🇷" },
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "de", label: "Deutsch", flag: "🇩🇪" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
] as const;

const NOTIF_ITEMS = [
  { key: "dailyWeatherAI" as const,   Icon: Sun,         label: "Hava Durumu & Kombin",    desc: "Her sabah 08:00'de AI kombin önerisi",   badge: "AI" },
  { key: "travelReminders" as const,  Icon: Plane,       label: "Seyahat Hatırlatıcıları", desc: "Yarınki seyahatin için bavulunu kontrol et", badge: null },
  { key: "weeklyStyle" as const,      Icon: CalendarDays, label: "Haftalık Stil Özeti",    desc: "Her Pazar 10:00'da haftanı planla",         badge: null },
];

function PreferencesSection({ profile }: { profile: UserProfile }) {
  const { setTheme } = useThemeStore();
  const [saved, setSaved] = useState(false);
  const updatePrefs = useUpdatePreferences(() => setSaved(true));

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<PreferencesFormData>({
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-in fade-in duration-300">

      {/* Tema */}
      <div>
        <SectionHead>Görünüm</SectionHead>
        <div className="grid grid-cols-2 gap-3">
          {(["dark","light"] as const).map((t) => {
            const active = currentTheme === t;
            return (
              <button key={t} type="button" onClick={() => setValue("theme", t)}
                className="flex items-center justify-center gap-2.5 rounded-2xl py-3.5 text-sm font-semibold transition-all duration-200"
                style={{ background: active ? IA : S2, border: active ? gb : b, color: active ? GOLD : "var(--color-muted)",
                         boxShadow: active ? `0 0 18px ${GOLD}16` : "none" }}>
                {t === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                {t === "dark" ? "Karanlık" : "Açık"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dil */}
      <div>
        <SectionHead>Dil</SectionHead>
        <div className="space-y-2">
          {LANGUAGES.map((lang) => {
            const active = currentLang === lang.value;
            return (
              <button key={lang.value} type="button" onClick={() => setValue("language", lang.value)}
                className="w-full flex items-center gap-3.5 rounded-2xl px-4 py-3 text-left transition-all duration-200"
                style={{ background: active ? IA : S2, border: active ? gb : b,
                         boxShadow: active ? `0 0 14px ${GOLD}12` : "none" }}>
                <span className="text-lg flex-shrink-0">{lang.flag}</span>
                <span className="text-[13px] font-semibold flex-1" style={{ color: active ? GOLD : "var(--color-text)" }}>
                  {lang.label}
                </span>
                {active && <Check className="h-4 w-4 flex-shrink-0" style={{ color: GOLD }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bildirimler */}
      <div>
        <SectionHead>Bildirim Türleri</SectionHead>
        <div className="space-y-2">
          {NOTIF_ITEMS.map(({ key, Icon, label, desc, badge }) => (
            <div key={key} className="flex items-center gap-3.5 rounded-2xl px-4 py-3.5 transition-all duration-200"
              style={{ background: S2, border: b }}>
              <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: IA }}>
                <Icon className="h-4 w-4" style={{ color: GOLD }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-text">{label}</p>
                  {badge && <span className="text-[9px] font-black px-1.5 py-0.5 rounded text-black" style={{ background: GOLD }}>{badge}</span>}
                </div>
                <p className="text-[11px] text-muted mt-0.5">{desc}</p>
              </div>
              <Toggle checked={watch(key)} onChange={(v) => setValue(key, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* Şehir */}
      <div>
        <SectionHead>Hava Durumu Şehri</SectionHead>
        <div className="flex items-center gap-2 rounded-2xl px-4 py-1" style={{ background: S2, border: b }}>
          <Building2 className="h-4 w-4 flex-shrink-0 text-muted" />
          <input placeholder="Istanbul" {...register("defaultCity")}
            className="flex-1 bg-transparent py-3 text-[13px] text-text outline-none placeholder:text-muted/50" />
          <button type="submit"
            className="px-4 py-1.5 rounded-xl text-black text-xs font-bold transition-opacity hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${GOLD}, ${GL})` }}>
            Kaydet
          </button>
        </div>
        {errors.defaultCity && <p className="text-[11px] text-red-400 mt-1">{errors.defaultCity.message}</p>}
        <p className="text-[11px] text-muted mt-2">Sabah hava durumu bildirimleri bu şehre göre gönderilir.</p>
      </div>

      {updatePrefs.isError && <p className="text-sm text-red-400">{getErrorMessage(updatePrefs.error)}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={updatePrefs.isPending}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-black transition-all disabled:opacity-40"
          style={{ background: `linear-gradient(135deg, ${GOLD}, ${GL})` }}>
          {updatePrefs.isPending ? "Kaydediliyor…" : "Tercihleri Kaydet"}
        </button>
        {saved && !updatePrefs.isPending && (
          <div className="flex items-center gap-1.5 text-green-400 text-sm"><CheckCircle className="h-4 w-4" /> Kaydedildi</div>
        )}
      </div>
    </form>
  );
}

// — Hesap & Güvenlik —————————————————————————————————————
function SecuritySection() {
  const [pwSaved,       setPwSaved]       = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [modal,         setModal]         = useState<"privacy" | "help" | "about" | null>(null);

  const changePassword = useChangePassword(() => { setPwSaved(true); reset(); });
  const deleteAccount  = useDeleteAccount();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });
  const onSubmit = (data: ChangePasswordFormData) => {
    setPwSaved(false);
    changePassword.mutate({ mevcutSifre: data.mevcutSifre, yeniSifre: data.yeniSifre });
  };

  return (
    <>
      {/* ── Modals ──────────────────────────────────────────── */}
      <InfoModal open={modal === "about"} onClose={() => setModal(null)} title="Smart Wardrobe AI" icon={Package}>
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${GOLD}, ${GL})` }}>
            <span className="text-2xl">👔</span>
          </div>
          <div>
            <p className="text-[16px] font-black text-text">Smart Wardrobe AI</p>
            <p className="text-[12px] text-muted mt-0.5">Versiyon 1.0.0</p>
          </div>
          <p className="text-[13px] text-muted leading-relaxed">
            AI destekli akıllı gardırop asistanın.<br />Her gün en iyi kombinini seç.
          </p>
        </div>
      </InfoModal>

      <InfoModal open={modal === "help"} onClose={() => setModal(null)} title="Yardım & Destek" icon={HelpCircle}>
        <p>Herhangi bir sorunla karşılaştığında bize ulaşabilirsin:</p>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: S2, border: b }}>
          <Mail className="h-4 w-4 flex-shrink-0" style={{ color: GOLD }} />
          <a href="mailto:smartwardrobeai@gmail.com"
            className="text-[13px] font-medium transition-colors hover:text-gold"
            style={{ color: GL }}>
            smartwardrobeai@gmail.com
          </a>
        </div>
        <p>Sık sorulan sorular ve kullanım kılavuzu için web sitemizi ziyaret edebilirsin. Yanıt süremiz genellikle 24 saattir.</p>
      </InfoModal>

      <InfoModal open={modal === "privacy"} onClose={() => setModal(null)} title="Gizlilik Politikası" icon={Shield}>
        <p>Smart Wardrobe AI olarak kişisel verilerinizin güvenliğini ön planda tutuyoruz.</p>
        <ul className="space-y-2">
          {[
            "Kıyafet fotoğraflarınız yalnızca sizin gardırop hesabınızda saklanır.",
            "Üçüncü taraflarla hiçbir kişisel veriniz paylaşılmaz.",
            "Hesabınızı sildiğinizde tüm verileriniz kalıcı olarak kaldırılır.",
            "JWT tabanlı kimlik doğrulama ile güvenli erişim sağlanır.",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: GOLD }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </InfoModal>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="space-y-6 animate-in fade-in duration-300">
        <SectionHead>Şifre Değiştir</SectionHead>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <GoldInput label="Mevcut Şifre" type="password" placeholder="••••••••" {...register("mevcutSifre")} />
          {errors.mevcutSifre && <p className="text-[11px] text-red-400">{errors.mevcutSifre.message}</p>}
          <GoldInput label="Yeni Şifre" type="password" placeholder="En az 6 karakter" {...register("yeniSifre")} />
          {errors.yeniSifre && <p className="text-[11px] text-red-400">{errors.yeniSifre.message}</p>}
          <GoldInput label="Yeni Şifre (Tekrar)" type="password" placeholder="••••••••" {...register("yeniSifreTekrar")} />
          {errors.yeniSifreTekrar && <p className="text-[11px] text-red-400">{errors.yeniSifreTekrar.message}</p>}
          {changePassword.isError && <p className="text-sm text-red-400">{getErrorMessage(changePassword.error)}</p>}
          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={changePassword.isPending}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-black transition-all disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${GOLD}, ${GL})` }}>
              {changePassword.isPending ? "Güncelleniyor…" : "Şifreyi Güncelle"}
            </button>
            {pwSaved && !changePassword.isPending && (
              <div className="flex items-center gap-1.5 text-green-400 text-sm"><CheckCircle className="h-4 w-4" /> Güncellendi</div>
            )}
          </div>
        </form>

        <SectionHead>Hesap</SectionHead>
        <div className="space-y-2">
          <Row icon={FileText}   label="Gizlilik Politikası" onClick={() => setModal("privacy")} />
          <Row icon={HelpCircle} label="Yardım & Destek"     onClick={() => setModal("help")} />
          <Row icon={Info}       label="Hakkında"            onClick={() => setModal("about")} />
        </div>

        <SectionHead>Oturum</SectionHead>
        <Row icon={LogOut} label="Çıkış Yap" danger onClick={() => { window.location.href = "/login"; }} />

        <div className="rounded-2xl p-5 space-y-4" style={{ border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.04)" }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <h3 className="text-sm font-semibold text-red-400">Tehlikeli Bölge</h3>
          </div>
          <p className="text-[12.5px] text-muted leading-relaxed">
            Hesabınızı ve tüm verilerinizi kalıcı olarak silin. Bu işlem geri alınamaz.
          </p>
          {!deleteConfirm ? (
            <button type="button" onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-red-400 text-sm font-medium transition-colors hover:bg-red-400/10"
              style={{ border: "1px solid rgba(239,68,68,0.35)" }}>
              <Trash2 className="h-3.5 w-3.5" /> Hesabı Kalıcı Olarak Sil
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-red-400">Emin misiniz? Tüm verileriniz silinecek.</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setDeleteConfirm(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-muted transition-colors hover:text-text"
                  style={{ border: b }}>İptal</button>
                <button type="button" onClick={() => deleteAccount.mutate()} disabled={deleteAccount.isPending}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-red-400 transition-colors hover:bg-red-400/15 disabled:opacity-40"
                  style={{ border: "1px solid rgba(239,68,68,0.4)" }}>
                  {deleteAccount.isPending ? "Siliniyor…" : "Evet, her şeyi sil"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Tab config ────────────────────────────────────────────────────────────────
type Tab = "profile" | "body" | "preferences" | "security";

const TABS: { id: Tab; label: string; sub: string; icon: React.ElementType }[] = [
  { id: "profile",     label: "Profil",            sub: "İsim, avatar, e-posta",     icon: User },
  { id: "body",        label: "Vücut Profili",      sub: "Şekil & kalıp tercihi",     icon: Activity },
  { id: "preferences", label: "Görünüm & Dil",     sub: "Tema, dil, bildirimler",    icon: Bell },
  { id: "security",    label: "Hesap & Güvenlik",  sub: "Şifre, gizlilik, çıkış",   icon: Shield },
];

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab,     setActiveTab]     = useState<Tab>("profile");
  const [photoPreview,  setPhotoPreview]  = useState<string | null>(null);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  const { data, isPending }  = useProfile();
  const { data: stats }      = useWardrobeStats();
  const uploadPhoto          = useUploadProfilePhoto((url) => setPhotoPreview(url));
  const fileRef              = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setPhotoPreview(URL.createObjectURL(file));
      uploadPhoto.mutate(file);
    },
    [uploadPhoto]
  );

  const profile    = data?.kullanici;
  const rawSrc     = profile?.profilFoto ?? null;
  const safeSrc    = rawSrc && (rawSrc.startsWith("http://") || rawSrc.startsWith("https://")) ? rawSrc : null;
  const avatarSrc  = photoPreview || safeSrc || null;
  const initials   = profile?.kullaniciAdi?.slice(0, 2).toUpperCase() ?? "SW";

  const toplamKiyafet = stats?.istatistikler?.ozet?.toplamKiyafet ?? 0;
  const toplamKombin  = stats?.istatistikler?.ozet?.toplamKombin  ?? 0;
  const toplamFavori  = stats?.istatistikler?.ozet?.toplamFavori  ?? 0;

  return (
    <>
    <AvatarPickerModal
      open={avatarPickerOpen}
      onClose={() => setAvatarPickerOpen(false)}
      currentSrc={avatarSrc}
      onSelect={(file) => {
        setPhotoPreview(URL.createObjectURL(file));
        uploadPhoto.mutate(file);
      }}
    />
    <div className="max-w-5xl w-full animate-fade-in">
      {/* Header */}
      <div className="mb-7">
        <p className="text-[10px] font-bold tracking-[0.3em] uppercase mb-1" style={{ color: GOLD }}>HESAP</p>
        <h1 className="text-3xl font-black text-text">Ayarlar</h1>
        <p className="text-sm mt-1 text-muted">Profilinizi, stil tercihlerinizi ve hesap güvenliğinizi yönetin.</p>
      </div>

      <div className="flex gap-6 items-start">

        {/* ── Sidebar ──────────────────────────────────────────── */}
        <aside className="w-64 flex-shrink-0 sticky top-4 space-y-3">

          {/* Profile card */}
          <div className="rounded-[20px] overflow-hidden" style={{ background: S1, border: b }}>
            {/* Gold shimmer top line */}
            <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />

            <div className="flex flex-col items-center gap-3 py-6 px-4">
              {isPending || !profile ? (
                <div className="animate-pulse flex flex-col items-center gap-3 w-full">
                  <div className="h-20 w-20 rounded-full" style={{ background: S2 }} />
                  <div className="h-3 w-24 rounded" style={{ background: S2 }} />
                  <div className="h-2.5 w-32 rounded" style={{ background: S2 }} />
                </div>
              ) : (
                <>
                  {/* Avatar */}
                  <div className="relative">
                    <div
                      className="h-20 w-20 rounded-full overflow-hidden flex items-center justify-center text-xl font-black relative"
                      style={{
                        background: avatarSrc ? "transparent" : `linear-gradient(135deg, ${GOLD}, ${GL})`,
                        boxShadow: `0 0 0 2px ${BG}, 0 0 0 4px ${GOLD}50`,
                        color: "#000",
                      }}
                    >
                      {avatarSrc
                        ? <Image src={avatarSrc} alt="Avatar" fill className="object-cover" sizes="80px" />
                        : initials}
                    </div>
                    {/* Kamera — fotoğraf yükle */}
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploadPhoto.isPending}
                      className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full flex items-center justify-center transition-all duration-200"
                      style={{ background: S1, border: gb, color: GOLD }}
                      title="Fotoğraf yükle"
                    >
                      {uploadPhoto.isPending
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Camera className="h-3.5 w-3.5" />}
                    </button>
                    {/* Avatar seçici butonu */}
                    <button
                      onClick={() => setAvatarPickerOpen(true)}
                      disabled={uploadPhoto.isPending}
                      className="absolute -bottom-1 -left-1 h-7 w-7 rounded-full flex items-center justify-center transition-all duration-200"
                      style={{ background: S1, border: gb, color: GOLD }}
                      title="Avatar seç"
                    >
                      <Sparkles className="h-3 w-3" />
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </div>

                  <div className="text-center">
                    <p className="text-[14px] font-black text-text">{profile.kullaniciAdi}</p>
                    <p className="text-[11px] text-muted mt-0.5">{profile.email}</p>
                    <p className="text-[10px] text-muted/60 mt-0.5">
                      Üye {new Date(profile.createdAt).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex w-full rounded-xl overflow-hidden" style={{ background: S2, border: b }}>
                    {[
                      { label: "Kıyafet", value: toplamKiyafet },
                      { label: "Kombin",  value: toplamKombin  },
                      { label: "Favori",  value: toplamFavori  },
                    ].map(({ label, value }, i, arr) => (
                      <div key={label} className="flex-1 flex flex-col items-center py-2.5 px-1"
                        style={i < arr.length - 1 ? { borderRight: b } : {}}>
                        <span className="text-[15px] font-black leading-none" style={{ color: GOLD }}>{value}</span>
                        <span className="text-[9px] uppercase tracking-wider mt-0.5 text-muted">{label}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Tab nav */}
            <div className="pb-3" style={{ borderTop: b }}>
              {TABS.map(({ id, label, sub, icon: Icon }) => {
                const active = activeTab === id;
                return (
                  <button key={id} onClick={() => setActiveTab(id)}
                    className={cn("relative w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200",
                      !active && "hover:bg-white/[0.02]")}
                    style={{ background: active ? IA : "transparent" }}>
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-r"
                        style={{ background: GOLD }} />
                    )}
                    <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                      style={{ background: active ? IA : S2, border: active ? gb : b }}>
                      <Icon className="h-3.5 w-3.5" style={{ color: active ? GOLD : "#555" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold leading-snug"
                        style={{ color: active ? GOLD : "var(--color-text)" }}>{label}</p>
                      <p className="text-[10px] text-muted truncate mt-0.5">{sub}</p>
                    </div>
                    <ChevronRight className="h-3 w-3 flex-shrink-0 transition-all"
                      style={{ color: GOLD, opacity: active ? 1 : 0 }} />
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ── Content panel ────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Panel header */}
          <div className="flex items-center gap-3 mb-4">
            {(() => {
              const t = TABS.find((t) => t.id === activeTab)!;
              const I = t.icon;
              return (
                <>
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: IA, border: gb }}>
                    <I className="h-4 w-4" style={{ color: GOLD }} />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-black text-text">{t.label}</h2>
                    <p className="text-[11px] text-muted">{t.sub}</p>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Panel body */}
          <div className="rounded-[22px] p-6" style={{ background: S1, border: b }}>
            <div className="h-0.5 w-full mb-5 rounded-full" style={{ background: `linear-gradient(90deg, ${GOLD}30, transparent)` }} />

            {isPending || !profile ? (
              <div className="space-y-4 animate-pulse">
                {[1,2,3].map((i) => (
                  <div key={i} className="h-12 rounded-xl" style={{ background: S2 }} />
                ))}
              </div>
            ) : (
              <>
                {activeTab === "profile"     && <ProfileSection     profile={profile} />}
                {activeTab === "body"        && <BodySection        profile={profile} />}
                {activeTab === "preferences" && <PreferencesSection profile={profile} />}
                {activeTab === "security"    && <SecuritySection />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
