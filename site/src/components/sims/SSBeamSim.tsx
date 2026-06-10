/**
 * Simply supported beam: pin + roller supports, both loads drawn (center
 * arrow scaled by P, distributed arrows scaled by w), and the TRUE superposed
 * elastic curve v_P(x) + v_w(x), exaggerated to a fixed sag budget with the
 * exaggeration stated in the caption (invariant 5: never silently mislead).
 * The curve is the same physics the readouts show — presentational shape
 * functions only, no widget math (invariant 4). Static figure. The engine's
 * `invalid` verdict is the authoritative refusal signal.
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";

export function SSBeamSim({ values, invalid = false }: { values: VarRecord; invalid?: boolean }) {
  // no destructuring defaults: a confident default beam over a refused state
  // is exactly what invariant 5 forbids
  const P = values.P ?? NaN;
  const w = values.w ?? NaN;
  const L = values.L ?? NaN;
  const delta = values.delta ?? NaN;
  const delta_P = values.delta_P ?? NaN;
  const delta_w = values.delta_w ?? NaN;
  const SF = values.SF ?? Infinity;

  const ok = !invalid && [P, w, L, delta, delta_P, delta_w].every(Number.isFinite) && L > 0;
  const W = 320;
  const H = 210;

  if (!ok) {
    return (
      <SimRefusal
        ariaLabel="Simply supported beam diagram (refused state)"
        label="refused"
        caption="The engine refused this state — there is no honest elastic curve to draw."
        height={H}
      />
    );
  }

  const x0 = 30;
  const x1 = 290;
  const span = x1 - x0;
  const beamY = 120;
  const sagMax = 46; // px budget for the (exaggerated) total midspan sag
  const danger = Number.isFinite(SF) && SF < 1;

  // normalized deflection shapes (simply supported, 0 ≤ s ≤ 1), each scaled by
  // its OWN midspan deflection so the drawn curve is the true superposition
  const shapeP = (s: number) => {
    const u = s <= 0.5 ? s : 1 - s; // symmetric: v = Px(3L²-4x²)/48EI on the half
    return (u * (3 - 4 * u * u)) / 1; // =1 at s=0.5
  };
  const shapeW = (s: number) => (16 / 5) * s * (1 - 2 * s * s + s * s * s); // =1 at s=0.5
  const sagScale = delta > 0 ? sagMax / delta : 0;
  const N = 48;
  const curve = Array.from({ length: N + 1 }, (_, i) => {
    const s = i / N;
    const v = delta_P * shapeP(s) + delta_w * shapeW(s);
    return `${(x0 + span * s).toFixed(1)},${(beamY + v * sagScale).toFixed(1)}`;
  }).join(" ");

  // load glyphs: center arrow height tracks P, UDL arrow density tracks w
  const pArrow = Math.max(14, Math.min(56, 14 + P / 120));
  const nUdl = Math.max(0, Math.min(13, Math.round(w / 1500) + (w > 0 ? 3 : 0)));
  const udl = Array.from({ length: nUdl }, (_, i) => x0 + ((i + 0.5) * span) / nUdl);

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Simply supported beam with point and distributed loads" width="100%">
        <title>Simply supported beam carrying a center load and a distributed load</title>
        <desc>
          A beam on a pin and a roller, with a center arrow for the point load and a row of
          small arrows for the distributed load. The exaggerated deflected shape is the sum of
          the two load cases' curves; it turns red past first yield.
        </desc>
        {/* undeformed beam (ghost) */}
        <line x1={x0} y1={beamY} x2={x1} y2={beamY} class="beam-ghost" />
        {/* the superposed elastic curve */}
        <polyline points={curve} class={danger ? "beam-line beam-yielding" : "beam-line"} fill="none" />
        {/* supports: pin (triangle) + roller (triangle on circles) */}
        <path d={`M ${x0} ${beamY + 4} l -11 16 h 22 Z`} class="beam-wall" />
        <path d={`M ${x1} ${beamY + 4} l -11 16 h 22 Z`} class="beam-wall" />
        <circle cx={x1 - 6} cy={beamY + 24} r={3} class="beam-wall" />
        <circle cx={x1 + 6} cy={beamY + 24} r={3} class="beam-wall" />
        {/* distributed load */}
        {udl.map((x, i) => (
          <g key={i}>
            <line x1={x} y1={beamY - 38} x2={x} y2={beamY - 12} class="load-arrow" stroke-width={1.2} />
            <path d={`M ${x - 3} ${beamY - 17} L ${x} ${beamY - 12} L ${x + 3} ${beamY - 17}`} class="load-arrow" fill="none" stroke-width={1.2} />
          </g>
        ))}
        {nUdl > 0 ? <line x1={x0} y1={beamY - 38} x2={x1} y2={beamY - 38} class="load-arrow" stroke-width={1.2} /> : null}
        {nUdl > 0 ? (
          <text x={x0 - 4} y={beamY - 44} class="sim-label">
            w
          </text>
        ) : null}
        {/* center point load */}
        {P > 0 ? (
          <g>
            <line x1={(x0 + x1) / 2} y1={beamY - 44 - pArrow} x2={(x0 + x1) / 2} y2={beamY - 46} class="load-arrow" />
            <path
              d={`M ${(x0 + x1) / 2 - 5} ${beamY - 52} L ${(x0 + x1) / 2} ${beamY - 46} L ${(x0 + x1) / 2 + 5} ${beamY - 52}`}
              class="load-arrow"
              fill="none"
            />
            <text x={(x0 + x1) / 2 + 8} y={beamY - 50 - pArrow / 2} class="sim-label">
              P
            </text>
          </g>
        ) : null}
      </svg>
      <figcaption>
        Midspan sag {Number.isFinite(delta) ? toDisplay(delta, "mm").toFixed(2) : "—"} mm — the point load's{" "}
        {Number.isFinite(delta_P) ? toDisplay(delta_P, "mm").toFixed(2) : "—"} mm plus the distributed load's{" "}
        {Number.isFinite(delta_w) ? toDisplay(delta_w, "mm").toFixed(2) : "—"} mm, drawn superposed and exaggerated ~
        {delta > 0 ? Math.max(1, Math.round(sagMax / (delta * (span / L)))).toFixed(0) : "—"}× (the true sag
        would be invisible at this scale).
        {danger ? " Shown red: the outer fiber is past first yield." : ""}
      </figcaption>
    </figure>
  );
}
