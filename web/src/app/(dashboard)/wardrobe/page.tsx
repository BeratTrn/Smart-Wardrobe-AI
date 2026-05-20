"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useItems, useToggleFavorite, useDeleteItem } from "@/lib/hooks/useItems";
import { ItemGrid } from "@/components/wardrobe/ItemGrid";
import { AddItemModal } from "@/components/add-item/AddItemModal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import type { ItemSeason } from "@/types";

const SEASONS: ItemSeason[] = ["Yaz", "Kış", "İlkbahar", "Sonbahar", "Tüm Mevsimler"];
const CATEGORIES = [
  "Tümü", "Üst Giyim", "Alt Giyim", "Elbise & Etek", "Dış Giyim", "Ayakkabı", "Aksesuar",
];

export default function WardrobePage() {
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tümü");
  const [season, setSeason] = useState<ItemSeason | "">("");
  const [favoriOnly, setFavoriOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pendingFavoriteId, setPendingFavoriteId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const query = {
    ...(category !== "Tümü" && { kategori: category as import("@/types").ItemCategory }),
    ...(season && { mevsim: season }),
    ...(favoriOnly && { favori: true }),
    sayfa: page,
    limit: 24,
  };

  const { data, isPending } = useItems(query);
  const toggleFav = useToggleFavorite();
  const deleteItem = useDeleteItem();

  const handleFavoriteToggle = (id: string) => {
    setPendingFavoriteId(id);
    toggleFav.mutate(id, { onSettled: () => setPendingFavoriteId(null) });
  };

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
    deleteItem.mutate(id, { onSettled: () => setPendingDeleteId(null) });
  };

  const items = data?.kiyafetler ?? [];
  const total = data?.toplam ?? 0;
  const totalPages = Math.ceil(total / 24);

  // Client-side search filter
  const filtered = search
    ? items.filter(
        (it) =>
          it.kategori.toLowerCase().includes(search.toLowerCase()) ||
          it.renk.toLowerCase().includes(search.toLowerCase()) ||
          (it.marka ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Wardrobe</h1>
          <p className="text-sm text-muted mt-0.5">{total} items total</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add item
        </Button>
      </div>

      {/* Filter strip */}
      <div className="glass rounded-2xl p-4 space-y-4">
        {/* Search + fav toggle */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by category, color, brand…"
              className="w-full rounded-lg border border-border bg-white/5 pl-9 pr-4 py-2 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
            />
          </div>
          <button
            onClick={() => setFavoriOnly((v) => !v)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors whitespace-nowrap",
              favoriOnly
                ? "border-gold bg-gold/10 text-gold"
                : "border-border text-muted hover:border-gold/40"
            )}
          >
            ♥ Favourites
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => { setCategory(c); setPage(1); }}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] border transition-colors",
                category === c
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-border text-muted hover:border-gold/40"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Season chips */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSeason("")}
            className={cn(
              "px-3 py-1 rounded-full text-[12px] border transition-colors",
              !season
                ? "border-gold bg-gold/10 text-gold"
                : "border-border text-muted hover:border-gold/40"
            )}
          >
            All seasons
          </button>
          {SEASONS.map((s) => (
            <button
              key={s}
              onClick={() => setSeason(season === s ? "" : s)}
              className={cn(
                "px-3 py-1 rounded-full text-[12px] border transition-colors",
                season === s
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-border text-muted hover:border-gold/40"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <ItemGrid
        items={filtered}
        isLoading={isPending}
        onFavoriteToggle={handleFavoriteToggle}
        onDelete={handleDelete}
        onAdd={() => setAddOpen(true)}
        pendingFavoriteId={pendingFavoriteId}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button
            variant="ghost"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-muted">
            {page} / {totalPages}
          </span>
          <Button
            variant="ghost"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      <AddItemModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
