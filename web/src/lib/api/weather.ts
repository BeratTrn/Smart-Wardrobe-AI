/**
 * Weather API — wraps /api/weather (coords) and /api/weather/city (city name).
 * Response shape mirrors weatherController.js exactly.
 */

import api from "./axios";
import type { WeatherData } from "@/types";

export interface WeatherResponse {
  havaDurumu: WeatherData;
}

/**
 * GET /api/weather?enlem=<lat>&boylam=<lon>
 * Primary path — uses browser geolocation coordinates.
 */
export async function getWeatherByCoords(
  enlem: number,
  boylam: number
): Promise<WeatherResponse> {
  const res = await api.get<WeatherResponse>("/weather", {
    params: { enlem, boylam },
  });
  return res.data;
}

/**
 * GET /api/weather/city?sehir=<city>
 * Fallback when geolocation is denied or unavailable.
 */
export async function getWeatherByCity(
  sehir: string
): Promise<WeatherResponse> {
  const res = await api.get<WeatherResponse>("/weather/city", {
    params: { sehir },
  });
  return res.data;
}
