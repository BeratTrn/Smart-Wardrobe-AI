import api from "./axios";
import type { SavedOutfit, SavedOutfitsResponse, WeatherData } from "@/types";

// ── Payload ───────────────────────────────────────────────────────────

export interface SaveOutfitPayload {
  baslik: string;
  aciklama: string;
  ipucu?: string;
  havaDurumu?: Pick<WeatherData, "sicaklik" | "durum" | "konum">;
  /** Array of Item _id strings */
  kiyafetler: string[];
  kullaniciFoto?: string;
}

export interface SaveOutfitResponse {
  mesaj: string;
  kombin: SavedOutfit;
}

// ── API calls ─────────────────────────────────────────────────────────

/** POST /api/saved-outfits — bookmark an outfit */
export async function saveOutfit(
  payload: SaveOutfitPayload
): Promise<SaveOutfitResponse> {
  const res = await api.post<SaveOutfitResponse>("/saved-outfits", payload);
  return res.data;
}

/** GET /api/saved-outfits — all bookmarked outfits for the user */
export async function getSavedOutfits(): Promise<SavedOutfitsResponse> {
  const res = await api.get<SavedOutfitsResponse>("/saved-outfits");
  return res.data;
}

/** DELETE /api/saved-outfits/:id */
export async function deleteSavedOutfit(id: string): Promise<void> {
  await api.delete(`/saved-outfits/${id}`);
}
