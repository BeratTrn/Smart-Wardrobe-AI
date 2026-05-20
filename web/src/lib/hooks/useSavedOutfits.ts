import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as savedOutfitsApi from "@/lib/api/savedOutfits";
import type { SaveOutfitPayload } from "@/types";

export const savedOutfitKeys = {
  all: ["saved-outfits"] as const,
};

export function useSavedOutfits() {
  return useQuery({
    queryKey: savedOutfitKeys.all,
    queryFn: () => savedOutfitsApi.getSavedOutfits(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useSaveToCollection(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveOutfitPayload) => savedOutfitsApi.saveOutfit(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: savedOutfitKeys.all });
      onSuccess?.();
    },
  });
}

export function useDeleteSavedOutfit(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => savedOutfitsApi.deleteSavedOutfit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: savedOutfitKeys.all });
      onSuccess?.();
    },
  });
}
