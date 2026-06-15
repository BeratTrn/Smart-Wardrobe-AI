"use client";

import { useState } from "react";
import { Sparkles, Bookmark } from "lucide-react";
import { OutfitGeneratorPanel } from "@/components/outfits/OutfitGeneratorPanel";
import { OutfitResultCard }     from "@/components/outfits/OutfitResultCard";
import { LookbookModal }        from "@/components/outfits/LookbookModal";
import { useGenerateOutfit, useGenerateWebOutfit, useRateOutfit, useSaveOutfit } from "@/lib/hooks/useOutfits";
import { useWeather }           from "@/lib/hooks/useWeather";
import type { OutfitGeneratePayload, OutfitRecommendation } from "@/types";
import type { SaveToArchivePayload } from "@/lib/api/outfits";

const BG  = "#111110";
const SBG = "#161614";
const BDR = "1px solid #1E1E18";
const IBG = "rgba(201,168,76,0.12)";
const ABD = "1px solid rgba(201,168,76,0.25)";

export default function OutfitsPage() {
  const { weather } = useWeather();
  const generateOutfit = useGenerateOutfit();
  const generateWebOutfit = useGenerateWebOutfit();
  const rateOutfit = useRateOutfit();
  const saveOutfit = useSaveOutfit();

  const [freshResults,       setFreshResults]       = useState<OutfitRecommendation[]>([]);
  const [pendingFeedbackId,  setPendingFeedbackId]  = useState<string | null>(null);
  const [pendingSaveId,      setPendingSaveId]      = useState<string | null>(null);
  const [lookbookOutfitId,   setLookbookOutfitId]   = useState<string | null>(null);

  const handleGenerate = (payload: OutfitGeneratePayload, webdenOner: boolean) => {
    const mutation = webdenOner ? generateWebOutfit : generateOutfit;
    mutation.mutate(payload, { onSuccess: (d) => setFreshResults(d.kombin ? [d.kombin] : []) });
  };

  const handleFeedback = (id: string, begeniyor: boolean) => {
    setPendingFeedbackId(id);
    rateOutfit.mutate({ id, begeniyor }, { onSettled: () => setPendingFeedbackId(null) });
  };

  const handleSave = (outfit: OutfitRecommendation) => {
    const payload: SaveToArchivePayload = {
      baslik: outfit.baslik,
      aciklama: outfit.aciklama,
      ipucu: outfit.ipucu,
      havaDurumu: outfit.havaDurumu as unknown as Record<string, unknown>,
      kiyafetler: outfit.kiyafetler.map((k) => k._id),
      disUrunler: outfit.disUrunler,
    };
    setPendingSaveId(outfit.id);
    saveOutfit.mutate(payload, { onSettled: () => setPendingSaveId(null) });
  };

  const isGenerating = generateOutfit.isPending || generateWebOutfit.isPending;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted mb-1">AI STİL</p>
        <h1 className="text-2xl font-black text-text leading-none">AI Kombin Üretici</h1>
        <p className="text-sm text-muted mt-1">Durum, hava ve stilini seç, AI dolabından senin için en uygun kombini seçsin.</p>
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr] gap-8 items-start">
        {/* Left: Sticky Generator */}
        <div className="sticky top-6">
          <OutfitGeneratorPanel onGenerate={handleGenerate} isLoading={isGenerating} weather={weather} />
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {isGenerating && (
            <div className="rounded-[32px] overflow-hidden" style={{ background: SBG, border: BDR }}>
              <div className="h-1 w-full bg-gold-gradient animate-pulse" />
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-3 gap-2 rounded-2xl overflow-hidden">
                  {[1,2,3].map((i) => <div key={i} className="skeleton aspect-[3/4] rounded-2xl" />)}
                </div>
                <div className="skeleton h-5 w-2/3 rounded" />
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-5/6 rounded" />
              </div>
            </div>
          )}

          {!isGenerating && freshResults.length > 0 && (
            <div className="space-y-4 animate-slide-up">
              <div className="flex items-center justify-between">
                <p className="text-[18px] font-bold text-text">Önerilen kombin</p>
                <span className="text-[13px] font-semibold text-muted">{freshResults.length} kombin</span>
              </div>
              
              {freshResults.map((r) => (
                <OutfitResultCard
                  key={r.id} outfit={r} isFresh
                  onFeedback={handleFeedback} onSave={handleSave} onTryOn={setLookbookOutfitId}
                  isFeedbackLoading={pendingFeedbackId === r.id}
                  isSaveLoading={pendingSaveId === r.id}
                />
              ))}
            </div>
          )}

          {!isGenerating && freshResults.length === 0 && (
            <div
              className="rounded-[32px] p-12 flex flex-col items-center justify-center text-center gap-4 min-h-[400px]"
              style={{ background: SBG, border: BDR }}
            >
              <div className="h-16 w-16 rounded-full flex items-center justify-center mb-2" style={{ background: IBG, border: ABD }}>
                <Sparkles className="h-7 w-7 text-gold" />
              </div>
              <div>
                <p className="text-[17px] font-bold text-text mb-1.5">Kombin burada belirecek</p>
                <p className="text-sm text-muted">Soldaki panelden durum, hava ve stili seç, AI kombini hazırlasın</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <LookbookModal
        outfit={freshResults.find((r) => r.id === lookbookOutfitId) || null}
        onClose={() => setLookbookOutfitId(null)}
        onSave={(outfit) => { handleSave(outfit); setLookbookOutfitId(null); }}
        isSaveLoading={pendingSaveId === lookbookOutfitId}
      />
    </div>
  );
}
