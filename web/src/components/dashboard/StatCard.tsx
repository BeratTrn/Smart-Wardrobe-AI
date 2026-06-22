"use client";

import { cn } from "@/lib/utils/cn";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: React.ReactNode;
  icon?: React.ReactNode;
  isLoading?: boolean;
  gold?: boolean;
}

export function StatCard({ label, value, sub, accent, icon, isLoading, gold }: StatCardProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-[20px] p-5 h-[120px] space-y-3"
        style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
      >
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-9 w-16 rounded" />
        <div className="skeleton h-3 w-28 rounded" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-2xl p-5 h-[120px] flex flex-col justify-between overflow-hidden group cursor-default transition-all duration-300",
        gold ? "ring-1 ring-gold/10" : ""
      )}
      style={{
        background: "var(--color-surface)",
        border: gold ? "1px solid var(--color-gold-border)" : "1px solid var(--color-border)",
        boxShadow: gold ? "0 4px 20px var(--color-gold-dim)" : "none",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      {/* Ambient gold glow on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: "radial-gradient(ellipse at top left, var(--color-gold-dim) 0%, transparent 60%)",
        }}
      />

      <div className="relative flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: "var(--color-muted)" }}>
          {label}
        </p>
        {icon && (
          <div
            className="h-7 w-7 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--color-gold-dim)", border: "1px solid var(--color-gold-border)" }}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="relative flex items-end justify-between gap-2">
        <div>
          <p
            className={cn(
              "text-[36px] font-black leading-none tracking-tight",
              gold ? "text-gold" : "text-text"
            )}
          >
            {value}
          </p>
          {sub && (
            <p className="text-[11px] mt-1.5 leading-none" style={{ color: "var(--color-muted)" }}>
              {sub}
            </p>
          )}
        </div>
        {accent && <div className="flex-shrink-0 mb-1">{accent}</div>}
      </div>
    </div>
  );
}
