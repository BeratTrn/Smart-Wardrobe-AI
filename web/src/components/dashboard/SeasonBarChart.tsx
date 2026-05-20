"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  type TooltipProps,
} from "recharts";
import type { MevsimItem } from "@/lib/api/stats";

// ── Season → accent colour ────────────────────────────────────────────

const SEASON_COLOR: Record<string, string> = {
  "Yaz":           "var(--color-gold)",
  "İlkbahar":      "var(--color-success)",
  "Sonbahar":      "var(--color-cat-shoes)",
  "Kış":           "var(--color-info)",
  "Tüm Mevsimler": "var(--color-gold-dim)",
};

function getSeasonColor(mevsim: string): string {
  return SEASON_COLOR[mevsim] ?? "var(--color-muted)";
}

// ── Glassmorphism tooltip ─────────────────────────────────────────────

function GlassTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3.5 py-2.5 text-xs border border-border shadow-card space-y-0.5">
      <p className="font-semibold text-text">{label}</p>
      <p className="text-text-sub">
        <span className="font-bold text-text">{payload[0].value}</span> items
      </p>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────

interface SeasonBarChartProps {
  data: MevsimItem[];
  isLoading?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────

export function SeasonBarChart({ data, isLoading = false }: SeasonBarChartProps) {
  const chartData = data.map((d) => ({ name: d.mevsim, value: d.adet }));

  return (
    <div className="rounded-2xl bg-card border border-border p-6 flex flex-col h-full">
      {/* Header */}
      <div className="mb-5">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-muted uppercase mb-0.5">
          Distribution
        </p>
        <h3 className="text-sm font-semibold text-text">By Season</h3>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-end gap-2 pb-2">
          {[60, 85, 45, 70, 30].map((h, i) => (
            <div
              key={i}
              className="flex-1 skeleton rounded-t-lg"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted">No items yet</p>
        </div>
      ) : (
        <div className="flex-1" style={{ minHeight: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="28%">
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--color-border)"
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--color-muted)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--color-muted)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={24}
              />
              <Tooltip
                content={<GlassTooltip />}
                cursor={{ fill: "var(--color-border)", opacity: 0.5 }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={getSeasonColor(entry.name)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
