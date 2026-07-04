# S02 — stepped-shaft-fillet (Kt fits; real-arg multi-column table)

- **ID / Title:** S02 — stepped-shaft-fillet — stress concentration at a shoulder fillet
- **Phase:** 2
- **Type:** THING
- **Size:** M
- **Status:** FULL

## Goal

Catalog 18 → 19. Second consumer of the S01 `table` capability, deliberately exercising the OTHER
lookup shape: a REAL-valued argument (D/d) with TWO output columns (A, b) from one lookup —
Norton's fitted Kt coefficients, `K_t = A·(r/d)^b`, for a shoulder fillet in a stepped circular
shaft, in three configurations (bending / torsion / axial). This session hardens the capability
while it is fresh: any table-machinery bugs the real-arg multi-column mode surfaces are FIXED HERE,
with regression tests, in this PR (in scope by design — note each in the log's Deviations line).

## Entry criteria

Any false → BLOCKED, do not start (protocol §1.6).

- Main CI green: `gh run list --branch main --limit 1`
- No PAUSED/IN_PROGRESS rows: `rg '\|\s*(IN_PROGRESS|PAUSED)\s*\|' docs/sessions/queue.md` → no
  output (table-cell-anchored — a naive word grep false-positives on the status legend)
- Dependency S01 DONE: `rg 'S01.*DONE' docs/sessions/queue.md` → one row
- Table capability exists in the runtime: `rg '"table"' site/src/engines/types.ts` → matches
- Table verifier exists: `rg 'verify_table_configuration' pipeline/src/mech_pipeline/verify.py`
- Table machinery tests green: `uv run --directory pipeline pytest -q -k table`
- Kinds needed all exist (no new kinds; ALL must match): `for p in '"pressure_stress"' '"ratio"' '"force"'
  '"torque"'; do rg -q "$p" pipeline/src/mech_pipeline/kinds.py || echo "MISSING $p"; done` (Bash) → prints nothing
- Display units all exist (no new units; ALL must match): `for p in '\bMPa:' '\bmm:' '"N\*m"' '\bkN:'; do
  rg -q "$p" site/src/engines/units.ts || echo "MISSING $p"; done` (Bash) → prints nothing

## New capabilities required

**NONE — if this work turns out to need a new engine/pipeline/schema capability, STOP and BLOCK
(protocol §9.2); do not improvise one.** Bugfixes to the S01 table machinery are NOT new
capability — multi-column and real-arg modes were designed in from the start (owner-approved plan
2026-07-04); making them actually work under a second consumer is this session's job. A fix that
changes the compiled-artifact shape or the authoring schema, however, IS capability-scale → BLOCK.

## Physics scope

Nominal stress closed forms (each its own configuration):
- Bending: `σ_nom = 32M/(πd³)`
- Torsion: `τ_nom = 16T/(πd³)`
- Axial: `σ_nom = 4F/(πd²)`

Then `σ_max = K_t·σ_nom` with `K_t = A·(r/d)^b`, where (A, b) come from the table step:
arg = D/d (real-valued), columns = [A, b], mode interpolate-linear between published D/d rows,
one table per configuration (bending / torsion / axial each has its own (A,b) rows).
`SF = σ_y/σ_max`. Note K_t is applied to the static stress here — this page is geometry pedagogy,
not a fatigue calculation; failure.mdx says so (see cross-links).

Citations: Norton, *Machine Design*, 5th or 6th ed. (pin whichever is actually consulted),
Appendix C — fitted Kt equations and coefficient tables, credited to Peterson's data. Shigley
Fig. A-15-8/9 may be NAMED as the chart the fits digitize — named only, never digitized by us
(data-provenance rules). Independent cross-check: Roark's Formulas for Stress and Strain, 8th ed.,
Table 17.1 closed-form Kt expressions, in `pipeline/tests/test_stepped_shaft_physics.py` — two
independently published fits agreeing within a stated band is genuinely independent verification,
stronger than most THINGs get. **Tolerance band decision:** pick the band from the sources' OWN
stated accuracy (Norton and Roark each state fit accuracy vs Peterson's charts; they differ from
each other by a few percent). State the chosen band and its citation honestly in the test comment
and PR body — do not tune the band to make the test pass; if the fits disagree beyond both stated
accuracies, that is a BLOCKED finding, not a wider band.

Golden: prefer a worked example from the pinned Norton edition's stress-concentration/shaft
chapters if one exercises the Appendix C fits; otherwise the honest fallback is a by-hand golden —
K_t computed by hand as A·(r/d)^b at an exact published D/d row, coefficients pinned in a comment.
Say which was used in the log.

## Envelopes

- D/d outside the published row range: **invalid**, table auto-guard (from S01 machinery),
  **scoped** to K_t and descendants (σ_max, SF). Reason: no published coefficients there.
- r/d outside the fits' stated validity range: **invalid**, authored envelope, **scoped** to K_t
  and descendants. Reason: the power-law fit is only asserted over the published r/d domain.
  **Decided mapping** (the known trap in this THING): the table auto-guard covers ONLY the D/d
  argument; the r/d limits are a separate authored envelope. If Norton states one common r/d range
  for the fit family, use it verbatim; if ranges vary per D/d row, use the most restrictive
  published range (conservative intersection) and say so in the envelope's citation note.
- Sharp-fillet **warn** as r/d approaches the lower bound. Reason: Kt grows steeply and
  fit/measurement uncertainty dominates near sharp notches.

## Materials axis

σ_y binds (SF = σ_y/σ_max). K_t itself is pure geometry — material changes SF but never K_t; make
that legible in the UI (the readout split is the pedagogy). E, ρ do not enter. No new property
columns.

## Sim sketch

Static schematic, no clock: longitudinal section of the stepped shaft (large D stepping to small d
through fillet radius r, all knob-driven), a stress hot-spot marker at the fillet whose visual
intensity scales with K_t, and a load glyph per configuration (moment arc / torsion arrows / axial
arrows). Readouts: σ_nom, K_t, σ_max, SF. `StressBands` for the σ_max vs σ_y comparison;
`SimRefusal` consumes the scoped invalids (K_t readouts withheld, page stands). New component
`site/src/components/sims/SteppedShaftSim.tsx`; register its draw key; new SVG classes in
`global.css`.

## Deliverables

- `site/src/content/things/stepped-shaft-fillet/{thing.yaml, overview.mdx, failure.mdx}` —
  thing.yaml carries three `tables:` entries (bending/torsion/axial A,b rows, verbatim from
  Norton) and three configurations. failure.mdx sets up fatigue ("Kt is where cracks start") as
  the honest Phase 5 teaser. Cross-links: torsion-shaft and cantilever-beam (the nominal-stress
  formulas are literally those pages' results), combined-shaft, spur-gear-pair (the shoulder that
  seats the gear).
- Sim component + CSS classes (above).
- `pipeline/tests/test_stepped_shaft_physics.py` — Roark Table 17.1 cross-check within the cited
  band + the golden above.
- Any table-machinery regression tests for bugs found (in `pipeline/tests/test_tables.py`).
- e2e pins: presence + refusal (drive r/d or D/d out of domain) at minimum.

## Exit criteria

- Catalog count = 19 on /things/, in CLAUDE.md, and in README.
- `uv run pytest -q` (pipeline/) count strictly above the post-S01 count recorded in log.md;
  includes test_stepped_shaft_physics.py; all green.
- Machine-proven fact: the emitted (A, b) lookup reproduces every published Norton row bit-exactly
  in all three configurations, and refuses outside the D/d and r/d domains with scoped invalids.
- Cross-check fact on record: Norton fits vs Roark Table 17.1 agree within the stated, cited band
  (band + citation in the test comment and PR body).
- Visual pass done per protocol §5 (normal + refused, all three configurations glanced at).
- Log entry appended (capability bugfixes, if any, listed under Deviations and under
  "New capabilities future briefs may rely on" as behavior notes); queue row S02 → DONE with PR#
  and date; deploy verified.

## Out of scope

Fatigue / endurance-limit anything (Kq, notch sensitivity q, Marin factors — Phase 5) · Kt for
grooves, holes, or keyways (fillet only) · threshold table mode · digitizing any chart ·
retrofitting spur-gear-pair or others · combined loading on one page (each configuration is pure).

## Notes

- Sibling patterns: spur-gear-pair (fresh table authoring shape — copy its `tables:` block
  structure exactly), combined-shaft (multi-configuration page layout), eccentric-column (scoped
  refusal wiring where a readout is withheld while the page stands).
- Trap: two poison paths (D/d table guard, r/d authored envelope) must BOTH scope to K_t and
  descendants — verify each fires independently in e2e, not just one.
- Trap: three tables in one thing.yaml is itself new surface for the machinery (S01 shipped with
  two lookups from ONE table) — id collisions, per-configuration table selection, DOF counting
  with k=2 columns. If DOF arithmetic breaks here, the bug is in compile.py, not in your variable
  list — planetary-gearset must still pass (invariant 1).
- Editing pipeline source (bugfixes) busts every fingerprint → cold builds, ≈3–4 min, timeouts
  ≥ 6 min. Pure THING authoring keeps warm rebuilds.
- Branch `thing/stepped-shaft-fillet`; PR title e.g.
  `THING 19: stepped shaft fillet (Phase 2 second table consumer, real-arg multi-column)`.

## Table data — VERIFIED, obtained 2026-07-04 (resolves the §9.1 data block)

The original data block (log S02 entry, PR #14) is RESOLVED: the owner supplied Norton's Appendix C
directly, and the `(A,b)` coefficients below were read digit-for-digit from it and independently
corroborated against the Roark cross-check formula (also in the log S02 `State:` section). Transcribe
these into `thing.yaml` `tables:` (rows must be strictly INCREASING `D/d`; they are listed ascending
here). Fit form: **K_t ≅ A·(r/d)^b** (one `(A,b)` pair per `D/d`).

**Source (cite as `norton`):** Norton, R. L., *Machine Design: An Integrated Approach*, Appendix C
"Stress-Concentration Factors" — **Fig. C-1** (shoulder fillet, axial tension), **Fig. C-2**
(bending), **Fig. C-3** (torsion), pp. 1028–1029; Norton credits Peterson's charts.
`verification:` = "Read digit-for-digit from Norton App C Figs C-1/C-2/C-3 (owner-provided scan,
2026-07-04); cross-checked against Roark *Formulas for Stress and Strain* Table 6-1 case III-2
closed form (agree within the mid-`D/d` band; see physics test)."

Axial tension — arg `D/d`, columns `[A, b]` (Fig. C-1):
```
D/d      A          b
1.01     0.98413   -0.10474
1.02     1.01220   -0.12474
1.05     1.00480   -0.17076
1.07     0.98498   -0.19548
1.10     0.98450   -0.20818
1.15     0.98084   -0.22485
1.20     0.96272   -0.25527
1.30     0.99682   -0.25751
1.50     0.99957   -0.28221
2.00     1.01470   -0.30035
```
Bending — arg `D/d`, columns `[A, b]` (Fig. C-2):
```
D/d      A          b
1.01     0.91938   -0.17032
1.02     0.96048   -0.17711
1.03     0.98061   -0.18381
1.05     0.98137   -0.19653
1.07     0.97527   -0.20958
1.10     0.95120   -0.23757
1.20     0.97098   -0.21796
1.50     0.93836   -0.25759
2.00     0.90879   -0.28598
3.00     0.89334   -0.30860
6.00     0.87868   -0.33243
```
Torsion — arg `D/d`, columns `[A, b]` (Fig. C-3):
```
D/d      A          b
1.09     0.90337   -0.12692
1.20     0.83425   -0.21649
1.33     0.84897   -0.23161
2.00     0.86331   -0.23865
```
**r/d envelope (authored, scoped to K_t + descendants):** Norton plots Figs C-1–C-3 over
`0 < r/d ≤ 0.30` and prints no explicit numeric validity range, so take `r/d ≤ 0.30` as the published
upper bound (invalid above) and a sharp-fillet **warn** at small `r/d` (the curves are drawn from
`r/d ≈ 0.02–0.05` upward; K_t → large and fit uncertainty dominates near sharp notches). State this
honestly in the envelope citation (do not invent a lower bound Norton doesn't print). The `D/d`
out-of-range refusal is the SEPARATE table auto-guard (per-table `D/d` domains: axial `[1.01, 2.00]`,
bending `[1.01, 6.00]`, torsion `[1.09, 2.00]`) — verify BOTH poison paths independently in e2e.

**Golden (by-hand):** e.g. bending at `D/d = 1.50` (exact row), `r/d = 0.10`:
`K_t = 0.93836 · 0.10^(-0.25759) = 0.93836 · 10^0.25759 = 0.93836 · 1.80926 = 1.6978` — pin the
coefficients in a comment. **Cross-check (physics test):** re-implement Roark Table 6-1 case III-2
`K_t = C1 + C2(2h/D) + C3(2h/D)² + C4(2h/D)³`, `h=(D−d)/2` (C-coefficients verbatim in the log S02
entry) and assert agreement with `A·(r/d)^b` within the sources' stated ~few-% fit accuracy over the
well-stepped `D/d ≥ 1.5` band; the near-`D/d→1` rows diverge more (both fits are least reliable there)
— state the band + both citations honestly, do NOT tune it (brief Physics scope).
