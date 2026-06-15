"use client";

import { OutfitResultCard } from "@/components/outfits/OutfitResultCard";
import { SuitcaseList } from "@/components/travel/SuitcaseList";
import { TravelModal } from "@/components/travel/TravelModal";
import { useDeleteSavedOutfit, useSavedOutfits } from "@/lib/hooks/useSavedOutfits";
import { useDeleteSuitcase, useSuitcases } from "@/lib/hooks/useTravel";
import { BookOpen, Plane, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Tab = "kombinler" | "bavullar";

const S  = "#111110";
const C  = "#161614";
const B  = "1px solid #1E1E18";
const IA = "rgba(201,168,76,0.12)";
const GA = "1px solid rgba(201,168,76,0.25)";

export default function SavedOutfitsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("kombinler");
  const [isTravelModalOpen, setIsTravelModalOpen] = useState(false);

  // Combinations
  const { data: outfitsData, isPending: outfitsLoading } = useSavedOutfits();
  const { mutate: deleteSaved, variables: delVars, isPending: isDeleting } = useDeleteSavedOutfit();

  // Suitcases
  const { data: suitcasesData, isPending: suitcasesLoading } = useSuitcases();
  const { mutate: deleteSuitcase, variables: bagVars, isPending: isBagDeleting } = useDeleteSuitcase();

  const outfits   = outfitsData?.kombinler ?? [];
  const suitcases = suitcasesData?.bavullar ?? [];

  const TABS: { id: Tab; label: string; count: number; icon: React.ElementType }[] = [
    { id: "kombinler", label: "Kombinlerim",         count: outfits.length,   icon: Sparkles },
    { id: "bavullar",  label: "Seyahat Bavullarım",  count: suitcases.length, icon: Plane },
  ];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: "var(--color-muted)" }}>
            STİL ARŞİVİ
          </p>
          <h1 className="text-2xl font-black text-text leading-none">Arşivim</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
            Kayıtlı kombinlerin ve seyahat bavulların
          </p>
        </div>

        {activeTab === "kombinler" ? (
          <Link
            href="/outfits"
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-bold text-black flex-shrink-0 mt-1"
            style={{ background: "linear-gradient(135deg, #C9A84C 0%, #E8C97A 100%)" }}
          >
            <Sparkles className="h-3.5 w-3.5" /> Yeni Kombin
          </Link>
        ) : (
          <button
            onClick={() => setIsTravelModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-bold text-black flex-shrink-0 mt-1"
            style={{ background: "linear-gradient(135deg, #C9A84C 0%, #E8C97A 100%)" }}
          >
            <Plus className="h-3.5 w-3.5" /> Yeni Seyahat
          </button>
        )}
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 rounded-2xl p-1"
        style={{ background: S, border: B }}
      >
        {TABS.map(({ id, label, count, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200"
              style={
                active
                  ? { background: IA, border: GA, color: "var(--color-gold)" }
                  : { color: "var(--color-muted)" }
              }
            >
              <Icon className="h-4 w-4" />
              {label}
              {count > 0 && (
                <span
                  className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                  style={
                    active
                      ? { background: "rgba(201,168,76,0.25)", color: "var(--color-gold)" }
                      : { background: C, color: "var(--color-muted)" }
                  }
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Kombinler Tab */}
      {activeTab === "kombinler" && (
        <>
          {outfitsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} className="rounded-[20px] p-5 space-y-3" style={{ background: C, border: B }}>
                  <div className="skeleton h-4 w-2/3 rounded" />
                  <div className="skeleton h-3 w-full rounded" />
                </div>
              ))}
            </div>
          ) : outfits.length === 0 ? (
            <div className="rounded-[20px] p-16 text-center" style={{ background: S, border: B }}>
              <div
                className="h-16 w-16 rounded-full mx-auto flex items-center justify-center mb-4"
                style={{ background: IA, border: GA }}
              >
                <BookOpen className="h-7 w-7" style={{ color: "var(--color-gold)" }} />
              </div>
              <p className="text-base font-bold text-text mb-1">Henüz kaydedilmiş kombin yok</p>
              <p className="text-sm mb-4" style={{ color: "var(--color-muted)" }}>
                AI Kombin sayfasından kombinler oluştur ve kaydet.
              </p>
              <Link
                href="/outfits"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-black"
                style={{ background: "linear-gradient(135deg, #C9A84C 0%, #E8C97A 100%)" }}
              >
                <Sparkles className="h-4 w-4" /> Kombin Oluştur
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {outfits.map((saved: any) => (
                <OutfitResultCard
                  key={saved._id}
                  outfit={saved.kombId || saved}
                  showRemove
                  onRemove={() => deleteSaved(saved._id)}
                  isRemoveLoading={isDeleting && delVars === saved._id}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Bavullar Tab */}
      {activeTab === "bavullar" && (
        <SuitcaseList
          suitcases={suitcases}
          isLoading={suitcasesLoading}
          onDelete={(id) => deleteSuitcase(id)}
          pendingDeleteId={isBagDeleting ? bagVars : null}
          onNewSuitcase={() => setIsTravelModalOpen(true)}
        />
      )}
      
      <TravelModal 
        isOpen={isTravelModalOpen} 
        onClose={() => setIsTravelModalOpen(false)} 
      />
    </div>
  );
}
