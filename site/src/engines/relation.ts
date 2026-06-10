/**
 * The relation engine: executes a configuration's evaluation plan against the
 * generated pure functions, evaluates guards and validity envelopes, and
 * reports severity-tagged messages (invariant 5: violations surface as
 * banners, never as silent NaN or plausible wrong numbers).
 */
import { brent } from "./brent.ts";
import type { CompiledThing, Configuration, EvalResult, Fn, ValidityMessage, VarRecord } from "./types.ts";

const EPS_NONZERO = 1e-12;

export class RelationEngine {
  private artifact: CompiledThing;
  private fns: Record<string, Fn>;

  constructor(artifact: CompiledThing, fns: Record<string, Fn>) {
    this.artifact = artifact;
    this.fns = fns;
  }

  config(id: string): Configuration {
    const cfg = this.artifact.configurations.find((c) => c.id === id);
    if (!cfg) throw new Error(`unknown configuration '${id}' for ${this.artifact.thing}`);
    return cfg;
  }

  /**
   * Evaluate one configuration. `inputs` are SI values for cfg.inputs plus any
   * material-bound variables; `branch` selects among multi-branch solutions.
   */
  evaluate(cfgId: string, inputs: VarRecord, branch?: string): EvalResult {
    const cfg = this.config(cfgId);
    const env: VarRecord = { ...inputs };
    const messages: ValidityMessage[] = [];
    let invalid = false;

    for (const [k, v] of Object.entries(cfg.constraints)) {
      if (typeof v === "number") env[k] = v;
    }

    // guards first-class: a tripped 'invalid' guard poisons downstream values
    for (const g of cfg.guards) {
      const val = this.fns[g.guard_fn]!(env);
      const tripped =
        g.kind === "nonzero"
          ? Math.abs(val as number) < EPS_NONZERO
          : g.kind === "nonneg"
            ? (val as number) < 0
            : false; // predicate guards checked after evaluation (need outputs)
      if (tripped) {
        messages.push({ severity: g.severity, message: g.message, citation: g.citation });
        if (g.severity === "invalid") invalid = true;
      }
    }

    if (!invalid) {
      for (const step of cfg.plan) {
        if (step.type === "eval") {
          const fnId = step.branch_fns ? step.branch_fns[branch ?? cfg.branches?.labels[0] ?? ""] : step.fn;
          if (!fnId) throw new Error(`no function for plan step '${step.target}'`);
          env[step.target] = this.fns[fnId]!(env) as number;
        } else if (step.type === "solve1d") {
          const residual = this.fns[step.residual_fn]!;
          env[step.target] = brent(
            (x) => residual({ ...env, [step.target]: x }) as number,
            step.bracket[0],
            step.bracket[1],
          );
        }
        if (!Number.isFinite(env[step.target]!)) {
          invalid = true;
          messages.push({
            severity: "invalid",
            message: `${step.target} is undefined at these inputs.`,
          });
          break;
        }
      }
    }

    // relation-attached validity envelopes (predicates over the full env)
    if (!invalid) {
      for (const rel of this.artifact.relations) {
        for (const v of rel.validity) {
          const ok = this.fns[v.guard_fn]!(env);
          if (ok === false) {
            messages.push({ severity: v.severity, message: v.message, citation: v.citation });
            if (v.severity === "invalid") invalid = true;
          }
        }
      }
    }

    return { values: env, messages, invalid };
  }

  /** Residual magnitudes per relation — the credibility-spine self-check. */
  residuals(env: VarRecord): Record<string, number> {
    const out: Record<string, number> = {};
    for (const rel of this.artifact.relations) {
      out[rel.id] = this.fns[rel.residual_fn]!(env) as number;
    }
    return out;
  }
}
