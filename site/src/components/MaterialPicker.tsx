/**
 * Material selection — the cross-cutting cascade axis (invariant 3). Swapping
 * a material fans E/σ_y/ρ out through every relation. Each value shows its
 * basis and source; defaults to `typical` (matches coursework) per
 * docs/data-provenance.md, falling back to design/spec minimums.
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

const BASIS_PREFERENCE = ["typical", "design_minimum", "spec_minimum"] as const;
const BASIS_LABEL = { typical: "typical", design_minimum: "design min.", spec_minimum: "spec min." };

export function pickProperty(m: MaterialRow, key: string): MaterialProperty | undefined {
  for (const basis of BASIS_PREFERENCE) {
    const p = m.properties.find((p) => p.key === key && p.basis === basis);
    if (p) return p;
  }
  return undefined;
}

interface Props {
  materials: MaterialRow[];
  selectedId: string;
  binding: Record<string, string>; // variable symbol -> property key
  onSelect: (id: string) => void;
}

export function MaterialPicker({ materials, selectedId, binding, onSelect }: Props) {
  const selected = materials.find((m) => m.id === selectedId);
  return (
    <fieldset class="material-picker">
      <legend>Material</legend>
      <select
        aria-label="Material"
        data-testid="material-select"
        value={selectedId}
        onInput={(e) => onSelect(e.currentTarget.value)}
      >
        {materials.map((m) => (
          <option value={m.id} key={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      {selected ? (
        <p class="material-condition" title={selected.condition}>
          {selected.condition}
        </p>
      ) : null}
      {selected ? (
        <table class="material-props">
          <caption class="sr-only">Bound properties of {selected.name}</caption>
          <tbody>
            {Object.entries(binding).map(([sym, key]) => {
              const p = pickProperty(selected, key);
              if (!p) return null;
              return (
                <tr key={sym}>
                  <th scope="row">{sym}</th>
                  <td>
                    {p.value_published} {p.unit_published}
                  </td>
                  <td>
                    <span class={`basis basis-${p.basis}`}>{BASIS_LABEL[p.basis]}</span>
                  </td>
                  <td class="material-source" title={p.citation}>
                    {p.source_id}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
    </fieldset>
  );
}
