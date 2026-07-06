/**
 * Axial disk clutch: a face-on view of the friction annulus (left, slowly
 * spinning to suggest slip) beside the two contact-pressure profiles that give
 * the two torque predictions (right) — a flat line for the UNIFORM-PRESSURE
 * model (new, rigid clutch) and a 1/r curve peaking at the inner edge for the
 * UNIFORM-WEAR model (run-in clutch). Both enclose the same axial force, so they
 * cross; the wear curve's peak is p_max, checked against the allowable line. The
 * torque-optimal bore r_i* = r_o/√3 is marked on the annulus.
 *
 * Presents both models side by side and picks no winner (the combined-shaft
 * pattern). The engine's `invalid` verdict is the only refusal signal — the whole
 * figure is withheld when the annulus does not exist (r_i ≥ r_o); nothing here is
 * integrated, the spin is the shared clock playing back ω_slip.
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";
import { clamp } from "./simMath";
import { useSimClock } from "./useSimClock";

export function ClutchSim({
  values,
  invalid = false,
}: {
  values: VarRecord;
  invalid?: boolean;
}) {
  // no destructuring defaults on load-bearing values (invariant 5)
  const r_i = values.r_i ?? NaN;
  const r_o = values.r_o ?? NaN;
  const F = values.F ?? NaN;
  const p_max = values.p_max ?? NaN;
  const p_allow = values.p_allow ?? NaN;
  const T_up = values.T_up ?? NaN;
  const T_uw = values.T_uw ?? NaN;
  const r_i_opt = values.r_i_opt ?? NaN;
  const omega_slip = values.omega_slip ?? NaN;

  const refused =
    invalid || ![r_i, r_o, F, p_max, T_up, T_uw].every(Number.isFinite) || r_i >= r_o || r_i <= 0;

  // spin the annulus at a compressed image of the slip speed (nothing integrated)
  const { t, playing, setPlaying } = useSimClock(!refused);
  const visOmega = clamp((Number.isFinite(omega_slip) ? omega_slip : 0) * (1.5 / 100), 0.25, 5);
  const spin = (visOmega * t * 180) / Math.PI;

  if (refused) {
    return <SimRefusal ariaLabel="Disk-clutch diagram (annulus does not exist)" height={250} caption="r_i ≥ r_o: the friction annulus does not exist — nothing honest to draw." />;
  }

  const overload = Number.isFinite(p_allow) && p_max > p_allow;
  const W = 470;
  const H = 250;

  /* ---- left: the friction annulus, face on ---- */
  const cx = 112;
  const cy = 116;
  const R = 84; // outer radius in px
  const scale = R / r_o;
  const rInPx = r_i * scale;
  const rOptPx = Number.isFinite(r_i_opt) ? r_i_opt * scale : NaN;
  // spokes to make the slip rotation visible
  const spokes = [0, 60, 120, 180, 240, 300].map((a) => {
    const th = ((a + spin) * Math.PI) / 180;
    return { x1: cx + rInPx * Math.cos(th), y1: cy + rInPx * Math.sin(th), x2: cx + R * Math.cos(th), y2: cy + R * Math.sin(th) };
  });

  /* ---- right: the two pressure profiles p(r) over [r_i, r_o] ---- */
  const chX = 236;
  const chW = W - chX - 20;
  const chY = 30;
  const chH = 150;
  const p_up = F / (Math.PI * (r_o * r_o - r_i * r_i)); // uniform pressure (const)
  // scale the chart to the pressure PROFILES so the flat-vs-1/r contrast stays
  // legible; p_allow enters the frame exactly when it starts to matter (near/over p_max)
  const pScale = Math.max(p_max, p_up) * 1.25;
  const rx = (r: number) => chX + (chW * (r - r_i)) / (r_o - r_i);
  const py = (p: number) => chY + chH - (chH * p) / pScale;
  const NPT = 28;
  const wearPts: string[] = [];
  for (let i = 0; i <= NPT; i++) {
    const r = r_i + ((r_o - r_i) * i) / NPT;
    wearPts.push(`${rx(r).toFixed(1)},${py((p_max * r_i) / r).toFixed(1)}`); // p = p_max·r_i/r
  }
  const yAllow = py(Number.isFinite(p_allow) ? p_allow : NaN);
  const optInRange = Number.isFinite(r_i_opt) && r_i_opt > r_i && r_i_opt < r_o;

  const nm = (v: number) => toDisplay(v, "N*m"); // toDisplay(NaN) -> NaN; call sites re-guard
  const mpa = (v: number) => toDisplay(v, "MPa");

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Disk clutch friction annulus and its two pressure profiles" width="100%">
        <title>An axial clutch friction annulus beside its uniform-pressure and uniform-wear pressure profiles</title>
        <desc>
          Left: the ring-shaped friction face of an axial clutch, seen head on, turning to suggest slip,
          with the torque-optimal inner radius marked. Right: contact pressure versus radius for the two
          classic models — a flat line for uniform pressure and a curve peaking at the inner edge for
          uniform wear — with the allowable-pressure line; the wear peak is the max lining pressure.
        </desc>

        {/* the annulus */}
        <circle cx={cx} cy={cy} r={R} class="clutch-face-o" />
        <circle cx={cx} cy={cy} r={rInPx} class="clutch-face-i" />
        {spokes.map((s) => (
          <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} class="clutch-spoke" />
        ))}
        {/* torque-optimal bore */}
        {optInRange ? <circle cx={cx} cy={cy} r={rOptPx} class="clutch-opt" /> : null}
        <text x={cx} y={cy + R + 22} text-anchor="middle" class="sim-label-small">
          friction face {optInRange ? "· dashed = r_i* (r_o/√3)" : ""}
        </text>

        {/* pressure chart */}
        <text x={chX} y={chY - 12} class="sim-label-small">
          contact pressure p(r)
        </text>
        <line x1={chX} y1={chY + chH} x2={chX + chW} y2={chY + chH} class="chart-axis" />
        <line x1={chX} y1={chY} x2={chX} y2={chY + chH} class="chart-axis" />
        {/* allowable-pressure reference */}
        {Number.isFinite(p_allow) && p_allow < pScale ? (
          <>
            <line x1={chX} y1={yAllow} x2={chX + chW} y2={yAllow} class="clutch-allow" />
            <text x={chX + chW} y={yAllow - 3} text-anchor="end" class="sim-label-small">
              p_allow
            </text>
          </>
        ) : Number.isFinite(p_allow) ? (
          <text x={chX + chW} y={chY + 9} text-anchor="end" class="sim-label-small">
            p_allow ↑ (off scale)
          </text>
        ) : null}
        {/* uniform pressure: flat */}
        <line x1={rx(r_i)} y1={py(p_up)} x2={rx(r_o)} y2={py(p_up)} class="clutch-p-up" />
        {/* uniform wear: 1/r, peaking at r_i */}
        <polyline points={wearPts.join(" ")} class={overload ? "clutch-p-uw-hot" : "clutch-p-uw"} fill="none" />
        <text x={rx(r_i) + 2} y={py(p_max) - 4} class="sim-label-small">
          p_max
        </text>
        <text x={rx(r_i) - 2} y={chY + chH + 12} text-anchor="middle" class="sim-label-small">r_i</text>
        <text x={rx(r_o)} y={chY + chH + 12} text-anchor="middle" class="sim-label-small">r_o</text>
        <text x={chX + 40} y={py(p_up) - 4} class="sim-label-small">uniform pressure</text>
        <text x={rx(r_i) + 20} y={py((p_max * r_i) / ((r_i + r_o) / 2)) + 14} class="sim-label-small">uniform wear</text>
      </svg>
      <figcaption>
        <button type="button" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
          {playing ? "Pause" : "Animate"}
        </button>{" "}
        Torque: uniform pressure {Number.isFinite(nm(T_up)) ? nm(T_up).toFixed(1) : "—"} N·m ≥ uniform
        wear {Number.isFinite(nm(T_uw)) ? nm(T_uw).toFixed(1) : "—"} N·m (design to the smaller, worn-in
        value). Peak lining pressure {Number.isFinite(mpa(p_max)) ? mpa(p_max).toFixed(3) : "—"} MPa
        {overload ? " — over the allowable (shown red): the lining overheats." : "."} The spin is played
        back, not integrated.
      </figcaption>
    </figure>
  );
}
