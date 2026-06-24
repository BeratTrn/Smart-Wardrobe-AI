"use client";

import Link from "next/link";
import { Luggage, Plane, Sparkles } from "lucide-react";
import { SuitcaseCard } from "./SuitcaseCard";
import type { TravelSuitcase } from "@/types";

interface SuitcaseListProps {
  suitcases: TravelSuitcase[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  pendingDeleteId: string | null;
  onNewSuitcase?: () => void;
}

const S  = "var(--color-bg)";
const B  = "1px solid var(--color-border)";
const IA = "var(--color-gold-dim)";
const GA = "1px solid var(--color-gold-border)";

export function SuitcaseList({ suitcases, isLoading, onDelete, pendingDeleteId, onNewSuitcase }: SuitcaseListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[1,2,3,4].map((i) => (
          <div key={i} className="rounded-[20px] h-56 skeleton" />
        ))}
      </div>
    );
  }

  if (suitcases.length === 0) {
    return (
      <div className="relative rounded-3xl p-8 overflow-hidden flex flex-col items-start" style={{ background: S, border: B }}>
        {/* Plane watermark */}
        <Plane 
          className="absolute -right-6 top-6 h-64 w-64 rotate-45 pointer-events-none" 
          style={{ color: "var(--color-gold)", opacity: 0.03 }} 
        />
        
        {/* Top badge */}
        <div 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider mb-6 relative z-10"
          style={{ background: IA, border: GA, color: "var(--color-gold)" }}
        >
          <Sparkles className="h-3 w-3" /> AI SEYAHAT
        </div>
        
        <h2 className="text-[28px] font-black text-text leading-tight mb-3 max-w-sm relative z-10">
          Yaklaşan bir seyahatin mi var? ✈️
        </h2>
        
        <p className="text-[13px] leading-relaxed mb-8 max-w-sm relative z-10" style={{ color: "var(--color-muted)" }}>
          Gideceğin yeri ve tarihi seç, AI senin için hava durumuna uygun kapsül bavulunu hazırlasın.
        </p>
        
        <button
          onClick={onNewSuitcase}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-[15px] font-bold text-black hover:opacity-90 transition-opacity relative z-10"
          style={{ background: "linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-light) 100%)" }}
        >
          <Luggage className="h-5 w-5" /> Bavul Hazırla
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {suitcases.map((s) => (
        <SuitcaseCard
          key={s._id}
          suitcase={s}
          onDelete={onDelete}
          isDeleting={pendingDeleteId === s._id}
        />
      ))}
    </div>
  );
}
