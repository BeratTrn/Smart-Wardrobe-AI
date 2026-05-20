"use client";

import { cn } from "@/lib/utils/cn";

// ── Types ─────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  /** Optional sub-label shown below the value */
  sub?: string;
  /** Small decorative element in top-right (e.g. a colour swatch) */
  accent?: React.ReactNode;
  /** Skeleton loading state */
  isLoading?: boolean;
  /** Highlight the value in gold */
  gold?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  sub,
  accent,
  isLoading = false,
  gold = false,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl bg-card border border-border p-5",
        "flex flex-col justify-between gap-3 h-32",
        "shadow-card transition-all duration-300",
        "hover:border-gold/25 hover:shadow-card-lg"
      )}
    >
      {/* Top row: label + optional accent */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold tracking-[0.18em] text-muted uppercase leading-none">
          {label}
        </p>
        {accent && <div className="shrink-0">{accent}</div>}
      </div>

      {/* Value */}
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-8 w-24 skeleton rounded-lg" />
          {sub !== undefined && <div className="h-3 w-16 skeleton rounded" />}
        </div>
      ) : (
        <div className="space-y-0.5">
          <p
            className={cn(
              "text-3xl font-bold leading-none tracking-tight",
              gold ? "text-gold" : "text-text"
            )}
          >
            {value}
          </p>
          {sub && (
            <p className="text-xs text-muted leading-none mt-1">{sub}</p>
          )}
        </div>
      )}

      {/* Subtle gold left border accent on hover */}
      <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full bg-gold/0 group-hover:bg-gold/40 transition-colors" />
    </div>
  );
}
