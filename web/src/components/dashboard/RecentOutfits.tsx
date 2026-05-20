"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useOutfits } from "@/lib/hooks/useOutfits";

// ── Component ─────────────────────────────────────────────────────────

export function RecentOutfits() {
  const { data, isLoading } = useOutfits(1, 3);
  const outfits = data?.kombinler ?? [];

  return (
    <div className="rounded-2xl bg-card border border-border p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-muted uppercase mb-0.5">
            AI History
          </p>
          <h3 className="text-sm font-semibold text-text">Recent Outfits</h3>
        </div>
        <Link
          href="/outfits"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-gold transition-colors"
        >
          View all
          <ArrowRight size={11} />
        </Link>
      </div>

      {/* List */}
      <div className="flex-1 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface">
              <div className="flex gap-1.5">
                {Array.from({ length: 3 }).map((__, j) => (
                  <div key={j} className="w-8 h-8 rounded-lg skeleton shrink-0" />
                ))}
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 skeleton rounded" />
                <div className="h-2.5 w-48 skeleton rounded" />
              </div>
            </div>
          ))
        ) : outfits.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 text-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <Sparkles size={16} className="text-gold/60" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-text">No outfits yet</p>
              <p className="text-xs text-muted">
                Generate your first AI outfit on the{" "}
                <Link href="/outfits" className="text-gold hover:underline">
                  Outfits page
                </Link>
                .
              </p>
            </div>
          </div>
        ) : (
          outfits.map((outfit) => (
            <div
              key={outfit._id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl",
                "bg-surface border border-border/60",
                "transition-all duration-200 hover:border-gold/20"
              )}
            >
              {/* Item thumbnails (up to 3) */}
              <div className="flex gap-1.5 shrink-0">
                {outfit.kiyafetler.slice(0, 3).map((item, idx) => (
                  <div
                    key={idx}
                    className="w-9 h-9 rounded-lg overflow-hidden border border-border bg-card shrink-0"
                  >
                    {item.resimUrl ? (
                      <Image
                        src={item.resimUrl}
                        alt={item.kategori}
                        width={36}
                        height={36}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full"
                        style={{ backgroundColor: item.renk ?? "#888" }}
                      />
                    )}
                  </div>
                ))}
                {outfit.kiyafetler.length > 3 && (
                  <div className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center text-[10px] font-semibold text-muted shrink-0">
                    +{outfit.kiyafetler.length - 3}
                  </div>
                )}
              </div>

              {/* Title + excerpt */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text truncate leading-none mb-0.5">
                  {outfit.baslik}
                </p>
                <p className="text-[11px] text-muted leading-relaxed line-clamp-2">
                  {outfit.aiAciklama}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
