# S04 — beam-shear-flow

- **ID / Title:** S04 — beam-shear-flow (transverse shear in beams: τ = VQ/Ib, shear flow, fastener spacing)
- **Phase:** 2
- **Type:** THING
- **Size:** M
- **Status:** FULL

## Goal

`/things/beam-shear-flow/` live: transverse shear in beams (τ = VQ/Ib), the parabolic profile
with τ_max = 3V/2A at the neutral axis as the sim's centerpiece, and shear flow q = VQ/I for a
built-up section with the fastener-spacing readout F_fastener = q·s. Ships the NEW `shear_flow`
kind — the THIRD kind on the N/m dimension vector (joining `line_load` and `stiffness`), making
this THING the invariant-2 poster child and the `/verification/` page's worked example of why
kinds exist. Also completes the decided task: evaluate migrating thin-tube-torsion's Bredt q to
the new kind. Catalog 20 → 21.

## Entry criteria

Any false → BLOCKED, do not start (protocol §1.6, §9.1).

- Main CI green: `gh run list --branch main --limit 1`
- No PAUSED / IN_PROGRESS rows: `rg -n '\|\s*(IN_PROGRESS|PAUSED)\s*\|' docs/sessions/queue.md` returns nothing
- S03 DONE (strict queue order): `rg -n '^\| S03 .*DONE' docs/sessions/queue.md`
- `shear_flow` kind not yet claimed: `rg -n "shear_flow" pipeline/src/mech_pipeline/kinds.py` returns nothing
- `line_load` kind exists to reuse: `rg -n "line_load" pipeline/src/mech_pipeline/kinds.py`
- N/m and N/mm display units exist (no unit additions needed):
  `rg -n '"N/m"|"N/mm"' site/src/engines/units.ts`
- Source id `gere` already in the repo (citation pattern to reuse):
  `rg -l "gere" site/src/content/things/*/thing.yaml`

## New capabilities required

