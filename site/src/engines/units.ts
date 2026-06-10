/**
 * Display-unit conversion and chaining legality (invariant 2).
 *
 * The engine computes in SI ONLY; units at runtime are display conversions.
 * A chain connection is legal iff the dimension 7-vector AND the quantity
 * kind both match — kinds keep angle/ratio/count/Poisson (all zero-vector)
 * from cross-connecting.
 */

/** value_display = value_si / factor; value_si = value_display * factor */
const DISPLAY_FACTORS: Record<string, { factor: number; label: string }> = {
  "rad/s": { factor: 1, label: "rad/s" },
  rpm: { factor: (2 * Math.PI) / 60, label: "rpm" },
  m: { factor: 1, label: "m" },
  mm: { factor: 1e-3, label: "mm" },
  cm: { factor: 1e-2, label: "cm" },
  N: { factor: 1, label: "N" },
  kN: { factor: 1e3, label: "kN" },
  Pa: { factor: 1, label: "Pa" },
  MPa: { factor: 1e6, label: "MPa" },
  GPa: { factor: 1e9, label: "GPa" },
  "N*m": { factor: 1, label: "N·m" },
  "kg/m^3": { factor: 1, label: "kg/m³" },
  kg: { factor: 1, label: "kg" },
  g: { factor: 1e-3, label: "g" },
  W: { factor: 1, label: "W" },
  kW: { factor: 1e3, label: "kW" },
  "1": { factor: 1, label: "" },
  rad: { factor: 1, label: "rad" },
  deg: { factor: Math.PI / 180, label: "°" },
};

export function toDisplay(valueSi: number, unit: string): number {
  const u = DISPLAY_FACTORS[unit];
  if (!u) throw new Error(`unknown display unit '${unit}' — add it to units.ts`);
  return valueSi / u.factor;
}

export function fromDisplay(valueDisplay: number, unit: string): number {
  const u = DISPLAY_FACTORS[unit];
  if (!u) throw new Error(`unknown display unit '${unit}' — add it to units.ts`);
  return valueDisplay * u.factor;
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
