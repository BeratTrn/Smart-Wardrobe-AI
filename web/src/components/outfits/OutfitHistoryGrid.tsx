"use client";

import { OutfitResultCard } from "./OutfitResultCard";
import type { Outfit } from "@/types";

// ── Skeleton ──────────────────────────────────────────────────────────

function HistorySkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="space-y-2">
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="skeleton h-3 w-1/3 rounded" />
      </div>
      <div className="skeleton h-12 w-full rounded-xl" />
      <div className="space-y-2">
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-4/5 rounded" />
        <div className="skeleton h-3 w-3/5 rounded" />
      </div>
      <div className="flex gap-2.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton w-24 h-32 rounded-xl shrink-0" />
        ))}
      </div>
      <div className="flex gap-2 pt-1 border-t border-border/60">
        <div className="skeleton h-8 w-20 rounded-lg" />
        <div className="skeleton h-8 w-20 rounded-lg" />
        <div className="skeleton h-8 w-20 rounded-lg ml-auto" />
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────

function EmptyHistory() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center text-2xl">
        ✨
      </div>
      <p className="text-sm font-medium text-text">No outfit history yet</p>
      <p className="text-xs text-muted max-w-xs">
        Generate your first AI outfit above and it will appear here.
      </p>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────

interface OutfitHistoryGridProps {
  outfits: Outfit[];
  isLoading: boolean;
  onFeedback: (id: string, begeniyor: boolean) => void;
  onSave: (id: string) => void;
  pendingFeedbackId?: string | null;
  pendingSaveId?: string | null;
}

// ── Component ─────────────────────────────────────────────────────────

export function OutfitHistoryGrid({
  outfits,
  isLoading,
  onFeedback,
  onSave,
  pendingFeedbackId,
  pendingSaveId,
}: OutfitHistoryGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <HistorySkeleton key={i} />
        ))}
      </div>
    );
  }

  if (outfits.length === 0) {
    return <EmptyHistory />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {outfits.map((outfit) => (
        <OutfitResultCard
          key={outfit._id}
          outfit={outfit}
          showActions
          onFeedback={onFeedback}
          onSave={onSave}
          isFeedbackLoading={pendingFeedbackId === outfit._id}
          isSaveLoading={pendingSaveId === outfit._id}
        />
      ))}
    </div>
  );
}
