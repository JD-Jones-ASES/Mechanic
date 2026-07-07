// Unit tests for the chain-builder pure model (S22), via node:test (Node 24
// type-strips the .ts imports). Synthetic THINGs keep the store logic and the
// rejection strings deterministic and independent of the (gitignored) generated
// artifacts — the same discipline as chain-eval.test.mjs.
//
// What is pinned here: the serializable-store mutations, the THREE wire-rejection
// modes (dimension / quantity-kind / feedback-loop) + fan-in, the material
// cascade through a resolved node, refusal propagation, and every branch of the
// node UI-state derivation (incomplete included — unreachable end-to-end, so it
// is pinned here rather than in e2e; see chain-builder-model.ts).
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addNode,
  boundInputsOf,
  buildSpecs,
  defaultMaterialId,
  emptyStore,
  evaluateStore,
  MAX_NODES,
  mergedBinding,
  nextInstanceId,
  nodeUiState,
  qualifyingMaterials,
  removeBinding,
  removeNode,
  setDisplayUnit,
  setKnob,
  setMaterial,
  tryConnect,
} from "../src/components/chain-builder-model.ts";

/* ---------------- synthetic artifacts ---------------- */
const ZERO = [0, 0, 0, 0, 0, 0, 0];
const TORQUE = [2, 1, -2, 0, 0, 0, 0];
const variable = (role, kind = "ratio", dim = ZERO, extra = {}) => ({
  name: "", latex: "", dim, quantity_kind: kind, si_unit: "1",
  display_units: [], default: 1, bounds: null, integer: false, role, ...extra,
});

// Source: two outputs — T (torque) and N (a count), so one source exercises
// BOTH the dimension-mismatch and the same-dimension/quantity-kind-mismatch wire.
// Optional validity on the T-relation lets a test refuse the whole node.
function srcThing(validity = []) {
  return {
    schema_version: 1, thing: "src", title: "Source",
    variables: {
      x: variable("free"),
      T: variable("derived", "torque", TORQUE),
      N: variable("derived", "count", ZERO),
    },
    relations: [
      { id: "def-T", group: "g", latex: "", residual_fn: "r_T", assumptions: [], validity, citation: "cT" },
      { id: "def-N", group: "g", latex: "", residual_fn: "r_N", assumptions: [], validity: [], citation: "cN" },
    ],
    configurations: [{
      id: "c", label: "C", constraints: {}, inputs: ["x"],
      plan: [
        { type: "eval", target: "T", fn: "e_T", latex: "" },
        { type: "eval", target: "N", fn: "e_N", latex: "" },
      ],
      branches: null, guards: [], samples: [],
    }],
    material_binding: null, material_defaults: null,
    sources: [{ id: "cT", citation: "Src T" }, { id: "cN", citation: "Src N" }],
  };
}
const srcFns = {
  e_T: (e) => 2 * e.x, e_N: (e) => e.x,
  r_T: (e) => e.T - 2 * e.x, r_N: (e) => e.N - e.x,
  vle5: (e) => e.x <= 5, // valid WHILE x<=5 (relation.ts fires when FALSE)
};
const refuseWhenHigh = { guard_fn: "vle5", kind: "predicate", severity: "invalid", message: "src refused", needs: ["x"] };
const warnWhenHigh = { ...refuseWhenHigh, severity: "warn", message: "src warns" };

// Sink: input T (torque), material-bound E, output P = T + E — so a test can see
// both the forwarded wire value AND the material cascade in one number. Also has
// a ratio-kind output P (dim ZERO) so a cycle back into the source's ratio input
// is type-legal (and therefore rejected only by the loop check).
function sinkThing(withMaterial = true) {
  return {
    schema_version: 1, thing: "sink", title: "Sink",
    variables: {
      T: variable("free", "torque", TORQUE),
      E: variable("material"),
      P: variable("derived"),
    },
    relations: [{ id: "def-P", group: "g", latex: "", residual_fn: "r_P", assumptions: [], validity: [], citation: "cP" }],
    configurations: [{
      id: "c", label: "C", constraints: {}, inputs: ["T"],
      plan: [{ type: "eval", target: "P", fn: "e_P", latex: "" }],
      branches: null, guards: [], samples: [],
    }],
    material_binding: withMaterial ? { default: { E: "youngs_modulus" } } : null,
    material_defaults: null,
    sources: [{ id: "cP", citation: "Src P" }],
  };
}
const sinkFns = { e_P: (e) => e.T + (e.E ?? 0), r_P: (e) => e.P - (e.T + (e.E ?? 0)) };

