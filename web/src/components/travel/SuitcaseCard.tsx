"use client";

import Image from "next/image";
import { Trash2, MapPin, Calendar, Thermometer, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { TravelSuitcase } from "@/types";

interface SuitcaseCardProps {
  suitcase: TravelSuitcase;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
  /** When true renders as the freshly-generated result (gold accent, expanded) */
  isFresh?: boolean;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function WeatherIcon({ icon, durum }: { icon: string; durum: string }) {
  if (!icon) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://openweathermap.org/img/wn/${icon}@2x.png`}
      alt={durum}
      width={40}
      height={40}
      className="drop-shadow-sm"
    />
  );
}

export function SuitcaseCard({
  suitcase,
  onDelete,
  isDeleting,
  isFresh = false,
}: SuitcaseCardProps) {
  const {
    _id,
    sehir,
    baslangicTarihi,
    bitisTarihi,
    gunSayisi,
    havaDurumuOzeti,
    havaSicakligi,
    havaIkonu,
    tahminiHava,
    onerilenkiyafetler,
    aiAciklamasi,
    aiIpucu,
    createdAt,
  } = suitcase;

  return (
    <article
      className={cn(
        "glass rounded-2xl overflow-hidden transition-all duration-300",
        isFresh && "ring-1 ring-gold/50"
      )}
    >
      {/* Gold accent bar */}
      {isFresh && <div className="h-0.5 w-full bg-gold-gradient" />}

      <div className="p-5 space-y-4">
        {/* Header: city + weather */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <MapPin className="h-3.5 w-3.5 text-gold flex-shrink-0" />
              <h3 className="font-semibold text-base leading-tight truncate">{sehir}</h3>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-muted">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>
                {formatDate(baslangicTarihi)} → {formatDate(bitisTarihi)}
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-gold/10 text-gold text-[10px] font-medium">
                {gunSayisi}d
              </span>
            </div>
          </div>

          {/* Weather badge */}
          <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-1">
              {havaIkonu && <WeatherIcon icon={havaIkonu} durum={havaDurumuOzeti} />}
              {havaSicakligi !== null && (
                <div className="flex items-center gap-0.5">
                  <Thermometer className="h-3.5 w-3.5 text-gold" />
                  <span className="text-sm font-semibold">{havaSicakligi}°C</span>
                </div>
              )}
            </div>
            <span className="text-[11px] text-muted capitalize">{havaDurumuOzeti}</span>
            {tahminiHava && (
              <span className="text-[10px] text-muted/60 italic">estimated</span>
            )}
          </div>
        </div>

        {/* AI description */}
        {aiAciklamasi && (
          <p className="text-[13px] text-muted leading-relaxed line-clamp-3">
            {aiAciklamasi}
          </p>
        )}

        {/* AI tip */}
        {aiIpucu && (
          <div className="rounded-xl bg-gold/5 border border-gold/15 px-4 py-3 flex gap-2">
            <Info className="h-3.5 w-3.5 text-gold flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-gold-light leading-relaxed">{aiIpucu}</p>
          </div>
        )}

        {/* Item thumbnails */}
        {onerilenkiyafetler.length > 0 && (
          <div>
            <p className="text-[11px] text-muted uppercase tracking-wide mb-2">
              {onerilenkiyafetler.length} items packed
            </p>
            <div className="flex gap-2 flex-wrap">
              {onerilenkiyafetler.map((item) => (
                <div
                  key={item._id}
                  className="relative h-12 w-12 rounded-lg overflow-hidden bg-white/5 ring-1 ring-white/10 flex-shrink-0"
                  title={`${item.kategori} · ${item.renk}`}
                >
                  <Image
                    src={item.resimUrl}
                    alt={item.kategori}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer: created + delete */}
        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          <span className="text-[11px] text-muted">
            Packed {formatDate(createdAt)}
          </span>
          {onDelete && (
            <button
              onClick={() => onDelete(_id)}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[12px] text-muted hover:border-danger/40 hover:text-danger transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
