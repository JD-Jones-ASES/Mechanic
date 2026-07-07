/**
 * chain-url.ts (S23): versioned URL-fragment serialization of a chain-builder
 * state, so a chain is shareable as a plain URL on a static site — and decodes
 * with graceful, LEGIBLE degradation as the catalog evolves.
 *
 * FORMAT (DECIDED, S23 brief): the fragment is the literal prefix `#v1=`
 * followed by base64url(UTF-8 JSON) of the S22 store, VERBATIM shape
 *   { nodes:[{id,slug,config}], bindings:[{from:{node,port},to:{node,port}}],
 *     knobs:{nodeId:{sym:SI}}, materials:{nodeId:matId}, displayUnits:{nodeId:{sym:unit}} }
 * The `#v1=` prefix ALONE carries the format version — there is NO inner
 * `version` field. SI floats serialize via `JSON.stringify`, which emits the
 * shortest string that round-trips the IEEE-754 double exactly, so decode
 * reproduces every value bit-for-bit. Knobs equal to the variable's `default`
 * (exact SI equality) are OMITTED; the decoder refills defaults. A compact
 * grammar was REJECTED (more code, more bug surface; the fragment length budget
 * is generous).
 *
 * DEGRADATION (DECIDED — the module's validity model). A shared link is decoded
 * against the CURRENT catalog artifacts, and every one of its slugs / config ids
 * / ports / material ids / display units can rot as the catalog grows. So
 * degradation is the NORMAL path, not the exception, and every drop/fallback is
 * named in the returned `dropped` list (the caller renders a banner):
 *   - unknown slug / not loaded / unknown configuration -> drop the node AND its wires;
 *   - a wire the CURRENT type-checker rejects (unknown port, now-incompatible
 *     dimension/kind, fan-in, or a cycle) -> drop only that wire;
 *   - unknown material id -> fall back to the node's default material;
 *   - unknown display unit -> fall back to the default (SI) unit.
 * Silently computing a DIFFERENT chain is the forbidden failure mode
 * (invariant 5), which also drives the strict parse: a higher format version
 * refuses the WHOLE link (never best-effort-parse a future format), and a
 * malformed payload — bad base64url/JSON, a cap violation, or a NON-NUMBER knob
 * value (which would else silently snap to a default and change a number) —
 * refuses with a message and an empty builder.
 *
 * LAYERING: this module lives in `engines/` (brief) but depends on the pure,
 * Preact-free `chain-builder-model.ts` — the OWNER of the store shape (the S22
 * serialization contract) and the canonical material-qualification predicate
 * (invariant 4: one definition, never re-implemented here). Unlike `chain-eval`
 * it is not used in build-time wayfinding, so the headless-engine constraint
 * does not bind it; importing the model drags in no Preact (verified: the model
 * imports only engines + `material-data`, both pure).
 */
import { ChainGraph, type Binding } from "./chain.ts";
import { ports } from "./chain-eval.ts";
import type { CompiledThing } from "./types.ts";
import {
  type CatalogThing,
  type ChainStore,
  configOf,
  defaultMaterialId,
  emptyStore,
  hasMaterial,
  MAX_NODES,
  type NodeSpec,
  qualifyingMaterials,
} from "../components/chain-builder-model.ts";
import type { MaterialRow } from "./../components/material-data.ts";

/** The only format version this build writes and reads. A `#v<n>=` with n > this
 * is refused whole (never best-effort-parsed). Bump ONLY in a session that keeps
 * the frozen-URL e2e green — v1 is a forever-decodable contract. */
export const FORMAT_VERSION = 1;

/** Everything decode needs to validate a link against the live catalog; encode
 * uses only `artifacts` (for the omit-defaults comparison). One context type for
 * both keeps the caller's wiring symmetric. */