// A ratio-input sink, for the quantity-kind-mismatch wire (K is a ratio; the
// source's N is a count — identical ZERO dimension, different meaning).
function ratioSink() {
  return {
    schema_version: 1, thing: "rat", title: "RatioSink",
    variables: { K: variable("free", "ratio", ZERO), Q: variable("derived") },
    relations: [{ id: "def-Q", group: "g", latex: "", residual_fn: "r_Q", assumptions: [], validity: [], citation: "cQ" }],
    configurations: [{
      id: "c", label: "C", constraints: {}, inputs: ["K"],
      plan: [{ type: "eval", target: "Q", fn: "e_Q", latex: "" }],
      branches: null, guards: [], samples: [],
    }],
    material_binding: null, material_defaults: null, sources: [{ id: "cQ", citation: "Src Q" }],
  };
}
const ratFns = { e_Q: (e) => e.K, r_Q: (e) => e.Q - e.K };

const prop = (key, value_si) => ({
  key, basis: "typical", value_published: value_si, unit_published: "SI",
  value_si, unit_si: "SI", source_id: "s", citation: "c",
});
const MATERIALS = [
  { id: "steel", name: "Steel", class: "metal", condition: "", cost_class: "low", properties: [prop("youngs_modulus", 200e9)] },
  { id: "alu", name: "Aluminum", class: "metal", condition: "", cost_class: "low", properties: [prop("youngs_modulus", 70e9)] },
  { id: "glass", name: "GlassNoMod", class: "ceramic", condition: "", cost_class: "low", properties: [prop("density", 2500)] },
];

const loadedOf = (validity = []) => ({
  src: { artifact: srcThing(validity), fns: srcFns },
  sink: { artifact: sinkThing(true), fns: sinkFns },
  rat: { artifact: ratioSink(), fns: ratFns },
});

/* ---------------- store mutations ---------------- */

test("addNode assigns n1.., seeds knob defaults, and lands a material", () => {
  let s = emptyStore();
  s = addNode(s, "src", "c", srcThing(), MATERIALS);
  assert.deepEqual(s.nodes, [{ id: "n1", slug: "src", config: "c" }]);
  assert.deepEqual(s.knobs.n1, { x: 1 }); // the one free input, at its default
  assert.equal(s.materials.n1, undefined); // src binds no material

  s = addNode(s, "sink", "c", sinkThing(true), MATERIALS);
  assert.equal(s.nodes[1].id, "n2");
  assert.equal(s.materials.n2, "steel"); // first qualifying material lands
  assert.deepEqual(s.knobs.n2, { T: 1 });
});

test("node cap is enforced at MAX_NODES", () => {
  let s = emptyStore();
  for (let i = 0; i < MAX_NODES; i++) s = addNode(s, "src", "c", srcThing(), MATERIALS);
  assert.equal(s.nodes.length, MAX_NODES);
  const same = addNode(s, "src", "c", srcThing(), MATERIALS);
  assert.equal(same, s); // unchanged store, no 7th node
});

test("removeNode prunes the node, its wires, and ALL its per-node state", () => {
  let s = emptyStore();
  s = addNode(s, "src", "c", srcThing(), MATERIALS);
  s = addNode(s, "sink", "c", sinkThing(true), MATERIALS); // n2 carries a material slot
  s = setDisplayUnit(s, "n2", "P", "kW");
  s = tryConnect(s, loadedOf(), { node: "n1", port: "T" }, { node: "n2", port: "T" }).store;
  assert.equal(s.materials.n2, "steel");
  s = removeNode(s, "n2");
  assert.deepEqual(s.nodes.map((n) => n.id), ["n1"]);
  assert.equal(s.bindings.length, 0); // the dangling wire is gone
  assert.equal(s.knobs.n2, undefined);
  assert.equal(s.materials.n2, undefined); // (drop `materials` pruning → this fails)
  assert.equal(s.displayUnits.n2, undefined); // (drop `displayUnits` pruning → this fails)
});

