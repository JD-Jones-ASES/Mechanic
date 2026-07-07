/**
 * S24: per-readout provenance disclosure — trace a chained number "all the way
 * home". A collapsed-by-default native <details> per readout expands (on the
 * `toggle` event, never during the main render — brief perf rule) into:
 *   value → the THING that computed it and its cited relations
 *          → each bound input → the upstream instance/port it came from
 *          → recursively, to chain depth (capped at the 6-node limit).
 *
 * The data supply is EXACTLY S21's provenance records + the compiled artifacts'
 * RelationMeta (brief: "this session renders them"). Upstream relations and
 * their citations come FROM THE RECORD (never re-derived here — invariant 4,
 * brief trap); only the local readout node's own relations are read from its
 * artifact, and those are its own metadata, not the upstream path. Node
 * granularity is the S21 contract: a value carries the cited relations of the
 * whole upstream chain of THINGs — complete, not minimal.
 *
 * Nested <details> gives the recursive trace keyboard + AT support for free
 * (ADR-0006); no bespoke tree widget.
 */
import { useState } from "preact/hooks";
import type { Binding } from "../engines/chain";
import type { ProvenanceRecord } from "../engines/chain-eval";
import type { CompiledThing } from "../engines/types";
import { toDisplay, unitLabel } from "../engines/units";

/** Minimal per-instance info each host page supplies (title + artifact). */
export interface TrailNode {
  title: string;
  artifact: CompiledThing;
}

/** Everything the trail needs, supplied by each host page (chain-builder /
 * chain-demo) so the component is page-agnostic. `provenance` and `bindings`
 * are the current evaluation's; `nodeInfo` resolves an opaque instance id to
 * its title + compiled artifact (for citation-text resolution and value
 * formatting). */
export interface ChainProvenanceCtx {
  provenance: ProvenanceRecord[];
  bindings: Binding[];
  nodeInfo: (instanceId: string) => TrailNode | undefined;
}

/** The 6-node chain cap bounds recursion depth (brief: cap 6). Guarded anyway
 * so a future larger cap can never blow the stack. */
const MAX_DEPTH = 6;

/** Resolve a relation's citation (a source id) to its full text, within the
 * artifact that owns the relation. Falls back to the raw id if unmatched. */
function citationText(artifact: CompiledThing, sourceId: string): string {
  return artifact.sources.find((s) => s.id === sourceId)?.citation ?? sourceId;
}

interface CiteGroup {
  sourceId: string;
  text: string;
  relationIds: string[];
}

/** Group a node's relations by citation source, preserving first-seen order, so
 * a long reference string is shown once with the relations it backs — rather
 * than repeated per relation. */
function groupByCitation(
  rels: { id: string; citation: string }[],
  artifact: CompiledThing,
): CiteGroup[] {
  const order: string[] = [];
  const byId = new Map<string, CiteGroup>();
  for (const r of rels) {
    let g = byId.get(r.citation);
    if (!g) {
      g = { sourceId: r.citation, text: citationText(artifact, r.citation), relationIds: [] };
      byId.set(r.citation, g);
      order.push(r.citation);
    }
    g.relationIds.push(r.id);
  }
  return order.map((id) => byId.get(id)!);
}

/** Format the SI value that crossed a wire in the source port's display unit
 * (the same conversion Readouts uses), or name the withheld state honestly. */
function wireValue(rec: ProvenanceRecord | undefined, fromArtifact: CompiledThing | undefined): string {
  if (!rec) return "—";
  if (rec.withheld || rec.value === null) return "withheld (refused upstream)";
  const v = fromArtifact?.variables[rec.from.port];
  const unit = v?.display_units?.[0] ?? v?.si_unit ?? "";
  const num = Number(toDisplay(rec.value, unit).toPrecision(5)).toString();
  const label = unitLabel(unit);
  return label ? `${num} ${label}` : num;
}

/** The provenance record for exactly this wire (from/to instance+port). */
function recordFor(prov: ProvenanceRecord[], b: Binding): ProvenanceRecord | undefined {
  return prov.find(
    (r) =>
      r.from.instance === b.from.node &&
      r.from.port === b.from.port &&
      r.to.instance === b.to.node &&
      r.to.port === b.to.port,
  );
}

/** One node's level in the trace: its cited relations, then a nested disclosure
 * per bound input recursing upstream. */
