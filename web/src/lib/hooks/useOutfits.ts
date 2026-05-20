import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as outfitsApi from "@/lib/api/outfits";
import type { OutfitGeneratePayload, SaveOutfitPayload } from "@/types";

export const outfitKeys = {
  all: ["outfits"] as const,
  list: (page: number, limit: number) => ["outfits", "list", page, limit] as const,
};

export function useOutfits(page = 1, limit = 12) {
  return useQuery({
    queryKey: outfitKeys.list(page, limit),
    queryFn: () => outfitsApi.getOutfits({ sayfa: page, limit }),
    staleTime: 2 * 60 * 1000,
  });
}

export function useGenerateOutfit() {
  return useMutation({
    mutationFn: (payload: OutfitGeneratePayload) => outfitsApi.generateOutfit(payload),
  });
}

export function useSaveOutfit(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveOutfitPayload) => outfitsApi.saveOutfit(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: outfitKeys.all });
      onSuccess?.();
    },
  });
}

export function useRateOutfit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, begeniyor }: { id: string; begeniyor: boolean }) =>
      outfitsApi.rateOutfit(id, begeniyor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: outfitKeys.all });
    },
  });
}

export function useDeleteOutfit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => outfitsApi.deleteOutfit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: outfitKeys.all });
    },
  });
}
