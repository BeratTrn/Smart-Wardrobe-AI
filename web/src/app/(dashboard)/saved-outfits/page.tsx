"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { OutfitResultCard } from "@/components/outfits/OutfitResultCard";
import { useSavedOutfits, useDeleteSavedOutfit } from "@/lib/hooks/useSavedOutfits";
import type { Outfit } from "@/types";

export default function SavedOutfitsPage() {
  const { data, isPending } = useSavedOutfits();
  const deleteSaved = useDeleteSavedOutfit();
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  const handleRemove = (id: string) => {
    setPendingRemoveId(id);
    deleteSaved.mutate(id, { onSettled: () => setPendingRemoveId(null) });
  };

  const outfits = data?.kombinler ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Bookmark className="h-6 w-6 text-gold" />
        <div>
          <h1 className="text-2xl font-bold">Saved Outfits</h1>
          <p className="text-sm text-muted mt-0.5">Your curated collection of favourite looks</p>
        </div>
      </div>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1,2,3,4,5,6].map((i) => <div key={i} className="glass rounded-2xl p-5 space-y-3"><div className="skeleton h-4 w-2/3 rounded" /><div className="skeleton h-3 w-full rounded" /></div>)}
        </div>
      ) : outfits.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <Bookmark className="h-10 w-10 text-muted mx-auto mb-4" />
          <p className="font-medium">No saved outfits yet</p>
          <p className="text-sm text-muted mt-1">Save outfits you love from the <a href="/outfits" className="text-gold hover:underline">Outfits page</a></p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {outfits.map((saved) => (
            <OutfitResultCard key={saved._id} outfit={saved.kombId as unknown as Outfit}
              showRemove onRemove={handleRemove} isRemoveLoading={pendingRemoveId === saved._id} />
          ))}
        </div>
      )}
    </div>
  );
}
