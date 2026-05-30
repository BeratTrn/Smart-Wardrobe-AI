import api from "./axios";
import type {
  UserProfile,
  UserTercihler,
  BodyShape,
  FitPreference,
  Language,
} from "@/types";

// ── Response shapes ───────────────────────────────────────────────────────────

export interface ProfileResponse {
  mesaj: string;
  kullanici: UserProfile;
}

export interface BodyProfileResponse {
  mesaj: string;
  vucut: UserProfile["vucut"];
}

export interface PhotoResponse {
  mesaj: string;
  profilFoto: string;
}

export interface PreferencesResponse {
  mesaj: string;
  notificationPreferences: UserProfile["notificationPreferences"];
  defaultCity: string;
}

// ── Request shapes ────────────────────────────────────────────────────────────

export interface UpdateProfilePayload {
  kullaniciAdi?: string;
  tercihler?: Partial<UserTercihler>;
}

export interface UpdateBodyPayload {
  bodyShape?: BodyShape;
  fitPreference?: FitPreference;
}

export interface UpdatePreferencesPayload {
  dailyWeatherAI?: boolean;
  travelReminders?: boolean;
  weeklyStyle?: boolean;
  defaultCity?: string;
  theme?: "dark" | "light";
  language?: Language;
}

export interface ChangePasswordPayload {
  mevcutSifre: string;
  yeniSifre: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

/** GET /api/auth/me — full profile */
export async function getProfile(): Promise<{ kullanici: UserProfile }> {
  const res = await api.get<{ kullanici: UserProfile }>("/auth/me");
  return res.data;
}

/** PUT /api/users/profile — update username / tercihler */
export async function updateProfile(
  payload: UpdateProfilePayload
): Promise<ProfileResponse> {
  const res = await api.put<ProfileResponse>("/users/profile", payload);
  return res.data;
}

/** PUT /api/users/profile/body — update body shape + fit preference */
export async function updateBodyProfile(
  payload: UpdateBodyPayload
): Promise<BodyProfileResponse> {
  const res = await api.put<BodyProfileResponse>("/users/profile/body", payload);
  return res.data;
}

/** PUT /api/users/profile/photo/upload — multipart real photo upload */
export async function uploadProfilePhoto(file: File): Promise<PhotoResponse> {
  const form = new FormData();
  form.append("resim", file);
  const res = await api.put<PhotoResponse>("/users/profile/photo/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

/** PUT /api/users/preferences — notification, city, theme, language */
export async function updatePreferences(
  payload: UpdatePreferencesPayload
): Promise<PreferencesResponse> {
  const res = await api.put<PreferencesResponse>("/users/preferences", payload);
  return res.data;
}

/** PUT /api/auth/change-password */
export async function changePassword(
  payload: ChangePasswordPayload
): Promise<{ mesaj: string }> {
  const res = await api.put<{ mesaj: string }>("/auth/change-password", payload);
  return res.data;
}

/** DELETE /api/auth/me — permanently delete account */
export async function deleteAccount(): Promise<{ mesaj: string }> {
  const res = await api.delete<{ mesaj: string }>("/auth/me");
  return res.data;
}
