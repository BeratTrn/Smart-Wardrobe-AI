import api from "./axios";
import type {
  Item,
  ItemCategory,
  ItemSeason,
  ItemStyle,
  ItemsResponse,
  AnalysisResult,
} from "@/types";

// ── Query params for GET /api/items ───────────────────────────────────

export interface ItemsFilter {
  kategori?: ItemCategory;
  mevsim?: ItemSeason;
  stil?: ItemStyle;
  favori?: boolean;
  sayfa?: number;
  limit?: number;
}

// ── Response shapes ───────────────────────────────────────────────────

export interface AnalyzeOnlyResponse {
  mesaj: string;
  resimUrl: string;
  cloudinaryId: string;
  analiz: AnalysisResult;
}

export interface AddItemPayload {
  resimUrl: string;
  cloudinaryId: string;
  kategori: ItemCategory;
  renk: string;
  mevsim: ItemSeason;
  stil: ItemStyle;
  marka?: string;
  notlar?: string;
}

export interface AddItemResponse {
  mesaj: string;
  kiyafet: Item;
}

export interface ToggleFavoriteResponse {
  mesaj: string;
  favori: boolean;
}

// ── API calls ─────────────────────────────────────────────────────────

/** GET /api/items — returns paginated, filtered item list */
export async function getItems(filters: ItemsFilter = {}): Promise<ItemsResponse> {
  const res = await api.get<ItemsResponse>("/items", { params: filters });
  return res.data;
}

/** GET /api/items/:id — single item */
export async function getItem(id: string): Promise<Item> {
  const res = await api.get<{ mesaj: string; kiyafet: Item }>(`/items/${id}`);
  return res.data.kiyafet;
}

/**
 * POST /api/items/analyze-only — upload image, get CNN analysis back.
 * Sends multipart/form-data; do NOT set Content-Type manually (Axios handles the boundary).
 */
export async function analyzeItem(file: File): Promise<AnalyzeOnlyResponse> {
  const form = new FormData();
  form.append("resim", file);
  const res = await api.post<AnalyzeOnlyResponse>("/items/analyze-only", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

/** POST /api/items/add — save confirmed item data to wardrobe */
export async function addItem(payload: AddItemPayload): Promise<AddItemResponse> {
  const res = await api.post<AddItemResponse>("/items/add", payload);
  return res.data;
}

/** PATCH /api/items/:id/favorite — toggle favourite flag */
export async function toggleFavorite(id: string): Promise<ToggleFavoriteResponse> {
  const res = await api.patch<ToggleFavoriteResponse>(`/items/${id}/favorite`);
  return res.data;
}

/** DELETE /api/items/:id */
export async function deleteItem(id: string): Promise<void> {
  await api.delete(`/items/${id}`);
}
