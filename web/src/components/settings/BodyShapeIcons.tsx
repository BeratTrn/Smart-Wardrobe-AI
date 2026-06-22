import type { BodyShape, FitPreference } from "@/types";

/**
 * Closed-loop Catmull-Rom -> cubic Bezier path through a list of points.
 * Produces an organic, smooth silhouette instead of a jagged polygon.
 */
function smoothClosedPath(points: [number, number][]): string {
  const n = points.length;
  let d = `M${points[0][0]},${points[0][1]} `;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0]},${p2[1]} `;
  }
  return d + "Z";
}

// Half-widths (px, from vertical center line) at each body level.
// These directly encode the verbal descriptions used in the UI copy.
const SHAPE_WIDTHS: Record<BodyShape, { shoulder: number; bust: number; waist: number; hip: number }> = {
  kum_saati:  { shoulder: 18, bust: 16, waist: 9,  hip: 18 }, // omuz & kalca dengeli, bel belirgin
  armut:      { shoulder: 13, bust: 14, waist: 13, hip: 20 }, // kalca omuzdan daha genis
  ters_ucgen: { shoulder: 20, bust: 16, waist: 13, hip: 11 }, // omuz kalcadan daha genis
  dikdortgen: { shoulder: 15, bust: 15, waist: 14, hip: 15 }, // hemen hemen esit
};

const CX = 32;
const Y = { shoulder: 24, bust: 37, waist: 54, hip: 70, leg: 85 };
const LEG_HALF = 6.5;

/** Vücut şekli siluet ikonu — Kum Saati / Armut / Ters Üçgen / Dikdörtgen */
export function BodyShapeIcon({
  shape,
  active,
  className = "h-12 w-10",
}: {
  shape: BodyShape;
  active?: boolean;
  className?: string;
}) {
  const w = SHAPE_WIDTHS[shape];
  const pts: [number, number][] = [
    [CX - w.shoulder, Y.shoulder],
    [CX - w.bust, Y.bust],
    [CX - w.waist, Y.waist],
    [CX - w.hip, Y.hip],
    [CX - LEG_HALF, Y.leg],
    [CX + LEG_HALF, Y.leg],
    [CX + w.hip, Y.hip],
    [CX + w.waist, Y.waist],
    [CX + w.bust, Y.bust],
    [CX + w.shoulder, Y.shoulder],
  ];
  const d = smoothClosedPath(pts);
  const color = active ? "var(--color-gold)" : "var(--color-muted)";

  return (
    <svg viewBox="0 0 64 92" className={className} style={{ color }} fill="none">
      <circle
        cx={CX}
        cy={12}
        r={7.5}
        fill={active ? "var(--color-gold-dim)" : "var(--color-card)"}
        stroke="currentColor"
        strokeWidth={2}
      />
      <path
        d={d}
        fill={active ? "var(--color-gold-dim)" : "var(--color-card)"}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Garment-silhouette widths for fit preference (slim / regular / oversize).
const FIT_WIDTHS: Record<
  FitPreference,
  { neck: number; shoulder: number; body: number; shoulderY: number; sleeveY: number; tuckY: number; hemY: number }
> = {
  slim:     { neck: 5, shoulder: 10, body: 7,  shoulderY: 16, sleeveY: 22, tuckY: 25, hemY: 50 },
  regular:  { neck: 6, shoulder: 14, body: 11, shoulderY: 15, sleeveY: 25, tuckY: 29, hemY: 51 },
  oversize: { neck: 7, shoulder: 19, body: 16, shoulderY: 13, sleeveY: 29, tuckY: 33, hemY: 53 },
};

/** Kalip tercihi siluet ikonu — Slim / Regular / Oversize (kiyafet siluet) */
export function FitShapeIcon({
  fit,
  active,
  className = "h-12 w-10",
}: {
  fit: FitPreference;
  active?: boolean;
  className?: string;
}) {
  const f = FIT_WIDTHS[fit];
  const collarDepth = 6;
  const d = [
    `M${CX - f.neck},${f.shoulderY}`,
    `L${CX - f.shoulder},${f.shoulderY}`,
    `L${CX - f.shoulder},${f.sleeveY}`,
    `L${CX - f.body},${f.tuckY}`,
    `L${CX - f.body},${f.hemY}`,
    `L${CX + f.body},${f.hemY}`,
    `L${CX + f.body},${f.tuckY}`,
    `L${CX + f.shoulder},${f.sleeveY}`,
    `L${CX + f.shoulder},${f.shoulderY}`,
    `L${CX + f.neck},${f.shoulderY}`,
    `Q${CX},${f.shoulderY + collarDepth} ${CX - f.neck},${f.shoulderY}`,
    "Z",
  ].join(" ");
  const color = active ? "var(--color-gold)" : "var(--color-muted)";

  return (
    <svg viewBox="0 0 64 64" className={className} style={{ color }} fill="none">
      <circle
        cx={CX}
        cy={7}
        r={4.5}
        fill={active ? "var(--color-gold-dim)" : "var(--color-card)"}
        stroke="currentColor"
        strokeWidth={1.6}
      />
      <path
        d={d}
        fill={active ? "var(--color-gold-dim)" : "var(--color-card)"}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  );
}
