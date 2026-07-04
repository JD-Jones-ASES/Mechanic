// Table plan step (ADR-0009) through the shared lookup and the RelationEngine.
// Pins: node-exact lookups, linear interpolation, out-of-domain / non-row NaN,
// and the runtime contract — an out-of-domain lookup is a SCOPED refusal (the
// column + its descendants land in invalidVars) that leaves the page standing,
// never a whole-page refusal.
import assert from "node:assert/strict";
import { test } from "node:test";
import { RelationEngine } from "../src/engines/relation.ts";
import { tableLookup } from "../src/engines/table.ts";

const ROWS = [
  [10, 0.2],
  [20, 0.32],
  [40, 0.5],
];

test("tableLookup: node-exact returns the stored value with no interpolation", () => {
  assert.equal(tableLookup(ROWS, 10, "interpolate-linear", 1), 0.2);
  assert.equal(tableLookup(ROWS, 20, "interpolate-linear", 1), 0.32);
  assert.equal(tableLookup(ROWS, 40, "interpolate-linear", 1), 0.5);
});

test("tableLookup: interpolate-linear between rows", () => {
  // midway 10->20: 0.2 + (0.32-0.2)/2 = 0.26
  assert.ok(Math.abs(tableLookup(ROWS, 15, "interpolate-linear", 1) - 0.26) < 1e-12);
  // quarter 20->40: 0.32 + (0.5-0.32)*0.25 = 0.365
  assert.ok(Math.abs(tableLookup(ROWS, 25, "interpolate-linear", 1) - 0.365) < 1e-12);
});

test("tableLookup: refuses (NaN) strictly outside the domain — no extrapolation", () => {
  assert.ok(Number.isNaN(tableLookup(ROWS, 9.999, "interpolate-linear", 1)));
  assert.ok(Number.isNaN(tableLookup(ROWS, 40.001, "interpolate-linear", 1)));
  assert.ok(Number.isNaN(tableLookup(ROWS, NaN, "interpolate-linear", 1)));
});

test("tableLookup: exact-row resolves only exact rows", () => {
  assert.equal(tableLookup(ROWS, 20, "exact-row", 1), 0.32);
  assert.ok(Number.isNaN(tableLookup(ROWS, 15, "exact-row", 1)));
});

/** A table step filling Y, with s = W·Y downstream (a descendant of Y). */
const artifact = {
  schema_version: 1,
  thing: "table-fixture",
  title: "table-fixture",
  variables: {},
  relations: [],
  configurations: [
    {
      id: "default",
      label: "default",
      constraints: {},
      inputs: ["n", "W"],
      plan: [
        {
          type: "table",
          targets: ["Y"],
          table_id: "demo",
          arg_fn: "arg_n",
          mode: "interpolate-linear",
          rows: ROWS,
          domain: [10, 40],
          guard: {
            severity: "invalid",
            message: "Y is off the table",
            citation: "src",
            scope: ["Y", "s"],
          },
          latex: "",
        },
        { type: "eval", target: "s", fn: "f_s", latex: "" },
      ],
      branches: null,
      guards: [],
      samples: [],
    },
  ],
  material_binding: null,
};

const fns = {
  arg_n: ({ n }) => n,
  f_s: ({ W, Y }) => W * Y,
};

test("table step in domain: value looked up, descendant computed, no refusal", () => {
  const r = new RelationEngine(artifact, fns).evaluate("default", { n: 15, W: 1000 });
  assert.equal(r.invalid, false);
  assert.deepEqual(r.invalidVars, []);
  assert.ok(Math.abs(r.values.Y - 0.26) < 1e-12);
  assert.ok(Math.abs(r.values.s - 260) < 1e-9); // 1000 * 0.26
});

test("table step out of domain: SCOPED refusal (Y + descendant s), page stands", () => {
  const r = new RelationEngine(artifact, fns).evaluate("default", { n: 60, W: 1000 });
  assert.equal(r.invalid, false); // the whole page is NOT refused...
  assert.deepEqual(r.invalidVars, ["Y", "s"]); // ...only the column and its descendant
  assert.ok(r.messages.some((m) => m.severity === "invalid" && /off the table/.test(m.message)));
  assert.ok(r.messages.some((m) => m.citation === "src")); // the table's citation rides along
  // the descendant's NaN is expected (it will be blanked via invalidVars), NOT
  // escalated into a whole-page refusal
  assert.ok(Number.isNaN(r.values.s));
});
