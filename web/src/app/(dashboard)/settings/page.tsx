"use client";

import { useWardrobeStats } from "@/lib/hooks/useStats";
import {
  useChangePassword, useDeleteAccount,
  useProfile,
  useUpdateBodyProfile,
  useUpdatePreferences,
  useUpdateProfile,
  useUploadProfilePhoto,
  useSaveFcmToken,
} from "@/lib/hooks/useUsers";
import {
  requestNotificationPermission,
  getNotificationPermissionState,
  refreshTokenIfPermitted,
} from "@/lib/firebase";
import { useThemeStore } from "@/lib/store/themeStore";
import { useAuthStore } from "@/lib/store/authStore";
import { cn } from "@/lib/utils/cn";
import { getErrorMessage } from "@/lib/utils/errors";
import type { ChangePasswordFormData, PreferencesFormData, ProfileFormData } from "@/lib/validations/settings";
import { changePasswordSchema, preferencesSchema, profileSchema } from "@/lib/validations/settings";
import type { BodyShape, FitPreference, UserProfile } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  CalendarDays,
  Camera,
  Check, CheckCircle,
  ChevronRight,
  FileText,
  Globe,
  HelpCircle, Info,
  Loader2,
  LogOut,
  Mail,
  Moon,
  Package,
  Plane,
  Shield,
  Sparkles,
  Sun,
  Trash2,
  User,
  X
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { BodyShapeIcon, FitShapeIcon } from "@/components/settings/BodyShapeIcons";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { useT, LANGUAGES as LOCALE_LANGUAGES } from "@/lib/i18n";
import { useLanguageStore } from "@/lib/store/languageStore";

// Design tokens — CSS variables so dark/light theme switches everywhere at once
const BG   = "var(--color-bg)";
const S1   = "var(--color-surface)";
const S2   = "var(--color-card)";
const BDR  = "var(--color-border)";
const GOLD = "var(--color-gold)";
const GL   = "var(--color-gold-light)";
const IA   = "var(--color-gold-dim)";
const GA   = "var(--color-gold-border)";

const b  = `1px solid ${BDR}`;
const gb = `1px solid ${GA}`;

// Shared helpers 
function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="h-px flex-1" style={{ background: `linear-gradient(to right, color-mix(in srgb, ${GOLD} 25%, transparent), transparent)` }} />
      <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: GOLD }}>{children}</p>
      <span className="h-px flex-1" style={{ background: `linear-gradient(to left, color-mix(in srgb, ${GOLD} 25%, transparent), transparent)` }} />
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

// Avatar Picker Modal
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
  const { t } = useT();
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
      style={{ background: "var(--color-overlay)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-[24px] p-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
        style={{ background: "var(--color-card)", border: gb }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center"
          style={{ background: S2, color: "var(--color-muted)" }}>
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: IA, border: gb }}>
            <Sparkles className="h-4.5 w-4.5" style={{ color: GOLD }} />
          </div>
          <div>
            <p className="text-[15px] font-black text-text">{t("web.settings.avatar_select")}</p>
            <p className="text-[11px] text-muted">{t("web.settings.avatar_customize")}</p>
          </div>
        </div>

        {/* Erkek */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-px flex-1" style={{ background: GA }} />
            <span className="text-[10px] font-bold tracking-[0.2em] text-muted uppercase">{t("web.settings.male")}</span>
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
            <span className="text-[10px] font-bold tracking-[0.2em] text-muted uppercase">{t("web.settings.female")}</span>
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
            {t("common.loading")}
          </div>
        )}
      </div>
    </div>
  );
}

