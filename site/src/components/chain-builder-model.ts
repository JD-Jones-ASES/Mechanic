/**
 * The chain-builder's pure state model (S22). Everything here is a pure function
 * over the serializable store, so it is unit-tested headless (`node --test`
 * type-strips this `.ts`; it imports no JSX and no Preact) and the island
 * (`ChainBuilder.tsx`) is a thin render layer on top.
 *
 * The store IS the single source of truth (brief trap): every mutation returns a
 * NEW store, and the ChainGraph is rebuilt from the store on every evaluation —
 * never a long-lived mutated graph, whose `evaluationOrder()` would go wrong for
 * nodes added out of dependency order.
 *
 * The store shape is the S23 serialization contract (plain JSON — no Maps,
 * functions, or class instances at the boundary); do not deviate from it.
 */
import { ChainGraph, type Binding } from "../engines/chain.ts";
import {
  type ChainEvalResult,
  type ChainNodeSpec,
  evaluateChain,
  type NodeEvalRecord,
  ports,
} from "../engines/chain-eval.ts";
import type { CompiledThing, VarRecord } from "../engines/types.ts";
import { type MaterialRow, resolveBinding } from "./material-data.ts";

/** Hard node cap (brief: "no more than 6 nodes"). */
export const MAX_NODES = 6;

/* ---------------- the serializable store (S23 contract) ---------------- */

export interface NodeSpec {
  id: string; // opaque instance id n1..n6 (S21); the SAME slug may appear twice
  slug: string;
  config: string;
}

export interface ChainStore {
  nodes: NodeSpec[];
  bindings: Binding[];
  /** nodeId -> symbol -> SI value; carries EVERY input (bound ones stay stored so
   * a knob's value survives being wired then un-wired — brief trap) */
  knobs: Record<string, Record<string, number>>;
  /** nodeId -> selected material id (one material per node — see resolveMaterial) */
  materials: Record<string, string>;
  /** nodeId -> symbol -> display unit token */
  displayUnits: Record<string, Record<string, string>>;
}

export const emptyStore = (): ChainStore => ({
  nodes: [],
  bindings: [],
  knobs: {},
  materials: {},
  displayUnits: {},
});

/** A lazily-loaded THING module (compiled artifact + its generated pure fns),
 * cached by slug OUTSIDE the serializable store (functions are not JSON). */
export interface LoadedThing {
  artifact: CompiledThing;
  fns: Record<string, (v: VarRecord) => number | boolean>;
}
export type Loaded = Record<string, LoadedThing>;

/* ---------------- catalog index (from the Astro page) ---------------- */

export interface CatalogConfig {
  id: string;
  label: string;
}
export interface CatalogThing {
  slug: string;
  title: string;
  category: string;
  topic: string | null;
  /** only configurations with `branches === null` (multi-branch excluded in v1) */
  configs: CatalogConfig[];
}

/* ---------------- artifact helpers ---------------- */

export function configOf(artifact: CompiledThing, configId: string) {
  const cfg = artifact.configurations.find((c) => c.id === configId);
  if (!cfg) throw new Error(`unknown configuration '${configId}' for ${artifact.thing}`);
  return cfg;
}

/** A node's chaining ports (for the wire dropdowns and the UI's own legality
 * check) — the engine's OWN `ports()`, so the UI can never accept a wire the
 * engine's evaluation graph would reject (single definition, invariant 4). */
export const nodePorts = ports;

/** Inputs of a node currently driven by a wire (KnobPanel hides these; their
 * stored knob value is kept so un-wiring restores it). */
export function boundInputsOf(store: ChainStore, nodeId: string): Set<string> {
  return new Set(
    store.bindings.filter((b) => b.to.node === nodeId).map((b) => b.to.port),
  );
}

/** Lowest free instance id n1..n6 — reused after a removal (all of a removed
 * node's state is pruned, so reuse is clean) to keep ids inside n1..n6. */
export function nextInstanceId(store: ChainStore): string {
  const used = new Set(store.nodes.map((n) => n.id));
  for (let i = 1; i <= MAX_NODES; i++) {
    const id = `n${i}`;
    if (!used.has(id)) return id;
  }
  throw new Error("node cap reached");
}

/* ---------------- material resolution (UI-side; engine stays headless) ---------------- */

