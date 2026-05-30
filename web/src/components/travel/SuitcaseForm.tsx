"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plane, Loader2, Luggage } from "lucide-react";
import { suitcaseSchema, type SuitcaseFormData } from "@/lib/validations/settings";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface SuitcaseFormProps {
  onGenerate: (data: SuitcaseFormData) => void;
  isLoading: boolean;
}

// Today's date as yyyy-mm-dd for the min attribute
function today() {
  return new Date().toISOString().slice(0, 10);
}

export function SuitcaseForm({ onGenerate, isLoading }: SuitcaseFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SuitcaseFormData>({
    resolver: zodResolver(suitcaseSchema),
    defaultValues: {
      sehir: "",
      baslangicTarihi: today(),
      bitisTarihi: today(),
    },
  });

  const startDate = watch("baslangicTarihi");

  return (
    <div className="glass rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
          <Luggage className="h-4.5 w-4.5 text-gold" />
        </div>
        <div>
          <h2 className="font-semibold text-sm">Pack My Suitcase</h2>
          <p className="text-[11px] text-muted mt-0.5">
            AI picks the best items from your wardrobe
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onGenerate)} className="space-y-4">
        {/* Destination */}
        <Input
          label="Destination City"
          placeholder="e.g. Paris, Tokyo, New York"
          error={errors.sehir?.message}
          {...register("sehir")}
        />

        {/* Date row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted block">Start Date</label>
            <input
              type="date"
              min={today()}
              className={`w-full rounded-lg border px-3 py-2 text-sm bg-white/5 outline-none transition-colors
                focus:border-gold focus:ring-1 focus:ring-gold/20
                ${errors.baslangicTarihi ? "border-danger" : "border-border"}`}
              {...register("baslangicTarihi")}
            />
            {errors.baslangicTarihi && (
              <p className="text-[11px] text-danger">{errors.baslangicTarihi.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] text-muted block">End Date</label>
            <input
              type="date"
              min={startDate || today()}
              className={`w-full rounded-lg border px-3 py-2 text-sm bg-white/5 outline-none transition-colors
                focus:border-gold focus:ring-1 focus:ring-gold/20
                ${errors.bitisTarihi ? "border-danger" : "border-border"}`}
              {...register("bitisTarihi")}
            />
            {errors.bitisTarihi && (
              <p className="text-[11px] text-danger">{errors.bitisTarihi.message}</p>
            )}
          </div>
        </div>

        <Button type="submit" fullWidth loading={isLoading} className="gap-2 mt-1">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              AI is packing your suitcase…
            </>
          ) : (
            <>
              <Plane className="h-4 w-4" />
              Generate Packing List
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
