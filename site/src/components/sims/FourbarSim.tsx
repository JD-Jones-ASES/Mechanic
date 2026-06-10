/**
 * Four-bar linkage drawn from the engine's solved angles: ground pivots,
 * crank, coupler, rocker. Pure presentation — every coordinate comes from the
 * verified closed forms (invariant 4: no math in the widget).
 */
import type { VarRecord } from "../../engines/types";

export function FourbarSim({ values }: { values: VarRecord }) {
  const { a = 0.04, b = 0.12, c = 0.08, d = 0.1, theta2 = 0.7, theta3 = NaN, theta4 = NaN } = values;
  const W = 340;
  const H = 220;

  // world->screen: fit the mechanism's reach into the viewBox, y up
  const reach = Math.max(d + c, a + b, a, c) * 1.15;
  const scale = (W - 60) / (reach * 2);
  const ox = W / 2 - (d / 2) * scale;
  const oy = H * 0.58;
  const X = (x: number) => ox + x * scale;
  const Y = (y: number) => oy - y * scale;

  const Ax = a * Math.cos(theta2);
  const Ay = a * Math.sin(theta2);
  const Bx = d + c * Math.cos(theta4);
  const By = c * Math.sin(theta4);
  const assembled = Number.isFinite(theta3) && Number.isFinite(theta4);

  const pivot = (x: number, y: number) => (
    <g>
      <circle cx={X(x)} cy={Y(y)} r="5" class="link-pivot" />
      <path d={`M ${X(x) - 9} ${Y(y) + 12} L ${X(x)} ${Y(y)} L ${X(x) + 9} ${Y(y) + 12} Z`} class="beam-wall" />
    </g>
  );

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Four-bar linkage diagram" width="100%">
        <title>Four-bar linkage in its current pose</title>
        <desc>
          Ground link with two fixed pivots, a crank, a coupler, and a rocker drawn at the angles
          the relations solve for. If the links cannot assemble, only the crank is drawn.
        </desc>
        {/* ground link */}
        <line x1={X(0)} y1={Y(0)} x2={X(d)} y2={Y(0)} class="beam-ghost" />
        {/* crank */}
        <line x1={X(0)} y1={Y(0)} x2={X(Ax)} y2={Y(Ay)} class="link-crank" />
        {assembled ? (
          <>
            {/* coupler and rocker only exist when the loop closes */}
            <line x1={X(Ax)} y1={Y(Ay)} x2={X(Bx)} y2={Y(By)} class="link-coupler" />
            <line x1={X(d)} y1={Y(0)} x2={X(Bx)} y2={Y(By)} class="link-rocker" />
            <circle cx={X(Ax)} cy={Y(Ay)} r="4" class="link-pin" />
            <circle cx={X(Bx)} cy={Y(By)} r="4" class="link-pin" />
          </>
        ) : null}
        {pivot(0, 0)}
        {pivot(d, 0)}
        <text x={X(Ax) + 6} y={Y(Ay) - 6} class="sim-label">
          A
        </text>
        {assembled ? (
          <text x={X(Bx) + 6} y={Y(By) - 6} class="sim-label">
            B
          </text>
        ) : null}
      </svg>
      <figcaption>
        {assembled
          ? "Amber crank, blue coupler, green rocker — drawn to scale from the verified closed-form angles. Switch the circuit selector to see the second assembly."
          : "The coupler and rocker cannot reach the crank pin at this angle: no assembly exists (only the crank is drawn)."}
      </figcaption>
    </figure>
  );
}
