/**
 * Thick-walled cylinder: cross-section drawn to the true radius ratio k
 * (outer radius fills the frame, so the wall you see IS the k you dialed).
 * Hoop-stress field σ_θ(r) shaded as concentric bands (shared StressBands
 * implementation) — the 1/r² decay is the visible lesson: the metal near
 * the bore works, the outside loafs. Bands heat toward first yield and turn
 * red past it. The engine's `invalid` verdict is the authoritative refusal
 * signal; when the design configuration diverges (no finite wall), the
 * figure refuses along with the readouts instead of drawing a lie
 * (invariant 5).
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";
import { StressBands } from "./StressBands";

export function CylinderSim({ values, invalid = false }: { values: VarRecord; invalid?: boolean }) {
  // no destructuring defaults: drawing a healthy default wall over a refused
  // state is exactly what invariant 5 forbids
  const r_i = values.r_i ?? NaN;
  const r_o = values.r_o ?? NaN;
  const t = values.t ?? NaN;
  const SF = values.SF ?? Infinity;

  const geometryOk =
    !invalid && Number.isFinite(r_i) && Number.isFinite(r_o) && r_o > r_i && r_i > 0;
  const W = 320;
  const H = 210;
  const cx = W / 2;
  const cy = H / 2;

  if (!geometryOk) {
    return (
      <SimRefusal
        ariaLabel="Thick-walled cylinder diagram (undefined)"
        label="no finite wall"
        caption="The required outer radius diverges here — there is nothing honest to draw."
        height={H}
      />
    );
  }

  const k = r_o / r_i;
  const rOutVis = 88;
  const rInVis = rOutVis / k;
  const danger = Number.isFinite(SF) && SF < 1;

  // hoop field σ_θ(r) = A + B/r², normalized to its bore value
  const delta = r_o * r_o - r_i * r_i;
  const A = (r_i * r_i) / delta; // per unit p — only ratios matter here
  const B = (r_i * r_i * r_o * r_o) / delta;
  const sigmaBore = A + B / (r_i * r_i);
  const hoopProfile = (f: number) => {
    const rb = r_i + f * (r_o - r_i);
    return (A + B / (rb * rb)) / sigmaBore;
  };

  // pressure arrows pushing outward on the bore
  const arrows = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  const aIn = rInVis * 0.45;
  const aOut = rInVis * 0.82;

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Thick-walled cylinder cross-section" width="100%">
        <title>Pressurized thick-walled cylinder cross-section</title>
        <desc>
          An annular wall drawn to the true radius ratio. Concentric shading shows the hoop
          stress concentrating at the bore and decaying outward as one over r squared; it turns
          red past first yield. Arrows show the internal pressure on the bore.
        </desc>
        <StressBands cx={cx} cy={cy} rInner={rInVis} rOuter={rOutVis} profile={hoopProfile} SF={SF} />
        <circle cx={cx} cy={cy} r={rOutVis} class="sim-outline" />
        <circle cx={cx} cy={cy} r={rInVis} class="sim-outline" />
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
        <text x={cx} y={cy + 4} text-anchor="middle" class="sim-label">
          p
        </text>
      </svg>
      <figcaption>
        Drawn to the true ratio k = {Number.isFinite(k) ? k.toFixed(2) : "—"} (wall{" "}
        {Number.isFinite(t) ? toDisplay(t, "mm").toFixed(1) : "—"} mm). Shading: hoop stress,
        peak at the bore, decaying as 1/r².
        {danger ? " Shown red: the bore is past first yield." : ""}
      </figcaption>
    </figure>
  );
}
