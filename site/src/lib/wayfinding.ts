/**
 * THING-page wayfinding, computed at BUILD time (ADR-0010 §4; D2). Three derived
 * views over the catalog, none authored per THING:
 *
 *   - related THINGs  (same topic → same category → shared facet),
 *   - "chains with"   (the legal wires a THING's outputs can feed, decided by the
 *                      engine's own `connectionLegal` — invariant 2 made visible),
 *   - prev/next       (spine neighbours, the same order the catalog owns).
 *
 * All of it is a pure function of the compiled artifacts + authored taxonomy, so
 * it lives here (not in per-page frontmatter) and is computed ONCE per build:
 * `buildWayfinding` memoises, so the O(N²·ports) chain scan runs a single time
 * for all 36 pages, not once per page (D2 brief trap).
 *
 * Reuse, not re-implementation (invariant 4): the legality verdict is the very
 * `connectionLegal` the runtime planner and the chaining demo use; this module
 * only enumerates ports and asks it. `planTargets` (a THING's produced variables)
 * is reused from the chain-eval engine so the output set matches what a real
 * chain would forward. Headless — no astro:content, no components.
 */
import { planTargets } from "../engines/chain-eval";
import type { CompiledThing } from "../engines/types";
import { connectionLegal, type Port } from "../engines/units";
import { spineOrdered } from "./catalog";

/** The authored-taxonomy slice of a THING that related/neighbours need. Matches
 * `getCollection("things")` data (id + title + summary + category/topic + facets). */
export interface ThingTaxon {
  id: string;
  title: string;
  summary: string;
  category: string;
  topic?: string;
  facets: string[];
}

export interface RelatedThing {
  id: string;
  title: string;
  summary: string;
  category: string;
  topic?: string;
  facets: string[];
  /** why it surfaced — the strongest tier that matched (topic > category > facet) */
  relation: "topic" | "category" | "facet";
}

/** One legal outbound wire target: another THING this THING's outputs can drive,
 * with the specific (output → input) port pairs the type system accepts. */
export interface ChainTarget {
  toThing: string;
  toTitle: string;
  wires: { fromPort: string; toPort: string }[];
}

export interface ChainsWith {
  /** spine-ordered, capped at DISPLAY_CAP targets */
  targets: ChainTarget[];
  /** total legal target THINGs before the cap (for an honest "+k more" line) */
  totalTargets: number;
}

export interface Neighbors {
  prev?: { id: string; title: string };
  next?: { id: string; title: string };
}

export interface Wayfinding {
  neighbors: Map<string, Neighbors>;
  related: Map<string, RelatedThing[]>;
  chains: Map<string, ChainsWith>;
}

/** Max related cards shown under a THING (topic siblings rarely exceed this). */
const RELATED_CAP = 6;
/** Max "chains with" target THINGs shown; the surplus is disclosed as "+k more",
 * never dropped silently (D2 honesty rule). */
const DISPLAY_CAP = 8;

const varPort = (a: CompiledThing, sym: string): Port => ({
  dim: a.variables[sym]!.dim,
  quantity_kind: a.variables[sym]!.quantity_kind,
});

/** Every variable ANY configuration of this THING produces (a `table` step fills
 * several targets; reuse `planTargets` so the set matches a real chain's forward
 * values). These are the ports another THING could read FROM. */
function outputPorts(a: CompiledThing): Record<string, Port> {
  const syms = new Set<string>();
  for (const cfg of a.configurations) for (const t of planTargets(cfg.plan)) syms.add(t);
  return Object.fromEntries([...syms].map((s) => [s, varPort(a, s)]));
}

/** Every variable ANY configuration of this THING consumes — the ports another
 * THING's output could drive INTO. (A symbol that is an input in one config and a
 * derived output in another appears in both sets, correctly.) */
function inputPorts(a: CompiledThing): Record<string, Port> {
  const syms = new Set<string>();
  for (const cfg of a.configurations) for (const s of cfg.inputs) syms.add(s);
  return Object.fromEntries([...syms].map((s) => [s, varPort(a, s)]));
}

