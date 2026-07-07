// Engine unit tests for the chain-eval orchestration (S21), via node:test
// (Node 24 type-strips the .ts imports). Synthetic THINGs keep the rules
// deterministic and independent of the (gitignored) generated artifacts.
//
// The load-bearing test is `refusal with all-finite upstream values` below: it
// pins the invariant-5 fix that a refused-but-finite value cannot cross a wire.
import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyBoundInput, evaluateChain, planTargets } from "../src/engines/chain-eval.ts";

// ---- synthetic artifact builders -------------------------------------------
// All ports are zero-vector `ratio` so any wire is dimensionally legal; the
// tests are about orchestration, not the type system (that is chain.test.mjs).
const ZERO = [0, 0, 0, 0, 0, 0, 0];
const variable = (role) => ({
  name: "", latex: "", dim: ZERO, quantity_kind: "ratio", si_unit: "1",
  display_units: [], default: 0, bounds: null, integer: false, role,
});

// Source THING: y = 2x, w = x + 100. `validity` is attached to the y-relation so
// a test can make y (or the whole node) refuse while every value stays FINITE.
function srcThing(validity = []) {
  return {
    schema_version: 1, thing: "src", title: "Source",
    variables: { x: variable("free"), y: variable("derived"), w: variable("derived") },
    relations: [
      { id: "def-y", group: "g", latex: "y=2x", residual_fn: "rel_def_y", assumptions: ["y is twice x"], validity, citation: "srcCiteY" },
      { id: "def-w", group: "g", latex: "w=x+100", residual_fn: "rel_def_w", assumptions: ["w is x plus 100"], validity: [], citation: "srcCiteW" },
    ],
    configurations: [{
      id: "c", label: "c", constraints: {}, inputs: ["x"],
      plan: [
        { type: "eval", target: "y", fn: "eval_y", latex: "" },
        { type: "eval", target: "w", fn: "eval_w", latex: "" },
      ],
      branches: null, guards: [], samples: [],
    }],
    material_binding: null, material_defaults: null,
    sources: [{ id: "srcCiteY", citation: "Source Y" }, { id: "srcCiteW", citation: "Source W" }],
  };
}
const srcFns = {
  eval_y: (e) => 2 * e.x,
  eval_w: (e) => e.x + 100,
  rel_def_y: (e) => e.y - 2 * e.x,
  rel_def_w: (e) => e.w - (e.x + 100),
  // valid WHILE x <= 5 (relation.ts pushes the message when this is FALSE)
  v_le5: (e) => e.x <= 5,
};
const invalidWhenHigh = { guard_fn: "v_le5", kind: "predicate", severity: "invalid", message: "src refused", needs: ["x"] };
const scopedWhenHigh = { ...invalidWhenHigh, message: "src y refused", scope: ["y"] };
const warnWhenHigh = { guard_fn: "v_le5", kind: "predicate", severity: "warn", message: "src warns", needs: ["x"] };

// Sink THING: z = u + 1 (one bound input u, one output z).
function dstThing() {
  return {
    schema_version: 1, thing: "dst", title: "Dest",
    variables: { u: variable("free"), z: variable("derived") },
    relations: [{ id: "def-z", group: "g", latex: "z=u+1", residual_fn: "rel_def_z", assumptions: ["z is u plus one"], validity: [], citation: "dstCite" }],
    configurations: [{
      id: "c", label: "c", constraints: {}, inputs: ["u"],
      plan: [{ type: "eval", target: "z", fn: "eval_z", latex: "" }],
      branches: null, guards: [], samples: [],
    }],
    material_binding: null, material_defaults: null, sources: [{ id: "dstCite", citation: "Source Z" }],
  };
}
const dstFns = { eval_z: (e) => e.u + 1, rel_def_z: (e) => e.z - (e.u + 1) };

// Relay THING: p = u * 10 — for a 3-node transitive-provenance chain.
function relayThing() {
  return {
    schema_version: 1, thing: "mid", title: "Relay",
    variables: { u: variable("free"), p: variable("derived") },
    relations: [{ id: "def-p", group: "g", latex: "p=10u", residual_fn: "rel_def_p", assumptions: ["p is ten u"], validity: [], citation: "midCite" }],
    configurations: [{
      id: "c", label: "c", constraints: {}, inputs: ["u"],
      plan: [{ type: "eval", target: "p", fn: "eval_p", latex: "" }],
      branches: null, guards: [], samples: [],
    }],
    material_binding: null, material_defaults: null, sources: [{ id: "midCite", citation: "Source P" }],
  };
}
const relayFns = { eval_p: (e) => e.u * 10, rel_def_p: (e) => e.p - 10 * e.u };

