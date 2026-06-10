/**
 * Euler column: vertical strut with end-condition glyphs chosen by K, a bowed
 * mode shape, and the load arrow. Linear theory leaves the buckled AMPLITUDE
 * indeterminate — the drawing makes the shape legible and the caption says the
 * amplitude is schematic (invariant 5: never silently mislead).
 */
import type { VarRecord } from "../../engines/types";
import { SimRefusal } from "./SimRefusal";

function endGlyphs(K: number): { top: "pin" | "fixed" | "free"; bottom: "pin" | "fixed" } {
  if (Math.abs(K - 2) < 1e-9) return { top: "free", bottom: "fixed" };
  if (Math.abs(K - 0.5) < 1e-9) return { top: "fixed", bottom: "fixed" };
  if (Math.abs(K - 0.699) < 1e-3) return { top: "pin", bottom: "fixed" };
  return { top: "pin", bottom: "pin" };
}

export function ColumnSim({ values, invalid = false }: { values: VarRecord; invalid?: boolean }) {
  // the engine's `invalid` verdict is authoritative (the inelastic region
  // λ < λ_T refuses with every value finite) — no confident mode-shape
  // drawing over a refused state (invariant 5)
  const K = values.K ?? NaN;
  const SF_b = values.SF_b ?? Infinity;
  if (invalid || !Number.isFinite(K)) {
    return <SimRefusal ariaLabel="Euler column diagram (undefined state)" height={210} />;
  }
  const W = 320;
  const H = 210;
  const cx = W / 2;
  const yTop = 38;
  const yBot = H - 26;
  const colLen = yBot - yTop;

  // bow amplitude: schematic, grows as the margin shrinks (amplitude is
  // indeterminate in linear theory — see caption)
  const closeness = Number.isFinite(SF_b) && SF_b > 0 ? Math.min(1 / SF_b, 1.4) : 0;
  const amp = 36 * closeness;
  const danger = Number.isFinite(SF_b) && SF_b < 1;

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

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Euler column diagram" width="100%">
        <title>Axially loaded column with its buckled mode shape</title>
        <desc>
          A vertical column loaded from the top. The bowed curve shows the buckling mode shape;
          end symbols show the support conditions. The column turns red when the load exceeds the
          Euler critical load.
        </desc>
        {/* load arrow pushing down on the top */}
        <line x1={cx} y1={8} x2={cx} y2={yTop - 8} class="load-arrow" />
        <path d={`M ${cx - 5} ${yTop - 14} L ${cx} ${yTop - 4} L ${cx + 5} ${yTop - 14} Z`} class="load-arrow-head" />
        <text x={cx + 10} y={20} class="sim-label">
          P
        </text>
        {/* undeflected reference + mode shape */}
        <line x1={cx} y1={yTop} x2={cx} y2={yBot} class="beam-ghost" />
        <polyline points={pts.join(" ")} class={danger ? "beam-line beam-yielding" : "beam-line"} fill="none" />
        {glyph(g.top, yTop, true)}
        {glyph(g.bottom, yBot, false)}
      </svg>
      <figcaption>
        Mode shape only — linear buckling theory leaves the amplitude indeterminate; the bow drawn
        here just grows as the margin shrinks (SF_b ≈{" "}
        {Number.isFinite(SF_b) ? SF_b.toPrecision(3) : "—"}).
        {danger ? " Column shown red: the applied load exceeds the Euler critical load." : ""}
      </figcaption>
    </figure>
  );
}
