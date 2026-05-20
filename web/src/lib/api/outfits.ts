import api from "./axios";
import type {
  OutfitsResponse,
  Outfit,
  OutfitRecommendation,
  OutfitGeneratePayload,
  SaveOutfitPayload,
} from "@/types";

export interface OutfitsQuery {
  sayfa?: number;
  limit?: number;
}

export async function getOutfits(query: OutfitsQuery = {}): Promise<OutfitsResponse> {
  const res = await api.get<OutfitsResponse>("/outfits", { params: query });
  return res.data;
}

export async function generateOutfit(
  payload: OutfitGeneratePayload
): Promise<{ mesaj: string; kombinler: OutfitRecommendation[] }> {
  const res = await api.post<{ mesaj: string; kombinler: OutfitRecommendation[] }>(
    "/outfits/generate",
    payload
  );
  return res.data;
}

export async function saveOutfit(
  payload: SaveOutfitPayload
): Promise<{ mesaj: string; kombin: Outfit }> {
  const res = await api.post<{ mesaj: string; kombin: Outfit }>("/outfits", payload);
  return res.data;
}

export async function rateOutfit(
  id: string,
  begeniyor: boolean
): Promise<{ mesaj: string; kombin: Outfit }> {
  const res = await api.patch<{ mesaj: string; kombin: Outfit }>(`/outfits/${id}/feedback`, {
    begeniyor,
  });
  return res.data;
}

export async function deleteOutfit(id: string): Promise<void> {
  await api.delete(`/outfits/${id}`);
}
