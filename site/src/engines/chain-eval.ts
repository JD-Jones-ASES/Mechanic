/**
 * Chain evaluation engine (S21): the ONE place chain orchestration lives.
 *
 * `evaluateChain` walks the planner's forward-only `evaluationOrder()`, builds
 * one `RelationEngine` per node INSTANCE (duplicate-THING chains must not share
 * state), forwards bound port values downstream, fans each node's resolved
 * material + cited-constant values into its evaluation, and returns:
 *   (a) a per-node evaluation record wrapping `EvalResult` with a refusal-aware
 *       `status`, and
 *   (b) a per-binding provenance record (the value that crossed the wire, its
 *       source instance/port, and the cited relations on the upstream path —
 *       the raw material S24 renders).
 *
 * Refusal propagation (the invariant-5 gap this engine closes): a refusal can
 * leave a value fully FINITE — an unscoped invalid VALIDITY predicate fires
 * AFTER the plan has computed every value (relation.ts), and a scoped envelope
 * leaves the value finite while flagging its port in `invalidVars`. NaN-sniffing
 * is therefore never sufficient (docs/architecture.md). A refused upstream value
 * must be WITHHELD, not forwarded, or it feeds plausible wrong numbers into a
 * downstream THING. The DECIDED rule table (S21 brief) is implemented in
 * `classifyBoundInput` below.
 *
 * Headless by contract: this module imports nothing from `../components/` and no
 * Preact. Material resolution (`MaterialRow` -> SI `VarRecord`) stays in the UI
 * layer; `evaluateChain` receives already-resolved `materialValues`.
 */
import { ChainGraph, type Binding } from "./chain.ts";
import { RelationEngine } from "./relation.ts";
import type { CompiledThing, EvalResult, Fn, ValidityMessage, VarRecord } from "./types.ts";
import type { Port } from "./units.ts";

/** A variable's chaining Port (dimension 7-vector + quantity kind), read off the
 * compiled artifact. The ONE place that shape is constructed — reused by the
 * per-config `ports()` below and by build-time wayfinding (D2), so the notion of
 * "how a variable becomes a Port" lives once (invariant 4, in miniature). */
export function portOf(artifact: CompiledThing, sym: string): Port {
  return { dim: artifact.variables[sym]!.dim, quantity_kind: artifact.variables[sym]!.quantity_kind };
}

/**
 * Flatten a plan to the variables it produces: a `table` step fills several
 * `targets`; `eval`/`solve1d` fill one `target`. A bare `.map(p => p.target)`
 * would inject `undefined` for a table step. Mirrors ThingWidget's `targets`.
 */
export function planTargets(plan: CompiledThing["configurations"][number]["plan"]): string[] {
  return plan.flatMap((p) => (p.type === "table" ? p.targets : [p.target]));
}

/** One node instance in a chain. Instance ids are OPAQUE and unique — the same
 * THING slug may appear twice; the ids, not the slugs, key the evaluation. */
export interface ChainNodeSpec {
  instanceId: string;
  artifact: CompiledThing;
  configId: string;
  /** the artifact's generated pure functions (shared per slug is fine — pure) */
  fns: Record<string, Fn>;
  /** SI values for this node's UNBOUND inputs (bound inputs are forwarded) */
  knobs: VarRecord;
  /** material-bound SI values, already resolved by the UI layer (headless) */
  materialValues?: VarRecord;
  /** multi-branch solution selector, when the configuration has branches */
  branch?: string;
}

export type NodeStatus = "evaluated" | "refused-by-upstream" | "incomplete";

export interface NodeEvalRecord {
  instanceId: string;
  status: NodeStatus;
  result: EvalResult;
  /** upstream (source instance, port) pairs that withheld a bound input */
  refusedBy: { instance: string; port: string }[];
}

/** A cited relation on a value's upstream path, tagged with the instance it
 * came from (the same relation id can recur across duplicate-THING instances). */
export interface UpstreamRelation {
  instance: string;
  id: string;
  citation: string;
  assumptions: string[];
}

export interface ProvenanceRecord {
  from: { instance: string; port: string };
  to: { instance: string; port: string };
  /** the SI value that crossed the wire, or null when the binding was withheld */
  value: number | null;
  withheld: boolean;
  /** cited relations on the upstream path (source node + everything feeding it),
   * root-first, de-duplicated by (instance,id) — the raw material S24 renders */
  relations: UpstreamRelation[];
  /** convenience: de-duplicated citations from `relations`, in the same order */
  citations: string[];
}

export interface ChainEvalResult {
  order: string[];
  nodes: Record<string, NodeEvalRecord>;
  provenance: ProvenanceRecord[];
}

