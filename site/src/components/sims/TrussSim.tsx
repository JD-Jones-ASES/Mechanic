/**
 * Symmetric two-bar truss: two pin-jointed members meeting at a loaded joint,
 * each at angle α FROM THE VERTICAL (a dashed vertical reference and an α arc
 * make the convention explicit — from-horizontal would swap every cos/sin). The
 * loading-sense selector `mode` redraws the frame: compression (s = 1) is an
 * A-frame pressed down on its apex, tension (s = 0) a hanging V pulled down at
 * its joint. Driving α toward 90° flattens the frame while the force and the
 * (exaggerated) joint deflection blow up — then the engine's α ≥ 90° refusal
 * lands. In compression a slight buckle bow grows as the buckling margin shrinks;
 * that bow and the buckling readouts obey the engine's scoped verdicts — they are
 * withheld in tension (a tension member cannot buckle) and below λ_T (Johnson
 * regime), never re-decided here (invariant 4/5).
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";
import { clamp } from "./simMath";

export function TrussSim({
  values,
  invalid = false,
  invalidVars = [],
}: {
  values: VarRecord;
  invalid?: boolean;
  invalidVars?: string[];
}) {
  // no destructuring defaults for load-bearing values (invariant 5): a confident
  // default figure drawn over a refused state is what the contract forbids
  const mode = values.mode ?? 1; // 1 compression (default), 0 tension
  const alpha = values.alpha ?? NaN;
  const L = values.L ?? NaN;
  const delta = values.delta ?? NaN;
  const F_m = values.F_m ?? NaN;
  const N_m = values.N_m ?? NaN;
  const SF_y = values.SF_y ?? NaN;
  const SF_buck = values.SF_buck ?? NaN;

  const compression = mode >= 0.5;
  // the engine's scoped verdict is authoritative: buckling is refused in tension
  // and below λ_T. Never infer "does it buckle?" from raw values.
  const buckRefused = invalidVars.includes("SF_buck") || invalidVars.includes("P_cr");
  const buckActive = compression && !buckRefused && Number.isFinite(SF_buck) && SF_buck > 0;
  // governing margin: yield always; buckling too when it is an active check
  const SF_gov = buckActive ? Math.min(SF_y, SF_buck) : SF_y;

  const refused =
    invalid ||
    ![alpha, L, delta, F_m, SF_y].every(Number.isFinite) ||
    alpha <= 0 ||
    alpha >= Math.PI / 2; // α ≥ 90° degenerates — the engine refuses it globally
  if (refused) {
    return <SimRefusal ariaLabel="Two-bar truss diagram (undefined state)" height={300} />;
  }

  const W = 380;
  const H = 300;
  const cx = W / 2;
  const Lv = 150; // visual member length in px
  const sinA = Math.sin(alpha);
  const cosA = Math.cos(alpha);

  // joint (where the load applies) and the two fixed anchors; the α knob swings
  // the anchors — as α → 90° the members flatten toward horizontal
  const apexY = compression ? 74 : H - 70;
  const anchorY = compression ? apexY + Lv * cosA : apexY - Lv * cosA;
  const J = { x: cx, y: apexY };
  const aL = { x: cx - Lv * sinA, y: anchorY };
  const aR = { x: cx + Lv * sinA, y: anchorY };

  // exaggerated joint deflection (down under the load); δ/L is tiny, so scale it
  // up for visibility and cap near the small-displacement warn boundary
  const ratio = L > 0 && Number.isFinite(delta) ? delta / L : 0;
  const visDefl = clamp(ratio * 60000, 3, 46);
  const Jd = { x: J.x, y: J.y + visDefl };

  // buckle-bow amplitude (compression, active only): grows as SF_buck → 1
  const bowAmp = buckActive ? clamp(9 / SF_buck, 0, 16) : 0;
  const govHot = Number.isFinite(SF_gov) && SF_gov < 1;
  const memberClass = govHot
    ? "truss-member-hot"
    : compression
      ? "truss-member-comp"
      : "truss-member";

  // a member from anchor A to the deformed joint, optionally bowed sideways
  // (sign gives the bow direction so the two members bow apart)
  const memberPath = (a: { x: number; y: number }, sign: number): string => {
    const dx = Jd.x - a.x;
    const dy = Jd.y - a.y;
    if (bowAmp <= 0.05) return `M ${a.x} ${a.y} L ${Jd.x} ${Jd.y}`;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * sign;
    const ny = (dx / len) * sign;
    const pts: string[] = [];
    for (let i = 0; i <= 18; i++) {
      const s = i / 18;
      const off = bowAmp * Math.sin(Math.PI * s);
      pts.push(`${a.x + dx * s + nx * off},${a.y + dy * s + ny * off}`);
    }
    return "M " + pts.join(" L ");
  };

  // pin-support glyph at an anchor: a small triangle + a ground tick
  const support = (a: { x: number; y: number }, key: string) => (
    <g key={key}>
      <path
        d={`M ${a.x} ${a.y} L ${a.x - 8} ${a.y + (compression ? 12 : -12)} L ${a.x + 8} ${a.y + (compression ? 12 : -12)} Z`}
        class="truss-anchor"
      />
    </g>
  );

  // angle-from-vertical indicator at the joint: a dashed vertical reference and a
  // short arc to the right member
  const vRefLen = 40;
  const vRefY = compression ? J.y + vRefLen : J.y - vRefLen;
  const arcR = 26;
  const vEnd = compression ? { x: J.x, y: J.y + arcR } : { x: J.x, y: J.y - arcR };
  const mEnd = compression
    ? { x: J.x + arcR * sinA, y: J.y + arcR * cosA }
    : { x: J.x + arcR * sinA, y: J.y - arcR * cosA };
  const arcPath = `M ${vEnd.x} ${vEnd.y} A ${arcR} ${arcR} 0 0 ${compression ? 0 : 1} ${mEnd.x} ${mEnd.y}`;

  const kN = (v: number) => (Number.isFinite(v) ? toDisplay(v, "kN").toFixed(1) : "—");
  const senseWord = compression ? "compression" : "tension";
  const govWord = buckActive && SF_buck < SF_y ? "buckling" : "yield";

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Two-bar truss diagram" width="100%">
        <title>Symmetric two-bar truss with a load at the joint</title>
        <desc>
          Two pin-jointed members, each at angle alpha from the vertical, meet at a loaded joint. In
          compression they form an A-frame pressed on its apex; in tension a hanging V pulled at its
          joint. A dashed vertical line and an arc mark alpha from the vertical. The undeformed
          members are dashed; the solid members run to the exaggerated deflected joint. In
          compression a buckle bow grows as the buckling margin shrinks, and the members turn red
          when the governing capacity is exceeded.
        </desc>

        {/* undeformed reference members (dashed) */}
        <line x1={aL.x} y1={aL.y} x2={J.x} y2={J.y} class="beam-ghost" />
        <line x1={aR.x} y1={aR.y} x2={J.x} y2={J.y} class="beam-ghost" />

        {/* angle-from-vertical reference + arc */}
        <line x1={J.x} y1={J.y} x2={J.x} y2={vRefY} class="truss-vref" />
        <path d={arcPath} class="truss-vref" fill="none" />
        <text
          x={J.x + 12}
          y={compression ? J.y + arcR + 4 : J.y - arcR - 2}
          class="sim-label"
        >
          α
        </text>

        {/* supports */}
        {support(aL, "sL")}
        {support(aR, "sR")}

        {/* deformed members (solid, coloured by sense / heat) */}
        <path d={memberPath(aL, -1)} class={memberClass} fill="none" />
        <path d={memberPath(aR, +1)} class={memberClass} fill="none" />

        {/* joint */}
        <circle cx={Jd.x} cy={Jd.y} r={4.5} class="truss-joint" />

        {/* load arrow (always downward P) */}
        {compression ? (
          <>
            <line x1={Jd.x} y1={Jd.y - 44} x2={Jd.x} y2={Jd.y - 8} class="load-arrow" />
            <path
              d={`M ${Jd.x - 5} ${Jd.y - 16} L ${Jd.x} ${Jd.y - 6} L ${Jd.x + 5} ${Jd.y - 16} Z`}
              class="load-arrow-head"
            />
            <text x={Jd.x + 9} y={Jd.y - 30} class="sim-label">
              P
            </text>
          </>
        ) : (
          <>
            <line x1={Jd.x} y1={Jd.y + 8} x2={Jd.x} y2={Jd.y + 44} class="load-arrow" />
            <path
              d={`M ${Jd.x - 5} ${Jd.y + 34} L ${Jd.x} ${Jd.y + 44} L ${Jd.x + 5} ${Jd.y + 34} Z`}
              class="load-arrow-head"
            />
            <text x={Jd.x + 9} y={Jd.y + 30} class="sim-label">
              P
            </text>
          </>
        )}
      </svg>
      <figcaption>
        Member force N_m = {kN(N_m)} kN ({senseWord}); {govWord} governs, safety factor{" "}
        {Number.isFinite(SF_gov) ? SF_gov.toPrecision(3) : "—"}. α is measured from the vertical;
        deflection shown exaggerated for visibility.
        {compression && buckRefused
          ? " Buckling readouts withheld (short column — see the Euler Column page)."
          : ""}
        {!compression ? " Tension members do not buckle — switch to compression for the Euler check." : ""}
        {govHot ? " Members shown red: the load exceeds the governing capacity." : ""}
      </figcaption>
    </figure>
  );
}
