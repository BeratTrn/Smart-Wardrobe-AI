"use client";

import { useState } from "react";
import { Plane } from "lucide-react";
import { SuitcaseForm } from "@/components/travel/SuitcaseForm";
import { SuitcaseCard } from "@/components/travel/SuitcaseCard";
import { SuitcaseList } from "@/components/travel/SuitcaseList";
import {
  useGenerateSuitcase,
  useSuitcases,
  useDeleteSuitcase,
} from "@/lib/hooks/useTravel";
import type { SuitcaseFormData } from "@/lib/validations/settings";
import type { TravelSuitcase } from "@/types";

export default function TravelPage() {
  const { data, isPending: listLoading } = useSuitcases();
  const generateSuitcase = useGenerateSuitcase();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const deleteSuitcase = useDeleteSuitcase();
  const [freshSuitcase, setFreshSuitcase] = useState<TravelSuitcase | null>(null);

  const handleGenerate = (formData: SuitcaseFormData) => {
    generateSuitcase.mutate(
      {
        sehir: formData.sehir,
        baslangicTarihi: formData.baslangicTarihi,
        bitisTarihi: formData.bitisTarihi,
      },
      {
        onSuccess: (res) => setFreshSuitcase(res.bavul),
      }
    );
  };

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
    deleteSuitcase.mutate(id, {
      onSettled: () => {
        setPendingDeleteId(null);
        if (freshSuitcase?._id === id) setFreshSuitcase(null);
      },
    });
  };

  const suitcases = data?.bavullar ?? [];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
          <Plane className="h-5 w-5 text-gold" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Travel Planner</h1>
          <p className="text-sm text-muted mt-0.5">
            AI-powered packing lists tailored to your wardrobe and destination
          </p>
        </div>
      </div>

      {/* Generator + fresh result */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Left: Form */}
        <SuitcaseForm
          onGenerate={handleGenerate}
          isLoading={generateSuitcase.isPending}
        />

        {/* Right: Fresh result */}
        <div>
          {generateSuitcase.isPending && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="h-0.5 w-full bg-gold-gradient animate-pulse" />
              <div className="p-5 space-y-4">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <div className="skeleton h-5 w-32 rounded" />
                    <div className="skeleton h-3 w-48 rounded" />
                  </div>
                  <div className="skeleton h-10 w-16 rounded-xl" />
                </div>
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-5/6 rounded" />
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="skeleton h-12 w-12 rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {!generateSuitcase.isPending && freshSuitcase && (
            <SuitcaseCard
              suitcase={freshSuitcase}
              isFresh
              onDelete={handleDelete}
              isDeleting={pendingDeleteId === freshSuitcase._id}
            />
          )}

          {!generateSuitcase.isPending && !freshSuitcase && (
            <div className="glass rounded-2xl p-10 text-center text-muted border border-dashed border-border">
              <Plane className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Your AI packing list will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Saved Suitcases</h2>
          {suitcases.length > 0 && (
            <span className="text-[12px] text-muted">{suitcases.length} trips</span>
          )}
        </div>
        <SuitcaseList
          suitcases={suitcases}
          isLoading={listLoading}
          onDelete={handleDelete}
          pendingDeleteId={pendingDeleteId}
        />
      </div>
    </div>
  );
}
