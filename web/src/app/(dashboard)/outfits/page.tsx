"use client";

import { useState } from "react";
import { OutfitGeneratorPanel } from "@/components/outfits/OutfitGeneratorPanel";
import { OutfitResultCard } from "@/components/outfits/OutfitResultCard";
import { OutfitHistoryGrid } from "@/components/outfits/OutfitHistoryGrid";
import { useGenerateOutfit, useOutfits, useRateOutfit, useSaveOutfit } from "@/lib/hooks/useOutfits";
import { useWeather } from "@/lib/hooks/useWeather";
import type { OutfitGeneratePayload, OutfitRecommendation, SaveOutfitPayload } from "@/types";

export default function OutfitsPage() {
  const { weather } = useWeather();
  const generateOutfit = useGenerateOutfit();
  const { data: outfitsData, isPending: historyLoading } = useOutfits(1, 30);
  const rateOutfit = useRateOutfit();
  const saveOutfit = useSaveOutfit();

  const [freshResults, setFreshResults] = useState<OutfitRecommendation[]>([]);
  const [pendingFeedbackId, setPendingFeedbackId] = useState<string | null>(null);
  const [pendingSaveId, setPendingSaveId] = useState<string | null>(null);

  const handleGenerate = (payload: OutfitGeneratePayload) => {
    generateOutfit.mutate(payload, {
      onSuccess: (data) => setFreshResults(data.kombinler),
    });
  };

  const handleFeedback = (id: string, begeniyor: boolean) => {
    setPendingFeedbackId(id);
    rateOutfit.mutate({ id, begeniyor }, {
      onSettled: () => setPendingFeedbackId(null),
    });
  };

  const handleSave = (id: string) => {
    // Find in fresh results first, then history
    const fresh = freshResults.find((r) => r.id === id);
    const historic = outfitsData?.kombinler.find((o) => o._id === id);

    let payload: SaveOutfitPayload;

    if (fresh) {
      payload = {
        baslik: fresh.baslik,
        aiAciklama: fresh.aciklama,
        kiyafetler: fresh.kiyafetler.map((k) => k._id),
        havaDurumu: fresh.havaDurumu,
        etkinlik: fresh.etkinlik,
      };
    } else if (historic) {
      payload = {
        baslik: historic.baslik,
        aiAciklama: historic.aiAciklama,
        kiyafetler: historic.kiyafetler.map((k) => k._id),
        havaDurumu: historic.havaDurumu,
        etkinlik: historic.etkinlik,
      };
    } else {
      return;
    }

    setPendingSaveId(id);
    saveOutfit.mutate(payload, {
      onSettled: () => setPendingSaveId(null),
    });
  };

  const outfits = outfitsData?.kombinler ?? [];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">AI Outfits</h1>
        <p className="text-sm text-muted mt-1">Let Claude style you based on your wardrobe</p>
      </div>

      {/* Generator + fresh results */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Left: Generator panel */}
        <OutfitGeneratorPanel
          onGenerate={handleGenerate}
          isLoading={generateOutfit.isPending}
          weather={weather}
        />

        {/* Right: Fresh result or skeleton */}
        <div className="space-y-4">
          {generateOutfit.isPending && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="h-0.5 w-full bg-gold-gradient animate-pulse" />
              <div className="p-5 space-y-4">
                <div className="skeleton h-5 w-3/4 rounded" />
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-5/6 rounded" />
                <div className="flex gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-14 w-14 rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {!generateOutfit.isPending && freshResults.map((r) => (
            <OutfitResultCard
              key={r.id}
              outfit={r}
              isFresh
              showActions
              onFeedback={handleFeedback}
              onSave={handleSave}
              isFeedbackLoading={pendingFeedbackId === r.id}
              isSaveLoading={pendingSaveId === r.id}
            />
          ))}

          {!generateOutfit.isPending && freshResults.length === 0 && (
            <div className="glass rounded-2xl p-10 text-center text-muted">
              <p className="text-sm">Your styled outfit will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Outfit History</h2>
        {historyLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-2xl p-5 space-y-3">
                <div className="skeleton h-4 w-2/3 rounded" />
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-4/5 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <OutfitHistoryGrid
            outfits={outfits}
            onFeedback={handleFeedback}
            onSave={handleSave}
            pendingFeedbackId={pendingFeedbackId}
            pendingSaveId={pendingSaveId}
          />
        )}
      </div>
    </div>
  );
}
