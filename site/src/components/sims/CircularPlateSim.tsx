/**
 * Uniformly loaded circular plate, two models side by side. Each column is a
 * full-diameter CROSS-SECTION (side view) of the dished plate under pressure q,
 * over a plan-view stress map. LEFT: clamped rim — the plate meets its built-in
 * wall with a FLAT tangent (w'(a)=0) and is hottest at the EDGE. RIGHT: simply
 * supported rim — the plate TILTS into its knife supports (M_r(a)=0) and is
 * hottest at the CENTER. The two dishes are drawn to a common exaggeration so
 * the simply-supported plate visibly sags ~(5+ν)/(1+ν) ≈ 4× deeper. The plan
 * discs (StressBands) shade where each stress concentrates — outer ring for
 * clamped, center for simply supported — and heat toward red as the margin
 * against the allowable stress closes. Presentational shapes only; every number
 * is the engine's (invariant 4), and its `invalid` verdict is the authoritative
 * refusal (invariant 5).
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";
import { StressBands } from "./StressBands";

export function CircularPlateSim({ values, invalid = false }: { values: VarRecord; invalid?: boolean }) {
  // no destructuring defaults for load-bearing values (invariant 5)
  const q = values.q ?? NaN;
  const a = values.a ?? NaN;
  const t = values.t ?? NaN;
  const deltaC = values.delta_c ?? NaN;
  const sigmaC = values.sigma_c ?? NaN;
  const deltaSS = values.delta_ss ?? NaN;
  const sigmaSS = values.sigma_ss ?? NaN;
  const ratio = values.defl_ratio ?? NaN;
  const SFc = values.SF_c ?? Infinity;
  const SFss = values.SF_ss ?? Infinity;

  const W = 380;
  const H = 250;
  const ok =
    !invalid &&
    [q, a, t, deltaC, sigmaC, deltaSS, sigmaSS, ratio].every(Number.isFinite) &&
    a > 0 &&
    t > 0 &&
    ratio > 0;
  if (!ok) {
    return (
      <SimRefusal
        ariaLabel="Circular-plate deflection and stress (refused state)"
        label="refused"
        caption="The engine refused this state — there is no honest plate deflection to draw."
        height={H}
      />
    );
  }

  const dangerC = Number.isFinite(SFc) && SFc < 1;
  const dangerSS = Number.isFinite(SFss) && SFss < 1;

  const halfW = 70; // plate radius in px (each cross-section spans a diameter)
  const midY = 48; // undeflected mid-surface row
  const budget = 40; // px sag budget for the (exaggerated) deeper SS plate
  const depthSS = budget;
  const depthC = budget / ratio; // clamped is shallower by exactly δ_ss/δ_c

  // exact normalized deflection shapes (ρ = r/a ∈ [-1,1], value 1 at center):
  //   clamped     w ∝ (1-ρ²)²                     -> flat tangent at the rim
  //   simply supp w ∝ (1-ρ²)(k-ρ²)/k, k=(5+ν)/(1+ν) -> tilts at the rim
  const shapeC = (rho: number) => (1 - rho * rho) ** 2;
  const shapeSS = (rho: number) => {
    const u = 1 - rho * rho;
    return (u * (ratio - rho * rho)) / ratio;
  };
  const N = 40;
  const plateCurve = (xc: number, depth: number, shape: (r: number) => number) => {
    const pts: string[] = [];
    for (let i = 0; i <= N; i++) {
      const rho = -1 + (2 * i) / N;
      pts.push(`${(xc + rho * halfW).toFixed(1)},${(midY + shape(rho) * depth).toFixed(1)}`);
    }
    return pts.join(" ");
  };

  const cxC = 100; // clamped column center
  const cxS = 280; // simply-supported column center
  const discY = 190; // plan-view stress-map row
  const discR = 40;

  // pressure arrows across the top of a plate
  const pArrows = (xc: number) =>
    [-0.55, 0, 0.55].map((f) => xc + f * halfW);

  const fmtMm = (v: number) => (Number.isFinite(v) ? toDisplay(v, "mm").toFixed(2) : "—");
  const fmtMPa = (v: number) => (Number.isFinite(v) ? toDisplay(v, "MPa").toFixed(1) : "—");

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Circular plate under uniform pressure: clamped versus simply supported" width="100%">
        <title>Uniformly loaded circular plate — clamped edge versus simply supported</title>
        <desc>
          Two cross-sections of the same pressurized circular plate. On the left the rim is clamped:
          the plate meets its built-in wall with a flat tangent and is hottest at the edge. On the
          right the rim is simply supported: the plate tilts into its supports and sags about four
          times as far, hottest at the center. Below each is a top-view stress map shading where the
          stress concentrates.
        </desc>

        {/* column headings */}
        <text x={cxC} y={14} text-anchor="middle" class="sim-label">Clamped</text>
        <text x={cxS} y={14} text-anchor="middle" class="sim-label">Simply supported</text>

        {/* ---- pressure arrows ---- */}
        {[cxC, cxS].map((xc) => (
          <g key={`p${xc}`}>
            {pArrows(xc).map((x, i) => (
              <g key={i}>
                <line x1={x} y1={midY - 30} x2={x} y2={midY - 12} class="load-arrow-light" />
                <path d={`M ${x - 3} ${midY - 17} L ${x} ${midY - 12} L ${x + 3} ${midY - 17}`} class="load-arrow-light" />
              </g>
            ))}
            <line x1={xc - halfW} y1={midY - 30} x2={xc + halfW} y2={midY - 30} class="load-arrow-light" />
          </g>
        ))}
        <text x={cxC - halfW - 4} y={midY - 33} class="sim-label">q</text>

        {/* undeflected datum (ghost) */}
        <line x1={cxC - halfW} y1={midY} x2={cxC + halfW} y2={midY} class="beam-ghost" />
        <line x1={cxS - halfW} y1={midY} x2={cxS + halfW} y2={midY} class="beam-ghost" />

        {/* ---- clamped: built-in walls (flush blocks), plate enters flat ---- */}
        <rect x={cxC - halfW - 8} y={midY - 12} width={8} height={24} class="beam-wall" />
        <rect x={cxC + halfW} y={midY - 12} width={8} height={24} class="beam-wall" />
        <polyline points={plateCurve(cxC, depthC, shapeC)} class={dangerC ? "circplate-plate-hot" : "circplate-plate"} fill="none" />
        {/* hot spots at the two edges */}
        <circle cx={cxC - halfW} cy={midY} r={3.6} class={dangerC ? "circplate-hotspot-hot" : "circplate-hotspot"} />
        <circle cx={cxC + halfW} cy={midY} r={3.6} class={dangerC ? "circplate-hotspot-hot" : "circplate-hotspot"} />
        <text x={cxC + halfW + 2} y={midY - 6} class="sim-label-small">σ_c (edge)</text>

        {/* ---- simply supported: knife/pin supports, plate tilts ---- */}
        <path d={`M ${cxS - halfW} ${midY + 2} l -7 12 h 14 Z`} class="beam-wall" />
        <path d={`M ${cxS + halfW} ${midY + 2} l -7 12 h 14 Z`} class="beam-wall" />
        <polyline points={plateCurve(cxS, depthSS, shapeSS)} class={dangerSS ? "circplate-plate-hot" : "circplate-plate"} fill="none" />
        {/* hot spot at the center */}
        <circle cx={cxS} cy={midY + depthSS} r={3.6} class={dangerSS ? "circplate-hotspot-hot" : "circplate-hotspot"} />
        <text x={cxS + 6} y={midY + depthSS + 4} class="sim-label-small">σ_ss (center)</text>

        {/* ---- plan-view stress maps (top view) ---- */}
        <text x={cxC} y={discY - discR - 6} text-anchor="middle" class="sim-label-small">top view: stress</text>
        <text x={cxS} y={discY - discR - 6} text-anchor="middle" class="sim-label-small">top view: stress</text>
        {/* clamped: hot at the rim */}
        <circle cx={cxC} cy={discY} r={discR} class="circplate-disc" />
        <StressBands cx={cxC} cy={discY} rInner={2} rOuter={discR - 2} SF={SFc} profile={(f) => 0.4 + 0.6 * f} />
        <circle cx={cxC} cy={discY} r={discR} fill="none" class={dangerC ? "circplate-hotspot-hot" : "circplate-hotspot"} stroke-width={2.5} />
        {/* simply supported: hot at the center */}
        <circle cx={cxS} cy={discY} r={discR} class="circplate-disc" />
        <StressBands cx={cxS} cy={discY} rInner={2} rOuter={discR - 2} SF={SFss} profile={(f) => 1 - 0.55 * f} />
        <circle cx={cxS} cy={discY} r={4} class={dangerSS ? "circplate-hotspot-hot" : "circplate-hotspot"} />
      </svg>
      <figcaption>
        Same plate, same pressure. Clamped: center sag <strong>{fmtMm(deltaC)} mm</strong>, edge stress{" "}
        <strong>{fmtMPa(sigmaC)} MPa</strong> (no E, no ν — material-blind). Simply supported: center sag{" "}
        <strong>{fmtMm(deltaSS)} mm</strong> ({Number.isFinite(ratio) ? ratio.toFixed(2) : "—"}× deeper),
        center stress <strong>{fmtMPa(sigmaSS)} MPa</strong> (carries ν). Change material and watch σ_ss move
        while σ_c holds still.
        {dangerC || dangerSS ? " Shown red: a hot spot has passed the allowable stress." : ""}
      </figcaption>
    </figure>
  );
}
