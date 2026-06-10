/**
 * Rotating disk with a central bore: face view with the annulus hoop-stress
 * field σ_θ(r) shaded as concentric bands — hottest at the BORE edge (the
 * solid flywheel's inversion: its peak sat at the centre that no longer
 * exists), fading toward the free rim, red past first yield. The bar places
 * ω against the yield-onset speed ω_y. Shares useSimClock + StressBands with
 * the flywheel (invariant 4), and obeys the engine's refusal verdicts.
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";
import { StressBands } from "./StressBands";
import { useSimClock } from "./useSimClock";

export function DiskBoreSim({ values, invalid = false }: { values: VarRecord; invalid?: boolean }) {
  // no destructuring defaults for load-bearing values (invariant 5)
  const R = values.R ?? NaN;
  const a = values.a ?? NaN;
  const omega = values.omega ?? NaN;
  const omega_y = values.omega_y ?? NaN;
  const SF = values.SF ?? Infinity;
  const f_bore = values.f_bore ?? NaN;
  const nu = values.nu ?? 0.3; // cosmetic only (band shape)
  const refused =
    invalid || !Number.isFinite(R) || !Number.isFinite(a) || !Number.isFinite(omega) || R <= 0;
  const { t, playing, setPlaying } = useSimClock(!refused);

  const visOmega = Number.isFinite(omega) ? 1.6 * (Math.log10(1 + omega) / Math.log10(301)) : 0;
  const th = t * visOmega;

  const W = 320;
  const cx = W / 2;
  const cy = 102;

  // after the hooks (rules of hooks): refuse to draw a refused state
  if (refused) {
    return <SimRefusal ariaLabel="Bored rotating disk diagram (undefined state)" />;
  }
  const rVis = Math.min(30 + 160 * R, 92);
  const boreVis = Math.max(4, rVis * (a / R)); // bore drawn to radius-ratio scale
  const danger = Number.isFinite(SF) && SF < 1;

  // σ_θ across the annulus, normalized to its bore-edge peak: the band
  // profile takes f ∈ [0,1] across [rInner, rOuter] → radius ratio x = r/R
  const ratio = a / R;
  const sigmaT = (x: number) =>
    (3 + nu) * (1 + ratio * ratio + (ratio * ratio) / (x * x)) - (1 + 3 * nu) * x * x;
  const peak = sigmaT(ratio);
  const profile = (f: number) => sigmaT(ratio + f * (1 - ratio)) / peak;

  const ticks = Array.from({ length: 8 }, (_, i) => th + (i * Math.PI) / 4);

  const barX = 40;
  const barWidth = 240;
  const barY = 212;
  const frac = Number.isFinite(omega_y) && omega_y > 0 ? omega / omega_y : 0;
  const fillW = barWidth * (Math.min(frac, 1.25) / 1.25);
  const markX = barX + barWidth / 1.25;
  const rpm = toDisplay(omega, "rpm");

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} 240`} role="img" aria-label="Bored rotating disk diagram" width="100%">
        <title>Annular disk spinning, with its hoop-stress field peaking at the bore</title>
        <desc>
          A disk face with a central hole, shaded in concentric bands: the hoop-stress field now
          peaks at the bore edge and falls toward the free rim. The shading turns red past first
          yield. A bar below compares the spin speed to the yield-onset speed.
        </desc>
        <StressBands cx={cx} cy={cy} rInner={boreVis} rOuter={rVis} profile={profile} SF={SF} />
        <circle cx={cx} cy={cy} r={rVis} class="sim-outline" />
        {/* the bore: a free surface, drawn open */}
        <circle cx={cx} cy={cy} r={boreVis} class="disk-bore" />
        {ticks.map((angle, i) => (
          <line
            x1={cx + 0.9 * rVis * Math.cos(angle)}
            y1={cy + 0.9 * rVis * Math.sin(angle)}
            x2={cx + rVis * Math.cos(angle)}
            y2={cy + rVis * Math.sin(angle)}
            class="fw-tick"
            key={i}
          />
        ))}
        <line
          x1={cx + boreVis * Math.cos(th)}
          y1={cy + boreVis * Math.sin(th)}
          x2={cx + rVis * Math.cos(th)}
          y2={cy + rVis * Math.sin(th)}
          class="fw-scribe"
        />

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
        speed. Shading: hoop-stress field — hottest at the bore edge, carrying{" "}
        {Number.isFinite(f_bore) ? f_bore.toFixed(2) : "—"}× the solid disk's peak.
        {danger ? " Shown red: the bore edge is past first yield." : ""}
      </figcaption>
    </figure>
  );
}
