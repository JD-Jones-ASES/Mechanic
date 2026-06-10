/**
 * Display-unit conversion and chaining legality (invariant 2).
 *
 * The engine computes in SI ONLY; units at runtime are display conversions.
 * A chain connection is legal iff the dimension 7-vector AND the quantity
 * kind both match — kinds keep angle/ratio/count/Poisson (all zero-vector)
 * from cross-connecting.
 */

/** value_display = value_si / factor; value_si = value_display * factor.
 * Exported so the build gate (site/scripts/check-units.mjs) can verify every
 * authored display_units / si_unit string resolves here — an unknown unit
 * falls back to showing the SI value under the authored label, which for any
 * prefixed unit is wrong-as-labeled (invariant 5: that must fail the build,
 * not console.warn into the void). */
export const DISPLAY_FACTORS: Record<string, { factor: number; label: string }> = {
  "rad/s": { factor: 1, label: "rad/s" },
  rpm: { factor: (2 * Math.PI) / 60, label: "rpm" },
  m: { factor: 1, label: "m" },
  mm: { factor: 1e-3, label: "mm" },
  cm: { factor: 1e-2, label: "cm" },
  N: { factor: 1, label: "N" },
  kN: { factor: 1e3, label: "kN" },
  "N/m": { factor: 1, label: "N/m" },
  "N/mm": { factor: 1e3, label: "N/mm" }, // 1 N/mm = 1000 N/m — the metric spring-rate idiom
  "kN/m": { factor: 1e3, label: "kN/m" },
  "m/s": { factor: 1, label: "m/s" },
  "cm^2": { factor: 1e-4, label: "cm²" },
  Pa: { factor: 1, label: "Pa" },
  kPa: { factor: 1e3, label: "kPa" }, // was missing while pressure-vessel offered it: 1000× wrong-as-labeled (caught by check-units.mjs on its first run)
  MPa: { factor: 1e6, label: "MPa" },
  GPa: { factor: 1e9, label: "GPa" },
  "N*m": { factor: 1, label: "N·m" },
  "kg/m^3": { factor: 1, label: "kg/m³" },
  "kg/m**3": { factor: 1, label: "kg/m³" },
  "kg/m": { factor: 1, label: "kg/m" },
  "m**4": { factor: 1, label: "m⁴" },
  "m**2": { factor: 1, label: "m²" },
  kg: { factor: 1, label: "kg" },
  g: { factor: 1e-3, label: "g" },
  W: { factor: 1, label: "W" },
  kW: { factor: 1e3, label: "kW" },
  J: { factor: 1, label: "J" },
  kJ: { factor: 1e3, label: "kJ" },
  Wh: { factor: 3600, label: "Wh" },
  "J/kg": { factor: 1, label: "J/kg" },
  "Wh/kg": { factor: 3600, label: "Wh/kg" },
  "kg*m^2": { factor: 1, label: "kg·m²" },
  "kg*m**2": { factor: 1, label: "kg·m²" },
  "1": { factor: 1, label: "" },
  rad: { factor: 1, label: "rad" },
  deg: { factor: Math.PI / 180, label: "°" },
};

// Unknown units fall back to identity: the engine computes in SI, so showing
// the SI value with the raw unit string is correct-if-ugly — never crash the
// widget over a label. (The warning keeps typos from hiding forever.)
function lookup(unit: string): { factor: number; label: string } {
  const u = DISPLAY_FACTORS[unit];
  if (u) return u;
  console.warn(`units.ts: no display entry for '${unit}', showing SI value as-is`);
  return { factor: 1, label: unit };
}

export function toDisplay(valueSi: number, unit: string): number {
  return valueSi / lookup(unit).factor;
}

export function fromDisplay(valueDisplay: number, unit: string): number {
  return valueDisplay * lookup(unit).factor;
}

export function unitLabel(unit: string): string {
  return DISPLAY_FACTORS[unit]?.label ?? unit;
}

export function dimsEqual(a: number[], b: number[]): boolean {
  return a.length === 7 && b.length === 7 && a.every((x, i) => x === b[i]);
}

export interface Port {
  dim: number[];
  quantity_kind: string;
}

/** Chaining type-check: dimension vector AND quantity kind must both match. */
export function connectionLegal(out: Port, into: Port): { ok: boolean; reason?: string } {
  if (!dimsEqual(out.dim, into.dim)) {
    return { ok: false, reason: `dimension mismatch: [${out.dim}] → [${into.dim}]` };
  }
  if (out.quantity_kind !== into.quantity_kind) {
    return {
      ok: false,
      reason: `quantity kind mismatch: ${out.quantity_kind} → ${into.quantity_kind} (same dimensions, different meaning)`,
    };
  }
  return { ok: true };
}
