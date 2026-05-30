"use client";

import { Luggage } from "lucide-react";
import { SuitcaseCard } from "./SuitcaseCard";
import type { TravelSuitcase } from "@/types";

interface SuitcaseListProps {
  suitcases: TravelSuitcase[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  pendingDeleteId: string | null;
}

export function SuitcaseList({
  suitcases,
  isLoading,
  onDelete,
  pendingDeleteId,
}: SuitcaseListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass rounded-2xl h-56 skeleton" />
        ))}
      </div>
    );
  }

  if (suitcases.length === 0) {
    return (
      <div className="glass rounded-2xl p-14 text-center">
        <Luggage className="h-10 w-10 text-muted mx-auto mb-3" />
        <p className="font-medium text-sm">No saved suitcases yet</p>
        <p className="text-[13px] text-muted mt-1">
          Generate your first packing list above
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {suitcases.map((s) => (
        <SuitcaseCard
          key={s._id}
          suitcase={s}
          onDelete={onDelete}
          isDeleting={pendingDeleteId === s._id}
        />
      ))}
    </div>
  );
}
