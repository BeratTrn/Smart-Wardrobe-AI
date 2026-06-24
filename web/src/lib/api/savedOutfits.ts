import api from "./axios";
import type { SavedOutfitsResponse, SavedOutfit, SaveOutfitPayload } from "@/types";

export async function getSavedOutfits(): Promise<SavedOutfitsResponse> {
  const res = await api.get<SavedOutfitsResponse>("/saved-outfits");
  return res.data;
}

export async function saveOutfit(payload: SaveOutfitPayload): Promise<{ mesaj: string; kombin: SavedOutfit }> {
  const res = await api.post<{ mesaj: string; kombin: SavedOutfit }>("/saved-outfits", payload);
  return res.data;
}

export async function deleteSavedOutfit(id: string): Promise<void> {
  await api.delete(`/saved-outfits/${id}`);
}
