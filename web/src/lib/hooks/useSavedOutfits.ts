"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as savedOutfitsApi from "@/lib/api/savedOutfits";
import type { SaveOutfitPayload } from "@/lib/api/savedOutfits";

// ── Query keys ────────────────────────────────────────────────────────

export const savedOutfitKeys = {
  all:  ["saved-outfits"] as const,
  list: () => ["saved-outfits", "list"] as const,
};

// ── Fetch saved outfits ───────────────────────────────────────────────

export function useSavedOutfits() {
  return useQuery({
    queryKey: savedOutfitKeys.list(),
    queryFn: savedOutfitsApi.getSavedOutfits,
    staleTime: 2 * 60 * 1000,
  });
}

// ── Save (bookmark) an outfit ─────────────────────────────────────────

export function useSaveOutfit(onSuccess?: () => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: SaveOutfitPayload) =>
      savedOutfitsApi.saveOutfit(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: savedOutfitKeys.all });
      onSuccess?.();
    },
  });
}

// ── Delete saved outfit ───────────────────────────────────────────────

export function useDeleteSavedOutfit() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => savedOutfitsApi.deleteSavedOutfit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: savedOutfitKeys.all });
    },
  });
}
