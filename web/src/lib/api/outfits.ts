import api from "./axios";
import type {
  Outfit,
  OutfitRecommendation,
  OutfitsResponse,
} from "@/types";

// ── Payloads ──────────────────────────────────────────────────────────

export interface RecommendPayload {
  etkinlik: string;
  sehir?: string;
  enlem?: number;
  boylam?: number;
}

export interface FeedbackPayload {
  begeniyor: boolean;
}

// ── Response shapes ───────────────────────────────────────────────────

export interface RecommendResponse {
  mesaj: string;
  kombin: OutfitRecommendation;
}

export interface FeedbackResponse {
  mesaj: string;
}

// ── API calls ─────────────────────────────────────────────────────────

/**
 * POST /api/outfits/recommend
 * Sends event + optional city to Claude AI; returns a fresh recommendation.
 * NOTE: response shape differs from stored Outfit docs (uses `id`/`aciklama`).
 */
export async function recommendOutfit(
  payload: RecommendPayload
): Promise<RecommendResponse> {
  const res = await api.post<RecommendResponse>("/outfits/recommend", payload);
  return res.data;
}

/**
 * GET /api/outfits — paginated outfit history
 * Returns stored Outfit documents with kiyafetler populated.
 */
export async function getOutfits(
  sayfa = 1,
  limit = 10
): Promise<OutfitsResponse> {
  const res = await api.get<OutfitsResponse>("/outfits", {
    params: { sayfa, limit },
  });
  return res.data;
}

/**
 * PUT /api/outfits/:id/feedback
 * Records a thumbs-up or thumbs-down for a generated outfit.
 */
export async function submitFeedback(
  id: string,
  payload: FeedbackPayload
): Promise<FeedbackResponse> {
  const res = await api.put<FeedbackResponse>(
    `/outfits/${id}/feedback`,
    payload
  );
  return res.data;
}

/** DELETE /api/outfits/:id */
export async function deleteOutfit(id: string): Promise<void> {
  await api.delete(`/outfits/${id}`);
}
