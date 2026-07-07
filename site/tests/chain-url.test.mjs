// Unit tests for the chain-URL serialization module (S23), via node:test (Node
// 24 type-strips the .ts imports). Synthetic THINGs keep encode/decode and the
// degradation messages deterministic and independent of the (gitignored)
// generated artifacts — the same discipline as chain-eval / chain-builder-model.
//
// The load-bearing property is MACHINE-PROVEN here: over a seeded-PRNG space of
// valid builder states, decode∘encode is the identity (bit-faithful floats,
// omitted-default refill, materials, display units, and wiring all round-trip).
// The rest pins the DECIDED degradation model: unknown slug/config/port/material/
// unit, higher-version refusal, and malformed-payload refusal.
import assert from "node:assert/strict";
import { test } from "node:test";
import { planTargets } from "../src/engines/chain-eval.ts";
import { decodeChain, encodeChain, FORMAT_VERSION, previewSlugs } from "../src/engines/chain-url.ts";
import {
  addNode,
  configOf,
  emptyStore,
  hasMaterial,
  MAX_NODES,
  nodePorts,
  qualifyingMaterials,
  setDisplayUnit,
  setKnob,
  setMaterial,
  tryConnect,
} from "../src/components/chain-builder-model.ts";

/* ---------------- synthetic catalog ---------------- */
const ZERO = [0, 0, 0, 0, 0, 0, 0];
const TORQUE = [2, 1, -2, 0, 0, 0, 0];
const SPEED = [0, 0, -1, 0, 0, 0, 0];
const variable = (role, kind, dim, def, display_units = [], integer = false) => ({
  name: "", latex: "", dim, quantity_kind: kind, si_unit: display_units[0] ?? "1",
  display_units, default: def, bounds: null, integer, role,
});

// gear: no material; two outputs (a torque and an angular velocity) to wire from;
// `w` carries a two-option display-unit set so unit round-trip is exercised.
const gear = {
  schema_version: 1, thing: "gear", title: "Gear",
  variables: {
    N: variable("free", "count", ZERO, 20, ["1"], true),
    w: variable("free", "angular_velocity", SPEED, 10, ["rad/s", "rpm"]),
    T_out: variable("derived", "torque", TORQUE, 0, ["N*m"]),
    w_out: variable("derived", "angular_velocity", SPEED, 0, ["rad/s", "rpm"]),
  },
  relations: [{ id: "r", group: "g", latex: "", residual_fn: "r", assumptions: [], validity: [], citation: "c" }],
  configurations: [{
    id: "c1", label: "C1", constraints: {}, inputs: ["N", "w"],
    plan: [
      { type: "eval", target: "T_out", fn: "e1", latex: "" },
      { type: "eval", target: "w_out", fn: "e2", latex: "" },
    ],
    branches: null, guards: [], samples: [],
  }],
  material_binding: null, material_defaults: null, sources: [{ id: "c", citation: "C" }],
};

// shaft: material-bound (E); a torque input `T` and a speed input `w` (both
// wire-legal from gear); two configs, so config-variety is generated.
const shaft = {
  schema_version: 1, thing: "shaft", title: "Shaft",
  variables: {
    T: variable("free", "torque", TORQUE, 100, ["N*m"]),
    w: variable("free", "angular_velocity", SPEED, 5, ["rad/s", "rpm"]),
    E: variable("material", "youngs_modulus", [-1, 1, -2, 0, 0, 0, 0], 0, ["Pa"]),
    P: variable("derived", "power", [2, 1, -3, 0, 0, 0, 0], 0, ["W"]),
    tau: variable("derived", "stress", [-1, 1, -2, 0, 0, 0, 0], 0, ["Pa", "MPa"]),
  },
  relations: [{ id: "r", group: "g", latex: "", residual_fn: "r", assumptions: [], validity: [], citation: "c" }],
  configurations: [
    { id: "c1", label: "C1", constraints: {}, inputs: ["T", "w"], plan: [{ type: "eval", target: "P", fn: "e", latex: "" }, { type: "eval", target: "tau", fn: "e", latex: "" }], branches: null, guards: [], samples: [] },
    { id: "c2", label: "C2", constraints: {}, inputs: ["T"], plan: [{ type: "eval", target: "tau", fn: "e", latex: "" }], branches: null, guards: [], samples: [] },
  ],
  material_binding: { default: { E: "youngs_modulus" } }, material_defaults: null, sources: [{ id: "c", citation: "C" }],
};

