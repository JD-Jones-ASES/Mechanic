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
  role: "free" | "material" | "derived" | "constant";
  /** source id of a role: constant's cited value (absent on other roles) */
  citation?: string | null;
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
  | {
      type: "eval";
      target: string;
      fn?: string;
      branch_fns?: Record<string, string>;
      latex: unknown;
      /**
       * Provenance of an eval step desugared from a certified linear-group
       * solve (ADR-0008, solveLinear): the coupled relations it was solved
       * from and the system-determinant guard. Inert at runtime — the engine
       * runs the step by `fn` like any eval; this rides the artifact for the
       * /verification/ audit surface. Absent on ordinary eval steps.
       */
      via?: { solve_linear: { relations: string[]; det_fn: string } };
    }
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
    }
  | {
      type: "table";
      /** columns this lookup fills — one target per value column of a row */
      targets: string[];
      table_id: string;
      /** fn of the already-evaluated env producing the lookup argument */
      arg_fn: string;
      mode: "interpolate-linear" | "exact-row";
      /** rows embedded verbatim: [arg, col1, ...], strictly increasing arg */
      rows: number[][];
      domain: [number, number];
      /**
       * Out-of-domain (interpolate) or non-row (exact-row) makes the lookup
       * non-finite; the engine turns that into this SCOPED invalid refusal —
       * `scope` (columns + their descendants) is added to invalidVars, the page
       * stands. No clamp/extrapolation exists in the lookup (invariant 5). The
       * table's citation rides along so the refusal banner is provenance-clean.
       */
      guard: { severity: "invalid"; message: string; citation?: string | null; scope: string[] };
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

export interface SourceRecord {
  id: string;
  citation: string;
  url?: string;
  verification?: string;
}

export interface CompiledThing {
  schema_version: 1;
  thing: string;
  title: string;
  variables: Record<string, VariableMeta>;
  relations: RelationMeta[];
  configurations: Configuration[];
  material_binding: Record<string, string> | null;
  /** cited sources (always emitted); role: constant variables reference these by id for display */
  sources: SourceRecord[];
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