type BindingEffect =
  | { effect: "forward"; value: number }
  | { effect: "withheld-global" }
  | { effect: "withheld-scoped" }
  | { effect: "incomplete" };

/**
 * The DECIDED refusal-propagation rule table (S21 brief), as a pure decision.
 * Given the SOURCE node's evaluation record and the source port, decide what the
 * target node does with this bound input. This is where a finite-but-refused
 * value is stopped from crossing the wire.
 *
 *  (a) source globally refused (native `invalid`, or forced by its own upstream
 *      refusal) -> WITHHELD, propagates transitively.
 *  (b) source port ∈ its `invalidVars` (scoped refusal) -> WITHHELD, only for
 *      bindings reading THAT port.
 *  (c) warn-severity upstream -> a warn sets neither `invalid` nor `invalidVars`,
 *      so the value flows normally (nothing to do here — falls through to
 *      forward). Warns stay local to their node.
 *  (d) the source produced no usable value for the port (absent/unevaluated, or
 *      a stray non-finite that no refusal flagged) -> INCOMPLETE, distinct from
 *      refused; never forward a NaN.
 */
export function classifyBoundInput(
  srcRecord: NodeEvalRecord | undefined,
  port: string,
): BindingEffect {
  if (!srcRecord) return { effect: "incomplete" }; // (d) source absent
  const { result, status } = srcRecord;
  if (result.invalid || status === "refused-by-upstream") {
    return { effect: "withheld-global" }; // (a)
  }
  if (result.invalidVars.includes(port)) {
    return { effect: "withheld-scoped" }; // (b)
  }
  const value = result.values[port];
  if (value === undefined || !Number.isFinite(value)) {
    return { effect: "incomplete" }; // (d) no value; never forward a NaN
  }
  return { effect: "forward", value }; // (c)/clean
}

function dedupe(xs: string[]): string[] {
  const seen = new Set<string>();
  return xs.filter((x) => (seen.has(x) ? false : (seen.add(x), true)));
}

/** A configuration's input/output Port maps. Exported so the chain-builder's
 * UI-side wire-legality check (S22) builds the SAME port map this engine
 * evaluates from — one definition, so the UI can never accept a wire the engine
 * would reject (the "invariant 4 in miniature" that portOf/planTargets already
 * serve). */
export function ports(artifact: CompiledThing, cfgId: string): { inputs: Record<string, Port>; outputs: Record<string, Port> } {
  const cfg = artifact.configurations.find((c) => c.id === cfgId);
  if (!cfg) throw new Error(`unknown configuration '${cfgId}' for ${artifact.thing}`);
  return {
    inputs: Object.fromEntries(cfg.inputs.map((s) => [s, portOf(artifact, s)])),
    outputs: Object.fromEntries(planTargets(cfg.plan).map((t) => [t, portOf(artifact, t)])),
  };
}

/** Cited fixed values (`role: constant`, e.g. g) injected into every evaluation,
 * read straight off the artifact — no UI dependency, so the engine stays
 * headless. Mirrors ThingWidget's `constantValues`. */
function constantValues(artifact: CompiledThing): VarRecord {
  const out: VarRecord = {};
  for (const [sym, v] of Object.entries(artifact.variables)) {
    if (v.role === "constant") out[sym] = v.default;
  }
  return out;
}

/**
 * Evaluate a chain. Type-checks the wiring through the real planner (fails loud
 * on an illegal or cyclic binding, exactly as the demo always has), evaluates
 * every node in forward order, propagates refusals per `classifyBoundInput`, and
 * assembles per-binding provenance.
 */