test("nextInstanceId reuses the lowest free slot after a removal", () => {
  let s = emptyStore();
  for (const slug of ["src", "src", "src"]) s = addNode(s, slug, "c", srcThing(), MATERIALS);
  s = removeNode(s, "n2");
  assert.equal(nextInstanceId(s), "n2");
});

/* ---------------- material qualification ---------------- */

test("qualifying materials publish every bound property; default is the first", () => {
  const a = sinkThing(true);
  assert.deepEqual(mergedBinding(a), { E: "youngs_modulus" });
  assert.deepEqual(qualifyingMaterials(a, MATERIALS).map((m) => m.id), ["steel", "alu"]); // glass excluded
  assert.equal(defaultMaterialId(a, MATERIALS), "steel");
});

/* ---------------- the three wire rejections + fan-in ---------------- */

function twoNodes() {
  let s = emptyStore();
  s = addNode(s, "src", "c", srcThing(), MATERIALS);
  s = addNode(s, "sink", "c", sinkThing(true), MATERIALS);
  return s;
}

test("a legal wire is type-checked and appended", () => {
  const out = tryConnect(twoNodes(), loadedOf(), { node: "n1", port: "T" }, { node: "n2", port: "T" });
  assert.ok(out.ok);
  assert.deepEqual(out.store.bindings, [{ from: { node: "n1", port: "T" }, to: { node: "n2", port: "T" } }]);
});

test("dimension mismatch is rejected with the engine's reason", () => {
  let s = emptyStore();
  s = addNode(s, "src", "c", srcThing(), MATERIALS);
  s = addNode(s, "rat", "c", ratioSink(), MATERIALS);
  const out = tryConnect(s, loadedOf(), { node: "n1", port: "T" }, { node: "n2", port: "K" });
  assert.equal(out.ok, false);
  assert.match(out.reason, /dimension mismatch/);
});

test("quantity-kind mismatch is rejected (same dimension, different meaning)", () => {
  let s = emptyStore();
  s = addNode(s, "src", "c", srcThing(), MATERIALS);
  s = addNode(s, "rat", "c", ratioSink(), MATERIALS);
  const out = tryConnect(s, loadedOf(), { node: "n1", port: "N" }, { node: "n2", port: "K" });
  assert.equal(out.ok, false);
  assert.match(out.reason, /quantity kind mismatch: count → ratio/);
});

test("a wire that closes a loop is rejected as a feedback loop", () => {
  let s = twoNodes();
  s = tryConnect(s, loadedOf(), { node: "n1", port: "T" }, { node: "n2", port: "T" }).store;
  // sink.P (ratio, ZERO) → src.x (ratio, ZERO) is type-legal but would cycle
  const out = tryConnect(s, loadedOf(), { node: "n2", port: "P" }, { node: "n1", port: "x" });
  assert.equal(out.ok, false);
  assert.match(out.reason, /feedback loop/);
});

test("fan-in (a second wire into one input) is rejected", () => {
  let s = emptyStore();
  s = addNode(s, "src", "c", srcThing(), MATERIALS);
  s = addNode(s, "src", "c", srcThing(), MATERIALS);
  s = addNode(s, "sink", "c", sinkThing(true), MATERIALS);
  const L = loadedOf();
  s = tryConnect(s, L, { node: "n1", port: "T" }, { node: "n3", port: "T" }).store;
  const out = tryConnect(s, L, { node: "n2", port: "T" }, { node: "n3", port: "T" });
  assert.equal(out.ok, false);
  assert.match(out.reason, /already has a wire/);
});

/* ---------------- specs, evaluation, material cascade ---------------- */

test("buildSpecs feeds only UNBOUND inputs as knobs and resolves the material", () => {
  let s = twoNodes();
  s = tryConnect(s, loadedOf(), { node: "n1", port: "T" }, { node: "n2", port: "T" }).store;
  const specs = buildSpecs(s, loadedOf(), MATERIALS);
  const sink = specs.find((x) => x.instanceId === "n2");
  assert.deepEqual(sink.knobs, {}); // T is wired, so it is NOT a knob
  assert.deepEqual(sink.materialValues, { E: 200e9 }); // steel resolved
});

