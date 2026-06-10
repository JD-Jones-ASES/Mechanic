/**
 * Thin-walled tube: the sim CONSTRUCTS a section realizing the dialed
 * (A_m, S) exactly — a stadium (straight-sided oval), whose family sweeps
 * from circle to slot and covers every pair allowed by the isoperimetric
 * inequality. Its corner radius r solves πr² − Sr + A_m = 0, real precisely
 * when S² ≥ 4πA_m, so the construction fails exactly where the engine's
 * invalid envelope fires — the refusal and the geometry agree by theorem.
 * Wall weight tracks t; the wall turns red past shear yield. Static figure.
 * The engine's `invalid` verdict is the authoritative refusal signal (this
 * THING's refusal fires with every value finite).
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";

export function TubeSim({ values, invalid = false }: { values: VarRecord; invalid?: boolean }) {
  // no destructuring defaults: a confident default section over a refused
  // (geometrically impossible) state is exactly what invariant 5 forbids
  const A_m = values.A_m ?? NaN;
  const S = values.S ?? NaN;
  const t = values.t ?? NaN;
  const tau = values.tau ?? NaN;
  const SF = values.SF ?? Infinity;

  const disc = S * S - 4 * Math.PI * A_m;
  const ok = !invalid && [A_m, S, t].every(Number.isFinite) && A_m > 0 && disc >= 0;
  const W = 320;
  const H = 220;

  if (!ok) {
    return (
      <SimRefusal
        ariaLabel="Tube cross-section (refused state)"
        label="no such section"
        caption="No closed curve encloses this much area with this little perimeter (isoperimetric inequality) — there is no section to draw."
        height={H}
      />
    );
  }

  // stadium realizing (A_m, S): corner radius r, straight length a (median line)
  const r = (S - Math.sqrt(disc)) / (2 * Math.PI);
  const a = (S - 2 * Math.PI * r) / 2;
  // fit: total median width = a + 2r, height = 2r
  const scale = Math.min(250 / (a + 2 * r), 130 / (2 * r));
  const rPx = r * scale;
  const aPx = a * scale;
  const tPx = Math.max(2, Math.min(16, t * scale));
  const cx = W / 2;
  const cy = 96;
  const left = cx - aPx / 2;
  const right = cx + aPx / 2;
  const danger = Number.isFinite(SF) && SF < 1;

  const path = `M ${left} ${cy - rPx}
    L ${right} ${cy - rPx}
    A ${rPx} ${rPx} 0 0 1 ${right} ${cy + rPx}
    L ${left} ${cy + rPx}
    A ${rPx} ${rPx} 0 0 1 ${left} ${cy - rPx} Z`;

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Closed thin-walled section constructed from the dialed area and perimeter" width="100%">
        <title>A stadium section realizing exactly the enclosed area and perimeter you set</title>
        <desc>
          A rounded closed section whose median line encloses exactly the dialed area with
          exactly the dialed perimeter. The wall thickness tracks the t knob and turns red
          past shear yield. Arrows on the wall show the circulating shear flow.
        </desc>
        <path d={path} class={danger ? "tube-wall-hot" : "tube-wall"} stroke-width={tPx} />
        {/* shear-flow arrows circulating on the median line */}
        {[0.18, 0.5, 0.82].map((f, i) => (
          <g key={i}>
            <path d={`M ${left + aPx * (f - 0.06)} ${cy - rPx} l ${aPx * 0.1 + 6} 0`} class="tube-flow" />
            <path
              d={`M ${left + aPx * (f - 0.06) + aPx * 0.1 + 6} ${cy - rPx} l -5 -3 m 5 3 l -5 3`}
              class="tube-flow"
              fill="none"
            />
            <path d={`M ${right - aPx * (f - 0.06)} ${cy + rPx} l ${-(aPx * 0.1 + 6)} 0`} class="tube-flow" />
            <path
              d={`M ${right - aPx * (f - 0.06) - aPx * 0.1 - 6} ${cy + rPx} l 5 -3 m -5 3 l 5 3`}
              class="tube-flow"
              fill="none"
            />
          </g>
        ))}
        <text x={cx} y={cy + 4} text-anchor="middle" class="sim-label">
          A_m
        </text>
      </svg>
      <figcaption>
        A section built from your knobs: this stadium's median line encloses exactly{" "}
        {Number.isFinite(A_m) ? toDisplay(A_m, "cm^2").toFixed(1) : "—"} cm² with exactly{" "}
        {Number.isFinite(S) ? toDisplay(S, "mm").toFixed(0) : "—"} mm of perimeter (corner radius{" "}
        {Number.isFinite(r) ? (r * 1000).toFixed(1) : "—"} mm — a circle when the isoperimetric bound is
        tight). Arrows: the constant shear flow; wall shear{" "}
        {Number.isFinite(tau) ? (tau / 1e6).toFixed(1) : "—"} MPa.
        {danger ? " Shown red: the wall is past shear yield." : ""}
      </figcaption>
    </figure>
  );
}
