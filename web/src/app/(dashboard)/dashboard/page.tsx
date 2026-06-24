"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Shirt } from "lucide-react";
import { WeatherBanner }      from "@/components/dashboard/WeatherBanner";
import { StilProfilin }       from "@/components/dashboard/StilProfilin";
import { RecentOutfits }      from "@/components/dashboard/RecentOutfits";
import { useWardrobeStats }   from "@/lib/hooks/useStats";
import { useItems }           from "@/lib/hooks/useItems";
import { useT } from "@/lib/i18n";

const S = "var(--color-bg)";
const C = "var(--color-surface)";
const B = "1px solid var(--color-border)";
const A = "1px solid var(--color-gold-border)";

const CAT_TEXT: Record<string, string> = {
  "Üst Giyim":     "#7EB3E0",
  "Alt Giyim":     "#B07EE0",
  "Elbise":        "#E07EB0",
  "Dış Giyim":     "#90C490",
  "Ayakkabı":      "#E0B07E",
  "Aksesuar":      "#7EE0B0",
};

function ColourSwatch({ hex }: { hex: string }) {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return null;
  return (
    <span
      className="h-7 w-7 rounded-full ring-2 ring-white/15 block flex-shrink-0"
      style={{ backgroundColor: hex, boxShadow: `${hex}55 0 0 10px 0` }}
    />
  );
}

function SonEklenenler() {
  const { t } = useT();
  const { data, isPending } = useItems({ limit: 6 } as any);
  const items = (data?.kiyafetler ?? []) as any[];

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-base font-bold text-text">{t("home.recent_items")}</p>
        <Link
          href="/wardrobe"
          className="flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity"
          style={{ color: "var(--color-gold)", border: "1px solid var(--color-gold-border)" }}
        >
          {t("home.see_all")} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {isPending ? (
        <div className="flex gap-4 overflow-hidden">
          {[1,2,3,4,5].map((i) => <div key={i} className="skeleton h-56 w-40 rounded-2xl flex-shrink-0" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <Shirt className="h-8 w-8 text-muted/40 mx-auto mb-3" />
          <p className="text-sm text-muted mb-1">{t("home.empty_items")}</p>
          <Link href="/wardrobe" className="text-[12px] text-gold hover:underline">{t("web.dashboard.add_item_cta")}</Link>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-4 snap-x">
          {items.map((item: any) => (
            <Link
              key={item._id}
              href="/wardrobe"
              className="group relative flex-shrink-0 w-[140px] rounded-[20px] overflow-hidden cursor-pointer snap-start"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              {/* Image container */}
              <div className="relative aspect-square" style={{ background: "#F4F4F4" }}>
                <Image
                  src={item.resimUrl}
                  alt={item.kategori}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="140px"
                />
                {/* Color Dot top-left */}
                {item.renk && (
                  <div className="absolute top-2 left-2 h-3 w-3 rounded-full ring-2 ring-white/50" style={{ backgroundColor: item.renk.toLowerCase() }} />
                )}
              </div>
              
              {/* Content below image */}
              <div className="p-3">
                <p className="text-[13px] font-bold text-text leading-tight mb-0.5 truncate">{item.ad || t("add_item.garment")}</p>
                <p className="text-[11px]" style={{ color: CAT_TEXT[item.kategori] ?? "var(--color-gold)" }}>{item.kategori}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isPending: statsLoading } = useWardrobeStats();
  const { data: favData, isPending: favLoading } = useItems({ favori: true, limit: 1 });

  const ozet    = stats?.istatistikler?.ozet;
  const loading = statsLoading || favLoading;

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Weather - Keeping it for now but simplified or we let the topbar handle it. Actually mobile has it in topbar. Let's remove WeatherBanner from here if we move it to Topbar, but for now let's just remove StatCards */}

      {/* AI Recommended Outfits */}
      <RecentOutfits />

      {/* Style profile */}
      <div className="max-w-2xl mx-auto">
        <StilProfilin data={stats?.istatistikler?.stilDagilimi ?? []} isLoading={loading} />
      </div>

      {/* Recently added items */}
      <SonEklenenler />

    </div>
  );
}