export interface ChainUrlContext {
  /** buildable (branches===null) THINGs + their configs, spine-ordered */
  catalog: CatalogThing[];
  /** compiled artifacts by slug — the caller lazy-loads exactly the slugs a
   * fragment names (see `previewSlugs`) before decoding, honoring page weight */
  artifacts: Record<string, CompiledThing>;
  /** full material rows (qualification + default resolution happen here) */
  materials: MaterialRow[];
}

/** One legible degradation event. `message` is the exact banner line (tests and
 * UI read it); `code` groups them for styling/telemetry-free counting. */
export interface Drop {
  code: "node" | "binding" | "material" | "unit";
  message: string;
}

export interface DecodeResult {
  store: ChainStore;
  /** every drop/fallback, in encounter order; empty when the link was clean */
  dropped: Drop[];
  /** a WHOLE-link refusal (newer version, or malformed) — store is empty then */
  error: string | null;
}

/* ---------------- base64url (environment-agnostic) ---------------- */
// Runs identically in the browser and in `node --test` (Node 24): `btoa`/`atob`
// are globals in both, and TextEncoder/TextDecoder make it UTF-8-safe (var
// symbols are ASCII today, but a non-ASCII material name or label must never
// corrupt the payload). No `Buffer` — that is Node-only.

function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  const padded = pad ? b64 + "=".repeat(4 - pad) : b64; // atob wants padding
  const bin = atob(padded); // throws on an invalid base64 alphabet
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/* ---------------- parse + structural validation ---------------- */

type Parsed =
  | { kind: "empty" } // no fragment, or a fragment that isn't ours (a plain #anchor)
  | { kind: "version"; version: number } // #v<n>= with n !== FORMAT_VERSION
  | { kind: "malformed"; reason: string }
  | { kind: "ok"; raw: ChainStore };

const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);

/**
 * Structural validation: shape-checks the parsed JSON against the store contract
 * and normalizes it (missing top-level sections default to empty — lenient
 * decode). Anything structurally wrong, over the node cap, or carrying a
 * non-finite/non-number knob value is a malformed payload — refused whole rather
 * than partially trusted (a coerced number would silently change the chain).
 */
