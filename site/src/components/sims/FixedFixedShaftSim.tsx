/**
 * Fixed-fixed torsion shaft: a solid circular bar built into a hatched wall at
 * each end, with an applied-torque arc at the interior load point x=a and
 * reaction-torque arcs at the two walls SCALED to T_A and T_B (so the larger
 * reaction on the shorter segment reads by eye). A line scribed along the
 * surface winds into a helix that peaks at the load point — zero twist is
 * enforced at both walls — exaggerated to a visible budget, with the
 * exaggeration stated in the caption (invariant 5: never silently mislead).
 * Each segment is drawn from its OWN safety factor, so only the yielded segment
 * turns red. All shapes are presentational functions of the engine's evaluated
 * outputs — no widget math (invariant 4). The engine's `invalid` verdict is the
 * authoritative refusal signal: a singular (determinant-zero) system refuses
 * here, not a confident default figure.
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";

export function FixedFixedShaftSim({ values, invalid = false }: { values: VarRecord; invalid?: boolean }) {
  // no destructuring defaults: a confident figure over a refused state is
  // exactly what invariant 5 forbids
  const T_A = values.T_A ?? NaN;
  const T_B = values.T_B ?? NaN;
  const phi = values.phi ?? NaN;
  const a = values.a ?? NaN;
  const b = values.b ?? NaN;
  const L = values.L ?? NaN;
  const SF_1 = values.SF_1 ?? Infinity;
  const SF_2 = values.SF_2 ?? Infinity;

  const ok =
    !invalid &&
    [T_A, T_B, phi, a, b, L].every(Number.isFinite) &&
    L > 0 &&
    a > 0 &&
    b > 0 &&
    T_A > 0 &&
    T_B > 0;

  const W = 340;
  const H = 168;

  if (!ok) {
    return (
      <SimRefusal
        ariaLabel="Fixed-fixed torsion shaft diagram (refused state)"
        label="refused"
        caption="The engine refused this state — there is no honest reaction diagram to draw."
        height={H}
      />
    );
  }

  const x0 = 42; // left wall face
  const x1 = 298; // right wall face
  const span = x1 - x0;
  const cy = 84;
  const radius = 20;
  const loadX = x0 + span * (a / L);

  // exaggerate so a realistic elastic twist (~6e-3 rad) is visible; the scribe
  // phase rises linearly to the peak over segment A and falls back over B
  const EXAG = 90;
  const phiVis = Math.min(Math.abs(phi) * EXAG, 2.6);
  const fA = a / L;
  const N = 64;
  const scribe = Array.from({ length: N + 1 }, (_, i) => {
    const s = i / N;
    const phase = s <= fA ? (s / fA) * phiVis : (1 - (s - fA) / (1 - fA)) * phiVis;
    return `${(x0 + span * s).toFixed(1)},${(cy - radius * 0.82 * Math.cos(phase)).toFixed(1)}`;
  }).join(" ");

  const danger1 = Number.isFinite(SF_1) && SF_1 < 1;
  const danger2 = Number.isFinite(SF_2) && SF_2 < 1;

  // reaction arcs scaled so the larger reaction reads a bigger loop
  const maxT = Math.max(T_A, T_B);
  const arcR = (t: number) => 7 + 13 * (maxT > 0 ? t / maxT : 0);
  const rA = arcR(T_A);
  const rB = arcR(T_B);

  // a circular reaction/applied arrow centred on the axis at x, radius rr
  const torqueArrow = (x: number, rr: number, cls: string, key: string) => (
    <g key={key}>
      <path
        d={`M ${x + rr} ${cy} A ${rr} ${rr} 0 1 1 ${x - rr} ${cy}`}
        class={cls}
        fill="none"
      />
      <path d={`M ${x - rr - 4} ${cy - 4} L ${x - rr} ${cy + 4} L ${x - rr + 5} ${cy - 2} Z`} class={`${cls}-head`} />
    </g>
  );

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Fixed-fixed torsion shaft with an interior torque" width="100%">
        <title>Solid circular shaft fixed at both ends, twisted by an interior torque</title>
        <desc>
          A shaft built into a hatched wall at each end. A large circular arrow at the interior load
          point marks the applied torque; smaller circular arrows at the two walls mark the reaction
          torques, scaled to their magnitudes so the larger reaction on the shorter segment is bigger.
          A line scribed along the surface winds into a helix that peaks at the load point and returns
          to zero at each wall; a segment turns red past shear yield.
        </desc>

        {/* left wall A */}
        <rect x={x0 - 14} y={cy - 38} width="14" height="76" class="beam-wall" />
        {Array.from({ length: 6 }, (_, i) => (
          <line key={`ha${i}`} x1={x0 - 14} y1={cy - 34 + i * 12 + 12} x2={x0 - 2} y2={cy - 34 + i * 12} class="propped-hatch" />
        ))}
        {/* right wall B */}
        <rect x={x1} y={cy - 38} width="14" height="76" class="beam-wall" />
        {Array.from({ length: 6 }, (_, i) => (
          <line key={`hb${i}`} x1={x1 + 2} y1={cy - 34 + i * 12} x2={x1 + 14} y2={cy - 34 + i * 12 + 12} class="propped-hatch" />
        ))}

        {/* the two shaft segments, each coloured by its own safety factor */}
        <rect x={x0} y={cy - radius} width={loadX - x0} height={radius * 2} rx={3} class={danger1 ? "shaft-body ff-yielding" : "shaft-body"} fill="none" />
        <rect x={loadX} y={cy - radius} width={x1 - loadX} height={radius * 2} rx={3} class={danger2 ? "shaft-body ff-yielding" : "shaft-body"} fill="none" />

        {/* scribed surface line, twisted */}
        <polyline points={scribe} class="beam-ghost" fill="none" />

        {/* reaction arcs at the walls (teal), applied torque at the load point (ink) */}
        {torqueArrow(x0 + 2, rA, "ff-reaction", "tA")}
        {torqueArrow(x1 - 2, rB, "ff-reaction", "tB")}
        {torqueArrow(loadX, 17, "ff-applied", "tApplied")}

        {/* labels */}
        <text x={x0 - 6} y={cy - 42} class="sim-label">T_A</text>
        <text x={x1 - 12} y={cy - 42} class="sim-label">T_B</text>
        <text x={loadX - 6} y={cy - 26} class="sim-label">T</text>
        <line x1={loadX} y1={cy + radius + 3} x2={loadX} y2={cy + radius + 12} class="beam-ghost" />
        <text x={loadX - 6} y={cy + radius + 24} class="sim-label-small">x = a</text>
      </svg>
      <figcaption>
        Reaction torques T_A {toDisplay(T_A, "N*m").toFixed(0)} N·m and T_B {toDisplay(T_B, "N*m").toFixed(0)} N·m
        (split by geometry, independent of material) — the larger loop sits on the shorter segment.
        Twist at the load point {toDisplay(phi, "deg").toFixed(2)}°, scribe exaggerated ×{EXAG} for
        visibility.
        {danger1 || danger2 ? " Segment shown red: its surface shear is past yield." : ""}
      </figcaption>
    </figure>
  );
}