IN SCOPE for this session (explicitly not BLOCK-worthy): registering the `shear_flow` kind in
`pipeline/src/mech_pipeline/kinds.py` — a THING-scoped registry addition per the established
pattern (kinds.py's header says "Add new kinds here"); authority: owner-approved batch-2 design,
2026-07-04, queue row S04. NO new display units (N/m, N/mm exist). Anything beyond that one
registry entry: **NONE — a new engine/pipeline/schema capability means STOP and BLOCK (protocol
§9.2); do not improvise one.** The migration task below is where this is most likely to bite.

## Physics scope

- General: τ = V·Q/(I·b), Q = first moment of the partial area about the neutral axis.
- Rectangular section: τ(y) parabolic, τ_max = 3V/(2A) at the neutral axis, zero at the free
  surfaces — the sim centerpiece.
- Built-up section: shear flow q = V·Q_flange/I at the flange–web interface (kind `shear_flow`),
  fastener spacing s as a knob, F_fastener = q·s — the genuinely useful design readout
  (nail/bolt spacing). Watch the classic bookkeeping trap: q per interface vs per fastener row
  (paired nails halve the per-fastener force) — pick one, state it in overview.mdx.
- V reuses kind `force` (explicit chain-port compatibility with the beam pages' shear).

Citations: Gere & Goodno, *Mechanics of Materials*, 9th ed., §5.8–5.11 (shear stresses in beams,
shear flow, built-up beams) — reuse the existing `gere` source id and citation pattern.
Cross-check: Timoshenko, *Strength of Materials*. Golden: a worked built-up-beam fastener-spacing
example from Gere & Goodno §5.11 — pin the book's actual numbers in a comment, never from memory.

Independent physics test (this is a real derivation, not a table pin): re-derive τ(y) by
integrating the bending-stress gradient equilibrium — σ = My/I, dM/dx = V, axial balance of the
slice below y gives τ·b = ∫(dσ/dx)dA = VQ/I. Then two consistency theorems: τ_max = 3V/(2A)
falls out for the rectangle, and ∫τ dA over the section recovers exactly V.

### Decided task: thin-tube-torsion Bredt-q migration

Same word, different physics: Bredt's torsional shear flow vs transverse shear flow — the kind
system now distinguishes them honestly. Evaluate the retrofit; it is part of this session. Repo
reality first: Bredt's q is a derivation LOCAL, not a top-level variable
(`site/src/content/things/thin-tube-torsion/thing.yaml`, `derivation.locals`, `unit: N/m`,
~line 215), and the locals schema in `site/src/content.config.ts` has no `quantity_kind` field.

- IF the migration is a dimensionally clean, one-line thing.yaml change (a kind slot exists where
  q lives, or q is legitimately surfaced where kinds attach): **pre-authorized — do it.** The
  fingerprint change recompiles exactly that one cached THING; run the FULL e2e sweep
  (`pnpm exec playwright test`) as the regression net.
- IF it needs a schema change (e.g., adding `quantity_kind` to derivation locals): that is
  capability creep — do NOT improvise (protocol §9.2). Record "evaluated; stays as-is; reason" in
  the log entry and PR body.

Either outcome completes the task; silence is the only failure mode.

## Envelopes

- Slender-beam **warn** at L/h below ~10: the shear deflection the beam pages neglect becomes
  visible — an honest cross-page caveat; name simply-supported-beam / cantilever-beam in it.
- τ_max vs σ_y/2 **warn** (shear yield, Tresca).
- Positivity on V, section dimensions, s.

## Materials axis

σ_y binds (the τ_max vs σ_y/2 warn and any SF readout). Nothing else: the elastic shear-stress
distribution in a homogeneous prismatic beam is statics + geometry — E and ρ genuinely do not
enter. A strength-only material axis, stated as such on the page, is the honest move; do not pad it.

## Sim sketch

Rectangular cross-section with the parabolic τ(y) profile drawn beside it — max at the neutral
axis, zero at top/bottom — responding visibly to V and section knobs. Second panel or inset:
built-up section elevation with fastener dots at spacing s and the F_fastener readout.
`StressBands` for τ vs the warn threshold; `SimRefusal` consumed for invalid states. Component
`ShearFlowSim.tsx` in `site/src/components/sims/`, draw key registered in the SIMS map in
`site/src/components/ThingWidget.tsx`; new SVG classes in `site/src/styles/global.css`.
Imitate `SSBeamSim.tsx` / `BeamSim.tsx` for scale and structure.

## Deliverables

- `site/src/content/things/beam-shear-flow/{thing.yaml, overview.mdx, failure.mdx}`
- `pipeline/src/mech_pipeline/kinds.py`: `shear_flow` entry with a comment naming the three-way
  N/m split (line_load / stiffness / shear_flow)
- The invariant-2 story placed where readers see it: overview.mdx prose, plus one short addition
  to the authored prose of `site/src/pages/verification.astro` naming the three-N/m-kinds
  example (touch only hand-authored prose there; check what is generated before editing)
- `ShearFlowSim.tsx` + SIMS registration + global.css classes
- `pipeline/tests/test_shear_flow_physics.py` — the dσ/dx re-derivation + ∫τdA = V + golden
- e2e pins in `site/e2e/things.spec.ts`: presence + refusal at minimum
- thin-tube-torsion migration edit (if taken) — one line + full sweep
- Bookkeeping per protocol §7 (queue row, log entry, CLAUDE.md + README counts, roadmap)

## Exit criteria

- Catalog count = 21 on `/things/`, in CLAUDE.md's catalog-state line, and README.
- `uv run pytest -q` green, count strictly above pre-session; `test_shear_flow_physics.py` collected.
- Machine-proven facts: τ_max = 3V/(2A) recovered from the independent dσ/dx equilibrium
  integration, AND the integrated τ profile returns exactly V.
- `rg -n "shear_flow" pipeline/src/mech_pipeline/kinds.py` matches; `pnpm build` clean.
- Migration decision recorded in log + PR body — done, or evaluated-and-kept with reason.
- Full e2e sweep green (`pnpm exec playwright test`), mandatory if the migration touched
  thin-tube-torsion.
- Visual pass per §5: parabola visibly moves with knobs, refusal SEEN, /verification/ addition
  renders. Screenshots to scratchpad.
- Log entry appended; queue row S04 → DONE with PR#; deploy verified live.

## Out of scope

- Shear center / unsymmetric thin-walled open sections — future THING territory.
- Computing shear deflection (only the warn that names it).
- Retrofitting kinds to any THING other than thin-tube-torsion.
- Schema changes of any kind (see the migration task's BLOCK branch).

## Notes

- This THING exists partly as documentation: three kinds now share one dimension vector, and a
  beam's line load must never chain into a spring rate or a shear flow. Write the overview so
  that sentence lands.
- Q depends on the cut height — author the EVALUATED closed forms in thing.yaml (rectangle, and
  the built-up flange interface), not symbolic integrals; the pipeline verifies residuals, it
  does not do calculus on your behalf.
- Siblings to imitate: `simply-supported-beam` (gere citations, beam knobs, line_load reuse),
  `thin-tube-torsion` (the other shear flow — cross-link both ways; the open-vs-closed torsion
  contrast is one of the site's best stories).
- Read the S03 log entry's `Notes-for-next` before starting (protocol §1.4).