export function evaluateChain(nodes: ChainNodeSpec[], bindings: Binding[]): ChainEvalResult {
  const byId = new Map(nodes.map((n) => [n.instanceId, n]));

  // the planner IS the type-checker: build the graph, reject any illegal or
  // cyclic binding (invariant 2 / ADR-0002), and take its forward-only order.
  const graph = new ChainGraph();
  for (const n of nodes) graph.addNode({ id: n.instanceId, ...ports(n.artifact, n.configId) });
  for (const b of bindings) {
    const res = graph.connect(b);
    if (!res.ok) throw new Error(`chain wiring rejected: ${res.reason}`);
  }
  // one wire per input port: fan-in to a single input is malformed — its value
  // would be overwritten by binding order, and the losing binding's provenance
  // would misreport a value that never crossed the wire. Fail loud, matching the
  // type-check contract. (The chain-builder UI, S22, prevents it at the source.)
  const boundInputs = new Set<string>();
  for (const b of bindings) {
    const key = JSON.stringify([b.to.node, b.to.port]);
    if (boundInputs.has(key)) {
      throw new Error(`chain wiring rejected: input '${b.to.node}.${b.to.port}' has more than one binding`);
    }
    boundInputs.add(key);
  }
  const order = graph.evaluationOrder();

  const records: Record<string, NodeEvalRecord> = {};
  const provenance: ProvenanceRecord[] = [];

  // memoised upstream cited relations per instance (root-first, de-duplicated).
  // Recurses across bindings so a value three THINGs deep still carries every
  // citation on its path. Node-level granularity is deliberate: plain eval steps
  // carry no per-step relation linkage in the artifact and inventing one is out
  // of scope (S21 brief) — so a binding lists the cited relations of the whole
  // upstream chain of THINGs, which is complete (never drops a citation on the
  // path) though not minimal. solve1d/solveLinear steps DO carry per-step links
  // (residual_fn / via.solve_linear) for a future refinement.
  const upstreamCache = new Map<string, UpstreamRelation[]>();
  const upstreamRelations = (instanceId: string): UpstreamRelation[] => {
    const cached = upstreamCache.get(instanceId);
    if (cached) return cached;
    const seen = new Set<string>();
    const out: UpstreamRelation[] = [];
    const push = (r: UpstreamRelation) => {
      const key = JSON.stringify([r.instance, r.id]);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(r);
      }
    };
    for (const b of bindings) {
      if (b.to.node !== instanceId) continue;
      for (const r of upstreamRelations(b.from.node)) push(r); // deeper upstream first
    }
    const node = byId.get(instanceId);
    if (node) {
      for (const rel of node.artifact.relations) {
        push({ instance: instanceId, id: rel.id, citation: rel.citation, assumptions: rel.assumptions });
      }
    }
    upstreamCache.set(instanceId, out);
    return out;
  };

  for (const id of order) {
    const node = byId.get(id)!;
    const inBindings = bindings.filter((b) => b.to.node === id);
    // classify every bound input ONCE against the (already-evaluated) source
    const decisions = inBindings.map((b) => ({
      b,
      d: classifyBoundInput(records[b.from.node], b.from.port),
    }));

    // Assemble the node's evaluation env. Bound ports are OWNED BY THE WIRE: a
    // forwarded binding drives its port; a withheld/incomplete binding REMOVES
    // the port so a stale knob default or material value can never silently
    // satisfy a driven input — it goes absent and the plan refuses honestly
    // instead of emitting a plausible wrong number (invariant 5).
    const env: VarRecord = {
      ...constantValues(node.artifact),
      ...node.knobs,
      ...(node.materialValues ?? {}),
    };
    const refusedBy: { instance: string; port: string }[] = [];
    const injected: ValidityMessage[] = [];
    let refused = false;
    let incomplete = false;

    for (const { b, d } of decisions) {
      if (d.effect === "forward") {
        env[b.to.port] = d.value;
        continue;
      }
      delete env[b.to.port]; // withheld/incomplete: the wire, not a default, owns this port
      if (d.effect === "withheld-global") {
        refused = true;
        refusedBy.push({ instance: b.from.node, port: b.from.port });
        injected.push({
          severity: "invalid",
          message: `refused by upstream: '${b.from.node}' is invalid — bound input '${b.to.port}' withheld`,
        });
      } else if (d.effect === "withheld-scoped") {
        refused = true;
        refusedBy.push({ instance: b.from.node, port: b.from.port });
        injected.push({
          severity: "invalid",
          message: `refused by upstream: '${b.from.node}.${b.from.port}' is refused — bound input '${b.to.port}' withheld`,
        });
      } else {
        incomplete = true; // (d)
      }
    }

    const engine = new RelationEngine(node.artifact, node.fns);
    const base = engine.evaluate(node.configId, env, node.branch);

    let result = base;
    let status: NodeStatus = "evaluated";
    if (refused) {
      status = "refused-by-upstream";
      // Force a GLOBAL refusal so no finite-but-refused value the node happened
      // to compute from its remaining inputs can leak downstream (invariant 5);
      // the injected reason leads, the node's own messages follow. This is also
      // what makes propagation transitive: `classifyBoundInput` sees `invalid`.
      result = { ...base, invalid: true, messages: [...injected, ...base.messages] };
    } else if (incomplete) {
      status = "incomplete"; // rule (d): a node-record status, NOT an invalid
      // message — S22 owns the "waiting on an input" UI copy.
    }

    records[id] = { instanceId: id, status, result, refusedBy };

    for (const { b, d } of decisions) {
      const rels = upstreamRelations(b.from.node);
      provenance.push({
        from: { instance: b.from.node, port: b.from.port },
        to: { instance: id, port: b.to.port },
        value: d.effect === "forward" ? d.value : null,
        withheld: d.effect !== "forward",
        relations: rels,
        citations: dedupe(rels.map((r) => r.citation)),
      });
    }
  }

  return { order, nodes: records, provenance };
}
