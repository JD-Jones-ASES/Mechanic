/**
 * Output readouts with display units. Every number on screen traces back to a
 * verified plan step; when the engine reports invalid, readouts blank rather
 * than show plausible wrong numbers (invariant 5).
 */
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
}

export function Readouts({ targets, variables, values, invalid, invalidVars, displayUnits, onUnitChange }: Props) {
  return (
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
  );
}
