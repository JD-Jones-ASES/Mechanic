# Mechanic — Engineering Reference Portal

A browsable database of mechanical/physical THINGS (gears, linkages, beams, vessels…) for engineering
undergraduates. Each THING: overview, governing equations **with verified derivations**, an interactive
sim, configurable options including material, and a how-it-fails note. Breadth-first eventually;
**correctness and visible provenance before catalog size**. Legible math is a feature.

**Hard constraint:** pure static site on GitHub Pages. No server, no serverless, no runtime backend.
All computation happens at build time (Python) or in the browser (generated TS). Anything that violates
this is wrong by definition.

## The five invariants

Violating any of these requires an ADR in `docs/decisions/` and explicit owner sign-off.

1. **Relational core.** A THING declares variables and undirected relations (residual expressions), never
   fixed input→output functions. Knob count per configuration = DOF = independent variables − independent
   relations (build-checked). The planetary gearset (2 DOF, no single ratio) is the reference case: if a
   change breaks it, the change is wrong.
2. **Dimensional analysis is the type system.** Every variable carries an SI dimension 7-vector `[L,M,T,I,Θ,N,J]`
   **and a `quantity_kind`** (angle, ratio, tooth count, and Poisson ν are all zero-vector — dimension alone
   is not enough). Every relation must be dimensionally homogeneous (build fails otherwise). Widget chaining
   is legal iff dimension vector AND quantity kind match; v1 chaining is a forward DAG enforced by the
   planner, not the schema (so cyclic solving can be added later without rewriting THINGS).
3. **Material is a cross-cutting axis.** Material-bound variables (E, σ_y, ρ, …) fan out through all
   relations as a cascade — stiffness, strength, and density are independent axes and the UI must make that
   legible (the "Ti-6Al-4V deflects MORE than mild steel" moment). The Ashby chart page ties per-THING
   dropdowns back to material-class space.
4. **Shared engines, no bespoke sim code.** Relation groups carry facet tags (kinematics, stress,
   torque-power, mass-cost…); sims are driven by shared engines (`site/src/engines/`) configured by data.
   A THING that "needs" custom math in its widget indicates a missing engine capability, not a license to
   hand-roll.
5. **Credibility spine.** Every emitted number traces to: a relation (with citation), its assumptions and
   validity envelope (violations surface as warn/invalid banners, never silent), and a passed unit check.
   Every material value carries source + basis. The whole site is labeled educational — not for design use.
   SymPy verifies derivation-step *equivalence*, not physics: modeling steps (where physics enters by
   citation) are the declared audit surface, so every THING also needs an independent first-principles
   cross-check in `pipeline/tests/`, a hand-checkable numeric golden, and citations pinned against
   accessible sources where possible (recorded in `sources[].verification`). **There is no human review
   gate** — this project is AI-authored under owner-designed verification systems (ADR-0007), the site
   says so on `/verification/`, and corrections flow through the errata path.

## The factory pattern