// Info Modal
function InfoModal({ open, onClose, title, icon: Icon, children }: {
  open: boolean; onClose: () => void;
  title: string; icon: React.ElementType;
  children: React.ReactNode;
}) {
  const { t } = useT();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "var(--color-overlay)", backdropFilter: "blur(6px)" }}
      onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-[24px] p-6 animate-in fade-in zoom-in-95 duration-200"
        style={{ background: "var(--color-card)", border: gb }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: S2, color: "var(--color-muted)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-muted)"; }}>
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
          {t("confirm.ok")}
        </button>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ background: checked ? GOLD : "var(--color-border)" }}
    >
      <span
        className="h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out"
        style={{ transform: checked ? "translateX(20px)" : "translateX(0px)" }}
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
        style={{ background: S2, border: focused ? gb : b, boxShadow: focused ? `0 0 0 2px color-mix(in srgb, ${GOLD} 9%, transparent)` : "none" }}
      />
    </div>
  );
}

// TAB SECTIONS

// Profil
function ProfileSection({ profile }: { profile: UserProfile }) {
  const { t } = useT();
  const [saved, setSaved] = useState(false);
  const updateProfile = useUpdateProfile(() => setSaved(true));
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { kullaniciAdi: profile.kullaniciAdi, cinsiyet: profile.cinsiyet ?? "Belirtilmemiş" },
  });
  const onSubmit = (data: ProfileFormData) => { setSaved(false); updateProfile.mutate({ kullaniciAdi: data.kullaniciAdi, cinsiyet: data.cinsiyet }); };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <SectionHead>{t("web.settings.account_info")}</SectionHead>
      <div className="space-y-2">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: S2, border: b }}>
          <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: IA }}>
            <User className="h-4 w-4" style={{ color: GOLD }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{t("web.settings.username_label")}</p>
            <p className="text-[13.5px] font-semibold text-text mt-0.5">{profile.kullaniciAdi}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: S2, border: b }}>
          <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: IA }}>
            <Globe className="h-4 w-4" style={{ color: GOLD }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{t("web.settings.email_label")}</p>
            <p className="text-[13.5px] font-semibold text-text mt-0.5">{profile.email}</p>
          </div>
        </div>
      </div>

      <SectionHead>{t("web.settings.edit_profile_section")}</SectionHead>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <GoldInput label={t("web.settings.username_label")} placeholder={t("web.settings.username_placeholder")} {...register("kullaniciAdi")} />
        {errors.kullaniciAdi && <p className="text-[11px] text-red-400">{errors.kullaniciAdi.message}</p>}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">{t("web.settings.gender_label")}</label>
          <select
            {...register("cinsiyet")}
            className="w-full rounded-xl px-4 py-3 text-[13.5px] font-medium text-text outline-none transition-all duration-200"
            style={{ background: S2, border: b }}
          >
            <option value="Belirtilmemiş">{t("edit_profile.gender_unspecified")}</option>
            <option value="Kadın">{t("edit_profile.gender_female")}</option>
            <option value="Erkek">{t("edit_profile.gender_male")}</option>
          </select>
          <p className="text-[11px] text-muted">{t("web.settings.gender_hint")}</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">{t("web.settings.email_label")}</label>
          <input readOnly value={profile.email}
            className="w-full rounded-xl px-4 py-3 text-[13.5px] text-muted cursor-not-allowed outline-none"
            style={{ background: "var(--color-bg)", border: b }} />
          <p className="text-[11px] text-muted">{t("web.settings.email_readonly_hint")}</p>
        </div>
        {updateProfile.isError && <p className="text-sm text-red-400">{getErrorMessage(updateProfile.error)}</p>}
        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={!isDirty || updateProfile.isPending}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-black transition-all duration-200 disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${GOLD}, ${GL})` }}>
            {updateProfile.isPending ? t("web.settings.saving") : t("web.settings.save_changes")}
          </button>
          {saved && !updateProfile.isPending && (
            <div className="flex items-center gap-1.5 text-green-400 text-sm">
              <CheckCircle className="h-4 w-4" /> {t("web.settings.saved")}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

// Vücut Profili
function getBodyShapes(t: (key: string) => string): { value: BodyShape; label: string; desc: string; num: string }[] {
  return [
    { value: "kum_saati",  label: t("body_profile.hourglass"),         desc: t("body_profile.hourglass_desc"),         num: "01" },
    { value: "armut",      label: t("body_profile.pear"),              desc: t("body_profile.pear_desc"),              num: "02" },
    { value: "ters_ucgen", label: t("body_profile.inverted_triangle"), desc: t("body_profile.inverted_triangle_desc"), num: "03" },
    { value: "dikdortgen", label: t("body_profile.rectangle"),         desc: t("body_profile.rectangle_desc"),         num: "04" },
  ];
}
function getFitPrefs(t: (key: string) => string): { value: FitPreference; label: string; desc: string }[] {
  return [
    { value: "slim",     label: t("body_profile.slim"),     desc: t("body_profile.slim_desc") },
    { value: "regular",  label: t("body_profile.regular"),  desc: t("body_profile.regular_desc") },
    { value: "oversize", label: t("body_profile.oversize"), desc: t("body_profile.oversize_desc") },
  ];
}

function BodySection({ profile }: { profile: UserProfile }) {
  const { t } = useT();
  const BODY_SHAPES = getBodyShapes(t);
  const FIT_PREFS = getFitPrefs(t);
  const [bodyShape,     setBodyShape]     = useState<BodyShape | "">((profile.vucut?.sekil as BodyShape) || "");
  const [fitPreference, setFitPreference] = useState<FitPreference | "">((profile.vucut?.kalip as FitPreference) || "");
  const [saved, setSaved] = useState(false);
  const updateBody = useUpdateBodyProfile(() => setSaved(true));

  // Sunucudan gelen en güncel kayıtlı tercihle senkron kal — kullanıcı hiç
  // kaydetmediyse boş (seçilmemiş), kaydettiyse son kaydedilen seçili gelir.
  useEffect(() => {
    setBodyShape((profile.vucut?.sekil as BodyShape) || "");
    setFitPreference((profile.vucut?.kalip as FitPreference) || "");
  }, [profile.vucut?.sekil, profile.vucut?.kalip]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5" style={{ background: IA, border: gb }}>
        <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
        <p className="text-[12.5px] leading-relaxed font-medium" style={{ color: GL }}>
          {t("web.settings.ai_body_banner")}
        </p>
      </div>

      <SectionHead>{t("web.settings.body_shape_title")}</SectionHead>
      <p className="text-[12px] text-muted -mt-2">{t("web.settings.body_shape_hint")}</p>
      <div className="grid grid-cols-2 gap-3">
        {BODY_SHAPES.map((s) => {
          const active = bodyShape === s.value;
          return (
            <button key={s.value} type="button" onClick={() => { setBodyShape(s.value); setSaved(false); }}
              className="relative flex flex-col items-center gap-2 rounded-2xl p-4 pt-3.5 text-center transition-all duration-200 hover:scale-[1.015] active:scale-[0.99]"
              style={{ background: active ? IA : S2, border: active ? gb : b,
                       boxShadow: active ? `0 0 20px color-mix(in srgb, ${GOLD} 9%, transparent)` : "none" }}>
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-black" style={{ color: active ? GOLD : "var(--color-muted)" }}>{s.num}</span>
                <div className="h-5 w-5 rounded-full flex items-center justify-center transition-all"
                  style={{ border: active ? "none" : "2px solid var(--color-border)", background: active ? GOLD : "transparent" }}>
                  {active && <Check className="h-3 w-3 text-black" strokeWidth={3} />}
                </div>
              </div>
              <BodyShapeIcon shape={s.value} active={active} className="h-[68px] w-12 -mt-1" />
              <div>
                <p className="text-[13px] font-semibold" style={{ color: active ? GOLD : "var(--color-text)" }}>{s.label}</p>
                <p className="text-[11px] text-muted leading-snug mt-0.5">{s.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      <SectionHead>{t("web.settings.fit_title")}</SectionHead>
      <p className="text-[12px] text-muted -mt-2">{t("web.settings.fit_hint")}</p>
      <div className="grid grid-cols-3 gap-3">
        {FIT_PREFS.map((f) => {
          const active = fitPreference === f.value;
          return (
            <button key={f.value} type="button" onClick={() => { setFitPreference(f.value); setSaved(false); }}
              className="relative flex flex-col items-center gap-2 rounded-2xl p-4 pt-3.5 text-center transition-all duration-200 hover:scale-[1.015] active:scale-[0.99]"
              style={{ background: active ? IA : S2, border: active ? gb : b,
                       boxShadow: active ? `0 0 16px color-mix(in srgb, ${GOLD} 8%, transparent)` : "none" }}>
              <div className="flex items-center justify-end w-full">
                <div className="h-5 w-5 rounded-full flex items-center justify-center transition-all"
                  style={{ border: active ? "none" : "2px solid var(--color-border)", background: active ? GOLD : "transparent" }}>
                  {active && <Check className="h-3 w-3 text-black" strokeWidth={3} />}
                </div>
              </div>
              <FitShapeIcon fit={f.value} active={active} className="h-[50px] w-12 -mt-1" />
              <div>
                <p className="text-[13px] font-semibold" style={{ color: active ? GOLD : "var(--color-text)" }}>{f.label}</p>
                <p className="text-[11px] text-muted leading-snug mt-0.5">{f.desc}</p>
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
          {updateBody.isPending ? t("web.settings.saving") : t("web.settings.save_profile")}
        </button>
        {saved && !updateBody.isPending && (
          <div className="flex items-center gap-1.5 text-green-400 text-sm"><CheckCircle className="h-4 w-4" /> {t("web.settings.saved")}</div>
        )}
      </div>
    </div>
  );
}

// Görünüm & Bildirimler

function PreferencesSection({ profile }: { profile: UserProfile }) {
  const { t } = useT();
  const { theme: liveTheme, setTheme } = useThemeStore();
  const { language: liveLang, setLanguage } = useLanguageStore();
  const [saved, setSaved] = useState(false);
  const updatePrefs = useUpdatePreferences(() => setSaved(true));
  const updateThemeOnly = useUpdatePreferences();
  const updateLangOnly = useUpdatePreferences();
  const saveFcmToken = useSaveFcmToken();

  // Tarayıcı bildirim izni — "granted" olmadan hiçbir bildirim toggle'ı
  // fiilen bir şey yapmaz, bu yüzden durumu görünür tutuyoruz.
  const [notifPermission, setNotifPermission] = useState<"default" | "granted" | "denied" | "unsupported">("default");
  const [notifBusy, setNotifBusy] = useState(false);
  // Bu cihazda FCM token'ının fiilen kayıtlı olup olmadığı — kullanıcıya
  // görünür bir onay vermek için (sessiz arka plan işlemi yetmiyor).
  const [tokenStatus, setTokenStatus] = useState<"idle" | "checking" | "active" | "error">("idle");

  const NOTIF_ITEMS = [
    { key: "dailyWeatherAI" as const,   Icon: Sun,         label: t("notifications.weather_and_outfit"),    desc: t("notifications.every_morning_at_0800_ai_outfit_recommendation_based_on_your_wardrobe"),   badge: "AI" },
    { key: "travelReminders" as const,  Icon: Plane,       label: t("notifications.travel_reminders"),      desc: t("notifications.tomorrow_your_trip_check_your_suitcase"), badge: null as string | null },
    { key: "weeklyStyle" as const,      Icon: CalendarDays, label: t("notifications.weekly_style_summary"),  desc: t("notifications.every_sunday_at_1000_plan_your_week"),    badge: null as string | null },
  ];

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

  useEffect(() => {
    const state = getNotificationPermissionState();
    setNotifPermission(state === "unsupported" ? "unsupported" : state);
    if (state !== "granted") return;
    // Önceden izin verilmişse token'ı sessizce tazele (kullanıcıya tekrar sormadan)
    // ve sonucu görünür bir rozetle teyit et.
    setTokenStatus("checking");
    refreshTokenIfPermitted().then((result) => {
      if (result?.ok) {
        saveFcmToken.mutate(result.token, {
          onSuccess: () => setTokenStatus("active"),
          onError: () => setTokenStatus("error"),
        });
      } else {
        setTokenStatus("error");
      }
    });
  }, []); // eslint-disable-line

  const handleNotifToggle = async (key: "dailyWeatherAI" | "travelReminders" | "weeklyStyle", next: boolean) => {
    if (!next) {
      setValue(key, false);
      return;
    }
    // Açılırken: tarayıcı izni yoksa önce onu isteyip FCM token'ını kaydet.
    if (notifPermission === "granted" && tokenStatus === "active") {
      setValue(key, true);
      return;
    }
    setNotifBusy(true);
    setTokenStatus("checking");
    const result = await requestNotificationPermission();
    setNotifBusy(false);
    if (result.ok) {
      setNotifPermission("granted");
      saveFcmToken.mutate(result.token, {
        onSuccess: () => setTokenStatus("active"),
        onError: () => setTokenStatus("error"),
      });
      setValue(key, true);
    } else {
      setNotifPermission(result.reason === "denied" ? "denied" : "unsupported");
      setTokenStatus("error");
      // İzin verilmedi/desteklenmiyor — tercihi DB'de yine açık tutuyoruz
      // (kullanıcı sonradan tarayıcı izni verirse otomatik çalışır) ama
      // anlık olarak bildirim alamayacağını banner ile gösteriyoruz.
      setValue(key, true);
    }
  };

  // Tema ve dil seçimi anında uygulanır ve kaydedilir — Topbar'daki güneş/ay
  // ikonuyla birebir aynı davranış ve aynı seçili durum.
  const handleThemeSelect = (themeVal: "dark" | "light") => {
    setValue("theme", themeVal);
    setTheme(themeVal);
    updateThemeOnly.mutate({ theme: themeVal });
  };

  const handleLanguageSelect = (langVal: "tr" | "en" | "de" | "fr") => {
    setValue("language", langVal);
    setLanguage(langVal);
    updateLangOnly.mutate({ language: langVal });
  };

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
        <SectionHead>{t("web.settings.appearance_section")}</SectionHead>
        <div className="grid grid-cols-2 gap-3">
          {(["dark","light"] as const).map((themeVal) => {
            const active = liveTheme === themeVal;
            return (
              <button key={themeVal} type="button" onClick={() => handleThemeSelect(themeVal)}
                className="flex items-center justify-center gap-2.5 rounded-2xl py-3.5 text-sm font-semibold transition-all duration-200"
                style={{ background: active ? IA : S2, border: active ? gb : b, color: active ? GOLD : "var(--color-muted)",
                         boxShadow: active ? `0 0 18px var(--color-gold-glow)` : "none" }}>
                {themeVal === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                {themeVal === "dark" ? t("web.settings.dark") : t("web.settings.light")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dil */}
      <div>
        <SectionHead>{t("web.settings.language_section")}</SectionHead>
        <div className="space-y-2">
          {LOCALE_LANGUAGES.map((lang) => {
            const active = liveLang === lang.value;
            return (
              <button key={lang.value} type="button" onClick={() => handleLanguageSelect(lang.value)}
                className="w-full flex items-center gap-3.5 rounded-2xl px-4 py-3 text-left transition-all duration-200"
                style={{ background: active ? IA : S2, border: active ? gb : b,
                         boxShadow: active ? `0 0 14px color-mix(in srgb, ${GOLD} 7%, transparent)` : "none" }}>
                <FlagIcon code={lang.value} className="h-5 w-7 rounded" />
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
        <SectionHead>{t("web.settings.notif_section")}</SectionHead>

        {(tokenStatus === "checking" || notifBusy) && (
          <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 mb-3" style={{ background: S2, border: b }}>
            <Loader2 className="h-4 w-4 text-muted flex-shrink-0 animate-spin" />
            <p className="text-[12px] text-muted">{t("web.settings.notif_checking_device")}</p>
          </div>
        )}
        {notifPermission === "denied" && (
          <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 mb-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-red-400 leading-relaxed">{t("web.settings.notif_permission_denied")}</p>
          </div>
        )}
        {notifPermission === "unsupported" && (
          <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 mb-3" style={{ background: S2, border: b }}>
            <Info className="h-4 w-4 text-muted flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-muted leading-relaxed">{t("web.settings.notif_permission_unsupported")}</p>
          </div>
        )}

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
              <Toggle
                checked={watch(key)}
                disabled={notifBusy}
                onChange={(v) => handleNotifToggle(key, v)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Şehir */}
      <div>
        <SectionHead>{t("web.settings.weather_city_section")}</SectionHead>
        <div className="flex items-center gap-2 rounded-2xl px-4 py-1" style={{ background: S2, border: b }}>
          <Building2 className="h-4 w-4 flex-shrink-0 text-muted" />
          <input placeholder="Istanbul" {...register("defaultCity")}
            className="flex-1 bg-transparent py-3 text-[13px] text-text outline-none placeholder:text-muted/50" />
          <button type="submit"
            className="px-4 py-1.5 rounded-xl text-black text-xs font-bold transition-opacity hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${GOLD}, ${GL})` }}>
            {t("web.settings.save_city")}
          </button>
        </div>
        {errors.defaultCity && <p className="text-[11px] text-red-400 mt-1">{errors.defaultCity.message}</p>}
        <p className="text-[11px] text-muted mt-2">{t("notifications.morning_weather_notifications_are_sent_according_to_this_city")}</p>
      </div>

      {updatePrefs.isError && <p className="text-sm text-red-400">{getErrorMessage(updatePrefs.error)}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={updatePrefs.isPending}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-black transition-all disabled:opacity-40"
          style={{ background: `linear-gradient(135deg, ${GOLD}, ${GL})` }}>
          {updatePrefs.isPending ? t("web.settings.saving") : t("web.settings.save_prefs")}
        </button>
        {saved && !updatePrefs.isPending && (
          <div className="flex items-center gap-1.5 text-green-400 text-sm"><CheckCircle className="h-4 w-4" /> {t("web.settings.saved")}</div>
        )}
      </div>
    </form>
  );
}

