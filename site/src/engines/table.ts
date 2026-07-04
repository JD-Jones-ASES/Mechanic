/**
 * Tabulated-data lookup (ADR-0009). ONE implementation, shared by the runtime
 * engine (relation.ts) and the build-time parity gate (check-parity.mjs), so
 * the browser and the SymPy oracle cannot drift apart.
 *
 * Contract (proven at build time by verify.py):
 *  - NODE-EXACT: an argument equal to a row's arg returns that row's stored
 *    value bit-exactly — no interpolation arithmetic runs at a node.
 *  - interpolate-linear: linear between adjacent rows; NaN strictly outside the
 *    [first, last] arg domain (no clamp, no extrapolation — invariant 5).
 *  - exact-row: only exact row args resolve; any other argument returns NaN.
 * A NaN return is the honest "refuse" signal the engine scopes to the table's
 * columns (and their descendants). `col` is 1-based into the row (index 0 is
 * the argument), so multi-column tables address each value column directly.
 */
export function tableLookup(
  rows: number[][],
  arg: number,
  mode: "interpolate-linear" | "exact-row",
  col: number,
): number {
  const n = rows.length;
  if (!Number.isFinite(arg) || n === 0) return NaN;
  // exact node hit: return the stored value directly (bit-exact by construction)
  for (let i = 0; i < n; i++) {
    if (arg === rows[i]![0]) return rows[i]![col]!;
  }
  if (mode === "exact-row") return NaN; // non-row argument: nothing honest to return
  // interpolate-linear: refuse strictly outside the domain
  if (arg < rows[0]![0]! || arg > rows[n - 1]![0]!) return NaN;
  for (let i = 0; i < n - 1; i++) {
    const x0 = rows[i]![0]!;
    const x1 = rows[i + 1]![0]!;
    if (arg >= x0 && arg <= x1) {
      const y0 = rows[i]![col]!;
      const y1 = rows[i + 1]![col]!;
      return y0 + ((y1 - y0) * (arg - x0)) / (x1 - x0);
    }
  }
  return NaN; // unreachable once the domain check has passed
}
