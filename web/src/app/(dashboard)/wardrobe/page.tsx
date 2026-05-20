"use client";

import { useState, useCallback } from "react";
import { Plus, Heart, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ItemGrid } from "@/components/wardrobe/ItemGrid";
import { AddItemModal } from "@/components/add-item/AddItemModal";
import { useItems, useToggleFavorite, useDeleteItem } from "@/lib/hooks/useItems";
import { getErrorMessage } from "@/lib/utils/errors";
import type { ItemCategory, ItemSeason } from "@/types";
import type { ItemsFilter } from "@/lib/api/items";

// ── Filter options ────────────────────────────────────────────────────

const CATEGORIES: { label: string; value: ItemCategory | "" }[] = [
  { label: "All categories", value: "" },
  { label: "Üst Giyim",      value: "Üst Giyim" },
  { label: "Alt Giyim",      value: "Alt Giyim" },
  { label: "Elbise & Etek",  value: "Elbise & Etek" },
  { label: "Dis Giyim",      value: "Dış Giyim" },
  { label: "Ayakkabi",       value: "Ayakkabı" },
  { label: "Aksesuar",       value: "Aksesuar" },
];

const SEASONS: { label: string; value: ItemSeason | "" }[] = [
  { label: "All seasons",   value: "" },
  { label: "Ilkbahar",      value: "İlkbahar" },
  { label: "Yaz",           value: "Yaz" },
  { label: "Sonbahar",      value: "Sonbahar" },
  { label: "Kis",           value: "Kış" },
  { label: "Tum Mevsimler", value: "Tüm Mevsimler" },
];

// ── Filter select ─────────────────────────────────────────────────────

function FilterSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | "";
  onChange: (v: T | "") => void;
  options: { label: string; value: T | "" }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T | "")}
      className={cn(
        "h-9 px-3 rounded-lg border text-sm",
        "bg-card text-text-sub",
        "transition-all duration-200",
        "focus:outline-none focus:ring-1 focus:ring-gold/30 focus:border-gold/50",
        value ? "border-gold/40 text-text" : "border-border"
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function WardrobePage() {
  const [isModalOpen, setModalOpen] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [kategori, setKategori] = useState<ItemCategory | "">("");
  const [mevsim, setMevsim]     = useState<ItemSeason | "">("");
  const [pendingFavoriteId, setPendingFavoriteId] = useState<string | null>(null);

  // Build filter object — only include defined values
  const filters: ItemsFilter = {
    ...(kategori && { kategori }),
    ...(mevsim   && { mevsim }),
    ...(showFavoritesOnly && { favori: true }),
  };

  const { data, isLoading, isError, error } = useItems(filters);
  const toggleFavorite = useToggleFavorite();
  const deleteItem     = useDeleteItem();

  const items = data?.kiyafetler ?? [];
  const hasActiveFilters = Boolean(kategori || mevsim || showFavoritesOnly);

  const clearFilters = () => {
    setKategori("");
    setMevsim("");
    setShowFavoritesOnly(false);
  };

  const handleFavoriteToggle = useCallback(
    (id: string) => {
      setPendingFavoriteId(id);
      toggleFavorite.mutate(id, {
        onSettled: () => setPendingFavoriteId(null),
      });
    },
    [toggleFavorite]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!window.confirm("Remove this item from your wardrobe?")) return;
      deleteItem.mutate(id);
    },
    [deleteItem]
  );

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.3em] text-gold uppercase mb-1.5">
            My Wardrobe
          </p>
          <h2 className="text-2xl font-semibold text-text tracking-tight">
            Your items
          </h2>
          <p className="text-sm text-text-sub mt-1">
            {isLoading ? "Loading..." : `${data?.toplam ?? 0} items in your wardrobe`}
          </p>
        </div>

        {/* Add item button */}
        <button
          onClick={() => setModalOpen(true)}
          className={cn(
            "inline-flex items-center gap-2 h-10 px-4 rounded-xl",
            "bg-gold-gradient text-black text-sm font-semibold",
            "shadow-card hover:opacity-90 transition-opacity shrink-0"
          )}
        >
          <Plus size={16} />
          Add item
        </button>
      </div>

      {/* ── Filter strip ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          value={kategori}
          onChange={setKategori}
          options={CATEGORIES}
        />

        <FilterSelect
          value={mevsim}
          onChange={setMevsim}
          options={SEASONS}
        />

        {/* Favourites toggle */}
        <button
          onClick={() => setShowFavoritesOnly((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm transition-all duration-200",
            showFavoritesOnly
              ? "border-gold/40 bg-gold/10 text-gold"
              : "border-border bg-card text-text-sub hover:border-border hover:text-text"
          )}
        >
          <Heart
            size={13}
            className={cn(showFavoritesOnly && "fill-gold")}
          />
          Favourites
        </button>

        {/* Clear all filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 h-9 px-3 rounded-lg text-xs text-muted hover:text-danger transition-colors"
          >
            <X size={12} />
            Clear
          </button>
        )}

        {/* Item count chip */}
        {!isLoading && items.length > 0 && (
          <span className="ml-auto text-xs text-muted bg-surface border border-border px-2.5 py-1 rounded-full">
            {items.length} shown
          </span>
        )}
      </div>

      {/* ── API error ───────────────────────────────────────────── */}
      {isError && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {getErrorMessage(error)}
        </div>
      )}

      {/* ── Grid ────────────────────────────────────────────────── */}
      <ItemGrid
        items={items}
        isLoading={isLoading}
        onFavoriteToggle={handleFavoriteToggle}
        onDelete={handleDelete}
        onAdd={() => setModalOpen(true)}
        pendingFavoriteId={pendingFavoriteId}
      />

      {/* ── Add item modal ──────────────────────────────────────── */}
      <AddItemModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
