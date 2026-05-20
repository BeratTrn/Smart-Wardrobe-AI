"use client";

import { useCallback, useState } from "react";
import { BookmarkCheck } from "lucide-react";
import { OutfitResultCard } from "@/components/outfits/OutfitResultCard";
import { useSavedOutfits, useDeleteSavedOutfit } from "@/lib/hooks/useSavedOutfits";
import { getErrorMessage } from "@/lib/utils/errors";

// ── Skeleton ──────────────────────────────────────────────────────────

function SavedSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="space-y-1.5">
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="skeleton h-3 w-1/3 rounded" />
      </div>
      <div className="skeleton h-12 w-full rounded-xl" />
      <div className="space-y-2">
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-4/5 rounded" />
      </div>
      <div className="flex gap-2.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton w-24 h-32 rounded-xl shrink-0" />
        ))}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────

function EmptySaved() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
        <BookmarkCheck size={28} className="text-gold/50" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold text-text">No saved outfits yet</p>
        <p className="text-xs text-muted max-w-xs leading-relaxed">
          Generate an AI outfit on the Outfits page and tap the bookmark
          icon to save it here.
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function SavedOutfitsPage() {
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useSavedOutfits();
  const deleteOutfit = useDeleteSavedOutfit();

  const handleRemove = useCallback(
    (id: string) => {
      if (!window.confirm("Remove this saved outfit?")) return;
      setPendingRemoveId(id);
      deleteOutfit.mutate(id, {
        onSettled: () => setPendingRemoveId(null),
      });
    },
    [deleteOutfit]
  );

  const outfits = data?.kombinler ?? [];

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-text">Saved Outfits</h1>
        {!isLoading && (
          <p className="text-sm text-muted mt-0.5">
            {data?.toplam ?? 0} bookmarked outfit
            {(data?.toplam ?? 0) !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* ── Error ────────────────────────────────────────────────── */}
      {isError && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {getErrorMessage(error)}
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────── */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SavedSkeleton key={i} />
          ))}
        </div>
      )}

      {/* ── Empty ────────────────────────────────────────────────── */}
      {!isLoading && outfits.length === 0 && !isError && <EmptySaved />}

      {/* ── Grid ─────────────────────────────────────────────────── */}
      {!isLoading && outfits.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {outfits.map((outfit) => (
            <OutfitResultCard
              key={outfit._id}
              outfit={outfit as unknown as Parameters<typeof OutfitResultCard>[0]["outfit"]}
              showActions={false}
              showRemove
              onRemove={handleRemove}
              isRemoveLoading={pendingRemoveId === outfit._id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
