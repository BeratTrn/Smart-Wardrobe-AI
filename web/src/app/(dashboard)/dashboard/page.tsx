import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Dashboard Page — Phase 1 Placeholder
 *
 * Renders the skeleton layout that demonstrates the theme system and
 * grid proportions. Real data (charts, stat cards) are wired in Phase 4.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-slide-up">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-semibold tracking-[0.3em] text-gold uppercase mb-1.5">
          Overview
        </p>
        <h2 className="text-2xl font-semibold text-text tracking-tight">
          Good morning
        </h2>
        <p className="text-sm text-text-sub mt-1">
          Your wardrobe analytics and AI insights are ready.
        </p>
      </div>

      {/* ── Stat Cards (4-column) ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {(
          [
            { label: "Total Items",        value: "—" },
            { label: "AI Outfits",         value: "—" },
            { label: "Favourites",         value: "—" },
            { label: "AI Uses This Month", value: "—" },
          ] as const
        ).map(({ label, value }) => (
          <div
            key={label}
            className="rounded-2xl bg-card border border-border p-5 h-28 flex flex-col justify-between shadow-card"
          >
            <p className="text-xs text-muted font-medium tracking-wide">{label}</p>
            <p className="text-3xl font-semibold text-text-sub">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Charts Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Category Donut — 2/3 width */}
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-6 h-64 flex flex-col">
          <p className="text-xs font-semibold tracking-[0.2em] text-muted uppercase mb-4">
            Category Distribution
          </p>
          <div className="flex-1 skeleton rounded-xl" />
        </div>

        {/* Season Bar — 1/3 width */}
        <div className="rounded-2xl bg-card border border-border p-6 h-64 flex flex-col">
          <p className="text-xs font-semibold tracking-[0.2em] text-muted uppercase mb-4">
            By Season
          </p>
          <div className="flex-1 skeleton rounded-xl" />
        </div>
      </div>

      {/* ── Style Radar + Recent Outfits Row ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Style Radar */}
        <div className="rounded-2xl bg-card border border-border p-6 h-60 flex flex-col">
          <p className="text-xs font-semibold tracking-[0.2em] text-muted uppercase mb-4">
            Style Profile
          </p>
          <div className="flex-1 skeleton rounded-xl" />
        </div>

        {/* Recent AI Outfits */}
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-6 h-60 flex flex-col">
          <p className="text-xs font-semibold tracking-[0.2em] text-muted uppercase mb-4">
            Recent AI Outfits
          </p>
          <div className="flex gap-3 flex-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex-1 skeleton rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
