"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plane, Loader2, Luggage, Sparkles } from "lucide-react";
import { suitcaseSchema, type SuitcaseFormData } from "@/lib/validations/settings";

const S  = "var(--color-bg)";
const C  = "var(--color-surface)";
const B  = "1px solid var(--color-border)";
const GB = "1px solid var(--color-gold-border)";

interface SuitcaseFormProps {
  onGenerate: (data: SuitcaseFormData) => void;
  isLoading: boolean;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const DATE_INPUT_STYLE = `w-full rounded-xl border px-4 py-3 text-sm bg-transparent outline-none transition-colors focus:border-gold text-text`;

export function SuitcaseForm({ onGenerate, isLoading }: SuitcaseFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SuitcaseFormData>({
    resolver: zodResolver(suitcaseSchema),
    defaultValues: { sehir: "", baslangicTarihi: today(), bitisTarihi: today() },
  });

  const startDate = watch("baslangicTarihi");

  return (
    <div className="rounded-[20px] p-6 space-y-6" style={{ background: S, border: B }}>
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
            style={{ background: "var(--color-gold-dim)", border: "1px solid var(--color-gold-border)", color: "var(--color-gold)" }}
          >
            <Sparkles className="h-3 w-3" /> AI SEYAHAT
          </div>
        </div>
        <h2 className="text-xl font-black text-text leading-tight">Bavulumu Hazırla</h2>
        <p className="text-[12px] mt-1" style={{ color: "var(--color-muted)" }}>
          AI dolabından en uygun kıyafetleri seçer
        </p>
      </div>

      <form onSubmit={handleSubmit(onGenerate)} className="space-y-5">
        {/* City */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--color-muted)" }}>
            GİDİLECEK ŞEHİR
          </p>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: C, border: B }}>
            <Plane className="h-4 w-4 flex-shrink-0" style={{ color: "var(--color-muted)" }} />
            <input
              type="text"
              placeholder="Paris, Tokyo, New York…"
              className="flex-1 bg-transparent text-sm text-text placeholder:text-muted outline-none"
              {...register("sehir")}
            />
          </div>
          {errors.sehir && <p className="text-[11px] text-danger pl-1">{errors.sehir.message}</p>}
        </div>

        {/* Dates */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--color-muted)" }}>
            SEYAHAT TARİHLERİ
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>Başlangıç</p>
              <input
                type="date"
                min={today()}
                className={`${DATE_INPUT_STYLE} ${errors.baslangicTarihi ? "border-danger" : "border-[var(--color-border)]"}`}
                {...register("baslangicTarihi")}
              />
              {errors.baslangicTarihi && (
                <p className="text-[11px] text-danger">{errors.baslangicTarihi.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>Bitiş</p>
              <input
                type="date"
                min={startDate || today()}
                className={`${DATE_INPUT_STYLE} ${errors.bitisTarihi ? "border-danger" : "border-[var(--color-border)]"}`}
                {...register("bitisTarihi")}
              />
              {errors.bitisTarihi && (
                <p className="text-[11px] text-danger">{errors.bitisTarihi.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 rounded-2xl text-black font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-light) 50%, var(--color-gold) 100%)" }}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              AI bavul hazırlıyor…
            </>
          ) : (
            <>
              <Luggage className="h-4 w-4" />
              ✦ AI ile Bavulumu Hazırla
            </>
          )}
        </button>
      </form>
    </div>
  );
}
