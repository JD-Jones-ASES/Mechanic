import type { CollectionEntry } from "astro:content";

/**
 * Build-proof catalog totals, computed from the compiled artifacts. This is the
 * SINGLE source for the numbers shown identically on the home hero and on
 * /verification/ — so the two "honesty" surfaces can never drift (invariant 5).
 * Pass the mapped `.data` of `getCollection("compiled")`.
 */
export function catalogTotals(compiled: CollectionEntry<"compiled">["data"][]) {
  return {
    things: compiled.length,
    relations: compiled.reduce((n, a) => n + a.relations.length, 0),
    identities: compiled.reduce(
      (n, a) => n + a.derivation.filter((d) => d.check === "identity").length,
      0,
    ),
    modeling: compiled.reduce(
      (n, a) => n + a.derivation.filter((d) => d.check === "definition").length,
      0,
    ),
    samples: compiled.reduce(
      (n, a) => n + a.configurations.reduce((m, c) => m + c.samples.length, 0),
      0,
    ),
  };
}
