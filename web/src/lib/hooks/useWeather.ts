"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWeatherByCoords, getWeatherByCity } from "@/lib/api/weather";
import { useAuthStore } from "@/lib/store/authStore";
import type { WeatherData } from "@/types";

interface GeoState { lat: number | null; lon: number | null; ready: boolean; denied: boolean; }
export interface UseWeatherResult { weather: WeatherData | null; isLoading: boolean; isError: boolean; }

export function useWeather(): UseWeatherResult {
  const { user } = useAuthStore();
  const [geo, setGeo] = useState<GeoState>({ lat: null, lon: null, ready: false, denied: false });

  useEffect(() => {
    if (!navigator.geolocation) { setGeo({ lat: null, lon: null, ready: true, denied: true }); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lon: pos.coords.longitude, ready: true, denied: false }),
      ()    => setGeo({ lat: null, lon: null, ready: true, denied: true }),
      { timeout: 8_000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  const coordsQuery = useQuery({
    queryKey: ["weather", "coords", geo.lat, geo.lon],
    queryFn: () => getWeatherByCoords(geo.lat!, geo.lon!),
    enabled: geo.ready && !geo.denied && geo.lat !== null,
    staleTime: 10 * 60 * 1000,
  });

  const cityQuery = useQuery({
    queryKey: ["weather", "city", user?.defaultCity ?? "Istanbul"],
    queryFn: () => getWeatherByCity(user?.defaultCity ?? "Istanbul"),
    enabled: geo.ready && geo.denied,
    staleTime: 10 * 60 * 1000,
  });

  const active = geo.denied ? cityQuery : coordsQuery;
  return {
    weather: active.data?.havaDurumu ?? null,
    isLoading: !geo.ready || active.isPending,
    isError: active.isError,
  };
}
