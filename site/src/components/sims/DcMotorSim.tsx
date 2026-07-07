/**
 * DC motor: a spinning rotor beside the machine's whole personality — the
 * torque–speed line. The line is drawn ONLY through engine anchors ((0,
 * T_stall) and (ω₀, 0); no physics re-derived in the widget), the operating
 * point sits at the engine's (ω, T), and the dashed continuation past ω₀ is
 * the geometric extension of the same two anchors (the braking/generating
 * regime the warn banner names — the dot turns red when delivered torque goes
 * negative). The bar underneath places delivered power P against the peak
 * available P_max = T_stall·ω₀/4. Spin rate is compressed for readability and
 * the caption says so with the true numbers alongside (invariant 5). The
 * engine's `invalid` verdict is the authoritative refusal signal — a refusal
 * can leave values omitted, present-as-NaN, or fully finite.
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";
import { useSimClock } from "./useSimClock";

export function DcMotorSim({ values, invalid = false }: { values: VarRecord; invalid?: boolean }) {
  // no destructuring defaults for load-bearing values: drawing a healthy
  // default motor over a refused state is exactly what invariant 5 forbids
  const T_stall = values.T_stall ?? NaN;
  const omega_0 = values.omega_0 ?? NaN;
  const omega = values.omega ?? NaN;
  const T = values.T ?? NaN;
  const P = values.P ?? NaN;
  const P_max = values.P_max ?? NaN;
  const omega_p = values.omega_p ?? NaN;
  const refused =
    invalid ||
    ![T_stall, omega_0, omega, T].every(Number.isFinite) ||
    T_stall <= 0 ||
    omega_0 <= 0;
  const { t, playing, setPlaying } = useSimClock(!refused);

  // ω spans 0–3500 rad/s: the visual rate is log-compressed like the
  // flywheel's (≈1.4 rad/s at the 150 rad/s default); ω = 0 honestly stalls.
  const visOmega = Number.isFinite(omega) && omega > 0 ? 1.6 * (Math.log10(1 + omega) / Math.log10(301)) : 0;
  const th = t * visOmega;

  const W = 340;
  const H = 232;

  // after the hooks (rules of hooks): refuse to draw a state the engine refused
  if (refused) {
    return (
      <SimRefusal
        ariaLabel="DC motor diagram (undefined state)"
        label="no operating point"
        caption="This state was refused — no point on the torque–speed line delivers it; nothing honest to draw."
      />
    );
  }

  /* ---------- left: the rotor, spinning at (compressed) ω ---------- */
  const cx = 62;
  const cy = 88;
  const rVis = 40;
  const ticks = Array.from({ length: 8 }, (_, i) => th + (i * Math.PI) / 4);

  /* ---------- right: torque–speed chart through engine anchors ----------
   * Anchors: (0, T_stall) and (ω₀, 0) — both engine values. The solid
   * segment is the motoring line between them; the dashed segment extends
   * the SAME two-anchor line to the right edge (braking/generating). */
  const chX = 138;
  const chW = W - chX - 12;
  const chTop = 18;
  const chBottom = 148;
  const xMax = 1.12 * Math.max(omega_0, omega, 1e-9);
  const yTop = 1.12 * T_stall;
  const yBot = Math.min(0, 1.15 * T); // extend below the axis only when T < 0
  const px = (w: number) => chX + (w / xMax) * chW;
  const py = (torque: number) => chTop + ((yTop - torque) / (yTop - yBot)) * (chBottom - chTop);
  const axisY = py(0);
  // geometric extension of the anchor line to the chart's right edge
  const slope = -T_stall / omega_0; // rise per rad/s, from the two anchors
  const tAtXMax = T_stall + slope * xMax;
  const braking = T < 0;

  /* ---------- below: delivered power vs peak available ---------- */
  const barX = 40;
  const barWidth = 260;
  const barY = 200;
  const pFrac = Number.isFinite(P) && Number.isFinite(P_max) && P_max > 0 ? P / P_max : 0;
  const fillW = barWidth * Math.min(Math.max(pFrac, 0), 1);
  const rpm = toDisplay(omega, "rpm"); // same conversion table the readouts use
  const kW = (x: number) => (Number.isFinite(x) ? toDisplay(x, "kW").toFixed(1) : "—");

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="DC motor torque–speed diagram" width="100%">
        <title>DC motor rotor and its torque–speed line</title>
        <desc>
          A rotor spins at the operating speed beside a chart of the motor's straight
          torque–speed line from stall torque to no-load speed. A dot marks the operating
          point, a dashed vertical marks the peak-power speed, and a bar below compares
          delivered power to the peak available power.
        </desc>

        {/* stator shell + brushes (static), rotor (spinning) */}
        <circle cx={cx} cy={cy} r={rVis + 9} class="sim-outline" />
        <rect x={cx - rVis - 16} y={cy - 5} width={9} height={10} class="beam-wall" />
        <rect x={cx + rVis + 7} y={cy - 5} width={9} height={10} class="beam-wall" />
        <circle cx={cx} cy={cy} r={rVis} class="sim-outline" />
        {ticks.map((a, i) => (
          <line
            x1={cx + 0.86 * rVis * Math.cos(a)}
            y1={cy + 0.86 * rVis * Math.sin(a)}
            x2={cx + rVis * Math.cos(a)}
            y2={cy + rVis * Math.sin(a)}
            class="fw-tick"
            key={i}
          />
        ))}
        <line x1={cx} y1={cy} x2={cx + rVis * Math.cos(th)} y2={cy + rVis * Math.sin(th)} class="fw-scribe" />
        <circle cx={cx} cy={cy} r={3} class="fw-hub" />
        <text x={cx} y={cy + rVis + 22} text-anchor="middle" class="sim-label-small">
          rotor (speed compressed)
        </text>

        {/* chart frame: T vs ω */}
        <line x1={chX} y1={chTop - 4} x2={chX} y2={chBottom} class="chart-axis" />
        <line x1={chX} y1={axisY} x2={chX + chW} y2={axisY} class="chart-axis" />
        <text x={chX - 4} y={py(T_stall) + 4} text-anchor="end" class="sim-label-small">
          T_st
        </text>
        <text x={px(omega_0)} y={axisY + 12} text-anchor="middle" class="sim-label-small">
          ω₀
        </text>
        <text x={chX + chW} y={axisY + 12} text-anchor="end" class="sim-label-small">
          ω
        </text>

        {/* peak-power speed reference */}
        <line x1={px(omega_p)} y1={chTop} x2={px(omega_p)} y2={chBottom} class="chart-ref" />
        <text x={px(omega_p)} y={chTop - 6} text-anchor="middle" class="sim-label-small">
          ω_p (peak P)
        </text>

        {/* the line: solid between the two engine anchors, dashed extension past ω₀ */}
        <polyline points={`${px(0)},${py(T_stall)} ${px(omega_0)},${py(0)}`} class="chart-curve chart-euler" fill="none" />
        {xMax > omega_0 ? (
          <polyline
            points={`${px(omega_0)},${py(0)} ${px(xMax)},${py(tAtXMax)}`}
            class="chart-curve chart-curve-off"
            fill="none"
          />
        ) : null}

        {/* operating point at the engine's (ω, T) */}
        <circle cx={px(omega)} cy={py(T)} r={5} class={braking ? "chart-point-danger" : "chart-point"} />

        {/* delivered power vs peak available */}
        <rect x={barX} y={barY} width={barWidth} height={10} rx={2} class="fw-bar-track" />
        <rect x={barX} y={barY} width={Math.max(0, fillW)} height={10} rx={2} class="fw-bar-fill" />
        <line x1={barX + barWidth} y1={barY - 5} x2={barX + barWidth} y2={barY + 15} class="fw-bar-mark" />
        <text x={barX + barWidth} y={barY - 9} text-anchor="middle" class="sim-label">
          P_max
        </text>
        <text x={barX - 6} y={barY + 9} text-anchor="end" class="sim-label">
          P
        </text>
      </svg>
      <figcaption>
        <button type="button" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
          {playing ? "Pause" : "Animate"}
        </button>{" "}
        Delivering {Number.isFinite(T) ? T.toFixed(1) : "—"} N·m at{" "}
        {Number.isFinite(rpm) ? rpm.toFixed(0) : "—"} rpm — {kW(P)} kW of the {kW(P_max)} kW peak;
        rotation shown far slower than true speed.
        {braking ? " Shown red: past no-load speed the machine brakes and generates (T < 0)." : ""}
      </figcaption>
    </figure>
  );
}
