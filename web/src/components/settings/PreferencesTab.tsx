"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle } from "lucide-react";
import { preferencesSchema, type PreferencesFormData } from "@/lib/validations/settings";
import { useUpdatePreferences } from "@/lib/hooks/useUsers";
import { useThemeStore } from "@/lib/store/themeStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import { getErrorMessage } from "@/lib/utils/errors";
import type { UserProfile } from "@/types";

interface PreferencesTabProps {
  profile: UserProfile;
}

const LANGUAGES = [
  { value: "tr", label: "Türkçe" },
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
] as const;

interface ToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white/5 last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[12px] text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors flex-shrink-0",
          checked ? "bg-gold" : "bg-white/10"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
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
  const currentLang = watch("language");

  const onSubmit = (data: PreferencesFormData) => {
    setSaved(false);
    // Sync theme store immediately for live preview
    setTheme(data.theme);
    updatePrefs.mutate({
      defaultCity: data.defaultCity,
      theme: data.theme,
      language: data.language,
      dailyWeatherAI: data.dailyWeatherAI,
      travelReminders: data.travelReminders,
      weeklyStyle: data.weeklyStyle,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
      {/* City + Theme + Language */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">App Preferences</h3>

        <Input
          label="Default City (for weather)"
          placeholder="Istanbul"
          error={errors.defaultCity?.message}
          {...register("defaultCity")}
        />

        {/* Theme toggle */}
        <div className="space-y-1.5">
          <label className="text-[12px] text-muted block">Theme</label>
          <div className="flex gap-2">
            {(["dark", "light"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setValue("theme", t)}
                className={cn(
                  "flex-1 rounded-xl border py-2.5 text-sm font-medium transition-all capitalize",
                  currentTheme === t
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-border text-muted hover:border-gold/40"
                )}
              >
                {t === "dark" ? "🌙 Dark" : "☀️ Light"}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="space-y-1.5">
          <label className="text-[12px] text-muted block">Language</label>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                type="button"
                onClick={() => setValue("language", lang.value)}
                className={cn(
                  "rounded-xl border py-2.5 text-sm font-medium transition-all",
                  currentLang === lang.value
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-border text-muted hover:border-gold/40"
                )}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notification toggles */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Notifications</h3>
        <div className="glass rounded-xl px-4 divide-y divide-white/5">
          <Toggle
            label="Daily Weather + AI Outfit"
            description="Morning briefing with weather and a suggested outfit"
            checked={watch("dailyWeatherAI")}
            onChange={(v) => setValue("dailyWeatherAI", v)}
          />
          <Toggle
            label="Travel Reminders"
            description="Reminders before your upcoming trips"
            checked={watch("travelReminders")}
            onChange={(v) => setValue("travelReminders", v)}
          />
          <Toggle
            label="Weekly Style Digest"
            description="A weekly summary of your wardrobe trends"
            checked={watch("weeklyStyle")}
            onChange={(v) => setValue("weeklyStyle", v)}
          />
        </div>
      </div>

      {updatePrefs.isError && (
        <p className="text-sm text-danger">{getErrorMessage(updatePrefs.error)}</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={updatePrefs.isPending}>
          Save Preferences
        </Button>
        {saved && !updatePrefs.isPending && (
          <div className="flex items-center gap-1.5 text-success text-sm">
            <CheckCircle className="h-4 w-4" />
            Saved
          </div>
        )}
      </div>
    </form>
  );
}
