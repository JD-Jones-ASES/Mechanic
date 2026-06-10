// Build gate: every LaTeX string in every compiled artifact must render in
// KaTeX (docs/architecture.md "LaTeX gate"). Unrenderable math fails the build
// loudly instead of shipping a silently-broken formula.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import katex from "katex";

const GENERATED = join(import.meta.dirname, "..", "src", "generated", "things");

function* latexStrings(artifact) {
  for (const [sym, v] of Object.entries(artifact.variables)) yield [`variable ${sym}`, v.latex];
  for (const r of artifact.relations) yield [`relation ${r.id}`, r.latex];
  for (const c of artifact.configurations) {
    for (const step of c.plan) {
      if (typeof step.latex === "string") yield [`config ${c.id} step ${step.target}`, step.latex];
      else if (step.latex) for (const [b, s] of Object.entries(step.latex)) yield [`config ${c.id} step ${step.target} [${b}]`, s];
    }
  }
  for (const [i, d] of artifact.derivation.entries()) yield [`derivation step ${i + 1}`, d.latex];
}

let files;
try {
  files = readdirSync(GENERATED).filter((f) => f.endsWith(".compiled.json"));
} catch {
  console.error(`check-katex: no generated artifacts at ${GENERATED} — run 'pnpm run gen' first`);
  process.exit(1);
}

let failures = 0;
let checked = 0;
for (const f of files) {
  const artifact = JSON.parse(readFileSync(join(GENERATED, f), "utf8"));
  for (const [where, tex] of latexStrings(artifact)) {
    checked++;
    try {
      katex.renderToString(tex, { throwOnError: true, displayMode: true });
    } catch (e) {
      failures++;
      console.error(`KATEX FAIL [${artifact.thing}] ${where}: ${tex}\n  ${e.message}`);
    }
  }
}
if (failures) {
  console.error(`check-katex: ${failures} unrenderable string(s)`);
  process.exit(1);
}
console.log(`check-katex: ${checked} strings render across ${files.length} artifact(s)`);
