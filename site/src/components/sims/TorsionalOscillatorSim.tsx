/**
 * Torsional oscillator: a disk on an elastic shaft, drawn face-on so the
 * torsional swing is visible. A fixed wall and the shaft (the torsion spring)
 * enter from the left into the disk's hub; a bold radius marker on the disk
 * face swings ±Θ about the vertical equilibrium. Amplitude is exaggerated and
 * the swing rate is compressed so a ~35 Hz ring is watchable — the caption
 * carries the true numbers (invariant 5: never silently mislead). The marker
 * turns red past shear yield. The engine's `invalid` verdict is the only
 * authoritative refusal signal (a refusal can leave values omitted,
 * present-as-NaN, or fully finite when a validity predicate fires).
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";
import { useSimClock } from "./useSimClock";

export function TorsionalOscillatorSim({
  values,
  invalid = false,
}: {
  values: VarRecord;
  invalid?: boolean;
}) {
  // no destructuring defaults for load-bearing values: a healthy default disk
  // drawn over a refused state is exactly what invariant 5 forbids
  const R = values.R ?? NaN;
  const Theta = values.Theta ?? NaN;
  const omega_n = values.omega_n ?? NaN;
  const f = values.f ?? NaN;
  const T_per = values.T_per ?? NaN;
  const SF = values.SF ?? Infinity;
  const refused =
    invalid ||
    !Number.isFinite(R) ||
    R <= 0 ||
    !Number.isFinite(omega_n) ||
    !Number.isFinite(Theta);

  // IMPORTANT: this clock only PRESENTS the already-solved state — it plays the
  // computed natural frequency back at a watchable rate. Nothing here is
  // integrated: there is no dθ/dt step, no ODE. The angle below is Θ·sin(ωt)
  // sampled at the shared clock time, with ω and Θ rescaled purely for display.
  // (This batch's discipline is dynamics-without-a-clock; the first sim that
  // integrates the motion has broken the design.)
  const { t, playing, setPlaying } = useSimClock(!refused);

  const W = 320;
  const H = 240;
  const cx = 208;
  const cy = 116;

  // compress the true ω_n (≈220 rad/s at the default) to a watchable rate,
  // clamped but MONOTONIC so stiffer/denser knobs visibly speed up or slow the
  // swing; amplitude is exaggerated so a few-degree ring is legible
  const visOmega = Math.min(Math.max((Number.isFinite(omega_n) ? omega_n : 0) * (3 / 221), 0.5), 10);
  const AMP_EXAG = 6;
  const thetaVis = Number.isFinite(Theta) ? Math.min(Math.abs(Theta) * AMP_EXAG, 0.9) : 0;
  const phi = thetaVis * Math.sin(visOmega * t); // rad, about the vertical rest position

  // after the hooks (rules of hooks): refuse to draw a state the engine refused
  if (refused) {
    return <SimRefusal ariaLabel="Torsional oscillator diagram (undefined state)" />;
  }

  const rVis = Math.min(30 + 150 * R, 92); // disk drawn to (clamped) radius scale
  const danger = Number.isFinite(SF) && SF < 1;

  // equilibrium points straight up; a positive phi swings the marker to the right
  const ang = (p: number) => -Math.PI / 2 + p;
  const tip = (p: number, r: number): [number, number] => [
    cx + r * Math.cos(ang(p)),
    cy + r * Math.sin(ang(p)),
  ];
  const [mx, my] = tip(phi, rVis);
  const [ex1x, ex1y] = tip(thetaVis, rVis); // right extreme
  const [ex2x, ex2y] = tip(-thetaVis, rVis); // left extreme
  // amplitude arc between the two extremes, drawn at 0.5·R
  const rArc = rVis * 0.5;
  const [a1x, a1y] = tip(thetaVis, rArc);
  const [a2x, a2y] = tip(-thetaVis, rArc);

  const degTrue = Number.isFinite(Theta) ? (Theta * 180) / Math.PI : NaN;
  const hz = Number.isFinite(f) ? f : NaN;
  const ms = Number.isFinite(T_per) ? T_per * 1000 : NaN;
  const rpm = Number.isFinite(omega_n) ? toDisplay(omega_n, "rpm") : NaN;

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Torsional oscillator diagram" width="100%">
        <title>A disk on an elastic shaft oscillating in torsion</title>
        <desc>
          A disk seen face-on, with the shaft entering from a fixed wall on the left into its hub.
          A radius marker on the disk swings back and forth about the vertical rest position — the
          torsional oscillation — sweeping the amplitude arc. It turns red past shear yield.
        </desc>

        {/* fixed wall + shaft (the torsion spring) entering the hub from the left */}
        <rect x={8} y={cy - 26} width={12} height={52} class="beam-wall" />
        <rect
          x={20}
          y={cy - 5}
          width={cx - 20}
          height={10}
          class={danger ? "shaft-body beam-yielding" : "shaft-body"}
          fill="none"
        />
        <text x={(20 + cx) / 2} y={cy - 12} text-anchor="middle" class="sim-label-small">
          shaft k_t (fixed far end)
        </text>

        {/* the disk face */}
        <circle cx={cx} cy={cy} r={rVis} class="osc-disk" />
        <circle cx={cx} cy={cy} r={rVis} class="sim-outline" />

        {/* equilibrium reference (rest position, straight up) */}
        <line x1={cx} y1={cy} x2={cx} y2={cy - rVis} class="beam-ghost" />

        {/* amplitude envelope: the two swing extremes and the arc between them */}
        <line x1={cx} y1={cy} x2={ex1x} y2={ex1y} class="osc-envelope" />
        <line x1={cx} y1={cy} x2={ex2x} y2={ex2y} class="osc-envelope" />
        <path
          d={`M ${a2x} ${a2y} A ${rArc} ${rArc} 0 0 1 ${a1x} ${a1y}`}
          class="osc-envelope"
          fill="none"
        />
        <text x={cx} y={cy - rArc - 4} text-anchor="middle" class="sim-label">
          Θ
        </text>

        {/* the swinging marker (bold radius + tip ball) — the oscillation itself */}
        <line
          x1={cx}
          y1={cy}
          x2={mx}
          y2={my}
          class={danger ? "osc-marker-hot" : "osc-marker"}
        />
        <circle cx={mx} cy={my} r={5} class={danger ? "osc-tip-hot" : "osc-tip"} />
        <circle cx={cx} cy={cy} r={3.5} class="fw-hub" />

        {/* speed bar removed: the swing itself carries the frequency story */}
      </svg>
      <figcaption>
        <button type="button" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
          {playing ? "Pause" : "Animate"}
        </button>{" "}
        Rings at {Number.isFinite(hz) ? hz.toFixed(1) : "—"} Hz (period{" "}
        {Number.isFinite(ms) ? ms.toFixed(1) : "—"} ms,{" "}
        {Number.isFinite(rpm) ? rpm.toFixed(0) : "—"} rpm-equivalent); swing shown far slower and
        wider than reality (true amplitude {Number.isFinite(degTrue) ? degTrue.toFixed(1) : "—"}°).
        The animation plays the solved frequency back — it is not integrated.
        {danger ? " Shown red: shear stress at the amplitude is past yield." : ""}
      </figcaption>
    </figure>
  );
}
