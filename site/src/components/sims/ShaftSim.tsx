/**
 * Torsion shaft: side view with a scribed surface line that winds into a
 * helix as the twist grows — the exact picture from the derivation's
 * kinematic step. Twist exaggerated to be visible; caption says so
 * (invariant 5: never silently mislead).
 */
import type { VarRecord } from "../../engines/types";
import { SimRefusal } from "./SimRefusal";

export function ShaftSim({ values, invalid = false }: { values: VarRecord; invalid?: boolean }) {
  // the engine's `invalid` verdict is authoritative — no untwisted default
  // shaft over a refused state (invariant 5)
  const theta = values.theta ?? NaN;
  const SF = values.SF ?? Infinity;
  if (invalid || !Number.isFinite(theta)) {
    return <SimRefusal ariaLabel="Torsion shaft diagram (undefined state)" height={130} />;
  }
  const W = 320;
  const H = 130;
  const x0 = 40;
  const shaftLen = W - x0 - 50;
  const cy = H / 2;
  const radius = 22;

  // exaggerate so a realistic elastic twist (~0.03 rad) is visible
  const EXAG = 12;
  const visTheta = Math.min(Math.abs(theta) * EXAG, 6 * Math.PI);

  // scribed line: phase winds linearly along the length (γ = rθx/L kinematics)
  const pts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const s = i / 60;
    const phase = s * visTheta;
    pts.push(`${x0 + s * shaftLen},${cy - radius * 0.8 * Math.cos(phase)}`);
  }
  const danger = Number.isFinite(SF) && SF < 1;

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Shaft in torsion diagram" width="100%">
        <title>Solid circular shaft twisting under torque</title>
        <desc>
          A shaft fixed at the left wall with a torque applied at the right end. A line scribed
          along the surface winds into a helix as the shaft twists; it turns red past shear yield.
        </desc>
        <rect x={x0 - 14} y={cy - 40} width="14" height="80" class="beam-wall" />
        <rect
          x={x0}
          y={cy - radius}
          width={shaftLen}
          height={radius * 2}
          rx={4}
          class={danger ? "shaft-body beam-yielding" : "shaft-body"}
          fill="none"
        />
        <polyline points={pts.join(" ")} class="beam-ghost" fill="none" />
        {/* torque arrow: arc at the free end */}
        <path
          d={`M ${x0 + shaftLen + 8} ${cy + radius} A ${radius} ${radius} 0 1 1 ${x0 + shaftLen + 8} ${cy - radius}`}
          class="load-arrow"
          fill="none"
        />
        <path
          d={`M ${x0 + shaftLen + 3} ${cy - radius + 2} L ${x0 + shaftLen + 8} ${cy - radius - 4} L ${x0 + shaftLen + 14} ${cy - radius + 3} Z`}
          class="load-arrow-head"
        />
        <text x={x0 + shaftLen + 18} y={cy + 4} class="sim-label">
          T
        </text>
      </svg>
      <figcaption>
        Scribed surface line; twist exaggerated ×{EXAG} for visibility (true θ ≈{" "}
        {Number.isFinite(theta) ? theta.toFixed(4) : "—"} rad).
        {danger ? " Shaft shown red: surface shear stress exceeds the shear yield strength." : ""}
      </figcaption>
    </figure>
  );
}
