"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import * as itemsApi from "@/lib/api/items";
import type { Item, ItemsResponse } from "@/types";
import type { ItemsFilter, AddItemPayload } from "@/lib/api/items";

// ── Query keys ────────────────────────────────────────────────────────

export const itemKeys = {
  all: ["items"] as const,
  list: (filters: ItemsFilter) => ["items", "list", filters] as const,
  detail: (id: string) => ["items", "detail", id] as const,
};

// ── Fetch item list ───────────────────────────────────────────────────

export function useItems(filters: ItemsFilter = {}) {
  return useQuery({
    queryKey: itemKeys.list(filters),
    queryFn: () => itemsApi.getItems(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes — wardrobe changes infrequently
  });
}

// ── Fetch single item ─────────────────────────────────────────────────

export function useItem(id: string) {
  return useQuery({
    queryKey: itemKeys.detail(id),
    queryFn: () => itemsApi.getItem(id),
    enabled: Boolean(id),
  });
}

// ── Analyse image (CNN) ───────────────────────────────────────────────

export function useAnalyzeItem() {
  return useMutation({
    mutationFn: (file: File) => itemsApi.analyzeItem(file),
  });
}

// ── Add item to wardrobe ──────────────────────────────────────────────

export function useAddItem(onSuccess?: () => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddItemPayload) => itemsApi.addItem(payload),
    onSuccess: () => {
      // Invalidate every items list so the grid refetches fresh data
      qc.invalidateQueries({ queryKey: itemKeys.all });
      onSuccess?.();
    },
  });
}

// ── Toggle favourite (optimistic) ────────────────────────────────────

export function useToggleFavorite() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => itemsApi.toggleFavorite(id),

    onMutate: async (id: string) => {
      // Cancel any in-flight refetches to avoid overwriting our optimistic update
      await qc.cancelQueries({ queryKey: itemKeys.all });

      // Snapshot all active item-list caches for rollback
      const previousQueries = qc.getQueriesData<ItemsResponse>({
        queryKey: itemKeys.all,
      });

      // Flip the favori flag in every cached list
      qc.setQueriesData<ItemsResponse>(
        { queryKey: itemKeys.all },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            kiyafetler: old.kiyafetler.map((item) =>
              item._id === id ? { ...item, favori: !item.favori } : item
            ),
          };
        }
      );

      return { previousQueries };
    },

    onError: (_err, _id, context) => {
      // Roll back to the snapshot on failure
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          qc.setQueryData(key, data);
        }
      }
    },

    onSettled: () => {
      // Always reconcile with the server after mutation resolves
      qc.invalidateQueries({ queryKey: itemKeys.all });
    },
  });
}

// ── Delete item ───────────────────────────────────────────────────────

export function useDeleteItem(onSuccess?: () => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => itemsApi.deleteItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: itemKeys.all });
      onSuccess?.();
    },
  });
}
