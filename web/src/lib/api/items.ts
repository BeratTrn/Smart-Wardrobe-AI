import api from "./axios";
import type {
  Item,
  ItemCategory,
  ItemSeason,
  ItemStyle,
  ItemCinsiyet,
  ItemsResponse,
  AnalysisResult,
} from "@/types";

// Query params for GET /api/items

export interface ItemsFilter {
  kategori?: ItemCategory;
  mevsim?: ItemSeason;
  stil?: ItemStyle;
  favori?: boolean;
  sayfa?: number;
  limit?: number;
}

// Response shapes

export interface AnalyzeOnlyResponse {
  mesaj: string;
  resimUrl: string;
  cloudinaryId: string;
  analiz: AnalysisResult;
}

export interface AddItemPayload {
  file: File;
  ad?: string;
  kategori: ItemCategory;
  renk: string;
  mevsim: ItemSeason;
  stil: ItemStyle;
  cinsiyet?: ItemCinsiyet;
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

// API calls

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

/** POST /api/items/add — multipart/form-data (mobil ile aynı akış) */
export async function addItem(payload: AddItemPayload): Promise<AddItemResponse> {
  const form = new FormData();
  form.append("resim", payload.file);
  if (payload.ad) form.append("ad", payload.ad);
  form.append("kategori", payload.kategori);
  form.append("renk", payload.renk);
  form.append("mevsim", payload.mevsim);
  form.append("stil", payload.stil);
  if (payload.cinsiyet) form.append("cinsiyet", payload.cinsiyet);
  if (payload.marka)  form.append("marka",  payload.marka);
  if (payload.notlar) form.append("notlar", payload.notlar);

  const res = await api.post<AddItemResponse>("/items/add", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
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