The Zod schema in `site/src/content.config.ts` IS the THING template. Authoring = writing
`site/src/content/things/<slug>/thing.yaml` + `overview.mdx` + `failure.mdx` per `docs/authoring-things.md`.
The Python pipeline **verifies, never derives blind**: authors supply solved forms per knob configuration;
SymPy checks them against the relations (symbolic + numeric sampling). There is NO blind `solve()` anywhere
in the pipeline — it verifiably hangs on raw loop-closure trig systems; authored closed forms, bracketed
`solve1d` (sign-change-certified per sample, rooted by 60-dps bisection, roots parity-checked against the
browser's Brent), and certified `solve_linear` groups are the only paths. Certified `solve_linear` groups
are not blind solving: SymPy `linsolve` runs only on a square system PROVEN affine in its targets
(∂²r/∂tᵢ∂tⱼ ≡ 0 for every target pair; target-free, op-capped coefficients) — bounded deterministic
Gaussian elimination — and the emitted closed forms pass the same total back-substitution verification as
authored solutions. Multi-branch solutions (four-bar open/crossed) are each verified
independently against every relation. Invalid-severity envelopes may carry a `scope` naming the derived
variables they poison (scoped refusal — how Euler and Johnson share one page); unscoped invalids refuse
the whole evaluation as before. The build fails loudly, naming the THING/step/relation/branch, on:
dimension inhomogeneity, DOF mismatch, unverifiable derivation step, solution residual ≠ 0, branch-count
mismatch, unrenderable LaTeX, or a display unit missing from the site's conversion table
(`check-units.mjs`). Compilation is incremental: unchanged THINGs (fingerprint = thing.yaml + pipeline
source + SymPy version) are reused from cache, locally and in CI.

## Autonomous sessions

Work proceeds as autonomous working sessions — one session = one context window, one queue row =
one merged PR — governed by `docs/sessions/protocol.md`: read it FIRST in any working session, then
claim work from `docs/sessions/queue.md`. Rules that hold even if you read nothing else: **never
lower a gate to make it pass** (BLOCKED protocol — record and stop); **never merge a partial THING**
(PAUSED protocol); **never start a phase whose owner ruling line is absent from the queue**;
sessions merge their own PRs only after ALL gates are green (ADR-0007 — **merge is publish**);
**never round-trip repo files through PowerShell `Get-Content`/`Set-Content`** (PS 5.1 mojibakes
UTF-8 — use the editor tools); **a brief is a spec, not a source** — independently re-derive
emitted formulas and web-corroborate cited constants, never transcribe (protocol rule 6).

## Data provenance rules (full text: `docs/data-provenance.md`)

- Every material value: original published value + original unit (converted programmatically, with tests),
  source id + exact designation/table, and **basis** (`spec_minimum` | `design_minimum` | `typical`).
- Legal frame is **fact extraction** (Feist): individual values are uncopyrightable facts; we cite them.
  Never redistribute source PDFs, never reproduce a source's table layout/selection, never paste scans.
  MIL-HDBK-5J is publicly releasable but NOT public domain — do not claim otherwise.
- Forbidden in the pipeline: scraped MatWeb (EULA), anything MMPDS, CC BY-NC-SA content (e.g. MIT OCW
  tables). MatWeb/FE-Handbook may be *named* as cross-checks ("consistent with…") only.
- Seed files in `data/materials/` are append-only; corrections get dated errata entries, not silent edits.

## Toolchain discipline

Use the standard tool; do not hand-roll substitutes — and do not add dependencies without demonstrated need.

| Job | Tool |
|---|---|
| Symbolic math, derivation verification, JS emission | SymPy 1.14.0 (pinned) via `uv run`, `uv.lock` committed |
| Dimensions | `sympy.physics.units` (exports the 7-vector) |
| Material DB | SQLite — stdlib `sqlite3` (build), `node:sqlite` (site; Node 24.x pinned in CI) |
| Site / template enforcement | Astro 6 content collections + Zod |
| Static math rendering | KaTeX at build time (3 paths in `docs/architecture.md`); no client-side KaTeX |
| Islands | Preact + signals; native form controls for a11y |
| JSON munging / repo search | jq / ripgrep |
| End-to-end invariants | Playwright vs built dist (+ axe smoke) |

Generated artifacts (`site/src/generated/`, `data/build/`) are **never committed**; only authored text is.

## Out of scope (v1)

Nonlinear/cyclic solving (`solveND`, ADR-0008 part (b) — PROPOSED, unbuilt; certified linear
`solve_linear` groups are the shipped subset) · chaining UI beyond the shipped `/chain-builder/`
(S22 pick/wire/evaluate up to six nodes; S23 shareable `#v1=` chain URLs with graceful decode-on-load
degradation; S24 per-readout provenance trails + assumptions panel; S25 three curated example chains
with frozen `#v1=` URLs — cyclic/multi-branch chaining and a drag-and-drop canvas stay out) ·
Materials Project integration · fluids & time-integration dynamics engines ·
Pyodide sandbox · integer tooth-count synthesis · eccentric-column solve-for-P (transcendental) ·
coupler-curve inverse · custom domain · analytics (none, stated policy) · accounts/comments (static site).

## Where things live

`docs/architecture.md` — pipeline + the unified compiled-artifact schema (single source of truth).
`docs/authoring-things.md` — how to write a THING. `docs/data-provenance.md` — citation tiers + legal frame.
`docs/decisions/` — ADRs (read before re-litigating a choice; ADR-0007 = the verification model).
`docs/roadmap.md` — the phased plan toward the final product (owner rulings 2026-07-04: ADR-0008
ACCEPTED with split scope — solveLinear approved, solveND deferred; Phase 2 target ≈30 THINGs, met;
sessions run autonomously within a phase and stop at phase boundaries for owner direction.
Phase 3 approved JD 2026-07-06 and closed 2026-07-06 — solver depth: `solveLinear` + six
statically-indeterminate/coupled THINGs (catalog 30 → 36; report `reports/phase-3.md`).
Phase 4 approved JD 2026-07-06 and closed 2026-07-07 — chaining as the product + portal design
(ADR-0010): the `/chain-builder/` (pick/wire/evaluate, shareable `#v1=` URLs, per-readout provenance
trails, three curated example chains) + the course-spine portal (category taxonomy, Pagefind search,
THING-page wayfinding); report `reports/phase-4.md`. The Phase-3 QC audit found zero wrong emitted
numbers, findings in `docs/sessions/reports/phase-3-qc-audit.md`. Release ruling 2026-07-07: there
is NO Phase 5 — the release pair S26 (dc-motor, catalog → 37) + V1 (v1.0.0 docs/tag) closes initial
development; future work is owner-commissioned paths, not scheduled phases).
`docs/sessions/` — session protocol, queue, briefs, log, and the owner runbook; the queue is the
single source of truth for what to work on next. Build: `pnpm build` in `site/` runs the
Python pipeline first; `uv run pytest` in `pipeline/` for math-layer tests. A cold build takes ≈ 3–4
minutes — four-bar branch verification dominates; it is slow, not hung — but unchanged THINGs are
cache-reused, so warm rebuilds take seconds plus the astro step. The repo is public and the site deploys
from CI on every push to main — there is no review step between merge and the public site:
https://jd-jones-ases.github.io/Mechanic/ (catalog state: 37 THINGs — S26 added dc-motor and wired
it into the headline chain example; the live `/verification/` page is the public statement of what
is and isn't machine-proven).
