import api from "./axios";
import type { Item } from "@/types";

export interface StatsOzet {
  toplamKiyafet: number;
  toplamKombin: number;
  enCokRenk: string;
  enCokKategori: string;
}
export interface KategoriItem { ad: string; adet: number; yuzde: number; }
export interface MevsimItem   { mevsim: string; adet: number; }
export interface StilItem     { stil: string; adet: number; }
export interface RenkItem     { renk: string; adet: number; }

export interface WardrobeStatsResponse {
  mesaj: string;
  istatistikler: {
    ozet: StatsOzet;
    kategoriDagilimi: KategoriItem[];
    renkDagilimi: RenkItem[];
    mevsimDagilimi: MevsimItem[];
    stilDagilimi: StilItem[];
    sonEklenenler: Item[];
  };
}

export async function getWardrobeStats(): Promise<WardrobeStatsResponse> {
  const res = await api.get<WardrobeStatsResponse>("/stats/wardrobe");
  return res.data;
}
