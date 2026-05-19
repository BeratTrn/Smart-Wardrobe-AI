import type { Metadata } from "next";

export const metadata: Metadata = { title: "Saved Outfits" };

export default function SavedOutfitsPage() {
  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.3em] text-gold uppercase mb-1.5">
          Bookmarked
        </p>
        <h2 className="text-2xl font-semibold text-text tracking-tight">Saved Outfits</h2>
        <p className="text-sm text-text-sub mt-1">
          Your curated collection of favourite AI-generated looks.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl h-56 skeleton" />
        ))}
      </div>
    </div>
  );
}
