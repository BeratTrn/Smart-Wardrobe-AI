"use client";

import { ItemCard } from "./ItemCard";
import type { Item } from "@/types";

// ── Skeleton card ─────────────────────────────────────────────────────

function ItemSkeleton({ height }: { height: string }) {
  return (
    <div
      className="rounded-2xl overflow-hidden border border-border mb-4 break-inside-avoid"
      style={{ height }}
    >
      <div className="skeleton w-full h-full" />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────

function EmptyWardrobe({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 gap-4 text-center">
      {/* Decorative icon */}
      <div className="w-20 h-20 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
        <svg
          viewBox="0 0 48 48"
          className="w-10 h-10 text-gold/60"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M24 6 L6 16 L6 40 L42 40 L42 16 Z" strokeLinejoin="round" />
          <path d="M18 16 Q18 10 24 10 Q30 10 30 16" strokeLinecap="round" />
        </svg>
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold text-text">Your wardrobe is empty</p>
        <p className="text-sm text-muted max-w-xs">
          Add your first item and let the AI analyse its category, colour, and style.
        </p>
      </div>
      <button
        onClick={onAdd}
        className="mt-2 h-10 px-5 rounded-xl bg-gold-gradient text-black text-sm font-semibold shadow-card hover:opacity-90 transition-opacity"
      >
        Add first item
      </button>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────

interface ItemGridProps {
  items: Item[];
  isLoading: boolean;
  onFavoriteToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  pendingFavoriteId?: string | null;
}

// ── Skeleton heights for varied masonry feel ──────────────────────────

const SKELETON_HEIGHTS = ["280px", "220px", "320px", "260px", "300px", "240px", "350px", "210px"];

// ── Component ─────────────────────────────────────────────────────────

export function ItemGrid({
  items,
  isLoading,
  onFavoriteToggle,
  onDelete,
  onAdd,
  pendingFavoriteId,
}: ItemGridProps) {
  if (isLoading) {
    return (
      <div
        className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4"
        aria-busy="true"
        aria-label="Loading wardrobe items"
      >
        {SKELETON_HEIGHTS.map((h, i) => (
          <ItemSkeleton key={i} height={h} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyWardrobe onAdd={onAdd} />;
  }

  return (
    <div
      className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4"
      role="list"
      aria-label="Wardrobe items"
    >
      {items.map((item) => (
        <div key={item._id} className="break-inside-avoid mb-4" role="listitem">
          <ItemCard
            item={item}
            onFavoriteToggle={onFavoriteToggle}
            onDelete={onDelete}
            isFavoriteLoading={pendingFavoriteId === item._id}
          />
        </div>
      ))}
    </div>
  );
}