const ARTIFACTS = { gear, shaft };
const CATALOG = [
  { slug: "gear", title: "Gear", category: "x", topic: null, configs: [{ id: "c1", label: "C1" }] },
  { slug: "shaft", title: "Shaft", category: "x", topic: null, configs: [{ id: "c1", label: "C1" }, { id: "c2", label: "C2" }] },
];
const prop = (key, value_si) => ({ key, basis: "typical", value_published: value_si, unit_published: "SI", value_si, unit_si: "SI", source_id: "s", citation: "c" });
const MATERIALS = [
  { id: "steel", name: "Steel", class: "metal", condition: "", cost_class: "low", properties: [prop("youngs_modulus", 200e9)] },
  { id: "alu", name: "Aluminum", class: "metal", condition: "", cost_class: "low", properties: [prop("youngs_modulus", 70e9)] },
];
const CTX = { catalog: CATALOG, artifacts: ARTIFACTS, materials: MATERIALS };
// dummy fns — tryConnect only reads artifact ports, never evaluates
const LOADED = { gear: { artifact: gear, fns: {} }, shaft: { artifact: shaft, fns: {} } };
const CAT_THINGS = [
  { slug: "gear", artifact: gear, configs: ["c1"] },
  { slug: "shaft", artifact: shaft, configs: ["c1", "c2"] },
];

/* ---------------- helpers ---------------- */
// a raw fragment from an arbitrary object — Node's base64url matches the module's
// url-safe/no-pad scheme, so this crafts payloads the decoder reads (incl. the
// deliberately-invalid ones the degradation cases need).
const frag = (obj) => `#v${FORMAT_VERSION}=` + Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

function randomState(rng) {
  let s = emptyStore();
  const n = 1 + Math.floor(rng() * MAX_NODES);
  for (let i = 0; i < n; i++) {
    const t = pick(rng, CAT_THINGS);
    s = addNode(s, t.slug, pick(rng, t.configs), t.artifact, MATERIALS);
  }
  for (const node of s.nodes) {
    const art = ARTIFACTS[node.slug];
    const cfg = configOf(art, node.config);
    for (const sym of cfg.inputs) {
      if (rng() < 0.6) {
        // sometimes exactly the default (must still round-trip via omit+refill),
        // sometimes a raw float (must round-trip bit-faithfully)
        const v = rng() < 0.3 ? art.variables[sym].default : rng() * 1000;
        s = setKnob(s, node.id, sym, v);
      }
    }
    if (hasMaterial(art) && rng() < 0.8) {
      s = setMaterial(s, node.id, pick(rng, qualifyingMaterials(art, MATERIALS)).id);
    }
    for (const sym of [...cfg.inputs, ...planTargets(cfg.plan)]) {
      const meta = art.variables[sym];
      if (meta && meta.display_units.length > 1 && rng() < 0.4) {
        s = setDisplayUnit(s, node.id, sym, pick(rng, meta.display_units));
      }
    }
  }
  const attempts = Math.floor(rng() * 4);
  for (let a = 0; a < attempts && s.nodes.length >= 2; a++) {
    const from = pick(rng, s.nodes);
    const to = pick(rng, s.nodes);
    if (from.id === to.id) continue;
    const outs = Object.keys(nodePorts(ARTIFACTS[from.slug], from.config).outputs);
    const ins = Object.keys(nodePorts(ARTIFACTS[to.slug], to.config).inputs);
    if (!outs.length || !ins.length) continue;
    const res = tryConnect(s, LOADED, { node: from.id, port: pick(rng, outs) }, { node: to.id, port: pick(rng, ins) });
    if (res.ok) s = res.store;
  }
  return s;
}

/* ---------------- the round-trip property (machine-proven identity) ---------------- */

