/**
 * Cited physical constants (role: constant) — a labeled, cited value, NEVER a
 * knob. Invariant 5: every emitted number traces to a source, so g appears the
 * way a material value does (value + unit + source, citation on hover), not as
 * a control. The value shown is the variable's `default`; the widget injects
 * that same value into every evaluation and excludes it from the DOF/knob
 * arithmetic exactly like a material, so there is nothing here to adjust.
 */
import type { SourceRecord, VariableMeta } from "../engines/types";
import { toDisplay, unitLabel } from "../engines/units";

interface Props {
  constants: [string, VariableMeta][]; // [symbol, meta] for every role: constant variable
  sources: SourceRecord[];
}

export function ConstantsPanel({ constants, sources }: Props) {
  if (!constants.length) return null;
  return (
    <fieldset class="constants-panel" data-testid="constants-panel">
      <legend>Constants</legend>
      <table class="constant-values">
        <caption class="sr-only">Cited physical constants used on this page</caption>
        <tbody>
          {constants.map(([sym, v]) => {
            const unit = v.display_units[0] ?? v.si_unit;
            const src = sources.find((s) => s.id === v.citation);
            return (
              <tr key={sym}>
                <th scope="row">{sym}</th>
                <td class="constant-name">{v.name}</td>
                <td class="constant-value">
                  {Number(toDisplay(v.default, unit).toPrecision(6))} {unitLabel(unit)}
                </td>
                <td class="constant-source" title={src?.citation ?? v.citation ?? ""}>
                  {v.citation}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </fieldset>
  );
}
