/**
 * Winkler curved beam, two panels. LEFT: a schematic C-throat (crane hook / clamp)
 * with the analyzed section marked and the load P pulling through the center of
 * curvature O. RIGHT: the stress distribution across the section depth, radius
 * increasing UPWARD — the curved-beam bending stress (a hyperbola in r, solid)
 * against the straight-beam Mc/I prediction (a line, dashed). The two cross zero
 * at DIFFERENT heights: the real neutral axis at r_n, shifted toward the inner
 * fiber, and the straight-beam's at the centroid r_c. The gap between them IS the
 * physics. Bring the radii together (or scale them up) and the curves slide into
 * coincidence as r_c/h grows. The inner fiber reddens as the margin approaches
 * first yield. Presentational shapes only — every number comes from the engine
 * (invariant 4); the engine's `invalid` verdict is the authoritative refusal
 * (invariant 5).
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";

export function CurvedBeamSim({ values, invalid = false }: { values: VarRecord; invalid?: boolean }) {
  // no destructuring defaults for load-bearing values (invariant 5)
  const ri = values.r_i ?? NaN;
  const ro = values.r_o ?? NaN;
  const rn = values.r_n ?? NaN;
  const rc = values.r_c ?? NaN;
  const e = values.e ?? NaN;
  const A = values.A ?? NaN;
  const I = values.I ?? NaN;
  const M = values.M ?? NaN;
  const sigmaI = values.sigma_i ?? NaN;
  const sigmaO = values.sigma_o ?? NaN;
  const sigmaBi = values.sigma_bi ?? NaN;
  const sigmaStr = values.sigma_str ?? NaN;
  const Ki = values.K_i ?? NaN;
  const curv = values.curv ?? NaN;
  const SF = values.SF ?? Infinity;

  const W = 360;
  const H = 250;
  const ok =
    !invalid &&
    [ri, ro, rn, rc, e, A, I, M, sigmaI, sigmaO, sigmaBi, sigmaStr].every(Number.isFinite) &&
    ro > ri &&
    e > 0;
  if (!ok) {
    return (
      <SimRefusal
        ariaLabel="Curved-beam stress distribution (refused state)"
        label="refused"
        caption="The engine refused this geometry — there is no honest curved-beam stress to draw."
        height={H}
      />
    );
  }

  const danger = Number.isFinite(SF) && SF < 1;
  const h = ro - ri;

  // ---- stress-distribution panel (right) ----
  const yTop = 30; // outer fiber (r_o)
  const yBot = 210; // inner fiber (r_i)
  const stripH = yBot - yTop;
  const zeroX = 250; // the σ = 0 datum (vertical)
  const bulge = 82; // px reach at the peak stress
  const yOf = (r: number) => yBot - ((r - ri) / h) * stripH; // radius -> pixel row

  // curved-beam bending stress σ_b(r) = M(r_n − r)/(A e r); straight-beam
  // line σ_str(r) = M(r_c − r)/I. Scale BOTH by the same factor so the
  // comparison is faithful; the inner-fiber bending stress is the largest.
  const sigmaB = (r: number) => (M * (rn - r)) / (A * e * r);
  const sigmaLine = (r: number) => (M * (rc - r)) / I;
  const peak = Math.max(Math.abs(sigmaBi), Math.abs(sigmaStr), 1e-9);
  const scale = bulge / peak;
  const xB = (r: number) => zeroX + scale * sigmaB(r);
  const xL = (r: number) => zeroX + scale * sigmaLine(r);

  const N = 48;
  const curvePts: string[] = [];
  const linePts: string[] = [];
  for (let i = 0; i <= N; i++) {
    const r = ri + (i / N) * h;
    curvePts.push(`${xB(r).toFixed(1)},${yOf(r).toFixed(1)}`);
    linePts.push(`${xL(r).toFixed(1)},${yOf(r).toFixed(1)}`);
  }
  const curvePath = `M ${curvePts.join(" L ")}`;
  const linePath = `M ${linePts.join(" L ")}`;
  const yN = yOf(rn); // neutral axis (curved) — shifted toward the inner fiber
  const yC = yOf(rc); // centroid (straight-beam neutral axis) — mid-depth
  const profClass = danger ? "curvedbeam-profile-hot" : "curvedbeam-profile";

  // ---- curved-member schematic (left): a C-throat, radius up = outward ----
  const ox = 78; // center of curvature O
  const oy = 128;
  const gScale = 46 / ro; // fit outer radius to ~46 px
  const riPx = ri * gScale;
  const roPx = ro * gScale;
  const a1 = (-70 * Math.PI) / 180; // C opens to the right (toward the σ panel)
  const a2 = (70 * Math.PI) / 180;
  const arcPts = (rad: number, from: number, to: number, steps: number) => {
    const p: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = from + (to - from) * (i / steps);
      p.push(`${(ox + rad * Math.cos(t)).toFixed(1)},${(oy + rad * Math.sin(t)).toFixed(1)}`);
    }
    return p;
  };
  // annular sector polygon: outer arc a1->a2, inner arc a2->a1
  const memberPts = [...arcPts(roPx, a1, a2, 24), ...arcPts(riPx, a2, a1, 24)];
  const memberPath = `M ${memberPts.join(" L ")} Z`;
  // the analyzed throat section is the radial cut at the back of the C (angle π)
  const secA = Math.PI;
  const secInner = [ox + riPx * Math.cos(secA), oy + riPx * Math.sin(secA)];
  const secOuter = [ox + roPx * Math.cos(secA), oy + roPx * Math.sin(secA)];

  const fmtMPa = (v: number) => (Number.isFinite(v) ? `${toDisplay(v, "MPa").toFixed(1)} MPa` : "—");
  const fmtMm = (v: number) => (Number.isFinite(v) ? toDisplay(v, "mm").toFixed(1) : "—");

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Winkler curved-beam stress distribution across the section depth" width="100%">
        <title>Curved-beam bending stress and the shifted neutral axis</title>
        <desc>
          Left: a curved bar (crane-hook throat) loaded by P through its center of curvature O, with
          the analyzed cross-section marked. Right: the stress across the section depth, inner fiber
          at the bottom and outer at the top. The curved-beam stress is a solid hyperbola that crosses
          zero at the neutral-axis radius r_n, low and near the inner fiber; the straight-beam Mc/I
          prediction is a dashed straight line crossing zero at the centroid r_c in the middle. The
          inner fiber carries the largest stress.
        </desc>

        {/* --- curved-member schematic --- */}
        <path d={memberPath} class="curvedbeam-member" />
        <circle cx={ox} cy={oy} r={2.5} class="curvedbeam-origin" />
        <text x={ox + 4} y={oy - 4} class="sim-label-small">O</text>
        {/* the analyzed throat section (radial cut) */}
        <line x1={secInner[0]} y1={secInner[1]} x2={secOuter[0]} y2={secOuter[1]} class="curvedbeam-cut" />
        <text x={secOuter[0] - 4} y={secOuter[1] - 6} text-anchor="middle" class="sim-label-small">throat</text>
        {/* load P through O */}
        <line x1={ox} y1={oy} x2={ox} y2={oy + roPx + 22} class="curvedbeam-load" />
        <path
          d={`M ${ox - 4} ${oy + roPx + 15} L ${ox} ${oy + roPx + 23} L ${ox + 4} ${oy + roPx + 15}`}
          class="curvedbeam-load"
          fill="none"
        />
        <text x={ox + 6} y={oy + roPx + 20} class="sim-label">P</text>

        {/* --- stress-distribution panel --- */}
        {/* section depth strip */}
        <rect x={zeroX - 4} y={yTop} width={8} height={stripH} class="curvedbeam-section" />
        {/* zero-stress datum */}
        <line x1={zeroX} y1={yTop - 8} x2={zeroX} y2={yBot + 8} class="curvedbeam-datum" />
        {/* straight-beam Mc/I (dashed) and curved-beam (solid) profiles */}
        <path d={linePath} class="beam-ghost" fill="none" />
        <path d={curvePath} class={profClass} fill="none" />

        {/* centroid (straight-beam neutral axis) */}
        <line x1={zeroX - 60} y1={yC} x2={zeroX + 92} y2={yC} class="beam-ghost" />
        <text x={zeroX + 60} y={yC - 3} class="sim-label-small">centroid r_c</text>
        {/* neutral axis (curved) — the shift */}
        <line x1={zeroX - 60} y1={yN} x2={zeroX + 92} y2={yN} class="curvedbeam-axis" />
        <text x={zeroX + 40} y={yN + 12} class="sim-label-small">N.A. r_n</text>

        {/* fiber markers + labels */}
        <circle cx={xB(ri)} cy={yBot} r={3.4} class={danger ? "curvedbeam-fiber-hot" : "curvedbeam-fiber"} />
        <text x={xB(ri) + 6} y={yBot + 2} class="sim-label">σ_i</text>
        <text x={zeroX - 62} y={yBot + 4} class="sim-label-small">inner r_i</text>
        <circle cx={xB(ro)} cy={yTop} r={3} class="curvedbeam-fiber" />
        <text x={zeroX - 62} y={yTop + 4} class="sim-label-small">outer r_o</text>
        {/* tension / compression hints */}
        <text x={zeroX + 40} y={yBot + 22} text-anchor="middle" class="sim-label-small">tension →</text>
        <text x={zeroX - 40} y={yTop - 12} text-anchor="middle" class="sim-label-small">← compression</text>
      </svg>
      <figcaption>
        Inner fiber <strong>σ_i = {fmtMPa(sigmaI)}</strong> vs the straight-beam {fmtMPa(sigmaStr)} —
        a curvature penalty <strong>K_i = {Number.isFinite(Ki) ? Ki.toFixed(2) : "—"}×</strong> at
        r_c/h = {Number.isFinite(curv) ? curv.toFixed(1) : "—"}. Outer fiber {fmtMPa(sigmaO)}
        (compression). Neutral axis at r_n = {fmtMm(rn)} mm, shifted {fmtMm(rc - rn)} mm inside the
        centroid. Bring the radii together to watch the two curves converge.
        {danger ? " Shown red: the inner fiber has reached yield." : ""}
      </figcaption>
    </figure>
  );
}
