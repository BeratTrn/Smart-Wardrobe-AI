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
  renk: string; // HEX string e.g. "#2D405C"
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

// ── AI Analyse Result ─────────────────────────────────────────────────

export interface AnalysisResult {
  kategori: ItemCategory;
  renk: string;
  aiDogrulandi: boolean;
}

// ── Outfit ────────────────────────────────────────────────────────────

export interface Outfit {
  _id: string;
  kullanici: string;
  etkinlik: string;
  kombinAciklamasi: string;
  kiyafetler: Item[];
  havaDurumu?: WeatherData;
  puan?: number;
  createdAt: string;
  updatedAt: string;
}

// ── Saved Outfit ──────────────────────────────────────────────────────

export interface SavedOutfit {
  _id: string;
  kullanici: string;
  baslik: string;
  aciklama: string;
  havaDurumu?: WeatherData;
  kiyafetler: Item[];
  createdAt: string;
  updatedAt: string;
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
  baslangicTarihi: string; // ISO 8601
  bitisTarihi: string;     // ISO 8601
  kiyafetler: Item[];
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
  kombinler: Outfit[];
}

export interface StatsResponse {
  mesaj: string;
  istatistikler: WardrobeStats;
}
