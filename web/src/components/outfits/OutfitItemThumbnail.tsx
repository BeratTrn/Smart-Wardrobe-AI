"use client";

import Image from "next/image";
import type { PopulatedItem } from "@/types";

interface OutfitItemThumbnailProps { item: PopulatedItem; size?: number; }

export function OutfitItemThumbnail({ item, size = 48 }: OutfitItemThumbnailProps) {
  return (
    <div className="relative rounded-lg overflow-hidden bg-white/5 flex-shrink-0 ring-1 ring-white/10"
      style={{ width: size, height: size }}>
      <Image src={item.resimUrl} alt={item.kategori} fill className="object-cover"
        sizes={`${size}px`} title={item.renk} />
    </div>
  );
}
