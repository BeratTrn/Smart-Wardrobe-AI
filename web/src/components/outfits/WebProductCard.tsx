"use client";

import Image from "next/image";
import { ExternalLink, ShoppingBag } from "lucide-react";
import type { WebProduct } from "@/types";

const BDR = "1px solid #1E1E18";
const SBG = "#161614";
const IBG = "rgba(201,168,76,0.12)";
const ABD = "1px solid rgba(201,168,76,0.25)";

interface WebProductCardProps {
  product: WebProduct;
}

const formatPrice = (fiyat: number | null) => {
  if (fiyat === null || Number.isNaN(fiyat)) return null;
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(fiyat);
};

export function WebProductCard({ product }: WebProductCardProps) {
  const fiyatMetni = formatPrice(product.fiyat);

  return (
    <a
      href={product.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-2xl overflow-hidden transition-transform hover:-translate-y-0.5"
      style={{ background: SBG, border: BDR }}
    >
      <div className="relative aspect-square">
        {product.resimUrl ? (
          <Image
            src={product.resimUrl}
            alt={product.ad}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 200px"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#111110" }}>
            <ShoppingBag className="h-6 w-6 text-muted" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full text-gold"
            style={{ background: IBG, border: ABD, backdropFilter: "blur(6px)" }}
          >
            🔗 Bunu da dene
          </span>
        </div>
      </div>

      <div className="p-3 space-y-1">
        <p className="text-[12px] font-semibold text-text leading-snug line-clamp-2">{product.ad}</p>
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {fiyatMetni ? (
            <span className="text-[13px] font-bold text-gold">{fiyatMetni}</span>
          ) : (
            <span className="text-[11px] text-muted">{product.kaynak}</span>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted group-hover:text-gold transition-colors">
            Satın Al <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      </div>
    </a>
  );
}
