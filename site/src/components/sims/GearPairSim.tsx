/**
 * Spur gear pair: two pitch circles drawn to tooth-count proportions, tangent
 * at the pitch point, spun at the engine-computed speeds (gear counter-rotates,
 * slower by N_p/N_g). One tangential tooth-load vector W_t sits at the pitch
 * point; per-gear bending stress and safety factor read out below. Shares
 * useSimClock + SimRefusal (invariant 4) and obeys BOTH refusal verdicts: a
 * global `invalid` refuses the whole figure; a scoped out-of-domain tooth count
 * (Y_p / Y_g in `invalidVars`) dashes just that gear and withholds its readout,
 * while the rest of the pair still turns.
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";
import { useSimClock } from "./useSimClock";

function gearTicks(cx: number, cy: number, r: number, n: number, angle: number): string {
  const ticks: string[] = [];
  const count = Math.max(6, Math.min(60, Math.round(n)));
  for (let i = 0; i < count; i++) {
    const a = angle + (i * 2 * Math.PI) / count;
    ticks.push(
      `M ${cx + 0.86 * r * Math.cos(a)} ${cy + 0.86 * r * Math.sin(a)} L ${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`,
    );
  }
  return ticks.join(" ");
}

export function GearPairSim({
  values,
  invalid = false,
  invalidVars = [],
}: {
  values: VarRecord;
  invalid?: boolean;
  invalidVars?: string[];
}) {
  // no destructuring defaults for load-bearing values (invariant 5)
  const N_p = values.N_p ?? NaN;
  const N_g = values.N_g ?? NaN;
  const m_mod = values.m_mod ?? NaN;
  const omega_p = values.omega_p ?? 0;
  const W_t = values.W_t ?? NaN;
  const refused =
    invalid ||
    !Number.isFinite(N_p) ||
    !Number.isFinite(N_g) ||
    !Number.isFinite(m_mod) ||
    N_p <= 0 ||
    N_g <= 0;
  const { t, playing, setPlaying } = useSimClock(!refused);

  if (refused) {
    return <SimRefusal ariaLabel="Spur gear pair diagram (undefined state)" />;
  }

  // scoped refusal (tooth count off the table): dash that gear, withhold its numbers
  const pinionRefused = invalidVars.includes("Y_p") || invalidVars.includes("sigma_b_p");
  const gearRefused = invalidVars.includes("Y_g") || invalidVars.includes("sigma_b_g");

  const W = 320;
  const cy = 104;
  const s = 140 / Math.max(N_p, N_g, 1); // the larger gear fills to r ≈ 70
  const rP = (N_p / 2) * s;
  const rG = (N_g / 2) * s;
  const totalW = 2 * rP + 2 * rG;
  const startX = (W - totalW) / 2;
  const xP = startX + rP;
  const pitchX = startX + 2 * rP;
  const xG = startX + 2 * rP + rG;

  const SLOW = 0.15;
  const thP = omega_p * t * SLOW;
  const thG = -omega_p * (N_p / N_g) * t * SLOW; // external mesh: opposite sense, slower by N_p/N_g

  const fmtMPa = (v: number) => (Number.isFinite(v) ? `${(v / 1e6).toFixed(1)} MPa` : "—");
  const fmtSF = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : "—");
  const rpm = toDisplay(omega_p, "rpm");

  const gearCircle = (
    cx: number,
    r: number,
    n: number,
    th: number,
    bodyClass: string,
    isRefused: boolean,
  ) =>
    isRefused ? (
      <circle cx={cx} cy={cy} r={r} class="gear-refused-tooth" />
    ) : (
      <g>
        <circle cx={cx} cy={cy} r={r} class={bodyClass} />
        <path d={gearTicks(cx, cy, r, n, th)} class="gear-teeth" />
        <circle cx={cx} cy={cy} r={2.5} class="gear-hub" />
        <line
          x1={cx}
          y1={cy}
          x2={cx + r * Math.cos(th)}
          y2={cy + r * Math.sin(th)}
          class="fw-scribe"
        />
      </g>
    );

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} 240`} role="img" aria-label="Spur gear pair diagram" width="100%">
        <title>A pinion meshing with a larger gear, drawn to tooth-count proportions</title>
        <desc>
          Two pitch circles tangent at the pitch point, sized by tooth count and spinning at the
          computed speeds (the gear turns the other way, slower by N_p/N_g). A red arrow marks the
          transmitted tooth load W_t at the pitch point; bending stress and safety factor read out
          under each gear. A gear whose tooth count is off the table is drawn dashed with its
          numbers withheld.
        </desc>

        {/* centre line + pitch marks */}
        <line x1={xP} y1={cy} x2={xG} y2={cy} class="fw-tick" />
        {gearCircle(xP, rP, N_p, thP, "gear-sun", pinionRefused)}
        {gearCircle(xG, rG, N_g, thG, "gear-planet", gearRefused)}

        {/* transmitted tooth load W_t at the pitch point (tangent = vertical) */}
        <line x1={pitchX} y1={cy - 2} x2={pitchX} y2={cy - 40} class="gear-force" />
        <path d={`M ${pitchX} ${cy - 46} L ${pitchX - 5} ${cy - 36} L ${pitchX + 5} ${cy - 36} Z`} class="gear-force-head" />
        <text x={pitchX + 9} y={cy - 34} class="sim-label">
          W_t {Number.isFinite(W_t) ? `${(W_t / 1000).toFixed(2)} kN` : ""}
        </text>

        {/* per-gear readouts */}
        <text x={xP} y={198} text-anchor="middle" class="sim-label">
          pinion · {N_p.toFixed(0)}T
        </text>
        <text x={xP} y={214} text-anchor="middle" class="sim-label-small">
          {pinionRefused ? "off table" : `σ_b ${fmtMPa(values.sigma_b_p ?? NaN)}`}
        </text>
        <text x={xP} y={228} text-anchor="middle" class="sim-label-small">
          {pinionRefused ? "—" : `SF ${fmtSF(values.SF_p ?? NaN)}`}
        </text>
        <text x={xG} y={198} text-anchor="middle" class="sim-label">
          gear · {N_g.toFixed(0)}T
        </text>
        <text x={xG} y={214} text-anchor="middle" class="sim-label-small">
          {gearRefused ? "off table" : `σ_b ${fmtMPa(values.sigma_b_g ?? NaN)}`}
        </text>
        <text x={xG} y={228} text-anchor="middle" class="sim-label-small">
          {gearRefused ? "—" : `SF ${fmtSF(values.SF_g ?? NaN)}`}
        </text>
      </svg>
      <figcaption>
        <button type="button" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
          {playing ? "Pause" : "Animate"}
        </button>{" "}
        Drawn to tooth-count proportions; the pinion turns {Number.isFinite(rpm) ? rpm.toFixed(0) : "—"} rpm,
        the gear slower by N_p/N_g. Same load and material — the pinion (smaller Y) carries the
        higher stress.
      </figcaption>
    </figure>
  );
}
