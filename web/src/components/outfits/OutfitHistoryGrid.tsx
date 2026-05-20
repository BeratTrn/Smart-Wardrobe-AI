"use client";

import { OutfitResultCard } from "./OutfitResultCard";
import type { Outfit } from "@/types";

interface OutfitHistoryGridProps {
  outfits: Outfit[];
  onFeedback: (id: string, begeniyor: boolean) => void;
  onSave: (id: string) => void;
  pendingFeedbackId: string | null;
  pendingSaveId: string | null;
}

export function OutfitHistoryGrid({
  outfits,
  onFeedback,
  onSave,
  pendingFeedbackId,
  pendingSaveId,
}: OutfitHistoryGridProps) {
  if (outfits.length === 0) {
    return (
      <div className="text-center py-16 text-muted">
        <p className="text-sm">No outfit history yet. Generate your first outfit above!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
