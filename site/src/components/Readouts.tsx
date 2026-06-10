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
  displayUnits: Record<string, string>;
  onUnitChange: (symbol: string, unit: string) => void;
}

export function Readouts({ targets, variables, values, invalid, displayUnits, onUnitChange }: Props) {
  return (
    <dl class="readouts">
      {targets.map((sym) => {
        const v = variables[sym]!;
        const unit = displayUnits[sym] ?? v.si_unit;
        const val = values[sym];
        const shown =
          invalid || val === undefined || !Number.isFinite(val)
            ? "—"
            : Number(toDisplay(val, unit).toPrecision(5)).toLocaleString();
        return (
          <div class="readout" key={sym}>
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