function TraceLevel({
  instance,
  incoming,
  depth,
  ctx,
}: {
  instance: string;
  /** the wire we descended INTO this node (null at the root readout). Its
   * record supplies this node's own relations for upstream levels. */
  incoming: ProvenanceRecord | null;
  depth: number;
  ctx: ChainProvenanceCtx;
}) {
  const info = ctx.nodeInfo(instance);
  if (!info) {
    return <p class="prov-unavailable">Provenance unavailable — this node's module is still loading.</p>;
  }

  // This node's own relations:
  //  - root (incoming === null): read from the artifact (its own local metadata;
  //    the root readout is NOT part of the "upstream path" the trap governs).
  //  - upstream: read from the descended wire's record, filtered to this
  //    instance — upstream citations come from the records (invariant 4).
  const rels: { id: string; citation: string }[] = incoming
    ? incoming.relations
        .filter((r) => r.instance === instance)
        .map((r) => ({ id: r.id, citation: r.citation }))
    : info.artifact.relations.map((r) => ({ id: r.id, citation: r.citation }));
  const groups = groupByCitation(rels, info.artifact);

  const inWires = ctx.bindings.filter((b) => b.to.node === instance);

  return (
    <div class="prov-node">
      <p class="prov-thing">
        Computed in <strong>{info.title}</strong> <span class="prov-inst">{instance}</span>
      </p>
      <ul class="prov-rels">
        {groups.map((g) => (
          <li key={g.sourceId}>
            <code class="prov-rel-ids">{g.relationIds.join(", ")}</code>{" "}
            <span class="prov-cite">{g.text}</span>
          </li>
        ))}
      </ul>
      {inWires.length > 0 ? (
        <div class="prov-inputs">
          <p class="prov-inputs-label">Bound inputs, traced upstream:</p>
          {inWires.map((b) => (
            <InputTrace
              key={`${b.from.node}.${b.from.port}->${b.to.node}.${b.to.port}`}
              wire={b}
              depth={depth}
              ctx={ctx}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** A single bound input: a nested disclosure whose summary names the upstream
 * instance/port + the value that crossed, and whose body recurses (lazily, on
 * open) into the source node. */
function InputTrace({ wire, depth, ctx }: { wire: Binding; depth: number; ctx: ChainProvenanceCtx }) {
  const [open, setOpen] = useState(false);
  const rec = recordFor(ctx.provenance, wire);
  const fromInfo = ctx.nodeInfo(wire.from.node);
  const value = wireValue(rec, fromInfo?.artifact);
  const fromTitle = fromInfo?.title ?? wire.from.node;
  const summary = (
    <>
      <code>{wire.to.port}</code> <span aria-hidden="true">←</span>{" "}
      <strong>{fromTitle}</strong> <span class="prov-inst">{wire.from.node}</span>{" "}
      <code>{wire.from.port}</code> = <span class={rec?.withheld ? "prov-withheld" : "prov-value"}>{value}</span>
    </>
  );
  // Depth guard: the 6-node cap means a linear trace can't exceed 6 levels; a
  // diamond (fan-in reconverging on one source) could in principle repeat a
  // node, so stop expanding at the cap rather than recurse further.
  if (depth + 1 >= MAX_DEPTH) {
    return (
      <p class="prov-input prov-input-capped">
        {summary} <span class="prov-cite">(trace depth cap)</span>
      </p>
    );
  }
  return (
    <details class="prov-input" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>{summary}</summary>
      {open ? (
        rec ? (
          // recurse with the wire's record — upstream relations/citations are
          // record-sourced (invariant 4), never re-read from the artifact
          <TraceLevel instance={wire.from.node} incoming={rec} depth={depth + 1} ctx={ctx} />
        ) : (
          // no record for a real wire would be an S21 contract gap — surface it,
          // never silently fall back to artifact-sourced relations
          <p class="prov-unavailable">Upstream provenance is unavailable for this wire.</p>
        )
      ) : null}
    </details>
  );
}

/** The top-level per-readout disclosure. Collapsed by default; its body is
 * built only once opened (render-on-open — deep chains × many readouts must not
 * bloat every evaluation). */
export function ProvenanceTrail({
  rootInstance,
  sym,
  ctx,
}: {
  rootInstance: string;
  sym: string;
  ctx: ChainProvenanceCtx;
}) {
  const [open, setOpen] = useState(false);
  const info = ctx.nodeInfo(rootInstance);
  const name = info?.artifact.variables[sym]?.name ?? sym;
  return (
    <details
      class="prov-trail"
      data-testid={`prov-${rootInstance}-${sym}`}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary class="prov-summary">
        Where <span class="prov-var">{name}</span> comes from
      </summary>
      {open ? (
        <div class="prov-body">
          <p class="prov-note">
            This trace is node-level: it covers the whole component's cited relations and everything
            wired upstream, not only the single output above.
          </p>
          <TraceLevel instance={rootInstance} incoming={null} depth={0} ctx={ctx} />
        </div>
      ) : null}
    </details>
  );
}
