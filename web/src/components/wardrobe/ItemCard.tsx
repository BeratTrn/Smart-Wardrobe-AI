"use client";

import Image from "next/image";
import { Heart, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Item } from "@/types";

// ── Category label colours ────────────────────────────────────────────

const CATEGORY_STYLE: Record<string, string> = {
  "Üst Giyim":     "bg-cat-top/15     text-cat-top",
  "Alt Giyim":     "bg-cat-bottom/15  text-cat-bottom",
  "Elbise & Etek": "bg-cat-dress/15   text-cat-dress",
  "Dış Giyim":     "bg-cat-outer/15   text-cat-outer",
  "Ayakkabı":      "bg-cat-shoes/15   text-cat-shoes",
  "Aksesuar":      "bg-cat-acc/15     text-cat-acc",
};

// ── Props ─────────────────────────────────────────────────────────────

interface ItemCardProps {
  item: Item;
  onFavoriteToggle: (id: string) => void;
  onDelete: (id: string) => void;
  /** Disables the favourite button while the optimistic mutation is pending */
  isFavoriteLoading?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────

export function ItemCard({
  item,
  onFavoriteToggle,
  onDelete,
  isFavoriteLoading = false,
}: ItemCardProps) {
  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl",
        "bg-card border border-border",
        "transition-all duration-300",
        "hover:border-gold/30 hover:shadow-card-lg hover:-translate-y-0.5"
      )}
    >
      {/* ── Item image ──────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden bg-surface">
        <Image
          src={item.resimUrl}
          alt={`${item.kategori} — ${item.renk}`}
          width={400}
          height={500}
          className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />

        {/* Hover overlay with action buttons */}
        <div
          className={cn(
            "absolute inset-0 flex items-end justify-between p-3",
            "bg-gradient-to-t from-black/60 via-transparent to-transparent",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          )}
        >
          {/* Favourite toggle */}
          <button
            aria-label={item.favori ? "Remove from favourites" : "Add to favourites"}
            disabled={isFavoriteLoading}
            onClick={() => onFavoriteToggle(item._id)}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              "bg-black/40 backdrop-blur-sm border transition-all duration-200",
              item.favori
                ? "border-gold/60 text-gold"
                : "border-white/20 text-white/70 hover:text-gold hover:border-gold/60",
              isFavoriteLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            <Heart
              size={14}
              className={cn("transition-all", item.favori && "fill-gold")}
            />
          </button>

          {/* Delete */}
          <button
            aria-label="Delete item"
            onClick={() => onDelete(item._id)}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              "bg-black/40 backdrop-blur-sm border border-white/20",
              "text-white/60 hover:text-danger hover:border-danger/40",
              "transition-all duration-200"
            )}
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Always-visible favourite indicator (when active) */}
        {item.favori && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gold/20 backdrop-blur-sm border border-gold/40 flex items-center justify-center">
            <Heart size={11} className="fill-gold text-gold" />
          </div>
        )}
      </div>

      {/* ── Card footer ─────────────────────────────────────────── */}
      <div className="px-3 py-2.5 space-y-2">
        {/* Category badge + colour swatch row */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide truncate",
              CATEGORY_STYLE[item.kategori] ?? "bg-surface text-text-sub"
            )}
          >
            {item.kategori}
          </span>

          {/* HEX colour swatch */}
          <span
            title={item.renk}
            className="w-4 h-4 rounded-full border border-border shrink-0 ring-1 ring-offset-1 ring-offset-card ring-border"
            style={{ backgroundColor: item.renk }}
          />
        </div>

        {/* Season + Style */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-muted bg-surface px-2 py-0.5 rounded-full border border-border">
            {item.mevsim}
          </span>
          <span className="text-[10px] text-muted bg-surface px-2 py-0.5 rounded-full border border-border">
            {item.stil}
          </span>
        </div>

        {/* Brand name (only if present) */}
        {item.marka && (
          <p className="text-xs text-text-sub font-medium truncate">{item.marka}</p>
        )}
      </div>
    </article>
  );
}