function computeChains(compiled: CompiledThing[], spineIndex: Map<string, number>): Map<string, ChainsWith> {
  const outs = new Map(compiled.map((a) => [a.thing, outputPorts(a)]));
  const ins = new Map(compiled.map((a) => [a.thing, inputPorts(a)]));
  const titleBySlug = new Map(compiled.map((a) => [a.thing, a.title]));

  const map = new Map<string, ChainsWith>();
  for (const a of compiled) {
    const byTarget = new Map<string, { fromPort: string; toPort: string }[]>();
    for (const [fromPort, op] of Object.entries(outs.get(a.thing)!)) {
      for (const b of compiled) {
        // outbound to OTHER THINGs only: a THING feeding another instance of
        // itself is legal in the engine but reads as a cycle here, so it is left
        // out of wayfinding and the UI says "another THING" plainly.
        if (b.thing === a.thing) continue;
        for (const [toPort, ip] of Object.entries(ins.get(b.thing)!)) {
          if (connectionLegal(op, ip).ok) {
            const list = byTarget.get(b.thing) ?? [];
            list.push({ fromPort, toPort });
            byTarget.set(b.thing, list);
          }
        }
      }
    }

    const targetsAll = [...byTarget.entries()]
      .map(([toThing, wires]) => ({
        toThing,
        toTitle: titleBySlug.get(toThing)!,
        // stable wire order (by output port, then input port) — no Date/random
        wires: wires.sort((x, y) => x.fromPort.localeCompare(y.fromPort) || x.toPort.localeCompare(y.toPort)),
      }))
      // deterministic target order = spine order (also what "top N" means here)
      .sort((x, y) => spineIndex.get(x.toThing)! - spineIndex.get(y.toThing)!);

    map.set(a.thing, { targets: targetsAll.slice(0, DISPLAY_CAP), totalTargets: targetsAll.length });
  }
  return map;
}

function computeRelated(things: ThingTaxon[]): Map<string, RelatedThing[]> {
  const map = new Map<string, RelatedThing[]>();
  for (const t of things) {
    const others = things.filter((o) => o.id !== t.id);
    const shared = (o: ThingTaxon) => o.facets.filter((f) => t.facets.includes(f));
    const sameTopic = (o: ThingTaxon) => o.category === t.category && (o.topic ?? null) === (t.topic ?? null);

    // three tiers, strongest first. A topicless category (mechanisms-dynamics)
    // has all its members in tier 1 (same category counts as same topic there).
    const tier1 = others.filter(sameTopic);
    const tier2 = others.filter((o) => o.category === t.category && !sameTopic(o));
    const tier3 = others.filter((o) => o.category !== t.category && shared(o).length > 0);

    const rank = (arr: ThingTaxon[], relation: RelatedThing["relation"]): RelatedThing[] =>
      [...arr]
        .sort((a, b) => shared(b).length - shared(a).length || a.title.localeCompare(b.title))
        .map((o) => ({
          id: o.id,
          title: o.title,
          summary: o.summary,
          category: o.category,
          topic: o.topic,
          facets: o.facets,
          relation,
        }));

    const seen = new Set<string>();
    const ordered = [...rank(tier1, "topic"), ...rank(tier2, "category"), ...rank(tier3, "facet")]
      .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
      .slice(0, RELATED_CAP);
    map.set(t.id, ordered);
  }
  return map;
}

function computeNeighbors(order: ThingTaxon[]): Map<string, Neighbors> {
  const map = new Map<string, Neighbors>();
  order.forEach((t, i) => {
    map.set(t.id, {
      prev: i > 0 ? { id: order[i - 1]!.id, title: order[i - 1]!.title } : undefined,
      next: i < order.length - 1 ? { id: order[i + 1]!.id, title: order[i + 1]!.title } : undefined,
    });
  });
  return map;
}

let _cache: Wayfinding | null = null;

/**
 * Build (once, memoised) the whole wayfinding index. `things` is the authored
 * taxonomy (getCollection("things") data); `compiled` is the compiled-artifact
 * data (assignable to CompiledThing, as the THING page already treats it). The
 * first call computes all three maps for the whole catalog; every later page
 * reuses the cache, so the pairwise chain scan runs exactly once per build.
 */
export function buildWayfinding(things: ThingTaxon[], compiled: CompiledThing[]): Wayfinding {
  if (_cache) return _cache;
  const order = spineOrdered(things);
  const spineIndex = new Map(order.map((t, i) => [t.id, i]));
  _cache = {
    neighbors: computeNeighbors(order),
    related: computeRelated(things),
    chains: computeChains(compiled, spineIndex),
  };
  return _cache;
}
