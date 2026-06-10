/**
 * Euler column: end-condition glyphs + bowed mode shape (left), and the
 * column-capacity chart (right) — Euler's hyperbola and Johnson's parabola
 * drawn through the engine's verified readout values, tangent at λ_T. The
 * chart is the model hand-off made visible: the governing branch is solid,
 * the refused branch dashed, exactly mirroring the scoped-refusal verdicts
 * (invariant 5: the sim obeys the engine, never re-decides validity).
 */
import type { VarRecord } from "../../engines/types";
import { SimRefusal } from "./SimRefusal";

function endGlyphs(K: number): { top: "pin" | "fixed" | "free"; bottom: "pin" | "fixed" } {
  if (Math.abs(K - 2) < 1e-9) return { top: "free", bottom: "fixed" };
  if (Math.abs(K - 0.5) < 1e-9) return { top: "fixed", bottom: "fixed" };
  if (Math.abs(K - 0.699) < 1e-3) return { top: "pin", bottom: "fixed" };
  return { top: "pin", bottom: "pin" };
}

export function ColumnSim({
  values,
  invalid = false,
  invalidVars = [],
}: {
  values: VarRecord;
  invalid?: boolean;
  invalidVars?: string[];
}) {
  const K = values.K ?? NaN;
  const lam = values.lam ?? NaN;
  const lamT = values.lam_T ?? NaN;
  const sigmaCr = values.sigma_cr ?? NaN;
  const sigmaJ = values.sigma_J ?? NaN;
  const sigmaY = values.sigma_y ?? NaN;
  const sigmaApp = (values.P ?? NaN) / (values.A ?? NaN); // applied axial stress

  // the engine's verdicts are authoritative: `invalid` refuses everything;
  // the scoped verdicts say which MODEL is refused at this slenderness
  const eulerRefused = invalidVars.includes("SF_b");
  const johnsonRefused = invalidVars.includes("SF_J");
  const SF_gov = eulerRefused ? (values.SF_J ?? Infinity) : (values.SF_b ?? Infinity);

  if (
    invalid ||
    ![K, lam, lamT, sigmaCr, sigmaJ, sigmaY, sigmaApp].every(Number.isFinite)
  ) {
    return <SimRefusal ariaLabel="Euler column diagram (undefined state)" height={220} />;
  }

  const W = 460;
  const H = 220;

  /* ---------- left panel: mode shape (amplitude schematic) ---------- */
  const cx = 80;
  const yTop = 38;
  const yBot = H - 26;
  const colLen = yBot - yTop;
  const closeness = Number.isFinite(SF_gov) && SF_gov > 0 ? Math.min(1 / SF_gov, 1.4) : 0;
  const amp = 34 * closeness;
  const danger = Number.isFinite(SF_gov) && SF_gov < 1;
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const s = i / 40;
    pts.push(`${cx + amp * Math.sin(Math.PI * s)},${yTop + s * colLen}`);
  }
  const g = endGlyphs(K);
  const glyph = (kind: "pin" | "fixed" | "free", y: number, flip: boolean) => {
    if (kind === "free") return null;
    if (kind === "pin") {
      const dy = flip ? -12 : 12;
      return (
        <path d={`M ${cx - 10} ${y + dy} L ${cx} ${y} L ${cx + 10} ${y + dy} Z`} class="beam-wall" />
      );
    }
    return <rect x={cx - 22} y={flip ? y - 8 : y} width="44" height="8" class="beam-wall" />;
  };

  /* ---------- right panel: capacity chart through verified values ----------
   * Both curves are exact rescalings of the current readout values:
   *   σ_E(l) = σ_cr·(λ/l)²   and   σ_J(l) = σ_y − (σ_y − σ_J)·(l/λ)²
   * — no physics re-derived in the widget, only the verified point swept
   * along each model's similarity law. */
  const chX = 168;
  const chW = W - chX - 14;
  const chY = 26;
  const chH = H - chY - 34;
  const xMax = Math.max(lam * 1.25, lamT * 1.5);
  const yMax = sigmaY * 1.12;
  const px = (l: number) => chX + (l / xMax) * chW;
  const py = (s: number) => chY + chH * (1 - Math.max(s, 0) / yMax);

  const eulerAt = (l: number) => sigmaCr * (lam / l) ** 2;
  const johnsonAt = (l: number) => sigmaY - (sigmaY - sigmaJ) * (l / lam) ** 2;

  const sweep = (f: (l: number) => number, l0: number, l1: number): string =>
    Array.from({ length: 33 }, (_, i) => {
      const l = l0 + ((l1 - l0) * i) / 32;
      return `${px(l)},${py(Math.min(f(l), yMax))}`;
    }).join(" ");

  const lamEulerTop = lam * Math.sqrt(sigmaCr / yMax); // where the hyperbola exits the top
  const lamJohnsonZero = lam * Math.sqrt(sigmaY / Math.max(sigmaY - sigmaJ, 1e-12)); // σ_J = 0
  const eulerSolid = sweep(eulerAt, Math.max(lamT, lamEulerTop), xMax);
  const eulerDashed = sweep(eulerAt, Math.max(lamEulerTop, xMax / 400), lamT);
  const johnsonSolid = sweep(johnsonAt, 0, Math.min(lamT, lamJohnsonZero));
  const johnsonDashed = sweep(johnsonAt, lamT, Math.min(xMax, lamJohnsonZero));

  const governs = eulerRefused ? "Johnson (inelastic)" : johnsonRefused ? "Euler (elastic)" : "both models (tangency)";

  return (
    <figure class="sim">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Euler column: mode shape and capacity chart with the Euler-Johnson hand-off"
        width="100%"
      >
        <title>Column mode shape, and critical stress versus slenderness</title>
        <desc>
          Left: a vertical column loaded from the top, with its buckled mode shape and support
          symbols. Right: critical stress against slenderness — Johnson's parabola governs left
          of the transition slenderness, Euler's hyperbola right of it; they meet tangentially.
          The marker shows the current applied stress and slenderness, and the curve that does
          not govern is dashed.
        </desc>
        {/* load arrow */}
        <line x1={cx} y1={8} x2={cx} y2={yTop - 8} class="load-arrow" />
        <path d={`M ${cx - 5} ${yTop - 14} L ${cx} ${yTop - 4} L ${cx + 5} ${yTop - 14} Z`} class="load-arrow-head" />
        <text x={cx + 10} y={20} class="sim-label">
          P
        </text>
        <line x1={cx} y1={yTop} x2={cx} y2={yBot} class="beam-ghost" />
        <polyline points={pts.join(" ")} class={danger ? "beam-line beam-yielding" : "beam-line"} fill="none" />
        {glyph(g.top, yTop, true)}
        {glyph(g.bottom, yBot, false)}

        {/* chart frame */}
        <line x1={chX} y1={chY} x2={chX} y2={chY + chH} class="chart-axis" />
        <line x1={chX} y1={chY + chH} x2={chX + chW} y2={chY + chH} class="chart-axis" />
        <text x={chX + chW - 8} y={chY + chH + 14} class="sim-label">
          λ
        </text>
        <text x={chX - 10} y={chY + 10} class="sim-label">
          σ
        </text>
        {/* σ_y reference */}
        <line x1={chX} y1={py(sigmaY)} x2={chX + chW} y2={py(sigmaY)} class="chart-ref" />
        <text x={chX + 4} y={py(sigmaY) - 3} class="sim-label-small">
          σ_y
        </text>
        {/* λ_T hand-off marker and tangency point at σ_y/2 */}
        <line x1={px(lamT)} y1={chY} x2={px(lamT)} y2={chY + chH} class="chart-ref" />
        <text x={px(lamT) + 3} y={chY + chH - 4} class="sim-label-small">
          λ_T
        </text>
        <circle cx={px(lamT)} cy={py(sigmaY / 2)} r="3.5" class="chart-tangency" />
        {/* the two models: solid where they govern, dashed where refused */}
        <polyline points={johnsonSolid} class="chart-curve chart-johnson" fill="none" />
        <polyline points={johnsonDashed} class="chart-curve chart-johnson chart-curve-off" fill="none" />
        <polyline points={eulerSolid} class="chart-curve chart-euler" fill="none" />
        <polyline points={eulerDashed} class="chart-curve chart-euler chart-curve-off" fill="none" />
        {/* operating point: current slenderness at the applied stress */}
        <circle
          cx={px(Math.min(lam, xMax))}
          cy={py(Math.min(sigmaApp, yMax))}
          r="4.5"
          class={danger ? "chart-point chart-point-danger" : "chart-point"}
        />
      </svg>
      <figcaption>
        Right: the capacity chart — Johnson's parabola left of λ_T, Euler's hyperbola right of
        it, tangent at σ_y/2 (both curves swept through the machine-verified readout values; the
        dashed branch is the model the engine refuses at this slenderness).{" "}
        <strong>{governs} governs here</strong>, margin SF ≈{" "}
        {Number.isFinite(SF_gov) ? SF_gov.toPrecision(3) : "—"}; the dot is the applied stress
        P/A at the current λ. Left: mode shape only — linear theory leaves the buckled amplitude
        indeterminate, so the bow is schematic and just grows as the margin shrinks.
        {danger ? " Column shown red: the applied load exceeds the governing capacity." : ""}
      </figcaption>
    </figure>
  );
}
