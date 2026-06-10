# Architecture

```
authored (committed)                 build time                        runtime (browser)
─────────────────────                ──────────────────────────        ─────────────────────
site/src/content/things/<slug>/  →   pipeline (Python, uv):        →   Astro static pages
  thing.yaml  overview.mdx             parse → dim-check → DOF →        + Preact islands
  failure.mdx                          verify derivations &              evaluating generated
data/materials/*.yaml                  solutions → emit                  pure TS functions
                                     site/src/generated/** (gitignored)
                                     data/build/materials.{db,json}
                                     then: astro build → pagefind
```

No server anywhere. The pipeline runs via `uv run` (locally as the site's `prebuild` script, and as a CI
step before `astro build`).

## Pipeline stages (`pipeline/src/mech_pipeline/`)

1. **Parse** (`compile.py`): load each `thing.yaml`; create SymPy symbols carrying authored assumptions
   (`real=True`, plus `positive=True` where declared) — assumptions are load-bearing for verification
   (`sqrt(x²)=x` fails without positivity).
2. **Dimensional check** (`dims.py`): each variable's `unit` is parsed with `sympy.physics.units`; every
   relation residual must be dimensionally homogeneous (each additive term same dimension) or the build
   fails. Exports the SI 7-vector `[L,M,T,I,Θ,N,J]` per variable into the artifact.
3. **DOF check**: for each configuration, `len(inputs)` must equal
   `n_variables − n_independent_relations − n_constraints` (constraints like `ω_r = 0` count as relations).
   Independence is checked on the Jacobian at sampled points.
4. **Verify** (`verify.py`):
   - *Solutions*: substitute each authored solution into every relation residual (and constraints) and
     require zero — tiered: `simplify(d)==0` → `d.equals(0)` → `simplify(d.rewrite(exp))==0` → ≥30 mpmath
     samples at 50 dps over declared bounds (tolerance 1e-40). Any `False`/undecided ⇒ build failure naming
     thing/configuration/target. Blind `sympy.solve()` is fallback ONLY, under a hard wall-clock timeout
     (verified 2026-06: raw four-bar loop closure hangs `solve()` >5 min).
   - *Derivation steps*: each step is an equation in the THING's variables; after substituting the verified
     solutions of the step's declared configuration it must reduce to an identity (same tiered checker).
     This proves each displayed line is *true*, not that the chain is pedagogically minimal — prose carries
     the pedagogy.
5. **Emit** (`emit_js.py`): per THING —
   - `<slug>.fns.ts`: pure functions from `sympy.printing.jscode` after `cse()`. The emitter rejects
     fractional powers of possibly-negative bases (rewrites via `cbrt`/`sign` or fails). No runtime math deps.
   - `<slug>.compiled.json`: the metadata artifact (schema below).
   - Auto-derived **domain guards**: for every emitted expression, denominators and even-root/log arguments
     become guard functions (e.g. Willis ratio undefined at `ω_r = ω_c`) so the UI shows "undefined here"
     instead of NaN.
6. **Materials** (`ingest.py`): `data/materials/*.yaml` → `data/build/materials.db` (stdlib sqlite3) →
   `data/build/materials.json` (consumed by a content-collection loader via `node:sqlite` or the JSON).
   Values are stored as published (original unit) AND converted to SI **programmatically** with golden
   conversion tests. Basis (`spec_minimum`/`design_minimum`/`typical`) is first-class.
7. **LaTeX gate**: a Node script (`site/scripts/check-katex.mjs`) runs `katex.renderToString` over every
   LaTeX string in every artifact; unrenderable math fails the build. SymPy printing uses
   `inv_trig_style='full'`.

## Compiled-artifact schema (`<slug>.compiled.json`) — single source of truth

