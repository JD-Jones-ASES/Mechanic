/**
 * /chain-builder/ (S22): pick THINGs and configurations from the catalog, add up
 * to six node instances, wire output ports to input ports through native
 * `<select>` rows, and watch every node evaluate in planner order with the full
 * per-THING UI. Orchestration lives entirely in the headless `chain-eval` engine
 * (S21) and the pure `chain-builder-model` (unit-tested); this component is the
 * render + event layer.
 *
 * Invariants honored here:
 *  - the store is the single source of truth; the ChainGraph is rebuilt from it
 *    on every evaluation (never a long-lived mutated graph — brief trap);
 *  - a THING's fns + artifact load lazily on node-add (import.meta.glob), never
 *    eagerly (page-weight budget);
 *  - wires are validated by the REAL ChainGraph (rejection strings are the
 *    engine's own); refusals propagate per S21's decided rule table;
 *  - controls are native for keyboard + a11y (ADR-0006).
 */
import { useCallback, useMemo, useRef, useState } from "preact/hooks";
import { type NodeEvalRecord, planTargets } from "../engines/chain-eval";
import type { CompiledThing, Fn } from "../engines/types";
import {
  addNode,
  boundInputsOf,
  type CatalogThing,
  type ChainStore,
  configOf,
  emptyStore,
  evaluateStore,
  hasMaterial,
  type Loaded,
  type LoadedThing,
  MAX_NODES,
  mergedBinding,
  nodePorts,
  nodeUiState,
  qualifyingMaterials,
  removeBinding,
  removeNode,
  setDisplayUnit,
  setKnob,
  setMaterial,
  tryConnect,
} from "./chain-builder-model";
import { KnobPanel } from "./KnobPanel";
import { MaterialPicker, type MaterialRow } from "./MaterialPicker";
import { Readouts } from "./Readouts";
import { ValidityBanner } from "./ValidityBanner";

// Lazy module maps — a THING's compiled artifact (JSON) and generated pure fns
// load only when a node using it is added, so neither is in the eager graph.
const artifactModules = import.meta.glob("../generated/things/*.compiled.json");
const fnsModules = import.meta.glob("../generated/things/*.fns.ts");

interface Props {
  /** buildable (branches===null) THINGs, spine-ordered, from the Astro page */
  catalog: CatalogThing[];
  /** category slug -> display name, spine order (for the picker's optgroups) */
  categories: { slug: string; name: string }[];
  /** full material rows (qualification + resolution happen UI-side) */
  materials: MaterialRow[];
}

const STATE_LABEL: Record<string, string> = {
  loading: "loading…",
  ok: "evaluated",
  warn: "caution",
  refused: "refused",
  partial: "some outputs refused",
  "refused-upstream": "refused (upstream)",
  incomplete: "incomplete",
};

/** the current value if still a valid option, else the first option (keeps a
 * wire-draft select from stranding on a removed node/port — brief trap c) */
const effective = (opts: string[], current: string) =>
  opts.includes(current) ? current : (opts[0] ?? "");

