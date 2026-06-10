// Relation-engine unit tests via node:test (Node 24 type-strips the .ts
// imports). Pins the scoped-refusal contract (model hand-off): an invalid
// envelope carrying `scope` poisons exactly the named variables and nothing
// else; an unscoped invalid still refuses the whole evaluation (invariant 5).
import assert from "node:assert/strict";
import { test } from "node:test";
import { RelationEngine } from "../src/engines/relation.ts";

/** Minimal two-model artifact: y1 governs below x=5, hard ceiling at x=100. */
const artifact = {
  schema_version: 1,
  thing: "fixture",
  title: "fixture",
  variables: {},
  relations: [
    {
      id: "model-a",
      group: "g",
      latex: "",
      residual_fn: "rel_a",
      assumptions: [],
      citation: "src",
      validity: [
        {
          guard_fn: "a_in_domain",
          kind: "predicate",
          severity: "invalid",
          message: "model A does not govern here",
          needs: ["x"],
          scope: ["y1"],
        },
      ],
    },
    {
      id: "ceiling",
      group: "g",
      latex: "",
      residual_fn: "rel_c",
      assumptions: [],
      citation: "src",
      validity: [
        {
          guard_fn: "below_ceiling",
          kind: "predicate",
          severity: "invalid",
          message: "no honest state at all",
          needs: ["x"],
        },
      ],
    },
  ],
  configurations: [
    {
      id: "default",
      label: "default",
      constraints: {},
      inputs: ["x"],
      plan: [
        { type: "eval", target: "y1", fn: "f_y1", latex: "" },
        { type: "eval", target: "y2", fn: "f_y2", latex: "" },
      ],
      branches: null,
      guards: [],
      samples: [],
    },
  ],
  material_binding: null,
};

const fns = {
  f_y1: ({ x }) => 2 * x,
  f_y2: ({ x }) => x + 1,
  a_in_domain: ({ x }) => x < 5,
  below_ceiling: ({ x }) => x < 100,
  rel_a: () => 0,
  rel_c: () => 0,
};

test("inside every envelope: no refusal of any kind", () => {
  const r = new RelationEngine(artifact, fns).evaluate("default", { x: 1 });
  assert.equal(r.invalid, false);
  assert.deepEqual(r.invalidVars, []);
  assert.equal(r.values.y1, 2);
  assert.equal(r.values.y2, 2);
});

test("scoped invalid poisons exactly the named variables, not the evaluation", () => {
  const r = new RelationEngine(artifact, fns).evaluate("default", { x: 10 });
  assert.equal(r.invalid, false); // the page still stands...
  assert.deepEqual(r.invalidVars, ["y1"]); // ...but y1 is refused
  assert.equal(r.values.y2, 11); // the other model's value is untouched
  assert.ok(r.messages.some((m) => m.severity === "invalid" && /model A/.test(m.message)));
});

test("unscoped invalid still refuses the whole evaluation", () => {
  const r = new RelationEngine(artifact, fns).evaluate("default", { x: 200 });
  assert.equal(r.invalid, true);
  assert.ok(r.messages.some((m) => /no honest state/.test(m.message)));
});

/** solve1d artifact: y·e^y = x rooted inside env-driven brackets (0, x]. */
const solveArtifact = {
  schema_version: 1,
  thing: "solve-fixture",
  title: "solve-fixture",
  variables: {},
  relations: [],
  configurations: [
    {
      id: "default",
      label: "default",
      constraints: {},
      inputs: ["x"],
      plan: [
        { type: "eval", target: "cap", fn: "f_cap", latex: "" },
        { type: "solve1d", target: "y", residual_fn: "rel_lambert", bracket_fns: ["b_lo", "b_hi"], latex: "" },
        { type: "eval", target: "z", fn: "f_z", latex: "" },
      ],
      branches: null,
      guards: [],
      samples: [],
    },
  ],
  material_binding: null,
};

const solveFns = {
  f_cap: ({ x }) => x,
  b_lo: () => 1e-12,
  b_hi: ({ cap }) => cap,
  rel_lambert: ({ x, y }) => y * Math.exp(y) - x,
  f_z: ({ y }) => 2 * y,
};

test("solve1d: bracket fns evaluate from the env and Brent roots the relation", () => {
  const r = new RelationEngine(solveArtifact, solveFns).evaluate("default", { x: 1 });
  assert.equal(r.invalid, false);
  assert.ok(Math.abs(r.values.y - 0.5671432904097838) < 1e-9); // Lambert W(1)
  assert.ok(Math.abs(r.values.z - 2 * r.values.y) < 1e-12); // downstream of the root
});

test("solve1d: an unbracketed state refuses honestly instead of inventing a root", () => {
  // x < 0: y·e^y - x > 0 across the whole bracket — no root exists
  const r = new RelationEngine(solveArtifact, solveFns).evaluate("default", { x: -1 });
  assert.equal(r.invalid, true);
  assert.ok(r.messages.some((m) => /y is undefined/.test(m.message)));
});
