# S17 — Multi-material binding slots + composite-bar

> DRAFT: verified by the Phase 2 closing session against merged reality before execution.

- **ID / Title:** S17 — multi-material binding slots + composite-bar (consumer)
- **Phase:** 3
- **Type:** engine+THING
- **Size:** L — solo; never claimed via the continuation rule. Growth beyond L is a PAUSED trigger (§9.4).
- **Status:** DRAFT (see header note)

## Goal

Material binding supports named slots so one THING binds two independent materials, each with its
own labeled native `<select>` — and every previously shipped THING is byte-for-byte unchanged and
renders identically. composite-bar (core + sleeve between rigid end plates under axial P) is live
as the consumer: swap the sleeve steel → aluminum and WATCH the load share migrate to the stiffer
member — invariant 3's legibility moment. Catalog +1.

## Entry criteria

Any false → BLOCKED, do not start (§1.6, §9.1).

- Main CI green: `gh run list --branch main --limit 1` → latest run success.
- No PAUSED/IN_PROGRESS rows: `rg "PAUSED|IN_PROGRESS" docs/sessions/queue.md` → zero matches.
  (A PAUSED S16 preempts you per §1.2b even though S16 is not a dependency.)
- Dependency S15 DONE: `rg '\| S15' docs/sessions/queue.md` → status column reads DONE.
  S16 DONE is NOT required — S16 and S17 each depend only on S15 and may run in either order.
- solve_linear capability exists (the 2×2 group needs it): `rg "certify_linear_group"
  pipeline/src/mech_pipeline/verify.py` and `rg "solve_linear" site/src/content.config.ts`.
- The flat binds schema being extended exists: `rg "binds: z.record" site/src/content.config.ts`;
  components to touch exist: `test -f site/src/components/MaterialPicker.tsx` and
  `test -f site/src/components/ThingWidget.tsx`.
- Materials seeded: `rg -l "youngs_modulus" data/materials/` → includes steel-a36.yaml, al-6061-t6.yaml.

## New capabilities required

ONE capability. Authority: owner ruling 2026-07-04 (Phase 3 plan, P3-3); invariant 3 (CLAUDE.md);
ADR-0006 (native form controls) for the per-slot select. Design DECIDED — implement, do not redesign:

- **Authored schema:** `materials.binds` accepts EITHER the existing flat map `{symbol: property_key}`
  OR named slots `{slot_name: {symbol: property_key}}`. A flat map normalizes at parse time to a
  single `default` slot — normalize EARLY, in exactly ONE place, so everything downstream sees one
  shape. **ZERO churn in shipped thing.yaml files** (17 at plan time; the whole catalog at execution).
- **Compiled artifact:** `material_binding` becomes slot-keyed, `default` the single slot for
  legacy THINGs (generated artifacts regenerate atomically, never committed); `schema_version` stays 1.
- **UI:** ThingWidget renders one MaterialPicker per slot; each a labeled NATIVE `<select>`
  (ADR-0006 — no custom dropdown). Slot display label = title-cased slot key + " material"
  (`core` → "Core material") — DECIDED; do not add a label field to the schema. The `default` slot
  keeps today's label and DOM shape so legacy e2e/a11y pins hold.
- **Filtering:** per-slot property requirements filter that slot's dropdown — mirror today's
  single-binding filtering in the thing pages.
- **Isolation:** each slot's selection fans out only its own bound symbols (invariant 3's cascade
  per slot); e2e pins this.

Anything beyond this — STOP and BLOCK (§9.2); do not improvise.

## Physics scope

composite-bar: core (area A_1) inside a concentric sleeve (area A_2), equal length L, between
rigid end plates, centric axial load P; equal elongation.

- solve_linear group (2×2) {P_1, P_2}: equilibrium `P_1 + P_2 − P = 0`; compatibility
  `P_1·L/(A_1·E_1) − P_2·L/(A_2·E_2) = 0`. Build must prove **P_i = P·A_i·E_i/(A_1·E_1 + A_2·E_2)**.
- Downstream: σ_i = P_i/A_i, load fractions f_i = P_i/P, δ = P·L/(A_1E_1 + A_2E_2), SF per member
  σ_y_i/σ_i; optional mass m = (ρ_1·A_1 + ρ_2·A_2)·L if trivial — drop without guilt if it drags.
  Equal-strain corollary σ_1/σ_2 = E_1/E_2 in overview.mdx as a machine-checked derivation step
  where possible; it is the punchline.
- Cross-check (`test_composite_physics.py`): springs-in-parallel first principles — k_i = A_i·E_i/L,
  share = k_i/Σk_j — derived independently, NOT from thing.yaml residuals; assert against emitted solutions.
- Golden: hand-derived numeric case, steel core + aluminum sleeve. READ the seeded values from
  `data/materials/steel-a36.yaml` and `al-6061-t6.yaml` — never remembered handbook numbers.
  Round A_1/A_2/P; hand derivation in the test comment (chain-demo.spec.ts precedent).
- Citations: Gere & Goodno, *Mechanics of Materials* (indeterminate axially loaded members, ch. 2
  recent eds); Hibbeler ch. 4 cross-check. Web-pin the stiffness-share result in
  `sources[].verification`; a chapter-level pin is honest.

