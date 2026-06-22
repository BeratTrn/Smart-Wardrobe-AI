"use client";

import { useState } from "react";
import { CheckCircle, Check, Sparkles } from "lucide-react";
import { useUpdateBodyProfile } from "@/lib/hooks/useUsers";
import { getErrorMessage } from "@/lib/utils/errors";
import type { BodyShape, FitPreference, UserProfile } from "@/types";

const SBG = "var(--color-surface)";
const BDR = "1px solid var(--color-border)";
const GBD = "1px solid var(--color-gold)";
const IBG = "var(--color-gold-dim)";

interface BodyTabProps { profile: UserProfile; }

const BODY_SHAPES: { value: BodyShape; label: string; desc: string; num: string }[] = [
  { value: "kum_saati",  label: "Kum Saati",   desc: "Omuz & kalca dengeli, bel belirgin",   num: "01" },
  { value: "armut",      label: "Armut",        desc: "Kalca omuzdan biraz daha genis",       num: "02" },
  { value: "ters_ucgen", label: "Ters Ucgen",   desc: "Omuz kalcadan daha genis",             num: "03" },
  { value: "dikdortgen", label: "Dikdortgen",   desc: "Omuz, bel ve kalca hemen hemen esit",  num: "04" },
];

const FIT_PREFS: { value: FitPreference; label: string; desc: string; icon: string }[] = [
  { value: "slim",     label: "Slim-fit",  desc: "Vucuda yakin, dar kesim",  icon: "narrow" },
  { value: "regular",  label: "Regular",   desc: "Standart, dengeli kesim",  icon: "medium" },
  { value: "oversize", label: "Oversize",  desc: "Rahat, bol siluet",        icon: "wide" },
];

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <span className="h-px flex-1" style={{ background: "var(--color-gold)", opacity: 0.25 }} />
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">{label}</span>
      <span className="h-px flex-1" style={{ background: "var(--color-gold)", opacity: 0.25 }} />
    </div>
  );
}

function FitIcon({ icon }: { icon: string }) {
  if (icon === "narrow") return <div className="w-2 h-5 rounded-sm border-2 border-current mx-auto" />;
  if (icon === "medium") return <div className="w-3.5 h-5 rounded-sm border-2 border-current mx-auto" />;
  return <div className="w-5 h-5 rounded-sm border-2 border-current mx-auto" />;
}

export function BodyTab({ profile }: BodyTabProps) {
  const [bodyShape,     setBodyShape]     = useState<BodyShape | "">((profile.vucut?.sekil as BodyShape) || "");
  const [fitPreference, setFitPreference] = useState<FitPreference | "">((profile.vucut?.kalip as FitPreference) || "");
  const [saved,         setSaved]         = useState(false);

  const updateBody = useUpdateBodyProfile(() => setSaved(true));

  const handleSave = () => {
    setSaved(false);
    updateBody.mutate({ bodyShape: bodyShape || undefined, fitPreference: fitPreference || undefined });
  };

  return (
    <div className="space-y-7">
      {/* AI info banner */}
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3"
        style={{ background: IBG, border: "1px solid var(--color-gold-border)" }}
      >
        <Sparkles className="h-3.5 w-3.5 text-gold flex-shrink-0 mt-0.5" />
        <p className="text-[12px] leading-relaxed" style={{ color: "var(--color-gold)" }}>
          AI stilistiniz bu bilgileri kullanarak sana vucut tipine ozel kombinler onerecek.
        </p>
      </div>

      {/* VUCUT SEKLI - 2x2 grid */}
      <div className="space-y-3">
        <SectionDivider label="VUCUT SEKLI" />
        <p className="text-[12px] text-muted">Sana en yakin vucut tipini sec</p>
        <div className="grid grid-cols-2 gap-3">
          {BODY_SHAPES.map((s) => {
            const active = bodyShape === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => { setBodyShape(s.value); setSaved(false); }}
                className="relative flex flex-col gap-3 rounded-2xl p-4 text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  background: active ? IBG : SBG,
                  border: active ? GBD : BDR,
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: active ? "var(--color-gold)" : "var(--color-muted)" }}
                  >
                    {s.num}
                  </span>
                  <div
                    className="h-5 w-5 rounded-full flex items-center justify-center"
                    style={{
                      border: active ? "none" : "2px solid var(--color-border)",
                      background: active ? "var(--color-gold)" : "transparent",
                    }}
                  >
                    {active && <Check className="h-3 w-3 text-black" strokeWidth={3} />}
                  </div>
                </div>
                <div>
                  <p
                    className="text-sm font-semibold leading-snug"
                    style={{ color: active ? "var(--color-gold)" : "var(--color-text)" }}
                  >
                    {s.label}
                  </p>
                  <p className="text-[11px] text-muted leading-snug mt-0.5">{s.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* KALIP TERCIHI */}
      <div className="space-y-3">
        <SectionDivider label="KALIP TERCIHI" />
        <p className="text-[12px] text-muted">Nasil giyinmeyi seversin?</p>
        <div className="space-y-2">
          {FIT_PREFS.map((f) => {
            const active = fitPreference === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => { setFitPreference(f.value); setSaved(false); }}
                className="w-full flex items-center gap-4 rounded-xl p-4 text-left transition-all duration-200"
                style={{ background: active ? IBG : SBG, border: active ? GBD : BDR }}
              >
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: active ? "rgba(201,168,76,0.2)" : "var(--color-border)",
                    color: active ? "var(--color-gold)" : "var(--color-muted)",
                  }}
                >
                  <FitIcon icon={f.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: active ? "var(--color-gold)" : "var(--color-text)" }}>
                    {f.label}
                  </p>
                  <p className="text-[11px] text-muted leading-snug mt-0.5">{f.desc}</p>
                </div>
                <div
                  className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    border: active ? "none" : "2px solid var(--color-border)",
                    background: active ? "var(--color-gold)" : "transparent",
                  }}
                >
                  {active && <Check className="h-3 w-3 text-black" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {updateBody.isError && (
        <p className="text-sm text-danger">{getErrorMessage(updateBody.error)}</p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={updateBody.isPending || (!bodyShape && !fitPreference)}
          className="px-6 py-2.5 rounded-xl bg-gold-gradient text-black font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {updateBody.isPending ? "Kaydediliyor..." : "Profili Kaydet"}
        </button>
        {saved && !updateBody.isPending && (
          <div className="flex items-center gap-1.5 text-success text-sm">
            <CheckCircle className="h-4 w-4" /> Kaydedildi
          </div>
        )}
      </div>
    </div>
  );
}
