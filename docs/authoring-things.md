# Authoring a THING

A THING is a directory: `site/src/content/things/<slug>/` containing `thing.yaml` (the machine-checked
core), `overview.mdx` (what it is, where it shows up, photos/diagrams), and `failure.mdx` (how it fails,
qualitatively — with citations). The Zod schema in `site/src/content.config.ts` enforces the shape; the
Python pipeline enforces the math. Write the YAML so the build can prove you right.

## `thing.yaml` walkthrough

```yaml
id: cantilever-beam
title: Cantilever Beam (End Load)
summary: One-sentence card text.
facets: [stress, mass-cost]        # relation-group tags, NOT a single thing-level archetype

variables:
  - symbol: P                      # valid Python identifier; used verbatim in expressions
    name: End load
    latex: P
    unit: N                        # sympy.physics.units expression: N, Pa, m, rad/s, kg/m**3, "1" for dimensionless
    quantity_kind: force           # see registry in pipeline/src/mech_pipeline/kinds.py — extend it there
    default: 500
    bounds: [0, 5000]
    positive: true                 # becomes a SymPy assumption; needed for sqrt/abs verification
    integer: false
    role: free                     # free | material | derived | constant (constants: see below)
  - symbol: E
    role: material                 # material-bound: never an input knob, never a derived output

materials:
  binds: { E: youngs_modulus, sigma_y: yield_strength, rho: density }

relations:
  - id: tip-deflection
    group: stress
    latex: \delta = \frac{P L^3}{3 E I}
    residual: delta - P*L**3 / (3*E*I)     # SymPy-parseable; == 0 defines the relation
    assumptions: ["linear elastic", "small deflections", "Euler-Bernoulli (shear neglected)"]
    citation: gere-goodno
    validity:
      - condition: delta/L < 0.1           # boolean SymPy expression over variables
        severity: warn                     # warn = show banner; invalid = refuse the number
        message: "Tip deflection exceeds L/10 — small-deflection assumption is breaking down."
        citation: gere-goodno
      # scoped refusal (model hand-off): an INVALID envelope may name the derived
      # variables it poisons — those readouts blank, everything else stands. This is
      # how two models with complementary envelopes share one page (Euler/Johnson).
      # Omit scope and the refusal is global, as before. scope is invalid-only, and
      # every named symbol must be role: derived.
      # - condition: lam >= lam_T
      #   severity: invalid
      #   scope: [P_cr, sigma_cr, SF_b]
      #   message: "Below the transition the Johnson readouts govern — read those."

configurations:
  - id: default
    label: Load and geometry in, deflection and safety factor out
    constraints: {}                        # e.g. { omega_r: 0 } — counts as a relation in DOF arithmetic
    inputs: [P, L, b, h]                   # count MUST equal DOF; build checks
    solutions:                             # authored closed forms — the build VERIFIES these
      I: b*h**3/12                         # later entries may use earlier targets (evaluated in order)
      delta: P*L**3/(3*E*I)
      sigma: P*L*(h/2)/I
      SF: sigma_y/sigma
    expected_branches: 1                   # quadratic targets: 2, with branch labels (see below)
    # branches: { selector: assembly, labels: [open, crossed], continuity: follow-previous }

derivation:                                # every line is machine-verified against the solutions
  - expr: Eq(M_x, P*(L - x))
    prose: "Cut the beam at x; the internal moment is the load times the remaining arm."
    rule: "statics: moment balance"
  - expr: Eq(delta, P*L**3/(3*E*I))
    prose: "Integrate EI·v'' = M(x) twice with v(0)=v'(0)=0."
    rule: "double integration"

sim:
  engine: statics-cascade                  # informational facet; the DRAW key below is what binds
  config: { sweep: P, draw: beam-cantilever }   # draw must be registered in the SIMS map
                                                # (site/src/components/ThingWidget.tsx) with a component
                                                # in site/src/components/sims/

sources:
  - id: gere-goodno
    citation: "Gere & Goodno, Mechanics of Materials, 9th ed., ch. 9."
    verification: "§9.x pinned against the publisher TOC, YYYY-MM-DD."  # optional but expected:
                                       # HOW the citation was checked (TOC, indexed full text, …)
                                       # — rendered on /verification/; omitting it displays as
                                       # "not section-pinned" (ADR-0007). Never invent precision
                                       # you didn't verify.
```

## Rules the build enforces (fail loudly, by design)

