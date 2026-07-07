/**
 * S24: the chain-level "assumptions in play" panel. Aggregates, across every
 * node in the current evaluation:
 *   - the union of each THING's relation assumptions (RelationMeta.assumptions),
 *     grouped by node so attribution survives (which component assumes what);
 *   - every ACTIVE validity message (record.result.messages), tagged with its
 *     severity and owning instance.
 *
 * Refusals — a node's own unscoped invalid, a scoped invalid, and the engine's
 * injected "refused by upstream" message — are all invalid-severity messages,
 * so they appear here in the open (never behind a disclosure — invariant 5).
 * Warns are listed but stay LOCAL to their node: listing is not propagation
 * (S21 rule c). The panel is a plain visible section, not a disclosure, exactly
 * so a refusal is never hidden.
 *
 * Data supply is the compiled artifacts' RelationMeta + the engine's per-node
 * eval records — no re-derivation (invariant 4).
 */
import type { NodeEvalRecord } from "../engines/chain-eval";
import type { TrailNode } from "./ProvenanceTrail";

function dedupe(xs: string[]): string[] {
  const seen = new Set<string>();
  return xs.filter((x) => (seen.has(x) ? false : (seen.add(x), true)));
}

interface Props {
  /** instance ids in evaluation order (all nodes in the current evaluation) */
  order: string[];
  nodeInfo: (instanceId: string) => TrailNode | undefined;
  records: Record<string, NodeEvalRecord>;
}

export function ChainAssumptions({ order, nodeInfo, records }: Props) {
  const nodes = order
    .map((id) => ({ id, info: nodeInfo(id), record: records[id] }))
    .filter((n): n is { id: string; info: TrailNode; record: NodeEvalRecord } => !!n.info);
  if (nodes.length === 0) return null;

  // every ACTIVE validity message across nodes, tagged severity + instance
  const flags = nodes.flatMap(({ id, info, record }) =>
    (record?.result.messages ?? []).map((m) => ({ id, title: info.title, m })),
  );

  return (
    <section
      class="chain-assumptions"
      data-testid="assumptions-panel"
      aria-labelledby="assumptions-heading"
    >
      <h2 id="assumptions-heading">Assumptions in play</h2>
      <p class="ca-intro">
        Every number in this chain is only as trustworthy as the modeling assumptions of each THING it
        passes through — and cross-THING consistency (e.g. one stage's ideal, lossless output feeding
        the next) is a citation-level assumption, not a machine proof. This panel collects both, plus
        every validity flag currently active.
      </p>

      {flags.length > 0 ? (
        <div class="ca-flags" data-testid="assumptions-flags">
          <h3>Active validity flags</h3>
          <ul>
            {flags.map(({ id, title, m }, i) => (
              <li
                key={`${id}-${i}`}
                class={`validity-msg validity-${m.severity}`}
                data-severity={m.severity}
                data-instance={id}
              >
                <strong>{m.severity === "invalid" ? "Invalid" : "Caution"}</strong> — {title}{" "}
                <span class="prov-inst">{id}</span>: {m.message}
                {m.citation ? <span class="validity-cite"> [{m.citation}]</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p class="ca-noflags" data-testid="assumptions-noflags">
          No validity flags are active for the current inputs.
        </p>
      )}

      <div class="ca-assumptions">
        <h3>Modeling assumptions, by component</h3>
        <ul class="ca-node-list">
          {nodes.map(({ id, info }) => {
            const assumptions = dedupe(info.artifact.relations.flatMap((r) => r.assumptions));
            return (
              <li key={id} class="ca-node" data-instance={id}>
                <p class="ca-node-title">
                  <strong>{info.title}</strong> <span class="prov-inst">{id}</span>
                </p>
                {assumptions.length > 0 ? (
                  <ul class="ca-assumption-items">
                    {assumptions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                ) : (
                  <p class="ca-none">No stated relation assumptions.</p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
