"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as outfitsApi from "@/lib/api/outfits";
import type { RecommendPayload, FeedbackPayload } from "@/lib/api/outfits";
import type { OutfitsResponse } from "@/types";

// ── Query keys ────────────────────────────────────────────────────────

export const outfitKeys = {
  all:    ["outfits"] as const,
  list:   () => ["outfits", "list"] as const,
  detail: (id: string) => ["outfits", "detail", id] as const,
};

// ── Outfit history ────────────────────────────────────────────────────

export function useOutfits(sayfa = 1, limit = 10) {
  return useQuery({
    queryKey: [...outfitKeys.list(), sayfa, limit],
    queryFn: () => outfitsApi.getOutfits(sayfa, limit),
    staleTime: 60 * 1000, // 1 minute
  });
}

// ── Generate outfit (Claude AI) ───────────────────────────────────────

export function useRecommendOutfit() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: RecommendPayload) =>
      outfitsApi.recommendOutfit(payload),
    onSuccess: () => {
      // Refresh history so the new outfit appears immediately
      qc.invalidateQueries({ queryKey: outfitKeys.all });
    },
  });
}

// ── Submit feedback (thumbs up / down) ───────────────────────────────

export function useOutfitFeedback() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FeedbackPayload }) =>
      outfitsApi.submitFeedback(id, payload),

    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: outfitKeys.all });

      // Snapshot for rollback
      const previous = qc.getQueriesData<OutfitsResponse>({
        queryKey: outfitKeys.all,
      });

      // Optimistically update `begeniyor` in history cache
      qc.setQueriesData<OutfitsResponse>(
        { queryKey: outfitKeys.all },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            kombinler: old.kombinler.map((o) =>
              o._id === id ? { ...o, begeniyor: payload.begeniyor } : o
            ),
          };
        }
      );

      return { previous };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        for (const [key, data] of ctx.previous) {
          qc.setQueryData(key, data);
        }
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: outfitKeys.all });
    },
  });
}

// ── Delete outfit ─────────────────────────────────────────────────────

export function useDeleteOutfit() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => outfitsApi.deleteOutfit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: outfitKeys.all });
    },
  });
}
