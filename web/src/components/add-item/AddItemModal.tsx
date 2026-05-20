"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, Loader2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { useAnalyzeItem, useAddItem } from "@/lib/hooks/useItems";
import type { ItemCategory, ItemSeason, ItemStyle } from "@/types";

const SEASONS: ItemSeason[] = ["Yaz", "Kış", "İlkbahar", "Sonbahar", "Tüm Mevsimler"];
const STYLES: ItemStyle[] = [
  "Günlük", "Spor", "Şık", "Klasik", "Bohem", "Minimalist", "Vintage", "Sokak Stili",
];
const CATEGORIES: ItemCategory[] = [
  "Üst Giyim", "Alt Giyim", "Elbise & Etek", "Dış Giyim", "Ayakkabı", "Aksesuar",
];

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = "drop" | "analyze" | "confirm";

export function AddItemModal({ open, onClose }: AddItemModalProps) {
  const [step, setStep] = useState<Step>("drop");
  const [preview, setPreview] = useState<string | null>(null);
  const [resimUrl, setResimUrl] = useState("");
  const [cloudinaryId, setCloudinaryId] = useState("");

  // Form state — single values matching items.ts AddItemPayload
  const [kategori, setKategori] = useState<ItemCategory>("Üst Giyim");
  const [renk, setRenk] = useState("");
  const [mevsim, setMevsim] = useState<ItemSeason>("Tüm Mevsimler");
  const [stil, setStil] = useState<ItemStyle>("Günlük");
  const [marka, setMarka] = useState("");

  const analyzeItem = useAnalyzeItem();
  const addItem = useAddItem(() => handleClose());

  const handleClose = () => {
    setStep("drop");
    setPreview(null);
    setResimUrl("");
    setCloudinaryId("");
    setKategori("Üst Giyim");
    setRenk("");
    setMevsim("Tüm Mevsimler");
    setStil("Günlük");
    setMarka("");
    onClose();
  };

  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      setPreview(URL.createObjectURL(file));
      setStep("analyze");

      analyzeItem.mutate(file, {
        onSuccess: (data) => {
          setResimUrl(data.resimUrl);
          setCloudinaryId(data.cloudinaryId);
          const a = data.analiz;
          setKategori(a.kategori);
          setRenk(a.renk);
          setMevsim(a.mevsim[0] ?? "Tüm Mevsimler");
          setStil(a.stil[0] ?? "Günlük");
          setStep("confirm");
        },
        onError: () => {
          setStep("drop");
          setPreview(null);
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
    disabled: step !== "drop",
  });

  const handleSave = () => {
    addItem.mutate({ resimUrl, cloudinaryId, kategori, renk, mevsim, stil, marka: marka || undefined });
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="glass rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 className="text-lg font-semibold">Add New Item</h2>
            <button onClick={handleClose} className="text-muted hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* ── Step 1: Drop ── */}
            {step === "drop" && (
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors",
                  isDragActive ? "border-gold bg-gold/5" : "border-border hover:border-gold/50"
                )}
              >
                <input {...getInputProps()} />
                <Upload className="h-10 w-10 mx-auto text-muted mb-3" />
                <p className="text-sm font-medium">Drop image here or click to upload</p>
                <p className="text-[12px] text-muted mt-1">PNG, JPG, WEBP up to 10MB</p>
              </div>
            )}

            {/* ── Step 2: Analyzing ── */}
            {step === "analyze" && (
              <div className="flex flex-col items-center gap-4 py-8">
                {preview && (
                  <div className="relative h-40 w-32 rounded-xl overflow-hidden">
                    <Image src={preview} alt="Uploading" fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 text-gold animate-spin" />
                    </div>
                  </div>
                )}
                <p className="text-sm text-muted">AI is analysing your item…</p>
              </div>
            )}

            {/* ── Step 3: Confirm ── */}
            {step === "confirm" && (
              <>
                <div className="flex gap-4 items-start">
                  {preview && (
                    <div className="relative h-28 w-20 rounded-xl overflow-hidden flex-shrink-0">
                      <Image src={preview} alt="Preview" fill className="object-cover" />
                    </div>
                  )}
                  <div className="flex-1 space-y-3">
                    {/* Category */}
                    <div>
                      <label className="text-[12px] text-muted mb-1.5 block">Category</label>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((c) => (
                          <button key={c} type="button" onClick={() => setKategori(c)}
                            className={cn("px-3 py-1 rounded-full text-[12px] border transition-colors",
                              kategori === c ? "border-gold bg-gold/10 text-gold" : "border-border text-muted hover:border-gold/40"
                            )}
                          >{c}</button>
                        ))}
                      </div>
                    </div>
                    {/* Color */}
                    <div>
                      <label className="text-[12px] text-muted mb-1.5 block">Color</label>
                      <input value={renk} onChange={(e) => setRenk(e.target.value)}
                        placeholder="e.g. Navy Blue"
                        className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-gold"
                      />
                    </div>
                  </div>
                </div>

                {/* Brand */}
                <div>
                  <label className="text-[12px] text-muted mb-1.5 block">Brand (optional)</label>
                  <input value={marka} onChange={(e) => setMarka(e.target.value)}
                    placeholder="Zara, H&M…"
                    className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-gold"
                  />
                </div>

                {/* Season */}
                <div>
                  <label className="text-[12px] text-muted mb-1.5 block">Season</label>
                  <div className="flex flex-wrap gap-2">
                    {SEASONS.map((s) => (
                      <button key={s} type="button" onClick={() => setMevsim(s)}
                        className={cn("px-3 py-1 rounded-full text-[12px] border transition-colors",
                          mevsim === s ? "border-gold bg-gold/10 text-gold" : "border-border text-muted hover:border-gold/40"
                        )}
                      >{s}</button>
                    ))}
                  </div>
                </div>

                {/* Style */}
                <div>
                  <label className="text-[12px] text-muted mb-1.5 block">Style</label>
                  <div className="flex flex-wrap gap-2">
                    {STYLES.map((s) => (
                      <button key={s} type="button" onClick={() => setStil(s)}
                        className={cn("px-3 py-1 rounded-full text-[12px] border transition-colors",
                          stil === s ? "border-gold bg-gold/10 text-gold" : "border-border text-muted hover:border-gold/40"
                        )}
                      >{s}</button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="ghost"
                    onClick={() => { setStep("drop"); setPreview(null); }}
                  >Re-upload</Button>
                  <Button type="button" fullWidth loading={addItem.isPending} onClick={handleSave}>
                    Save to wardrobe
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
