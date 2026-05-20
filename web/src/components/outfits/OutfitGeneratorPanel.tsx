"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sparkles, MapPin, Calendar } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// ── Schema ────────────────────────────────────────────────────────────

const schema = z.object({
  etkinlik: z.string().min(2, { message: "Please describe the occasion." }).max(80),
  sehir: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// ── Quick-pick occasion chips ─────────────────────────────────────────

const OCCASIONS = [
  "Business Meeting",
  "Casual Day Out",
  "Date Night",
  "Gym Session",
  "Formal Dinner",
  "Weekend Brunch",
];

// ── Props ─────────────────────────────────────────────────────────────

interface OutfitGeneratorPanelProps {
  onGenerate: (etkinlik: string, sehir?: string) => void;
  isLoading: boolean;
}

// ── Component ─────────────────────────────────────────────────────────

export function OutfitGeneratorPanel({
  onGenerate,
  isLoading,
}: OutfitGeneratorPanelProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const currentOccasion = watch("etkinlik") ?? "";

  const onSubmit = (data: FormData) => {
    onGenerate(data.etkinlik, data.sehir || undefined);
  };

  return (
    <div className="glass rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gold-gradient flex items-center justify-center shadow-card shrink-0">
          <Sparkles size={17} className="text-black" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-text leading-tight">
            AI Outfit Generator
          </h2>
          <p className="text-xs text-muted">
            Claude analyses your wardrobe + live weather
          </p>
        </div>
      </div>

      {/* Quick-pick chips */}
      <div className="flex flex-wrap gap-2">
        {OCCASIONS.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setValue("etkinlik", o, { shouldValidate: true })}
            className={cn(
              "h-7 px-3 rounded-full border text-xs font-medium transition-all duration-150",
              currentOccasion === o
                ? "border-gold/60 bg-gold/10 text-gold"
                : "border-border text-text-sub hover:border-gold/30 hover:text-text"
            )}
          >
            {o}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Input
          label="Occasion / Event"
          placeholder="e.g. Business dinner in Zurich"
          leftIcon={<Calendar size={15} />}
          error={errors.etkinlik?.message}
          disabled={isLoading}
          {...register("etkinlik")}
        />
        <Input
          label="City (optional — for live weather)"
          placeholder="e.g. Istanbul, Paris, New York"
          leftIcon={<MapPin size={15} />}
          disabled={isLoading}
          {...register("sehir")}
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={isLoading}
          leftIcon={!isLoading ? <Sparkles size={16} /> : undefined}
          className="mt-1"
        >
          {isLoading ? "Claude is styling you…" : "Generate outfit"}
        </Button>
      </form>
    </div>
  );
}
