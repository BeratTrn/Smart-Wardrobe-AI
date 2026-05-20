"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { KategoriItem } from "@/lib/api/stats";

const CATEGORY_COLOR: Record<string, string> = {
  "Üst Giyim":   "var(--color-cat-tops)",
  "Alt Giyim":   "var(--color-cat-bottoms)",
  "Elbise & Etek":"var(--color-cat-onepiece)",
  "Dış Giyim":   "var(--color-cat-outer)",
  "Ayakkabı":    "var(--color-cat-shoes)",
  "Aksesuar":    "var(--color-cat-accessory)",
};

function GlassTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { ad, adet, yuzde } = payload[0].payload;
  return (
    <div className="glass rounded-xl px-3 py-2 text-[12px]">
      <p className="font-semibold">{ad}</p>
      <p className="text-muted">{adet} items · {yuzde}%</p>
    </div>
  );
}

interface CategoryDonutChartProps { data: KategoriItem[]; isLoading?: boolean; }

export function CategoryDonutChart({ data, isLoading }: CategoryDonutChartProps) {
  if (isLoading) return <div className="glass rounded-2xl h-64 skeleton" />;
  if (!data?.length) return null;

  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-[11px] font-semibold tracking-widest text-muted uppercase mb-4">Category Breakdown</p>
      <div className="flex gap-4 items-center">
        <div className="h-48 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="adet" nameKey="ad"
                innerRadius="55%" outerRadius="80%" paddingAngle={3} strokeWidth={0}>
                {data.map((entry) => (
                  <Cell key={entry.ad} fill={CATEGORY_COLOR[entry.ad] ?? "var(--color-muted)"} />
                ))}
              </Pie>
              <Tooltip content={<GlassTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2 flex-shrink-0">
          {data.map((entry) => (
            <div key={entry.ad} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: CATEGORY_COLOR[entry.ad] ?? "var(--color-muted)" }} />
              <span className="text-[11px] text-muted">{entry.ad}</span>
              <span className="text-[11px] font-medium ml-auto pl-2">{entry.yuzde}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
