/**
 * Compound cylinder (shrink fit): cross-section drawn to the true radius
 * ratios with the interface dashed; each shell shaded by its own superposed
 * hoop field |σ_θ(r)| (shared StressBands), heated by its own margin — the
 * brightness JUMP at the interface is the assembly stress made visible. A bar
 * places the dialed interference δ against the balanced fit δ_bal: left of
 * the mark the bore governs, right of it the jacket. Obeys the engine's
 * verdicts: global refusals render SimRefusal, and the scoped refusal of
 * SF_bore (over-shrunk: the bore stays compressive) de-heats the liner and is
 * named in the caption instead of being painted as red danger (invariant 5 —
 * the verdict, not value-sniffing, decides).
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";
import { StressBands } from "./StressBands";

export function ShrinkFitSim({
  values,
  invalid = false,
  invalidVars = [],
}: {
  values: VarRecord;
  invalid?: boolean;
  invalidVars?: string[];
}) {
  // no destructuring defaults for load-bearing values (invariant 5)
  const r_i = values.r_i ?? NaN;
  const r_c = values.r_c ?? NaN;
  const r_o = values.r_o ?? NaN;
  const delta = values.delta ?? NaN;
  const delta_bal = values.delta_bal ?? NaN;
  const p_c = values.p_c ?? NaN;
  const p = values.p ?? NaN;
  const SF_bore = values.SF_bore ?? Infinity;
  const SF_iface = values.SF_iface ?? Infinity;

  const W = 320;
  const H = 240;
  const cx = W / 2;
  const cy = 102;

  const geometryOk =
    !invalid &&
    Number.isFinite(r_i) &&
    Number.isFinite(r_c) &&
    Number.isFinite(r_o) &&
    r_i > 0 &&
    r_c > r_i &&
    r_o > r_c;
  if (!geometryOk) {
    return (
      <SimRefusal
        ariaLabel="Compound cylinder diagram (undefined state)"
        label="no two-piece wall"
        caption="The interface must sit strictly between bore and outer radius — this state was refused, so there is nothing honest to draw."
        height={H}
      />
    );
  }

  // the engine's scoped verdict, not a sign-sniff, decides how the liner reads
  const boreRefused = invalidVars.includes("SF_bore");

  const rOutVis = 88;
  const rCVis = rOutVis * (r_c / r_o);
  const rInVis = rOutVis * (r_i / r_o);

  // superposed hoop fields per shell: working monobloc Lamé field plus each
  // member's assembly field (same constants the verified relations carry)
  const Dw = r_o * r_o - r_i * r_i;
  const Aw = (p * r_i * r_i) / Dw;
  const Bw = Aw * r_o * r_o;
  const Dl = r_c * r_c - r_i * r_i;
  const Al = (-p_c * r_c * r_c) / Dl;
  const Bl = (-p_c * r_i * r_i * r_c * r_c) / Dl;
  const Dj = r_o * r_o - r_c * r_c;
  const Aj = (p_c * r_c * r_c) / Dj;
  const Bj = (p_c * r_c * r_c * r_o * r_o) / Dj;
  const hoopLiner = (r: number) => Aw + Bw / (r * r) + Al + Bl / (r * r);
  const hoopJacket = (r: number) => Aw + Bw / (r * r) + Aj + Bj / (r * r);
  // each shell's field is monotone in r², so |σ_θ| peaks at a shell boundary
  const peak =
    Math.max(
      Math.abs(hoopLiner(r_i)),
      Math.abs(hoopLiner(r_c)),
      Math.abs(hoopJacket(r_c)),
      Math.abs(hoopJacket(r_o)),
    ) || 1;
  const linerProfile = (f: number) => Math.abs(hoopLiner(r_i + f * (r_c - r_i))) / peak;
  const jacketProfile = (f: number) => Math.abs(hoopJacket(r_c + f * (r_o - r_c))) / peak;

  // pressure arrows pushing outward on the bore (shared vocabulary with the
  // parent cylinder THING); suppressed when the bore draws too small to hold them
  const showBoreLoad = rInVis >= 12;
  const arrows = showBoreLoad ? [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2] : [];
  const aIn = rInVis * 0.45;
  const aOut = rInVis * 0.82;

  // the balance bar: δ against δ_bal on a 0…2×δ_bal scale, mark at balance
  const barX = 40;
  const barWidth = 240;
  const barY = 212;
  const frac = Number.isFinite(delta_bal) && delta_bal > 0 ? delta / delta_bal : NaN;
  const fillW = Number.isFinite(frac) ? barWidth * (Math.min(frac, 2) / 2) : 0;
  const markX = barX + barWidth / 2;

  const danger =
    (!boreRefused && Number.isFinite(SF_bore) && SF_bore < 1) ||
    (Number.isFinite(SF_iface) && SF_iface < 1);
  const governs = boreRefused
    ? "over-shrunk: the bore stays compressive — its tension margin is refused; the jacket margin governs"
    : Math.abs(SF_bore - SF_iface) <= 0.01 * Math.min(SF_bore, SF_iface)
      ? "balanced — liner and jacket margins are equal"
      : SF_bore < SF_iface
        ? "the liner bore governs (under-shrunk side)"
        : "the jacket bore governs (over-shrunk side)";

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Compound cylinder cross-section" width="100%">
        <title>Shrink-fitted compound cylinder cross-section</title>
        <desc>
          A two-piece annular wall drawn to its true radius ratios, the shrink-fit interface
          dashed. Each shell is shaded by its own superposed hoop-stress magnitude — the
          brightness jump at the interface is the assembly stress — and turns red past first
          yield. A bar below compares the dialed interference to the balanced fit.
        </desc>
        <StressBands
          cx={cx}
          cy={cy}
          rInner={rInVis}
          rOuter={rCVis}
          profile={linerProfile}
          SF={boreRefused ? Infinity : SF_bore}
        />
        <StressBands cx={cx} cy={cy} rInner={rCVis} rOuter={rOutVis} profile={jacketProfile} SF={SF_iface} />
        <circle cx={cx} cy={cy} r={rOutVis} class="sim-outline" />
        <circle cx={cx} cy={cy} r={rInVis} class="sim-outline" />
        <circle cx={cx} cy={cy} r={rCVis} class="shrink-iface" />
        {arrows.map((a, i) => (
          <g key={i}>
            <line
              x1={cx + aIn * Math.cos(a)}
              y1={cy + aIn * Math.sin(a)}
              x2={cx + aOut * Math.cos(a)}
              y2={cy + aOut * Math.sin(a)}
              class="load-arrow"
            />
            <path
              d={`M ${cx + aOut * Math.cos(a) + 5 * Math.cos(a - 2.6)} ${cy + aOut * Math.sin(a) + 5 * Math.sin(a - 2.6)}
                  L ${cx + aOut * Math.cos(a)} ${cy + aOut * Math.sin(a)}
                  L ${cx + aOut * Math.cos(a) + 5 * Math.cos(a + 2.6)} ${cy + aOut * Math.sin(a) + 5 * Math.sin(a + 2.6)}`}
              class="load-arrow"
              fill="none"
            />
          </g>
        ))}
        {showBoreLoad ? (
          <text x={cx} y={cy + 4} text-anchor="middle" class="sim-label">
            p
          </text>
        ) : null}
        <text x={cx - (rCVis + rOutVis) / 2} y={cy - 4} text-anchor="middle" class="sim-label-small">
          jacket
        </text>
        <text x={cx + (rInVis + rCVis) / 2} y={cy - 4} text-anchor="middle" class="sim-label-small">
          liner
        </text>

        <rect x={barX} y={barY} width={barWidth} height={10} rx={2} class="fw-bar-track" />
        <rect x={barX} y={barY} width={Math.max(0, fillW)} height={10} rx={2} class="fw-bar-fill" />
        <line x1={markX} y1={barY - 5} x2={markX} y2={barY + 15} class="fw-bar-mark" />
        <text x={markX} y={barY - 9} text-anchor="middle" class="sim-label">
          δ_bal
        </text>
        <text x={barX - 6} y={barY + 9} text-anchor="end" class="sim-label">
          δ
        </text>
      </svg>
      <figcaption>
        Two-piece wall to true ratios; the dashed circle is the shrink-fit interface
        (p_c {Number.isFinite(p_c) ? toDisplay(p_c, "MPa").toFixed(1) : "—"} MPa from{" "}
        {Number.isFinite(delta) ? toDisplay(delta, "um").toFixed(0) : "—"} µm against a balanced{" "}
        {Number.isFinite(delta_bal) ? toDisplay(delta_bal, "um").toFixed(0) : "—"} µm). Shading:
        each shell's |hoop| field — {governs}.
        {danger ? " Shown red: past first yield." : ""}
      </figcaption>
    </figure>
  );
}