1. Every relation dimensionally homogeneous; every solution's dimensions match its target.
2. `len(inputs) == variables − independent relations − constraints` per configuration.
3. Every authored solution back-substitutes to zero residual in every relation (tiered symbolic check,
   then ≥30 high-precision numeric samples). **Never rely on blind `solve()`** — it hangs on loop-closure
   trig systems; if you can't write the closed form, write a `solve_hint` (substitution recipe) or mark the
   target `solve1d` with a bracket.
4. Every derivation step must reduce to an identity under the verified solutions.
5. Every LaTeX string must render in KaTeX — including MDX prose math. Display math in
   `overview.mdx`/`failure.mdx` must be single-line (`$$ ... $$`) or a bare-`$$` fence; a block
   that opens with content on the `$$` line and closes on a later line misparses and KaTeX
   swallows the rest of the file into one red error block (four pages shipped that way once).
   `check-mdx-math.mjs` fails the build on the structural form; `throwOnError` in
   `astro.config.mjs` fails it on bad TeX.
6. Material-bound variables can never appear in `inputs` or as solution targets.
7. Every relation and every validity envelope carries a citation that resolves in `sources`.
8. Every `display_units` entry (and the bare `si_unit` when `display_units` is empty) must resolve in
   `site/src/engines/units.ts` `DISPLAY_FACTORS` — `check-units.mjs` fails the build otherwise. The
   lookup is exact-string (`kg/m**3` and `kg/m^3` are distinct keys; both exist); a non-empty
   `display_units` means `si_unit` itself is NOT checked — it is only the unit Readouts/KnobPanel
   fall back to when the list is empty. The trap the gate closes: units.ts falls back to factor 1
   with the raw label for unknown units, so a missing prefixed unit shows the SI value under your
   label — wrong-as-labeled, guarded only by a console.warn. Add the conversion entry in the same
   change as the unit.

### Display math in MDX — the exact structural rule

`check-mdx-math.mjs` is line-based. Outside a fence, any line containing an ODD number of `$$`
fails. A line that is exactly `$$` (whitespace aside) opens a fence; only another bare-`$$` line
closes it — any other `$$` inside the fence fails, and a fence still open at end-of-file fails.
Inline `$...$` is not this gate's business; bad TeX inside a well-formed block is caught by
`throwOnError`.

| Form | Verdict |
|---|---|
| `$$ \sigma = Mc/I $$` — opens and closes on one line | VALID |
| bare `$$` line · content lines · bare `$$` line | VALID |
| `$$ \sigma =` … closing `$$` on a later line | INVALID — odd `$$` count on the opening line |
| `\frac{Mc}{I} $$` as a fence's closing line | INVALID — the close must be a bare `$$` line |
| a `$$` fence never closed | INVALID — flagged at end of file |

## solve1d targets (the eccentric-column pattern)

When a target genuinely has no closed form (the secant equation's $P_y$ sits inside and outside
a secant), author it as a bracketed root of a DECLARED relation.

**First rule of solve1d: identity derivation steps may NOT reference the solve1d target — or
anything computed from it.** There is no closed form to verify against; the compiler taints the
target plus every later target whose expression reads it, and fails any `check: identity` step
touching a tainted symbol. Write those lines as `check: definition` steps, or restate them over
the closed-form variables upstream of the solve.

```yaml
solutions:
  P_E: pi**2*E*I/L**2                  # evaluated before the solve step
  P_y:
    solve1d:
      relation: secant-yield           # the relation driven to zero (its citation rides along)
      bracket: ["1e-9*P_E", "(1 - 1e-6)*P_E"]   # EXPRESSIONS; may read earlier targets
  SF_y: P_y/P                          # downstream targets may use the root normally
```

What the build does with this (and fails loudly on):

- The relation must exist, involve the target, and read only symbols already evaluated at that
  plan step (inputs, constraints, materials, earlier targets) — solve1d runs inside the forward
  DAG. Bracket expressions are dimension-checked against the target and obey the same ordering.
- **The bracket must actually bracket**: at every verification sample the endpoints must be
  real, ordered, and produce a residual sign change — and a 33-point scan must find exactly one
  crossing (a multi-root bracket is an ambiguous widget answer; tighten it). Design the bracket
  so this is a *theorem*, not luck — the eccentric column's residual falls monotonically from
  σ_y to −∞ on (0, P_E), so its bracket can never fail.
- The root is found by 60-digit bisection (never blind `solve()`), the rooted point is
  back-substituted into EVERY relation, and the roots land in the parity samples — so the
  browser's Brent is checked against them at every build.