test("decode∘encode is the identity over a seeded space of valid states", () => {
  const rng = mulberry32(0x5eed);
  let withWires = 0, withMaterialSwap = 0, withUnitOverride = 0, withNonDefaultKnob = 0;
  for (let i = 0; i < 400; i++) {
    const s = randomState(rng);
    const encoded = encodeChain(s, CTX);
    assert.ok(encoded.startsWith(`#v${FORMAT_VERSION}=`), "prefix carries the version");
    const { store, dropped, error } = decodeChain(encoded, CTX);
    assert.equal(error, null, `iteration ${i}: unexpected whole-link error`);
    assert.deepEqual(dropped, [], `iteration ${i}: a valid state must not degrade`);
    assert.deepStrictEqual(store, s, `iteration ${i}: round-trip mismatch`);
    if (s.bindings.length) withWires++;
    if (s.nodes.some((n) => s.materials[n.id] === "alu")) withMaterialSwap++;
    if (s.nodes.some((n) => Object.keys(s.displayUnits[n.id] ?? {}).length)) withUnitOverride++;
    if (s.nodes.some((n) => Object.entries(s.knobs[n.id] ?? {}).some(([k, v]) => v !== ARTIFACTS[n.slug].variables[k].default))) withNonDefaultKnob++;
  }
  // the space actually exercised each axis (a green suite over trivial states
  // would prove nothing)
  assert.ok(withWires > 20, `too few wired states (${withWires})`);
  assert.ok(withMaterialSwap > 20, `too few material swaps (${withMaterialSwap})`);
  assert.ok(withUnitOverride > 20, `too few unit overrides (${withUnitOverride})`);
  assert.ok(withNonDefaultKnob > 50, `too few non-default knobs (${withNonDefaultKnob})`);
});

test("a default-valued knob is OMITTED from the payload and refilled on decode", () => {
  let s = addNode(emptyStore(), "gear", "c1", gear, MATERIALS); // all knobs at default
  const payload = JSON.parse(Buffer.from(encodeChain(s, CTX).slice(`#v${FORMAT_VERSION}=`.length), "base64url").toString("utf8"));
  assert.deepEqual(payload.knobs, {}, "no default knob is serialized");
  // one non-default knob appears; the untouched sibling stays omitted
  s = setKnob(s, "n1", "w", 33);
  const payload2 = JSON.parse(Buffer.from(encodeChain(s, CTX).slice(`#v${FORMAT_VERSION}=`.length), "base64url").toString("utf8"));
  assert.deepEqual(payload2.knobs, { n1: { w: 33 } });
  assert.deepStrictEqual(decodeChain(encodeChain(s, CTX), CTX).store.knobs.n1, { N: 20, w: 33 });
});

test("floats round-trip bit-faithfully (shortest JSON repr)", () => {
  const tricky = [0.1 + 0.2, 1 / 3, 9.80665, 1e-7, 123456.789, Math.PI];
  for (const v of tricky) {
    let s = addNode(emptyStore(), "gear", "c1", gear, MATERIALS);
    s = setKnob(s, "n1", "w", v);
    assert.equal(decodeChain(encodeChain(s, CTX), CTX).store.knobs.n1.w, v);
  }
});

test("negative zero normalizes to +0 (the one non-bit-faithful value; JSON has no -0)", () => {
  let s = addNode(emptyStore(), "gear", "c1", gear, MATERIALS);
  s = setKnob(s, "n1", "w", -0);
  const back = decodeChain(encodeChain(s, CTX), CTX).store.knobs.n1.w;
  assert.ok(Object.is(back, 0), "-0 comes back as exactly +0 (no relation distinguishes them)");
});

/* ---------------- degradation: nodes ---------------- */

test("an unknown slug drops the node AND its wires; the remainder loads", () => {
  const f = frag({
    nodes: [{ id: "n1", slug: "gear", config: "c1" }, { id: "n2", slug: "ghost", config: "c1" }],
    bindings: [{ from: { node: "n1", port: "w_out" }, to: { node: "n2", port: "w" } }],
    knobs: {}, materials: {}, displayUnits: {},
  });
  const { store, dropped, error } = decodeChain(f, CTX);
  assert.equal(error, null);
  assert.deepEqual(store.nodes.map((n) => n.id), ["n1"]);
  assert.equal(store.bindings.length, 0);
  assert.equal(dropped.filter((d) => d.code === "node").length, 1);
  assert.match(dropped.find((d) => d.code === "node").message, /ghost.*no longer in the catalog/);
  assert.equal(dropped.filter((d) => d.code === "binding").length, 1);
  assert.match(dropped.find((d) => d.code === "binding").message, /a connected node was dropped/);
});

