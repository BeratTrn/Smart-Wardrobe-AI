"use client";

import { useState } from "react";
import { Shirt } from "lucide-react";
import { ItemCard } from "./ItemCard";
import { ItemDetailModal } from "./ItemDetailModal";
import type { Item } from "@/types";

const BDR = "1px solid #1E1E18";
const CBG = "#161614";

function EmptyWardrobe({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 gap-5 text-center">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "rgba(201,168,76,0.10)", border: "1px solid rgba(201,168,76,0.20)" }}>
        <Shirt className="w-10 h-10 text-gold/50" />
      </div>
      <div className="space-y-1.5">
        <p className="text-base font-semibold text-text">Dolabın boş</p>
        <p className="text-sm text-muted max-w-xs">
          İlk kıyafetini ekle, AI kategori ve rengi otomatik tanısın.
        </p>
      </div>
      <button
        onClick={onAdd}
        className="mt-1 h-10 px-6 rounded-xl bg-gold-gradient text-black text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        + İlk Parçayı Ekle
      </button>
    </div>
  );
}

interface ItemGridProps {
  items: Item[];
  isLoading: boolean;
  onFavoriteToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  pendingFavoriteId?: string | null;
}

export function ItemGrid({ items, isLoading, onFavoriteToggle, onDelete, onAdd, pendingFavoriteId }: ItemGridProps) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden" style={{ border: BDR }}>
            <div className="skeleton aspect-[3/4] w-full" />
            <div className="p-3 space-y-2" style={{ background: CBG }}>
              <div className="skeleton h-3 w-20 rounded" />
              <div className="skeleton h-3 w-14 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyWardrobe onAdd={onAdd} />;
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {items.map((item) => (
          <ItemCard
            key={item._id}
            item={item}
            onFavoriteToggle={onFavoriteToggle}
            onDelete={onDelete}
            isFavoriteLoading={pendingFavoriteId === item._id}
            onClick={() => setSelectedItem(item)}
          />
        ))}
      </div>
      
      <ItemDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onToggleFavorite={onFavoriteToggle}
        isFavoriteLoading={selectedItem ? pendingFavoriteId === selectedItem._id : false}
      />
    </>
  );
}