function validateShape(obj: unknown): { ok: true; store: ChainStore } | { ok: false; reason: string } {
  if (!isObj(obj)) return { ok: false, reason: "not an object" };

  const nodesRaw = obj.nodes ?? [];
  if (!Array.isArray(nodesRaw)) return { ok: false, reason: "nodes is not a list" };
  if (nodesRaw.length > MAX_NODES) return { ok: false, reason: `too many nodes (>${MAX_NODES})` };
  const nodes: NodeSpec[] = [];
  const ids = new Set<string>();
  for (const n of nodesRaw) {
    if (!isObj(n) || typeof n.id !== "string" || typeof n.slug !== "string" || typeof n.config !== "string") {
      return { ok: false, reason: "a node is malformed" };
    }
    if (!n.id || !n.slug || !n.config) return { ok: false, reason: "a node has an empty field" };
    if (ids.has(n.id)) return { ok: false, reason: `duplicate node id '${n.id}'` };
    ids.add(n.id);
    nodes.push({ id: n.id, slug: n.slug, config: n.config });
  }

  const bindingsRaw = obj.bindings ?? [];
  if (!Array.isArray(bindingsRaw)) return { ok: false, reason: "bindings is not a list" };
  const bindings: Binding[] = [];
  for (const b of bindingsRaw) {
    if (
      !isObj(b) ||
      !isObj(b.from) ||
      !isObj(b.to) ||
      typeof b.from.node !== "string" ||
      typeof b.from.port !== "string" ||
      typeof b.to.node !== "string" ||
      typeof b.to.port !== "string"
    ) {
      return { ok: false, reason: "a binding is malformed" };
    }
    bindings.push({ from: { node: b.from.node, port: b.from.port }, to: { node: b.to.node, port: b.to.port } });
  }

  // knobs: nodeId -> sym -> FINITE number. A present-but-non-number value is
  // corruption, not an omitted default — refuse (never coerce to a default and
  // silently compute a different chain).
  const knobs: ChainStore["knobs"] = {};
  const knobsRaw = obj.knobs ?? {};
  if (!isObj(knobsRaw)) return { ok: false, reason: "knobs is not an object" };
  for (const [nodeId, rec] of Object.entries(knobsRaw)) {
    if (!isObj(rec)) return { ok: false, reason: `knobs['${nodeId}'] is not an object` };
    const out: Record<string, number> = {};
    for (const [sym, val] of Object.entries(rec)) {
      if (typeof val !== "number" || !Number.isFinite(val)) {
        return { ok: false, reason: `knob '${nodeId}.${sym}' is not a finite number` };
      }
      out[sym] = val;
    }
    knobs[nodeId] = out;
  }

  const materials: ChainStore["materials"] = {};
  const materialsRaw = obj.materials ?? {};
  if (!isObj(materialsRaw)) return { ok: false, reason: "materials is not an object" };
  for (const [nodeId, mid] of Object.entries(materialsRaw)) {
    if (typeof mid !== "string") return { ok: false, reason: `materials['${nodeId}'] is not a string` };
    materials[nodeId] = mid;
  }

  const displayUnits: ChainStore["displayUnits"] = {};
  const duRaw = obj.displayUnits ?? {};
  if (!isObj(duRaw)) return { ok: false, reason: "displayUnits is not an object" };
  for (const [nodeId, rec] of Object.entries(duRaw)) {
    if (!isObj(rec)) return { ok: false, reason: `displayUnits['${nodeId}'] is not an object` };
    const out: Record<string, string> = {};
    for (const [sym, unit] of Object.entries(rec)) {
      if (typeof unit !== "string") return { ok: false, reason: `displayUnits['${nodeId}.${sym}'] is not a string` };
      out[sym] = unit;
    }
    displayUnits[nodeId] = out;
  }

  return { ok: true, store: { nodes, bindings, knobs, materials, displayUnits } };
}

function parsePayload(fragment: string): Parsed {
  if (!fragment) return { kind: "empty" };
  const m = /^#?v(\d+)=([\s\S]*)$/.exec(fragment);
  if (!m) return { kind: "empty" }; // not our fragment (e.g. a plain #section anchor)
  const version = Number(m[1]);
  if (version !== FORMAT_VERSION) return { kind: "version", version };
  let json: string;
  try {
    json = fromBase64Url(m[2]);
  } catch {
    return { kind: "malformed", reason: "the data is not valid base64url" };
  }
  let obj: unknown;
  try {
    obj = JSON.parse(json);
  } catch {
    return { kind: "malformed", reason: "the data is not valid JSON" };
  }
  const v = validateShape(obj);
  return v.ok ? { kind: "ok", raw: v.store } : { kind: "malformed", reason: v.reason };
}

/* ---------------- encode ---------------- */

/**
 * Serialize a live builder state to a `#v1=` fragment. Deterministic (stable key
 * order, driven by `store.nodes` order) so an unchanged chain re-encodes to the
 * identical URL — `history.replaceState` never churns. Default-valued knobs are
 * omitted (the decoder refills them from the artifact); empty per-node objects
 * are pruned. `ctx.artifacts` supplies each variable's `default` for the exact-SI
 * omit comparison; a node whose artifact isn't loaded keeps all its knobs (still
 * decodes correctly, just longer).
 */
