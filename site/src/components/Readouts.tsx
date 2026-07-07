/**
 * Output readouts with display units. Every number on screen traces back to a
 * verified plan step; when the engine reports invalid, readouts blank rather
 * than show plausible wrong numbers (invariant 5).
 */
import type { ComponentChildren } from "preact";
import { toDisplay, unitLabel } from "../engines/units";
import type { VariableMeta, VarRecord } from "../engines/types";

interface Props {
  targets: string[];
  variables: Record<string, VariableMeta>;
  values: VarRecord; // SI
  invalid: boolean;
  /** per-variable refusals from scope-carrying envelopes (model hand-off) */
  invalidVars: string[];
  displayUnits: Record<string, string>;
  onUnitChange: (symbol: string, unit: string) => void;
  /**
   * S24: optional per-readout provenance disclosure (chain pages only). Returns
   * the <details> trail to render below a readout, or null. Omitted on THING
   * pages, where rendering stays byte-identical to before.
   */
  provenanceSlot?: (symbol: string) => ComponentChildren;
}

export function Readouts({ targets, variables, values, invalid, invalidVars, displayUnits, onUnitChange, provenanceSlot }: Props) {
  return (
    <>
      <dl class="readouts">
        {targets.map((sym) => {
          const v = variables[sym]!;
          const unit = displayUnits[sym] ?? v.display_units[0] ?? v.si_unit;
          const val = values[sym];
          const refused = invalid || invalidVars.includes(sym);
          const shown =
            refused || val === undefined || !Number.isFinite(val)
              ? "—"
              : Number(toDisplay(val, unit).toPrecision(5)).toString();
          return (
            <div class={refused && !invalid ? "readout readout-refused" : "readout"} key={sym}>
              <dt>{v.name}</dt>
              <dd data-output={sym}>
                <output>{shown}</output>{" "}
                {v.display_units.length > 1 ? (
                  <select
                    aria-label={`${v.name} unit`}
                    value={unit}
                    onInput={(e) => onUnitChange(sym, e.currentTarget.value)}
                  >
                    {v.display_units.map((u) => (
                      <option value={u} key={u}>
                        {unitLabel(u) || "—"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span class="readout-unit">{unitLabel(unit)}</span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      {/* S24: per-readout provenance trails live OUTSIDE the <dl> — a <details>
          sibling to <dt>/<dd> would break definition-list semantics (axe). Each
          trail names its own variable, so the association stays explicit. THING
          pages omit the slot, so this block is absent and the <dl> is the only
          output — byte-identical to before. */}
      {provenanceSlot ? (
        <div class="readout-provenance">
          {targets.map((sym) => (
            <div class="readout-prov-row" key={sym}>
              {provenanceSlot(sym)}
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
