# S03 — rectangular-shaft-torsion

- **ID / Title:** S03 — rectangular-shaft-torsion (Saint-Venant torsion of a rectangular bar)
- **Phase:** 2
- **Type:** THING
- **Size:** M
- **Status:** FULL

## Goal

`/things/rectangular-shaft-torsion/` live: Saint-Venant torsion of a solid rectangular bar, the
THIRD consumer of the `table` plan-step capability (S01 built it, S02 proved real-arg multi-column)
and its first use outside machine-element charts — classical-elasticity coefficients c1(a/b),
c2(a/b) from Timoshenko's published table. The page teaches the counterintuitive facts: τ_max sits
at the midpoint of the LONG side and the corners carry ZERO stress, plus an efficiency comparison
against the round shaft of equal area ("why square shafts are a bad deal"). New `twist_rate`
quantity kind and `rad/m` / `deg/m` display units enter the registries. Catalog 19 → 20.

## Entry criteria

Any false → BLOCKED, do not start (protocol §1.6, §9.1).

- Main CI green: `gh run list --branch main --limit 1`
- No PAUSED / IN_PROGRESS rows: `rg -n '\|\s*(IN_PROGRESS|PAUSED)\s*\|' docs/sessions/queue.md` returns nothing
- S01 DONE (table capability + ADR-0009): `rg -n '^\| S01 .*DONE' docs/sessions/queue.md` AND
  `rg --files docs/decisions | rg -i 0009`
- S02 DONE (real-arg multi-column table proven in production): `rg -n '^\| S02 .*DONE' docs/sessions/queue.md`
  AND `test -d site/src/content/things/stepped-shaft-fillet`
- `twist_rate` kind not yet claimed: `rg -n "twist_rate" pipeline/src/mech_pipeline/kinds.py` returns nothing
- `rad/m` / `deg/m` units not yet claimed: `rg -n '"rad/m"|"deg/m"' site/src/engines/units.ts` returns nothing

## New capabilities required

The `table` plan-step is NOT new here — S01 built it, S02 hardened it, this session only consumes
it. If the shipped table capability cannot express a one-real-argument, two-column
(c1, c2 vs a/b) interpolate-linear table, STOP and BLOCK (protocol §9.2); do not extend it ad hoc.

IN SCOPE for this session (explicitly not BLOCK-worthy): registering the `twist_rate` quantity
kind in `pipeline/src/mech_pipeline/kinds.py` and the `rad/m`, `deg/m` display units in
`site/src/engines/units.ts` `DISPLAY_FACTORS`. These are THING-scoped registry additions per the
established pattern (kinds.py's header says "Add new kinds here"; check-units.mjs gates the unit
entries) — authority: owner-approved batch-2 design, 2026-07-04, recorded in queue row S03.
Anything beyond these two registry entries falls back to the default: **NONE — new
engine/pipeline/schema capability → STOP and BLOCK.**

## Physics scope

Convention (PIN THIS — sources disagree on symbols k, α, β): a = long side, b = short side,
a/b ≥ 1. State the convention in overview.mdx and in a thing.yaml comment.

- τ_max = T / (c1 · a · b²) — at the midpoint of the LONG side; corners carry zero stress.
- Twist rate θ' = T / (c2 · a · b³ · G) — new variable, kind `twist_rate`, dims [-1,0,0,0,0,0,0],
  SI unit rad/m, display units rad/m and deg/m.
- c1(a/b), c2(a/b): authored `table` plan-step, one real argument a/b, two columns,
  interpolate-linear, domain a/b = 1.0 … 10 as published. The a/b → ∞ thin-strip row
  (c1 = c2 = 1/3) is NOT an interpolation row — it is the tests' consistency oracle.
- Derived readouts: efficiency vs the round shaft of equal cross-sectional area
  (r = √(A/π), τ_round = 2T/(πr³)) — the ratio readouts that make the page's point.
- c1, c2, a/b all carry kind `ratio`.

Citations: Timoshenko & Goodier, *Theory of Elasticity*, 3rd ed., §109 (torsion of rectangular
bars — the coefficient table); membrane-analogy prose cites §107. Independent cross-check:
Roark's *Formulas for Stress and Strain*, 8th ed., Table 10.7 (same coefficients, independent
publication). Golden: a by-hand τ_max = T/(c1·a·b²) evaluation at a table row, with the
coefficient value double-pinned against BOTH sources (the classic square values are
c1 ≈ 0.208, c2 ≈ 0.1406 — but transcribe from the actual sources, never from memory; the two
sources must agree before either is authored).

