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
  | { type: "solve1d"; target: string; residual_fn: string; bracket: [number, number] };

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
  /** true when an 'invalid'-severity guard fired: values are not trustworthy */
  invalid: boolean;
}
