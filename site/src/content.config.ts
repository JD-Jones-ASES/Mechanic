/**
 * Content collections — the Zod schema here IS the enforced THING template
 * (CLAUDE.md "factory pattern"). `things` validates authored YAML; `compiled`
 * validates the pipeline's generated artifacts (schema mirror of
 * docs/architecture.md); `materials` validates the ingested seed.
 */
import { defineCollection, z } from "astro:content";
import { file, glob } from "astro/loaders";

const identifier = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/);
const slug = z.string().regex(/^[a-z0-9-]+$/);

/* ---------- authored THINGs ---------- */

const variableSchema = z.object({
  symbol: identifier,
  name: z.string(),
  latex: z.string().optional(),
  unit: z.union([z.string(), z.number()]).transform(String),
  quantity_kind: z.string(),
  default: z.number(),
  bounds: z.tuple([z.number(), z.number()]).optional(),
  positive: z.boolean().default(false),
  integer: z.boolean().default(false),
  role: z.enum(["free", "material", "derived", "constant"]).default("free"),
  display_units: z.array(z.string()).default([]),
  // role: constant — a cited physical constant (e.g. g). Its `default` IS the
  // value; it is never a knob, never solved, and excluded from DOF/knob
  // arithmetic exactly like a material. `citation` is MANDATORY for constants
  // and must resolve in sources[] (compile.py enforces this — invariant 5: a
  // number with no provenance is forbidden); it is meaningless on other roles.
  citation: z.string().optional(),
});

const validitySchema = z.object({
  condition: z.string(),
  severity: z.enum(["warn", "invalid"]),
  message: z.string(),
  citation: z.string().optional(),
  // scoped refusal: an invalid envelope may poison only the named derived
  // variables (model hand-off) instead of refusing the whole evaluation
  scope: z.array(identifier).optional(),
});

const relationSchema = z.object({
  id: z.string(),
  group: z.string().default("general"),
  latex: z.string(),
  residual: z.string(),
  assumptions: z.array(z.string()).default([]),
  citation: z.string(),
  validity: z.array(validitySchema).default([]),
});

// a solve1d target: solve a DECLARED relation for this symbol inside an
// authored [lo, hi] bracket of expressions (ADR-0002; the pipeline proves the
// sign change at every verification sample)
const solve1dSolutionSchema = z.object({
  solve1d: z.object({
    relation: z.string(),
    bracket: z.tuple([z.string(), z.string()]),
  }),
});

// tabulated relation data (ADR-0009): a cited lookup table. `arg` and `columns`
// are declared variables serving as the dimensional/kind templates; each row is
// [arg, col1, ...] with strictly increasing arg. `interpolate-linear` and
// `exact-row` ship; `threshold` is schema-reserved (compile rejects it until a
// consumer arrives). rows_from is reserved for an external data file.
const tableSchema = z.object({
  id: z.string(),
  name: z.string().optional(), // display name rendered in the plan-step LaTeX (default: id)
  citation: z.string(),
  provenance: z.string(),
  arg: identifier,
  columns: z.array(identifier).min(1),
  mode: z.enum(["interpolate-linear", "exact-row", "threshold"]),
  interpolation_citation: z.string().optional(),
  out_of_domain: z.literal("invalid").default("invalid"),
  rows: z.array(z.array(z.number()).min(2)).min(2),
});

// consuming a table in configurations.solutions: `Y: { table: <id>, at: <expr> }`.
// `at` is an expression over already-evaluated symbols (forward DAG).
const tableSolutionSchema = z.object({
  table: z.string(),
  at: z.string(),
});

// a certified linear-group solve (ADR-0008, solveLinear): a SET of coupled
// derived targets solved as a square linear system of DECLARED relations, at
// build time, exactly. The statically indeterminate structures the forward-DAG
// planner cannot express (a propped cantilever's redundant reaction). Groups
// evaluate after constraints and before `solutions`; the pipeline proves the
// system affine in its targets, solves it, and desugars into ordinary verified
// closed forms (compile.py certify_linear_group). `solveND` stays reserved.
const solveLinearGroupSchema = z.object({
  targets: z.array(identifier).min(1),
  relations: z.array(z.string()).min(1),
});

const configurationSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  constraints: z.record(identifier, z.union([z.number(), z.string()])).default({}),
  // certified linear-group solves, evaluated (in order) after constraints and
  // before `solutions`; each desugars into ordinary eval steps (see above)
  solve_linear: z.array(solveLinearGroupSchema).default([]),
  inputs: z.array(identifier),
  solutions: z.record(
    identifier,
    // tableSolutionSchema before the generic record: a table lookup {table, at}
    // is all-string-valued and would otherwise be swallowed by the multi-branch
    // record. solve1d is disambiguated by its non-string value.
    z.union([z.string(), solve1dSolutionSchema, tableSolutionSchema, z.record(z.string(), z.string())]),
  ),
  expected_branches: z.number().int().default(1),
  branches: z
    .object({
      selector: z.string(),
      labels: z.array(z.string()),
      continuity: z.string().default("follow-previous"),
    })
    .optional(),
});

const derivationStepSchema = z.object({
  expr: z.string(),
  prose: z.string(),
  rule: z.string().optional(),
  check: z.enum(["identity", "definition"]).default("identity"),
});

const things = defineCollection({
  loader: glob({
    pattern: "*/thing.yaml",
    base: "./src/content/things",
    generateId: ({ entry }) => entry.split("/")[0]!,
  }),
  schema: z.object({
    id: slug,
    title: z.string(),
    summary: z.string(),
    facets: z.array(z.string()).min(1),
    variables: z.array(variableSchema).min(1),
    materials: z.object({ binds: z.record(identifier, z.string()) }).optional(),
    tables: z.array(tableSchema).default([]),
    relations: z.array(relationSchema).min(1),
    configurations: z.array(configurationSchema).min(1),
    derivation: z
      .object({
        verifies_configuration: z.string().optional(),
        locals: z
          .array(
            z.object({
              symbol: identifier,
              unit: z.union([z.string(), z.number()]).transform(String),
              positive: z.boolean().default(false),
              bounds: z.tuple([z.number(), z.number()]).optional(),
              define: z.string().optional(),
            }),
          )
          .default([]),
        steps: z.array(derivationStepSchema),
      })
      .optional(),
    sim: z.object({ engine: z.string(), config: z.record(z.string(), z.unknown()).default({}) }),
    sources: z.array(
      z.object({
        id: z.string(),
        citation: z.string(),
        url: z.string().optional(),
        // how the citation was pinned (TOC, indexed full text, …) — rendered
        // on /verification/; absent means "not section-pinned" (ADR-0007)
        verification: z.string().optional(),
      }),
    ),
  }),
});

/* ---------- prose (overview / failure MDX) ---------- */

const prose = defineCollection({
  loader: glob({ pattern: "*/{overview,failure}.mdx", base: "./src/content/things" }),
  schema: z.object({}).passthrough(),
});

/* ---------- compiled artifacts (generated by the Python pipeline) ---------- */

const planStep = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("eval"),
    target: identifier,
    fn: z.string().optional(),
    branch_fns: z.record(z.string(), z.string()).optional(),
    latex: z.union([z.string(), z.record(z.string(), z.string())]),
    // provenance of an eval step desugared from a certified linear-group solve
    // (ADR-0008, solveLinear): the coupled relations it was solved from and the
    // system-determinant guard fn. Additive/optional — a plain eval step omits it.
    via: z
      .object({
        solve_linear: z.object({ relations: z.array(z.string()), det_fn: z.string() }),
      })
      .optional(),
  }),
  z.object({
    type: z.literal("solve1d"),
    target: identifier,
    residual_fn: z.string(),
    // bracket endpoints are FUNCTIONS of the evaluated env (fns.ts keys) —
    // sign change between them is proven at every verification sample
    bracket_fns: z.tuple([z.string(), z.string()]),
    latex: z.string(),
  }),
  // tabulated data (ADR-0009): look up `arg_fn(env)` in `rows` ([arg, col1, ...]).
  // Out-of-domain (interpolate) or non-row (exact-row) yields a non-finite value;
  // the runtime routes that through `guard` as a SCOPED invalid refusal (the
  // named columns + their descendants blank; the page stands) — no clamp or
  // extrapolation path exists in the emitted lookup. The guard carries no
  // guard_fn: the lookup's own definedness is the (build-proven) refusal trigger.
  z.object({
    type: z.literal("table"),
    targets: z.array(identifier).min(1),
    table_id: z.string(),
    arg_fn: z.string(),
    mode: z.enum(["interpolate-linear", "exact-row"]),
    rows: z.array(z.array(z.number()).min(2)).min(2),
    domain: z.tuple([z.number(), z.number()]),
    guard: z.object({
      severity: z.literal("invalid"),
      message: z.string(),
      citation: z.string().nullable().optional(),
      scope: z.array(identifier).min(1),
    }),
    latex: z.string(),
  }),
]);

