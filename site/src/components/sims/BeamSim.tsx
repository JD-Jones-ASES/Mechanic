/**
 * Cantilever beam (end load): wall, deflected elastic curve
 * v(x) = P·x²(3L − x)/(6EI), load arrow, stress shading via safety factor.
 * Deflection is exaggerated to be visible — the caption says so explicitly
 * (never silently mislead; invariant 5).
 */
import type { VarRecord } from "../../engines/types";

export function BeamSim({ values }: { values: VarRecord }) {
  const { L = 1, delta = 0, SF = Infinity } = values;
  const W = 320;
  const H = 150;
  const x0 = 30;
  const beamLen = W - x0 - 30;
  const y0 = 55;

  // exaggerate so max knob deflection reads clearly, but keep the real ratio visible
  const deltaFrac = Number.isFinite(delta) && L > 0 ? delta / L : 0;
  const visTip = Math.min(deltaFrac * 5, 0.55) * 80;

  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const s = i / 40; // x/L
    const v = (s * s * (3 - s)) / 2; // shape: v(x)/δ_tip
    pts.push(`${x0 + s * beamLen},${y0 + v * visTip}`);
  }
  const danger = Number.isFinite(SF) && SF < 1;
  const tipY = y0 + visTip;

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Cantilever beam diagram" width="100%">
        <title>Cantilever beam with end load</title>
        <desc>
          A beam fixed to a wall at the left, bending under a tip load. Deflection drawn
          exaggerated; the beam turns red when stress exceeds yield.
        </desc>
        <rect x={x0 - 14} y={y0 - 45} width="14" height="90" class="beam-wall" />
        <polyline points={pts.join(" ")} class={danger ? "beam-line beam-yielding" : "beam-line"} fill="none" />
        {/* load arrow at the tip */}
        <line x1={W - 30} y1={tipY - 38} x2={W - 30} y2={tipY - 8} class="load-arrow" />
        <path d={`M ${W - 35} ${tipY - 14} L ${W - 30} ${tipY - 4} L ${W - 25} ${tipY - 14} Z`} class="load-arrow-head" />
        <text x={W - 44} y={tipY - 44} class="sim-label">
          P
        </text>
        {/* undeflected reference */}
        <line x1={x0} y1={y0} x2={x0 + beamLen} y2={y0} class="beam-ghost" />
      </svg>
      <figcaption>
        Deflection exaggerated for visibility (true δ/L ≈ {Number.isFinite(deltaFrac) ? deltaFrac.toExponential(2) : "—"}).
        {danger ? " Beam shown red: bending stress exceeds yield — the linear-elastic model no longer applies." : ""}
      </figcaption>
    </figure>
  );
}
