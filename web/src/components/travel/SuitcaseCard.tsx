"use client";

import { useState } from "react";
import Image from "next/image";
import { Calendar, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { TravelSuitcase } from "@/types";

const S  = "#111110";
const C  = "#161614";
const B  = "1px solid #1E1E18";
const IA = "rgba(201,168,76,0.12)";
const GA = "1px solid rgba(201,168,76,0.25)";

interface SuitcaseCardProps {
  suitcase: TravelSuitcase;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
  isFresh?: boolean;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  const day = date.getDate();
  const months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  return `${day} ${months[date.getMonth()]}`;
}

export function SuitcaseCard({ suitcase, onDelete, isDeleting, isFresh = false }: SuitcaseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    _id, sehir, baslangicTarihi, bitisTarihi, gunSayisi,
    havaDurumuOzeti, havaSicakligi, tahminiHava,
    onerilenkiyafetler, aiAciklamasi, aiIpucu
  } = suitcase;

  return (
    <article
      className={cn(
        "rounded-[20px] overflow-hidden transition-all duration-300",
        isFresh && "ring-1 ring-gold/40"
      )}
      style={{ background: S, border: B }}
    >
      {/* Gold accent bar for fresh */}
      {isFresh && (
        <div
          className="h-0.5 w-full"
          style={{ background: "linear-gradient(90deg, #C9A84C, #E8C97A, #C9A84C)" }}
        />
      )}

      <div className="p-5 space-y-4">
        {/* Top Header: Title, Weather, Delete */}
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-1">
            {isFresh && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-gold" style={{ background: IA, border: GA }}>
                <Sparkles className="h-2.5 w-2.5" /> Yeni
              </div>
            )}
            <h3 className="text-xl font-black text-text uppercase tracking-wider leading-tight">
              {sehir}
            </h3>
            <div className="flex flex-col gap-1.5 mt-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--color-muted)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--color-muted)" }}>
                  {formatDate(baslangicTarihi)} → {formatDate(bitisTarihi)}
                </span>
              </div>
              <div>
                <span
                  className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md"
                  style={{ background: "transparent", border: GA, color: "var(--color-gold)" }}
                >
                  {gunSayisi} gün
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Weather pill */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: C, border: B }}>
              {havaSicakligi !== null && (
                <span className="text-sm font-bold text-text">{havaSicakligi}°C</span>
              )}
              <span className="text-[12px] capitalize" style={{ color: "var(--color-muted)" }}>
                {havaDurumuOzeti}
                {tahminiHava && <span className="opacity-60 ml-1">(tahmini)</span>}
              </span>
            </div>

            {/* Trash Button */}
            {onDelete && (
              <button
                onClick={() => onDelete(_id)}
                disabled={isDeleting}
                className="flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-colors"
                style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(248,113,113,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Item thumbnails */}
        {onerilenkiyafetler.length > 0 && (
          <div className="flex gap-2.5 flex-wrap pt-2">
            {onerilenkiyafetler.map((item) => (
              <div
                key={item._id}
                className="relative h-20 w-20 rounded-[14px] overflow-hidden flex-shrink-0 bg-[#F4F4F4]"
                title={`${item.kategori} · ${item.renk}`}
              >
                <Image src={item.resimUrl} alt={item.kategori} fill className="object-cover" sizes="80px" />
              </div>
            ))}
          </div>
        )}

        {/* AI Description */}
        {aiAciklamasi && (
          <p
            onClick={() => setIsExpanded(true)}
            className={cn("text-[13px] leading-relaxed italic text-text-sub cursor-pointer pt-1", !isExpanded && "line-clamp-3")}
          >
            {aiAciklamasi}
          </p>
        )}

        {/* AI Tip */}
        {(isExpanded || !aiAciklamasi) && aiIpucu && (
          <div
            className="rounded-xl px-4 py-3.5 flex items-start gap-2.5 mt-2"
            style={{ background: "transparent", border: "1px solid rgba(201,168,76,0.3)" }}
          >
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "var(--color-gold)" }} />
            <p className="text-[13px] leading-relaxed italic" style={{ color: "var(--color-gold)" }}>
              {aiIpucu}
            </p>
          </div>
        )}

        {/* Expand / Collapse Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[11px] font-semibold flex items-center gap-1 mt-1 hover:opacity-80 transition"
          style={{ color: "var(--color-gold)" }}
        >
          {isExpanded ? "Daralt ^" : "Devamını Oku ∨"}
        </button>

      </div>
    </article>
  );
}
