/**
 * The relation engine: executes a configuration's evaluation plan against the
 * generated pure functions, evaluates guards and validity envelopes, and
 * reports severity-tagged messages (invariant 5: violations surface as
 * banners, never as silent NaN or plausible wrong numbers).
 */
import { brent } from "./brent.ts";
import { tableLookup } from "./table.ts";
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
    const invalidVars = new Set<string>();

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
        if (step.type === "table") {
          // tabulated lookup (ADR-0009): fill each column from the row at arg.
          // A non-finite result (out of domain / non-row) is a SCOPED refusal —
          // poison the columns + descendants, carry the table's citation, keep
          // the page standing. No clamp/extrapolation happens in tableLookup.
          const arg = this.fns[step.arg_fn]!(env) as number;
          let refused = false;
          for (let c = 0; c < step.targets.length; c++) {
            const y = tableLookup(step.rows, arg, step.mode, c + 1);
            env[step.targets[c]!] = y;
            if (!Number.isFinite(y)) refused = true;
          }
          if (refused) {
            messages.push({
              severity: step.guard.severity,
              message: step.guard.message,
              citation: step.guard.citation,
            });
            for (const s of step.guard.scope) invalidVars.add(s);
          }
          continue;
        }
        if (step.type === "eval") {
          const fnId = step.branch_fns ? step.branch_fns[branch ?? cfg.branches?.labels[0] ?? ""] : step.fn;
          if (!fnId) throw new Error(`no function for plan step '${step.target}'`);
          env[step.target] = this.fns[fnId]!(env) as number;
        } else if (step.type === "solve1d") {
          const residual = this.fns[step.residual_fn]!;
          const lo = this.fns[step.bracket_fns[0]]!(env) as number;
          const hi = this.fns[step.bracket_fns[1]]!(env) as number;
          // brent returns NaN on an unbracketed/undefined interval, which the
          // finiteness check below converts into an honest refusal
          env[step.target] = brent(
            (x) => residual({ ...env, [step.target]: x }) as number,
            lo,
            hi,
          );
        }
        if (!Number.isFinite(env[step.target]!)) {
          // an expected NaN cascading from an upstream scoped table refusal is
          // already accounted for (its readout is blanked) — don't escalate it
          // into a whole-page refusal
          if (invalidVars.has(step.target)) continue;
          invalid = true;
          messages.push({
            severity: "invalid",
            message: `${step.target} is undefined at these inputs.`,
          });
          break;
        }
      }
    }

    // Relation-attached validity envelopes (predicates over the full env).
    // These run even when evaluation was refused: a banner like "the links
    // cannot assemble" is exactly what the user needs alongside the generic
    // undefined-value guard, and it is computable from the inputs alone.
    // A predicate is only evaluated when every symbol it reads is finite —
    // NaN comparisons would otherwise fire spurious banners.
    for (const rel of this.artifact.relations) {
      for (const v of rel.validity) {
        if (v.needs && !v.needs.every((s) => Number.isFinite(env[s]))) continue;
        const ok = this.fns[v.guard_fn]!(env);
        if (ok === false) {
          messages.push({ severity: v.severity, message: v.message, citation: v.citation });
          if (v.severity === "invalid") {
            // scoped refusal: poison only the named variables (model hand-off);
            // an unscoped invalid still refuses the whole evaluation
            if (v.scope) for (const s of v.scope) invalidVars.add(s);
            else invalid = true;
          }
        }
      }
    }

    return { values: env, messages, invalid, invalidVars: [...invalidVars].sort() };
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
