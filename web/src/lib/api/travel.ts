import api from "./axios";
import type { TravelSuitcase, SuitcaseGeneratePayload, SuitcasesResponse } from "@/types";

/** POST /api/travel/pack — AI-generates a suitcase from wardrobe + weather */
export async function generateSuitcase(
  payload: SuitcaseGeneratePayload
): Promise<{ mesaj: string; bavul: TravelSuitcase }> {
  const res = await api.post<{ mesaj: string; bavul: TravelSuitcase }>("/travel/pack", payload);
  return res.data;
}

/** GET /api/travel — all saved suitcases for the current user */
export async function getSuitcases(): Promise<SuitcasesResponse> {
  const res = await api.get<SuitcasesResponse>("/travel");
  return res.data;
}

/** DELETE /api/travel/:id */
export async function deleteSuitcase(id: string): Promise<void> {
  await api.delete(`/travel/${id}`);
}
