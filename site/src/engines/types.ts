/**
 * Runtime types mirroring the compiled-artifact schema (docs/architecture.md).
 * The Zod schema in content.config.ts validates these shapes at build time;
 * these types are what the engines consume in the browser.
 */
export type VarRecord = Record<string, number>;
export type Fn = (v: VarRecord) => number | boolean;

export interface VariableMeta {
  name: string;
  latex: string;
  dim: number[]; // SI 7-vector [L,M,T,I,Θ,N,J]
  quantity_kind: string;
  si_unit: string;
  display_units: string[];
  default: number;
  bounds: [number, number] | null;
  integer: boolean;
  role: "free" | "material" | "derived";
}

export interface Guard {
  guard_fn: string;
  kind: "nonzero" | "nonneg" | "predicate";
  severity: "warn" | "invalid";
  message: string;
  citation?: string | null;
  auto?: boolean;
  /** symbols the predicate reads — evaluable iff all are finite in the env */
  needs?: string[];
  /**
   * Scoped refusal: when present on an invalid-severity envelope, only these
   * derived variables are poisoned; the rest of the evaluation stands. This is
   * how two models with complementary envelopes share one page (model
   * hand-off — Euler/Johnson is the reference case). Absent = the refusal is
   * global, as before.
   */
  scope?: string[];
}

export interface RelationMeta {
  id: string;
  group: string;
  latex: string;
  residual_fn: string;
  assumptions: string[];
  validity: Guard[];
  citation: string;
}

export type PlanStep =
  | { type: "eval"; target: string; fn?: string; branch_fns?: Record<string, string>; latex: unknown }
  | {
      type: "solve1d";
      target: string;
      /** the relation residual driven to zero — cited like any relation */
      residual_fn: string;
      /**
       * Bracket ENDPOINT FUNCTIONS of the already-evaluated env (e.g. the
       * eccentric column brackets P_y inside (0, P_E), and P_E moves with
       * material and geometry — a static bracket cannot express that). The
       * build proves a sign change between them at every verification sample.
       */
      bracket_fns: [string, string];
      latex: string;
    };

export interface Configuration {
  id: string;
  label: string;
  constraints: Record<string, number | string>;
  inputs: string[];
  plan: PlanStep[];
  branches: { selector: string; labels: string[]; continuity: string } | null;
  guards: Guard[];
  samples: { inputs: VarRecord; outputs: VarRecord; branch?: string }[];
}

export interface CompiledThing {
  schema_version: 1;
  thing: string;
  title: string;
  variables: Record<string, VariableMeta>;
  relations: RelationMeta[];
  configurations: Configuration[];
  material_binding: Record<string, string> | null;
}

export interface ValidityMessage {
  severity: "warn" | "invalid";
  message: string;
  citation?: string | null;
}

export interface EvalResult {
  values: VarRecord;
  messages: ValidityMessage[];
  /** true when an unscoped 'invalid' guard fired: NO value is trustworthy */
  invalid: boolean;
  /**
   * Variables poisoned by scope-carrying invalid envelopes. Readouts and sims
   * must treat these exactly like a global refusal, but only for the named
   * symbols — every other value remains verified and honest.
   */
  invalidVars: string[];
}
