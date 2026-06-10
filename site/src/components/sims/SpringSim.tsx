/**
 * Helical compression spring: side view drawn against its own envelopes. The
 * coil renders at the current compressed length (L_0 − δ) inside a dashed
 * free-length ghost, with the solid-height L_s floor marked — so the gap you
 * see closing IS the clash allowance. Coil width tracks D, wire weight tracks
 * d, and the wire turns red past first yield (SF < 1), matching the shared
 * stress-color convention. Static figure (no clock). The engine's `invalid`
 * verdict is the authoritative refusal signal — coil bind fires with every
 * value finite, so NaN-sniffing could never catch it (invariant 5).
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";

export function SpringSim({ values, invalid = false }: { values: VarRecord; invalid?: boolean }) {
  // no destructuring defaults: drawing a healthy default coil over a refused
  // state (e.g. coil bind) is exactly what invariant 5 forbids
  const L_0 = values.L_0 ?? NaN;
  const delta = values.delta ?? NaN;
  const L_s = values.L_s ?? NaN;
  const D = values.D ?? NaN;
  const d = values.d ?? NaN;
  const N_a = values.N_a ?? NaN;
  const k = values.k ?? NaN;
  const SF = values.SF ?? Infinity;

  const compressed = L_0 - delta;
  const geometryOk =
    !invalid &&
    [L_0, delta, L_s, D, d, N_a].every(Number.isFinite) &&
    compressed > 0 &&
    L_0 > 0;

  const W = 320;
  const H = 240;
  const baseY = 208;
  const freeH = 168; // px height of the free length L_0

  if (!geometryOk) {
    return (
      <SimRefusal
        ariaLabel="Helical spring diagram (refused state)"
        label="refused"
        caption="The engine refused this state — at coil bind the load path is wire-on-wire, and the linear spring has nothing honest to draw."
        height={H}
      />
    );
  }

  const nowH = (freeH * compressed) / L_0;
  const solidH = (freeH * L_s) / L_0;
  const topY = baseY - nowH;
  const freeTopY = baseY - freeH;
  const solidY = baseY - solidH;

  const cx = W / 2;
  const coilW = Math.max(36, Math.min(130, 30 + 1400 * D));
  const wirePx = Math.max(2, Math.min(9, 1200 * d));
  const danger = Number.isFinite(SF) && SF < 1;

  // side-view helix: N_t coils as a sine-wave polyline between the plates
  const N_t = N_a + 2;
  const SEG = 16;
  const n = Math.max(2, Math.round(N_t * SEG));
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const f = i / n;
    const x = cx + (coilW / 2) * Math.sin(2 * Math.PI * N_t * f);
    const y = topY + nowH * f;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const clearance = compressed - L_s;
  const arrowTop = freeTopY - 26;

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Helical compression spring side view" width="100%">
        <title>Compression spring at its current deflection</title>
        <desc>
          A coil spring drawn between two plates at its compressed length, inside a dashed
          outline of its free length. A dashed floor marks the solid height where the coils
          stack; the wire turns red past first yield.
        </desc>
        {/* free-length ghost */}
        <line x1={cx - coilW / 2 - 12} y1={freeTopY} x2={cx + coilW / 2 + 12} y2={freeTopY} class="spring-ghost" />
        <text x={cx + coilW / 2 + 16} y={freeTopY + 4} class="sim-label">
          L₀
        </text>
        {/* solid-height floor */}
        <line x1={cx - coilW / 2 - 12} y1={solidY} x2={cx + coilW / 2 + 12} y2={solidY} class="spring-bind-line" />
        <text x={cx + coilW / 2 + 16} y={solidY + 4} class="sim-label">
          Lₛ
        </text>
        {/* plates */}
        <rect x={cx - coilW / 2 - 18} y={topY - 6} width={coilW + 36} height={6} class="spring-plate" />
        <rect x={cx - coilW / 2 - 18} y={baseY} width={coilW + 36} height={6} class="spring-plate" />
        {/* the coil */}
        <polyline points={pts} class={danger ? "spring-coil-hot" : "spring-coil"} stroke-width={wirePx} />
        {/* load arrow */}
        <line x1={cx} y1={arrowTop} x2={cx} y2={topY - 8} class="load-arrow" />
        <path
          d={`M ${cx - 5} ${topY - 14} L ${cx} ${topY - 8} L ${cx + 5} ${topY - 14}`}
          class="load-arrow"
          fill="none"
        />
        <text x={cx + 8} y={arrowTop + 10} class="sim-label">
          F
        </text>
      </svg>
      <figcaption>
        Rate {Number.isFinite(k) ? toDisplay(k, "N/mm").toFixed(2) : "—"} N/mm; compressed{" "}
        {Number.isFinite(delta) ? toDisplay(delta, "mm").toFixed(1) : "—"} mm of{" "}
        {Number.isFinite(L_0) ? toDisplay(L_0, "mm").toFixed(0) : "—"} mm free length;{" "}
        {Number.isFinite(clearance) ? toDisplay(clearance, "mm").toFixed(1) : "—"} mm of travel
        left before coil bind (dashed floor).
        {danger ? " Shown red: the inner fiber is past first yield." : ""}
      </figcaption>
    </figure>
  );
}
