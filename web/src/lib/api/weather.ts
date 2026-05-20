import api from "./axios";
import type { WeatherData } from "@/types";

export interface WeatherResponse { havaDurumu: WeatherData; }

export async function getWeatherByCoords(enlem: number, boylam: number): Promise<WeatherResponse> {
  const res = await api.get<WeatherResponse>("/weather", { params: { enlem, boylam } });
  return res.data;
}

export async function getWeatherByCity(sehir: string): Promise<WeatherResponse> {
  const res = await api.get<WeatherResponse>("/weather/city", { params: { sehir } });
  return res.data;
}
