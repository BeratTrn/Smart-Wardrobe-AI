"use client";

import { useState } from "react";
import { X, MapPin, Calendar, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useGenerateSuitcase } from "@/lib/hooks/useTravel";

const S  = "var(--color-bg)";
const C  = "var(--color-surface)";
const B  = "1px solid var(--color-border)";
const IA = "var(--color-gold-dim)";
const GA = "1px solid var(--color-gold-border)";

interface TravelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TravelModal({ isOpen, onClose }: TravelModalProps) {
  const [sehir, setSehir] = useState("");
  const [baslangicTarihi, setBaslangicTarihi] = useState("");
  const [bitisTarihi, setBitisTarihi] = useState("");

  const { mutate: generate, isPending } = useGenerateSuitcase();

  if (!isOpen) return null;

  // Calculate days difference
  let gunSayisi = 0;
  if (baslangicTarihi && bitisTarihi) {
    const diff = new Date(bitisTarihi).getTime() - new Date(baslangicTarihi).getTime();
    if (diff >= 0) {
      gunSayisi = Math.ceil(diff / (1000 * 3600 * 24)) + 1;
    }
  }

  const handleGenerate = () => {
    if (!sehir || !baslangicTarihi || !bitisTarihi) return;
    generate(
      { sehir, baslangicTarihi, bitisTarihi },
      {
        onSuccess: () => {
          onClose();
          setSehir("");
          setBaslangicTarihi("");
          setBitisTarihi("");
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="w-full max-w-md rounded-3xl overflow-hidden relative"
        style={{ background: S, border: B, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}
      >
        {/* Header */}
        <div className="p-6 pb-4 flex items-start gap-4">
          <div className="flex-shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: IA, border: GA }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 16V8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
              <path d="M4 16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <path d="M12 22v-4" />
              <path d="M8 22v-4" />
              <path d="M16 22v-4" />
            </svg>
          </div>
          <div className="flex-1 mt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--color-muted)" }}>
              YENİ SEYAHAT PLANI
            </span>
            <h2 className="text-2xl font-bold text-text leading-tight">Yeni Seyahat Planı</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition-colors text-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 pt-2 space-y-5">
          {/* Gidilecek Şehir */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider block mb-2" style={{ color: "var(--color-muted)" }}>
              GİDİLECEK ŞEHİR
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "var(--color-gold)" }} />
              <input 
                type="text" 
                value={sehir}
                onChange={(e) => setSehir(e.target.value)}
                placeholder="Örn: Roma" 
                className="w-full h-[52px] pl-12 pr-4 rounded-xl text-sm font-medium outline-none transition-colors"
                style={{ background: C, border: B, color: "var(--color-text)" }}
              />
            </div>
          </div>

          {/* Seyahat Tarihleri */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider block mb-2" style={{ color: "var(--color-muted)" }}>
              SEYAHAT TARİHLERİ
            </label>
            <div className="relative flex items-center justify-between px-4 h-[52px] rounded-xl" style={{ background: C, border: B }}>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5" style={{ color: "var(--color-gold)" }} />
                <div className="flex items-center gap-2">
                  <input 
                    type="date" 
                    value={baslangicTarihi}
                    onChange={(e) => setBaslangicTarihi(e.target.value)}
                    className="bg-transparent text-sm font-medium outline-none w-[110px]"
                    style={{ color: "var(--color-text)", colorScheme: "dark" }}
                  />
                  <span style={{ color: "var(--color-muted)" }}>→</span>
                  <input 
                    type="date" 
                    value={bitisTarihi}
                    onChange={(e) => setBitisTarihi(e.target.value)}
                    className="bg-transparent text-sm font-medium outline-none w-[110px]"
                    style={{ color: "var(--color-text)", colorScheme: "dark" }}
                  />
                </div>
              </div>
              {gunSayisi > 0 && (
                <span className="text-[12px] font-bold" style={{ color: "var(--color-gold)" }}>
                  {gunSayisi} gün
                </span>
              )}
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isPending || !sehir || !baslangicTarihi || !bitisTarihi}
            className="w-full h-14 mt-4 rounded-2xl flex items-center justify-center gap-2 text-black font-bold text-[15px] transition-opacity disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-light) 100%)" }}
          >
            {isPending ? (
              <>Hazırlanıyor...</>
            ) : (
              <>
                <Sparkles className="h-5 w-5" /> AI ile Bavulumu Hazırla <Sparkles className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
