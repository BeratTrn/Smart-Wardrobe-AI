import type { Metadata } from "next";

export const metadata: Metadata = { title: "Travel Planner" };

export default function TravelPage() {
  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.3em] text-gold uppercase mb-1.5">
          Pack Smart
        </p>
        <h2 className="text-2xl font-semibold text-text tracking-tight">Travel Planner</h2>
        <p className="text-sm text-text-sub mt-1">
          AI-powered packing lists tailored to your destination and dates.
        </p>
      </div>

      {/* Suitcase form skeleton */}
      <div className="rounded-2xl bg-card border border-border p-6 h-44 skeleton" />

      {/* Saved suitcases */}
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-muted uppercase mb-4">
          Saved Suitcases
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl h-40 skeleton" />
          ))}
        </div>
      </div>
    </div>
  );
}
