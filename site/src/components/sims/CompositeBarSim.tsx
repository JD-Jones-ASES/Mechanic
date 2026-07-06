/**
 * Composite bar (core + sleeve) under a centric axial load. Three views, all
 * presentational functions of the engine's evaluated outputs (invariant 4 — no
 * widget math):
 *   - a cross-section drawn to the true area ratio (core disk inside the sleeve
 *     annulus), each member shaded by its own material and turned red past its
 *     own first yield;
 *   - a side elevation: the two members as columns between two rigid end plates,
 *     with the applied-load arrow, column widths to the area ratio;
 *   - a LOAD-SHARE bar split at f_1 : f_2 = P_1 : P_2 — the element that MOVES
 *     when you swap a material, because the stiffer member grabs more load.
 * The engine's verdicts decide refusal: a determinant-zero (singular) state
 * refuses globally via `invalid`; nothing here sniffs values to invent a picture.
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";

export function CompositeBarSim({
  values,
  invalid = false,
}: {
  values: VarRecord;
  invalid?: boolean;
}) {
  // no destructuring defaults: a confident figure over a refused state is
  // exactly what invariant 5 forbids
  const A_1 = values.A_1 ?? NaN;
  const A_2 = values.A_2 ?? NaN;
  const P_1 = values.P_1 ?? NaN;
  const P_2 = values.P_2 ?? NaN;
  const f_1 = values.f_1 ?? NaN;
  const f_2 = values.f_2 ?? NaN;
  const sigma_1 = values.sigma_1 ?? NaN;
  const sigma_2 = values.sigma_2 ?? NaN;
  const delta = values.delta ?? NaN;
  const SF_1 = values.SF_1 ?? Infinity;
  const SF_2 = values.SF_2 ?? Infinity;

  const W = 340;
  const H = 214;

  const ok =
    !invalid &&
    [A_1, A_2, P_1, P_2, f_1, f_2, sigma_1, sigma_2, delta].every(Number.isFinite) &&
    A_1 > 0 &&
    A_2 > 0 &&
    f_1 >= 0 &&
    f_2 >= 0;
  if (!ok) {
    return (
      <SimRefusal
        ariaLabel="Composite bar diagram (refused state)"
        label="refused"
        caption="The engine refused this state — there is no honest load-share diagram to draw."
        height={H}
      />
    );
  }

  // each member's own first-yield verdict (SF_i < 1 ⇔ σ_i > σ_y_i); a WARN state,
  // the page still renders — this only tints the member red as a cue
  const coreYield = Number.isFinite(SF_1) && SF_1 < 1;
  const sleeveYield = Number.isFinite(SF_2) && SF_2 < 1;
  const coreClass = coreYield ? "composite-yield" : "composite-core";
  const sleeveClass = sleeveYield ? "composite-yield" : "composite-sleeve";

  // ---- cross-section: concentric annulus to the true area ratio ----
  const areaFrac1 = A_1 / (A_1 + A_2); // core's share of the section area
  const cx = 66;
  const cy = 70;
  const rOut = 46; // sleeve outer radius (visual)
  const rCore = rOut * Math.sqrt(areaFrac1); // A_core/A_total = (r_core/r_out)²

  // ---- side elevation: two columns between rigid end plates ----
  const plateX = 150;
  const plateW = 150;
  const plateTopY = 30;
  const plateBotY = 116;
  const barTop = plateTopY + 8;
  const barBot = plateBotY;
  const barX = plateX + 20;
  const barW = plateW - 40;
  const wCore = barW * areaFrac1;

  // ---- load-share bar: split at f_1 : f_2 (this is what moves on a swap) ----
  const shareX = 20;
  const shareY = 176;
  const shareW = W - 40;
  const shareH = 18;
  const wShare1 = shareW * (f_1 / (f_1 + f_2 || 1));

  const pct = (f: number) => `${Math.round(f * 100)}%`;

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Composite bar cross-section and load share" width="100%">
        <title>Composite bar: core inside a sleeve, sharing a centric axial load</title>
        <desc>
          A cross-section of a solid core inside a concentric sleeve, drawn to the true area ratio and
          each shaded by its material. A side elevation shows the two members as columns clamped
          between rigid end plates under an axial load. A bar at the bottom splits the applied load
          between core and sleeve in the ratio P₁ : P₂; the stiffer member takes the larger share, and
          a member turns red past its own first yield.
        </desc>

        {/* cross-section: sleeve annulus (full disk) then core disk on top */}
        <circle cx={cx} cy={cy} r={rOut} class={sleeveClass} />
        <circle cx={cx} cy={cy} r={rOut} class="sim-outline" />
        <circle cx={cx} cy={cy} r={rCore} class={coreClass} />
        <circle cx={cx} cy={cy} r={rCore} class="sim-outline" />
        <text x={cx} y={cy + 3} text-anchor="middle" class="sim-label-small">core</text>
        <text x={cx} y={cy - rOut - 5} text-anchor="middle" class="sim-label-small">sleeve</text>

        {/* side elevation: rigid end plates + two columns + load arrow */}
        <line x1={plateX + plateW / 2} y1={10} x2={plateX + plateW / 2} y2={plateTopY - 2} class="load-arrow" />
        <path
          d={`M ${plateX + plateW / 2 - 4} ${plateTopY - 7} L ${plateX + plateW / 2} ${plateTopY - 2} L ${plateX + plateW / 2 + 4} ${plateTopY - 7}`}
          class="load-arrow"
          fill="none"
        />
        <text x={plateX + plateW / 2 + 8} y={18} class="sim-label">P</text>
        <rect x={plateX} y={plateTopY} width={plateW} height={8} class="beam-wall" />
        <rect x={plateX} y={plateBotY} width={plateW} height={8} class="beam-wall" />
        <rect x={barX} y={barTop} width={wCore} height={barBot - barTop} class={coreClass} />
        <rect x={barX + wCore} y={barTop} width={barW - wCore} height={barBot - barTop} class={sleeveClass} />
        <rect x={barX} y={barTop} width={barW} height={barBot - barTop} class="sim-outline" />
        {/* ground hatch under the bottom plate */}
        {Array.from({ length: 8 }, (_, i) => (
          <line
            key={i}
            x1={plateX + 6 + i * 18}
            y1={plateBotY + 8}
            x2={plateX + 6 + i * 18 - 8}
            y2={plateBotY + 16}
            class="propped-hatch"
          />
        ))}
        <line x1={plateX} y1={plateBotY + 8} x2={plateX + plateW} y2={plateBotY + 8} class="propped-hatch" />

        {/* load-share bar: the element that moves when a material is swapped */}
        <text x={shareX} y={shareY - 5} class="sim-label-small">load share P₁ : P₂</text>
        <rect x={shareX} y={shareY} width={shareW} height={shareH} rx={2} class="fw-bar-track" />
        <rect x={shareX} y={shareY} width={Math.max(0, wShare1)} height={shareH} rx={2} class={coreClass} />
        <rect
          x={shareX + wShare1}
          y={shareY}
          width={Math.max(0, shareW - wShare1)}
          height={shareH}
          rx={2}
          class={sleeveClass}
        />
        <line x1={shareX + wShare1} y1={shareY - 2} x2={shareX + wShare1} y2={shareY + shareH + 2} class="fw-bar-mark" />
        <text x={shareX + 4} y={shareY + shareH - 5} class="sim-label">core {pct(f_1)}</text>
        <text x={shareX + shareW - 4} y={shareY + shareH - 5} text-anchor="end" class="sim-label">
          sleeve {pct(f_2)}
        </text>
      </svg>
      <figcaption>
        Core carries {pct(f_1)} of the load at σ₁ {toDisplay(sigma_1, "MPa").toFixed(0)} MPa; sleeve
        carries {pct(f_2)} at σ₂ {toDisplay(sigma_2, "MPa").toFixed(0)} MPa (the stiffer member takes
        the higher stress). Common elongation δ {toDisplay(delta, "mm").toFixed(3)} mm.
        {coreYield ? " Core shown red: past its first yield." : ""}
        {sleeveYield ? " Sleeve shown red: past its first yield." : ""}
      </figcaption>
    </figure>
  );
}