test("a chain evaluates in planner order and the material cascades downstream", () => {
  let s = twoNodes();
  s = tryConnect(s, loadedOf(), { node: "n1", port: "T" }, { node: "n2", port: "T" }).store;

  let out = evaluateStore(s, loadedOf(), MATERIALS);
  assert.ok(out.ready);
  assert.deepEqual(out.result.order, ["n1", "n2"]); // source before sink
  // src.x default 1 → T = 2 (wired); steel E = 200e9 → P = T + E
  assert.equal(out.result.nodes.n2.result.values.P, 2 + 200e9);

  // swap the downstream material — the number moves, invariant 3
  s = setMaterial(s, "n2", "alu");
  out = evaluateStore(s, loadedOf(), MATERIALS);
  assert.equal(out.result.nodes.n2.result.values.P, 2 + 70e9);
});

test("evaluateStore reports not-ready while a node's module is unloaded", () => {
  let s = twoNodes();
  const partial = { src: loadedOf().src }; // sink module missing
  const out = evaluateStore(s, partial, MATERIALS);
  assert.equal(out.ready, false);
  assert.equal(out.result, null);
});

/* ---------------- refusal propagation + UI state derivation ---------------- */

test("an upstream refusal withholds the wire and marks the sink refused-upstream", () => {
  let s = twoNodes();
  s = tryConnect(s, loadedOf([refuseWhenHigh]), { node: "n1", port: "T" }, { node: "n2", port: "T" }).store;
  s = setKnob(s, "n1", "x", 10); // x > 5 → src's own envelope refuses (all-finite)

  const out = evaluateStore(s, loadedOf([refuseWhenHigh]), MATERIALS);
  assert.equal(out.result.nodes.n1.status, "evaluated");
  assert.equal(out.result.nodes.n1.result.invalid, true); // local refusal
  assert.equal(nodeUiState(out.result.nodes.n1), "refused");
  assert.equal(out.result.nodes.n2.status, "refused-by-upstream");
  assert.equal(nodeUiState(out.result.nodes.n2), "refused-upstream");
  // the refused-but-FINITE T never reached the sink (invariant 5)
  assert.equal(out.result.nodes.n2.result.invalid, true);
});

test("nodeUiState maps every engine status to a distinct display state", () => {
  // build a NodeEvalRecord with sensible defaults, overriding status/result parts
  const rec = ({ status = "evaluated", invalid = false, invalidVars = [], messages = [] } = {}) => ({
    instanceId: "n", status, refusedBy: [],
    result: { values: {}, messages, invalid, invalidVars },
  });
  assert.equal(nodeUiState(undefined), "loading");
  assert.equal(nodeUiState(rec()), "ok");
  assert.equal(nodeUiState(rec({ messages: [{ severity: "warn", message: "w" }] })), "warn");
  assert.equal(nodeUiState(rec({ invalid: true })), "refused");
  // SCOPED refusal: invalidVars set, invalid=false, an invalid-severity message.
  // Must NOT read as "ok"/"warn" — invariant 5 applies to the state chip too.
  // (This is exactly the case the pre-fix nodeUiState mislabeled "ok".)
  assert.equal(
    nodeUiState(rec({ invalidVars: ["P_cr"], messages: [{ severity: "invalid", message: "scoped" }] })),
    "partial",
  );
  // a global invalid still wins over invalidVars
  assert.equal(nodeUiState(rec({ invalid: true, invalidVars: ["x"] })), "refused");
  // upstream/incomplete status wins even if the node's own eval looks clean
  assert.equal(nodeUiState(rec({ status: "refused-by-upstream" })), "refused-upstream");
  assert.equal(nodeUiState(rec({ status: "incomplete" })), "incomplete");
});

test("removeBinding drops one wire by index", () => {
  let s = twoNodes();
  s = tryConnect(s, loadedOf(), { node: "n1", port: "T" }, { node: "n2", port: "T" }).store;
  assert.equal(s.bindings.length, 1);
  s = removeBinding(s, 0);
  assert.equal(s.bindings.length, 0);
});
