"use client";

import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { MevsimItem } from "@/lib/api/stats";

const SEASON_COLOR: Record<string, string> = {
  "Yaz": "var(--color-gold)", "İlkbahar": "var(--color-success)",
  "Sonbahar": "var(--color-cat-shoes)", "Kış": "var(--color-info)",
  "Tüm Mevsimler": "var(--color-gold-dim)",
};

function GlassTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-[12px]">
      <p className="font-semibold">{label}</p>
      <p className="text-muted">{payload[0].value} items</p>
    </div>
  );
}

interface SeasonBarChartProps { data: MevsimItem[]; isLoading?: boolean; }

export function SeasonBarChart({ data, isLoading }: SeasonBarChartProps) {
  if (isLoading) return <div className="glass rounded-2xl h-64 skeleton" />;
  if (!data?.length) return null;

  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-[11px] font-semibold tracking-widest text-muted uppercase mb-4">Season Distribution</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="mevsim" tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} />
            <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="adet" radius={[6, 6, 0, 0]} maxBarSize={56}>
              {data.map((entry) => (
                <Cell key={entry.mevsim} fill={SEASON_COLOR[entry.mevsim] ?? "var(--color-gold)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
