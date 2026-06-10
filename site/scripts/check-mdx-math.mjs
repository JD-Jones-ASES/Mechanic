// Build gate: structural check on display math in authored MDX prose.
//
// remark-math only recognizes two display forms:
//   1. single-line:  $$ ... $$        (open and close on the same line)
//   2. fenced:       a line that is exactly $$, content lines, a closing $$
// A block that OPENS with content on the $$ line and closes on a LATER line
// is neither — the parser misfires and KaTeX swallows the rest of the file
// into one red error block. Four live pages shipped that way (combined-shaft,
// power-screw, simply-supported-beam, thin-tube-torsion, 2026-06-10): the
// artifact KaTeX gate never sees prose math, so this gate closes the hole.
// (astro.config.mjs additionally sets throwOnError so bad TeX inside a
// well-formed block also fails the build instead of rendering red.)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const CONTENT_DIR = join(import.meta.dirname, "..", "src", "content");

function* mdxFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* mdxFiles(p);
    else if (name.endsWith(".mdx") || name.endsWith(".md")) yield p;
  }
}

let violations = 0;
let checked = 0;
for (const file of mdxFiles(CONTENT_DIR)) {
  checked++;
  const rel = relative(join(CONTENT_DIR, ".."), file);
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  let fenceOpenLine = 0; // 0 = outside a $$-fence
  lines.forEach((line, i) => {
    const n = i + 1;
    const marks = (line.match(/\$\$/g) ?? []).length;
    if (fenceOpenLine) {
      if (line.trim() === "$$") fenceOpenLine = 0; // closing fence
      else if (marks > 0) {
        violations++;
        console.error(
          `MDX MATH [${rel}:${n}] '$$' inside an open $$-fence (opened line ${fenceOpenLine}) — close the fence with a bare $$ line first`,
        );
      }
      return;
    }
    if (line.trim() === "$$") {
      fenceOpenLine = n; // opening fence
      return;
    }
    if (marks % 2 !== 0) {
      violations++;
      console.error(
        `MDX MATH [${rel}:${n}] display math opens with content on the '$$' line but does not close on it — ` +
          `use a single line ($$ ... $$) or a bare-$$ fence; as written, KaTeX swallows the rest of the file`,
      );
    }
  });
  if (fenceOpenLine) {
    violations++;
    console.error(`MDX MATH [${rel}] $$-fence opened on line ${fenceOpenLine} is never closed`);
  }
}

if (violations) {
  console.error(`check-mdx-math: ${violations} violation(s)`);
  process.exit(1);
}
console.log(`check-mdx-math: display math well-formed across ${checked} prose file(s)`);
