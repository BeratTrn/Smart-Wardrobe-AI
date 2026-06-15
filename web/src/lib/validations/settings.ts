import { z } from "zod";

// ── Profile ────────────────────────────────────────────────────────────────────
export const profileSchema = z.object({
  kullaniciAdi: z
    .string()
    .min(3, { message: "Username must be at least 3 characters" })
    .max(30, { message: "Username must be at most 30 characters" }),
  cinsiyet: z.enum(["Erkek", "Kadın", "Belirtilmemiş"] as const).optional(),
});
export type ProfileFormData = z.infer<typeof profileSchema>;

// ── Body Profile ───────────────────────────────────────────────────────────────
export const bodySchema = z.object({
  bodyShape: z
    .enum(["kum_saati", "armut", "ters_ucgen", "dikdortgen"] as const)
    .optional(),
  fitPreference: z
    .enum(["slim", "regular", "oversize"] as const)
    .optional(),
});
export type BodyFormData = z.infer<typeof bodySchema>;

// ── Preferences ────────────────────────────────────────────────────────────────
export const preferencesSchema = z.object({
  defaultCity: z.string().min(2, { message: "City name too short" }),
  theme: z.enum(["dark", "light"] as const),
  language: z.enum(["tr", "en", "de", "fr"] as const),
  dailyWeatherAI: z.boolean(),
  travelReminders: z.boolean(),
  weeklyStyle: z.boolean(),
});
export type PreferencesFormData = z.infer<typeof preferencesSchema>;

// ── Change Password ────────────────────────────────────────────────────────────
export const changePasswordSchema = z
  .object({
    mevcutSifre: z.string().min(6, { message: "Current password is required" }),
    yeniSifre: z
      .string()
      .min(6, { message: "New password must be at least 6 characters" }),
    yeniSifreTekrar: z.string().min(1, { message: "Please confirm new password" }),
  })
  .refine((d) => d.yeniSifre === d.yeniSifreTekrar, {
    message: "Passwords do not match",
    path: ["yeniSifreTekrar"],
  });
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

// ── Suitcase / Travel ─────────────────────────────────────────────────────────
export const suitcaseSchema = z
  .object({
    sehir: z.string().min(2, { message: "Destination city is required" }),
    baslangicTarihi: z.string().min(1, { message: "Start date is required" }),
    bitisTarihi: z.string().min(1, { message: "End date is required" }),
  })
  .refine(
    (d) => new Date(d.bitisTarihi) >= new Date(d.baslangicTarihi),
    {
      message: "End date must be on or after start date",
      path: ["bitisTarihi"],
    }
  );
export type SuitcaseFormData = z.infer<typeof suitcaseSchema>;
