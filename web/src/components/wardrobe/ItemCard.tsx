"use client";

import Image from "next/image";
import { Heart, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Item } from "@/types";

interface ItemCardProps {
  item: Item;
  onFavoriteToggle: (id: string) => void;
  onDelete: (id: string) => void;
  isFavoriteLoading?: boolean;
}

export function ItemCard({ item, onFavoriteToggle, onDelete, isFavoriteLoading }: ItemCardProps) {
  return (
    <article className="group relative glass rounded-2xl overflow-hidden hover:ring-1 hover:ring-gold/30 transition-all duration-200">
      {/* Image */}
      <div className="relative aspect-[3/4] bg-white/5">
        <Image
          src={item.resimUrl}
          alt={item.kategori}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {/* Action buttons overlay */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Favourite */}
          <button
            className={cn(
              "h-7 w-7 rounded-full glass flex items-center justify-center transition-all",
              item.favori ? "text-gold" : "text-muted hover:text-gold"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteToggle(item._id);
            }}
            disabled={isFavoriteLoading}
          >
            <Heart
              className="h-3.5 w-3.5"
              fill={item.favori ? "currentColor" : "none"}
            />
          </button>

          {/* Delete */}
          <button
            className="h-7 w-7 rounded-full glass flex items-center justify-center text-muted hover:text-danger transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item._id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Favourite indicator (always visible) */}
        {item.favori && (
          <div className="absolute top-2 left-2 h-5 w-5 rounded-full bg-gold/20 flex items-center justify-center">
            <Heart className="h-3 w-3 text-gold" fill="currentColor" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        <p className="text-sm font-medium leading-none">{item.kategori}</p>
        <div className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded-full ring-1 ring-white/20 flex-shrink-0"
            style={{ backgroundColor: item.renk.toLowerCase() }}
          />
          <p className="text-[12px] text-muted truncate capitalize">{item.renk}</p>
        </div>
        {item.marka && (
          <p className="text-[11px] text-muted truncate">{item.marka}</p>
        )}
      </div>
    </article>
  );
}