// Hesap & Güvenlik
function SecuritySection() {
  const { t } = useT();
  const { logout } = useAuthStore();
  const [pwSaved,       setPwSaved]       = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [modal,         setModal]         = useState<"privacy" | "help" | "about" | null>(null);

  const changePassword = useChangePassword(() => { setPwSaved(true); reset(); });
  const deleteAccount  = useDeleteAccount();
  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });
  const onSubmit = (data: ChangePasswordFormData) => {
    setPwSaved(false);
    changePassword.mutate({ mevcutSifre: data.mevcutSifre, yeniSifre: data.yeniSifre });
  };

  return (
    <>
      {/* Modals */}
      <InfoModal open={modal === "about"} onClose={() => setModal(null)} title="Smart Wardrobe AI" icon={Package}>
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${GOLD}, ${GL})` }}>
            <span className="text-2xl">👔</span>
          </div>
          <div>
            <p className="text-[16px] font-black text-text">Smart Wardrobe AI</p>
            <p className="text-[12px] text-muted mt-0.5">{t("web.settings.version")} 1.0.0</p>
          </div>
          <p className="text-[13px] text-muted leading-relaxed" style={{ whiteSpace: "pre-line" }}>
            {t("about_dialog.about")}
          </p>
        </div>
      </InfoModal>

      <InfoModal open={modal === "help"} onClose={() => setModal(null)} title={t("web.settings.help_support")} icon={HelpCircle}>
        <p>{t("web.settings.help_intro")}</p>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: S2, border: b }}>
          <Mail className="h-4 w-4 flex-shrink-0" style={{ color: GOLD }} />
          <a href="mailto:smartwardrobeai@gmail.com"
            className="text-[13px] font-medium transition-colors hover:text-gold"
            style={{ color: GL }}>
            smartwardrobeai@gmail.com
          </a>
        </div>
        <p>{t("web.settings.help_faq")}</p>
      </InfoModal>

      <InfoModal open={modal === "privacy"} onClose={() => setModal(null)} title={t("web.settings.privacy_policy")} icon={Shield}>
        <p>{t("web.settings.privacy_intro")}</p>
        <ul className="space-y-2">
          {[
            t("web.settings.privacy_item1"),
            t("web.settings.privacy_item2"),
            t("web.settings.privacy_item3"),
            t("web.settings.privacy_item4"),
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: GOLD }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </InfoModal>

      {/* Content */}
      <div className="space-y-6 animate-in fade-in duration-300">
        <SectionHead>{t("web.settings.password_section")}</SectionHead>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <GoldInput label={t("web.settings.current_password")} type="password" placeholder="••••••••" {...register("mevcutSifre")} />
          {errors.mevcutSifre && <p className="text-[11px] text-red-400">{errors.mevcutSifre.message}</p>}
          <GoldInput label={t("web.settings.new_password")} type="password" placeholder={t("web.settings.password_min_hint")} {...register("yeniSifre")} />
          {errors.yeniSifre && <p className="text-[11px] text-red-400">{errors.yeniSifre.message}</p>}
          <GoldInput label={t("web.settings.new_password_repeat")} type="password" placeholder="••••••••" {...register("yeniSifreTekrar")} />
          {errors.yeniSifreTekrar && <p className="text-[11px] text-red-400">{errors.yeniSifreTekrar.message}</p>}
          {changePassword.isError && <p className="text-sm text-red-400">{getErrorMessage(changePassword.error)}</p>}
          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={changePassword.isPending}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-black transition-all disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${GOLD}, ${GL})` }}>
              {changePassword.isPending ? t("web.settings.updating") : t("web.settings.update_password")}
            </button>
            {pwSaved && !changePassword.isPending && (
              <div className="flex items-center gap-1.5 text-green-400 text-sm"><CheckCircle className="h-4 w-4" /> {t("web.settings.updated")}</div>
            )}
          </div>
        </form>

        <SectionHead>{t("web.settings.account_section")}</SectionHead>
        <div className="space-y-2">
          <Row icon={FileText}   label={t("web.settings.privacy_policy")} onClick={() => setModal("privacy")} />
          <Row icon={HelpCircle} label={t("web.settings.help_support")}  onClick={() => setModal("help")} />
          <Row icon={Info}       label={t("web.settings.about")}         onClick={() => setModal("about")} />
        </div>

        <SectionHead>{t("web.settings.session_section")}</SectionHead>
        <Row icon={LogOut} label={t("web.settings.logout")} danger onClick={handleLogout} />

        <div className="rounded-2xl p-5 space-y-4" style={{ border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.04)" }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <h3 className="text-sm font-semibold text-red-400">{t("web.settings.danger_zone")}</h3>
          </div>
          <p className="text-[12.5px] text-muted leading-relaxed">
            {t("web.settings.danger_zone_desc")}
          </p>
          {!deleteConfirm ? (
            <button type="button" onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-red-400 text-sm font-medium transition-colors hover:bg-red-400/10"
              style={{ border: "1px solid rgba(239,68,68,0.35)" }}>
              <Trash2 className="h-3.5 w-3.5" /> {t("web.settings.delete_account")}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-red-400">{t("web.settings.delete_confirm_text")}</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setDeleteConfirm(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-muted transition-colors hover:text-text"
                  style={{ border: b }}>{t("confirm.cancel")}</button>
                <button type="button" onClick={() => deleteAccount.mutate()} disabled={deleteAccount.isPending}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-red-400 transition-colors hover:bg-red-400/15 disabled:opacity-40"
                  style={{ border: "1px solid rgba(239,68,68,0.4)" }}>
                  {deleteAccount.isPending ? t("web.settings.deleting") : t("web.settings.delete_confirm_yes")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Tab config
type Tab = "profile" | "body" | "preferences" | "security";

function getTabs(t: (key: string) => string): { id: Tab; label: string; sub: string; icon: React.ElementType }[] {
  return [
    { id: "profile",     label: t("web.settings.tab_profile"),     sub: t("web.settings.tab_profile_sub"),     icon: User },
    { id: "body",        label: t("web.settings.tab_body"),        sub: t("web.settings.tab_body_sub"),        icon: Activity },
    { id: "preferences", label: t("web.settings.tab_appearance"),  sub: t("web.settings.tab_appearance_sub"),  icon: Bell },
    { id: "security",    label: t("web.settings.tab_security"),    sub: t("web.settings.tab_security_sub"),    icon: Shield },
  ];
}

// Main Page
const LOCALE_MAP: Record<string, string> = { tr: "tr-TR", en: "en-US", de: "de-DE", fr: "fr-FR" };

export default function SettingsPage() {
  const { t, language } = useT();
  const TABS = getTabs(t);
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
        <p className="text-[10px] font-bold tracking-[0.3em] uppercase mb-1" style={{ color: GOLD }}>{t("web.settings.kicker")}</p>
        <h1 className="text-3xl font-black text-text">{t("web.settings.title")}</h1>
        <p className="text-sm mt-1 text-muted">{t("web.settings.subtitle")}</p>
      </div>

      <div className="flex flex-col gap-6 items-start lg:flex-row">

        {/* Sidebar */}
        <aside className="w-full lg:w-64 flex-shrink-0 lg:sticky lg:top-4 space-y-3">

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
                        boxShadow: `0 0 0 2px ${BG}, 0 0 0 4px color-mix(in srgb, ${GOLD} 31%, transparent)`,
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
                      title={t("web.settings.upload_photo_title")}
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
                      title={t("web.settings.avatar_select")}
                    >
                      <Sparkles className="h-3 w-3" />
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </div>

                  <div className="text-center">
                    <p className="text-[14px] font-black text-text">{profile.kullaniciAdi}</p>
                    <p className="text-[11px] text-muted mt-0.5">{profile.email}</p>
                    <p className="text-[10px] text-muted/60 mt-0.5">
                      {t("web.settings.member_since")} {new Date(profile.createdAt).toLocaleDateString(LOCALE_MAP[language] ?? "tr-TR", { month: "long", year: "numeric" })}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex w-full rounded-xl overflow-hidden" style={{ background: S2, border: b }}>
                    {[
                      { label: t("web.settings.stat_items"),     value: toplamKiyafet },
                      { label: t("web.settings.stat_outfits"),   value: toplamKombin  },
                      { label: t("web.settings.stat_favorites"), value: toplamFavori  },
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
                      <Icon className="h-3.5 w-3.5" style={{ color: active ? GOLD : "var(--color-muted)" }} />
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

        {/* Content panel */}
        <div className="flex-1 min-w-0">
          {/* Panel header */}
          <div className="flex items-center gap-3 mb-4">
            {(() => {
              const activeTabInfo = TABS.find((tab) => tab.id === activeTab)!;
              const I = activeTabInfo.icon;
              return (
                <>
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: IA, border: gb }}>
                    <I className="h-4 w-4" style={{ color: GOLD }} />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-black text-text">{activeTabInfo.label}</h2>
                    <p className="text-[11px] text-muted">{activeTabInfo.sub}</p>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Panel body */}
          <div className="rounded-[22px] p-6" style={{ background: S1, border: b }}>
            <div className="h-0.5 w-full mb-5 rounded-full" style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${GOLD} 19%, transparent), transparent)` }} />

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
      <