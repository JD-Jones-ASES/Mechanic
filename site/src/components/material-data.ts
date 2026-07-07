/**
 * Pure material-selection data + the basis-preference lookup, split out of
 * `MaterialPicker.tsx` so headless glue (the chain-builder model, unit-tested via
 * `node --test`, which type-strips `.ts` but cannot parse the picker's JSX) can
 * reuse the ONE canonical `pickProperty` instead of re-implementing the basis
 * order and drifting from it. `MaterialPicker.tsx` re-exports these, so every
 * existing `from "./MaterialPicker"` import is unchanged.
 */
export interface MaterialProperty {
  key: string;
  basis: "spec_minimum" | "design_minimum" | "typical";
  value_published: number;
  unit_published: string;
  value_si: number;
  unit_si: string;
  source_id: string;
  citation: string;
}

export interface MaterialRow {
  id: string;
  name: string;
  class: string;
  condition: string;
  cost_class: string;
  properties: MaterialProperty[];
}

export const BASIS_PREFERENCE = ["typical", "design_minimum", "spec_minimum"] as const;
export const BASIS_LABEL = {
  typical: "typical",
  design_minimum: "design min.",
  spec_minimum: "spec min.",
};

/** The bound property for a symbol, preferring `typical` (matches coursework)
 * then falling back to design/spec minimums (docs/data-provenance.md). */
export function pickProperty(m: MaterialRow, key: string): MaterialProperty | undefined {
  for (const basis of BASIS_PREFERENCE) {
    const p = m.properties.find((p) => p.key === key && p.basis === basis);
    if (p) return p;
  }
  return undefined;
}

/** Resolve a `{symbol: property_key}` binding map against a material into SI
 * values (invariant 3's cascade). The ONE resolve loop — the chain-builder model
 * calls it; ThingWidget/ChainDemo still inline their own copies but can adopt
 * this. A key the material does not publish is skipped (never a fabricated 0). */
export function resolveBinding(
  m: MaterialRow,
  binds: Record<string, string>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [sym, key] of Object.entries(binds)) {
    const p = pickProperty(m, key);
    if (p) out[sym] = p.value_si;
  }
  return out;
}