/** The builder binds ONE material per node (the S23 store shape is
 * `materials: {nodeId: materialId}`). A multi-slot THING (S17 composite-bar,
 * S18 thermal-assembly) therefore collapses its slots into a single merged
 * {symbol -> property_key} map and applies the one chosen material to all of
 * them — a uniform-material evaluation. That is a valid, verified configuration
 * (a composite bar of one material is just a bar); it forgoes the two-material
 * contrast the THING page shows, which is a documented v1 limitation of chaining,
 * not a wrong number. Single-slot THINGs (the common case) are unaffected.
 *
 * Safe for the whole current catalog: both multi-slot THINGs (composite-bar,
 * thermal-assembly) bind identical property sets per slot and no relation divides
 * by a material DIFFERENCE, so E₁=E₂ is a valid interior point, not a singularity.
 * FORWARD HAZARD (revisit when authored): a future multi-slot THING whose slots
 * bind DIFFERENT property sets would shrink `qualifyingMaterials`' intersection
 * (possibly to empty → material-less → the node refuses, not a wrong number), and
 * one dividing by (α₁−α₂)/(E₁−E₂) would go non-finite under one material (Readouts
 * blanks it — still not a wrong number, but the THING would look broken here). */
export function mergedBinding(artifact: CompiledThing): Record<string, string> {
  const out: Record<string, string> = {};
  for (const binds of Object.values(artifact.material_binding ?? {})) {
    for (const [sym, key] of Object.entries(binds)) out[sym] = key;
  }
  return out;
}

export function hasMaterial(artifact: CompiledThing): boolean {
  return artifact.material_binding != null && Object.keys(artifact.material_binding).length > 0;
}

/** Materials that publish EVERY property the node binds (so the one selected
 * material resolves every bound symbol). Same qualification predicate the THING
 * page and chain-demo use, generalized over the merged binding. */
export function qualifyingMaterials(
  artifact: CompiledThing,
  materials: MaterialRow[],
): MaterialRow[] {
  const keys = Object.values(mergedBinding(artifact));
  if (keys.length === 0) return [];
  return materials.filter((m) => keys.every((k) => m.properties.some((p) => p.key === k)));
}

/** Landing material for a freshly added node: the first qualifying material
 * (matches chain-demo; R7 per-slot landing materials are a THING-page nicety the
 * chain layer does not yet thread — brief: no new capabilities). */
export function defaultMaterialId(artifact: CompiledThing, materials: MaterialRow[]): string {
  return qualifyingMaterials(artifact, materials)[0]?.id ?? "";
}

/** Resolve a node's selected material to SI values over its merged binding. */
export function resolveMaterialValues(
  artifact: CompiledThing,
  materials: MaterialRow[],
  materialId: string,
): VarRecord {
  const m = materials.find((x) => x.id === materialId);
  return m ? resolveBinding(m, mergedBinding(artifact)) : {};
}

/* ---------------- store mutations (all pure) ---------------- */

export function addNode(
  store: ChainStore,
  slug: string,
  config: string,
  artifact: CompiledThing,
  materials: MaterialRow[],
): ChainStore {
  if (store.nodes.length >= MAX_NODES) return store;
  const id = nextInstanceId(store);
  const cfg = configOf(artifact, config);
  return {
    ...store,
    nodes: [...store.nodes, { id, slug, config }],
    knobs: {
      ...store.knobs,
      // every input starts at its default (so an un-wired input evaluates and a
      // later un-wire restores a sensible value)
      [id]: Object.fromEntries(cfg.inputs.map((s) => [s, artifact.variables[s]!.default])),
    },
    materials: hasMaterial(artifact)
      ? { ...store.materials, [id]: defaultMaterialId(artifact, materials) }
      : store.materials,
    displayUnits: { ...store.displayUnits, [id]: {} },
  };
}

export function removeNode(store: ChainStore, nodeId: string): ChainStore {
  const drop = <T,>(rec: Record<string, T>): Record<string, T> =>
    Object.fromEntries(Object.entries(rec).filter(([k]) => k !== nodeId));
  return {
    nodes: store.nodes.filter((n) => n.id !== nodeId),
    // prune every wire touching the removed node (a dangling binding would make
    // evaluateChain throw "unknown node")
    bindings: store.bindings.filter((b) => b.from.node !== nodeId && b.to.node !== nodeId),
    knobs: drop(store.knobs),
    materials: drop(store.materials),
    displayUnits: drop(store.displayUnits),
  };
}

export function setKnob(store: ChainStore, nodeId: string, sym: string, si: number): ChainStore {
  return {
    ...store,
    knobs: { ...store.knobs, [nodeId]: { ...(store.knobs[nodeId] ?? {}), [sym]: si } },
  };
}

export function setMaterial(store: ChainStore, nodeId: string, materialId: string): ChainStore {
  return { ...store, materials: { ...store.materials, [nodeId]: materialId } };
}

export function setDisplayUnit(
  store: ChainStore,
  nodeId: string,
  sym: string,
  unit: string,
): ChainStore {
  return {
    ...store,
    displayUnits: {
      ...store.displayUnits,
      [nodeId]: { ...(store.displayUnits[nodeId] ?? {}), [sym]: unit },
    },
  };
}

export function removeBinding(store: ChainStore, index: number): ChainStore {
  return { ...store, bindings: store.bindings.filter((_, i) => i !== index) };
}

export interface ConnectOutcome {
  store: ChainStore;
  ok: boolean;
  reason?: string;
}