- One solve1d target may not be combined with multi-branch solutions in the same configuration.

## Multi-branch configurations (the four-bar pattern)

When a target has several honest solutions (quadratic targets: two assembly circuits), author ALL
of them:

```yaml
configurations:
  - id: position
    expected_branches: 2
    branches: { selector: circuit, labels: [open, crossed], continuity: follow-previous }
    solutions:
      theta4:
        open: 2*atan((...- sqrt(...))/(...))   # label order must match branches.labels exactly
        crossed: 2*atan((...+ sqrt(...))/(...))
```

What the build does with this:

- **Every branch is resolved and verified independently against every relation**, and the DOF
  check runs on each branch's own manifold. A crossed-circuit solution that doesn't close the
  loop fails the build naming the branch — wrong sign pairings cannot ship.
- Parity samples are generated per branch (`samples[].branch`), and the widget grows a selector
  (labelled with `selector`) that picks the branch at runtime.
- `continuity` defaults to `follow-previous` and rides the artifact, but nothing at runtime reads
  it yet (reserved): the branch selector simply holds its value while knobs sweep, and RESETS to
  the first label on every configuration switch — knobs reset to the new configuration's defaults
  at the same time. (verified against ThingWidget.tsx 2026-07-04)
- The derivation is checked against the FIRST label's closed forms: keep steps branch-independent
  (loop equations, eliminations, the quadratic itself) or mark the branch-split step `definition`.
- Partial-domain solutions are fine: where a branch evaluates complex (a non-assembling linkage),
  the verifier resamples — but it must find enough real samples inside the declared bounds, so
  keep bounds honest.
- `expected_branches` must equal `len(branches.labels)`, at least one solution must actually be
  branched, and single-branch configurations must not carry a `branches` block.

## Configuration discriminators (the `mode` idiom)

When configurations share one relation set but differ in a *case* — impact-loading's axial rod vs
cantilever strike, two-bar-truss's tension vs compression — encode the case as a small integer
variable constrained per configuration, rather than duplicating relations:

```yaml
variables:
  - symbol: mode
    name: Loading sense (0 tension · 1 compression)
    unit: '1'
    quantity_kind: count
    default: 1
    bounds: [0, 1]
    integer: true                  # a FREE integer with NO positive: — see the trap below

configurations:
  - id: compression
    constraints: { mode: 1 }       # constrained in every configuration, so it is never a knob
  - id: tension
    constraints: { mode: 0 }
```

What it buys (both uses shipped in Phase 2):

- Relations may read the discriminator to select or sign a readout, or to blend two
  dimensionally-homogeneous cases into one shared relation (impact-loading's single δ_st
  relation serving both its configurations).
- A **scoped-invalid envelope keyed on the discriminator** (`condition: mode > 0`) makes a
  refusal configuration-specific on a shared relation set — two-bar-truss scope-refuses its
  buckling readouts in the tension configuration this way (a tension member cannot buckle).

The trap (hit in S13, worth its own line): **the discriminator must stay a free integer with no
`positive:` assumption.** The compiler's "validity condition must be a Relational" check runs at
PARSE time, before configuration constraints are substituted — under a positivity assumption,
`mode > 0` simplifies to `True` at parse and the build rejects the envelope. Left assumption-free,
the condition stays a Relational and the constrained value trips or passes it at runtime.
(verified against compile.py + two-bar-truss 2026-07-06)

## Cited constants (`role: constant`)

A physical constant that enters the math — standard gravity, the bearing Weibull parameters — is
authored as a variable with `role: constant`. For the arithmetic it behaves like a material: never
an input knob, excluded from the DOF/knob count. Unlike a material it never varies at runtime, so
its value lives in `default:` and its provenance is mandatory (invariant 5: a constant is cited
data, not derived physics):

```yaml
  - symbol: g
    name: Standard gravity
    latex: g
    unit: m/s**2
    quantity_kind: acceleration
    default: 9.80665               # the value the site uses — exact by definition
    bounds: [9.78, 9.83]           # SAMPLING range only: verification samples the constant like a
                                   # material across this range; the emitted value is the default
    positive: true
    role: constant
    citation: nist                 # REQUIRED — must resolve in sources[]; build fails without it,
                                   # and `citation` is rejected on any other role
    display_units: ["m/s^2"]
```

