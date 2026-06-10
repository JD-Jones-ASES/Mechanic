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
    role: free                     # free | material | derived
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
5. Every LaTeX string must render in KaTeX.
6. Material-bound variables can never appear in `inputs` or as solution targets.
7. Every relation and every validity envelope carries a citation that resolves in `sources`.
8. Every `display_units` entry (and the bare `si_unit` when `display_units` is empty) must resolve in
   `site/src/engines/units.ts` `DISPLAY_FACTORS` — `check-units.mjs` fails the build otherwise. Add the
   conversion entry in the same change as the unit.

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
- The derivation is checked against the FIRST label's closed forms: keep steps branch-independent
  (loop equations, eliminations, the quadratic itself) or mark the branch-split step `definition`.
- Partial-domain solutions are fine: where a branch evaluates complex (a non-assembling linkage),
  the verifier resamples — but it must find enough real samples inside the declared bounds, so
  keep bounds honest.
- `expected_branches` must equal `len(branches.labels)`, at least one solution must actually be
  branched, and single-branch configurations must not carry a `branches` block.

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
  declared G, not the material you happened to be thinking about). Two real bugs shipped to
  review this way; recompute the whole derived set whenever any default changes.
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
- Editing `thing.yaml` with PowerShell `Get-Content`/`Set-Content` round-trips: PS 5.1 reads BOM-less
  UTF-8 as ANSI and silently mojibakes every em-dash and Greek letter. Use a UTF-8-safe editor path.
