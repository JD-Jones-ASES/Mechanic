# S06 — circular-plate

- **ID / Title:** S06 — circular-plate (axisymmetric bending under uniform pressure; clamped and simply-supported in parallel)
- **Phase:** 2
- **Type:** THING
- **Size:** M
- **Status:** FULL

## Goal

`/things/circular-plate/` live: axisymmetric bending of a circular plate under uniform pressure
q, BOTH classical edge cases on one page as PARALLEL readout sets — clamped and simply-supported
— each with its own relations and derivation steps (the Euler/Johnson one-page pattern, but no
branches and no scoped refusal: the variables are distinct and both models are always valid).
This is the first THING where Poisson's ratio changes a STRESS — the material-axis moment the
page is built around ("swap steel for gray iron and the SS-plate stress moves; the clamped-edge
stress doesn't move for ANY material"). Ships the NEW `flexural_rigidity` kind — the FOURTH kind
on the [2,1,-2,0,0,0,0] dimension vector (torque, bending_moment, energy, flexural_rigidity), a
deliberate stress test of the kind registry. Catalog 22 → 23.

## Entry criteria

Any false → BLOCKED, do not start (protocol §1.6, §9.1).

- Main CI green: `gh run list --branch main --limit 1`
- No PAUSED / IN_PROGRESS rows: `rg -n "PAUSED|IN_PROGRESS" docs/sessions/queue.md` returns nothing
- S05 DONE (strict queue order): `rg -n '^\| S05 .*DONE' docs/sessions/queue.md`
- `flexural_rigidity` kind not yet claimed: `rg -n "flexural_rigidity" pipeline/src/mech_pipeline/kinds.py` returns nothing
- `N*m` display unit exists: `rg -n '"N\*m"' site/src/engines/units.ts`
- ν-symbolic verification precedent exists (compound-cylinder's ν-cancellation proof):
  `test -f pipeline/tests/test_shrinkfit_physics.py`
- Materials with distinct ν seeded for the visual-pass moment:
  `rg -n "poisson_ratio" data/materials/steel-a36.yaml data/materials/iron-gray-class30.yaml`

## New capabilities required

IN SCOPE for this session (explicitly not BLOCK-worthy): registering the `flexural_rigidity`
quantity kind in `pipeline/src/mech_pipeline/kinds.py` — a THING-scoped registry addition per the
established pattern (kinds.py's header says "Add new kinds here"). Authority: owner-approved
batch-2 design, 2026-07-04, recorded in queue row S06. This one is a deliberate registry stress
test — four kinds now share one dimension vector; the kind comment should say so. No new display
units required (`N*m` exists); IF a readout genuinely demands `kN*m`, add it to `DISPLAY_FACTORS`
in `site/src/engines/units.ts` in the same change (check-units.mjs fails the build on a missing
entry — that is the point). Anything beyond: **NONE — new engine/pipeline/schema capability →
STOP and BLOCK (protocol §9.2); do not improvise one.**

## Physics scope

Plate radius a, thickness t, uniform pressure q, flexural rigidity as its own variable:

- D = E·t³ / (12·(1 − ν²)) — kind `flexural_rigidity`, SI unit N·m.
- Clamped set: δ_max_c = q·a⁴/(64·D); σ_max_c = 3·q·a²/(4·t²) — at the EDGE (radial bending at
  the clamp). Note what is absent: no E, no ν — the clamped-edge stress is material-blind.
- Simply-supported set: δ_max_ss = (5+ν)/(1+ν) · q·a⁴/(64·D); σ_max_ss = 3·(3+ν)·q·a²/(8·t²) —
  at the CENTER. ν sits in the stress itself.
- Parallel-page structure: distinct variable names per set (δ_c, σ_c, δ_ss, σ_ss), each set with
  its own relations. Schema reality: `content.config.ts` allows exactly ONE `derivation` block
  per THING — author both edge-case derivations as clearly separated step runs within it, as
  euler-column carries Euler and Johnson (minus the scoped-refusal envelopes, not needed here).
  DOF still build-checks: one knob set in, four derived readouts out.
- Where ν enters, physically (write this into the derivation prose): the SS boundary condition is
  zero radial MOMENT, M_r = −D·(w'' + ν·w'/r) = 0 at r = a — ν rides in through the moment, not
  the deflection shape. That is why clamped (kinematic BCs only) is ν-free in stress.

Citations: Timoshenko & Woinowsky-Krieger, *Theory of Plates and Shells*, 2nd ed., ch. 3
(§15–16, symmetrical bending of circular plates) — the repo already treats Timoshenko worked
material as goldens (compound-cylinder precedent). Independent numeric cross-check: Roark's
*Formulas for Stress and Strain*, 8th ed., Table 11.2, cases 10a/10b. Golden: a Timoshenko
worked example, numbers pinned in a comment — never from memory.

Independent physics test: re-derive all four closed forms from the axisymmetric plate ODE —
integrate/dsolve D·∇⁴w = q, regularity at r = 0 kills the ln terms, then apply each BC set
(clamped: w(a) = 0, w'(a) = 0; SS: w(a) = 0, M_r(a) = 0). Verify (5+ν)/(1+ν) with ν SYMBOLIC
(the ν-cancellation-proof precedent from compound-cylinder); a numeric spot value is not a proof.

## Envelopes

- Thin-plate **warn** at t/a > ~0.1: transverse shear deformation (Kirchhoff assumption) becomes
  visible; the model under-predicts deflection there.
- Small-deflection **warn** at δ_max > t/2 (evaluate against the larger, SS, deflection):
  membrane stiffening — spell out the direction honestly: the real plate deflects LESS and
  carries MORE than this linear model says, so the model now UNDER-predicts strength. Wrong-but-
  conservative is still wrong; the banner says which way.
- q > 0 (positivity; this page models pressure on one face).
- Both warns are global (they are assumptions of the shared plate model, not of one edge case).

## Materials axis

E and ν bind through D (both deflections); ν additionally sits directly in σ_max_ss; σ_y binds
for margins. The page's teaching moment, made explicit in overview.mdx: three readouts move when
you change material, one (σ_max_c) never does. Use steel-a36 (ν = 0.30) vs iron-gray-class30 for
the demonstration — both already seeded in `data/materials/`; no new property columns.

## Sim sketch

Two plate cross-section profiles side by side, deflected shape w(r) at exaggerated scale:
clamped enters the rim at zero slope, SS rotates at the rim — the boundary condition must be
VISIBLE in the drawn curve. Hot-spot markers where each σ_max lives (clamped: edge; SS: center).
Knobs q, a, t, material; both profiles move together. `StressBands` for the two stresses vs σ_y;
`SimRefusal` consumed for invalid states; warns render as banners per the standard pattern.
Component `CircularPlateSim.tsx` in `site/src/components/sims/`, draw key registered in the SIMS
map in `site/src/components/ThingWidget.tsx`; new SVG classes in `site/src/styles/global.css`.

## Deliverables

- `site/src/content/things/circular-plate/{thing.yaml, overview.mdx, failure.mdx}`
  (failure note: the flat head on a pressure vessel — cross-link pressure-vessel; this page IS
  the calculation that vessel pages warn about)
- `pipeline/src/mech_pipeline/kinds.py`: `flexural_rigidity` entry, comment naming the four-way
  [2,1,-2,…] split
- `site/src/engines/units.ts`: `kN*m` ONLY if a readout demands it (same-change rule)
- `CircularPlateSim.tsx` + SIMS registration + global.css classes
- `pipeline/tests/test_plate_physics.py` — ODE re-derivation of all four forms, ν-symbolic factor
  proof, Roark 11.2 cases 10a/10b cross-check, Timoshenko golden
- e2e pins in `site/e2e/things.spec.ts`: presence + refusal at minimum
- Bookkeeping per protocol §7 (queue row, log entry, CLAUDE.md + README counts, roadmap)

## Exit criteria

- Catalog count = 23 on `/things/`, in CLAUDE.md's catalog-state line, and README.
- `uv run pytest -q` green, count strictly above pre-session; `test_plate_physics.py` collected.
- Machine-proven facts: (5+ν)/(1+ν) verified with ν symbolic; all four closed forms recovered
  from the independent ODE derivation; Roark cases 10a/10b agree numerically.
- `rg -n "flexural_rigidity" pipeline/src/mech_pipeline/kinds.py` matches; `pnpm build`
  (incl. check-units) clean.
- Visual pass per §5 MUST include the material moment: swap steel-a36 → iron-gray-class30 and SEE
  σ_max_ss move while σ_max_c holds still; both warns driven and SEEN; refusal SEEN. Screenshots
  to scratchpad; describe what was checked, not "looks good".
- Log entry appended; queue row S06 → DONE with PR#; deploy verified live.

## Out of scope

- Annular plates, central point loads, edge moments (Roark has dozens of cases; two ship).
- Large-deflection / membrane theory (the warn names it; building it is out).
- Orthotropic or composite plates.
- Adding `kN*m` speculatively — only if a readout uses it.

## Notes

- The named risk is parallel-model page discipline: two readout sets, one knob set, one
  derivation block with clearly separated step runs. Imitate `euler-column` for structure and
  `compound-cylinder` for the Timoshenko-golden and ν-symbolic test patterns. Do not reach for
  branches — branches are multiple SOLUTIONS to the same variables (fourbar-linkage); these are
  distinct variables of two always-valid models.
- SymPy assumption flags again: declare a, t, r positive, ν symbolic with 0 < ν < 1/2 where
  needed, or the BC solve and the factor simplification will stall unverified.
- The σ convention trap: σ_max = 6·M_max/t² (bending stress at the surface of a unit-width
  strip) is where the 3/4 and 3(3+ν)/8 coefficients come from — derive them, don't pattern-match
  coefficients across editions (older Timoshenko printings vary notation for q vs p and w sign).
- Read the S05 log entry's `Notes-for-next` before starting (protocol §1.4).
