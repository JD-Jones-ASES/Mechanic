/**
 * Rectangular shaft in torsion, drawn END-ON (the cross-section). The whole
 * point of the page is a stress distribution that defies round-shaft intuition,
 * so the figure shows it directly: a schematic shear-magnitude profile bulges
 * inward from each edge — a big hump at the midpoint of each LONG side (where
 * tau_max lives, marked with hot dots) and a smaller hump on each short side,
 * all falling to ZERO at the four corners (marked 0). A dashed circle of EQUAL
 * cross-sectional area is overlaid: it carries less stress, which is the "why a
 * square shaft is a bad deal" moment. A torque arc wraps the section.
 *
 * Obeys the engine verdicts (invariant 5): a global `invalid` (a/b outside the
 * tabulated [1,10]) or a scoped tau_max refusal leaves nothing honest to draw,
 * so we render the shared SimRefusal rather than a confident default rectangle.
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";

export function RectTorsionSim({
  values,
  invalid = false,
  invalidVars = [],
}: {
  values: VarRecord;
  invalid?: boolean;
  invalidVars?: string[];
}) {
  // no destructuring defaults for load-bearing values (invariant 5)
  const a = values.a ?? NaN; // long side (m)
  const b = values.b ?? NaN; // short side (m)
  const ab = values.ab ?? NaN;
  const tauMax = values.tau_max ?? NaN;
  const tauRound = values.tau_round ?? NaN;
  const rEq = values.r_eq ?? NaN;
  const etaTau = values.eta_tau ?? NaN;
  const SF = values.SF ?? NaN;

  const refused =
    invalid ||
    invalidVars.includes("tau_max") ||
    ![a, b, ab, tauMax, rEq].every(Number.isFinite);
  if (refused) {
    return (
      <SimRefusal
        ariaLabel="Rectangular shaft cross-section (undefined state)"
        caption="Aspect ratio a/b is outside the tabulated range [1, 10] — no published coefficient, nothing honest to draw."
        height={240}
      />
    );
  }

  const W = 320;
  const H = 240;
  const cx = 150;
  const cy = H / 2;

  // scale so the largest extent (long side OR the equal-area circle's diameter)
  // maps to ~150 px; the round shaft is drawn at the SAME scale so "equal area"
  // reads honestly (its disc and the rectangle enclose the same pixel area)
  const maxExtent = Math.max(a, 2 * rEq);
  const scale = 150 / maxExtent;
  const rw = a * scale; // rectangle width  (long side, horizontal)
  const rh = b * scale; // rectangle height (short side, vertical)
  const xL = cx - rw / 2;
  const xR = cx + rw / 2;
  const yT = cy - rh / 2;
  const yB = cy + rh / 2;
  const rCirc = rEq * scale;

  // heat: shear humps are always visible (they encode the DISTRIBUTION shape),
  // growing and reddening as the peak approaches shear yield (SF -> 1)
  const heat = 0.45 + 0.55 * Math.min(1, Number.isFinite(SF) && SF > 0 ? 1 / SF : 1);
  const danger = Number.isFinite(SF) && SF < 1;
  const shearClass = danger ? "rect-torsion-shear-hot" : "rect-torsion-shear";

  // hump amplitudes (px): long-side hump bigger than the short-side hump, so the
  // long-side midpoint reads as the hottest point; capped to leave a gap so top
  // and bottom humps never cross
  const base = Math.min(rw, rh) * 0.32;
  const ampL = Math.min(base * heat, rh * 0.4);
  const ampS = Math.min(ampL * 0.62, rw * 0.4);

  const N = 24;
  // half-sine hump inward from an edge; `pt(t)` returns [x,y] px
  const hump = (pt: (t: number) => [number, number]) => {
    const pts: string[] = [];
    for (let i = 0; i <= N; i++) pts.push(pt(i / N).map((v) => v.toFixed(2)).join(","));
    return `M ${pts.join(" L ")} Z`;
  };
  const s = (t: number) => Math.sin(Math.PI * t);
  const topHump = hump((t) => (t === 0 || t === 1 ? [xL + t * rw, yT] : [xL + t * rw, yT + ampL * s(t)]));
  const botHump = hump((t) => (t === 0 || t === 1 ? [xL + t * rw, yB] : [xL + t * rw, yB - ampL * s(t)]));
  const leftHump = hump((t) => (t === 0 || t === 1 ? [xL, yT + t * rh] : [xL + ampS * s(t), yT + t * rh]));
  const rightHump = hump((t) => (t === 0 || t === 1 ? [xR, yT + t * rh] : [xR - ampS * s(t), yT + t * rh]));

  const fmtMPa = (v: number) => (Number.isFinite(v) ? `${toDisplay(v, "MPa").toFixed(1)} MPa` : "—");
  const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "—");
  const fmtMm = (v: number) => (Number.isFinite(v) ? toDisplay(v, "mm").toFixed(0) : "—");

  const corners: [number, number][] = [
    [xL, yT],
    [xR, yT],
    [xL, yB],
    [xR, yB],
  ];

  // torque arc: a near-full circle wrapping the section, arrowed
  const rArc = Math.max(rCirc, Math.hypot(rw, rh) / 2) + 16;
  const arc = `M ${cx + rArc} ${cy} A ${rArc} ${rArc} 0 1 1 ${cx} ${cy - rArc}`;

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Rectangular shaft cross-section in torsion" width="100%">
        <title>Cross-section of a rectangular bar under torsion, with the shear stress distribution</title>
        <desc>
          An end-on view of a rectangular bar in torsion. The shear stress bulges inward from each
          edge, largest at the midpoint of the long sides (hot dots — the peak stress) and zero at
          the four corners. A dashed circle of equal cross-sectional area is overlaid for comparison;
          it carries a lower peak stress. A torque arc wraps the section.
        </desc>

        {/* equal-area round shaft, dashed, drawn first so the rectangle sits on top */}
        <circle cx={cx} cy={cy} r={rCirc} class="beam-ghost" fill="none" />

        {/* the rectangle */}
        <rect x={xL} y={yT} width={rw} height={rh} class="rect-torsion-face" />

        {/* schematic shear-magnitude humps on each edge */}
        <path d={leftHump} class={shearClass} />
        <path d={rightHump} class={shearClass} />
        <path d={topHump} class={shearClass} />
        <path d={botHump} class={shearClass} />

        {/* dead corners */}
        {corners.map(([x, y]) => (
          <circle cx={x} cy={y} r={2.6} class="rect-torsion-dead" key={`${x}-${y}`} />
        ))}
        <text x={xL - 4} y={yT - 5} text-anchor="end" class="sim-label-small">
          0
        </text>

        {/* peak-stress hot spots at the midpoints of the two long sides */}
        <circle cx={cx} cy={yT} r={5} class={danger ? "rect-torsion-hotspot-hot" : "rect-torsion-hotspot"} />
        <circle cx={cx} cy={yB} r={5} class={danger ? "rect-torsion-hotspot-hot" : "rect-torsion-hotspot"} />
        <text x={cx + 8} y={yT - 6} class="sim-label">
          τ_max
        </text>

        {/* torque arc */}
        <path d={arc} class="load-arrow" fill="none" />
        <path
          d={`M ${cx - 6} ${cy - rArc + 1} L ${cx} ${cy - rArc - 6} L ${cx + 6} ${cy - rArc + 1} Z`}
          class="load-arrow-head"
        />
        <text x={cx + rArc - 2} y={cy + 16} class="sim-label">
          T
        </text>

        {/* dashed-circle label */}
        <text x={cx} y={cy + rCirc + 12} text-anchor="middle" class="sim-label-small">
          equal-area round
        </text>
      </svg>
      <figcaption>
        {fmtMm(a)}×{fmtMm(b)} mm bar (a/b = {fmt(ab)}). Peak shear <strong>τ_max = {fmtMPa(tauMax)}</strong> at
        the long-side midpoints (hot dots); the corners carry zero. An equal-area round shaft (dashed)
        carries only {fmtMPa(tauRound)} — the rectangle's stress penalty is ×{fmt(etaTau)}.
        {danger ? " Shown red: past shear yield." : ` SF = ${fmt(SF)}.`}
      </figcaption>
    </figure>
  );
}