export function encodeChain(store: ChainStore, ctx: Pick<ChainUrlContext, "artifacts">): string {
  const knobs: ChainStore["knobs"] = {};
  const materials: ChainStore["materials"] = {};
  const displayUnits: ChainStore["displayUnits"] = {};

  for (const n of store.nodes) {
    const art = ctx.artifacts[n.slug];
    const stored = store.knobs[n.id] ?? {};
    const nk: Record<string, number> = {};
    for (const [sym, val] of Object.entries(stored)) {
      const def = art?.variables[sym]?.default;
      if (def !== undefined && val === def) continue; // omit exact default; decoder refills
      nk[sym] = val;
    }
    if (Object.keys(nk).length > 0) knobs[n.id] = nk;

    const mid = store.materials[n.id];
    if (mid !== undefined) materials[n.id] = mid; // one id per node (not omitted)

    const du = store.displayUnits[n.id] ?? {};
    if (Object.keys(du).length > 0) displayUnits[n.id] = du;
  }

  const compact: ChainStore = {
    nodes: store.nodes.map((n) => ({ id: n.id, slug: n.slug, config: n.config })),
    bindings: store.bindings,
    knobs,
    materials,
    displayUnits,
  };
  return `#v${FORMAT_VERSION}=` + toBase64Url(JSON.stringify(compact));
}

/* ---------------- decode ---------------- */

const wireStr = (b: Binding) => `${b.from.node}.${b.from.port} → ${b.to.node}.${b.to.port}`;

/**
 * Decode a fragment against the live catalog. Returns the largest valid
 * sub-chain plus a `dropped` list naming every degradation, or a whole-link
 * `error` (newer version / malformed). Pure and synchronous: the caller
 * pre-loads the artifacts a fragment names (via `previewSlugs`) and hands them in
 * `ctx`, so this never does IO and is unit-testable headless.
 */
