/**
 * Stats API — wraps GET /api/stats/wardrobe.
 * Response shape mirrors statsController.js exactly.
 */

import api from "./axios";
import type { Item } from "@/types";

// ── Response shapes ───────────────────────────────────────────────────

export interface StatsOzet {
  toplamKiyafet: number;
  toplamKombin: number;
  enCokRenk: string;
  enCokKategori: string;
}

export interface KategoriItem {
  ad: string;
  adet: number;
  yuzde: number;
}

export interface RenkItem {
  renk: string;
  adet: number;
}

export interface MevsimItem {
  mevsim: string;
  adet: number;
}

export interface StilItem {
  stil: string;
  adet: number;
}

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

// ── API call ──────────────────────────────────────────────────────────

/** GET /api/stats/wardrobe — authenticated */
export async function getWardrobeStats(): Promise<WardrobeStatsResponse> {
  const res = await api.get<WardrobeStatsResponse>("/stats/wardrobe");
  return res.data;
}