/**
 * Validate a proposed wire through the REAL ChainGraph type-checker (so the
 * rejection strings are the engine's own — dimension mismatch, quantity-kind
 * mismatch, feedback loop) and, if legal, append it. Also rejects fan-in (a
 * second wire into one input) with the same message evaluateChain would throw —
 * the UI additionally prevents it by only offering un-bound target ports.
 */
export function tryConnect(
  store: ChainStore,
  loaded: Loaded,
  from: { node: string; port: string },
  to: { node: string; port: string },
): ConnectOutcome {
  const graph = new ChainGraph();
  for (const n of store.nodes) {
    const l = loaded[n.slug];
    if (!l) return { store, ok: false, reason: "a node is still loading — try again" };
    graph.addNode({ id: n.id, ...nodePorts(l.artifact, n.config) });
  }
  for (const b of store.bindings) graph.connect(b); // already legal by construction
  if (store.bindings.some((b) => b.to.node === to.node && b.to.port === to.port)) {
    return { store, ok: false, reason: `input '${to.node}.${to.port}' already has a wire` };
  }
  const res = graph.connect({ from, to });
  if (!res.ok) return { store, ok: false, reason: res.reason };
  return { store: { ...store, bindings: [...store.bindings, { from, to }] }, ok: true };
}

/* ---------------- evaluation ---------------- */

/** Build the engine specs from the store: knobs are UNBOUND inputs only (bound
 * ports are owned by the wire — S21), materials resolved UI-side. */
export function buildSpecs(
  store: ChainStore,
  loaded: Loaded,
  materials: MaterialRow[],
): ChainNodeSpec[] {
  return store.nodes.map((n) => {
    const { artifact, fns } = loaded[n.slug]!;
    const cfg = configOf(artifact, n.config);
    const bound = boundInputsOf(store, n.id);
    const stored = store.knobs[n.id] ?? {};
    const knobs: VarRecord = {};
    for (const s of cfg.inputs) {
      if (!bound.has(s)) knobs[s] = stored[s] ?? artifact.variables[s]!.default;
    }
    return {
      instanceId: n.id,
      artifact,
      configId: n.config,
      fns,
      knobs,
      materialValues: hasMaterial(artifact)
        ? resolveMaterialValues(artifact, materials, store.materials[n.id] ?? "")
        : undefined,
    };
  });
}

export interface EvaluateOutcome {
  result: ChainEvalResult | null;
  /** all nodes' modules loaded and evaluation ran */
  ready: boolean;
  /** a defensive catch — the UI only ever stores legal wiring, so this should
   * never fire, but a thrown engine error must not crash the island */
  error: string | null;
}

export function evaluateStore(
  store: ChainStore,
  loaded: Loaded,
  materials: MaterialRow[],
): EvaluateOutcome {
  if (store.nodes.length === 0) return { result: null, ready: true, error: null };
  if (!store.nodes.every((n) => loaded[n.slug])) return { result: null, ready: false, error: null };
  try {
    return {
      result: evaluateChain(buildSpecs(store, loaded, materials), store.bindings),
      ready: true,
      error: null,
    };
  } catch (e) {
    return { result: null, ready: true, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ---------------- per-node UI state (the three distinct states) ---------------- */

export type NodeUiState =
  | "loading" // module not yet loaded
  | "ok" // evaluated, no messages
  | "warn" // evaluated with a caution (local, non-refusing)
  | "refused" // the node's OWN unscoped invalid envelope fired (local refusal)
  | "partial" // a SCOPED invalid envelope refused SOME outputs; the rest stand
  | "refused-upstream" // a bound input was withheld by an upstream refusal (S21)
  | "incomplete"; // engine could not produce a bound input's value (rule d)

/**
 * Derive the node's display state from its evaluation record. Distinct and
 * programmatically exposed (via `data-node-state`) so a refusal that came from
 * upstream never reads as the node's own fault — and, critically, so a SCOPED
 * refusal (some readouts withheld, an invalid-severity banner shown, but
 * `result.invalid === false`) is never mislabeled "ok". A scoped invalid sets
 * `invalidVars` without setting `invalid`, so it must be checked explicitly;
 * "violations surface, never silent" (invariant 5) applies to the state chip too.
 * `incomplete` is the engine's rule-(d) status — practically unreachable with the
 * current RelationEngine (S21 note-e), so it is a defensive path unit-pinned here.
 */
export function nodeUiState(record: NodeEvalRecord | undefined): NodeUiState {
  if (!record) return "loading";
  if (record.status === "refused-by-upstream") return "refused-upstream";
  if (record.status === "incomplete") return "incomplete";
  if (record.result.invalid) return "refused";
  if (record.result.invalidVars.length > 0) return "partial"; // scoped refusal
  if (record.result.messages.some((m) => m.severity === "warn")) return "warn";
  return "ok";
}
