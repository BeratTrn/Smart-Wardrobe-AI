"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles, Shirt, ChevronRight } from "lucide-react";
import { useOutfits } from "@/lib/hooks/useOutfits";

const S    = "transparent"; // Parent page should handle background if needed, or use surface
const C    = "var(--color-surface)";
const B    = "1px solid var(--color-border)";
const IA   = "rgba(201,168,76,0.12)";
const GA   = "1px solid rgba(201,168,76,0.20)";
const TBGC = "rgba(0,0,0,0.55)";
const BTNB = "1px solid rgba(201,168,76,0.25)";

function OutfitCard({ outfit }: { outfit: any }) {
  const items = (outfit.kiyafetler ?? []) as any[];
  const first = items[0];
  const rest  = items.slice(1, 3); // next 2 items

  return (
    <div
      className="rounded-[24px] overflow-hidden flex-shrink-0 w-[280px] h-[340px] cursor-pointer group relative transition-transform duration-300"
      style={{ border: B }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      {/* Images container */}
      <div className="absolute inset-0 flex flex-col bg-[#1A1A14]">
        {/* Top half: main image */}
        <div className="relative h-1/2 w-full border-b border-[#1E1E18]">
          {first ? (
            <Image src={first.resimUrl} alt={first.kategori} fill className="object-cover" sizes="280px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Shirt className="h-10 w-10 text-muted/30" />
            </div>
          )}
        </div>
        
        {/* Bottom half: split images */}
        <div className="relative h-1/2 w-full flex">
          {rest.map((item: any, idx: number) => (
            <div key={item._id} className="relative h-full flex-1" style={{ borderLeft: idx > 0 ? '1px solid #1E1E18' : 'none' }}>
              <Image src={item.resimUrl} alt={item.kategori} fill className="object-cover" sizes="140px" />
            </div>
          ))}
          {rest.length === 0 && (
            <div className="absolute inset-0 bg-[#161614]" />
          )}
        </div>
      </div>

      {/* Gradient Overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />

      {/* Top Badges */}
      <div className="absolute top-3 left-3">
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full"
          style={{ background: "rgba(0,0,0,0.4)", color: "#E8E8E8", backdropFilter: "blur(8px)" }}
        >
          {outfit.etkinlik ?? "Günlük"}
        </span>
      </div>
      <div className="absolute top-3 right-3">
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-full text-gold"
          style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))", border: "1px solid rgba(201,168,76,0.3)", backdropFilter: "blur(8px)" }}
        >
          <Sparkles className="h-3 w-3" /> {outfit.kaydedildi ? "KAYITLI" : "AI"}
        </span>
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="text-lg font-bold text-white mb-1 shadow-black drop-shadow-md">{outfit.baslik}</h3>
        {outfit.aiIpucu && (
          <p className="text-[11px] leading-tight line-clamp-1 mb-2 shadow-black drop-shadow-md" style={{ color: "var(--color-gold)" }}>
            <Sparkles className="inline-block h-2.5 w-2.5 mr-0.5" /> {outfit.aiIpucu}
          </p>
        )}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.2)" }}>
          <Shirt className="h-3 w-3 text-gold" />
          <span className="text-[11px] font-semibold text-gold">
            {items.length} parça
          </span>
        </div>
      </div>
    </div>
  );
}

export function RecentOutfits() {
  const { data, isPending } = useOutfits(1, 6);
  const outfits = data?.kombinler ?? [];

  return (
    <div className="pt-2">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3 text-[11px] font-bold text-gold"
            style={{ background: IA, border: GA }}
          >
            <Sparkles className="h-3 w-3" /> AI ÖNERİSİ
          </div>
          <p className="text-base font-black text-text leading-none">Sana Özel Kombinler</p>
          <p className="text-[12px] mt-1" style={{ color: "var(--color-muted)" }}>
            Kaydedilmiş favori kombinlerin
          </p>
        </div>
        <Link
          href="/saved-outfits"
          className="flex items-center gap-1 text-[12px] font-semibold whitespace-nowrap mt-1 px-3 py-1.5 rounded-xl"
          style={{ color: "var(--color-gold)", border: BTNB, background: IA }}
        >
          Tümünü Gör <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {isPending ? (
        <div className="skeleton h-72 w-[280px] rounded-[24px]" />
      ) : outfits.length === 0 ? (
        <div className="rounded-[20px] p-8 text-center max-w-[280px]" style={{ background: C, border: B }}>
          <div
            className="h-14 w-14 rounded-full mx-auto flex items-center justify-center mb-3"
            style={{ background: IA, border: GA }}
          >
            <Sparkles className="h-6 w-6 text-gold/60" />
          </div>
          <p className="text-sm font-semibold text-text mb-1">Henüz kombin yok.</p>
          <Link href="/outfits" className="text-[12px] text-gold hover:underline">
            İlk kombini oluştur →
          </Link>
        </div>
      ) : (
        <div className="flex justify-start">
          <OutfitCard outfit={outfits[0]} />
        </div>
      )}
    </div>
  );
}
