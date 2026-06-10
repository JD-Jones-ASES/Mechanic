/**
 * Widget chaining (invariant 2): undirected port-bindings; the PLANNER
 * enforces forward-only (rejects cycles), not the schema — adding a cyclic
 * solver later is a new planner, zero THING rewrites (ADR-0002).
 */
import { connectionLegal, type Port } from "./units";

export interface ChainNode {
  id: string;
  /** variable name -> port metadata, for this node's outputs and inputs */
  outputs: Record<string, Port>;
  inputs: Record<string, Port>;
}

export interface Binding {
  from: { node: string; port: string };
  to: { node: string; port: string };
}

export class ChainGraph {
  private nodes = new Map<string, ChainNode>();
  private bindings: Binding[] = [];

  addNode(node: ChainNode): void {
    this.nodes.set(node.id, node);
  }

  /** Type-check then add a binding. Returns a reason string on rejection. */
  connect(b: Binding): { ok: boolean; reason?: string } {
    const from = this.nodes.get(b.from.node);
    const to = this.nodes.get(b.to.node);
    if (!from || !to) return { ok: false, reason: "unknown node" };
    const out = from.outputs[b.from.port];
    const into = to.inputs[b.to.port];
    if (!out) return { ok: false, reason: `'${b.from.port}' is not an output of ${b.from.node}` };
    if (!into) return { ok: false, reason: `'${b.to.port}' is not an input of ${b.to.node}` };

    const legal = connectionLegal(out, into);
    if (!legal.ok) return legal;

    const trial = [...this.bindings, b];
    if (this.hasCycle(trial)) {
      return { ok: false, reason: "connection would create a feedback loop (out of scope in v1)" };
    }
    this.bindings.push(b);
    return { ok: true };
  }

  /** Dependency-ordered node ids (the forward-only evaluation order). */
  evaluationOrder(): string[] {
    const order: string[] = [];
    const incoming = new Map<string, number>();
    for (const id of this.nodes.keys()) incoming.set(id, 0);
    for (const b of this.bindings) incoming.set(b.to.node, (incoming.get(b.to.node) ?? 0) + 1);
    const queue = [...incoming.entries()].filter(([, n]) => n === 0).map(([id]) => id);
    while (queue.length) {
      const id = queue.shift()!;
      order.push(id);
      for (const b of this.bindings.filter((x) => x.from.node === id)) {
        const n = (incoming.get(b.to.node) ?? 1) - 1;
        incoming.set(b.to.node, n);
        if (n === 0) queue.push(b.to.node);
      }
    }
    return order;
  }

  private hasCycle(bindings: Binding[]): boolean {
    const adj = new Map<string, string[]>();
    for (const b of bindings) {
      adj.set(b.from.node, [...(adj.get(b.from.node) ?? []), b.to.node]);
    }
    const seen = new Set<string>();
    const stack = new Set<string>();
    const visit = (id: string): boolean => {
      if (stack.has(id)) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      stack.add(id);
      for (const next of adj.get(id) ?? []) if (visit(next)) return true;
      stack.delete(id);
      return false;
    };
    return [...adj.keys()].some(visit);
  }
}
