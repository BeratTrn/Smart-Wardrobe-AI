"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { KategoriItem } from "@/lib/api/stats";

const CAT_COLORS: Record<string, string> = {
  "Üst Giyim":     "#5A7A9C",
  "Alt Giyim":     "#7A5A9C",
  "Elbise":        "#9C5A7A",
  "Dış Giyim":     "#6A8C6A",
  "Ayakkabı":      "#9C7A5A",
  "Aksesuar":      "#5A9C7A",
};

function colorFor(ad: string) {
  return CAT_COLORS[ad] ?? "var(--color-gold)";
}

interface CategoryDonutChartProps {
  data: KategoriItem[];
  isLoading?: boolean;
}

export function CategoryDonutChart({ data, isLoading }: CategoryDonutChartProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-[24px] p-5 h-full"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="skeleton h-4 w-28 rounded mb-4" />
        <div className="flex justify-center">
          <div className="skeleton h-36 w-36 rounded-full" />
        </div>
        <div className="space-y-2 mt-4">
          {[1,2,3].map((i) => <div key={i} className="skeleton h-3 rounded" />)}
        </div>
      </div>
    );
  }

  if (!data?.length) return null;

  const total = data.reduce((s, d) => s + d.adet, 0);
  const top3  = [...data].sort((a, b) => b.adet - a.adet).slice(0, 3);

  return (
    <div
      className="rounded-[24px] p-5 flex flex-col gap-4 h-full"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--color-gold-dim)", border: "1px solid var(--color-gold-border)" }}
        >
          <svg className="h-4 w-4 text-gold" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-text leading-none">Kategori</p>
          <p className="text-[11px] leading-none mt-0.5" style={{ color: "var(--color-muted)" }}>Dağılım</p>
        </div>
      </div>
      <div className="h-px" style={{ background: "var(--color-border)" }} />

      {/* Donut */}
      <div className="relative h-32 w-32 mx-auto flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="adet"
              nameKey="ad"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={2}
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry) => (
                <Cell key={entry.ad} fill={colorFor(entry.ad)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-black text-text leading-none">{total}</span>
          <span className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: "var(--color-muted)" }}>Parça</span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2.5">
        {top3.map((entry) => {
          const pct = total > 0 ? Math.round((entry.adet / total) * 100) : 0;
          const color = colorFor(entry.ad);
          return (
            <div key={entry.ad} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-[12px] text-text flex-1 truncate">{entry.ad}</span>
              <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
