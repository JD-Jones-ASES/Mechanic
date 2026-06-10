/**
 * Belt drive / capstan: a pulley wrapped through the TRUE contact angle, with
 * the tight and slack sides drawn at stroke weights proportional to their
 * tensions — the visible asymmetry IS e^{μθ}. The pulley spins (shared
 * useSimClock, log-compressed rate) and a bar compares the belt speed v to
 * the max-power speed v*, reusing the flywheel's bar vocabulary. The engine's
 * `invalid` verdict is the authoritative refusal signal — the speed ceiling
 * (T_c ≥ T_1) fires with every value finite, so NaN-sniffing could never
 * catch it (invariant 5).
 */
import type { VarRecord } from "../../engines/types";
import { SimRefusal } from "./SimRefusal";
import { useSimClock } from "./useSimClock";

export function BeltSim({ values, invalid = false }: { values: VarRecord; invalid?: boolean }) {
  // no destructuring defaults: drawing a healthy default drive over a refused
  // state (the speed ceiling) is exactly what invariant 5 forbids
  const T_1 = values.T_1 ?? NaN;
  const T_2 = values.T_2 ?? NaN;
  const T_c = values.T_c ?? NaN;
  const P_t = values.P_t ?? NaN;
  const v = values.v ?? NaN;
  const v_star = values.v_star ?? NaN;
  const theta_w = values.theta_w ?? NaN;

  const refused = invalid || ![T_1, T_2, theta_w, v].every(Number.isFinite) || T_1 <= 0;
  const { t, playing, setPlaying } = useSimClock(!refused);

  const W = 320;
  const H = 240;

  if (refused) {
    return (
      <SimRefusal
        ariaLabel="Belt drive diagram (refused state)"
        label="refused"
        caption="The engine refused this state — past the speed ceiling the belt's whole tension rides the circle and there is no honest drive to draw."
        height={H}
      />
    );
  }

  const cx = 108;
  const cy = 96;
  const r = 54;

  // wrap drawn at the true angle, capped just short of a full visual turn;
  // multi-turn capstans report their full wrap in the caption
  const fullTurns = Math.floor(theta_w / (2 * Math.PI));
  const thetaVis = Math.min(theta_w, 6.0);
  const a1 = Math.PI - thetaVis / 2; // slack departure (lower-left, SVG y-down)
  const a2 = Math.PI + thetaVis / 2; // tight arrival (upper-left)
  const pt = (a: number, rr: number) => [cx + rr * Math.cos(a), cy + rr * Math.sin(a)] as const;

  const [e1x, e1y] = pt(a1, r + 4);
  const [e2x, e2y] = pt(a2, r + 4);
  // tangent directions with positive x — the free spans run off to the right
  const tan = (a: number): readonly [number, number] => {
    const tx = -Math.sin(a);
    const ty = Math.cos(a);
    return tx >= 0 ? [tx, ty] : [-tx, -ty];
  };
  const [t1x, t1y] = tan(a1);
  const [t2x, t2y] = tan(a2);
  // at extreme wraps the tangents leave near-vertically: shorten each span so
  // it (and its label) stays inside the frame instead of drawing off-canvas
  const spanFor = (ex: number, ey: number, ty: number): number => {
    let s = 150;
    if (ty < -1e-6) s = Math.min(s, (ey - 14) / -ty);
    if (ty > 1e-6) s = Math.min(s, (192 - ey) / ty);
    return Math.max(34, s);
  };
  const span1 = spanFor(e1x, e1y, t1y);
  const span2 = spanFor(e2x, e2y, t2y);

  const wTight = 6;
  const wSlack = Math.max(1.5, 6 * (T_2 / T_1));
  const largeArc = thetaVis > Math.PI ? 1 : 0;

  // spin: log-compressed visual rate so 0.1–80 m/s stays readable
  const visW = 1.5 * (Math.log10(1 + v) / Math.log10(81));
  const phase = t * visW;
  const spokes = Array.from({ length: 6 }, (_, i) => phase + (i * Math.PI) / 3);

  // speed bar: v against the max-power speed v*, mark fixed at 4/5 of track
  const barX = 40;
  const barWidth = 240;
  const barY = 212;
  const frac = Number.isFinite(v_star) && v_star > 0 ? v / v_star : 0;
  const fillW = barWidth * (Math.min(frac, 1.25) / 1.25);
  const markX = barX + barWidth / 1.25;

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Belt wrapped on a spinning pulley" width="100%">
        <title>Belt drive with true wrap angle and tension-weighted sides</title>
        <desc>
          A pulley with a belt wrapped through the true contact angle. The tight side is drawn
          thick and the slack side thin in proportion to their tensions. A bar below compares
          the belt speed to the maximum-power speed.
        </desc>
        <circle cx={cx} cy={cy} r={r} class="belt-pulley" />
        {spokes.map((a, i) => (
          <line
            x1={cx + 0.25 * r * Math.cos(a)}
            y1={cy + 0.25 * r * Math.sin(a)}
            x2={cx + 0.85 * r * Math.cos(a)}
            y2={cy + 0.85 * r * Math.sin(a)}
            class="fw-tick"
            key={i}
          />
        ))}
        {/* wrap arc at true angle */}
        <path
          d={`M ${e1x} ${e1y} A ${r + 4} ${r + 4} 0 ${largeArc} 1 ${e2x} ${e2y}`}
          class="belt-wrap"
          stroke-width={wTight}
        />
        {/* slack span leaves the lower endpoint, tight span the upper */}
        <line x1={e1x} y1={e1y} x2={e1x + span1 * t1x} y2={e1y + span1 * t1y} class="belt-slack" stroke-width={wSlack} />
        <line x1={e2x} y1={e2y} x2={e2x + span2 * t2x} y2={e2y + span2 * t2y} class="belt-tight" stroke-width={wTight} />
        <text
          x={Math.min(250, e2x + 0.6 * span2 * t2x)}
          y={Math.max(14, Math.min(226, e2y + 0.6 * span2 * t2y - 8))}
          class="sim-label"
        >
          T₁ (tight)
        </text>
        <text
          x={Math.min(250, e1x + 0.6 * span1 * t1x)}
          y={Math.max(14, Math.min(226, e1y + 0.6 * span1 * t1y + 14))}
          class="sim-label"
        >
          T₂ (slack)
        </text>
        <text x={cx} y={cy - r - 8} text-anchor="middle" class="sim-label">
          θ = {((theta_w * 180) / Math.PI).toFixed(0)}°{fullTurns >= 1 ? ` (${(theta_w / (2 * Math.PI)).toFixed(1)} turns)` : ""}
        </text>

        {/* speed vs max-power-speed bar */}
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
          v*
        </text>
        <text x={barX - 6} y={barY + 9} text-anchor="end" class="sim-label">
          v
        </text>
      </svg>
      <figcaption>
        <button type="button" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
          {playing ? "Pause" : "Animate"}
        </button>{" "}
        Holding {Number.isFinite(T_1) && Number.isFinite(T_2) && T_2 > 0 ? (T_1 / T_2).toFixed(1) : "—"}× across
        the wrap; transmitting {Number.isFinite(P_t) ? (P_t / 1000).toFixed(2) : "—"} kW at{" "}
        {Number.isFinite(v) ? v.toFixed(1) : "—"} m/s. Centrifugal tension {Number.isFinite(T_c) ? T_c.toFixed(0) : "—"} N
        of {Number.isFinite(T_1) ? T_1.toFixed(0) : "—"} N allowable; rotation shown far slower than true speed.
      </figcaption>
    </figure>
  );
}
