/**
 * Build gate: every display unit a THING can put on screen must resolve in
 * the display-conversion table. units.ts falls back to factor-1 with the raw
 * label for unknown units — for any prefixed unit that is a wrong-as-labeled
 * number guarded only by a console.warn, which is exactly the "plausible
 * wrong number, surfaced silently" failure invariant 5 exists to ban.
 *
 * Checks, for every variable of every compiled artifact: each entry of
 * `display_units`, plus `si_unit` when `display_units` is empty (Readouts/
 * KnobPanel fall back to it). Fails loudly naming thing/symbol/unit.
 * (Node 24 type-strips the .ts import — same trick as tests/chain.test.mjs.)
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DISPLAY_FACTORS } from "../src/engines/units.ts";

const here = dirname(fileURLToPath(import.meta.url));
const genDir = join(here, "..", "src", "generated", "things");

const failures = [];
let checked = 0;
for (const file of readdirSync(genDir).filter((f) => f.endsWith(".compiled.json"))) {
  const artifact = JSON.parse(readFileSync(join(genDir, file), "utf8"));
  for (const [symbol, v] of Object.entries(artifact.variables)) {
    const displayable = v.display_units?.length ? v.display_units : [v.si_unit];
    for (const unit of displayable) {
      checked += 1;
      if (!(unit in DISPLAY_FACTORS)) {
        failures.push(`${artifact.thing}: variable '${symbol}' display unit '${unit}'`);
      }
    }
  }
}

if (failures.length) {
  console.error(
    `check-units: ${failures.length} display unit(s) missing from DISPLAY_FACTORS ` +
      `(site/src/engines/units.ts) — the widget would show SI values under these labels:\n  ` +
      failures.join("\n  "),
  );
  process.exit(1);
}
console.log(`check-units: ${checked} display-unit reference(s) across all artifacts resolve OK`);
