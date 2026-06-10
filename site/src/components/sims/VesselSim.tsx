/**
 * Pressure vessel cross-section: annulus wall, radial pressure arrows, hoop
 * stress indicated along the circumference. Wall thickness is drawn to the
 * true t/r ratio but clamped to stay visible — the caption states the real
 * ratio (never silently mislead; invariant 5).
 */
import type { VarRecord } from "../../engines/types";

export function VesselSim({ values }: { values: VarRecord }) {
  const { r = 0.5, t = 0.01, SF = Infinity } = values;
  const W = 320;
  const H = 190;
  const cx = W / 2;
  const cy = H / 2 + 6;
  const Rout = 72;

  const ratio = r > 0 ? t / r : 0;
  const wallPx = Math.max(3, Math.min(ratio * Rout, Rout * 0.45));
  const Rin = Rout - wallPx;
  const danger = Number.isFinite(SF) && SF < 1;

  // radial pressure arrows from the center toward the wall
  const arrows = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 2 * Math.PI;
    const x1 = cx + Math.cos(a) * Rin * 0.35;
    const y1 = cy + Math.sin(a) * Rin * 0.35;
    const x2 = cx + Math.cos(a) * Rin * 0.8;
    const y2 = cy + Math.sin(a) * Rin * 0.8;
    const hx = cx + Math.cos(a) * Rin * 0.92;
    const hy = cy + Math.sin(a) * Rin * 0.92;
    const perp = a + Math.PI / 2;
    const s = 4;
    arrows.push(
      <g key={i}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} class="load-arrow" />
        <path
          d={`M ${x2 + Math.cos(perp) * s} ${y2 + Math.sin(perp) * s} L ${hx} ${hy} L ${x2 - Math.cos(perp) * s} ${y2 - Math.sin(perp) * s} Z`}
          class="load-arrow-head"
        />
      </g>,
    );
  }

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Pressure vessel cross-section" width="100%">
        <title>Thin-walled pressure vessel cross-section</title>
        <desc>
          A circular cross-section with internal pressure arrows pushing outward on the wall. The
          wall turns red when the hoop stress exceeds the yield strength.
        </desc>
        <circle cx={cx} cy={cy} r={Rout} class={danger ? "beam-line beam-yielding" : "beam-line"} fill="none" stroke-width={wallPx} />
        {arrows}
        <text x={cx} y={cy + 4} text-anchor="middle" class="sim-label">
          p
        </text>
      </svg>
      <figcaption>
        Wall drawn no thinner than visible (true t/r = {Number.isFinite(ratio) ? ratio.toFixed(3) : "—"}).
        {danger ? " Wall shown red: hoop stress exceeds yield — the elastic model no longer applies." : ""}
      </figcaption>
    </figure>
  );
}
