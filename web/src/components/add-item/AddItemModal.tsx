"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, UploadCloud, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAnalyzeItem, useAddItem } from "@/lib/hooks/useItems";
import { getErrorMessage } from "@/lib/utils/errors";
import type { ItemCategory, ItemSeason, ItemStyle } from "@/types";
import type { AddItemPayload, AnalyzeOnlyResponse } from "@/lib/api/items";

// ── Constants ─────────────────────────────────────────────────────────

const CATEGORIES: ItemCategory[] = [
  "Üst Giyim", "Alt Giyim", "Elbise & Etek",
  "Dış Giyim", "Ayakkabı", "Aksesuar",
];
const SEASONS: ItemSeason[] = [
  "İlkbahar", "Yaz", "Sonbahar", "Kış", "Tüm Mevsimler",
];
const STYLES: ItemStyle[] = [
  "Günlük", "Klasik", "Spor", "Sokak", "Minimal", "Şık", "Resmi",
];

// ── Form schema ───────────────────────────────────────────────────────

const addItemSchema = z.object({
  kategori: z.enum(CATEGORIES as [ItemCategory, ...ItemCategory[]]),
  renk:     z.string().regex(/^#[0-9A-Fa-f]{6}$/, { message: "Must be a valid hex colour e.g. #2D405C" }),
  mevsim:   z.enum(SEASONS as [ItemSeason, ...ItemSeason[]]),
  stil:     z.enum(STYLES as [ItemStyle, ...ItemStyle[]]),
  marka:    z.string().optional(),
  notlar:   z.string().optional(),
});

type AddItemFormData = z.infer<typeof addItemSchema>;

// ── Step type ─────────────────────────────────────────────────────────

type Step = "drop" | "analyze" | "confirm";

// ── Select field component ────────────────────────────────────────────

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (v: T) => void;
  error?: string;
}) {
  return (
    <div className="w-full space-y-1.5">
      <label className="block text-xs font-medium text-text-sub tracking-wide">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(
          "w-full h-11 rounded-xl border px-3.5 text-sm",
          "bg-card text-text",
          "transition-all duration-200",
          "focus:outline-none focus:ring-1",
          error
            ? "border-danger focus:border-danger focus:ring-danger/20"
            : "border-border focus:border-gold focus:ring-gold/20"
        )}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-danger">
          <span className="inline-block w-1 h-1 rounded-full bg-danger shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// ── Modal component ───────────────────────────────────────────────────

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddItemModal({ isOpen, onClose }: AddItemModalProps) {
  const [step, setStep] = useState<Step>("drop");
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeOnlyResponse | null>(null);

  const analyze = useAnalyzeItem();
  const addItem = useAddItem(() => {
    handleClose();
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AddItemFormData>({
    resolver: zodResolver(addItemSchema),
  });

  const watchedKategori = watch("kategori");
  const watchedMevsim   = watch("mevsim");
  const watchedStil     = watch("stil");
  const watchedRenk     = watch("renk");

  // ── Reset everything and close ──────────────────────────────────────
  const handleClose = useCallback(() => {
    setStep("drop");
    setPreview(null);
    setAnalysis(null);
    analyze.reset();
    addItem.reset();
    reset();
    onClose();
  }, [analyze, addItem, reset, onClose]);

  // ── Dropzone ────────────────────────────────────────────────────────
  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      setPreview(URL.createObjectURL(file));
      setStep("analyze");

      analyze.mutate(file, {
        onSuccess: (data) => {
          setAnalysis(data);
          setValue("kategori", data.analiz.kategori);
          setValue("renk", data.analiz.renk);
          setValue("mevsim", "Tüm Mevsimler");
          setValue("stil", "Günlük");
          setStep("confirm");
        },
        onError: () => {
          setStep("drop");
          setPreview(null);
        },
      });
    },
    [analyze, setValue]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10 MB
    disabled: analyze.isPending,
  });

  // ── Save to wardrobe ────────────────────────────────────────────────
  const onSubmit = (data: AddItemFormData) => {
    if (!analysis) return;
    const payload: AddItemPayload = {
      resimUrl:     analysis.resimUrl,
      cloudinaryId: analysis.cloudinaryId,
      kategori:     data.kategori,
      renk:         data.renk,
      mevsim:       data.mevsim,
      stil:         data.stil,
      marka:        data.marka ?? "",
      notlar:       data.notlar ?? "",
    };
    addItem.mutate(payload);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* ── Modal panel ───────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add new item"
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center p-4",
          "pointer-events-none"
        )}
      >
        <div
          className={cn(
            "relative w-full max-w-xl max-h-[90vh] overflow-y-auto",
            "glass rounded-2xl shadow-card pointer-events-auto",
            "scrollbar-thin"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 glass flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gold-gradient flex items-center justify-center">
                <Sparkles size={14} className="text-black" />
              </div>
              <h2 className="text-base font-semibold text-text">Add new item</h2>
            </div>
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-text hover:bg-surface transition-all"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* ── Step 1: Drop zone ────────────────────────────────── */}
          {step === "drop" && (
            <div className="p-6 space-y-4">
              {analyze.isError && (
                <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                  <AlertCircle size={15} className="shrink-0" />
                  {getErrorMessage(analyze.error)}
                </div>
              )}

              <div
                {...getRootProps()}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-4",
                  "min-h-64 rounded-2xl border-2 border-dashed",
                  "cursor-pointer transition-all duration-200",
                  "text-center select-none",
                  isDragActive
                    ? "border-gold bg-gold/5 scale-[0.99]"
                    : "border-border hover:border-gold/40 hover:bg-gold/[0.02]"
                )}
              >
                <input {...getInputProps()} />

                <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                  <UploadCloud
                    size={28}
                    className={cn(
                      "transition-colors",
                      isDragActive ? "text-gold" : "text-gold/50"
                    )}
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-text">
                    {isDragActive ? "Drop it here" : "Drag & drop your item photo"}
                  </p>
                  <p className="text-xs text-muted">
                    or click to browse — JPG, PNG, WEBP up to 10 MB
                  </p>
                </div>

                <p className="text-[10px] text-muted/60 absolute bottom-3">
                  Our AI will automatically detect the category and colour
                </p>
              </div>
            </div>
          )}

          {/* ── Step 2: AI analysis in progress ─────────────────── */}
          {step === "analyze" && (
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {preview && (
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-border">
                    <Image src={preview} alt="Uploading" fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Sparkles size={24} className="text-gold animate-pulse" />
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-1">
                  <p className="text-xs font-medium text-gold flex items-center gap-1.5">
                    <Sparkles size={12} className="animate-pulse" />
                    AI is analysing your item...
                  </p>
                  {[80, 60, 70, 50, 65].map((w, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="skeleton h-3 w-20 rounded" />
                      <div
                        className="skeleton h-10 rounded-xl"
                        style={{ width: `${w}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Confirm + edit AI results ───────────────── */}
          {step === "confirm" && analysis && (
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
              <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-2.5 text-sm text-success">
                <CheckCircle2 size={15} className="shrink-0" />
                AI analysis complete — review and adjust if needed.
              </div>

              <div className="grid grid-cols-[auto_1fr] gap-4">
                {preview && (
                  <div className="relative w-28 aspect-[3/4] rounded-xl overflow-hidden border border-border shrink-0">
                    <Image src={preview} alt="Item preview" fill className="object-cover" />
                  </div>
                )}

                <div className="space-y-3 min-w-0">
                  <SelectField
                    label="Category"
                    value={watchedKategori}
                    options={CATEGORIES}
                    onChange={(v) => setValue("kategori", v)}
                    error={errors.kategori?.message}
                  />
                  <SelectField
                    label="Season"
                    value={watchedMevsim}
                    options={SEASONS}
                    onChange={(v) => setValue("mevsim", v)}
                    error={errors.mevsim?.message}
                  />
                  <SelectField
                    label="Style"
                    value={watchedStil}
                    options={STYLES}
                    onChange={(v) => setValue("stil", v)}
                    error={errors.stil?.message}
                  />
                </div>
              </div>

              {/* Colour row */}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Input
                    label="Colour (HEX)"
                    placeholder="#2D405C"
                    error={errors.renk?.message}
                    {...register("renk")}
                  />
                </div>
                <div
                  className="w-11 h-11 rounded-xl border border-border shrink-0 transition-colors"
                  style={{
                    backgroundColor:
                      /^#[0-9A-Fa-f]{6}$/.test(watchedRenk ?? "") ? watchedRenk : "#2D405C",
                  }}
                />
              </div>

              <Input
                label="Brand (optional)"
                placeholder="e.g. Zara, H&M"
                {...register("marka")}
              />
              <Input
                label="Notes (optional)"
                placeholder="Any notes about this item"
                {...register("notlar")}
              />

              {addItem.isError && (
                <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                  <AlertCircle size={15} className="shrink-0" />
                  {getErrorMessage(addItem.error)}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setStep("drop");
                    setPreview(null);
                    setAnalysis(null);
                    analyze.reset();
                  }}
                >
                  Re-upload
                </Button>
                <Button
                  type="submit"
                  fullWidth
                  loading={addItem.isPending}
                >
                  Save to wardrobe
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
