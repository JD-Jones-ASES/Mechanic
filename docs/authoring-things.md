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
  engine: statics-cascade                  # must exist in site/src/engines/registry.ts
  config: { sweep: P, draw: beam-cantilever }

sources:
  - id: gere-goodno
    citation: "Gere & Goodno, Mechanics of Materials, 9th ed., ch. 9."
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

## Things authors get wrong (checklist)

- Forgetting `positive: true` on lengths/areas → verification of `sqrt` steps fails. Declare assumptions.
- Putting validity conditions on the widget or variable — they belong on the **relation** so they survive
  re-emission and chaining.
- Multi-branch targets without `expected_branches` and labels — four-bar-style quadratics will fail the
  branch-count check.
- Inventing material property values inline. Materials come from `data/materials/` only (see
  `data-provenance.md`).
- Writing a "derivation" that's just the final formula. Steps should be the 3–8 lines a good TA would put
  on the board; prose carries the why.
