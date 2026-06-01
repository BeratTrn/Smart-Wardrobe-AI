import { useQuery } from "@tanstack/react-query";
import { getWardrobeStats } from "@/lib/api/stats";

export function useWardrobeStats() {
  return useQuery({
    queryKey: ["stats", "wardrobe"],
    queryFn: getWardrobeStats,
    staleTime: 0,
  });
}
