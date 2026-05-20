import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as travelApi from "@/lib/api/travel";
import type { SuitcaseGeneratePayload } from "@/types";

export const travelKeys = {
  all: ["travel"] as const,
  list: () => ["travel", "list"] as const,
};

export function useSuitcases() {
  return useQuery({
    queryKey: travelKeys.list(),
    queryFn: () => travelApi.getSuitcases(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useGenerateSuitcase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SuitcaseGeneratePayload) =>
      travelApi.generateSuitcase(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: travelKeys.all });
    },
  });
}

export function useDeleteSuitcase(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => travelApi.deleteSuitcase(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: travelKeys.all });
      onSuccess?.();
    },
  });
}
