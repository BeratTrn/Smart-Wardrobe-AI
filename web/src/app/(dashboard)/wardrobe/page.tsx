"use client";

import { useState } from "react";
import { Shirt, Search, Heart, X } from "lucide-react";
import { useItems, useToggleFavorite, useDeleteItem } from "@/lib/hooks/useItems";
import { ItemGrid } from "@/components/wardrobe/ItemGrid";
import { AddItemModal } from "@/components/add-item/AddItemModal";
import type { ItemCategory, ItemSeason } from "@/types";

const CATEGORIES: { value: ItemCategory | "all"; label: string }[] = [
  { value: "all",          label: "Tümü" },
  { value: "Üst Giyim",   label: "Üst Giyim" },
  { value: "Alt Giyim",   label: "Alt Giyim" },
  { value: "Elbise & Etek", label: "Elbise & Etek" },
  { value: "Dış Giyim",   label: "Dış Giyim" },
  { value: "Ayakkabı",    label: "Ayakkabı" },
  { value: "Aksesuar",    label: "Aksesuar" },
];

const SEASONS: { value: ItemSeason | "all"; label: string }[] = [
  { value: "all",            label: "Tüm Mevsimler" },
  { value: "İlkbahar",       label: "İlkbahar" },
  { value: "Yaz",            label: "Yaz" },
  { value: "Sonbahar",       label: "Sonbahar" },
  { value: "Kış",            label: "Kış" },
  { value: "Tüm Mevsimler",  label: "4 Mevsim" },
];

export default function WardrobePage() {
  const [category, setCategory]     = useState<ItemCategory | "all">("all");
  const [season, setSeason]         = useState<ItemSeason | "all">("all");
  const [favoriOnly, setFavoriOnly] = useState(false);
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);

  const { data, isPending } = useItems({
    kategori: category === "all" ? undefined : category,
    mevsim:   season   === "all" ? undefined : season,
    favori:   favoriOnly ? true : undefined,
    sayfa:    page,
    limit:    24,
  });

  const { mutate: toggleFavorite, variables: favVars, isPending: isFavPending } =
    useToggleFavorite();
  const { mutate: deleteItem } = useDeleteItem();

  const pendingFavoriteId = isFavPending && favVars ? String(favVars) : undefined;

  const allItems   = data?.kiyafetler ?? [];
  const total      = data?.toplam ?? 0;
  const totalPages = Math.ceil(total / 24) || 1;

  const filtered = search
    ? allItems.filter(
        (it) =>
          it.kategori.toLowerCase().includes(search.toLowerCase()) ||
          it.renk.toLowerCase().includes(search.toLowerCase()) ||
          (it.marka ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : allItems;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-gradient flex items-center justify-center">
            <Shirt className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Gardırobum</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {isPending ? "Yükleniyor…" : `${total} parça`}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-gold-gradient text-black font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          + Parça Ekle
        </button>
      </div>

      {/* ── Filters ────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-4 flex flex-col gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] pointer-events-none" />
          <input
            type="text"
            placeholder="Renk, kategori veya marka ara…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-gold)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]" />
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => { setCategory(cat.value as ItemCategory | "all"); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                category === cat.value
                  ? "bg-gold-gradient text-black"
                  : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Season chips + favori toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {SEASONS.map((s) => (
            <button
              key={s.value}
              onClick={() => { setSeason(s.value as ItemSeason | "all"); setPage(1); }}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                season === s.value
                  ? "border-[var(--color-gold)] text-[var(--color-gold)]"
                  : "border-[var(--color-border)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
              }`}
            >
              {s.label}
            </button>
          ))}

          <div className="ml-auto">
            <button
              onClick={() => { setFavoriOnly(!favoriOnly); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                favoriOnly
                  ? "border-rose-500 text-rose-400 bg-rose-500/10"
                  : "border-[var(--color-border)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
              }`}
            >
              <Heart className={`w-3 h-3 ${favoriOnly ? "fill-rose-400" : ""}`} />
              Favoriler
            </button>
          </div>
        </div>
      </div>

      {/* ── Grid ───────────────────────────────────────────────────── */}
      <ItemGrid
        items={filtered}
        isLoading={isPending}
        onFavoriteToggle={(id) => toggleFavorite(id)}
        onDelete={(id) => deleteItem(id)}
        onAdd={() => setShowAddModal(true)}
        pendingFavoriteId={pendingFavoriteId}
      />

      {/* ── Pagination ─────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl glass text-sm text-[var(--color-text-secondary)] disabled:opacity-40 hover:text-[var(--color-text-primary)] transition-colors"
          >
            ← Önceki
          </button>
          <span className="text-sm text-[var(--color-text-tertiary)]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-xl glass text-sm text-[var(--color-text-secondary)] disabled:opacity-40 hover:text-[var(--color-text-primary)] transition-colors"
          >
            Sonraki →
          </button>
        </div>
      )}

      {/* ── Add Item Modal ─────────────────────────────────────────── */}
      <AddItemModal open={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}
