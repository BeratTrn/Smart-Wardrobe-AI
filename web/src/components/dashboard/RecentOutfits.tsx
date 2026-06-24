"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles, Shirt, ChevronRight, ShoppingBag } from "lucide-react";
import { useSavedOutfits } from "@/lib/hooks/useSavedOutfits";
import { useT } from "@/lib/i18n";

const C    = "var(--color-surface)";
const B    = "1px solid var(--color-border)";
const IA   = "var(--color-gold-dim)";
const GA   = "1px solid var(--color-gold-border)";
const BTNB = "1px solid var(--color-gold-border)";

interface CollageImage {
  src: string;
  alt: string;
  isWeb?: boolean;
}

// Kombinin gardırop parçaları (+ webden seçilen ürünler varsa onlar da) küçük bir
// kolaj olarak gösterilir. 1-4 görsel için farklı grid düzenleri kullanılır.
function OutfitCollage({ images }: { images: CollageImage[] }) {
  if (images.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#1A1A14]">
        <Shirt className="h-8 w-8 text-muted/30" />
      </div>
    );
  }

  if (images.length === 1) {
    const img = images[0];
    return (
      <div className="absolute inset-0">
        <Image src={img.src} alt={img.alt} fill unoptimized className="object-cover" sizes="140px" />
        {img.isWeb && <WebBadge />}
      </div>
    );
  }

  if (images.length === 2) {
    return (
      <div className="absolute inset-0 grid grid-cols-2 gap-0.5 bg-[var(--color-border)]">
        {images.map((img, idx) => (
          <div key={idx} className="relative">
            <Image src={img.src} alt={img.alt} fill unoptimized className="object-cover" sizes="70px" />
            {img.isWeb && <WebBadge small />}
          </div>
        ))}
      </div>
    );
  }

  if (images.length === 3) {
    return (
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5 bg-[var(--color-border)]">
        <div className="relative row-span-2">
          <Image src={images[0].src} alt={images[0].alt} fill unoptimized className="object-cover" sizes="70px" />
          {images[0].isWeb && <WebBadge small />}
        </div>
        {images.slice(1, 3).map((img, idx) => (
          <div key={idx} className="relative">
            <Image src={img.src} alt={img.alt} fill unoptimized className="object-cover" sizes="70px" />
            {img.isWeb && <WebBadge small />}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5 bg-[var(--color-border)]">
      {images.slice(0, 4).map((img, idx) => (
        <div key={idx} className="relative">
          <Image src={img.src} alt={img.alt} fill unoptimized className="object-cover" sizes="70px" />
          {img.isWeb && <WebBadge small />}
        </div>
      ))}
    </div>
  );
}

function WebBadge({ small = false }: { small?: boolean }) {
  const { t } = useT();
  return (
    <div
      className={`absolute ${small ? "top-1 right-1 h-4 w-4" : "top-2 right-2 h-5 w-5"} rounded-full flex items-center justify-center`}
      style={{ background: "rgba(201,168,76,0.9)" }}
      title={t("web.dashboard.web_suggested")}
    >
      <ShoppingBag className={small ? "h-2 w-2 text-black" : "h-2.5 w-2.5 text-black"} />
    </div>
  );
}

function OutfitCard({ outfit }: { outfit: any }) {
  const { t } = useT();
  const kiyafetler = (outfit.kiyafetler ?? []) as any[];
  const disUrunler = (outfit.disUrunler ?? []) as any[];

  const images: CollageImage[] = [
    ...kiyafetler.map((k) => ({ src: k.resimUrl, alt: k.kategori, isWeb: false })),
    ...disUrunler.map((p) => ({ src: p.resimUrl, alt: p.ad, isWeb: true })),
  ].filter((img) => !!img.src);

  const toplamParca = kiyafetler.length + disUrunler.length;

  return (
    <Link
      href="/saved-outfits"
      className="group relative flex-shrink-0 w-[140px] rounded-[20px] overflow-hidden cursor-pointer snap-start transition-transform duration-300 hover:-translate-y-0.5"
      style={{ background: C, border: B }}
    >
      {/* Image collage */}
      <div className="relative aspect-square" style={{ background: "#1A1A14" }}>
        <OutfitCollage images={images} />

        {/* Top badges */}
        <div className="absolute top-2 left-2">
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: "rgba(0,0,0,0.5)", color: "#E8E8E8", backdropFilter: "blur(6px)" }}
          >
            {outfit.etkinlik ?? t("add_item.casual")}
          </span>
        </div>
      </div>

      {/* Content below image */}
      <div className="p-3">
        <p className="text-[12px] font-bold text-text leading-tight mb-1 line-clamp-2">{outfit.baslik}</p>
        <div className="flex items-center gap-1">
          <Shirt className="h-3 w-3 text-gold" />
          <span className="text-[11px] font-semibold text-gold">{toplamParca} {t("home.items")}</span>
          {outfit.kaydedildi && (
            <Sparkles className="h-3 w-3 text-gold ml-auto" />
          )}
        </div>
      </div>
    </Link>
  );
}

export function RecentOutfits() {
  // "Sana Özel Kombinler" = kullanıcının "Kombinlerim" arşivine kaydettiği kombinler.
  // Burada AI önerisi tüm geçmiş kombinlerden değil, sadece arşivden gelir —
  // arşivde 3 kombin varsa burada da 3 kombin gösterilir.
  const { t } = useT();
  const { data, isPending } = useSavedOutfits();
  const saved = data?.kombinler ?? [];
  const outfits = saved.map((s: any) => s.kombId ?? s).filter(Boolean);

  return (
    <div className="pt-2">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3 text-[11px] font-bold text-gold"
            style={{ background: IA, border: GA }}
          >
            <Sparkles className="h-3 w-3" /> {t("home.ai_badge")}
          </div>
          <p className="text-base font-black text-text leading-none">{t("home.my_outfits")}</p>
          <p className="text-[12px] mt-1" style={{ color: "var(--color-muted)" }}>
            {t("web.dashboard.saved_favorites_subtitle")}
          </p>
        </div>
        <Link
          href="/saved-outfits"
          className="flex items-center gap-1 text-[12px] font-semibold whitespace-nowrap mt-1 px-3 py-1.5 rounded-xl"
          style={{ color: "var(--color-gold)", border: BTNB, background: IA }}
        >
          {t("home.see_all")} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {isPending ? (
        <div className="flex gap-4 overflow-hidden">
          {[1,2,3,4,5].map((i) => <div key={i} className="skeleton h-[200px] w-[140px] rounded-[20px] flex-shrink-0" />)}
        </div>
      ) : outfits.length === 0 ? (
        <div className="rounded-[20px] p-8 text-center max-w-[280px]" style={{ background: C, border: B }}>
          <div
            className="h-14 w-14 rounded-full mx-auto flex items-center justify-center mb-3"
            style={{ background: IA, border: GA }}
          >
            <Sparkles className="h-6 w-6 text-gold/60" />
          </div>
          <p className="text-sm font-semibold text-text mb-1">{t("home.empty_lookbook")}</p>
          <Link href="/outfits" className="text-[12px] text-gold hover:underline">
            {t("web.dashboard.create_first_outfit")}
          </Link>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-4 snap-x">
          {outfits.map((outfit: any) => (
            <OutfitCard key={outfit._id} outfit={outfit} />
          ))}
        </div>
      )}
    </div>
  );
}
