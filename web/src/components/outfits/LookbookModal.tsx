"use client";

import { useState, useRef } from "react";

import Image from "next/image";
import { ChevronLeft, Sparkles, User, Bookmark, Loader2, Lightbulb, Image as ImageIcon, ShoppingBag, ExternalLink } from "lucide-react";
import type { OutfitRecommendation } from "@/types";

interface LookbookModalProps {
  outfit: OutfitRecommendation | null;
  onClose: () => void;
  onSave: (outfit: OutfitRecommendation) => void;
  isSaveLoading: boolean;
}

export function LookbookModal({ outfit, onClose, onSave, isSaveLoading }: LookbookModalProps) {
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!outfit) return null;

  const topItem = outfit.kiyafetler.find((k: any) => k.kategori === "Üst Giyim" || k.kategori === "Dış Giyim");
  const bottomItem = outfit.kiyafetler.find((k: any) => k.kategori === "Alt Giyim" || k.kategori === "Elbise");
  const shoesItem = outfit.kiyafetler.find((k: any) => k.kategori === "Ayakkabı");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setTryOnImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-12 pointer-events-none">
        <div
          className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[32px] pointer-events-auto flex flex-col shadow-2xl"
          style={{ background: "#0A0A0A", border: "1px solid var(--color-border)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8), 0 0 0 1px var(--color-gold-dim)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 md:p-8 border-b" style={{ borderColor: "var(--color-gold-dim)" }}>
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="flex items-center justify-center h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 transition text-muted hover:text-white"
              >
                <ChevronLeft className="h-5 w-5 -ml-0.5" />
              </button>
              <div>
                <h2 className="text-xl md:text-2xl font-black tracking-[0.2em] text-white leading-none">LOOKBOOK</h2>
                <p className="text-[10px] text-gold/80 tracking-widest mt-1.5 uppercase font-semibold">Kişisel Stil Yayını</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-bold text-gold"
                style={{ background: "var(--color-gold-dim)", border: "1px solid var(--color-gold-border)" }}
              >
                <Sparkles className="h-3.5 w-3.5" /> AI Engine
              </div>
              <button
                onClick={() => onSave(outfit)}
                disabled={isSaveLoading}
                className="px-6 py-2.5 rounded-full bg-gold-gradient text-black font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSaveLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor...</>
                ) : (
                  <><Bookmark className="h-4 w-4" fill="currentColor" /> Stilimi Kaydet</>
                )}
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col md:flex-row gap-8 scrollbar-none">
            {/* Left: Try On (Photo) */}
            <div className="flex-1 flex flex-col">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors min-h-[400px] group relative overflow-hidden"
                style={{ background: "var(--color-bg)", border: tryOnImage ? "none" : "1px border-dashed rgba(201,168,76,0.3)" }}
              >
                {tryOnImage ? (
                  <>
                    <Image src={tryOnImage} alt="Deneme" fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm">
                      <div className="h-14 w-14 rounded-full flex items-center justify-center mb-3 bg-white/10 text-white">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                      <p className="text-white font-medium">Fotoğrafı Değiştir</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gold-gradient opacity-0 group-hover:opacity-5 transition-opacity" />
                    <div className="h-20 w-20 rounded-full flex items-center justify-center mb-6 transition-transform group-hover:scale-110" style={{ background: "var(--color-gold-dim)", border: "1px solid var(--color-gold-border)" }}>
                      <User className="h-8 w-8 text-gold" />
                    </div>
                    <h3 className="text-xl text-white font-bold mb-2">Fotoğrafınızı Ekleyin</h3>
                    <p className="text-sm text-muted">Sanal deneme (Try-on) için fotoğraf yükleyin</p>
                  </>
                )}
              </div>
            </div>

            {/* Right: Items & Note */}
            <div className="flex-[1.2] flex flex-col gap-6">
              
              {/* Items Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {topItem && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] text-gold font-bold flex items-center gap-1.5 uppercase tracking-wider">ÜST GİYİM</p>
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#F4F4F4] shadow-lg group">
                      <Image src={topItem.resimUrl} alt="Üst" fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  </div>
                )}
                {bottomItem && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] text-gold font-bold flex items-center gap-1.5 uppercase tracking-wider">ALT GİYİM</p>
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#F4F4F4] shadow-lg group">
                      <Image src={bottomItem.resimUrl} alt="Alt" fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  </div>
                )}
                {shoesItem && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] text-gold font-bold flex items-center gap-1.5 uppercase tracking-wider">AYAKKABI</p>
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#F4F4F4] shadow-lg group">
                      <Image src={shoesItem.resimUrl} alt="Ayakkabı" fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  </div>
                )}
                {(outfit.disUrunler ?? []).map((urun, idx) => (
                  <a
                    key={`${urun.link}-${idx}`}
                    href={urun.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col gap-2 group"
                  >
                    <p className="text-[10px] text-gold font-bold flex items-center gap-1.5 uppercase tracking-wider">
                      <ShoppingBag className="h-3 w-3" /> WEB'DEN
                    </p>
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#F4F4F4] shadow-lg">
                      {urun.resimUrl ? (
                        <Image src={urun.resimUrl} alt={urun.ad} fill unoptimized className="object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg)]">
                          <ShoppingBag className="h-6 w-6 text-muted" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white px-3 py-1.5 rounded-full bg-black/60">
                          Satın Al <ExternalLink className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              {/* Stylist Note */}
              <div className="mt-auto rounded-[24px] p-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1A1812 0%, var(--color-bg) 100%)", border: "1px solid var(--color-gold-dim)" }}>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold flex items-center gap-2 mb-4 relative z-10">
                  <Sparkles className="h-4 w-4" /> STİLİSTİN NOTU
                </p>
                <p className="text-[15px] text-white/90 leading-relaxed italic relative z-10 mb-5">
                  "{outfit.aciklama}"
                </p>
                {outfit.ipucu && (
                  <div className="flex items-start gap-3 p-4 rounded-xl relative z-10" style={{ background: "rgba(201,168,76,0.05)", border: "1px solid var(--color-gold-dim)" }}>
                    <Lightbulb className="h-5 w-5 text-gold flex-shrink-0" />
                    <p className="text-[13px] text-gold leading-relaxed">
                      {outfit.ipucu}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
