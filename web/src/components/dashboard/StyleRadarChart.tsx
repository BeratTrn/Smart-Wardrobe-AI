"use client";

import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import type { StilItem } from "@/lib/api/stats";

interface StyleRadarChartProps { data: StilItem[]; isLoading?: boolean; }

export function StyleRadarChart({ data, isLoading }: StyleRadarChartProps) {
  if (isLoading) return <div className="glass rounded-2xl h-64 skeleton" />;
  if (!data?.length) return null;

  const maxVal = Math.max(...data.map((d) => d.adet), 1);
  const chartData = data.map((d) => ({ stil: d.stil, adet: d.adet, fullMark: maxVal }));

  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-[11px] font-semibold tracking-widest text-muted uppercase mb-4">Style Profile</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData}>
            <PolarGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
            <PolarAngleAxis dataKey="stil" tick={{ fontSize: 10, fill: "var(--color-muted)" }} />
            <Radar dataKey="adet" stroke="var(--color-gold)" fill="var(--color-gold)"
              fillOpacity={0.12} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