test("an unknown configuration drops the node", () => {
  const f = frag({ nodes: [{ id: "n1", slug: "gear", config: "cX" }], bindings: [], knobs: {}, materials: {}, displayUnits: {} });
  const { store, dropped } = decodeChain(f, CTX);
  assert.equal(store.nodes.length, 0);
  assert.match(dropped[0].message, /configuration "cX" no longer exists/);
});

test("a slug in the catalog but not loaded drops the node distinctly", () => {
  const f = frag({ nodes: [{ id: "n1", slug: "shaft", config: "c1" }], bindings: [], knobs: {}, materials: {}, displayUnits: {} });
  const { store, dropped } = decodeChain(f, { catalog: CATALOG, artifacts: { gear }, materials: MATERIALS });
  assert.equal(store.nodes.length, 0);
  assert.match(dropped[0].message, /could not be loaded/);
});

/* ---------------- degradation: bindings ---------------- */

test("an unknown port drops only that wire (engine's own reason)", () => {
  const f = frag({
    nodes: [{ id: "n1", slug: "gear", config: "c1" }, { id: "n2", slug: "shaft", config: "c1" }],
    bindings: [{ from: { node: "n1", port: "T_out" }, to: { node: "n2", port: "ZZZ" } }],
    knobs: {}, materials: {}, displayUnits: {},
  });
  const { store, dropped } = decodeChain(f, CTX);
  assert.equal(store.nodes.length, 2); // both nodes survive
  assert.equal(store.bindings.length, 0);
  assert.match(dropped.find((d) => d.code === "binding").message, /ZZZ.*is not an input/);
});

test("a wire whose endpoints are now type-incompatible is dropped (invariant 4)", () => {
  // torque out → speed in: the CURRENT type-checker rejects it, so a link that
  // was legal under an older catalog degrades rather than throwing at eval time
  const f = frag({
    nodes: [{ id: "n1", slug: "gear", config: "c1" }, { id: "n2", slug: "shaft", config: "c1" }],
    bindings: [{ from: { node: "n1", port: "T_out" }, to: { node: "n2", port: "w" } }],
    knobs: {}, materials: {}, displayUnits: {},
  });
  const { store, dropped } = decodeChain(f, CTX);
  assert.equal(store.bindings.length, 0);
  assert.match(dropped.find((d) => d.code === "binding").message, /dimension mismatch/);
});

test("a duplicate wire into one input is dropped (fan-in guard)", () => {
  const f = frag({
    nodes: [
      { id: "n1", slug: "gear", config: "c1" },
      { id: "n2", slug: "gear", config: "c1" },
      { id: "n3", slug: "shaft", config: "c1" },
    ],
    bindings: [
      { from: { node: "n1", port: "T_out" }, to: { node: "n3", port: "T" } },
      { from: { node: "n2", port: "T_out" }, to: { node: "n3", port: "T" } },
    ],
    knobs: {}, materials: {}, displayUnits: {},
  });
  const { store, dropped } = decodeChain(f, CTX);
  assert.equal(store.bindings.length, 1); // first wire wins
  assert.match(dropped.find((d) => d.code === "binding").message, /duplicate wire into n3\.T/);
});

/* ---------------- degradation: materials + units ---------------- */

test("an unknown material falls back to the node's default, named in a banner", () => {
  const f = frag({ nodes: [{ id: "n1", slug: "shaft", config: "c1" }], bindings: [], knobs: {}, materials: { n1: "unobtainium" }, displayUnits: {} });
  const { store, dropped } = decodeChain(f, CTX);
  assert.equal(store.materials.n1, "steel"); // first qualifying material
  assert.match(dropped.find((d) => d.code === "material").message, /unobtainium.*unavailable.*default/);
});

