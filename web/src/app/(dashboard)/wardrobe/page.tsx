"use client";

import { ItemGrid } from "@/components/wardrobe/ItemGrid";
import { useDeleteItem, useItems, useToggleFavorite } from "@/lib/hooks/useItems";
import type { ItemCategory } from "@/types";
import { Heart, Search, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/lib/i18n";

function getCategories(t: (key: string) => string): { value: ItemCategory | "all"; label: string }[] {
  return [
    { value: "all",        label: t("wardrobe.all") },
    { value: "Üst Giyim",  label: t("wardrobe.topwear") },
    { value: "Alt Giyim",  label: t("wardrobe.bottomwear") },
    { value: "Elbise",     label: t("wardrobe.dress") },
    { value: "Dış Giyim",  label: t("wardrobe.outerwear") },
    { value: "Ayakkabı",   label: t("wardrobe.shoes") },
    { value: "Aksesuar",   label: t("wardrobe.accessories") },
  ];
}

const BDR = "1px solid var(--color-border)";
const CBG = "var(--color-surface)";

const trNorm = (s: string) =>
  s.toLowerCase()
   .replace(/ı/g, "i").replace(/İ/g, "i")
   .replace(/ü/g, "u").replace(/Ü/g, "u")
   .replace(/ö/g, "o").replace(/Ö/g, "o")
   .replace(/ş/g, "s").replace(/Ş/g, "s")
   .replace(/ğ/g, "g").replace(/Ğ/g, "g")
   .replace(/ç/g, "c").replace(/Ç/g, "c");

export default function WardrobePage() {
  const { t } = useT();
  const CATEGORIES = getCategories(t);
  const [category,     setCategory]     = useState<ItemCategory | "all">("all");
  const [search,       setSearch]       = useState("");
  const [page,         setPage]         = useState(1);
  const [favOnly,      setFavOnly]      = useState(false);
  const router = useRouter();

  const { data, isPending } = useItems({
    kategori: category === "all" ? undefined : category,
    favori:   favOnly ? true : undefined,
    sayfa:    page,
    limit:    24,
  });

  const { mutate: toggleFavorite, variables: favVars, isPending: isFavPending } = useToggleFavorite();
  const { mutate: deleteItem } = useDeleteItem();

  const pendingFavoriteId = isFavPending && favVars ? String(favVars) : undefined;
  const allItems   = data?.kiyafetler ?? [];
  const total      = data?.toplam ?? 0;
  const totalPages = Math.ceil(total / 24) || 1;

  const q = trNorm(search.trim());
  const filtered = q
    ? allItems.filter((it) => {
        const ad = trNorm(it.ad ?? "");
        if (ad) return ad.includes(q);
        return trNorm(t("add_item.garment")).includes(q);
      })
    : allItems;

  return (
    <div className="flex flex-col gap-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted uppercase mb-1">{t("wardrobe.my_wardrobe")}</p>
          <h1 className="text-3xl font-black text-text leading-none mb-1">{t("wardrobe.wardrobe")}</h1>
          <p className="text-[13px] text-muted">
            {isPending ? t("common.loading") : `${total} ${t("add_item.garment")}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
          {/* ❤️ Favoriler toggle */}
          <button
            onClick={() => { setFavOnly((v) => !v); setPage(1); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200"
            style={
              favOnly
                ? {
                    background: "linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-light) 100%)",
                    color: "#000",
                    boxShadow: "0 4px 16px var(--color-gold-border)",
                  }
                : {
                    background: "var(--color-gold-dim)",
                    border: "1px solid var(--color-gold-border)",
                    color: "var(--color-gold)",
                  }
            }
          >
            <Heart
              className="h-4 w-4"
              fill={favOnly ? "currentColor" : "none"}
              strokeWidth={favOnly ? 0 : 2}
            />
            {t("nav.favorites")}
          </button>

          {/* ✨ Kombin */}
          <button
            onClick={() => { window.location.href = "/outfits"; }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-gold capitalize"
            style={{ background: "var(--color-gold-dim)", border: "1px solid var(--color-gold-border)" }}
          >
            <Sparkles className="h-4 w-4" /> {t("saved_outfits.outfit")}
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="rounded-2xl p-4 flex flex-col gap-4" style={{ border: BDR }}>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder={t("web.wardrobe.search_placeholder")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm text-text placeholder:text-muted focus:outline-none"
            style={{ background: CBG, border: BDR }}
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted hover:text-text" />
            </button>
          )}
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-0.5">
          {CATEGORIES.map((cat) => {
            const active = category === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => { setCategory(cat.value as ItemCategory | "all"); setPage(1); }}
                className="flex-shrink-0 px-4 py-2.5 rounded-full text-[13px] font-bold transition-all duration-200"
                style={
                  active
                    ? { background: "linear-gradient(135deg, var(--color-gold-light) 0%, var(--color-gold) 100%)", color: "#000" }
                    : { background: "var(--color-surface)", color: "var(--color-text-sub)", border: "1px solid var(--color-border)" }
                }
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Active fav banner */}
        {favOnly && (
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold animate-fade-in"
            style={{ background: "var(--color-gold-dim)", border: "1px solid var(--color-gold-border)", color: "var(--color-gold)" }}
          >
            <Heart className="h-4 w-4" fill="currentColor" strokeWidth={0} />
            {t("web.wardrobe.fav_only_banner")}
            <button
              className="ml-auto text-xs underline opacity-60 hover:opacity-100 transition-opacity"
              onClick={() => { setFavOnly(false); setPage(1); }}
            >
              {t("web.wardrobe.clear")}
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      <ItemGrid
        items={filtered}
        isLoading={isPending}
        onFavoriteToggle={(id) => toggleFavorite(id)}
        onDelete={(id) => deleteItem(id)}
        onAdd={() => router.push("/add-item")}
        pendingFavoriteId={pendingFavoriteId}
      />

      {/* Empty state for favorites */}
      {!isPending && favOnly && filtered.length === 0 && (
        <div
          className="rounded-2xl p-14 flex flex-col items-center text-center gap-4"
          style={{ border: BDR }}
        >
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center"
            style={{ background: "var(--color-gold-dim)", border: "1px solid var(--color-gold-border)" }}
          >
            <Heart className="h-7 w-7 text-gold" />
          </div>
          <div>
            <p className="text-base font-bold text-text mb-1">{t("favorites.empty_title")}</p>
            <p className="text-sm text-muted">
              {t("favorites.empty_body")}
            </p>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl text-sm text-muted disabled:opacity-30 hover:text-text transition-colors"
            style={{ border: BDR }}
          >
            {t("web.wardrobe.prev")}
          </button>
          <span className="text-sm text-muted">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-xl text-sm text-muted disabled:opacity-30 hover:text-text transition-colors"
            style={{ border: BDR }}
          >
            {t("web.wardrobe.next")}
          </button>
        </div>
      )}

    </div>
  );
}
