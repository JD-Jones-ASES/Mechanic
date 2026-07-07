/**
 * Material selection — the cross-cutting cascade axis (invariant 3). Swapping
 * a material fans E/σ_y/ρ out through every relation. Each value shows its
 * basis and source; defaults to `typical` (matches coursework) per
 * docs/data-provenance.md, falling back to design/spec minimums.
 *
 * The pure data + basis-preference lookup live in `material-data.ts` (so
 * headless glue can reuse them without importing this JSX component); they are
 * re-exported here so existing `from "./MaterialPicker"` imports are unchanged.
 */
import {
  BASIS_LABEL,
  type MaterialProperty,
  type MaterialRow,
  pickProperty,
} from "./material-data";

export { pickProperty };
export type { MaterialProperty, MaterialRow };

interface Props {
  materials: MaterialRow[];
  selectedId: string;
  binding: Record<string, string>; // variable symbol -> property key
  onSelect: (id: string) => void;
  /**
   * Material slot key (S17). Omitted or "default" → the legacy single-binding
   * picker: legend/aria "Material", data-testid "material-select" (so every
   * previously shipped THING renders and pins byte-identically). A named slot
   * ("core") → labelled "Core material", data-testid "material-select-core".
   */
  slot?: string;
}

export function MaterialPicker({ materials, selectedId, binding, onSelect, slot }: Props) {
  const selected = materials.find((m) => m.id === selectedId);
  const named = slot != null && slot !== "default";
  const label = named ? `${slot[0]!.toUpperCase()}${slot.slice(1)} material` : "Material";
  const testid = named ? `material-select-${slot}` : "material-select";
  return (
    <fieldset class="material-picker">
      <legend>{label}</legend>
      <select
        aria-label={label}
        data-testid={testid}
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
