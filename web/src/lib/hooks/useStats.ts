"use client";

import { useQuery } from "@tanstack/react-query";
import { getWardrobeStats } from "@/lib/api/stats";

// ── Query keys ────────────────────────────────────────────────────────

export const statsKeys = {
  wardrobe: ["stats", "wardrobe"] as const,
};

// ── Hook ──────────────────────────────────────────────────────────────

/**
 * useWardrobeStats — fetches aggregated wardrobe analytics from
 * GET /api/stats/wardrobe. Stale after 5 minutes; refetches on
 * window focus so the dashboard stays current after the user adds items.
 */
export function useWardrobeStats() {
  return useQuery({
    queryKey: statsKeys.wardrobe,
    queryFn: getWardrobeStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
