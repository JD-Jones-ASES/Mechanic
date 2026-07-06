# Phase 2 report — 2026-07-06

**Audience: JD, ~10 minutes.** Phase 2 = catalog breadth, executed by the autonomous session system
(S00–S14). This report is written against merged reality (queue.md DONE rows + merged PR titles), not
restated intentions.

## Summary

Phase 2 grew the catalog from **17 to 30 THINGs** across the undergraduate spine (statics → mechanics of
materials → machine design → dynamics), each landing under the full per-THING gate with no human review
(ADR-0007). Thirteen THINGs shipped (S01–S13, THINGs 18–30); the pre-authorized shed item S14 (band-brake)
was SKIPPED, landing the phase at exactly the ≈30 target (R2). Every batch deliberately exercised a new
factory capability — the tabulated-data `table` plan step (designed on purpose as the first deliverable),
five new quantity kinds, and the first cited-physical-constant mechanism — proving the factory generalizes
rather than accreting bespoke code. Zero of the merges required lowering a gate; the one substantive physics
issue (a transcription error in the S13 brief) was caught by the independent cross-check and corrected before
publish.

## Sessions

| ID  | Shipped | PR | Key deviation (full detail in log.md) |
|-----|---------|----|----|
| S00 | Session system (protocol, queue, 25 briefs, ADR-0008 accepted-split) + physics-test existence gate | [#11](https://github.com/JD-Jones-ASES/Mechanic/pull/11), [#12](https://github.com/JD-Jones-ASES/Mechanic/pull/12) | none (docs) |
| S01 | THING 18 spur-gear-pair + the `table` plan step (ADR-0009) | [#13](https://github.com/JD-Jones-ASES/Mechanic/pull/13) | single shared σ_y (per-gear materials deferred to S17) |
| S02 | THING 19 stepped-shaft-fillet + real-arg multi-column table | [#15](https://github.com/JD-Jones-ASES/Mechanic/pull/15) ([#14](https://github.com/JD-Jones-ASES/Mechanic/pull/14) = block+unblock) | BLOCKED then RESOLVED same day (owner supplied Norton App-C); σ_nom entered directly |
| S03 | THING 20 rectangular-shaft-torsion + `twist_rate` kind | [#16](https://github.com/JD-Jones-ASES/Mechanic/pull/16) | coefficients pinned via exact Saint-Venant series + Roark (Timoshenko PDF blocked) — a stronger check |
| S04 | THING 21 beam-shear-flow + `shear_flow` kind | [#17](https://github.com/JD-Jones-ASES/Mechanic/pull/17) | warn-only THING (no honest hard-invalid) |
| S05 | THING 22 curved-beam (deliberate zero-new-machinery) | [#18](https://github.com/JD-Jones-ASES/Mechanic/pull/18) | single crane-hook config; one geometry envelope |
| S06 | THING 23 circular-plate + `flexural_rigidity` kind | [#19](https://github.com/JD-Jones-ASES/Mechanic/pull/19) | bound E+ν not σ_y (brittle gray-iron demo material); warn-only |
| S07 | THING 24 torsional-oscillator + `frequency` kind | [#20](https://github.com/JD-Jones-ASES/Mechanic/pull/20) | none major (k_t is a derivation local, no unauthorized kind) |
| S08 | THING 25 shaft-critical-speed + `role: constant` (g) | [#21](https://github.com/JD-Jones-ASES/Mechanic/pull/21) | none major (first cited constant) |
| S09 | THING 26 impact-loading (2nd constant consumer) | [#22](https://github.com/JD-Jones-ASES/Mechanic/pull/22) | none major |
| S10 | THING 27 slider-crank | [#24](https://github.com/JD-Jones-ASES/Mechanic/pull/24) ([#23](https://github.com/JD-Jones-ASES/Mechanic/pull/23) = shared clamp-helper refactor) | none of substance |
| S11 | THING 28 ball-bearing-life + `probability` kind | [#25](https://github.com/JD-Jones-ASES/Mechanic/pull/25) | Weibull params as role:constant; threshold-table stretch deferred |
| S12 | THING 29 disk-clutch | [#26](https://github.com/JD-Jones-ASES/Mechanic/pull/26) | none of substance |
| S13 | THING 30 two-bar-truss (the Phase-3 bridge) | [#27](https://github.com/JD-Jones-ASES/Mechanic/pull/27) | **brief specified cos³α; shipped the correct cos²α** (see below) |
| S14 | band-brake | — | **SKIPPED** — pre-authorized shed item; target met at 30 |

## Catalog: 17 → 30 THINGs. Capabilities added (plain language)

1. **Tabulated data with provenance** — the `table` plan step (ADR-0009): cited data authored inline,
   returned bit-exact at published rows, linearly interpolated between them (interpolation itself cited),
   pinned in the parity oracle against mpmath every build, and scoped-refused out of domain (no
   extrapolation). Hardened to **real-arg multi-column** consumption (one lookup at D/d filling both A and b).
2. **Five new quantity kinds** — `twist_rate`, `shear_flow`, `flexural_rigidity`, `frequency`, `probability`
   — each keeping a quantity that shares a dimension 7-vector with another from silently chaining into the
   wrong port (e.g. a survival probability must never flow into a geometric-ratio port; frequency in Hz never
   into an angular-velocity port without an explicit 2π).
3. **New display units** — rad/m, deg/m, Hz, s, ms, h, Mrev.
4. **The first cited physical constant** — `role: constant` (g = 9.80665 m/s², cited, never a knob, excluded
   from DOF arithmetic like a material) + the ConstantsPanel. Generalized cleanly to a second consumer
   (impact-loading) and to a set of dimensionless constants (the bearing Weibull parameters) with zero
   pipeline change.
5. **The autonomous session system itself** (S00) + the machine-gated physics-test existence requirement
   (every THING must map to a first-principles cross-check module).

## Gate compliance

Every merged Phase-2 PR passed the full per-THING gate: machine verification (`pnpm build`: pipeline gen →
katex/mdx/parity/units → astro → pagefind) + an independent first-principles physics cross-check in
`pipeline/tests/` + a hand-checkable numeric golden + web-pinned citations recorded in
`sources[].verification` + a browser visual pass + a multi-angle self-review (3–6 independent passes per
session). **No gate was ever lowered, weakened, or `xfail`'d.** Every deviation, collected in one place:

- **S01** — bound a single shared σ_y (per-gear independent materials needs S17 multi-material slots, not
  granted); golden hand-worked, not a verbatim textbook example (its figures weren't web-accessible).
- **S02** — the Norton shoulder-fillet K_t coefficients were unobtainable from ~12 accessible sources
  (BLOCKED per §9.1); the owner supplied Norton *Machine Design* App-C directly the same day and the row
  resolved (published in the brief, cross-checked vs Roark). σ_nom entered directly (a single arch computes
  all vars in every config, so a per-config load-derived σ_nom is impossible).
- **S03** — the Timoshenko §109 torsion coefficients were pinned by re-derivation from the exact Saint-Venant
  Fourier series + Roark's closed form (the PDF was archive.org-blocked); a **stronger** check than
  transcription, and legitimate because they are the exact solution of a PDE (uncopyrightable facts).
- **S04 / S05 / S06** — warn-only THINGs (the governing formulas are finite for all positive inputs, so there
  is no honest hard-invalid to author; inventing one would violate invariant 5). S06 additionally bound E+ν
  rather than σ_y because its demo material (brittle gray iron) has no yield point.
- **S11** — Weibull reliability parameters carried as cited `role: constant` values (more provenance-forward);
  the reserved `threshold` table mode was NOT un-reserved (a real capability, correctly left for an
  owner-authorized future session).
- **S13** — **the brief's joint-deflection formula, `δ = PL/(2AE·cos³α)`, was a transcription error.** The
  correct symmetric two-bar result is **cos²α**, confirmed four independent ways (a SymPy pre-verify; the
  physics test's two independent derivations — unit-load virtual work AND the compatibility-triangle
  projection — agreeing symbolically; the brief's *own* stated compatibility method, which yields cos²α; and
  web-corroboration). A gate could not pass honestly with cos³α (the independent physics cross-check
  contradicts it), so the site ships the corrected cos²α, and the S13 brief was corrected this session
  (Physics-scope + Exit-criteria lines, dated notes). This is the "reality wins, record it" path: the brief's
  *method* was followed; only its mis-transcribed final formula was corrected.

## BLOCKED / SKIPPED rows

- **S02 — BLOCKED → RESOLVED (same day).** Norton/Shigley shoulder-fillet K_t `(A,b)` coefficients could not
  be obtained or independently confirmed from accessible sources; the owner supplied Norton App-C directly and
  the row shipped as THING 19. (History in PR #14 and the S02 log entry.)
- **S14 band-brake — SKIPPED (pre-authorized).** The queue's shed note pre-authorizes SKIP; belt-drive already
  carries the capstan/friction math, and the ≈30-THING target (R2) is met at 30. Revive it in a later phase
  if desired.

## Spot-check menu (~2 min each)

1. [two-bar-truss](https://jd-jones-ases.github.io/Mechanic/things/two-bar-truss/) — drive **α toward 90°**
   and watch the member force and deflection blow up, then the geometry-degenerate refusal land; toggle to the
   **tension** configuration and watch the buckling readouts vanish (a tension member cannot buckle). The
   deflection is cos²α (the corrected S13 physics).
2. [circular-plate](https://jd-jones-ases.github.io/Mechanic/things/circular-plate/) — swap **steel ↔ gray
   iron** and watch the simply-supported center stress σ_ss (which carries ν) move while the clamped-edge
   stress σ_c holds bit-identical (material-blind) — Poisson's ratio moving a stress.
3. [ball-bearing-life](https://jd-jones-ases.github.io/Mechanic/things/ball-bearing-life/) — drive the
   **reliability goal below R = 0.90** and watch the Weibull-adjusted readouts scope-refuse while the rated
   L₁₀ stands.
- **One derivation to eyeball:** two-bar-truss's derivation block, where δ = PL/(2AE·cos²α) is built from the
  compatibility triangle (one cos α from the member force, one from the projection) — the machine-checked
  correction of the brief's typo.
- **/verification/ delta:** the audit-block count went 29 → 30; the new `two-bar-truss` block cites Gere &
  Goodno / Shigley / Timoshenko and records that the cos²α form was web-corroborated and re-derived two ways.

## Decisions needed before Phase 3

1. **Rule on Phase 3.** *Recommendation: APPROVE.* Write the literal line `Phase 3 approved — JD <date>` in
   `queue.md` and flip the header to `Active phase: 3` in the **same edit** (runbook step 2e). The solveLinear
   design is already DECIDED (R5; ADR-0008 accepted-split, owner sign-off 2026-07-04), and the S15–S20 briefs
   are verified consistent with merged reality (below). Approving unblocks S15 (solveLinear capability +
   propped-cantilever).
2. **Acknowledge the S13 brief correction.** The brief's cos³α was a transcription error; the site ships the
   correct cos²α and the brief has been corrected (dated notes). *Recommendation: no action beyond awareness.*
3. **band-brake (S14 SKIPPED).** *Recommendation: leave skipped* — the ≈30 target is met and belt-drive covers
   the capstan math. If you want the 31st THING, re-queue band-brake (or another shed item) in a later phase.

## Next-phase briefs — status

All six Phase-3 DRAFT briefs (S15–S20) were **verified against merged reality this session** and require **no
technical updates**. Their entry-criteria references were confirmed to still hold: the solve1d machinery
(`verify_solve1d_configuration`, `test_solve1d.py`, the `nonzero` runtime guard, `SIMPLIFY_OPS_CAP = 200`),
the `binds: z.record` schema + `MaterialPicker.tsx`, the `torque`/`stiffness`/`pressure_stress` kinds,
`shear_modulus` seeded in steel-a36, the 13 seeded materials, and CTE-not-yet-shipped (0 hits) all check out;
30 catalog dirs on disk. The briefs are self-aware about the catalog growth and the S14 decision. **One
handoff honored:** S18 asked the closing session to pin its catalog number given the S14 decision — pinned
(Phase 2 closed at 30, so Phase-3 THING numbering begins at 31: S15 propped-cantilever = 31; thermal-assembly
lands at ~35 on the planned sequence, recompute-from-queue if a fallback shifts it).

## Risks carried forward

1. **Textbook-PDF inaccessibility (recurring since S02).** Primary-source PDFs are frequently blocked; the
   mitigation held all phase — pin by first-principles re-derivation + web-corroboration, and let the physics
   test (not transcription) carry the weight. Expect the same in Phase 3.
2. **solveLinear (S15) is the biggest Phase-3 lift** — a real pipeline capability (affine certificate + exact
   linsolve + desugar), solo, never claimed via the continuation rule. The 4×4 fixed-fixed beam (S16) is the
   op-cap stress test, with a pre-authorized symmetry-reduction fallback (never raise the cap ad hoc).
3. **Multi-material slots (S17) touch MaterialPicker/ThingWidget — every page.** A regression is catalog-wide,
   and merge is publish; the full e2e sweep across the whole catalog is the required net.
4. **Provenance discipline.** Two Phase-2 sessions found wrong numbers in their own inputs — S11's recalled
   Weibull θ (4.439 vs the correct 4.459) and S13's brief formula (cos³α vs cos²α). The lesson is now doubly
   proven: a brief is a spec, not a source — **always independently re-derive emitted formulas and
   web-corroborate cited constants; never transcribe or trust recall.**
