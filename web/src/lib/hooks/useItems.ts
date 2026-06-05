import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as itemsApi from "@/lib/api/items";
import type { ItemsFilter, AddItemPayload } from "@/lib/api/items";

export const itemKeys = {
  all: ["items"] as const,
  list: (q: ItemsFilter) => ["items", "list", q] as const,
  detail: (id: string) => ["items", "detail", id] as const,
};

export function useItems(query: ItemsFilter = {}) {
  return useQuery({
    queryKey: itemKeys.list(query),
    queryFn: () => itemsApi.getItems(query),
    staleTime: 2 * 60 * 1000,
  });
}

export function useItem(id: string) {
  return useQuery({ queryKey: itemKeys.detail(id), queryFn: () => itemsApi.getItem(id), enabled: !!id });
}

export function useAnalyzeItem() {
  return useMutation({ mutationFn: (file: File) => itemsApi.analyzeItem(file) });
}

export function useAddItem(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddItemPayload) => itemsApi.addItem(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: itemKeys.all });
      qc.invalidateQueries({ queryKey: ["stats"] });
      onSuccess?.();
    },
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => itemsApi.toggleFavorite(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: itemKeys.all }); },
  });
}

export function useDeleteItem(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => itemsApi.deleteItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: itemKeys.all });
      qc.invalidateQueries({ queryKey: ["stats"] });
      onSuccess?.();
    },
  });
}
