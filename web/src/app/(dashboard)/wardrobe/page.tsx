import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Wardrobe" };

export default function WardrobePage() {
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.3em] text-gold uppercase mb-1.5">
            Collection
          </p>
          <h2 className="text-2xl font-semibold text-text tracking-tight">My Wardrobe</h2>
        </div>
        {/* Add Item button — wired in Phase 2 */}
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-gradient text-black text-sm font-semibold shadow-card hover:opacity-90 transition-opacity"
          disabled
        >
          + Add Item
        </button>
      </div>

      {/* Filter bar skeleton */}
      <div className="flex gap-2">
        {[80, 96, 88, 76, 92].map((w, i) => (
          <div key={i} className="h-9 rounded-xl skeleton" style={{ width: w }} />
        ))}
      </div>

      {/* Item grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] rounded-2xl skeleton" />
        ))}
      </div>
    </div>
  );
}
