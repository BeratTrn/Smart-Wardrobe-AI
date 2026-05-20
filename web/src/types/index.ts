/* ═══════════════════════════════════════════════════════════════════════
   SMART WARDROBE AI — Shared TypeScript Interfaces
   All types mirror the Node.js/MongoDB models exactly.
   ═══════════════════════════════════════════════════════════════════════ */

// ── User ──────────────────────────────────────────────────────────────

export interface UserPreferences {
  favoriStil: string;
  favoriRenkler: string[];
  bildirimler: boolean;
}

export interface UserBody {
  sekil: string; // kum_saati | armut | ters_ucgen | dikdortgen
  kalip: string; // slim | regular | oversize
}

export interface NotificationPreferences {
  dailyWeatherAI: boolean;
  travelReminders: boolean;
  weeklyStyle: boolean;
}

export interface User {
  _id: string;
  kullaniciAdi: string;
  email: string;
  profilFoto: string;
  tercihler: UserPreferences;
  vucut: UserBody;
  googleId: string | null;
  defaultCity: string;
  theme: "dark" | "light";
  language: "tr" | "en" | "de" | "fr";
  notificationPreferences: NotificationPreferences;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Clothing Item ─────────────────────────────────────────────────────

export type ItemCategory =
  | "Üst Giyim"
  | "Alt Giyim"
  | "Elbise & Etek"
  | "Dış Giyim"
  | "Ayakkabı"
  | "Aksesuar";

export type ItemSeason =
  | "İlkbahar"
  | "Yaz"
  | "Sonbahar"
  | "Kış"
  | "Tüm Mevsimler";

export type ItemStyle =
  | "Günlük"
  | "Klasik"
  | "Spor"
  | "Sokak"
  | "Minimal"
  | "Şık"
  | "Resmi";

export interface Item {
  _id: string;
  kullanici: string;
  resimUrl: string;
  cloudinaryId: string;
  kategori: ItemCategory;
  renk: string; // HEX e.g. "#2D405C"
  mevsim: ItemSeason;
  stil: ItemStyle;
  marka: string;
  notlar: string;
  aiDogrulandi: boolean;
  favori: boolean;
  kullanilmaSayisi: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Partial Item shape returned by populated outfit queries.
 * Backend projects: resimUrl renk kategori stil marka (mevsim in some routes)
 */
export interface PopulatedItem
  extends Pick<Item, "_id" | "resimUrl" | "renk" | "kategori" | "stil"> {
  mevsim?: ItemSeason;
  marka?: string;
}

// ── AI Analyse Result ─────────────────────────────────────────────────

export interface AnalysisResult {
  kategori: ItemCategory;
  renk: string;
  aiDogrulandi: boolean;
}

// ── Weather ───────────────────────────────────────────────────────────

export interface WeatherData {
  sicaklik: number;
  durum: string;
  konum: string;
  hissedilen?: number;
  nem?: number;
  icon?: string;
}

// ── Outfit (AI-generated, stored in DB) ──────────────────────────────

export interface OutfitContext {
  etkinlik: string;
  havaDurumu?: {
    sicaklik: number;
    durum: string;
    nem?: number;
    konum: string;
  };
}

/** Full Outfit document as returned by GET /api/outfits */
export interface Outfit {
  _id: string;
  kullanici: string;
  baslik: string;
  kiyafetler: PopulatedItem[];
  aiAciklama: string;
  baglam: OutfitContext;
  begeniyor: boolean | null; // null = not yet rated
  kaydedildi: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Custom response shape returned ONLY by POST /api/outfits/recommend.
 * Different from the stored Outfit doc — uses `id` and `aciklama`.
 */
export interface OutfitRecommendation {
  id: string;
  baslik: string;
  aciklama: string;
  ipucu: string;
  kiyafetler: Item[]; // fully populated here
  havaDurumu: WeatherData;
  etkinlik: string;
}

// ── Saved Outfit ──────────────────────────────────────────────────────

export interface SavedOutfit {
  _id: string;
  kullanici: string;
  baslik: string;
  aciklama: string;
  ipucu: string;
  havaDurumu?: Pick<WeatherData, "sicaklik" | "durum" | "konum">;
  kiyafetler: PopulatedItem[];
  kullaniciFoto: string;
  createdAt: string;
  updatedAt: string;
}

// ── Wardrobe Stats ────────────────────────────────────────────────────

export interface StatBucket {
  _id: string;
  sayi: number;
}

export interface WardrobeStats {
  toplamKiyafet: number;
  favoriSayisi: number;
  kategoriler: StatBucket[];
  mevsimler: StatBucket[];
  stiller: StatBucket[];
  renkler?: StatBucket[];
}

// ── Travel Suitcase ───────────────────────────────────────────────────

export interface TravelSuitcase {
  _id: string;
  kullanici: string;
  sehir: string;
  baslangicTarihi: string;
  bitisTarihi: string;
  kiyafetler: PopulatedItem[];
  notlar: string;
  createdAt: string;
  updatedAt: string;
}

// ── API Response Envelopes ────────────────────────────────────────────

export interface ApiError {
  mesaj: string;
  requiresVerification?: boolean;
  email?: string;
}

export interface AuthResponse {
  mesaj: string;
  token: string;
  kullanici: User;
}

export interface ItemsResponse {
  mesaj: string;
  toplam: number;
  kiyafetler: Item[];
}

export interface OutfitsResponse {
  mesaj: string;
  toplam: number;
  sayfa: number;
  kombinler: Outfit[];
}

export interface SavedOutfitsResponse {
  mesaj: string;
  toplam: number;
  kombinler: SavedOutfit[];
}

export interface StatsResponse {
  mesaj: string;
  istatistikler: WardrobeStats;
}