export function decodeChain(fragment: string, ctx: ChainUrlContext): DecodeResult {
  const parsed = parsePayload(fragment);
  if (parsed.kind === "empty") return { store: emptyStore(), dropped: [], error: null };
  if (parsed.kind === "version") {
    return {
      store: emptyStore(),
      dropped: [],
      error: `This link was made by a newer version of the chain builder (v${parsed.version}) and can't be opened here. Rebuild the chain, or update.`,
    };
  }
  if (parsed.kind === "malformed") {
    return {
      store: emptyStore(),
      dropped: [],
      error: `This chain link couldn't be read — it looks corrupted (${parsed.reason}).`,
    };
  }

  const raw = parsed.raw;
  const dropped: Drop[] = [];
  const catBySlug = new Map(ctx.catalog.map((c) => [c.slug, c]));

  // 1) nodes — a node survives only if its slug is a loaded, buildable catalog
  //    entry AND its configuration is a buildable config of that entry.
  const keptNodes: NodeSpec[] = [];
  const droppedNodeIds = new Set<string>();
  const dropNode = (n: NodeSpec, why: string) => {
    droppedNodeIds.add(n.id);
    dropped.push({ code: "node", message: `Dropped "${n.slug}" (${n.id}): ${why}` });
  };
  for (const n of raw.nodes) {
    const cat = catBySlug.get(n.slug);
    const art = ctx.artifacts[n.slug];
    if (!cat) {
      dropNode(n, "that component is no longer in the catalog.");
      continue;
    }
    if (!art) {
      dropNode(n, "it could not be loaded.");
      continue;
    }
    if (!cat.configs.some((c) => c.id === n.config) || !art.configurations.some((c) => c.id === n.config)) {
      dropNode(n, `configuration "${n.config}" no longer exists.`);
      continue;
    }
    keptNodes.push(n);
  }
  const keptIds = new Set(keptNodes.map((n) => n.id));
  const artOf = (n: NodeSpec) => ctx.artifacts[n.slug]!;

  // 2) bindings — run every surviving wire through the SAME ChainGraph the
  //    builder and the eval engine use (invariant 4, one type-checker), so a
  //    port that vanished, a dimension/kind that changed, a fan-in, or a cycle is
  //    dropped with the engine's own reason rather than thrown by evaluateChain.
  const graph = new ChainGraph();
  for (const n of keptNodes) graph.addNode({ id: n.id, ...ports(artOf(n), n.config) });
  const boundInputs = new Set<string>();
  const keptBindings: Binding[] = [];
  for (const b of raw.bindings) {
    if (droppedNodeIds.has(b.from.node) || droppedNodeIds.has(b.to.node)) {
      dropped.push({ code: "binding", message: `Dropped the wire ${wireStr(b)}: a connected node was dropped.` });
      continue;
    }
    if (!keptIds.has(b.from.node) || !keptIds.has(b.to.node)) {
      dropped.push({ code: "binding", message: `Dropped the wire ${wireStr(b)}: it references a node not in this chain.` });
      continue;
    }
    const key = `${b.to.node} ${b.to.port}`;
    if (boundInputs.has(key)) {
      dropped.push({ code: "binding", message: `Dropped a duplicate wire into ${b.to.node}.${b.to.port}.` });
      continue;
    }
    const res = graph.connect(b);
    if (!res.ok) {
      dropped.push({ code: "binding", message: `Dropped the wire ${wireStr(b)}: ${res.reason}.` });
      continue;
    }
    boundInputs.add(key);
    keptBindings.push(b);
  }

  // 3) knobs — reconstruct EXACTLY the config's inputs: an omitted (default) or
  //    absent input refills to the artifact default; a stored finite value wins;
  //    an input not in this config is silently ignored (inert — never fed to eval).
  const knobs: ChainStore["knobs"] = {};
  for (const n of keptNodes) {
    const art = artOf(n);
    const cfg = configOf(art, n.config);
    const stored = raw.knobs[n.id] ?? {};
    const nk: Record<string, number> = {};
    for (const sym of cfg.inputs) {
      const v = stored[sym];
      nk[sym] = typeof v === "number" && Number.isFinite(v) ? v : art.variables[sym]!.default;
    }
    knobs[n.id] = nk;
  }

  // 4) materials — one id per node; an unknown/non-qualifying id falls back to
  //    the node's default material (named in the banner only when a real choice
  //    was lost). Values are NEVER serialized — they come from data/materials/.
  const materials: ChainStore["materials"] = {};
  for (const n of keptNodes) {
    const art = artOf(n);
    if (!hasMaterial(art)) continue;
    const want = raw.materials[n.id];
    const def = defaultMaterialId(art, ctx.materials);
    if (want && qualifyingMaterials(art, ctx.materials).some((m) => m.id === want)) {
      materials[n.id] = want;
    } else {
      materials[n.id] = def;
      if (want && want !== def) {
        dropped.push({
          code: "material",
          message: `Node "${n.slug}" (${n.id}): material "${want}" is unavailable — using the default${def ? ` ("${def}")` : ""} instead.`,
        });
      }
    }
  }

  // 5) display units — presentational only; an unknown token for a symbol falls
  //    back to the default unit (the number is unchanged either way).
  const displayUnits: ChainStore["displayUnits"] = {};
  for (const n of keptNodes) {
    const art = artOf(n);
    const stored = raw.displayUnits[n.id] ?? {};
    const du: Record<string, string> = {};
    for (const [sym, token] of Object.entries(stored)) {
      const meta = art.variables[sym];
      if (meta && meta.display_units.includes(token)) {
        du[sym] = token;
      } else {
        dropped.push({
          code: "unit",
          message: `Node "${n.slug}" (${n.id}): display unit "${token}" for ${sym} is unavailable — showing the default unit.`,
        });
      }
    }
    displayUnits[n.id] = du;
  }

  return { store: { nodes: keptNodes, bindings: keptBindings, knobs, materials, displayUnits }, dropped, error: null };
}

/**
 * The distinct slugs a fragment names, for the caller to lazy-load BEFORE
 * decoding (so decode's `ctx.artifacts` is populated, and page weight stays
 * targeted — only the link's THINGs load, not all 36). Returns [] for an empty,
 * foreign, version-mismatched, or malformed fragment — decode surfaces those.
 */
export function previewSlugs(fragment: string): string[] {
  const parsed = parsePayload(fragment);
  if (parsed.kind !== "ok") return [];
  return [...new Set(parsed.raw.nodes.map((n) => n.slug))];
}