export default function ChainBuilder({ catalog, categories, materials }: Props) {
  const [store, setStore] = useState<ChainStore>(emptyStore);
  const [loaded, setLoaded] = useState<Loaded>({});
  const [pick, setPick] = useState("");
  const [wireError, setWireError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ fromNode: "", fromPort: "", toNode: "", toPort: "" });
  const inflight = useRef(new Map<string, Promise<LoadedThing>>());

  const ensureLoaded = useCallback(
    (slug: string): Promise<LoadedThing> => {
      const have = loaded[slug];
      if (have) return Promise.resolve(have);
      const running = inflight.current.get(slug);
      if (running) return running;
      const p = Promise.all([
        artifactModules[`../generated/things/${slug}.compiled.json`]!(),
        fnsModules[`../generated/things/${slug}.fns.ts`]!(),
      ])
        .then(([a, f]) => {
          const lt: LoadedThing = {
            artifact: (a as { default: CompiledThing }).default,
            fns: (f as { fns: Record<string, Fn> }).fns,
          };
          setLoaded((prev) => ({ ...prev, [slug]: lt }));
          return lt;
        })
        .catch((e) => {
          // never cache a REJECTED promise under the slug — a transient import
          // failure would otherwise wedge that THING until reload. Drop it so the
          // next add retries.
          inflight.current.delete(slug);
          throw e;
        });
      inflight.current.set(slug, p);
      return p;
    },
    [loaded],
  );

  const handleAdd = useCallback(async () => {
    if (!pick || store.nodes.length >= MAX_NODES) return;
    const sep = pick.indexOf("::"); // slug is [a-z0-9-]+, so the first "::" splits
    if (sep < 0) return;
    const slug = pick.slice(0, sep);
    const config = pick.slice(sep + 2);
    try {
      const lt = await ensureLoaded(slug);
      setStore((s) => addNode(s, slug, config, lt.artifact, materials));
      setLoadError(null);
    } catch {
      setLoadError(`Could not load "${slug}" — check your connection and try again.`);
    }
  }, [pick, store.nodes.length, ensureLoaded, materials]);

  const { result, ready, error } = useMemo(
    () => evaluateStore(store, loaded, materials),
    [store, loaded, materials],
  );

  const nodeById = useMemo(() => new Map(store.nodes.map((n) => [n.id, n])), [store.nodes]);
  const order = result?.order ?? store.nodes.map((n) => n.id);
  const titleOf = (id: string) => {
    const n = nodeById.get(id);
    const lt = n && loaded[n.slug];
    return lt ? lt.artifact.title : id;
  };

  // --- wire-draft options, always recomputed so a removed node can't strand a
  //     stale selection (the effective value falls back to the first option) ---
  const nodeIds = store.nodes.map((n) => n.id);
  const portsOf = (id: string) => {
    const n = nodeById.get(id);
    const lt = n && loaded[n.slug];
    return lt && n ? nodePorts(lt.artifact, n.config) : { inputs: {}, outputs: {} };
  };
  const fromNode = effective(nodeIds, draft.fromNode);
  const fromPorts = Object.keys(portsOf(fromNode).outputs);
  const fromPort = effective(fromPorts, draft.fromPort);
  const toNodes = nodeIds.filter((id) => id !== fromNode);
  const toNode = effective(toNodes, draft.toNode);
  const toBound = boundInputsOf(store, toNode);
  const toPorts = Object.keys(portsOf(toNode).inputs).filter((p) => !toBound.has(p));
  const toPort = effective(toPorts, draft.toPort);

  const handleConnect = useCallback(() => {
    if (!fromNode || !fromPort || !toNode || !toPort) return;
    const out = tryConnect(store, loaded, { node: fromNode, port: fromPort }, { node: toNode, port: toPort });
    if (out.ok) {
      setStore(out.store);
      setWireError(null);
    } else {
      setWireError(out.reason ?? "connection rejected");
    }
  }, [store, loaded, fromNode, fromPort, toNode, toPort]);

  const canWire = store.nodes.length >= 2 && ready;

  return (
    <section class="chain-builder" data-testid="chain-builder" data-ready={ready ? "true" : "false"}>
      {/* ---------------- catalog picker ---------------- */}
      <div class="cb-toolbar">
        <label class="cb-pick">
          <span>Add a THING</span>
          <select
            data-testid="node-picker"
            value={pick}
            onInput={(e) => setPick(e.currentTarget.value)}
          >
            <option value="">Choose a component…</option>
            {categories.map((cat) => {
              const inCat = catalog.filter((t) => t.category === cat.slug);
              if (inCat.length === 0) return null;
              return (
                <optgroup label={cat.name} key={cat.slug}>
                  {inCat.flatMap((t) =>
                    t.configs.map((c) => (
                      <option value={`${t.slug}::${c.id}`} key={`${t.slug}::${c.id}`}>
                        {t.configs.length > 1 ? `${t.title} — ${c.label}` : t.title}
                      </option>
                    )),
                  )}
                </optgroup>
              );
            })}
          </select>
        </label>
        <button
          type="button"
          data-testid="add-node"
          class="cb-add"
          disabled={!pick || store.nodes.length >= MAX_NODES}
          onClick={handleAdd}
        >
          Add node
        </button>
        <span class="cb-count" data-testid="node-count">
          {store.nodes.length} / {MAX_NODES} nodes
        </span>
      </div>

      {store.nodes.length >= MAX_NODES ? (
        <p class="cb-hint" role="note">
          Node limit reached — remove a node to add another (v1 caps chains at {MAX_NODES}).
        </p>
      ) : null}

      {loadError ? (
        <p class="validity-msg validity-invalid" data-testid="load-error" role="alert">
          {loadError}
        </p>
      ) : null}

      {error ? (
        <p class="validity-msg validity-invalid" role="alert">
          <strong>Chain error: </strong>
          {error}
        </p>
      ) : null}

      {/* ---------------- binding editor ---------------- */}
      {store.nodes.length >= 1 ? (
        <div class="cb-wiring" data-testid="wiring">
          <h2>Wiring</h2>
          {store.bindings.length === 0 ? (
            <p class="cb-hint">
              No wires yet. A binding forwards one THING's output into another's input; it is legal
              only when the SI dimension and the quantity kind both match.
            </p>
          ) : (
            <ul class="cb-wire-list">
              {store.bindings.map((b, i) => (
                <li class="cb-wire-row" data-testid="wire-row" key={`${b.from.node}.${b.from.port}->${b.to.node}.${b.to.port}`}>
                  <span class="cb-wire-label">
                    <strong>{titleOf(b.from.node)}</strong> <code>{b.from.port}</code>
                    <span aria-hidden="true"> → </span>
                    <strong>{titleOf(b.to.node)}</strong> <code>{b.to.port}</code>
                  </span>
                  <button
                    type="button"
                    class="cb-remove"
                    aria-label={`Remove wire ${b.from.node}.${b.from.port} to ${b.to.node}.${b.to.port}`}
                    onClick={() => setStore((s) => removeBinding(s, i))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {canWire ? (
            <div class="cb-add-wire">
              <label>
                <span class="sr-only">Source node</span>
                <select
                  data-testid="wire-from-node"
                  value={fromNode}
                  onInput={(e) => setDraft((d) => ({ ...d, fromNode: e.currentTarget.value }))}
                >
                  {nodeIds.map((id) => (
                    <option value={id} key={id}>
                      {titleOf(id)} ({id})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span class="sr-only">Source output port</span>
                <select
                  data-testid="wire-from-port"
                  value={fromPort}
                  onInput={(e) => setDraft((d) => ({ ...d, fromPort: e.currentTarget.value }))}
                >
                  {fromPorts.map((p) => (
                    <option value={p} key={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <span class="cb-arrow" aria-hidden="true">→</span>
              <label>
                <span class="sr-only">Target node</span>
                <select
                  data-testid="wire-to-node"
                  value={toNode}
                  onInput={(e) => setDraft((d) => ({ ...d, toNode: e.currentTarget.value }))}
                >
                  {toNodes.map((id) => (
                    <option value={id} key={id}>
                      {titleOf(id)} ({id})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span class="sr-only">Target input port</span>
                <select
                  data-testid="wire-to-port"
                  value={toPort}
                  onInput={(e) => setDraft((d) => ({ ...d, toPort: e.currentTarget.value }))}
                >
                  {toPorts.length === 0 ? (
                    <option value="">(all inputs wired)</option>
                  ) : (
                    toPorts.map((p) => (
                      <option value={p} key={p}>
                        {p}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <button
                type="button"
                data-testid="wire-connect"
                class="cb-connect"
                disabled={!toPort}
                onClick={handleConnect}
              >
                Connect
              </button>
            </div>
          ) : store.nodes.length >= 2 ? (
            <p class="cb-hint">Loading modules…</p>
          ) : (
            <p class="cb-hint">Add a second node to start wiring.</p>
          )}

          <p class="cb-wire-error" data-testid="wire-error" role="status" aria-live="polite">
            {wireError}
          </p>
        </div>
      ) : (
        <p class="cb-empty" data-testid="empty-hint">
          Pick a component above and add it to begin. Wire verified THINGs together and every number
          keeps its citation across the chain.
        </p>
      )}

      {/* ---------------- node cards, in planner evaluation order ---------------- */}
      <div class="cb-nodes">
        {order.map((id) => {
          const node = nodeById.get(id);
          if (!node) return null;
          const lt = loaded[node.slug];
          const record = result?.nodes[id];
          const state = nodeUiState(lt ? record : undefined);
          return (
            <article
              class={`cb-node cb-node-${state}`}
              data-testid={`node-${id}`}
              data-node-state={state}
              key={id}
            >
              <header class="cb-node-head">
                <h3>
                  {lt ? lt.artifact.title : node.slug} <span class="cb-node-id">{id}</span>
                </h3>
                <span class={`cb-state cb-state-${state}`}>{STATE_LABEL[state]}</span>
                <button
                  type="button"
                  class="cb-remove"
                  data-testid={`remove-${id}`}
                  aria-label={`Remove node ${id}`}
                  onClick={() => setStore((s) => removeNode(s, id))}
                >
                  Remove
                </button>
              </header>

              {lt ? (
                <NodeBody
                  id={id}
                  artifact={lt.artifact}
                  config={node.config}
                  store={store}
                  materials={materials}
                  record={record}
                  state={state}
                  setStore={setStore}
                />
              ) : (
                <p class="cb-hint">Loading module…</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- one node's body (material + knobs + readouts + validity) ---------------- */

interface NodeBodyProps {
  id: string;
  artifact: CompiledThing;
  config: string;
  store: ChainStore;
  materials: MaterialRow[];
  record: NodeEvalRecord | undefined;
  state: string;
  setStore: (u: (s: ChainStore) => ChainStore) => void;
}

function NodeBody({ id, artifact, config, store, materials, record, state, setStore }: NodeBodyProps) {
  const cfg = configOf(artifact, config);
  const bound = boundInputsOf(store, id);
  const freeInputs = cfg.inputs.filter((s) => !bound.has(s));
  const targets = planTargets(cfg.plan);
  const res = record?.result;
  const knobs = store.knobs[id] ?? {};
  const units = store.displayUnits[id] ?? {};

  return (
    <div class="cb-node-body">
      {hasMaterial(artifact) ? (
        // slot={id} gives each node's picker a UNIQUE testid/aria-label
        // (material-select-<id> / "<id> material") — the MaterialPicker analogue
        // of KnobPanel's idPrefix, so a multi-material chain has no duplicates.
        <MaterialPicker
          slot={id}
          materials={qualifyingMaterials(artifact, materials)}
          selectedId={store.materials[id] ?? ""}
          binding={mergedBinding(artifact)}
          onSelect={(mid) => setStore((s) => setMaterial(s, id, mid))}
        />
      ) : null}

      {freeInputs.length > 0 ? (
        <KnobPanel
          inputs={freeInputs}
          idPrefix={`${id}-`}
          variables={artifact.variables}
          values={knobs}
          displayUnits={units}
          onChange={(sym, si) => setStore((s) => setKnob(s, id, sym, si))}
          onUnitChange={(sym, u) => setStore((s) => setDisplayUnit(s, id, sym, u))}
        />
      ) : (
        <p class="cb-hint">All inputs are wired.</p>
      )}

      <Readouts
        targets={targets}
        variables={artifact.variables}
        values={res?.values ?? {}}
        invalid={res?.invalid ?? true}
        invalidVars={res?.invalidVars ?? []}
        displayUnits={units}
        onUnitChange={(sym, u) => setStore((s) => setDisplayUnit(s, id, sym, u))}
      />

      {state === "incomplete" ? (
        <p class="cb-incomplete" data-testid={`incomplete-${id}`}>
          Waiting on an input — connect a source or set a knob.
        </p>
      ) : null}

      <ValidityBanner messages={res?.messages ?? []} />
    </div>
  );
}
