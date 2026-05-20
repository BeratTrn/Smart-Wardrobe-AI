"use client";

import { useState, useCallback } from "react";
import { AlertCircle } from "lucide-react";
import { OutfitGeneratorPanel } from "@/components/outfits/OutfitGeneratorPanel";
import { OutfitResultCard } from "@/components/outfits/OutfitResultCard";
import { OutfitHistoryGrid } from "@/components/outfits/OutfitHistoryGrid";
import { useRecommendOutfit, useOutfits, useOutfitFeedback } from "@/lib/hooks/useOutfits";
import { useSaveOutfit } from "@/lib/hooks/useSavedOutfits";
import { getErrorMessage } from "@/lib/utils/errors";
import type { OutfitRecommendation } from "@/types";
import type { SaveOutfitPayload } from "@/lib/api/savedOutfits";

export default function OutfitsPage() {
  const [freshResult, setFreshResult] = useState<OutfitRecommendation | null>(null);
  const [pendingFeedbackId, setPendingFeedbackId] = useState<string | null>(null);
  const [pendingSaveId, setPendingSaveId]         = useState<string | null>(null);

  const recommend = useRecommendOutfit();
  const { data: history, isLoading: historyLoading } = useOutfits();
  const feedback = useOutfitFeedback();
  const save     = useSaveOutfit();

  // ── Generate ──────────────────────────────────────────────────────
  const handleGenerate = useCallback(
    (etkinlik: string, sehir?: string) => {
      setFreshResult(null);
      recommend.mutate(
        { etkinlik, sehir },
        { onSuccess: (data) => setFreshResult(data.kombin) }
      );
    },
    [recommend]
  );

  // ── Feedback ──────────────────────────────────────────────────────
  const handleFeedback = useCallback(
    (id: string, begeniyor: boolean) => {
      setPendingFeedbackId(id);
      feedback.mutate(
        { id, payload: { begeniyor } },
        { onSettled: () => setPendingFeedbackId(null) }
      );
    },
    [feedback]
  );

  // ── Save ──────────────────────────────────────────────────────────
  const handleSave = useCallback(
    (id: string) => {
      // Find the outfit data — could be fresh result or from history
      const source =
        freshResult?.id === id
          ? freshResult
          : history?.kombinler.find((o) => o._id === id);

      if (!source) return;

      let payload: SaveOutfitPayload;

      if ("aiAciklama" in source) {
        // Stored Outfit doc
        payload = {
          baslik:    source.baslik,
          aciklama:  source.aiAciklama,
          ipucu:     "",
          kiyafetler: source.kiyafetler.map((k) => k._id),
          havaDurumu: source.baglam?.havaDurumu
            ? {
                sicaklik: source.baglam.havaDurumu.sicaklik,
                durum:    source.baglam.havaDurumu.durum,
                konum:    source.baglam.havaDurumu.konum,
              }
            : undefined,
        };
      } else {
        // Fresh OutfitRecommendation
        payload = {
          baslik:    source.baslik,
          aciklama:  source.aciklama,
          ipucu:     source.ipucu,
          kiyafetler: source.kiyafetler.map((k) => k._id),
          havaDurumu: source.havaDurumu
            ? {
                sicaklik: source.havaDurumu.sicaklik,
                durum:    source.havaDurumu.durum,
                konum:    source.havaDurumu.konum,
              }
            : undefined,
        };
      }

      setPendingSaveId(id);
      save.mutate(payload, { onSettled: () => setPendingSaveId(null) });
    },
    [freshResult, history, save]
  );

  const outfits = history?.kombinler ?? [];

  return (
    <div className="space-y-8">
      {/* ── Page title ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-text">AI Outfits</h1>
        <p className="text-sm text-muted mt-0.5">
          Describe your occasion and Claude will style you from your wardrobe
        </p>
      </div>

      {/* ── Generator + fresh result side by side on desktop ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: input panel */}
        <OutfitGeneratorPanel
          onGenerate={handleGenerate}
          isLoading={recommend.isPending}
        />

        {/* Right: result (or placeholder) */}
        <div>
          {recommend.isError && (
            <div className="flex items-center gap-2 rounded-2xl border border-danger/30 bg-danger/10 px-5 py-4 text-sm text-danger">
              <AlertCircle size={16} className="shrink-0" />
              {getErrorMessage(recommend.error)}
            </div>
          )}

          {!recommend.isError && !freshResult && !recommend.isPending && (
            <div className="h-full min-h-48 rounded-2xl border border-dashed border-border flex items-center justify-center">
              <p className="text-sm text-muted text-center px-6">
                Your AI-styled outfit will appear here once generated.
              </p>
            </div>
          )}

          {/* Premium loading state */}
          {recommend.isPending && (
            <div className="rounded-2xl border border-gold/20 bg-gradient-to-b from-gold/5 to-card p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gold-gradient flex items-center justify-center animate-pulse">
                  <span className="text-sm">✨</span>
                </div>
                <div className="space-y-1">
                  <div className="skeleton h-4 w-40 rounded" />
                  <div className="skeleton h-3 w-28 rounded" />
                </div>
              </div>
              <div className="skeleton h-12 w-full rounded-xl" />
              <div className="space-y-2">
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-5/6 rounded" />
                <div className="skeleton h-3 w-4/6 rounded" />
              </div>
              <div className="flex gap-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton w-24 h-32 rounded-xl shrink-0" />
                ))}
              </div>
              <p className="text-xs text-gold/70 text-center animate-pulse">
                Claude is reviewing your wardrobe and the weather…
              </p>
            </div>
          )}

          {freshResult && (
            <OutfitResultCard
              outfit={freshResult}
              isFresh
              highlight
              showActions
              onFeedback={handleFeedback}
              onSave={handleSave}
              isSaveLoading={pendingSaveId === freshResult.id}
            />
          )}
        </div>
      </div>

      {/* ── History ───────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">Past outfits</h2>
          {history && (
            <span className="text-xs text-muted bg-surface border border-border px-2.5 py-1 rounded-full">
              {history.toplam} total
            </span>
          )}
        </div>
        <OutfitHistoryGrid
          outfits={outfits}
          isLoading={historyLoading}
          onFeedback={handleFeedback}
          onSave={handleSave}
          pendingFeedbackId={pendingFeedbackId}
          pendingSaveId={pendingSaveId}
        />
      </div>
    </div>
  );
}