const srcNode = (id, x, validity = []) => ({ instanceId: id, artifact: srcThing(validity), configId: "c", fns: srcFns, knobs: { x } });
const dstNode = (id) => ({ instanceId: id, artifact: dstThing(), configId: "c", fns: dstFns, knobs: {} });
const relayNode = (id) => ({ instanceId: id, artifact: relayThing(), configId: "c", fns: relayFns, knobs: {} });
const wire = (fromNode, fromPort, toNode, toPort) => ({ from: { node: fromNode, port: fromPort }, to: { node: toNode, port: toPort } });

// ---- tests -----------------------------------------------------------------

test("planTargets flattens eval and table steps to produced variables", () => {
  const plan = [
    { type: "eval", target: "a" },
    { type: "table", targets: ["b", "c"] },
    { type: "solve1d", target: "d" },
  ];
  assert.deepEqual(planTargets(plan), ["a", "b", "c", "d"]);
});

test("evaluation order is forward; a clean chain forwards the bound value", () => {
  const r = evaluateChain([srcNode("src", 1), dstNode("dst")], [wire("src", "y", "dst", "u")]);
  assert.deepEqual(r.order, ["src", "dst"]);
  assert.equal(r.nodes.src.status, "evaluated");
  assert.equal(r.nodes.dst.status, "evaluated");
  assert.equal(r.nodes.src.result.values.y, 2); // 2 * 1
  assert.equal(r.nodes.dst.result.values.z, 3); // (bound u = 2) + 1
});

test("refusal with all-finite upstream values cannot reach downstream (rule a)", () => {
  // x = 10 trips the y-relation's UNSCOPED invalid validity — which fires AFTER
  // the plan ran, so src's y and w are computed and FINITE while invalid=true.
  const r = evaluateChain([srcNode("src", 10, [invalidWhenHigh]), dstNode("dst")], [wire("src", "y", "dst", "u")]);

  // the upstream value really is finite (this is the trap NaN-sniffing misses)
  assert.equal(Number.isFinite(r.nodes.src.result.values.y), true);
  assert.equal(r.nodes.src.result.values.y, 20);
  assert.equal(r.nodes.src.result.invalid, true);

  // ...and yet it did NOT become dst's z = 21
  assert.equal(r.nodes.dst.status, "refused-by-upstream");
  assert.equal(r.nodes.dst.result.invalid, true);
  assert.equal(Number.isFinite(r.nodes.dst.result.values.z), false); // never computed from a withheld input
  assert.deepEqual(r.nodes.dst.refusedBy, [{ instance: "src", port: "y" }]);
  assert.equal(
    r.nodes.dst.result.messages[0].message,
    `refused by upstream: 'src' is invalid — bound input 'u' withheld`,
  );
});

test("scoped refusal withholds only the bindings reading the poisoned port (rule b)", () => {
  // x = 10 trips a SCOPED invalid on y only; y is finite-but-poisoned, w clean.
  const nodes = [srcNode("src", 10, [scopedWhenHigh]), dstNode("dstY"), dstNode("dstW")];
  const r = evaluateChain(nodes, [wire("src", "y", "dstY", "u"), wire("src", "w", "dstW", "u")]);

  assert.equal(r.nodes.src.result.invalid, false); // node is NOT globally refused
  assert.deepEqual(r.nodes.src.result.invalidVars, ["y"]);
  assert.equal(Number.isFinite(r.nodes.src.result.values.y), true); // finite, but scoped-out

  // the binding reading y is withheld...
  assert.equal(r.nodes.dstY.status, "refused-by-upstream");
  assert.equal(
    r.nodes.dstY.result.messages[0].message,
    `refused by upstream: 'src.y' is refused — bound input 'u' withheld`,
  );
  // ...the binding reading the clean port w flows normally
  assert.equal(r.nodes.dstW.status, "evaluated");
  assert.equal(r.nodes.dstW.result.values.z, 111); // (bound w = 110) + 1
});

