"use client";

import { WeatherBanner }      from "@/components/dashboard/WeatherBanner";
import { StatCard }           from "@/components/dashboard/StatCard";
import { CategoryDonutChart } from "@/components/dashboard/CategoryDonutChart";
import { SeasonBarChart }     from "@/components/dashboard/SeasonBarChart";
import { StyleRadarChart }    from "@/components/dashboard/StyleRadarChart";
import { RecentOutfits }      from "@/components/dashboard/RecentOutfits";
import { useWardrobeStats }   from "@/lib/hooks/useStats";
import { useItems }           from "@/lib/hooks/useItems";

function ColourSwatch({ hex }: { hex: string }) {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return null;
  return <span className="h-8 w-8 rounded-full ring-2 ring-white/20 block flex-shrink-0" style={{ backgroundColor: hex }} />;
}

export default function DashboardPage() {
  const { data: stats, isPending: statsLoading } = useWardrobeStats();
  const { data: favData, isPending: favLoading } = useItems({ favori: true, limit: 1 });

  const ozet = stats?.istatistikler?.ozet;
  const loading = statsLoading || favLoading;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.3em] text-gold uppercase mb-1">Overview</p>
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>

      <WeatherBanner />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Items"  value={ozet?.toplamKiyafet ?? 0} sub="in your wardrobe" isLoading={loading} />
        <StatCard label="Favourites"   value={favData?.toplam ?? 0}    sub="marked as fav"    isLoading={loading} />
        <StatCard label="AI Outfits"   value={ozet?.toplamKombin ?? 0} sub="generated"        isLoading={loading} />
        <StatCard label="Top Colour"   value={ozet?.enCokRenk ?? "—"}  isLoading={loading} gold
          accent={ozet?.enCokRenk ? <ColourSwatch hex={ozet.enCokRenk} /> : undefined} />
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <CategoryDonutChart data={stats?.istatistikler?.kategoriDagilimi ?? []} isLoading={loading} />
        </div>
        <div className="lg:col-span-2">
          <SeasonBarChart data={stats?.istatistikler?.mevsimDagilimi ?? []} isLoading={loading} />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <StyleRadarChart data={stats?.istatistikler?.stilDagilimi ?? []} isLoading={loading} />
        </div>
        <div className="lg:col-span-3">
          <RecentOutfits />
        </div>
      </div>
    </div>
  );
}
