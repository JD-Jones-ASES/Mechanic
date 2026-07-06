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
     samples at 50 dps over declared bounds (tolerance 1e-40). ALL symbolic tiers are skipped above
     `count_ops > 200` — `simplify`/`equals` effectively hang on loop-closure-sized expressions — and the
     numeric tier decides alone. Complex/singular samples are *domain holes* (a four-bar geometry that
     does not assemble), resampled rather than failed, but a minimum quota of real samples must be found
     or the identity is uncertified ⇒ build failure. Multi-branch configurations: EVERY branch label is
     independently resolved, DOF-checked on its own manifold (exact rational rank where the manifold
     point is rational; 50-dps numeric rank with a 1e-30 chop on transcendental manifolds), verified
     against EVERY relation, and given its own parity samples. There is NO blind `sympy.solve()` anywhere
     (verified 2026-06: raw four-bar loop closure hangs `solve()` >5 min); authored closed forms
     and bracketed `solve1d` are the only paths. Any `False`/undecided ⇒ build failure naming
     thing/configuration/branch/target.
   - *solve1d configurations* (first consumer: the eccentric column's secant equation): a target with
     no closed form is authored as `solve1d: { relation: <id>, bracket: [lo, hi] }` — solve a DECLARED
     relation for one unknown inside authored bracket EXPRESSIONS (dimension-checked against the
     target; brackets may read earlier targets, e.g. `(1 - 1e-6)*P_E`). The certificate is numeric,
     per verification sample: bracket endpoints real and ordered, residual SIGN CHANGE proven, a
     33-point scan rejects multi-root brackets, the root found by mpmath bisection at 60 dps
     (`sp.nsolve(..., solver='bisect')` — bracketed, never blind), and the fully-rooted point
     back-substituted into EVERY relation. DOF rank runs at the rooted points (kept as Floats so the
     numeric-rank path decides). Parity samples carry the bisection roots, so `check-parity.mjs` runs
     the browser's own Brent against them — the root-finder itself is inside the oracle. Identity
     derivation steps may not reference solve1d-dependent symbols (no closed form exists to verify
     against); `definition` steps may. solve1d + multi-branch in one configuration is rejected (v1).
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
   `inv_trig_style='full'`. MDX **prose** math takes a different path (remark-math at astro build) and
   has its own two gates: `check-mdx-math.mjs` rejects structurally misparsed display blocks (anything
   that is not single-line `$$…$$` or a bare-`$$` fence — the wrapped form silently swallows the rest of
   the file; four live pages shipped that way once), and `rehype-katex` runs `throwOnError: true` so bad
   TeX fails `astro build` instead of rendering a red error block. `e2e/prose.spec.ts` sweeps every
   built THING page for `.katex-error` and leaked `$$` as the belt-and-suspenders pin.
8. **Display-unit gate**: `site/scripts/check-units.mjs` — every `display_units` entry (and the bare
   `si_unit` fallback when `display_units` is empty) must resolve in `units.ts` `DISPLAY_FACTORS`, or the
   build fails naming thing/symbol/unit. (A missing entry would silently show SI values under prefixed
   labels — a 10^n error guarded only by a console.warn; this gate caught a live `kPa` case on its first run.)

### Verification policy constants (`pipeline/src/mech_pipeline/verify.py`, module top)

When a tolerance or cap trips, reason from this table; if the constants move, update it here
(verified against verify.py 2026-07-04).

| Constant | Value | Governs |
|---|---|---|
| `NUM_SAMPLES` | 30 | numeric-tier target sample count. Certification quota: `max(10, NUM_SAMPLES//3)` REAL samples within `20×NUM_SAMPLES` attempts — fewer ⇒ "cannot certify" failure. Fix the variable bounds; retrying cannot help (sampling is seeded). |
| `PRECISION_DPS` | 50 | mpmath dps for numeric-tier evaluation and the numeric Jacobian rank |
| `TOLERANCE` | 1e-40 | max abs(residual) at any numeric-tier sample of a closed-form identity |
| `SOLVE1D_TOLERANCE` | 1e-25 | max abs(relation residual) after back-substituting a bisection root — looser than `TOLERANCE` only because the root is numeric (60 dps), not symbolic |
| `SOLVE1D_GRID` | 33 | interior sign-scan points per bracket; >1 sign change ⇒ "bracket contains MULTIPLE roots — tighten the bracket" |
| `SIMPLIFY_OPS_CAP` | 200 | `count_ops` above which ALL symbolic tiers (`simplify`, `.equals`, exp-rewrite) are skipped and the numeric tier decides alone. A large authored solution silently taking the numeric-only path is BY DESIGN, not a bug. |
| `RANK_CHOP` | 1e-30 | zero threshold for the numeric-rank fallback of the DOF check on transcendental manifolds (a dependent Jacobian row collapses to ~1e-49; generic entries are O(1)) |

Two precisions are inline, NOT named constants: the solve1d campaign evaluates its eval-chain, brackets
and `nsolve(..., solver='bisect', maxsteps=500)` at **60 dps** (verify.py), and closed-form parity
samples are computed at **25 dps** (compile.py `_samples`) before being floated.

Compilation is **incremental**: `compile_all` fingerprints each THING (thing.yaml bytes + all pipeline
source + the pinned SymPy version) and reuses unchanged artifacts via `.hashes.json` inside the
gitignored generated tree; artifacts of deleted THINGs are removed so the site cannot render orphans.
Sound because compilation is deterministic (seeded sampling). CI persists the artifact directory with
`actions/cache` keyed on the same inputs — warm builds skip the four-bar re-verification entirely.

The fingerprint, precisely (compile.py `_build_fingerprint`, verified 2026-07-04): sha256 over the raw
bytes of every `pipeline/src/mech_pipeline/*.py` (sorted, non-recursive) plus the `sympy.__version__`
string; each THING's cache key = sha256(fingerprint + its `thing.yaml` bytes). So ANY pipeline-source
edit or a SymPy bump invalidates EVERY THING; editing `overview.mdx`/`failure.mdx` or the materials seed
invalidates NOTHING (they never feed the compiled artifact). Local manifest:
`site/src/generated/things/.hashes.json`; reuse requires a manifest hit AND both emitted files present.
CI cache (`.github/workflows/ci.yml`): `actions/cache@v4` on `site/src/generated/things`, key
`things-` + `hashFiles('site/src/content/things/**/thing.yaml', 'pipeline/src/**/*.py', 'pipeline/uv.lock')`,
restore-key prefix `things-` — a stale restore is safe because compile.py's per-THING keys decide what
is actually reused (`uv.lock` stands in for the SymPy version in the CI key). Trap: cache keys hash
INPUTS, not outputs — a hand-edited `.compiled.json`/`.fns.ts` is silently reused until the fingerprint
changes (verified against compile.py 2026-07-04). Never hand-edit or commit anything under
`site/src/generated/` or `data/build/` (gitignored); to force a full recompile, delete `.hashes.json`
(or the whole generated tree).

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
      "role": "free"                       // free | material | derived | constant (default role; configs refine)
                                           // role "constant" (cited physical constant: g, Weibull params)
                                           // additionally carries "citation": "<source-id>" — required by
                                           // compile.py, rendered in the ConstantsPanel. Constants are
                                           // excluded from DOF/knob arithmetic like materials; their
                                           // bounds are a verification SAMPLING range, the emitted value
                                           // is the default. (verified against compile.py 2026-07-06)
    }
  },
  "relations": [{
    "id": "willis", "group": "kinematics", "latex": "…",
    "residual_fn": "rel_willis",           // key into fns.ts — callable residual (Brent/feedback on-ramp)
    "srepr": "…",                          // provenance: exact SymPy form that was verified
    "assumptions": ["rigid bodies"],
    "validity": [{ "guard_fn": "g1", "severity": "warn|invalid", "message": "…", "citation": "…",
                   "needs": ["delta","L"],      // symbols the predicate reads — the engine evaluates it
                                                // whenever all are finite, even after evaluation was
                                                // refused ("cannot assemble" must not be masked)
                   "scope": ["P_cr","SF_b"] }], // OPTIONAL scoped refusal: an invalid envelope poisons
                                                // only these derived variables instead of the whole
                                                // evaluation — model hand-off (Euler/Johnson). Absent
                                                // = global refusal, as before.
    "citation": "source-id"
  }],
  "configurations": [{
    "id": "ring-fixed", "label": "Ring fixed — sun in, carrier out",
    "constraints": { "omega_r": 0 },
    "inputs": ["N_s","N_p","omega_s"],
    "plan": [                              // discriminated union — executed in order
      { "type": "eval", "target": "N_r", "fn": "cfg_rf_N_r", "latex": "N_r = N_s + 2 N_p" },
      { "type": "eval", "target": "omega_c", "fn": "cfg_rf_omega_c", "latex": "…" },
      { "type": "solve1d", "target": "P_y",  // bracketed Brent on a DECLARED relation's residual;
        "residual_fn": "rel_secant_yield",   // bracket endpoints are FUNCTIONS of the evaluated env
        "bracket_fns": ["cfg_a_P_y__blo", "cfg_a_P_y__bhi"], "latex": "…" },
      { "type": "table",                     // cited tabulated lookup (ADR-0009); node-exact at
        "targets": [null, "Y_p"],            //   published rows, linear between, in the parity oracle.
                                             // one slot per table COLUMN; filled slots are this step's
                                             //   targets — several filled slots = multi-column fill
                                             //   from ONE lookup (stepped-shaft-fillet's A and b)
        "table_id": "lewis-form-factor-20fd",
        "arg_fn": "cfg_d_Y_p__arg",          // the `at` expression, emitted like any fn
        "mode": "interpolate-linear", "rows": [[12, 0.245]], "domain": [12, 400],
        "guard": { "severity": "invalid", "message": "…", "citation": "shigley",
                   "scope": ["Y_p", "sigma_b"] },  // out-of-domain = SCOPED refusal of the columns +
                                             //   downstream dependents; no clamp, no extrapolation
        "latex": "…" }
      // { "type": "solveND", … }          // RESERVED — nonlinear/feedback solving; deferred by
                                            // ADR-0008 (accepted, split scope) pending its own future ADR
    ],
    "branches": null,                      // or { "selector": "circuit", "labels": ["open","crossed"],
                                           //      "continuity": "follow-previous" } with per-branch fns;
                                           // EVERY branch is independently verified against EVERY relation
    "guards": [{ "guard_fn": "g_w", "severity": "invalid", "message": "ω_r = ω_c: ratio undefined", "auto": true }],
    "samples": [{ "inputs": {"…": 1}, "outputs": {"…": 2}, "branch": "open" }]
                                           // SymPy-computed parity oracle for the JS evaluator;
                                           // "branch" present only on multi-branch configurations
  }],
  "derivation": [{ "latex": "…", "prose": "…", "rule": "…" }],   // pre-verified; rendered build-time
  "material_binding": null,                // or { "E": "youngs_modulus", "sigma_y": "yield_strength", … }
  "sim": { "engine": "kinematic-rotation", "config": { } },
  "sources": [{ "id": "…", "citation": "…",
                "verification": "how the citation was pinned (optional; rendered on /verification/)" }]
}
```

`<slug>.fns.ts` shape: `export const fns: Record<string,(v:Record<string,number>)=>number>` — every `fn`/
`guard_fn`/`residual_fn` id above keys into it. Branch-valued solutions emit one function per branch.

**Parity-sample encoding** (verified against compile.py `_samples`, verify.py
`verify_solve1d_configuration`, and check-parity.mjs, 2026-07-04): 3 samples per configuration per
branch label. `inputs` = the declared knobs PLUS every material-role variable, as floats.
`outputs` = every plan target, not just leaves; closed-form samples ALSO include the constrained
variables, solve1d samples exclude them but DO carry the 60-dps mpmath bisection roots as plain
floats — that is how the browser's Brent gets oracle-checked (the asymmetry is real, not a doc
error). The two paths are seeded and capped differently: closed-form samples (compile.py
`_samples`) are seeded by `<thing>/<cfg>/samples[/<branch>]`, discard any sample that hits a
complex/±∞/NaN value anywhere in its chain WHOLE (no per-value omission), and fail the build
("could not generate parity samples") if `40×n` attempts can't produce `n` clean samples; solve1d
samples are the first 3 certified points of `verify_solve1d_configuration`'s 30-sample campaign,
seeded by the configuration's context string, capped at `20×NUM_SAMPLES` attempts with its own
failure message ("only N real-valued solve1d samples found"). Multi-branch samples are keyed by a top-level `"branch": <label>`; `check-parity.mjs`
evaluates each sample on exactly that branch's fns. The gate replays the whole plan in Node against the
emitted `fns.ts` (solve1d steps run the site's actual `brent.ts`) and requires every output within
relative `1e-9` (`RTOL`, scale floored at 1e-30); numeric constraints are seeded into the env,
string-valued constraints are skipped.

## KaTeX — three rendering paths (decided; do not add client KaTeX)

1. Prose math in `.mdx` → `remark-math` + `rehype-katex` at build.
2. Derivation steps / equation panels from artifact JSON → `katex.renderToString()` inside `.astro`
   components at build.
3. Live widget formulas → **pre-rendered KaTeX templates with numeric substitution slots** (`<span
   data-slot="omega_c">`), values injected by the island. No KaTeX JS ships to the client (~70 kB saved).

## Engines (`site/src/engines/`)

- `relation.ts` — executes a configuration plan: eval steps, solve1d steps (bracket fns from the env →
  Brent; NaN ⇒ honest refusal), branch selection (+ continuity hint so animations don't snap
  assemblies), guard evaluation → severity-tagged messages for the ValidityBanner. Scope-carrying
  invalid envelopes poison only their named variables (`EvalResult.invalidVars`); unscoped invalids
  refuse everything, as before.
- `brent.ts` — ~50-line bracketing root-finder for `solve1d` steps (first consumer: the eccentric
  column's secant equation; also the fluids/feedback on-ramp). Tolerance is relative for |root| > 1.
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

**Sim contract (invariant 5):** ThingWidget passes sims `{ values, invalid, invalidVars }`, where
`invalid` is the engine's authoritative GLOBAL refusal verdict — a refusal can leave values omitted,
present-as-NaN, or fully finite (a validity predicate over good numbers), so NaN-sniffing alone is
never sufficient — and `invalidVars` lists per-variable SCOPED refusals (model hand-off: e.g. below
λ_T the Euler readouts are refused while Johnson's stay live). Globally refused states render the
shared `SimRefusal` figure, never default geometry; scoped-refused variables must not be drawn
confidently either (ColumnSim dashes the refused model's curve; EccentricColumnSim withholds the
elastic panel and points at the still-valid load margin). Shared presentational helpers in
`site/src/components/sims/`: `useSimClock` (rAF + reduced-motion; stops while refused), `StressBands`
(the heat-ramp field encoding), `SimRefusal`. Exception by design: FourbarSim draws crank-only partial
geometry for non-assembling poses (its inputs are always honest) with a caption saying so.

## Invariant → gate map

Which of CLAUDE.md's five invariants is enforced by WHICH machine gate — and where enforcement is
convention only. The convention column is the point: do not cite this table as if a check exists there.
(Gates verified against the named files 2026-07-04.)

| Invariant | Machine gates | Convention only (no gate) |
|---|---|---|
| 1 Relational core | Relations are `residual` strings in `content.config.ts` — no input→output form is expressible. `verify.py dof_check`: knob count = unknowns − Jacobian rank at on-manifold points, per configuration AND per branch; mismatch fails the build. Planetary reference case pinned by `pipeline/tests/test_compile_e2e.py` goldens + `e2e/things.spec.ts` ("different knob sets over the same relations"). | Choosing relations that genuinely model the THING — a residual can still encode a directed formula in spirit. |
| 2 Dimensional type system | `dims.py check_homogeneous` on every residual, solution, solve1d bracket, validity condition, and derivation step; `quantity_kind` must exist in `kinds.py` (compile.py); `check-units.mjs` (every display unit resolves in `DISPLAY_FACTORS`); chaining legality = dim 7-vector AND kind, plus planner cycle rejection, pinned by `site/tests/chain.test.mjs`. | Assigning the RIGHT quantity_kind — the gate checks membership in kinds.py, not semantics. |
| 3 Material axis | compile.py: `role: material` ⇔ `materials.binds` entry (both directions checked) and material vars can never be input knobs; programmatic unit conversion with goldens (`pipeline/tests/test_ingest.py`, `test_dims.py` — the 1000× gram-scale trap); `basis` enum required by ingest + the materials schema; the stiffness≠strength moment (Ti-6Al-4V vs A36) is a hard golden in `e2e/things.spec.ts`. | UI legibility of the cascade and the Ashby tie-back — design judgment, no gate. |
| 4 Shared engines | Engine behavior pinned by `site/tests/engine.test.mjs` (scoped/global refusal contract) and `chain.test.mjs`; `check-parity.mjs` runs the browser's own Brent inside the build oracle; `sim.engine` is a required schema field. | `sim.engine` is a FREE STRING (`z.string()`, not an enum — verified against content.config.ts 2026-07-04); nothing machine-detects bespoke math inside a sim component. "Needs custom math = missing engine capability" is review discipline. |
| 5 Credibility spine | compile.py: every relation requires a `citation` resolving to a `sources` entry; validity severities and `scope` (derived vars only) are validated; every emitted number passes tiered/solve1d certification + the parity gate; KaTeX gates (stage 7); material provenance fields (source, basis, published value/unit) required by the materials schema; refusal contract pinned by `engine.test.mjs` and e2e; `/verification/` renders it all (`verification.astro`); per-THING physics-test EXISTENCE is gated by `pipeline/tests/test_physics_coverage.py` (every slug under `site/src/content/things/` must map to a physics test module; stale map entries also fail — added 2026-07-04 after it caught planetary-gearset shipping without one). | The INDEPENDENCE and quality of each physics test (re-derive, don't import residuals) and the hand-checkable golden are review discipline — the gate checks existence, not substance. `sources[].verification` pinning is optional in the schema. |