test("a qualifying material id is honored with no banner", () => {
  const f = frag({ nodes: [{ id: "n1", slug: "shaft", config: "c1" }], bindings: [], knobs: {}, materials: { n1: "alu" }, displayUnits: {} });
  const { store, dropped } = decodeChain(f, CTX);
  assert.equal(store.materials.n1, "alu");
  assert.deepEqual(dropped, []);
});

test("an unknown display unit falls back to the default; a valid one is kept", () => {
  const bad = frag({ nodes: [{ id: "n1", slug: "gear", config: "c1" }], bindings: [], knobs: {}, materials: {}, displayUnits: { n1: { w: "parsecs" } } });
  const r1 = decodeChain(bad, CTX);
  assert.deepEqual(r1.store.displayUnits.n1, {});
  assert.match(r1.dropped.find((d) => d.code === "unit").message, /parsecs.*unavailable/);

  const good = frag({ nodes: [{ id: "n1", slug: "gear", config: "c1" }], bindings: [], knobs: {}, materials: {}, displayUnits: { n1: { w: "rpm" } } });
  const r2 = decodeChain(good, CTX);
  assert.deepEqual(r2.store.displayUnits.n1, { w: "rpm" });
  assert.deepEqual(r2.dropped, []);
});

/* ---------------- whole-link refusals ---------------- */

test("a higher format version refuses the whole link", () => {
  const { store, dropped, error } = decodeChain("#v2=anything", CTX);
  assert.equal(store.nodes.length, 0);
  assert.deepEqual(dropped, []);
  assert.match(error, /newer version.*v2/);
});

test("malformed payloads refuse with a message and an empty builder", () => {
  const cases = [
    ["#v1=@@@not-base64@@@", /couldn't be read/],
    [`#v1=${Buffer.from("not json {{", "utf8").toString("base64url")}`, /couldn't be read/],
    [frag({ nodes: Array.from({ length: MAX_NODES + 1 }, (_, i) => ({ id: `n${i}`, slug: "gear", config: "c1" })), bindings: [], knobs: {}, materials: {}, displayUnits: {} }), /too many nodes/],
    [frag({ nodes: [{ id: "n1", slug: "gear", config: "c1" }], bindings: [], knobs: { n1: { N: "twenty" } }, materials: {}, displayUnits: {} }), /not a finite number/],
    [frag({ nodes: [{ id: "n1", slug: "gear", config: "c1" }], bindings: [], knobs: { n1: { N: null } }, materials: {}, displayUnits: {} }), /not a finite number/],
    [frag({ nodes: "nope", bindings: [], knobs: {}, materials: {}, displayUnits: {} }), /not a list/],
  ];
  for (const [f, re] of cases) {
    const { store, error } = decodeChain(f, CTX);
    assert.equal(store.nodes.length, 0, `expected empty builder for ${f.slice(0, 24)}…`);
    assert.match(error, re);
  }
});

test("an empty or foreign fragment is a clean empty builder, not an error", () => {
  for (const f of ["", "#", "#overview", "#things"]) {
    const { store, dropped, error } = decodeChain(f, CTX);
    assert.equal(store.nodes.length, 0);
    assert.deepEqual(dropped, []);
    assert.equal(error, null);
  }
});

/* ---------------- previewSlugs (the caller's lazy-load list) ---------------- */

test("previewSlugs lists the distinct slugs to load, and [] for non-loadable links", () => {
  const f = frag({
    nodes: [{ id: "n1", slug: "gear", config: "c1" }, { id: "n2", slug: "shaft", config: "c1" }, { id: "n3", slug: "gear", config: "c1" }],
    bindings: [], knobs: {}, materials: {}, displayUnits: {},
  });
  assert.deepEqual(previewSlugs(f).sort(), ["gear", "shaft"]); // deduped
  assert.deepEqual(previewSlugs("#v2=x"), []); // version mismatch → nothing to load
  assert.deepEqual(previewSlugs("#v1=@@@"), []); // malformed → nothing to load
  assert.deepEqual(previewSlugs(""), []);
});
