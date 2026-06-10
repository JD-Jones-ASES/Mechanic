/**
 * Eccentric column: the offset load line and the bowed elastic shape (left),
 * and the midspan cross-section stress distribution (right) — axial mean plus
 * amplified bending, with the yielded zone turning red. The elastic panel
 * obeys the engine's SCOPED verdicts: when σ_max/δ are refused (P ≥ P_E or
 * past first yield) it draws only the honest outline and points at the load
 * margin, which stays exact (invariant 5).
 */
import type { VarRecord } from "../../engines/types";
import { SimRefusal } from "./SimRefusal";

export function EccentricColumnSim({
  values,
  invalid = false,
  invalidVars = [],
}: {
  values: VarRecord;
  invalid?: boolean;
  invalidVars?: string[];
}) {
  const e = values.e ?? NaN;
  const d = values.d ?? NaN;
  const deltaMid = values.delta_mid ?? NaN;
  const sigmaMax = values.sigma_max ?? NaN;
  const sigmaY = values.sigma_y ?? NaN;
  const P = values.P ?? NaN;
  const A = values.A ?? NaN;
  const SF_P = values.SF_y ?? NaN;

  if (invalid || ![e, d, P, A, sigmaY, SF_P].every(Number.isFinite)) {
    return <SimRefusal ariaLabel="Eccentric column diagram (undefined state)" height={230} />;
  }
  // scoped refusal: the elastic solution (bow + stress field) is OFF here —
  // either no bent equilibrium exists (P ≥ P_E) or a fiber already yielded
  const elasticRefused = invalidVars.includes("sigma_max");

  const W = 460;
  const H = 230;
  const cx = 96;
  const yTop = 36;
  const yBot = H - 30;
  const colLen = yBot - yTop;
  const halfW = 9; // drawn column half-width (schematic)

  // offset load line: e exaggerated to a legible pixel offset
  const ePx = Math.min(10 + 30 * Math.min(e / Math.max(d, 1e-9), 1), 44);
  // bow: REAL δ/e sets the amplitude relative to the offset (so dragging P
  // toward P_E visibly runs away), capped for the frame
  const bowPx = Math.min(ePx * (Number.isFinite(deltaMid) ? Math.max(deltaMid / Math.max(e, 1e-12), 0) : 0), 70);
  const danger = Number.isFinite(SF_P) && SF_P < 1;

  const bow: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const s = i / 40;
    bow.push(`${cx + bowPx * Math.sin(Math.PI * s)},${yTop + s * colLen}`);
  }

  /* ---- right panel: midspan stress across the section ---- */
  const chX = 230;
  const chW = W - chX - 18;
  const chY = 34;
  const chH = H - chY - 44;
  const meanStress = P / A;
  const sigmaMin = 2 * meanStress - sigmaMax; // mean − bending, from verified values
  const sMax = Math.max(Math.abs(sigmaMax), Math.abs(sigmaMin), sigmaY) * 1.15;
  const sx = (s: number) => chX + (chW * (s + sMax)) / (2 * sMax); // stress → x
  const yieldX = sx(sigmaY);
  const zeroX = sx(0);
  const minX = sx(sigmaMin);
  const maxX = sx(sigmaMax);

  return (
    <figure class="sim">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Eccentric column: offset load line, bowed shape, and midspan stress distribution"
        width="100%"
      >
        <title>Eccentrically loaded column and its midspan stress distribution</title>
        <desc>
          Left: a column whose load is applied off the centroidal axis; the offset load line and
          the bowed shape show the moment arm growing with deflection. Right: the stress across
          the midspan section, the sum of a uniform compression and a bending gradient; values
          past the yield strength are shaded red. When the elastic solution is refused the
          stress panel is withheld and the load margin remains.
        </desc>
        {/* centroid line and offset load line */}
        <line x1={cx} y1={yTop - 4} x2={cx} y2={yBot + 4} class="beam-ghost" />
        <line x1={cx + ePx} y1={6} x2={cx + ePx} y2={yTop - 2} class="load-arrow" />
        <path
          d={`M ${cx + ePx - 5} ${yTop - 10} L ${cx + ePx} ${yTop} L ${cx + ePx + 5} ${yTop - 10} Z`}
          class="load-arrow-head"
        />
        <text x={cx + ePx + 8} y={16} class="sim-label">
          P
        </text>
        {/* the e dimension tick at the top */}
        <line x1={cx} y1={yTop - 16} x2={cx + ePx} y2={yTop - 16} class="chart-ref" />
        <text x={cx + ePx / 2 - 4} y={yTop - 20} class="sim-label-small">
          e
        </text>
        {/* pins */}
        <path d={`M ${cx - 10} ${yTop - 12} L ${cx} ${yTop} L ${cx + 10} ${yTop - 12} Z`} class="beam-wall" />
        <path d={`M ${cx - 10} ${yBot + 12} L ${cx} ${yBot} L ${cx + 10} ${yBot + 12} Z`} class="beam-wall" />
        {/* the column: refused elastic state draws the straight outline only */}
        {elasticRefused ? (
          <line x1={cx} y1={yTop} x2={cx} y2={yBot} class="beam-line" opacity="0.35" />
        ) : (
          <polyline
            points={bow.join(" ")}
            class={danger ? "beam-line beam-yielding" : "beam-line"}
            fill="none"
          />
        )}

        {/* right: stress distribution across the midspan section */}
        <text x={chX} y={chY - 12} class="sim-label-small">
          midspan stress across the section
        </text>
        <line x1={chX} y1={chY + chH} x2={chX + chW} y2={chY + chH} class="chart-axis" />
        {elasticRefused ? (
          <text x={chX + 8} y={chY + chH / 2} class="sim-label">
            elastic solution refused here
          </text>
        ) : (
          <>
            {/* gradient bar from σ_min to σ_max; the part past σ_y turns red */}
            <rect
              x={Math.min(minX, maxX)}
              y={chY + chH / 2 - 16}
              width={Math.abs(maxX - minX)}
              height={32}
              class="stress-fill"
            />
            {sigmaMax > sigmaY ? (
              <rect
                x={yieldX}
                y={chY + chH / 2 - 16}
                width={Math.max(maxX - yieldX, 0)}
                height={32}
                class="stress-fill-over"
              />
            ) : null}
            {/* zero-stress line: when it enters the bar, part of the section is in tension */}
            <line x1={zeroX} y1={chY + 6} x2={zeroX} y2={chY + chH} class="chart-axis" />
            <text x={zeroX - 3} y={chY + chH + 12} class="sim-label-small">
              0
            </text>
            <line x1={yieldX} y1={chY + 6} x2={yieldX} y2={chY + chH} class="chart-ref" />
            <text x={yieldX - 8} y={chY + chH + 12} class="sim-label-small">
              σ_y
            </text>
            <text x={maxX - 18} y={chY + chH / 2 - 22} class="sim-label-small">
              σ_max
            </text>
          </>
        )}
      </svg>
      <figcaption>
        {elasticRefused ? (
          <>
            The elastic readouts are refused at this state (see the banner) — but the load at
            first yield is exact regardless: <strong>margin on load SF_P ≈ {SF_P.toPrecision(3)}</strong>.
            Left: outline only; no confident bow can be drawn here.
          </>
        ) : (
          <>
            Left: the load line rides {""}offset e from the centroid (offsets exaggerated to stay
            legible; the bow uses the real δ/e ratio, so approaching P_E visibly runs away).
            Right: midspan stress = uniform P/A plus the amplified bending gradient
            {sigmaMax > sigmaY ? " — the red zone has yielded" : ""}. Margin on load SF_P ≈{" "}
            {SF_P.toPrecision(3)}{danger ? " — first yield is behind you." : "."}
          </>
        )}
      </figcaption>
    </figure>
  );
}
