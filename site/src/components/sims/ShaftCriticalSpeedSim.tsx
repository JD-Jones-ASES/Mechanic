/**
 * Shaft critical speed: a side view of a disk at the midspan of a shaft on two
 * bearings, with the shaft whirling (its bow sweeping about the spin axis), over
 * a speed axis that marks the Rayleigh critical speed ω_c, the Dunkerley estimate
 * ω_cD, the shaded resonance band (±20% of ω_c), and the operating-speed pointer.
 *
 * The whirl bow's amplitude follows the UNDAMPED rotor magnification r²/|1−r²|
 * with r = ω_op/ω_c (the classic Jeffcott result — it genuinely blows up at ω_c),
 * scaled to pixels and clamped for display; the swing rate is a compressed,
 * monotonic image of ω_op so the whirl is watchable. The engine's `invalid`
 * verdict is the only authoritative refusal signal — this THING is warn-only, so
 * the refusal branch is a defensive contract (unreachable via the knobs).
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";
import { clamp } from "./simMath";
import { useSimClock } from "./useSimClock";

export function ShaftCriticalSpeedSim({
  values,
  invalid = false,
}: {
  values: VarRecord;
  invalid?: boolean;
}) {
  // no destructuring defaults for load-bearing values: a confident default figure
  // drawn over a refused state is exactly what invariant 5 forbids
  const omega_op = values.omega_op ?? NaN;
  const omega_c = values.omega_c ?? NaN;
  const omega_cD = values.omega_cD ?? NaN;
  const f_c = values.f_c ?? NaN;
  const sr = values.sr ?? NaN;
  const refused =
    invalid ||
    !Number.isFinite(omega_c) ||
    omega_c <= 0 ||
    !Number.isFinite(omega_op) ||
    !Number.isFinite(omega_cD);

  // IMPORTANT: this clock only PRESENTS the already-solved state — it plays the
  // whirl back at a watchable, monotonic image of ω_op. Nothing here is
  // integrated: there is no equation of motion stepped, no dθ/dt. The bow below
  // is A(t) = A_vis·sin(visΩ·t) sampled at the shared clock, with visΩ and the
  // amplitude rescaled purely for display. (Batch discipline: dynamics without a
  // clock; the first sim that integrates the motion has broken the design.)
  const { t, playing, setPlaying } = useSimClock(!refused);

  // resonance magnification of an undamped Jeffcott rotor: y ∝ r²/|1−r²|, which
  // is unbounded at r=1 — clamped for pixels, so the bow visibly runs away as the
  // operating speed approaches ω_c and shrinks again supercritically
  const r = Number.isFinite(sr) ? Math.abs(sr) : 0;
  const denom = Math.abs(1 - r * r);
  const mag = denom < 0.02 ? 8 : Math.min((r * r) / denom, 8);
  const aVis = clamp(4 + 5 * mag, 4, 46);
  // compress ω_op (≈105 rad/s default) to a watchable rate, monotonic + clamped
  const visOmega = clamp((Number.isFinite(omega_op) ? omega_op : 0) * (3 / 105), 0.4, 9);
  const disp = aVis * Math.sin(visOmega * t);

  // after the hooks (rules of hooks): refuse to draw a state the engine refused
  if (refused) {
    return <SimRefusal ariaLabel="Shaft critical-speed diagram (undefined state)" />;
  }

  const W = 340;
  const H = 300;
  const y0 = 92; // undeflected shaft axis
  const base = 158; // machine base line
  const xL = 50;
  const xR = 290;
  const xM = (xL + xR) / 2;
  const inBand = Number.isFinite(sr) && Math.abs(sr - 1) < 0.2;
  const shaftClass = inBand ? "scs-shaft-hot" : "scs-shaft";
  // control point of the quadratic bow so it passes through (xM, y0+disp)
  const cpY = y0 + 2 * disp;
  const diskH = clamp(26 + (values.m ?? 0) * 0.5, 26, 62);

  // speed axis
  const axX0 = 50;
  const axW = 240;
  const yAx = 250;
  const sMax = Math.max(omega_c * 1.35, omega_op * 1.1, omega_cD * 1.1, 1);
  const xOf = (s: number) => clamp(axX0 + (s / sMax) * axW, axX0, axX0 + axW);
  const xC = xOf(omega_c);
  const xCd = xOf(omega_cD);
  const xOp = xOf(omega_op);
  const xB0 = xOf(0.8 * omega_c);
  const xB1 = xOf(1.2 * omega_c);
  const rpm = (s: number) => (Number.isFinite(s) ? toDisplay(s, "rpm") : NaN);

  return (
    <figure class="sim">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Shaft critical-speed diagram"
        width="100%"
      >
        <title>A disk on a shaft between two bearings, whirling, over a speed axis</title>
        <desc>
          A shaft rests on two bearing pedestals with a disk at its midspan. The shaft bows and the
          bow sweeps up and down — the whirl — growing as the operating speed nears the critical
          speed. Below, a speed axis marks the Rayleigh critical speed, the Dunkerley estimate, the
          shaded resonance band, and a pointer for the current operating speed.
        </desc>

        {/* machine base + two bearing pedestals */}
        <line x1={20} y1={base} x2={320} y2={base} class="scs-base" />
        <polygon points={`${xL - 12},${base} ${xL + 12},${base} ${xL},${y0}`} class="scs-bearing" />
        <polygon points={`${xR - 12},${base} ${xR + 12},${base} ${xR},${y0}`} class="scs-bearing" />

        {/* undeflected spin axis (reference) */}
        <line x1={xL} y1={y0} x2={xR} y2={y0} class="beam-ghost" />

        {/* the whirling shaft bow */}
        <path d={`M ${xL} ${y0} Q ${xM} ${cpY} ${xR} ${y0}`} class={shaftClass} />

        {/* the disk at midspan, riding the bow (side view: the wheel's edge) */}
        <rect
          x={xM - 6}
          y={y0 + disp - diskH / 2}
          width={12}
          height={diskH}
          rx={2}
          class="scs-disk"
        />
        <circle cx={xM} cy={y0 + disp} r={3} class="fw-hub" />

        {/* speed axis */}
        <text x={xM} y={205} text-anchor="middle" class="sim-label">
          shaft speed →
        </text>
        {/* resonance band (±20% of ω_c) */}
        <rect x={xB0} y={yAx - 16} width={Math.max(xB1 - xB0, 1)} height={32} class="scs-band" />
        <line x1={axX0} y1={yAx} x2={axX0 + axW} y2={yAx} class="scs-axis" />

        {/* Dunkerley estimate */}
        <line x1={xCd} y1={yAx - 9} x2={xCd} y2={yAx + 9} class="scs-tick-dunk" />
        <text x={xCd} y={yAx + 22} text-anchor="middle" class="sim-label-small">
          ω_cD
        </text>
        {/* Rayleigh critical speed */}
        <line x1={xC} y1={yAx - 12} x2={xC} y2={yAx + 12} class="scs-tick" />
        <text x={xC} y={yAx - 16} text-anchor="middle" class="sim-label">
          ω_c
        </text>

        {/* operating-speed pointer */}
        <polygon
          points={`${xOp},${yAx - 2} ${xOp - 6},${yAx - 14} ${xOp + 6},${yAx - 14}`}
          class={inBand ? "scs-op-hot" : "scs-op"}
        />
        <text x={clamp(xOp, axX0 + 14, axX0 + axW - 14)} y={yAx + 34} text-anchor="middle" class="sim-label-small">
          operating
        </text>
      </svg>
      <figcaption>
        <button type="button" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
          {playing ? "Pause" : "Animate"}
        </button>{" "}
        Critical speed ω_c ≈ {Number.isFinite(rpm(omega_c)) ? rpm(omega_c).toFixed(0) : "—"} rpm
        ({Number.isFinite(f_c) ? f_c.toFixed(1) : "—"} Hz); Dunkerley ≈{" "}
        {Number.isFinite(rpm(omega_cD)) ? rpm(omega_cD).toFixed(0) : "—"} rpm; running at{" "}
        {Number.isFinite(rpm(omega_op)) ? rpm(omega_op).toFixed(0) : "—"} rpm
        {Number.isFinite(sr) ? ` (${(sr * 100).toFixed(0)}% of critical)` : ""}. Whirl shown far
        slower and wider than reality; its amplitude follows the undamped rotor magnification, which
        peaks at ω_c — the swing is played back, not integrated.
        {inBand ? " In the resonance band: shown red." : ""}
      </figcaption>
    </figure>
  );
}
