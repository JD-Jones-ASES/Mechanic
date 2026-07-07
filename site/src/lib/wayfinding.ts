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
 * for every THING page, not once per page (D2 brief trap).
 *
 * Reuse, not re-implementation (invariant 4): the legality verdict is the very
 * `connectionLegal` the runtime planner and the chaining demo use; this module
 * only enumerates ports and asks it. `planTargets` (a THING's produced variables)
 * is reused from the chain-eval engine so the output set matches what a real
 * chain would forward. Headless — no astro:content, no components.
 */
import { planTargets, portOf } from "../engines/chain-eval";
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

/** Every variable ANY configuration of this THING produces (a `table` step fills
 * several targets; reuse `planTargets` so the set matches a real chain's forward
 * values). These are the ports another THING could read FROM. `portOf` is the
 * engine's own Port constructor (reuse, not a parallel copy — invariant 4). */
function outputPorts(a: CompiledThing): Record<string, Port> {
  const syms = new Set<string>();
  for (const cfg of a.configurations) for (const t of planTargets(cfg.plan)) syms.add(t);
  return Object.fromEntries([...syms].map((s) => [s, portOf(a, s)]));
}

/** Every variable ANY configuration of this THING consumes — the ports another
 * THING's output could drive INTO. (A symbol that is an input in one config and a
 * derived output in another appears in both sets, correctly.) */
function inputPorts(a: CompiledThing): Record<string, Port> {
  const syms = new Set<string>();
  for (const cfg of a.configurations) for (const s of cfg.inputs) syms.add(s);
  return Object.fromEntries([...syms].map((s) => [s, portOf(a, s)]));
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

    // three tiers, strongest first, MUTUALLY EXCLUSIVE by construction (same
    // category+topic / same category+other topic / different category) so their
    // concatenation needs no dedup. A topicless category (mechanisms-dynamics) has
    // all its members in tier 1 (same category counts as same topic there), and
    // tier 2 is then empty. Same-topic siblings therefore always precede weaker
    // matches and are never crowded out by the cap.
    const tier1 = others.filter(sameTopic);
    const tier2 = others.filter((o) => o.category === t.category && !sameTopic(o));
    const tier3 = others.filter((o) => o.category !== t.category && shared(o).length > 0);

    const rank = (arr: ThingTaxon[]): RelatedThing[] =>
      [...arr]
        .sort((a, b) => shared(b).length - shared(a).length || a.title.localeCompare(b.title))
        .map((o) => ({
          id: o.id,
          title: o.title,
          summary: o.summary,
          category: o.category,
          topic: o.topic,
          facets: o.facets,
        }));

    // Curated "closest few" suggestions, not an enumeration: capped at RELATED_CAP
    // with no "+k more" (unlike "chains with", which claims completeness and so
    // discloses its cap). At the current catalog the largest topic has exactly
    // RELATED_CAP same-topic siblings, so the cap only ever trims lower-relevance
    // cross-topic/facet padding, never a same-topic sibling.
    const ordered = [...rank(tier1), ...rank(tier2), ...rank(tier3)].slice(0, RELATED_CAP);
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
 * data (assignable to CompiledThing, as the THING page already treats it).
 *
 * The memo is a BUILD-PROCESS singleton: `astro build` evaluates this module once
 * and the only caller ([slug].astro) always passes the full catalog, so the first
 * call's maps are correct for every page and the O(N²·ports) chain scan runs
 * exactly once (the D2 "compute once" trap). The cache is deliberately NOT keyed
 * on its arguments — it assumes that whole-catalog contract; a future caller
 * passing a SUBSET would get the full-catalog result. (Under `astro dev` the
 * module is not re-evaluated on a content edit, so wayfinding can go stale until
 * restart — a dev-only wart; the deployed `astro build` is always fresh.)
 */
export function buildWayfinding(things: ThingTaxon[], compiled: CompiledThing[]): Wayfinding {
  if (_cache) return _cache;
  const order = spineOrdered(things);
  const spineIndex = new Map(order.map((t, i) => [t.id, i]));
  // chain only among THINGs that have a page (are in the authored spine): a stray
  // compiled artifact with no authored THING would otherwise sort by an undefined
  // spine index (NaN) and render a "chains with" link to a 404.
  const authored = new Set(things.map((t) => t.id));
  const placed = compiled.filter((a) => authored.has(a.thing));
  _cache = {
    neighbors: computeNeighbors(order),
    related: computeRelated(things),
    chains: computeChains(placed, spineIndex),
  };
  return _cache;
}
