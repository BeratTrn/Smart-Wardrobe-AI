"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";
import type { StilItem } from "@/lib/api/stats";

// ── Glassmorphism tooltip ─────────────────────────────────────────────

function GlassTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3.5 py-2.5 text-xs border border-border shadow-card space-y-0.5">
      <p className="font-semibold text-text">{payload[0].payload?.subject}</p>
      <p className="text-text-sub">
        <span className="font-bold text-text">{payload[0].value}</span> items
      </p>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────

interface StyleRadarChartProps {
  data: StilItem[];
  isLoading?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────

export function StyleRadarChart({ data, isLoading = false }: StyleRadarChartProps) {
  const maxVal = Math.max(...data.map((d) => d.adet), 1);

  const chartData = data.map((d) => ({
    subject: d.stil,
    value: d.adet,
    fullMark: maxVal,
  }));

  return (
    <div className="rounded-2xl bg-card border border-border p-6 flex flex-col h-full">
      {/* Header */}
      <div className="mb-5">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-muted uppercase mb-0.5">
          Analysis
        </p>
        <h3 className="text-sm font-semibold text-text">Style Profile</h3>
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
        <div className="flex-1" style={{ minHeight: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} outerRadius="70%">
              <PolarGrid
                stroke="var(--color-border)"
                strokeDasharray="3 3"
              />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "var(--color-muted)", fontSize: 10 }}
              />
              <Radar
                dataKey="value"
                stroke="var(--color-gold)"
                strokeWidth={1.5}
                fill="var(--color-gold)"
                fillOpacity={0.12}
                dot={false}
              />
              <Tooltip content={<GlassTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
