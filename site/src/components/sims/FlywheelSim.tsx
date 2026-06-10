/**
 * Flywheel: face view of the spinning disk with the rotating-disk stress
 * field σ_θ(r) shaded as concentric bands — strongest at the centre, fading
 * to the free rim, heating up as the speed approaches first yield (red past
 * it). The bar underneath places ω against the yield-onset speed ω_y. Spin
 * rate is compressed for readability and the caption says so with the true
 * numbers alongside (invariant 5: never silently mislead). rAF runs only
 * while playing; autoplay is disabled under prefers-reduced-motion
 * (ADR-0006).
 */
import { useEffect, useRef, useState } from "preact/hooks";
import type { VarRecord } from "../../engines/types";

export function FlywheelSim({ values }: { values: VarRecord }) {
  const { R = 0.15, omega = 0, omega_y = Infinity, SF = Infinity, nu = 0.3 } = values;
  const reduced =
    typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [playing, setPlaying] = useState(!reduced);
  const [t, setT] = useState(0);
  const raf = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    if (!playing) return;
    const tick = (now: number) => {
      if (last.current) setT((t) => t + Math.min(now - last.current, 100) / 1000);
      last.current = now;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf.current);
      last.current = 0;
    };
  }, [playing]);

  // ω spans 10–6000 rad/s: a fixed slow-down factor is unreadable at both
  // ends, so the visual rate is log-compressed (≈1.6 rad/s at the default).
  const visOmega = Number.isFinite(omega) ? 1.6 * (Math.log10(1 + omega) / Math.log10(301)) : 0;
  const th = t * visOmega;

  const W = 320;
  const cx = W / 2;
  const cy = 102;
  const rVis = Math.min(30 + 160 * R, 92); // disk drawn to (clamped) radius scale
  const danger = Number.isFinite(SF) && SF < 1;

  // stress bands: σ_θ(r)/σ_max = ((3+ν) − (1+3ν)(r/R)²)/(3+ν), opacity also
  // scaled by proximity to yield so the disk visibly "heats up" as SF → 1
  const N_BANDS = 6;
  const heat = 0.25 + 0.65 * Math.min(1, Number.isFinite(SF) && SF > 0 ? 1 / SF : 0);
  const bandW = rVis / N_BANDS;
  const bands = Array.from({ length: N_BANDS }, (_, i) => {
    const f = (i + 0.5) / N_BANDS;
    const s = (3 + nu - (1 + 3 * nu) * f * f) / (3 + nu);
    return { r: rVis * f, alpha: Math.max(0, Math.min(1, s * heat)) };
  });

  // rim ticks + a scribed radius make the rotation visible
  const ticks = Array.from({ length: 8 }, (_, i) => th + (i * Math.PI) / 4);

  // speed bar: 0 … 1.25·ω_y, with the yield-onset mark fixed at 4/5 of the track
  const barX = 40;
  const barWidth = 240;
  const barY = 212;
  const frac = Number.isFinite(omega_y) && omega_y > 0 ? omega / omega_y : 0;
  const fillW = barWidth * (Math.min(frac, 1.25) / 1.25);
  const markX = barX + barWidth / 1.25;
  const rpm = (omega * 60) / (2 * Math.PI);

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} 240`} role="img" aria-label="Rotating flywheel disk diagram" width="100%">
        <title>Solid flywheel disk spinning, with its internal stress field</title>
        <desc>
          A disk face shaded in concentric bands: the rotating-disk stress field peaks at the
          centre and falls to zero at the free rim. The shading turns red past first yield. A bar
          below compares the spin speed to the yield-onset speed.
        </desc>
        {bands.map((b) => (
          <circle
            cx={cx}
            cy={cy}
            r={b.r}
            class={danger ? "fw-stress-hot" : "fw-stress"}
            stroke-width={bandW}
            stroke-opacity={b.alpha}
            key={b.r}
          />
        ))}
        <circle cx={cx} cy={cy} r={rVis} class="fw-rim" />
        {ticks.map((a, i) => (
          <line
            x1={cx + 0.9 * rVis * Math.cos(a)}
            y1={cy + 0.9 * rVis * Math.sin(a)}
            x2={cx + rVis * Math.cos(a)}
            y2={cy + rVis * Math.sin(a)}
            class="fw-tick"
            key={i}
          />
        ))}
        <line
          x1={cx}
          y1={cy}
          x2={cx + rVis * Math.cos(th)}
          y2={cy + rVis * Math.sin(th)}
          class="fw-scribe"
        />
        <circle cx={cx} cy={cy} r={3} class="fw-hub" />

        {/* speed vs yield-onset bar */}
        <rect x={barX} y={barY} width={barWidth} height={10} rx={2} class="fw-bar-track" />
        <rect
          x={barX}
          y={barY}
          width={Math.max(0, fillW)}
          height={10}
          rx={2}
          class={frac >= 1 ? "fw-bar-over" : "fw-bar-fill"}
        />
        <line x1={markX} y1={barY - 5} x2={markX} y2={barY + 15} class="fw-bar-mark" />
        <text x={markX} y={barY - 9} text-anchor="middle" class="sim-label">
          ω_y
        </text>
        <text x={barX - 6} y={barY + 9} text-anchor="end" class="sim-label">
          ω
        </text>
      </svg>
      <figcaption>
        <button type="button" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
          {playing ? "Pause" : "Animate"}
        </button>{" "}
        Rim speed {Number.isFinite(omega) ? (omega * R).toFixed(1) : "—"} m/s at{" "}
        {Number.isFinite(rpm) ? rpm.toFixed(0) : "—"} rpm; rotation shown far slower than true
        speed. Shading: hoop-stress field, peak at the centre.
        {danger ? " Shown red: the centre is past first yield." : ""}
      </figcaption>
    </figure>
  );
}
