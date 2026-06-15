// User (minimal — stored in authStore after login)
export interface User {
  _id: string;
  id?: string;
  ad?: string;
  soyad?: string;
  kullaniciAdi?: string;
  email: string;
  defaultCity?: string;
  avatar?: string;
  profilFoto?: string;
}

// UserProfile (full shape from GET /api/auth/me)
export interface UserTercihler {
  favoriStil: string;
  favoriRenkler: string[];
  bildirimler: boolean;
}

export interface UserVucut {
  sekil: string; // kum_saati | armut | ters_ucgen | dikdortgen
  kalip: string; // slim | regular | oversize
}

export interface NotificationPreferences {
  dailyWeatherAI: boolean;
  travelReminders: boolean;
  weeklyStyle: boolean;
}

export interface UserProfile {
  id: string;
  kullaniciAdi: string;
  email: string;
  profilFoto: string;
  tercihler: UserTercihler;
  vucut: UserVucut;
  cinsiyet?: Cinsiyet;
  defaultCity: string;
  theme: "dark" | "light";
  language: "tr" | "en" | "de" | "fr";
  notificationPreferences: NotificationPreferences;
  createdAt: string;
}

export type BodyShape = "kum_saati" | "armut" | "ters_ucgen" | "dikdortgen";
export type FitPreference = "slim" | "regular" | "oversize";
export type Language = "tr" | "en" | "de" | "fr";
export type Cinsiyet = "Erkek" | "Kadın" | "Belirtilmemiş";

// Auth
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

// Item types
export type ItemCategory =
  | "Üst Giyim"
  | "Alt Giyim"
  | "Elbise"
  | "Dış Giyim"
  | "Ayakkabı"
  | "Aksesuar";

export type Season = "Yaz" | "Kış" | "İlkbahar" | "Sonbahar" | "Tüm Mevsimler";
export type ItemSeason = Season;

export type StyleTag =
  | "Günlük"
  | "Klasik"
  | "Spor"
  | "Sokak"
  | "Minimal"
  | "Şık"
  | "Resmi";
export type ItemStyle = StyleTag;

export interface AnalysisResult {
  kategori: ItemCategory;
  renk: string;
  mevsim: ItemSeason[];
  stil: ItemStyle[];
  confidence?: number;
}

// Kombin önerilerinde (gardırop + web) cinsiyete uygun olmayan parçaları
// filtrelemek için kullanılır. 'Unisex' her zaman önerilebilir.
export type ItemCinsiyet = "Erkek" | "Kadın" | "Unisex";

// Item
export interface Item {
  _id: string;
  ad?: string;
  kategori: ItemCategory;
  renk: string;
  mevsim: Season[];
  stil: StyleTag[];
  cinsiyet?: ItemCinsiyet;
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
  cinsiyet?: ItemCinsiyet;
  marka?: string;
  aciklama?: string;
}

export interface UpdateItemPayload {
  kategori?: string;
  renk?: string;
  mevsim?: Season[];
  stil?: StyleTag[];
  cinsiyet?: ItemCinsiyet;
  marka?: string;
  aciklama?: string;
  favori?: boolean;
}

// Weather
export interface WeatherData {
  sehir: string;
  sicaklik: number;
  hissedilen: number;
  nem: number;
  ruzgar?: number;
  durum: string;
  konum?: string;
}

// Outfit
export interface PopulatedItem extends Item {}

// "Webden Kombin Öner" özelliğinde AI'ın gardırop dışından (web'den) seçtiği ürün
export interface WebProduct {
  ad: string;
  resimUrl: string;
  link: string;
  fiyat: number | null;
  kaynak: string;
}

export interface Outfit {
  _id: string;
  baslik: string;
  aiAciklama: string;
  kiyafetler: PopulatedItem[];
  disUrunler?: WebProduct[];
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
  disUrunler?: WebProduct[];
  havaDurumu?: WeatherData;
  etkinlik?: string;
  aramaSorgusu?: string;
  webUrunSayisi?: number;
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

// Travel
export interface TravelSuitcase {
  _id: string;
  sehir: string;
  baslangicTarihi: string;
  bitisTarihi: string;
  gunSayisi: number;
  havaDurumuOzeti: string;
  havaSicakligi: number | null;
  havaIkonu: string;
  tahminiHava: boolean;
  onerilenkiyafetler: Item[];
  aiAciklamasi: string;
  aiIpucu: string;
  createdAt: string;
  updatedAt: string;
}

export interface SuitcaseGeneratePayload {
  sehir: string;
  baslangicTarihi: string;
  bitisTarihi: string;
}

export interface SuitcasesResponse {
  sayi: number;
  bavullar: TravelSuitcase[];
}
