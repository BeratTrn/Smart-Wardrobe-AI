"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { StilItem } from "@/lib/api/stats";

/* ── Stil renk paleti (mobil ile birebir) ─────────────────────── */
const STIL_COLORS: Record<string, string> = {
  "Sokak":   "#4FD1C5",
  "Spor":    "#63B3ED",
  "Günlük":  "#C9A84C",
  "Klasik":  "#718096",
  "Minimal": "#B794F4",
  "Şık":     "#F687B3",
  "Resmi":   "#F6AD55",
};

function colorFor(stil: string) {
  return STIL_COLORS[stil] ?? "#C9A84C";
}

interface StilProfilinProps {
  data: StilItem[];
  isLoading?: boolean;
}

export function StilProfilin({ data, isLoading }: StilProfilinProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl p-5 h-64 space-y-3" style={{ background: "#111110", border: "1px solid #1E1E18" }}>
        <div className="skeleton h-4 w-32 rounded" />
        <div className="flex gap-6 mt-2">
          <div className="skeleton h-32 w-32 rounded-full" />
          <div className="flex-1 space-y-3 pt-4">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-3 rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!data?.length) return null;

  const totalAdet = data.reduce((s, d) => s + d.adet, 0);
  const maxAdet   = Math.max(...data.map(d => d.adet), 1);
  const dominant  = [...data].sort((a, b) => b.adet - a.adet)[0];

  /* Donut için veri — sıfır segmentleri filtrele */
  const pieData = data.filter(d => d.adet > 0);

  return (
    <div
      className="rounded-[24px] p-5 flex flex-col gap-5"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      {/* Başlık */}
      <div className="flex items-center gap-3">
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "color-mix(in srgb, var(--color-gold) 14%, #1A1A15)" }}
        >
          <svg className="h-4 w-4 text-gold" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-text leading-none">Stil Profilin</p>
          <p className="text-[11px] text-muted leading-none mt-0.5">Dolap analizi</p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px" style={{ background: "#1E1E18" }} />

      {/* Donut + sağ bilgi */}
      <div className="flex items-center gap-6">
        {/* Donut chart */}
        <div className="relative h-28 w-28 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="adet"
                nameKey="stil"
                innerRadius="65%"
                outerRadius="90%"
                paddingAngle={2}
                strokeWidth={0}
                startAngle={90}
                endAngle={-270}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.stil} fill={colorFor(entry.stil)} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-black text-text leading-none">{totalAdet}</span>
            <span className="text-[9px] text-muted uppercase tracking-wider mt-0.5">Parça</span>
          </div>
        </div>

        {/* Baskın stil + toplam */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-muted flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <div className="min-w-0">
              <p className="text-[10px] text-muted uppercase tracking-wider leading-none">Baskın Stil</p>
              <p className="text-sm font-bold mt-0.5 leading-none" style={{ color: colorFor(dominant.stil) }}>
                {dominant.stil}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-muted flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div className="min-w-0">
              <p className="text-[10px] text-muted uppercase tracking-wider leading-none">Toplam Parça</p>
              <p className="text-sm font-bold text-text mt-0.5 leading-none">{totalAdet} kıyafet</p>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px" style={{ background: "#1E1E18" }} />

      {/* Stil dağılımı progress bars */}
      <div className="space-y-3">
        {data.map((entry) => {
          const pct = totalAdet > 0 ? Math.round((entry.adet / totalAdet) * 100) : 0;
          const color = colorFor(entry.stil);
          return (
            <div key={entry.stil} className="flex items-center gap-3">
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-[12px] text-text w-16 flex-shrink-0">{entry.stil}</span>
              <div
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ background: "#1E1E18" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.85 }}
                />
              </div>
              <span className="text-[11px] text-muted w-9 text-right flex-shrink-0">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