```jsonc
{
  "schema_version": 1,
  "thing": "planetary-gearset",
  "variables": {
    "omega_s": {
      "name": "Sun angular velocity", "latex": "\\omega_s",
      "dim": [0,0,-1,0,0,0,0],            // [L,M,T,I,Θ,N,J]
      "quantity_kind": "angular_velocity", // chaining legality = dim AND kind match
      "si_unit": "rad/s", "display_units": ["rad/s","rpm"],
      "default": 10, "bounds": [-100, 100], "integer": false,
      "role": "free"                       // free | material | derived (default role; configs refine)
    }
  },
  "relations": [{
    "id": "willis", "group": "kinematics", "latex": "…",
    "residual_fn": "rel_willis",           // key into fns.ts — callable residual (Brent/feedback on-ramp)
    "srepr": "…",                          // provenance: exact SymPy form that was verified
    "assumptions": ["rigid bodies"],
    "validity": [{ "guard_fn": "g1", "severity": "warn|invalid", "message": "…", "citation": "…" }],
    "citation": "source-id"
  }],
  "configurations": [{
    "id": "ring-fixed", "label": "Ring fixed — sun in, carrier out",
    "constraints": { "omega_r": 0 },
    "inputs": ["N_s","N_p","omega_s"],
    "plan": [                              // discriminated union — executed in order
      { "type": "eval", "target": "N_r", "fn": "cfg_rf_N_r", "latex": "N_r = N_s + 2 N_p" },
      { "type": "eval", "target": "omega_c", "fn": "cfg_rf_omega_c", "latex": "…" }
      // { "type": "solve1d", "target": "x", "residual_fn": "…", "bracket_fns": ["…","…"] }  // Brent
      // { "type": "solveND", … }          // RESERVED — feedback loops, not implemented
    ],
    "branches": null,                      // or { "selector": "assembly", "labels": ["open","crossed"],
                                           //      "continuity": "follow-previous" } with per-branch fns
    "guards": [{ "guard_fn": "g_w", "severity": "invalid", "message": "ω_r = ω_c: ratio undefined", "auto": true }]
  }],
  "derivation": [{ "latex": "…", "prose": "…", "rule": "…" }],   // pre-verified; rendered build-time
  "material_binding": null,                // or { "E": "youngs_modulus", "sigma_y": "yield_strength", … }
  "sim": { "engine": "kinematic-rotation", "config": { } },
  "sources": [{ "id": "…", "citation": "…" }]
}
```

`<slug>.fns.ts` shape: `export const fns: Record<string,(v:Record<string,number>)=>number>` — every `fn`/
`guard_fn`/`residual_fn` id above keys into it. Branch-valued solutions emit one function per branch.

## KaTeX — three rendering paths (decided; do not add client KaTeX)

1. Prose math in `.mdx` → `remark-math` + `rehype-katex` at build.
2. Derivation steps / equation panels from artifact JSON → `katex.renderToString()` inside `.astro`
   components at build.
3. Live widget formulas → **pre-rendered KaTeX templates with numeric substitution slots** (`<span
   data-slot="omega_c">`), values injected by the island. No KaTeX JS ships to the client (~70 kB saved).

## Engines (`site/src/engines/`)

- `relation.ts` — executes a configuration plan: eval steps, branch selection (+ continuity hint so
  animations don't snap assemblies), guard evaluation → severity-tagged messages for the ValidityBanner.
- `brent.ts` — ~50-line bracketing root-finder for `solve1d` steps (v1 insurance; fluids/feedback on-ramp).
- `units.ts` — engine computes in SI only; display conversion table per quantity kind; chaining legality
  check (dim 7-vector AND quantity_kind).
- `chain.ts` — undirected port-bindings; the planner orders evaluation and **rejects cycles** (v1). Adding
  cyclic solving later = new plan-step type + planner change; THINGS and schema untouched.

## Site conventions

Astro 6, content collections in `src/content.config.ts` (Zod = the THING template), Preact islands with
native controls, `import.meta.env.BASE_URL` discipline everywhere (project page base `/Mechanic`), Pagefind
postbuild with `data-pagefind-body` scoping (KaTeX/widget markup excluded), `prefers-reduced-motion`
honored by all sims, axe smoke test in CI. Page-weight budget: a THING page ships ≤ ~40 kB JS gz
(Preact runtime + engine + island) — KaTeX/Pyodide stay out of the client bundle.
