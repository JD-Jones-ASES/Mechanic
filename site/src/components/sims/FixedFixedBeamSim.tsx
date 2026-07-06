/**
 * Fixed-fixed beam under a uniform load: a hatched built-in wall at BOTH ends,
 * distributed-load arrows, and the TRUE elastic curve
 * v(x) = w x²(L−x)²/(24EI) — zero deflection AND zero slope at each wall,
 * maximum at midspan — exaggerated to a visible budget with the exaggeration
 * stated in the caption (invariant 5: never silently mislead). The two upward
 * reaction arrows are equal (R_A = R_B = wL/2) and a hogging arc at each wall
 * marks the fixing moments M_A = M_B = wL²/12. All shapes are presentational
 * functions of the engine's evaluated outputs — no widget math (invariant 4).
 * The engine's `invalid` verdict is the authoritative refusal signal: a
 * singular (determinant-zero) system refuses here, not a confident default.
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";

export function FixedFixedBeamSim({ values, invalid = false }: { values: VarRecord; invalid?: boolean }) {
  // no destructuring defaults: a confident figure over a refused state is
  // exactly what invariant 5 forbids
  const w = values.w ?? NaN;
  const L = values.L ?? NaN;
  const R_A = values.R_A ?? NaN;
  const R_B = values.R_B ?? NaN;
  const M_A = values.M_A ?? NaN;
  const M_B = values.M_B ?? NaN;
  const delta_max = values.delta_max ?? NaN;
  const SF = values.SF ?? Infinity;

  const ok =
    !invalid &&
    [w, L, R_A, R_B, M_A, M_B, delta_max].every(Number.isFinite) &&
    L > 0 &&
    R_A > 0 &&
    R_B > 0;

  const W = 340;
  const H = 200;

  if (!ok) {
    return (
      <SimRefusal
        ariaLabel="Fixed-fixed beam diagram (refused state)"
        label="refused"
        caption="The engine refused this state — there is no honest reaction diagram to draw."
        height={H}
      />
    );
  }

  const x0 = 46; // left wall face
  const x1 = 294; // right wall face
  const span = x1 - x0;
  const beamY = 98;
  const danger = Number.isFinite(SF) && SF < 1;

  // TRUE normalized fixed-fixed shape (= 1 at midspan, 0 with zero slope at BOTH
  // walls). Exaggerated to a visible, load-responsive budget.
  const shape = (s: number) => 16 * s ** 2 * (1 - s) ** 2;
  const deltaFrac = delta_max > 0 ? delta_max / L : 0;
  const visSag = Math.min(deltaFrac * 200, 0.5) * 60; // px; exaggerated + capped, tracks load & E
  const N = 48;
  const curve = Array.from({ length: N + 1 }, (_, i) => {
    const s = i / N;
    return `${(x0 + span * s).toFixed(1)},${(beamY + shape(s) * visSag).toFixed(1)}`;
  }).join(" ");

  // distributed-load arrows across the span; density tracks w
  const nUdl = Math.max(2, Math.min(13, Math.round(w / 3500) + 2));
  const udl = Array.from({ length: nUdl + 1 }, (_, i) => x0 + (i * span) / nUdl);

  // reaction arrows scaled so the (equal) reactions read ~30 px
  const maxR = Math.max(R_A, R_B);
  const rScale = maxR > 0 ? 30 / maxR : 0;
  const lenA = Math.max(10, R_A * rScale);
  const lenB = Math.max(10, R_B * rScale);
  const upArrow = (x: number, len: number, key: string) => (
    <g key={key}>
      <line x1={x} y1={beamY + 8 + len} x2={x} y2={beamY + 10} class="propped-reaction" />
      <path d={`M ${x - 4} ${beamY + 16} L ${x} ${beamY + 8} L ${x + 4} ${beamY + 16}`} class="propped-reaction" fill="none" />
    </g>
  );

  // hatched built-in wall block on a given side (dir = +1 left, -1 right)
  const wall = (xface: number, dir: number, keyp: string) => (
    <g key={keyp}>
      <rect x={dir > 0 ? xface - 16 : xface} y={beamY - 40} width="16" height="80" class="beam-wall" />
      {Array.from({ length: 7 }, (_, i) =>
        dir > 0 ? (
          <line key={i} x1={xface - 16} y1={beamY - 40 + i * 12 + 12} x2={xface - 4} y2={beamY - 40 + i * 12} class="propped-hatch" />
        ) : (
          <line key={i} x1={xface + 4} y1={beamY - 40 + i * 12} x2={xface + 16} y2={beamY - 40 + i * 12 + 12} class="propped-hatch" />
        ),
      )}
    </g>
  );

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Fixed-fixed beam with uniform load" width="100%">
        <title>Beam built into a wall at both ends, carrying a uniform distributed load</title>
        <desc>
          A beam clamped into a hatched wall at each end, under a row of downward distributed-load
          arrows. Equal upward reaction arrows at the two walls, and a curved arrow at each wall marks
          its fixing moment. The exaggerated deflected shape dips symmetrically to its deepest point at
          midspan — flat where it meets each wall — and turns red past first yield.
        </desc>

        {wall(x0, 1, "wallA")}
        {wall(x1, -1, "wallB")}

        {/* undeformed reference + the true deflected curve */}
        <line x1={x0} y1={beamY} x2={x1} y2={beamY} class="beam-ghost" />
        <polyline points={curve} class={danger ? "beam-line beam-yielding" : "beam-line"} fill="none" />

        {/* distributed load w */}
        {udl.map((x, i) => (
          <g key={i}>
            <line x1={x} y1={beamY - 40} x2={x} y2={beamY - 14} class="load-arrow-light" />
            <path d={`M ${x - 3} ${beamY - 19} L ${x} ${beamY - 14} L ${x + 3} ${beamY - 19}`} class="load-arrow-light" />
          </g>
        ))}
        <line x1={x0} y1={beamY - 40} x2={x1} y2={beamY - 40} class="load-arrow-light" />
        <text x={(x0 + x1) / 2 - 4} y={beamY - 46} class="sim-label">w</text>

        {/* equal reaction arrows */}
        {upArrow(x0, lenA, "ra")}
        {upArrow(x1, lenB, "rb")}
        <text x={x0 - 22} y={beamY + 22 + lenA} class="sim-label">R_A</text>
        <text x={x1 + 6} y={beamY + 22 + lenB} class="sim-label">R_B</text>

        {/* hogging fixing-moment arcs at BOTH walls (mirror images) */}
        <path d={`M ${x0 + 4} ${beamY - 16} A 16 16 0 1 1 ${x0 + 3} ${beamY + 15}`} class="propped-moment" fill="none" />
        <path d={`M ${x0 - 1} ${beamY + 9} L ${x0 + 3} ${beamY + 15} L ${x0 + 8} ${beamY + 11}`} class="propped-moment" fill="none" />
        <text x={x0 + 10} y={beamY - 18} class="sim-label">M_A</text>
        <path d={`M ${x1 - 4} ${beamY - 16} A 16 16 0 1 0 ${x1 - 3} ${beamY + 15}`} class="propped-moment" fill="none" />
        <path d={`M ${x1 + 1} ${beamY + 9} L ${x1 - 3} ${beamY + 15} L ${x1 - 8} ${beamY + 11}`} class="propped-moment" fill="none" />
        <text x={x1 - 30} y={beamY - 18} class="sim-label">M_B</text>
      </svg>
      <figcaption>
        Reactions R_A {toDisplay(R_A, "kN").toFixed(2)} kN and R_B {toDisplay(R_B, "kN").toFixed(2)} kN
        (equal by symmetry, independent of material), wall moments M_A = M_B{" "}
        {toDisplay(M_A, "N*m").toFixed(0)} N·m (each twice the midspan moment). Midspan sag{" "}
        {toDisplay(delta_max, "mm").toFixed(2)} mm, drawn{" "}
        {deltaFrac > 0 && visSag / (deltaFrac * span) >= 1
          ? `exaggerated ~${Math.round(visSag / (deltaFrac * span))}×`
          : "to scale"}
        {danger ? ". Shown red: the wall fibers are past first yield." : "."}
      </figcaption>
    </figure>
  );
}
