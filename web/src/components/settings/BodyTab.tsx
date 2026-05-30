"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUpdateBodyProfile } from "@/lib/hooks/useUsers";
import { Button } from "@/components/ui/Button";
import { getErrorMessage } from "@/lib/utils/errors";
import type { BodyShape, FitPreference, UserProfile } from "@/types";

interface BodyTabProps {
  profile: UserProfile;
}

const BODY_SHAPES: { value: BodyShape; label: string; emoji: string; desc: string }[] = [
  { value: "kum_saati", label: "Hourglass", emoji: "⌛", desc: "Shoulders & hips balanced, defined waist" },
  { value: "armut",     label: "Pear",      emoji: "🍐", desc: "Hips wider than shoulders" },
  { value: "ters_ucgen",label: "Inverted △",emoji: "🔺", desc: "Shoulders wider than hips" },
  { value: "dikdortgen",label: "Rectangle", emoji: "▭",  desc: "Shoulders, waist & hips similar width" },
];

const FIT_PREFS: { value: FitPreference; label: string; desc: string }[] = [
  { value: "slim",     label: "Slim",     desc: "Close to the body, tailored look" },
  { value: "regular",  label: "Regular",  desc: "Classic, comfortable fit" },
  { value: "oversize", label: "Oversize", desc: "Relaxed, roomy silhouette" },
];

export function BodyTab({ profile }: BodyTabProps) {
  const [bodyShape, setBodyShape] = useState<BodyShape | "">(
    (profile.vucut?.sekil as BodyShape) || ""
  );
  const [fitPreference, setFitPreference] = useState<FitPreference | "">(
    (profile.vucut?.kalip as FitPreference) || ""
  );
  const [saved, setSaved] = useState(false);

  const updateBody = useUpdateBodyProfile(() => setSaved(true));

  const handleSave = () => {
    setSaved(false);
    updateBody.mutate({
      bodyShape: bodyShape || undefined,
      fitPreference: fitPreference || undefined,
    });
  };

  return (
    <div className="space-y-7">
      <div>
        <h3 className="text-sm font-semibold mb-1">Body Shape</h3>
        <p className="text-[12px] text-muted mb-4">
          Helps Claude pick clothes that flatter your silhouette
        </p>
        <div className="grid grid-cols-2 gap-3">
          {BODY_SHAPES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => { setBodyShape(s.value); setSaved(false); }}
              className={cn(
                "rounded-xl border p-4 text-left transition-all",
                bodyShape === s.value
                  ? "border-gold bg-gold/10 ring-1 ring-gold/30"
                  : "border-border hover:border-gold/40 bg-white/3"
              )}
            >
              <div className="text-2xl mb-1">{s.emoji}</div>
              <p className="text-sm font-medium">{s.label}</p>
              <p className="text-[11px] text-muted mt-0.5 leading-snug">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-1">Fit Preference</h3>
        <p className="text-[12px] text-muted mb-4">
          How you prefer your clothes to sit on your body
        </p>
        <div className="grid grid-cols-3 gap-3">
          {FIT_PREFS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => { setFitPreference(f.value); setSaved(false); }}
              className={cn(
                "rounded-xl border p-4 text-center transition-all",
                fitPreference === f.value
                  ? "border-gold bg-gold/10 ring-1 ring-gold/30"
                  : "border-border hover:border-gold/40 bg-white/3"
              )}
            >
              <p className="text-sm font-semibold">{f.label}</p>
              <p className="text-[11px] text-muted mt-1 leading-snug">{f.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {updateBody.isError && (
        <p className="text-sm text-danger">{getErrorMessage(updateBody.error)}</p>
      )}

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          loading={updateBody.isPending}
          disabled={!bodyShape && !fitPreference}
        >
          Save Body Profile
        </Button>
        {saved && !updateBody.isPending && (
          <div className="flex items-center gap-1.5 text-success text-sm">
            <CheckCircle className="h-4 w-4" />
            Saved
          </div>
        )}
      </div>
    </div>
  );
}