const guardSchema = z.object({
  guard_fn: z.string(),
  kind: z.enum(["nonzero", "nonneg", "predicate"]),
  severity: z.enum(["warn", "invalid"]),
  message: z.string(),
  citation: z.string().nullable().optional(),
  auto: z.boolean().optional(),
  needs: z.array(identifier).optional(),
  scope: z.array(identifier).optional(),
});

const compiled = defineCollection({
  loader: glob({
    pattern: "*.compiled.json",
    base: "./src/generated/things",
    generateId: ({ entry }) => entry.replace(".compiled.json", ""),
  }),
  schema: z.object({
    schema_version: z.literal(1),
    thing: slug,
    title: z.string(),
    facets: z.array(z.string()),
    variables: z.record(
      identifier,
      z.object({
        name: z.string(),
        latex: z.string(),
        dim: z.array(z.number()).length(7),
        quantity_kind: z.string(),
        si_unit: z.string(),
        display_units: z.array(z.string()),
        default: z.number(),
        bounds: z.tuple([z.number(), z.number()]).nullable(),
        integer: z.boolean(),
        role: z.enum(["free", "material", "derived", "constant"]),
        // source id of a role: constant's cited value (absent on other roles)
        citation: z.string().nullable().optional(),
      }),
    ),
    relations: z.array(
      z.object({
        id: z.string(),
        group: z.string(),
        latex: z.string(),
        residual_fn: z.string(),
        srepr: z.string(),
        assumptions: z.array(z.string()),
        validity: z.array(guardSchema),
        citation: z.string(),
      }),
    ),
    configurations: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        constraints: z.record(identifier, z.union([z.number(), z.string()])),
        inputs: z.array(identifier),
        plan: z.array(planStep),
        branches: z
          .object({ selector: z.string(), labels: z.array(z.string()), continuity: z.string() })
          .nullable(),
        guards: z.array(guardSchema),
        samples: z.array(
          z.object({
            inputs: z.record(identifier, z.number()),
            outputs: z.record(identifier, z.number()),
            branch: z.string().optional(),
          }),
        ),
      }),
    ),
    derivation: z.array(
      z.object({
        latex: z.string(),
        prose: z.string(),
        rule: z.string(),
        check: z.enum(["identity", "definition"]),
      }),
    ),
    material_binding: z.record(identifier, z.string()).nullable(),
    // tabulated-data provenance (ADR-0009) for the /verification/ audit surface
    tables: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          citation: z.string(),
          provenance: z.string(),
          interpolation_citation: z.string().nullable().optional(),
          mode: z.string(),
          arg: identifier,
          columns: z.array(identifier),
          domain: z.tuple([z.number(), z.number()]),
          rows_count: z.number(),
        }),
      )
      .default([]),
    sim: z.object({ engine: z.string(), config: z.record(z.string(), z.unknown()).default({}) }).nullable(),
    sources: z.array(
      z.object({
        id: z.string(),
        citation: z.string(),
        url: z.string().optional(),
        verification: z.string().optional(),
      }),
    ),
  }),
});

/* ---------- materials (ingested seed) ---------- */

const materials = defineCollection({
  loader: file("./src/generated/materials.json", {
    parser: (text) => JSON.parse(text).materials,
  }),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    class: z.string(),
    condition: z.string(),
    cost_class: z.enum(["low", "medium", "high", "very_high"]),
    cost_rationale: z.string(),
    properties: z.array(
      z.object({
        key: z.string(),
        basis: z.enum(["spec_minimum", "design_minimum", "typical"]),
        value_published: z.number(),
        unit_published: z.string(),
        value_si: z.number(),
        unit_si: z.string(),
        source_id: z.string(),
        citation: z.string(),
        verified_at: z.string(),
        cross_check: z.string(),
        notes: z.string(),
      }),
    ),
    errata: z.array(z.object({ date: z.string(), note: z.string() })).default([]),
  }),
});

export const collections = { things, prose, compiled, materials };
