/**
 * Preloaded bolted joint with a gasket, under an external tensile load. Two
 * presentational views, both pure functions of the engine's evaluated outputs
 * (invariant 4 — no widget math beyond layout):
 *   - a side schematic: the bolt (head, shank, nut) clamping two members with a
 *     visible gasket line between them, and the external load P pulling the
 *     members apart at the gasket;
 *   - two FORCE-SHARE bars on a common 0…P₀ scale — the bolt tension F_b and the
 *     residual clamping force F_m — straddling a dashed preload reference at F_i.
 *     As P cranks up the bolt bar grows toward P₀ and the clamp bar shrinks
 *     toward zero; when they meet at F_m = 0 the joint separates.
 * The engine's `invalid` verdict alone decides refusal — separation (F_m ≤ 0) is
 * a GLOBAL invalid, so the whole figure is replaced by the shared SimRefusal. The
 * bolt-past-proof tint is a WARN cue (σ_b ≥ S_p), the page still standing.
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";

export function BoltedJointSim({
  values,
  invalid = false,
}: {
  values: VarRecord;
  invalid?: boolean;
}) {
  // no destructuring defaults: a confident figure over a refused state is exactly
  // what invariant 5 forbids
  const F_i = values.F_i ?? NaN;
  const P = values.P ?? NaN;
  const F_b = values.F_b ?? NaN;
  const F_m = values.F_m ?? NaN;
  const C = values.C ?? NaN;
  const P0 = values.P0 ?? NaN;
  const sigma_b = values.sigma_b ?? NaN;
  const S_p = values.S_p ?? Infinity;

  const W = 340;
  const H = 214;

  const ok =
    !invalid &&
    [F_i, P, F_b, F_m, C, P0, sigma_b].every(Number.isFinite) &&
    F_i > 0 &&
    P0 > 0 &&
    F_m > 0; // separation (F_m ≤ 0) is refused globally; guard the picture too
  if (!ok) {
    return (
      <SimRefusal
        ariaLabel="Bolted joint diagram (refused state)"
        label="separated"
        caption="The external load has passed the separation load P₀ — the members are slack and there is no honest load-share diagram to draw."
        height={H}
      />
    );
  }

  // bolt past proof is a WARN cue only (the page still renders)
  const boltProof = Number.isFinite(S_p) && sigma_b >= S_p;
  const boltClass = boltProof ? "bj-bolt-warn" : "bj-bolt";

  // ---- side schematic: bolt clamping two members with a gasket between ----
  const yMid = 52;
  const memTop = 30;
  const memBot = 76;
  const headX = 40;
  const headW = 14;
  const nutX = 286;
  const nutW = 14;
  const gasketX = 166;
  const gasketW = 10;
  const mem1X = headX + headW; // 54
  const mem1W = gasketX - mem1X; // to the gasket
  const mem2X = gasketX + gasketW; // 176
  const mem2W = nutX - mem2X; // to the nut

  // external-load arrow: horizontal, length `len` (sign = direction), tail at x
  const pArrow = (x: number, dir: number, key: string) => {
    const tip = x + dir * 18;
    return (
      <g key={key}>
        <line x1={x} y1={92} x2={tip} y2={92} class="load-arrow" />
        <path
          d={`M ${tip} 92 L ${tip - dir * 6} 88 M ${tip} 92 L ${tip - dir * 6} 96`}
          class="load-arrow"
          fill="none"
        />
      </g>
    );
  };

  // ---- force-share bars, common scale 0 … P₀ ----
  const barX = 74;
  const barW = W - barX - 20; // to x=320
  // scale both bars to the separation load P₀ (the bolt force at separation), so the
  // animation is stable as P sweeps. In any drawn (non-refused) state P₀ dominates —
  // F_b ≤ P₀ with equality only at separation — but F_b is kept in the max as a
  // floating-point boundary guard. scaleMax > 0 because the `ok` guard requires P₀ > 0.
  const scaleMax = Math.max(P0, F_b) * 1.02;
  const xOf = (f: number) => barX + Math.max(0, Math.min(1, f / scaleMax)) * barW;
  const xFi = xOf(F_i);
  const yBolt = 128;
  const yClamp = 162;
  const barH = 18;

  const kN = (n: number) => toDisplay(n, "kN").toFixed(1);
  const pct = (r: number) => `${Math.round(r * 100)}%`;

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Bolted joint force share" width="100%">
        <title>Bolted joint with a gasket: bolt tension and member clamping force sharing an external load</title>
        <desc>
          A side view of a bolt clamping two members with a gasket between them; an external tensile
          load pulls the members apart at the gasket. Below, two bars on a common scale show the bolt
          tension F_b growing and the residual clamping force F_m shrinking as the external load rises,
          both measured against a dashed line at the preload F_i. When the clamp bar reaches zero the
          joint separates.
        </desc>

        {/* --- schematic: two members + gasket, clamped by the bolt --- */}
        <rect x={mem1X} y={memTop} width={mem1W} height={memBot - memTop} class="bj-member" />
        <rect x={mem2X} y={memTop} width={mem2W} height={memBot - memTop} class="bj-member" />
        <rect x={mem1X} y={memTop} width={mem1W} height={memBot - memTop} class="sim-outline" />
        <rect x={mem2X} y={memTop} width={mem2W} height={memBot - memTop} class="sim-outline" />
        {/* gasket line between the members */}
        <rect x={gasketX} y={memTop - 3} width={gasketW} height={memBot - memTop + 6} class="bj-gasket" />
        <rect x={gasketX} y={memTop - 3} width={gasketW} height={memBot - memTop + 6} class="sim-outline" />

        {/* bolt: head, shank through the members, nut */}
        <rect x={mem1X} y={yMid - 5} width={nutX - mem1X} height={10} class={boltClass} />
        <rect x={headX} y={memTop - 4} width={headW} height={memBot - memTop + 8} class={boltClass} />
        <rect x={nutX} y={memTop - 4} width={nutW} height={memBot - memTop + 8} class={boltClass} />
        <rect x={headX} y={memTop - 4} width={headW} height={memBot - memTop + 8} class="sim-outline" />
        <rect x={nutX} y={memTop - 4} width={nutW} height={memBot - memTop + 8} class="sim-outline" />

        <text x={(mem1X + gasketX) / 2} y={memTop - 8} text-anchor="middle" class="sim-label-small">member</text>
        <text x={(mem2X + nutX) / 2} y={memTop - 8} text-anchor="middle" class="sim-label-small">member</text>
        <text x={gasketX + gasketW / 2} y={memBot + 12} text-anchor="middle" class="sim-label-small">gasket</text>
        <text x={headX + headW / 2} y={memTop - 8} text-anchor="middle" class="sim-label-small">bolt</text>

        {/* external load pulls the members apart at the gasket */}
        {pArrow(mem1X + 22, -1, "pL")}
        {pArrow(nutX - 22, +1, "pR")}
        <text x={mem1X + 8} y={82} class="sim-label-small">← P</text>
        <text x={nutX - 8} y={82} text-anchor="end" class="sim-label-small">P →</text>

        {/* --- force-share bars on a common 0…P₀ scale --- */}
        <text x={barX} y={yBolt - 6} class="sim-label-small">bolt tension F_b — takes C = {pct(C)} of P</text>
        <rect x={barX} y={yBolt} width={barW} height={barH} rx={2} class="fw-bar-track" />
        <rect x={barX} y={yBolt} width={Math.max(0, xOf(F_b) - barX)} height={barH} rx={2} class={boltClass} />
        <text x={barX + 5} y={yBolt + barH - 5} class="sim-label">{kN(F_b)} kN</text>

        <text x={barX} y={yClamp - 6} class="sim-label-small">clamp force F_m — falls to 0 at separation</text>
        <rect x={barX} y={yClamp} width={barW} height={barH} rx={2} class="fw-bar-track" />
        <rect x={barX} y={yClamp} width={Math.max(0, xOf(F_m) - barX)} height={barH} rx={2} class="bj-member" />
        <text x={barX + 5} y={yClamp + barH - 5} class="sim-label">{kN(F_m)} kN</text>

        {/* dashed preload reference at F_i spanning both bars */}
        <line x1={xFi} y1={yBolt - 3} x2={xFi} y2={yClamp + barH + 3} class="fw-bar-mark" />
        <text x={xFi} y={yClamp + barH + 15} text-anchor="middle" class="sim-label-small">preload F_i {kN(F_i)} kN</text>
        {/* the separation end of the scale */}
        <text x={barX + barW} y={yBolt - 6} text-anchor="end" class="sim-label-small">P₀ {kN(P0)} kN</text>
      </svg>
      <figcaption>
        The external load P = {kN(P)} kN splits by stiffness: the bolt takes C = {pct(C)} of it, so bolt
        tension is {kN(F_b)} kN and the residual clamping force is {kN(F_m)} kN (zero at the separation
        load P₀ = {kN(P0)} kN). A softer gasket raises C and drives the bolt bar harder for the same P.
        {boltProof ? " Bolt shown red: stress has reached the proof strength." : ""}
      </figcaption>
    </figure>
  );
}
