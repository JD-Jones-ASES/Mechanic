/**
 * Transverse shear in a beam, two panels. TOP: the rectangular cross-section
 * with the parabolic shear-stress profile τ(y) drawn against its right edge —
 * MAX at the neutral axis (dashed), ZERO at the top and bottom fibers, the exact
 * opposite of the bending-stress picture. The parabola reddens as τ_max nears
 * shear yield (SF -> 1). BOTTOM: a side elevation of a two-plank built-up beam
 * whose halves are fastened along the neutral axis; the dots march at the spacing
 * s knob, and the F = q·s readout is the force each one carries. Presentational
 * shapes only — the numbers come from the engine (invariant 4); the engine's
 * `invalid` verdict is the authoritative refusal (invariant 5).
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";

export function ShearFlowSim({ values, invalid = false }: { values: VarRecord; invalid?: boolean }) {
  // no destructuring defaults for load-bearing values (invariant 5)
  const b = values.b ?? NaN;
  const h = values.h ?? NaN;
  const s = values.s ?? NaN;
  const tauMax = values.tau_max ?? NaN;
  const tauAvg = values.tau_avg ?? NaN;
  const q = values.q ?? NaN;
  const F = values.F_fastener ?? NaN;
  const SF = values.SF ?? Infinity;

  const ok = !invalid && [b, h, s, tauMax, q, F].every(Number.isFinite) && h > 0 && b > 0;
  const W = 320;
  const H = 240;
  if (!ok) {
    return (
      <SimRefusal
        ariaLabel="Beam shear distribution (refused state)"
        caption="The engine refused this state — there is no honest shear distribution to draw."
        height={H}
      />
    );
  }

  const danger = Number.isFinite(SF) && SF < 1;
  const profClass = danger ? "shearflow-profile-hot" : "shearflow-profile";

  // --- cross-section (top-left) + parabolic profile (to its right) ---
  const naY = 78; // neutral-axis pixel row of the cross-section
  const rh = 120; // section height in px (fixed budget)
  const rw = Math.max(10, Math.min((b / h) * rh, 60)); // width scaled to the true aspect, capped
  const xL = 40;
  const xR = xL + rw;
  const yT = naY - rh / 2;
  const yB = naY + rh / 2;
  const bulge = 150; // px extent of the parabola at its peak (τ_max)

  // τ(y)/τ_max = 1 − (2y/h)² is a parabola; draw it as horizontal reach from the
  // section's right edge, sampled top→bottom, closed back down the edge to fill it
  const N = 40;
  const pts: string[] = [`${xR},${yT}`];
  for (let i = 0; i <= N; i++) {
    const f = i / N; // 0 at top, 1 at bottom
    const yp = yT + f * rh;
    const frac = 1 - (2 * (f - 0.5)) ** 2; // 0 at ends, 1 at middle
    pts.push(`${(xR + frac * bulge).toFixed(1)},${yp.toFixed(1)}`);
  }
  pts.push(`${xR},${yB}`);
  const profile = `M ${pts.join(" L ")} Z`;

  // --- fastener elevation (bottom): a strip of beam, joint along the NA, dots at spacing s ---
  const elevY = 200;
  const elevX0 = 40;
  const elevX1 = 300;
  const elevLen = elevX1 - elevX0;
  const elevSpanM = 1.0; // the strip represents 1 m of beam length
  const pxPerM = elevLen / elevSpanM;
  const sPx = Math.max(6, s * pxPerM); // fastener pitch in px (tracks the s knob)
  const nDots = Math.max(1, Math.min(Math.floor(elevLen / sPx), 40));
  const dots = Array.from({ length: nDots }, (_, i) => elevX0 + (i + 0.5) * sPx);

  const fmtMPa = (v: number) => (Number.isFinite(v) ? `${toDisplay(v, "MPa").toFixed(2)} MPa` : "—");
  const fmtNmm = (v: number) => (Number.isFinite(v) ? `${toDisplay(v, "N/mm").toFixed(1)} N/mm` : "—");
  const fmtkN = (v: number) => (Number.isFinite(v) ? `${toDisplay(v, "kN").toFixed(2)} kN` : "—");
  const fmtMm = (v: number) => (Number.isFinite(v) ? toDisplay(v, "mm").toFixed(0) : "—");

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Beam transverse shear stress distribution and fastener spacing" width="100%">
        <title>Parabolic transverse shear stress in a beam, and the fastener spacing it sets</title>
        <desc>
          Top: a rectangular beam cross-section with the shear stress drawn as a parabola against its
          side — largest at the neutral axis in the middle, zero at the top and bottom edges. Bottom:
          a side view of a beam built from two planks fastened along the neutral axis, with the
          connectors spaced s apart; each carries the shear flow times that spacing.
        </desc>

        {/* the cross-section */}
        <rect x={xL} y={yT} width={rw} height={rh} class="shearflow-section" />
        {/* parabolic shear-stress profile */}
        <path d={profile} class={profClass} />
        {/* neutral axis (dashed) through section and profile */}
        <line x1={xL - 6} y1={naY} x2={xR + bulge + 8} y2={naY} class="beam-ghost" />

        {/* labels */}
        <text x={xR + bulge + 10} y={naY + 4} class="sim-label">
          τ_max
        </text>
        <text x={xR + 6} y={yT + 8} class="sim-label-small">
          0
        </text>
        <text x={xR + 6} y={yB - 2} class="sim-label-small">
          0
        </text>
        <text x={xL + rw / 2} y={yB + 13} text-anchor="middle" class="sim-label-small">
          b={fmtMm(b)}
        </text>
        <text x={xL - 30} y={naY + 4} class="sim-label-small">
          N.A.
        </text>

        {/* fastener elevation */}
        <rect x={elevX0} y={elevY - 15} width={elevLen} height={30} class="shearflow-section" fill="none" />
        <line x1={elevX0} y1={elevY} x2={elevX1} y2={elevY} class="shearflow-joint" />
        {dots.map((x) => (
          <circle cx={x} cy={elevY} r={3.2} class="shearflow-fastener" key={x} />
        ))}
        <text x={elevX0} y={elevY - 20} class="sim-label-small">
          built-up joint · fasteners at s = {fmtMm(s)} mm
        </text>
      </svg>
      <figcaption>
        Parabolic shear: peak <strong>τ_max = {fmtMPa(tauMax)}</strong> at the neutral axis, exactly
        1.5× the average {fmtMPa(tauAvg)}, zero at the surfaces. Shear flow there q = {fmtNmm(q)} →
        each fastener at s = {fmtMm(s)} mm carries <strong>F = {fmtkN(F)}</strong>.
        {danger ? " Shown red: past shear yield at the neutral axis." : ""}
      </figcaption>
    </figure>
  );
}
