// Build gate: the generated JS functions must reproduce SymPy's high-precision
// sample outputs (the parity oracle embedded in each artifact by compile.py).
// Catches printer bugs, CSE mistakes, and JS numeric pathologies before deploy.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const GENERATED_DIR = join(import.meta.dirname, "..", "src", "generated", "things");
const RTOL = 1e-9;

let files;
try {
  files = readdirSync(GENERATED_DIR).filter((f) => f.endsWith(".compiled.json"));
} catch {
  console.error(`check-parity: no generated artifacts — run 'pnpm run gen' first`);
  process.exit(1);
}

let failures = 0;
let checked = 0;
for (const f of files) {
  const artifact = JSON.parse(readFileSync(join(GENERATED_DIR, f), "utf8"));
  // Node 24 type-strips the generated .ts on import (erasable syntax only).
  const { fns } = await import(pathToFileURL(join(GENERATED_DIR, `${artifact.thing}.fns.ts`)).href);
  for (const cfg of artifact.configurations) {
    for (const [si, sample] of cfg.samples.entries()) {
      const env = { ...sample.inputs };
      for (const [k, v] of Object.entries(cfg.constraints)) {
        if (typeof v === "number") env[k] = v;
      }
      for (const step of cfg.plan) {
        if (step.type !== "eval" || !step.fn) continue; // branch steps compared per-branch below
        env[step.target] = fns[step.fn](env);
      }
      for (const [target, expected] of Object.entries(sample.outputs)) {
        if (!(target in env)) continue;
        checked++;
        const got = env[target];
        const scale = Math.max(Math.abs(expected), 1e-30);
        if (!Number.isFinite(got) || Math.abs(got - expected) / scale > RTOL) {
          failures++;
          console.error(
            `PARITY FAIL [${artifact.thing}/${cfg.id}] sample ${si} ${target}: js=${got} sympy=${expected}`,
          );
        }
      }
    }
  }
}
if (failures) {
  console.error(`check-parity: ${failures} mismatch(es)`);
  process.exit(1);
}
console.log(`check-parity: ${checked} values match SymPy across ${files.length} artifact(s)`);
