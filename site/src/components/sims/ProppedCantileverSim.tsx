/**
 * Propped cantilever under a uniform load: wall (hatched fixed support) at A,
 * roller prop at B, distributed-load arrows, and the TRUE elastic curve
 * v(x) = w(x⁴/24 − 5Lx³/48 + L²x²/16)/EI — zero slope at the wall, zero
 * deflection at the prop — exaggerated to a visible budget with the exaggeration
 * stated in the caption (invariant 5: never silently mislead). The upward
 * reaction arrows are scaled to R_A and R_B (so R_A : R_B reads 5 : 3 by eye),
 * and a hogging arc marks the wall moment M_A. All shapes are presentational
 * functions of the engine's evaluated outputs — no widget math (invariant 4).
 * The engine's `invalid` verdict is the authoritative refusal signal: a singular
 * (determinant-zero) system refuses here, not a confident default figure.
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";

export function ProppedCantileverSim({ values, invalid = false }: { values: VarRecord; invalid?: boolean }) {
  // no destructuring defaults: a confident figure over a refused state is
  // exactly what invariant 5 forbids
  const w = values.w ?? NaN;
  const L = values.L ?? NaN;
  const R_A = values.R_A ?? NaN;
  const R_B = values.R_B ?? NaN;
  const M_A = values.M_A ?? NaN;
  const delta_mid = values.delta_mid ?? NaN;
  const SF = values.SF ?? Infinity;

  const ok =
    !invalid &&
    [w, L, R_A, R_B, M_A, delta_mid].every(Number.isFinite) &&
    L > 0 &&
    R_A > 0 &&
    R_B > 0;

  const W = 340;
  const H = 200;

  if (!ok) {
    return (
      <SimRefusal
        ariaLabel="Propped cantilever diagram (refused state)"
        label="refused"
        caption="The engine refused this state — there is no honest reaction diagram to draw."
        height={H}
      />
    );
  }

  const x0 = 44; // wall face
  const x1 = 300; // prop
  const span = x1 - x0;
  const beamY = 96;
  const danger = Number.isFinite(SF) && SF < 1;

  // TRUE normalized propped-cantilever shape (= 1 at midspan, 0 at both ends,
  // zero slope at the wall). Exaggerated to a visible, load-responsive budget.
  const shape = (s: number) => 192 * (s ** 4 / 24 - (5 * s ** 3) / 48 + s ** 2 / 16);
  const deltaFrac = delta_mid > 0 ? delta_mid / L : 0;
  const visSag = Math.min(deltaFrac * 200, 0.5) * 60; // px; exaggerated + capped, tracks load & E
  const N = 48;
  const curve = Array.from({ length: N + 1 }, (_, i) => {
    const s = i / N;
    return `${(x0 + span * s).toFixed(1)},${(beamY + shape(s) * visSag).toFixed(1)}`;
  }).join(" ");

  // distributed-load arrows across the span; density tracks w
  const nUdl = Math.max(2, Math.min(13, Math.round(w / 3500) + 2));
  const udl = Array.from({ length: nUdl + 1 }, (_, i) => x0 + (i * span) / nUdl);

  // reaction arrows scaled so the larger reaction reads ~34 px (R_A : R_B = 5 : 3)
  const maxR = Math.max(R_A, R_B);
  const rScale = maxR > 0 ? 34 / maxR : 0;
  const lenA = Math.max(10, R_A * rScale);
  const lenB = Math.max(10, R_B * rScale);
  const upArrow = (x: number, len: number, key: string) => (
    <g key={key}>
      <line x1={x} y1={beamY + 8 + len} x2={x} y2={beamY + 10} class="propped-reaction" />
      <path d={`M ${x - 4} ${beamY + 16} L ${x} ${beamY + 8} L ${x + 4} ${beamY + 16}`} class="propped-reaction" fill="none" />
    </g>
  );

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Propped cantilever with uniform load" width="100%">
        <title>Propped cantilever carrying a uniform distributed load</title>
        <desc>
          A beam built into a wall at the left and resting on a roller prop at the right, under a row
          of downward distributed-load arrows. Upward reaction arrows at the wall and the prop are
          scaled to their forces (the wall reaction is the larger), and a curved arrow at the wall
          marks the fixing moment. The exaggerated deflected shape dips to the prop and turns red past
          first yield.
        </desc>

        {/* fixed wall at A: hatched support block */}
        <rect x={x0 - 16} y={beamY - 40} width="16" height="80" class="beam-wall" />
        {Array.from({ length: 7 }, (_, i) => (
          <line
            key={i}
            x1={x0 - 16}
            y1={beamY - 40 + i * 12 + 12}
            x2={x0 - 4}
            y2={beamY - 40 + i * 12}
            class="propped-hatch"
          />
        ))}

        {/* undeformed reference + the true deflected curve */}
        <line x1={x0} y1={beamY} x2={x1} y2={beamY} class="beam-ghost" />
        <polyline points={curve} class={danger ? "beam-line beam-yielding" : "beam-line"} fill="none" />

        {/* roller prop at B: triangle on two rollers */}
        <path d={`M ${x1} ${beamY + 5} l -10 15 h 20 Z`} class="beam-wall" />
        <circle cx={x1 - 5} cy={beamY + 23} r={3} class="beam-wall" />
        <circle cx={x1 + 5} cy={beamY + 23} r={3} class="beam-wall" />
        <line x1={x1 - 12} y1={beamY + 27} x2={x1 + 12} y2={beamY + 27} class="beam-wall" />

        {/* distributed load w */}
        {udl.map((x, i) => (
          <g key={i}>
            <line x1={x} y1={beamY - 40} x2={x} y2={beamY - 14} class="load-arrow-light" />
            <path d={`M ${x - 3} ${beamY - 19} L ${x} ${beamY - 14} L ${x + 3} ${beamY - 19}`} class="load-arrow-light" />
          </g>
        ))}
        <line x1={x0} y1={beamY - 40} x2={x1} y2={beamY - 40} class="load-arrow-light" />
        <text x={(x0 + x1) / 2 - 4} y={beamY - 46} class="sim-label">w</text>

        {/* reaction arrows, scaled to R_A and R_B */}
        {upArrow(x0, lenA, "ra")}
        {upArrow(x1, lenB, "rb")}
        <text x={x0 - 20} y={beamY + 20 + lenA} class="sim-label">R_A</text>
        <text x={x1 + 6} y={beamY + 20 + lenB} class="sim-label">R_B</text>

        {/* hogging fixing-moment arc at the wall */}
        <path d={`M ${x0 + 4} ${beamY - 16} A 16 16 0 1 1 ${x0 + 3} ${beamY + 15}`} class="propped-moment" fill="none" />
        <path d={`M ${x0 - 1} ${beamY + 9} L ${x0 + 3} ${beamY + 15} L ${x0 + 8} ${beamY + 11}`} class="propped-moment" fill="none" />
        <text x={x0 + 12} y={beamY - 18} class="sim-label">M_A</text>
      </svg>
      <figcaption>
        Reactions R_A {toDisplay(R_A, "kN").toFixed(2)} kN and R_B {toDisplay(R_B, "kN").toFixed(2)} kN
        (a 5 : 3 split, independent of material), wall moment M_A {toDisplay(M_A, "N*m").toFixed(0)} N·m.
        Midspan sag {toDisplay(delta_mid, "mm").toFixed(2)} mm, drawn{" "}
        {deltaFrac > 0 && visSag / (deltaFrac * span) >= 1
          ? `exaggerated ~${Math.round(visSag / (deltaFrac * span))}×`
          : "to scale"}
        {danger ? ". Shown red: the wall fiber is past first yield." : "."}
      </figcaption>
    </figure>
  );
}
