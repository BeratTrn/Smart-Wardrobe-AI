import api from "./axios";
import type { OutfitsResponse, Outfit, OutfitRecommendation, OutfitGeneratePayload, SavedOutfit } from "@/types";

export interface SaveToArchivePayload {
  baslik: string;
  aciklama: string;
  ipucu?: string;
  havaDurumu?: Record<string, unknown>;
  kiyafetler: string[];
}

export interface OutfitsQuery { sayfa?: number; limit?: number; }

export async function getOutfits(query: OutfitsQuery = {}): Promise<OutfitsResponse> {
  const res = await api.get<OutfitsResponse>("/outfits", { params: query });
  return res.data;
}

export async function generateOutfit(payload: OutfitGeneratePayload): Promise<{ mesaj: string; kombin: OutfitRecommendation }> {
  const res = await api.post<{ mesaj: string; kombin: OutfitRecommendation }>("/outfits/recommend", payload);
  return res.data;
}

export async function saveOutfitToArchive(payload: SaveToArchivePayload): Promise<{ mesaj: string; kombin: SavedOutfit }> {
  const res = await api.post<{ mesaj: string; kombin: SavedOutfit }>("/saved-outfits", payload);
  return res.data;
}

export async function rateOutfit(id: string, begeniyor: boolean): Promise<{ mesaj: string; kombin: Outfit }> {
  const res = await api.patch<{ mesaj: string; kombin: Outfit }>(`/outfits/${id}/feedback`, { begeniyor });
  return res.data;
}

export async function deleteOutfit(id: string): Promise<void> {
  await api.delete(`/outfits/${id}`);
}
