/**
 * Power screw: the unwrapped thread, drawn honestly. One turn of thread is an
 * inclined plane of run πd_m and rise l, and the figure draws that triangle at
 * the TRUE lead angle — the visible flatness of a real jack's ramp IS the
 * self-locking lesson. The load block turns red and the verdict flips when
 * T_L goes negative (back-driving). Static figure. The engine's `invalid`
 * verdict (e.g. the jammed-wedge envelope, which fires with finite values) is
 * the authoritative refusal signal (invariant 5).
 */
import type { VarRecord } from "../../engines/types";
import { SimRefusal } from "./SimRefusal";

export function ScrewSim({ values, invalid = false }: { values: VarRecord; invalid?: boolean }) {
  // no destructuring defaults: a confident default ramp over a refused state
  // is exactly what invariant 5 forbids
  const lam = values.lam ?? NaN;
  const T_R = values.T_R ?? NaN;
  const T_L = values.T_L ?? NaN;
  const eff = values.eff ?? NaN;

  const ok = !invalid && [lam, T_R, T_L].every(Number.isFinite) && lam > 0 && lam < 1.4;
  const W = 320;
  const H = 200;

  if (!ok) {
    return (
      <SimRefusal
        ariaLabel="Power screw inclined-plane diagram (refused state)"
        label="refused"
        caption="The engine refused this state — a jammed wedge (f·tanλ ≥ 1) has no finite raising torque to draw."
        height={H}
      />
    );
  }

  const baseY = 168;
  const x0 = 26;
  const run = 264;
  const rise = Math.min(120, run * Math.tan(lam));
  const x1 = x0 + run;
  const topY = baseY - rise;

  // block sits mid-slope, rotated to the true angle
  const t = 0.55;
  const bx = x0 + run * t;
  const by = baseY - rise * t;
  const bw = 34;
  const bh = 20;
  const lamDeg = (lam * 180) / Math.PI;
  const selfLocking = T_L > 0;

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Power screw thread unwrapped into an inclined plane" width="100%">
        <title>One turn of thread unwrapped into an inclined plane</title>
        <desc>
          A right triangle with base pi times the mean diameter and rise equal to the lead,
          drawn at the true lead angle. A load block rests on the slope; it shows red when the
          screw is not self-locking and the load would back-drive.
        </desc>
        {/* the unwrapped thread */}
        <path d={`M ${x0} ${baseY} L ${x1} ${baseY} L ${x1} ${topY} Z`} class="screw-incline" />
        <text x={x0 + run / 2} y={baseY + 14} text-anchor="middle" class="sim-label">
          π·d_m (one turn)
        </text>
        <text x={x1 + 2} y={(baseY + topY) / 2 + 4} class="sim-label">
          l
        </text>
        <text x={x0 + 46} y={baseY - 6} class="sim-label">
          λ = {lamDeg.toFixed(1)}°
        </text>
        {/* load block on the slope */}
        <g transform={`rotate(${-lamDeg} ${bx} ${by})`}>
          <rect
            x={bx - bw / 2}
            y={by - bh}
            width={bw}
            height={bh}
            class={selfLocking ? "screw-block" : "screw-block-slipping"}
          />
        </g>
        {/* weight arrow */}
        <line x1={bx} y1={by - 2} x2={bx} y2={by + 34} class="load-arrow" />
        <path d={`M ${bx - 5} ${by + 28} L ${bx} ${by + 34} L ${bx + 5} ${by + 28}`} class="load-arrow" fill="none" />
        <text x={bx + 8} y={by + 32} class="sim-label">
          F
        </text>
        {/* push arrow, up-slope side */}
        <line x1={bx - bw / 2 - 34} y1={by - bh / 2} x2={bx - bw / 2 - 6} y2={by - bh / 2} class="load-arrow" />
        <path
          d={`M ${bx - bw / 2 - 12} ${by - bh / 2 - 5} L ${bx - bw / 2 - 6} ${by - bh / 2} L ${bx - bw / 2 - 12} ${by - bh / 2 + 5}`}
          class="load-arrow"
          fill="none"
        />
        <text x={bx - bw / 2 - 34} y={by - bh / 2 - 8} class="sim-label">
          P
        </text>
      </svg>
      <figcaption>
        Drawn at the true lead angle. Raise: {Number.isFinite(T_R) ? T_R.toFixed(1) : "—"} N·m;
        lower: {Number.isFinite(T_L) ? T_L.toFixed(1) : "—"} N·m —{" "}
        {selfLocking ? "self-locking (the load stays put)" : "NOT self-locking (the load back-drives the screw)"}.
        Efficiency {Number.isFinite(eff) ? (100 * eff).toFixed(0) : "—"} %.
      </figcaption>
    </figure>
  );
}
