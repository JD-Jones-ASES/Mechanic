/**
 * Stepped shaft, shoulder fillet: a static longitudinal half-section — a large
 * diameter D stepping down to a small diameter d through a fillet of radius r,
 * all driven by the D/d and r/d knobs. A StressBands bloom sits on the fillet:
 * its radius grows with the concentration factor K_t and it heats toward red as
 * the peak stress approaches yield (σ_max vs σ_y). The load glyph switches with
 * the configuration (axial arrows / bending moment / torsion) via the engine's
 * `load_case` value. Static figure, no clock. Obeys BOTH refusal verdicts: a
 * global `invalid` refuses the whole figure; a scoped K_t refusal (D/d off a
 * table, or r/d past the fit range) withholds the fillet bloom and the σ_max/SF
 * readouts while the geometry keeps standing (invariants 4 and 5).
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";
import { StressBands } from "./StressBands";

export function SteppedShaftSim({
  values,
  invalid = false,
  invalidVars = [],
}: {
  values: VarRecord;
  invalid?: boolean;
  invalidVars?: string[];
}) {
  // no destructuring defaults for load-bearing values (invariant 5)
  const Dd = values.Dd ?? NaN;
  const rd = values.rd ?? NaN;
  const Kt = values.Kt ?? NaN;
  const sigmaMax = values.sigma_max ?? NaN;
  const SF = values.SF ?? NaN;
  const loadCase = values.load_case ?? 1;

  const refused = invalid || !Number.isFinite(Dd) || !Number.isFinite(rd) || Dd <= 1 || rd <= 0;
  if (refused) {
    return <SimRefusal ariaLabel="Stepped shaft fillet diagram (undefined state)" height={210} />;
  }

  // scoped refusal: K_t (and σ_max, SF) refused — D/d off the table or r/d past
  // the fit range. The shaft geometry is still honest, so keep drawing it; only
  // the fillet stress bloom and the stress readouts are withheld.
  const ktRefused = invalidVars.includes("Kt") || !Number.isFinite(Kt);

  const W = 320;
  const H = 210;
  const cy = 105;
  const x0 = 40;
  const xstep = 152;
  const xend = 280;

  // half-heights: large shaft fixed, small shaft scaled by 1/(D/d); always keep
  // at least a 2 px step so the fillet arc renders even as D/d → 1
  const hD = 48;
  const hd = Math.min(hD / Dd, hD - 2);
  const stepH = hD - hd;
  // fillet radius in px from the r/d ratio (d = 2·hd), capped by the step and frame
  const rPx = Math.max(0.5, Math.min(rd * 2 * hd, stepH * 0.85, 38));

  const yDt = cy - hD; // large top
  const yDb = cy + hD; // large bottom
  const ydt = cy - hd; // small top
  const ydb = cy + hd; // small bottom

  // closed shaft outline (top-left, across the top with the fillet, right end,
  // mirror along the bottom, left end)
  const outline = [
    `M ${x0} ${yDt}`,
    `L ${xstep} ${yDt}`,
    `L ${xstep} ${ydt - rPx}`,
    `A ${rPx} ${rPx} 0 0 1 ${xstep + rPx} ${ydt}`,
    `L ${xend} ${ydt}`,
    `L ${xend} ${ydb}`,
    `L ${xstep + rPx} ${ydb}`,
    `A ${rPx} ${rPx} 0 0 1 ${xstep} ${ydb + rPx}`,
    `L ${xstep} ${yDb}`,
    `L ${x0} ${yDb}`,
    "Z",
  ].join(" ");

  const danger = Number.isFinite(SF) && SF < 1;
  const fmtMPa = (v: number) => (Number.isFinite(v) ? `${toDisplay(v, "MPa").toFixed(0)} MPa` : "—");
  const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "—");

  // fillet bloom radius grows with K_t (a sharper concentration = a bigger, hotter spot)
  const bloomOuter = Math.min(10 + 12 * (Number.isFinite(Kt) ? Math.max(Kt - 1, 0) : 0), 34);

  // load glyph per configuration (1 axial · 2 bending · 3 torsion)
  const glyph = () => {
    if (loadCase >= 3) {
      // torsion: an arc wrapping the small-shaft end, arrowed
      const gx = xend + 6;
      return (
        <g>
          <path
            d={`M ${gx} ${cy + hd} A ${hd} ${hd} 0 1 1 ${gx} ${cy - hd}`}
            class="load-arrow"
            fill="none"
          />
          <path d={`M ${gx - 5} ${cy - hd + 2} L ${gx} ${cy - hd - 5} L ${gx + 6} ${cy - hd + 2} Z`} class="load-arrow-head" />
          <text x={gx + 6} y={cy + 4} class="sim-label">T</text>
        </g>
      );
    }
    if (loadCase >= 2) {
      // bending: a curved moment arrow over the right end
      return (
        <g>
          <path d={`M ${xend - 20} ${yDt - 14} A 34 34 0 0 1 ${xend + 16} ${cy - 6}`} class="load-arrow" fill="none" />
          <path d={`M ${xend + 12} ${cy - 14} L ${xend + 18} ${cy - 3} L ${xend + 7} ${cy - 2} Z`} class="load-arrow-head" />
          <text x={xend - 2} y={yDt - 18} class="sim-label">M</text>
        </g>
      );
    }
    // axial: straight tension arrows pulling both ends outward
    return (
      <g>
        <line x1={x0 - 22} y1={cy} x2={x0 - 4} y2={cy} class="load-arrow" />
        <path d={`M ${x0 - 22} ${cy} L ${x0 - 13} ${cy - 5} L ${x0 - 13} ${cy + 5} Z`} class="load-arrow-head" />
        <line x1={xend + 4} y1={cy} x2={xend + 22} y2={cy} class="load-arrow" />
        <path d={`M ${xend + 22} ${cy} L ${xend + 13} ${cy - 5} L ${xend + 13} ${cy + 5} Z`} class="load-arrow-head" />
        <text x={xend + 6} y={cy - 8} class="sim-label">F</text>
      </g>
    );
  };

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Stepped shaft with a shoulder fillet" width="100%">
        <title>A shaft stepping from diameter D to diameter d through a fillet of radius r</title>
        <desc>
          A longitudinal section of a stepped shaft: a large diameter on the left blends through a
          shoulder fillet into a smaller diameter on the right. A shaded bloom on the fillet marks the
          stress concentration — larger and redder as the peak stress nears yield. A load glyph at the
          end shows the configuration (axial, bending, or torsion). When the concentration factor is
          refused the bloom is withheld and the geometry alone remains.
        </desc>

        {/* centreline */}
        <line x1={x0 - 6} y1={cy} x2={xend + 6} y2={cy} class="beam-ghost" />

        {/* the shaft body */}
        <path d={outline} class="stepped-shaft-body" />

        {/* fillet stress concentration bloom (top fillet), or a withheld marker */}
        {ktRefused ? (
          <g>
            <circle cx={xstep + rPx} cy={ydt} r={7} class="stepped-hotspot" />
            <text x={xstep + rPx} y={ydt - 12} text-anchor="middle" class="sim-label-small">K_t refused</text>
          </g>
        ) : (
          <StressBands
            cx={xstep + rPx}
            cy={ydt}
            rInner={1.5}
            rOuter={bloomOuter}
            profile={(f) => 1 - 0.85 * f}
            SF={SF}
          />
        )}

        {/* dimension labels */}
        <text x={(x0 + xstep) / 2} y={yDt - 6} text-anchor="middle" class="sim-label">D</text>
        <text x={(xstep + xend) / 2 + 12} y={ydt - 6} text-anchor="middle" class="sim-label">d</text>
        <text x={xstep + rPx + 6} y={ydt + 14} class="sim-label-small">r</text>

        {glyph()}
      </svg>
      <figcaption>
        D/d = {fmt(Dd)}, r/d = {fmt(rd)} →{" "}
        {ktRefused ? (
          <strong>K_t refused here — off the published fit range (see the banner); the geometry stands.</strong>
        ) : (
          <>
            <strong>K_t = {fmt(Kt)}</strong>, peak σ_max = {fmtMPa(sigmaMax)}, SF = {fmt(SF)}
            {danger ? " — past yield at the fillet." : "."}
          </>
        )}
      </figcaption>
    </figure>
  );
}
