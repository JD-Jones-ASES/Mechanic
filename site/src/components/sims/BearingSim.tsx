/**
 * Rolling-contact bearing: a face-on schematic of a deep-groove bearing (outer
 * race, inner race, a ring of rolling elements in a cage) turning at a watchable
 * image of the operating speed, beside two log-scaled life bars — the rated life
 * L₁₀ and the reliability-adjusted life L_R. The log scale makes the load–life
 * power law legible: halve the load and the ball-bearing bar grows a full 8×.
 *
 * The engine's verdicts are the only authoritative refusal signals. `invalid`
 * (global) refuses the whole figure; `invalidVars` (scoped) refuses ONLY the
 * reliability-adjusted bar when the reliability goal falls below the cited 0.90
 * domain — the rated bar and the bearing still stand (invariant 5). Nothing here
 * is integrated: the spin is the shared clock playing back the already-solved ω.
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";
import { clamp } from "./simMath";
import { useSimClock } from "./useSimClock";

const NBALLS = 9;

export function BearingSim({
  values,
  invalid = false,
  invalidVars = [],
}: {
  values: VarRecord;
  invalid?: boolean;
  invalidVars?: string[];
}) {
  // no destructuring defaults on load-bearing values: a confident default figure
  // drawn over a refused state is exactly what invariant 5 forbids
  const omega = values.omega ?? NaN;
  const P = values.P ?? NaN;
  const C0 = values.C0 ?? NaN;
  const a = values.a ?? NaN;
  const L10 = values.L10 ?? NaN;
  const t_10 = values.t_10 ?? NaN;
  const L_R = values.L_R ?? NaN;
  const t_R = values.t_R ?? NaN;
  const R = values.R ?? NaN;

  const refused =
    invalid || ![omega, P, C0, a, L10, t_10].every(Number.isFinite) || L10 <= 0;

  // spin the cage at a compressed, monotonic image of ω (≈126 rad/s default) so
  // the elements are watchable; nothing is integrated
  const { t, playing, setPlaying } = useSimClock(!refused);
  const visOmega = clamp((Number.isFinite(omega) ? omega : 0) * (2.4 / 126), 0.3, 7);
  const rot = visOmega * t;

  if (refused) {
    return <SimRefusal ariaLabel="Rolling-contact bearing diagram (undefined state)" height={240} />;
  }

  // scoped refusal: below R = 0.90 the reliability-adjusted life is off the cited
  // Weibull domain — withhold that bar, keep the rated one
  const relRefused = invalidVars.includes("x_R") || invalidVars.includes("L_R");
  // static overload: past C₀ the elements brinell (the warn envelope)
  const brinelled = Number.isFinite(P) && Number.isFinite(C0) && P > C0;
  const isRoller = Number.isFinite(a) && a > 3.0001; // a = 10/3 for rollers

  const W = 470;
  const H = 240;

  /* ---- left: the bearing, face on ---- */
  const cx = 118;
  const cy = 120;
  const Ro = 84; // outer race outer radius
  const raceT = 12; // race ring thickness
  const rPitch = Ro - raceT - 15; // pitch radius (ball centers)
  const rBall = 12;
  const rShaft = rPitch - rBall - 8;

  const balls = [];
  for (let i = 0; i < NBALLS; i++) {
    const ang = rot + (i * 2 * Math.PI) / NBALLS;
    balls.push({
      x: cx + rPitch * Math.cos(ang),
      y: cy + rPitch * Math.sin(ang),
      lead: i === 0, // one marked element so the spin is visible
    });
  }

  /* ---- right: two log-scaled life bars ---- */
  // length ∝ log10(life in Mrev): each decade is a fixed width, so an 8× life
  // change (three doublings of load for a ball bearing) is a clear, readable shift
  const barX = 250;
  const barW = 196;
  const l10M = toDisplay(L10, "Mrev");
  const lRM = Number.isFinite(L_R) ? toDisplay(L_R, "Mrev") : NaN;
  const DECADE = 26; // px per decade
  const barLen = (mrev: number) =>
    clamp(Number.isFinite(mrev) && mrev > 0 ? 10 + DECADE * Math.log10(mrev) : 0, 0, barW);
  const yRated = 92;
  const yRel = 150;
  const barH = 26;
  const hrs = (s: number) => (Number.isFinite(s) ? toDisplay(s, "h") : NaN);

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Rolling-contact bearing and its life bars" width="100%">
        <title>A rolling-contact bearing turning, beside bars for its rated and reliability-adjusted life</title>
        <desc>
          Left: a deep-groove bearing seen face on — an outer race, an inner race turning with the
          shaft, and a ring of rolling elements between them. Right: two horizontal bars on a
          logarithmic scale, the rated life L₁₀ and the life at the chosen reliability L_R; the
          reliability bar is withheld when the reliability goal is below the cited 0.90 domain.
        </desc>

        {/* outer race */}
        <circle cx={cx} cy={cy} r={Ro} class="bear-race" />
        <circle cx={cx} cy={cy} r={Ro - raceT} class="bear-race" />
        {/* inner race + shaft */}
        <circle cx={cx} cy={cy} r={rShaft + 8} class="bear-race" />
        <circle cx={cx} cy={cy} r={rShaft} class="bear-shaft" />
        {/* a keyway mark on the shaft so its rotation reads */}
        <rect
          x={cx - 3}
          y={cy - rShaft}
          width={6}
          height={9}
          class="bear-key"
          transform={`rotate(${(rot * 180) / Math.PI} ${cx} ${cy})`}
        />
        {/* cage: dashed pitch circle */}
        <circle cx={cx} cy={cy} r={rPitch} class="bear-cage" />
        {/* rolling elements */}
        {balls.map((b) => (
          <circle
            cx={b.x}
            cy={b.y}
            r={rBall}
            class={brinelled ? "bear-ball-hot" : b.lead ? "bear-ball-lead" : "bear-ball"}
          />
        ))}
        <text x={cx} y={cy + Ro + 20} text-anchor="middle" class="sim-label-small">
          {isRoller ? "roller bearing (a = 10/3)" : "ball bearing (a = 3)"}
          {brinelled ? " · P > C₀: brinelling" : ""}
        </text>

        {/* right: life bars */}
        <text x={barX} y={yRated - 16} class="sim-label">
          rated life L₁₀ (R = 0.90)
        </text>
        <rect x={barX} y={yRated} width={barW} height={barH} class="bear-life-track" />
        <rect x={barX} y={yRated} width={barLen(l10M)} height={barH} class="bear-life-rated" />
        <text x={barX + 4} y={yRated + barH + 13} class="sim-label-small">
          {Number.isFinite(l10M) ? `${l10M.toPrecision(3)} Mrev` : "—"}
          {Number.isFinite(hrs(t_10)) ? ` · ${Math.round(hrs(t_10)).toLocaleString()} h` : ""}
        </text>

        <text x={barX} y={yRel - 16} class="sim-label">
          life at R = {Number.isFinite(R) ? R.toFixed(2) : "—"}
        </text>
        <rect x={barX} y={yRel} width={barW} height={barH} class="bear-life-track" />
        {relRefused ? (
          <text x={barX + 8} y={yRel + 17} class="sim-label-small">
            refused — R below 0.90 (see banner)
          </text>
        ) : (
          <>
            <rect x={barX} y={yRel} width={barLen(lRM)} height={barH} class="bear-life-rel" />
            <text x={barX + 4} y={yRel + barH + 13} class="sim-label-small">
              {Number.isFinite(lRM) ? `${lRM.toPrecision(3)} Mrev` : "—"}
              {Number.isFinite(hrs(t_R)) ? ` · ${Math.round(hrs(t_R)).toLocaleString()} h` : ""}
            </text>
          </>
        )}
        {/* decade gridline hint */}
        <text x={barX} y={H - 6} class="sim-label-small">
          bars are log scale — one decade ≈ {DECADE}px; halving P grows the ball bar 8×
        </text>
      </svg>
      <figcaption>
        <button type="button" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
          {playing ? "Pause" : "Animate"}
        </button>{" "}
        Rated life L₁₀ ≈ {Number.isFinite(l10M) ? l10M.toPrecision(3) : "—"} Mrev
        ({Number.isFinite(hrs(t_10)) ? Math.round(hrs(t_10)).toLocaleString() : "—"} h at{" "}
        {Number.isFinite(omega) ? Math.round(toDisplay(omega, "rpm")) : "—"} rpm).{" "}
        {relRefused ? (
          <>The reliability-adjusted life is refused below R = 0.90 — the rated life stands.</>
        ) : (
          <>
            At R = {Number.isFinite(R) ? R.toFixed(2) : "—"} the usable life is{" "}
            {Number.isFinite(lRM) ? lRM.toPrecision(3) : "—"} Mrev — reliability is bought with life.
          </>
        )}
        {brinelled ? " Past the static rating C₀ the elements brinell — a different failure." : ""} The spin is played back, not integrated.
      </figcaption>
    </figure>
  );
}
