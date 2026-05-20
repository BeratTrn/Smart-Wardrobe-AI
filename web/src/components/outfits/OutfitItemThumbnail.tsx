"use client";

import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import type { PopulatedItem } from "@/types";

interface OutfitItemThumbnailProps {
  item: PopulatedItem;
  size?: "sm" | "md";
}

export function OutfitItemThumbnail({
  item,
  size = "md",
}: OutfitItemThumbnailProps) {
  const dims = size === "sm"
    ? "w-16 h-20 rounded-lg"
    : "w-24 h-32 rounded-xl";

  return (
    <div
      className={cn(
        "relative overflow-hidden border border-border shrink-0 bg-surface group",
        dims
      )}
    >
      <Image
        src={item.resimUrl}
        alt={item.kategori}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        sizes="(max-width: 640px) 96px, 96px"
      />
      {/* Colour dot */}
      <span
        className="absolute bottom-1.5 right-1.5 w-3 h-3 rounded-full border border-white/40 shadow-sm"
        style={{ backgroundColor: item.renk }}
        title={item.renk}
      />
    </div>
  );
}