The source id rides the compiled artifact and renders in the ConstantsPanel. Dimensionless
constants work identically (ball-bearing-life's Weibull x₀, θ, b) — carry the honest
`quantity_kind` so they can never chain into a wrong port. Never re-key a constant from memory
or a brief: web-corroborate the published value when authoring (the S11 lesson — a recalled
Weibull θ was wrong and only independent re-verification caught it).

## Tabulated relation data (the `table` plan step, ADR-0009)

When a governing quantity is *published as a table*, not a formula — the Lewis gear-tooth form
factor `Y(N)` is the reference case — author it as a cited `tables:` block and consume it in
`solutions`. There is no closed form to verify against, so (like `solve1d`) the value is proven
numerically per sample and tainted for derivation identity steps.

```yaml
tables:
  - id: lewis-form-factor-20fd
    name: Table 14-2               # rendered in the plan-step LaTeX, e.g. Y = Table 14-2(N)
    citation: shigley              # must resolve in sources[]
    provenance: "Values as published in Shigley Table 14-2; 20° full-depth, load at the tip."
    arg: N_p                       # a declared variable — the dimensional/kind TEMPLATE for the argument
    columns: [Y_p]                 # declared variable(s) — the template(s) for each value column
    mode: interpolate-linear       # interpolate-linear | exact-row | threshold (RESERVED — compile rejects it)
    interpolation_citation: shigley  # REQUIRED for interpolate-*: who says interpolating is legitimate
    rows:                          # [arg, col1, ...], strictly increasing arg; rows_from: <file> RESERVED
      - [12, 0.245]
      - [400, 0.480]               # ... every published row, verbatim
```

Consume it in `configurations.solutions` — one entry per column value you want, `at` an expression
over already-evaluated symbols (forward DAG, like a `solve1d` bracket). The same table may be read
more than once at different args:

```yaml
solutions:
  Y_p: { table: lewis-form-factor-20fd, at: N_p }   # target Y_p ← lookup at N_p
  Y_g: { table: lewis-form-factor-20fd, at: N_g }   # target Y_g ← same table at N_g
  sigma_b: K_v*W_t/(b*m_mod*Y_p)                    # downstream closed forms read the columns normally
```

What the build does with this (and fails loudly on):

- **Dimensional typing.** The consumed target is checked against the column template's dimension
  AND quantity kind; `at` is checked against the `arg` template's dimension and kind (and integer
  flag). Same-dimension/different-kind (a ratio fed where a count is expected) is rejected.
- **DOF.** Each column a table fills counts as **one relation** — the table pins that unknown as
  surely as a closed form would, so knob counts stay honest.
- **Node-exact + interpolation, proven.** The emitted lookup returns each published row
  bit-exactly (no interpolation arithmetic runs at a node), interpolates linearly between rows, and
  the samples land in the parity oracle so the browser's interpolation is pinned against mpmath
  every build. Rows must be strictly increasing and finite; an integer-flagged `arg` needs integer
  rows.
- **Out-of-domain refuses, scoped.** Outside the tabulated range the lookup is non-finite and the
  engine raises a **scoped `invalid`** refusal: the column AND its downstream dependents blank, the
  table's citation rides along, the rest of the page stands. There is **no clamp or extrapolation**
  in the emitted code — outside the data there is nothing honest to return. (`exact-row` mode
  refuses any non-row argument the same way.)
- **Derivation.** Table outputs (and everything computed from them) have no closed form, so
  `identity` derivation steps may not reference them — restate over closed-form variables upstream,
  or mark the step `check: definition`. That interpolation between rows is legitimate is itself a
  cited modeling choice (`interpolation_citation`), surfaced on `/verification/`; the tabulated
  numbers are cited DATA, not machine-proven physics — say so, and cross-pin them against a second
  published source in `sources[].verification` and the physics test.

`threshold` mode and `rows_from` (external data files) are schema-reserved; the compiler rejects
them until their consumers arrive. **Multi-column consumption** (one lookup filling several
targets) IS built — S02's stepped-shaft-fillet fills A and b from one D/d lookup. Author one
solutions entry per column with the SAME table id and the SAME `at` expression, consecutively
(no intervening plan step): the compiler merges consecutive same-`(table, at)` entries into a
single lookup step. (verified against compile.py table grouping 2026-07-06)

## Scoped refusal — what the engine actually does

- `scope` is taken at face value: when the envelope trips, every named symbol is added to
  `invalidVars`. The engine never derives which variables the physics "really" poisons, so a
  superset is legal and simply blanks more readouts; the compiler checks only that each name is a
  declared variable with `role: derived` (file-global, not per configuration).
- A scope symbol the active configuration never computes is legal and inert: it lands in
  `invalidVars`, no readout matches it, nothing errors.
