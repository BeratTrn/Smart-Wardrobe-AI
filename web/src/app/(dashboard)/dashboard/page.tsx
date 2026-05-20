"use client";

import { useWardrobeStats } from "@/lib/hooks/useStats";
import { useItems } from "@/lib/hooks/useItems";
import { WeatherBanner } from "@/components/dashboard/WeatherBanner";
import { StatCard } from "@/components/dashboard/StatCard";
import { CategoryDonutChart } from "@/components/dashboard/CategoryDonutChart";
import { SeasonBarChart } from "@/components/dashboard/SeasonBarChart";
import { StyleRadarChart } from "@/components/dashboard/StyleRadarChart";
import { RecentOutfits } from "@/components/dashboard/RecentOutfits";

// ── Colour swatch for "Top Colour" stat card ──────────────────────────

function ColourSwatch({ hex }: { hex: string }) {
  const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(hex);
  if (!isValidHex) return null;
  return (
    <span
      title={hex}
      className="w-5 h-5 rounded-full border border-border shrink-0 ring-1 ring-offset-1 ring-offset-card ring-border"
      style={{ backgroundColor: hex }}
    />
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: statsData, isLoading: statsLoading } = useWardrobeStats();
  const { data: favData, isLoading: favLoading } = useItems({ favori: true, limit: 1 });

  const stats = statsData?.istatistikler;
  const ozet  = stats?.ozet;

  return (
    <div className="space-y-6 animate-slide-up">

      {/* ── Page header ──────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-semibold tracking-[0.3em] text-gold uppercase mb-1.5">
          Overview
        </p>
        <h2 className="text-2xl font-semibold text-text tracking-tight">
          Analytics
        </h2>
        <p className="text-sm text-text-sub mt-1">
          A real-time view of your wardrobe and AI activity.
        </p>
      </div>

      {/* ── Weather banner ───────────────────────────────────────── */}
      <WeatherBanner />

      {/* ── Stat cards (4-col) ───────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Items"
          value={ozet?.toplamKiyafet ?? "—"}
          sub="in your wardrobe"
          isLoading={statsLoading}
        />
        <StatCard
          label="Favourites"
          value={favData?.toplam ?? "—"}
          sub="items saved"
          isLoading={favLoading}
          gold
        />
        <StatCard
          label="AI Outfits"
          value={ozet?.toplamKombin ?? "—"}
          sub="generated"
          isLoading={statsLoading}
        />
        <StatCard
          label="Top Colour"
          value={ozet?.enCokRenk ?? "—"}
          sub={ozet?.enCokKategori ? `Most worn: ${ozet.enCokKategori}` : undefined}
          isLoading={statsLoading}
          accent={ozet?.enCokRenk ? <ColourSwatch hex={ozet.enCokRenk} /> : undefined}
        />
      </div>

      {/* ── Charts row: Donut + Bar ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ minHeight: 280 }}>
        {/* Category donut — 3/5 */}
        <div className="lg:col-span-3">
          <CategoryDonutChart
            data={stats?.kategoriDagilimi ?? []}
            isLoading={statsLoading}
          />
        </div>
        {/* Season bar — 2/5 */}
        <div className="lg:col-span-2">
          <SeasonBarChart
            data={stats?.mevsimDagilimi ?? []}
            isLoading={statsLoading}
          />
        </div>
      </div>

      {/* ── Bottom row: Radar + Recent outfits ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ minHeight: 280 }}>
        {/* Style radar — 2/5 */}
        <div className="lg:col-span-2">
          <StyleRadarChart
            data={stats?.stilDagilimi ?? []}
            isLoading={statsLoading}
          />
        </div>
        {/* Recent outfits — 3/5 */}
        <div className="lg:col-span-3">
          <RecentOutfits />
        </div>
      </div>

    </div>
  );
}
