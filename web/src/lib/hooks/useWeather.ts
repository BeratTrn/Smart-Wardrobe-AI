"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWeatherByCoords, getWeatherByCity } from "@/lib/api/weather";
import { useAuthStore } from "@/lib/store/authStore";
import type { WeatherData } from "@/types";

// ── Geolocation state ─────────────────────────────────────────────────

interface GeoState {
  lat: number | null;
  lon: number | null;
  /** true once getCurrentPosition has settled (success or error) */
  ready: boolean;
  /** true if the user denied or the API is unavailable */
  denied: boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────

export interface UseWeatherResult {
  weather: WeatherData | null;
  isLoading: boolean;
  isError: boolean;
}

/**
 * useWeather — fetches current weather for the user's location.
 *
 * Strategy:
 *   1. Attempts browser geolocation (getCurrentPosition, 8s timeout).
 *   2. On success → GET /api/weather?enlem=&boylam=
 *   3. On denial / unavailable → GET /api/weather/city?sehir=<defaultCity>
 *      where defaultCity comes from the authenticated user's profile
 *      (falls back to "Istanbul" if not set).
 *
 * Stale time: 10 minutes — weather doesn't change that fast.
 */
export function useWeather(): UseWeatherResult {
  const { user } = useAuthStore();

  const [geo, setGeo] = useState<GeoState>({
    lat: null,
    lon: null,
    ready: false,
    denied: false,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeo({ lat: null, lon: null, ready: true, denied: true });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          ready: true,
          denied: false,
        });
      },
      () => {
        // Permission denied or position unavailable — fall back to city
        setGeo({ lat: null, lon: null, ready: true, denied: true });
      },
      { timeout: 8_000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  // ── Query A: coords ───────────────────────────────────────────────
  const coordsQuery = useQuery({
    queryKey: ["weather", "coords", geo.lat, geo.lon],
    queryFn: () => getWeatherByCoords(geo.lat!, geo.lon!),
    enabled: geo.ready && !geo.denied && geo.lat !== null,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  // ── Query B: city fallback ────────────────────────────────────────
  const fallbackCity = user?.defaultCity ?? "Istanbul";
  const cityQuery = useQuery({
    queryKey: ["weather", "city", fallbackCity],
    queryFn: () => getWeatherByCity(fallbackCity),
    enabled: geo.ready && geo.denied,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  // Whichever path is active
  const active = geo.denied ? cityQuery : coordsQuery;

  return {
    weather: active.data?.havaDurumu ?? null,
    isLoading: !geo.ready || active.isPending,
    isError: active.isError,
  };
}
