// ── User ─────────────────────────────────────────────────────────────────────
export interface User {
  _id: string;
  ad: string;
  soyad: string;
  email: string;
  defaultCity?: string;
  avatar?: string;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginPayload {
  email: string;
  sifre: string;
}

export interface RegisterPayload {
  ad: string;
  soyad: string;
  email: string;
  sifre: string;
}

export interface AuthResponse {
  mesaj: string;
  token: string;
  kullanici: User;
}

export interface OtpVerifyPayload {
  email: string;
  otp: string;
}

// ── Item types ────────────────────────────────────────────────────────────────
export type ItemCategory =
  | "Üst Giyim"
  | "Alt Giyim"
  | "Elbise & Etek"
  | "Dış Giyim"
  | "Ayakkabı"
  | "Aksesuar";

export type Season = "Yaz" | "Kış" | "İlkbahar" | "Sonbahar" | "Tüm Mevsimler";
export type ItemSeason = Season;

export type StyleTag =
  | "Günlük"
  | "Spor"
  | "Şık"
  | "Klasik"
  | "Bohem"
  | "Minimalist"
  | "Vintage"
  | "Sokak Stili";
export type ItemStyle = StyleTag;

export interface AnalysisResult {
  kategori: ItemCategory;
  renk: string;
  mevsim: ItemSeason[];
  stil: ItemStyle[];
  confidence?: number;
}

// ── Item ─────────────────────────────────────────────────────────────────────
export interface Item {
  _id: string;
  kategori: ItemCategory;
  renk: string;
  mevsim: Season[];
  stil: StyleTag[];
  marka?: string;
  aciklama?: string;
  resimUrl: string;
  cloudinaryId?: string;
  favori: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ItemsResponse {
  mesaj: string;
  toplam: number;
  sayfa: number;
  limit: number;
  kiyafetler: Item[];
}

export interface AddItemPayload {
  kategori: string;
  renk: string;
  mevsim: Season[];
  stil: StyleTag[];
  marka?: string;
  aciklama?: string;
}

export interface UpdateItemPayload {
  kategori?: string;
  renk?: string;
  mevsim?: Season[];
  stil?: StyleTag[];
  marka?: string;
  aciklama?: string;
  favori?: boolean;
}

// ── Weather ──────────────────────────────────────────────────────────────────
export interface WeatherData {
  sehir: string;
  sicaklik: number;
  hissedilen: number;
  nem: number;
  durum: string;
  konum?: string;
}

// ── Outfit ────────────────────────────────────────────────────────────────────
export interface PopulatedItem extends Item {}

export interface Outfit {
  _id: string;
  baslik: string;
  aiAciklama: string;
  kiyafetler: PopulatedItem[];
  havaDurumu?: WeatherData;
  etkinlik?: string;
  begeniyor?: boolean | null;
  kaydedildi?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OutfitRecommendation {
  id: string;
  baslik: string;
  aciklama: string;
  ipucu: string;
  kiyafetler: PopulatedItem[];
  havaDurumu?: WeatherData;
  etkinlik?: string;
}

export interface OutfitGeneratePayload {
  mevsim?: Season;
  etkinlik?: string;
  havaDurumu?: WeatherData;
}

export interface OutfitsResponse {
  mesaj: string;
  toplam: number;
  sayfa: number;
  kombinler: Outfit[];
}

export interface SavedOutfit {
  _id: string;
  kombId: Outfit;
  createdAt: string;
}

export interface SavedOutfitsResponse {
  mesaj: string;
  toplam: number;
  kombinler: SavedOutfit[];
}

export interface SaveOutfitPayload {
  baslik: string;
  aiAciklama: string;
  kiyafetler: string[];
  havaDurumu?: WeatherData;
  etkinlik?: string;
}