test("warn-severity upstream forwards the value and does not propagate (rule c)", () => {
  const r = evaluateChain([srcNode("src", 10, [warnWhenHigh]), dstNode("dst")], [wire("src", "y", "dst", "u")]);
  assert.equal(r.nodes.src.result.invalid, false);
  assert.equal(r.nodes.src.result.messages.some((m) => m.severity === "warn" && m.message === "src warns"), true);
  // value forwards; the warn stays local to src (dst carries none of it)
  assert.equal(r.nodes.dst.status, "evaluated");
  assert.equal(r.nodes.dst.result.values.z, 21); // (bound y = 20) + 1
  assert.equal(r.nodes.dst.result.messages.length, 0);
});

test("classifyBoundInput covers all four rules, incl. the incomplete case (rule d)", () => {
  const evaluated = (values, extra = {}) => ({ instanceId: "s", status: "evaluated", refusedBy: [], result: { values, messages: [], invalid: false, invalidVars: [], ...extra } });
  // (d) source absent / port never produced / stray NaN -> incomplete, never forward
  assert.deepEqual(classifyBoundInput(undefined, "y"), { effect: "incomplete" });
  assert.deepEqual(classifyBoundInput(evaluated({}), "y"), { effect: "incomplete" });
  assert.deepEqual(classifyBoundInput(evaluated({ y: NaN }), "y"), { effect: "incomplete" });
  // (a) global invalid, even with a finite value present
  assert.deepEqual(classifyBoundInput(evaluated({ y: 20 }, { invalid: true }), "y"), { effect: "withheld-global" });
  // (a) transitive: a node refused-by-upstream poisons its own downstream
  assert.deepEqual(classifyBoundInput({ instanceId: "s", status: "refused-by-upstream", refusedBy: [], result: { values: { y: 20 }, messages: [], invalid: true, invalidVars: [] } }, "y"), { effect: "withheld-global" });
  // (b) scoped
  assert.deepEqual(classifyBoundInput(evaluated({ y: 20 }, { invalidVars: ["y"] }), "y"), { effect: "withheld-scoped" });
  // (c)/clean forward
  assert.deepEqual(classifyBoundInput(evaluated({ y: 20 }), "y"), { effect: "forward", value: 20 });
});

test("duplicate-THING instances evaluate independently (per-instance engines)", () => {
  const r = evaluateChain([srcNode("srcA", 1), srcNode("srcB", 3)], []);
  assert.equal(r.nodes.srcA.result.values.y, 2); // 2 * 1
  assert.equal(r.nodes.srcB.result.values.y, 6); // 2 * 3 — no shared state
});

test("provenance lists every relation citation on the upstream path", () => {
  const r = evaluateChain([srcNode("src", 1), dstNode("dst")], [wire("src", "y", "dst", "u")]);
  assert.equal(r.provenance.length, 1);
  const rec = r.provenance[0];
  assert.deepEqual(rec.from, { instance: "src", port: "y" });
  assert.deepEqual(rec.to, { instance: "dst", port: "u" });
  assert.equal(rec.value, 2);
  assert.equal(rec.withheld, false);
  // both of the source THING's cited relations are on the path (node-level v1)
  assert.deepEqual(rec.citations, ["srcCiteY", "srcCiteW"]);
  assert.equal(rec.relations.some((x) => x.id === "def-y" && x.instance === "src"), true);
  assert.equal(rec.relations.some((x) => x.id === "def-w"), true);
});

test("provenance is transitive across a 3-node chain", () => {
  // src.y -> mid.u ; mid.p -> dst.u
  const nodes = [srcNode("src", 1), relayNode("mid"), dstNode("dst")];
  const bindings = [wire("src", "y", "mid", "u"), wire("mid", "p", "dst", "u")];
  const r = evaluateChain(nodes, bindings);
  assert.deepEqual(r.order, ["src", "mid", "dst"]);
  const midToDst = r.provenance.find((p) => p.from.instance === "mid" && p.to.instance === "dst");
  // the value into dst rests on BOTH the relay's and the source's citations
  assert.deepEqual(midToDst.citations, ["srcCiteY", "srcCiteW", "midCite"]);
  assert.equal(r.nodes.dst.result.values.z, 21); // ((y=2)*10) + 1
});

test("a withheld binding still yields a provenance record, with value null", () => {
  const r = evaluateChain([srcNode("src", 10, [invalidWhenHigh]), dstNode("dst")], [wire("src", "y", "dst", "u")]);
  assert.equal(r.provenance.length, 1);
  assert.equal(r.provenance[0].withheld, true);
  assert.equal(r.provenance[0].value, null);
});
