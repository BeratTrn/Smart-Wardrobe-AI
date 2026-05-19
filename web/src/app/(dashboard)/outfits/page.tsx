import type { Metadata } from "next";

export const metadata: Metadata = { title: "AI Outfits" };

export default function OutfitsPage() {
  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.3em] text-gold uppercase mb-1.5">
          Styled by AI
        </p>
        <h2 className="text-2xl font-semibold text-text tracking-tight">AI Outfits</h2>
        <p className="text-sm text-text-sub mt-1">
          Generate a personalised outfit for any occasion.
        </p>
      </div>

      {/* Generator panel skeleton */}
      <div className="rounded-2xl bg-card border border-border p-6 h-40 skeleton" />

      {/* History grid skeleton */}
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-muted uppercase mb-4">
          History
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl h-52 skeleton" />
          ))}
        </div>
      </div>
    </div>
  );
}
