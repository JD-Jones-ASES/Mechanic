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
