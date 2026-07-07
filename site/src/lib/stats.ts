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

/**
 * Per-THING audit counts — the numbers behind one THING's verification story.
 * The SINGLE source for both the `/verification/` per-THING line and the
 * THING-page verification badge (D2), so the two can never disagree (the
 * wayfinding e2e cross-checks they don't). Same definitions as `catalogTotals`,
 * summed for one artifact instead of the whole catalog. Pass one entry's `.data`.
 */
export function thingAudit(a: CollectionEntry<"compiled">["data"]) {
  return {
    relations: a.relations.length,
    identities: a.derivation.filter((d) => d.check === "identity").length,
    modeling: a.derivation.filter((d) => d.check === "definition").length,
    envelopes: a.relations.reduce((n, r) => n + r.validity.length, 0),
    guards: a.configurations.reduce((n, c) => n + c.guards.length, 0),
    samples: a.configurations.reduce((n, c) => n + c.samples.length, 0),
  };
}
