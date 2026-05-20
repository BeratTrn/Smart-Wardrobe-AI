"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  type TooltipProps,
} from "recharts";
import type { KategoriItem } from "@/lib/api/stats";

// ── Category → CSS custom property ───────────────────────────────────

const CATEGORY_COLOR: Record<string, string> = {
  "Üst Giyim":     "var(--color-cat-tops)",
  "Alt Giyim":     "var(--color-cat-bottoms)",
  "Elbise & Etek": "var(--color-cat-onepiece)",
  "Dış Giyim":     "var(--color-cat-outer)",
  "Ayakkabı":      "var(--color-cat-shoes)",
  "Aksesuar":      "var(--color-cat-accessory)",
};

const FALLBACK_COLORS = [
  "var(--color-gold)",
  "var(--color-gold-dim)",
  "var(--color-info)",
  "var(--color-success)",
  "var(--color-danger)",
  "var(--color-muted)",
];

function getCategoryColor(name: string, idx: number): string {
  return CATEGORY_COLOR[name] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

// ── Glassmorphism tooltip ─────────────────────────────────────────────

function GlassTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: entry } = payload[0];
  return (
    <div className="glass rounded-xl px-3.5 py-2.5 text-xs border border-border shadow-card space-y-0.5">
      <p className="font-semibold text-text">{name}</p>
      <p className="text-text-sub">
        <span className="font-bold text-text">{value}</span> items
        {entry?.yuzde !== undefined && (
          <span className="ml-2 text-muted">({entry.yuzde}%)</span>
        )}
      </p>
    </div>
  );
}

// ── Custom legend ─────────────────────────────────────────────────────

function DonutLegend({ data }: { data: KategoriItem[] }) {
  return (
    <ul className="space-y-1.5 mt-2">
      {data.map((item, idx) => (
        <li key={item.ad} className="flex items-center gap-2 text-xs">
          <span
            className="w-2.5 h-2.5 rounded-sm shrink-0"
            style={{ backgroundColor: getCategoryColor(item.ad, idx) }}
          />
          <span className="text-text-sub truncate flex-1">{item.ad}</span>
          <span className="font-semibold text-text tabular-nums">{item.adet}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Props ─────────────────────────────────────────────────────────────

interface CategoryDonutChartProps {
  data: KategoriItem[];
  isLoading?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────

export function CategoryDonutChart({ data, isLoading = false }: CategoryDonutChartProps) {
  const chartData = data.map((d) => ({ name: d.ad, value: d.adet, yuzde: d.yuzde }));

  return (
    <div className="rounded-2xl bg-card border border-border p-6 flex flex-col h-full">
      {/* Header */}
      <div className="mb-5">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-muted uppercase mb-0.5">
          Distribution
        </p>
        <h3 className="text-sm font-semibold text-text">By Category</h3>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-36 h-36 rounded-full skeleton" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted">No items yet</p>
        </div>
      ) : (
        <div className="flex gap-4 flex-1">
          {/* Donut */}
          <div className="flex-1 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minHeight={160}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="80%"
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={entry.name}
                      fill={getCategoryColor(entry.name, idx)}
                    />
                  ))}
                </Pie>
                <Tooltip content={<GlassTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="w-40 shrink-0 flex flex-col justify-center">
            <DonutLegend data={data} />
          </div>
        </div>
      )}
    </div>
  );
}