## Envelopes

- warn σ_1 > σ_y_1 (core yields) and warn σ_2 > σ_y_2 (sleeve yields) — separate warns, each
  naming WHICH member yielded; past first yield the linear share formula is void. Global warn; no
  invalids. Assumptions in prose: rigid end plates, no slip, equal free lengths, centric load.
- det(A) is structurally nonzero for positive A, E, L — do not manufacture a singular state; the
  e2e refusal pin = a yield warn banner.
- failure.mdx: which member yields first depends on load share AND each material's own σ_y (a
  stiff-but-weak member can yield first) — the how-it-fails story.

## Materials axis

TWO slots — the point of the session:
- `core: {E_1: youngs_modulus, sigma_y_1: yield_strength, rho_1: density}`
- `sleeve: {E_2: youngs_modulus, sigma_y_2: yield_strength, rho_2: density}`
(ρ binds only if the mass readout ships.) Symbols stay globally unique with `role: material`;
defaults steel core + aluminum sleeve so the landing state shows unequal shares. No new property
columns (CTE is S18's, not yours).

## Sim sketch

`statics-cascade` (existing engine). Draw: cross-section (concentric annulus) + side elevation with
end plates and P arrows; make something visibly proportional to load share (per-member bar
width/opacity) so a material swap MOVES pixels — the visual moment. Imitate compound-cylinder's
two-region draw; key `composite-bar`; new SVG classes in `global.css`; draw consumes evaluated outputs only.

## Deliverables

- `site/src/content.config.ts` (authored binds union + normalization + compiled slot shape);
  `pipeline/src/mech_pipeline/compile.py` (slot-aware material_binding emission)
- `site/src/components/MaterialPicker.tsx`, `ThingWidget.tsx` (+ thing-page materials filtering)
- `site/src/content/things/composite-bar/{thing.yaml, overview.mdx, failure.mdx}`; draw component + CSS
- `pipeline/tests/test_composite_physics.py`; flat-map normalization covered in pipeline tests
  (extend `test_compile_e2e.py` if no better home)
- e2e: presence + warn pin + slot-isolation pin; the full existing sweep is the named regression net
- Bookkeeping per §7 (queue row, log entry, CLAUDE.md/README counts, roadmap)

## Exit criteria

- **Zero legacy churn:** `git diff --name-only main -- site/src/content/things/` → only `composite-bar/` files.
- **Legacy-THINGs-unchanged sweep (the named regression net):** full e2e (things/prose/a11y/nav)
  green across the ENTIRE catalog — every previously shipped page (17 at plan time; all shipped at
  execution) renders with a working material picker.
- Slot-isolation e2e pin: changing the sleeve material moves σ_2 and the load fractions; the
  core's bound symbols are untouched except through load share.
- `uv run pytest -q` green; count ≥ previous + 2; golden matches P_i = P·A_iE_i/Σ(A_jE_j);
  independent cross-check present.
- Machine-proven fact: P_i·(A_1E_1 + A_2E_2) − P·A_i·E_i ≡ 0 by total back-substitution into both
  group relations; det `nonzero` guard present in the compiled artifact.
- axe green with two labeled selects on composite-bar. Visual pass per §5: swap sleeve
  steel → aluminum in a real browser, SEE the share migrate; screenshots before/after; described
  in PR body and log.
- Catalog +1 on `/things/` and CLAUDE.md/README; `/verification/` audit block present; log entry
  appended; queue row DONE with PR#.

## Out of scope

- chain-demo / chain-builder multi-slot node support — DEFERRED to Phase 4 evaluation (owner
  pre-answer 2026-07-04); if multi-slot THINGs prove awkward to chain, EXCLUDE them from chaining
  surfaces rather than building support. Touch ChainDemo.tsx only to keep it compiling and green.
- Consumers with >2 slots; per-slot material-class restrictions; new Ashby-page features (the page
  must still build — a break is a real regression to fix, but no feature work).
- CTE / thermal-assembly (S18); any new property column.
- Any capability beyond the slots design above (→ §9.2 BLOCK).

## Notes

- **THE risk:** MaterialPicker/ThingWidget serve every page — a regression breaks the whole catalog
  at once, and merge is publish. The flat-map→`default`-slot normalization (ONE place) plus the full
  e2e sweep are the net. Before touching MaterialPicker's props, check importers: `rg "MaterialPicker" site/src`.
- The label decision is made (title-cased slot key + " material"; default keeps today's label) —
  do not grow the schema for labels. Slot keys: `core`, `sleeve`. No new kinds or display units
  needed (Pa/GPa/MPa, kg/m^3 already in the conversion table). S18 (thermal-assembly) consumes
  your slots next — leave a Notes-for-next line about the final authored slot syntax and any sharp
  edge in the picker wiring.
- Siblings to imitate: compound-cylinder (two-region prose/draw), propped-cantilever (solve_linear
  group authoring — or the test_solve_linear.py fixture if S15 deferred it), cantilever-beam (binds trio).
- PowerShell round-trip trap (§10.1); cold build 3–4 min, slow not hung (§10.2). PR title per §6:
  `Phase 3 (item 3): multi-material slots + composite bar (THING <N>)`.