- Order cannot matter: envelope predicates run after the plan, tripped scopes union into one set,
  and a single UNscoped invalid refuses the whole evaluation regardless of any scoped envelopes.
- Scoped refusal does not stop evaluation — the poisoned values are computed and sit finite in
  `values`. Blanking them is entirely the UI's job via `invalidVars`, which is why sims must
  consume it (checklist below). (verified against relation.ts + compile.py 2026-07-04)

## Adding a quantity kind

Mint a NEW kind exactly when two quantities share a dimension 7-vector but must never chain into
each other (`torque` vs `bending_moment`; `line_load` vs `stiffness` — both N/m;
`specific_energy` vs velocity²). If a connection between the two would be physically legitimate,
reuse the existing kind. Then:

- Add the string to `QUANTITY_KINDS` in `pipeline/src/mech_pipeline/kinds.py`, with a comment
  naming what it must not chain into (the file's convention). `compile.py` rejects unknown kinds,
  so a typo fails the build.
- Touch nothing on the site: the kind string rides the compiled artifact and is compared by plain
  string equality in `connectionLegal` (`site/src/engines/units.ts`) — there is no site-side kind
  registry, and `check-units.mjs` checks unit strings, not kinds. A new **display unit** forces a
  `DISPLAY_FACTORS` entry; a new **kind** does not. (verified against units.ts + check-units.mjs
  2026-07-04)
- `kinds.py` is pipeline source, so editing it changes the build fingerprint: the next build
  re-verifies every THING (cold, ≈3–4 min). Expected, not hung.

## Things authors get wrong (checklist)

- Forgetting `positive: true` on lengths/areas → verification of `sqrt` steps fails. Declare assumptions.
- Putting validity conditions on the widget or variable — they belong on the **relation** so they survive
  re-emission and chaining.
- Multi-branch targets without `expected_branches` and labels — four-bar-style quadratics will fail the
  branch-count check.
- Inventing material property values inline. Materials come from `data/materials/` only (see
  `data-provenance.md`).
- Incoherent declared defaults: every derived variable's `default:` must be computed from the
  free-variable AND material-variable defaults declared *in the same file* (compute with the
  declared G, not the material you happened to be thinking about). The concrete rule: changing
  ANY free or material default invalidates EVERY derived default — re-evaluate the
  configuration's `solutions:` chain top to bottom (later entries read earlier targets) and
  update the whole set in one edit. Nothing machine-checks this: `compile.py` copies `default:`
  into the artifact verbatim, and the widget never reads derived defaults — it seeds knobs from
  the configuration's input defaults and computes the rest live from the materials DB. An
  incoherent value fails no build; it lies to every reader of the file. Two real bugs shipped to
  review this way. (verified against compile.py + ThingWidget.tsx 2026-07-04)
- Writing a "derivation" that's just the final formula. Steps should be the 3–8 lines a good TA would put
  on the board; prose carries the why.
- New sim components with CSS classes that don't exist yet: SVG defaults to `stroke: none`, so the shape
  renders INVISIBLE and every functional test still passes (the four-bar shipped that way once). When you
  add a draw component, define its classes in `site/src/styles/global.css` in the same change — and look
  at the page.
- New sims must consume the widget's `invalid` prop and render the shared `SimRefusal` for refused
  states. Destructuring defaults (`const { R = 0.15 } = values`) draw a confident default figure over a
  refused state — and the engine can refuse with values omitted, present-as-NaN, OR fully finite, so the
  `invalid` verdict is the only sufficient signal (see the sim contract in `docs/architecture.md`). Use
  the shared `useSimClock` for animation and `StressBands` for radial-field shading instead of copies.
- Sims on pages with scoped envelopes must also consume `invalidVars`: a scope-refused variable must
  not be drawn confidently (dash the refused model's curve, withhold the refused panel) even though the
  page as a whole still renders. Deciding "which model governs" from raw values instead of the verdicts
  re-implements validity in the widget — the thing invariant 4 exists to ban.
- Writing a solve1d bracket that is merely *plausible*. The build proves the sign change only at
  sampled states; author a bracket whose sign change is structural (endpoint limits provable in the
  physics tests), or a future knob combination can hit the honest-refusal path for no good reason.
- Editing `thing.yaml` with PowerShell `Get-Content`/`Set-Content` round-trips: PS 5.1 reads BOM-less
  UTF-8 as ANSI and silently mojibakes every em-dash and Greek letter. Use a UTF-8-safe editor path.
