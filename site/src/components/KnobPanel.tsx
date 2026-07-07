/**
 * Input knobs: native range + number controls (ADR-0006 — no custom slider
 * divs). Values are SI internally; display conversion happens at the edge
 * (units.ts). Knob count == DOF of the active configuration, by construction.
 */
import { fromDisplay, toDisplay, unitLabel } from "../engines/units";
import type { VariableMeta, VarRecord } from "../engines/types";

interface Props {
  inputs: string[];
  variables: Record<string, VariableMeta>;
  values: VarRecord; // SI
  displayUnits: Record<string, string>;
  onChange: (symbol: string, siValue: number) => void;
  onUnitChange: (symbol: string, unit: string) => void;
  /**
   * Prefix for the generated control `id`s (and their `<label for>`). Defaults to
   * "" — so a single-widget page keeps `knob-<sym>` exactly as before. The
   * chain-builder renders many nodes at once (a THING can even appear twice), so
   * it passes a per-instance prefix (`n1-`) to keep every `id` unique — duplicate
   * ids would break label association and trip axe (ADR-0006).
   */
  idPrefix?: string;
}

export function KnobPanel({ inputs, variables, values, displayUnits, onChange, onUnitChange, idPrefix = "" }: Props) {
  return (
    <fieldset class="knobs">
      <legend>Inputs</legend>
      {inputs.map((sym) => {
        const v = variables[sym]!;
        const unit = displayUnits[sym] ?? v.display_units[0] ?? v.si_unit;
        const display = toDisplay(values[sym] ?? v.default, unit);
        const [lo, hi] = v.bounds ?? [0, 100];
        const step = v.integer ? 1 : (hi - lo) / 200;
        const id = `knob-${idPrefix}${sym}`;
        return (
          <div class="knob" key={sym}>
            <label for={id}>
              {v.name} <span class="knob-symbol">({sym})</span>
            </label>
            <input
              type="range"
              id={id}
              min={toDisplay(lo, unit)}
              max={toDisplay(hi, unit)}
              step={v.integer ? 1 : "any"}
              value={display}
              onInput={(e) => onChange(sym, fromDisplay(Number(e.currentTarget.value), unit))}
            />
            <input
              type="number"
              aria-label={`${v.name} value`}
              min={toDisplay(lo, unit)}
              max={toDisplay(hi, unit)}
              step={step}
              value={Number(display.toPrecision(6))}
              onInput={(e) => {
                const n = Number(e.currentTarget.value);
                if (Number.isFinite(n)) onChange(sym, fromDisplay(n, unit));
              }}
            />
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
              <span class="knob-unit">{unitLabel(unit)}</span>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}
