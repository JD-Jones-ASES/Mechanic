/**
 * Thick-walled cylinder: cross-section drawn to the true radius ratio k
 * (outer radius fills the frame, so the wall you see IS the k you dialed).
 * Hoop-stress field σ_θ(r) shaded as concentric bands — the 1/r² decay is
 * the visible lesson: the metal near the bore works, the outside loafs.
 * Bands heat toward first yield and turn red past it. When the design
 * configuration diverges (no finite wall), the figure refuses along with
 * the readouts instead of drawing a lie (invariant 5).
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";

export function CylinderSim({ values, invalid = false }: { values: VarRecord; invalid?: boolean }) {
  // The engine's `invalid` verdict is the authoritative refusal signal — a
  // refusal can leave values omitted, present-as-NaN, or fully finite (a
  // validity predicate over good numbers). No destructuring defaults either:
  // drawing a healthy default wall over a refused state is exactly what
  // invariant 5 forbids.
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
      <figure class="sim">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Thick-walled cylinder diagram" width="100%">
          <title>Thick-walled cylinder cross-section (undefined)</title>
          <desc>The requested wall geometry does not exist; no cross-section can be drawn.</desc>
          <circle cx={cx} cy={cy} r={88} class="beam-ghost" fill="none" />
          <text x={cx} y={cy + 4} text-anchor="middle" class="sim-label">
            no finite wall
          </text>
        </svg>
        <figcaption>
          The required outer radius diverges here — there is nothing honest to draw.
        </figcaption>
      </figure>
    );
  }

  const k = r_o / r_i;
  const rOutVis = 88;
  const rInVis = rOutVis / k;
  const danger = Number.isFinite(SF) && SF < 1;

  // hoop field σ_θ(r) = A + B/r², normalized to its bore value; bands heat as SF → 1
  const delta = r_o * r_o - r_i * r_i;
  const A = (r_i * r_i) / delta; // per unit p — only ratios matter here
  const B = (r_i * r_i * r_o * r_o) / delta;
  const sigmaBore = A + B / (r_i * r_i);
  const heat = 0.25 + 0.65 * Math.min(1, Number.isFinite(SF) && SF > 0 ? 1 / SF : 0);
  const N_BANDS = 6;
  const bandWallW = (rOutVis - rInVis) / N_BANDS;
  const bands = Array.from({ length: N_BANDS }, (_, i) => {
    const rb = r_i + ((i + 0.5) / N_BANDS) * (r_o - r_i);
    const s = (A + B / (rb * rb)) / sigmaBore;
    return { r: rInVis + (i + 0.5) * bandWallW, alpha: Math.max(0, Math.min(1, s * heat)) };
  });

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
        {bands.map((b) => (
          <circle
            cx={cx}
            cy={cy}
            r={b.r}
            class={danger ? "fw-stress-hot" : "fw-stress"}
            stroke-width={bandWallW}
            stroke-opacity={b.alpha}
            key={b.r}
          />
        ))}
        <circle cx={cx} cy={cy} r={rOutVis} class="fw-rim" />
        <circle cx={cx} cy={cy} r={rInVis} class="fw-rim" />
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
