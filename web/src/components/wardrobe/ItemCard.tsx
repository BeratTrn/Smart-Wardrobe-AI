"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";
import type { Item } from "@/types";

const CAT_COLORS: Record<string, string> = {
  "Üst Giyim":     "rgba(90,122,156,0.25)",
  "Alt Giyim":     "rgba(122,90,156,0.25)",
  "Elbise & Etek": "rgba(156,90,122,0.25)",
  "Dış Giyim":     "rgba(106,140,106,0.25)",
  "Ayakkabı":      "rgba(156,122,90,0.25)",
  "Aksesuar":      "rgba(90,156,122,0.25)",
};
const CAT_TEXT: Record<string, string> = {
  "Üst Giyim":     "#7EB3E0",
  "Alt Giyim":     "#B07EE0",
  "Elbise & Etek": "#E07EB0",
  "Dış Giyim":     "#90C490",
  "Ayakkabı":      "#E0B07E",
  "Aksesuar":      "#7EE0B0",
};

interface ItemCardProps {
  item: Item;
  onFavoriteToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
  isFavoriteLoading?: boolean;
}

export function ItemCard({ item, onFavoriteToggle, onDelete, onClick, isFavoriteLoading }: ItemCardProps) {
  const catBg   = CAT_COLORS[item.kategori] ?? "rgba(201,168,76,0.15)";
  const catText = CAT_TEXT[item.kategori]   ?? "var(--color-gold)";

  return (
    <article
      onClick={onClick}
      className="group relative rounded-[20px] overflow-hidden flex flex-col cursor-pointer"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      {/* Image Container with light background */}
      <div className="relative aspect-square" style={{ background: "#F4F4F4" }}>
        <Image
          src={item.resimUrl}
          alt={item.kategori}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {/* Color Dot top-left */}
        {item.renk && (
          <div 
            className="absolute top-3 left-3 h-3.5 w-3.5 rounded-full ring-2 ring-white/50 shadow-sm" 
            style={{ backgroundColor: item.renk.toLowerCase() }} 
          />
        )}

        {/* Delete / X button top-right */}
        <button
          className="absolute top-2.5 right-2.5 h-7 w-7 rounded-full flex items-center justify-center bg-black/40 text-white hover:bg-black/60 transition-colors z-10 backdrop-blur-md"
          onClick={(e) => { e.stopPropagation(); onDelete(item._id); }}
          aria-label="Kıyafeti sil"
        >
          <Trash2 className="h-4 w-4" /> {/* Or X icon, Trash2 is fine */}
        </button>
      </div>

      {/* Info / Footer */}
      <div className="p-3.5 flex flex-col justify-center">
        <p className="text-[14px] font-bold text-text leading-tight mb-1">{item.ad || "Kıyafet"}</p>
        <div>
          <span
            className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md"
            style={{ background: catBg, color: catText }}
          >
            {item.kategori}
          </span>
        </div>
      </div>
    </article>
  );
}