## Envelopes

- Table domain: a/b outside [1, 10] → **invalid**, global. Physical reason: no published
  coefficient exists there; interpolation would fabricate one (credibility spine). Below 1 the
  refusal message should say "a is the long side — swap your labels", not just "out of domain".
- Positivity: T, a, b, L, G > 0 (positive flags / bounds per authoring norms).
- No strength warn is mandated by the design; if you mirror torsion-shaft's SF readout
  (recommended), reuse its envelope pattern rather than inventing a new one.

## Materials axis

G binds through θ' (the stiffness axis — the visible material moment: swap steel for aluminum
and the same bar twists ~2.6× more per metre at identical τ_max, which is material-blind).
σ_y binds if you carry the SF readout (imitate torsion-shaft's bindings). ρ optional for a mass
readout. All from `data/materials/` — no new property columns.

## Sim sketch

Rectangle cross-section with boundary shear-stress shading: hot at the long-side midpoints, dead
at the corners (this IS the page — get it visibly right; remember the four-bar invisible-SVG
lesson, protocol §5). Ghost outline of the equal-area round shaft with its τ for comparison.
Optional twist animation via `useSimClock`. `StressBands` for the stress readouts; `SimRefusal`
consumed for the table-domain refusal. Component `RectTorsionSim.tsx` in
`site/src/components/sims/`, draw key registered in the SIMS map in
`site/src/components/ThingWidget.tsx`; new SVG classes go in `site/src/styles/global.css`.

## Deliverables

- `site/src/content/things/rectangular-shaft-torsion/{thing.yaml, overview.mdx, failure.mdx}`
  (failure note names rectangular-wire springs — cross-link helical-spring)
- `pipeline/src/mech_pipeline/kinds.py`: `twist_rate` entry with comment "must not chain into
  curvature or wavenumber later" (same dims — the kind exists to forbid exactly that)
- `site/src/engines/units.ts`: `rad/m` (factor 1), `deg/m` (factor π/180)
- `RectTorsionSim.tsx` + SIMS registration + global.css classes
- `pipeline/tests/test_rect_torsion_physics.py` — independent cross-check + golden (see Exit)
- e2e pins in `site/e2e/things.spec.ts`: presence + table-domain refusal at minimum
- Bookkeeping per protocol §7 (queue row, log entry, CLAUDE.md + README catalog counts, roadmap)

## Exit criteria

- Catalog count = 20 on `/things/`, in CLAUDE.md's catalog-state line, and README.
- `uv run pytest -q` (from `pipeline/`) green, count strictly above pre-session count;
  `test_rect_torsion_physics.py` collected.
- Machine-proven fact: thin-strip limit c1 = c2 = 1/3 — the a/b = 10 row sits within a stated
  tolerance of 1/3 and the columns trend monotonically toward it; plus the Roark Table 10.7
  cross-check agreeing with the authored Timoshenko values.
- `rg -n "twist_rate" pipeline/src/mech_pipeline/kinds.py` and
  `rg -n '"rad/m"|"deg/m"' site/src/engines/units.ts` now match; `pnpm build` (incl. check-units)
  clean.
- Visual pass per §5: sim renders, long-side-midpoint hot spot visible, table-domain refusal SEEN,
  material swap moves θ' but not τ_max. Screenshots to scratchpad.
- Log entry appended; queue row S03 → DONE with PR#; deploy verified live.

## Out of scope

- Other non-circular sections (ellipse, triangle) — future THINGs.
- An interactive membrane-analogy sim — prose only, cited to Timoshenko §107.
- Machine-deriving the Saint-Venant warping solution — the coefficients enter by citation
  (modeling step = the declared audit surface, invariant 5); do not pretend SymPy derived them.
- Extending the table past a/b = 10 via the closed-form limit — the domain refusal is the design.

## Notes

- Read the S01 and S02 log entries' `Notes-for-next` FIRST — table-authoring quirks discovered
  there are your contract (protocol §1.4).
- The symbol-convention trap is the named risk: Timoshenko and Roark arrange the same physics
  under different symbols. Pin the c1/c2 convention above once, restate nowhere else.
- Siblings to imitate: `stepped-shaft-fillet` (table authoring shape), `torsion-shaft` (round
  baseline, page structure, SF/material bindings), `thin-tube-torsion` (cross-link: closed vs
  open section contrast).
- `twist_rate` is intentionally narrow: same dims as curvature and wavenumber, which is exactly
  why it must be its own kind (invariant 2 — the torque/bending_moment precedent).
