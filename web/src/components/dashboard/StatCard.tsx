"use client";

import { cn } from "@/lib/utils/cn";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: React.ReactNode;
  isLoading?: boolean;
  gold?: boolean;
}

export function StatCard({ label, value, sub, accent, isLoading, gold }: StatCardProps) {
  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-5 h-32 space-y-3">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-7 w-16 rounded" />
        <div className="skeleton h-3 w-28 rounded" />
      </div>
    );
  }
  return (
    <div className="glass rounded-2xl p-5 h-32 flex flex-col justify-between">
      <p className="text-[11px] font-semibold tracking-widest text-muted uppercase">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className={cn("text-3xl font-bold leading-none", gold && "text-gold")}>{value}</p>
          {sub && <p className="text-[12px] text-muted mt-1">{sub}</p>}
        </div>
        {accent && <div className="flex-shrink-0">{accent}</div>}
      </div>
    </div>
  );
}
