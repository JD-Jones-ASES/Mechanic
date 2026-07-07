# Session queue

Read `docs/sessions/protocol.md` first; it defines every status and transition used here.

**Active phase: 4**

## Phase gate rulings

A session may only start work in a phase listed here as approved (protocol §8). When ruling, the
owner writes the ruling line AND flips the **Active phase** header above in the same edit.

- Phase 2 approved — JD 2026-07-04 (this launch)
- Phase 3 approved — JD 2026-07-06 (ruled in-session; recorded on owner instruction, `reports/phase-2.md` reviewed)
- Phase 4 approved — JD 2026-07-06 (ruled in-session; recorded on owner instruction, `reports/phase-3.md` reviewed; phase scope extended same ruling — see R7–R9 below)

## Owner rulings on record (2026-07-04)

Briefs cite these by number. They are the authoritative record: closing sessions may
verify/update DRAFT briefs against merged reality but may **not** alter or drop quoted ruling text.

- **R1** — ADR-0008 signed off, SPLIT scope: `solveLinear` approved to build; nonlinear `solveND`
  deferred to a future ADR (recorded in `docs/decisions/ADR-0008-cyclic-solving.md` + roadmap Phase 3).
- **R2** — Phase 2 target: grow the catalog from 17 to ≈30 THINGs (roadmap Phase 2).
- **R3** — Working rhythm: sessions fully autonomous within a phase; phase-closing session writes a
  report and stops for owner direction (roadmap header).
- **R4** — Merge policy: sessions merge their own PRs after all gates pass; merge is publish
  (roadmap header; protocol §6).
- **R5** — Capability designs approved as drafted in the S00 plan: the tabulated-data `table` plan
  step, Option B (S01 brief + ADR-0009 when written) and the solveLinear build-time-exact-solve
  design (S15 brief). Implement as specified; genuine conflicts with reality → BLOCKED (§9.2),
  not redesign.
- **R6** — Session plan approved: the S01–S25 queue below, incl. S14 as pre-authorized shed item
  and the pre-answered design decisions embedded in the briefs.

## Owner rulings on record (2026-07-06, with the Phase 4 ruling)

- **R7** — Per-slot `default_material` additive schema field approved (phase-3 report decision 2):
  a material slot may name its landing material; compile passes it through to the artifact; the
  widget's initial selection honors it (falling back to current behavior if the id doesn't
  qualify); landing-state e2e pins added. Built in QC2. Nothing beyond this field is granted.
- **R8** — Portal design track approved per `docs/decisions/ADR-0010-portal-ia.md` (course-spine
  category taxonomy + `topic` subgrouping, home/catalog redesign with Pagefind search UI,
  THING-page wayfinding, restrained visual polish). Rows D1/D2 below, deliberately placed before
  S22 so the chain-builder ships into the final shell/nav.
- **R9** — QC2 row added at the top of Phase 4: the Phase-3 QC audit report
  (`reports/phase-3-qc-audit.md`) is its findings brief, plus the R7 field (spec in
  `briefs/QC2-phase3-qc-fixes.md`). The motor-THING decision stays open until S25 (phase-3
  report decision 3, unchanged).

## OWNER NOTES

Notes remain **binding until the owner removes or strikes them** — sessions read them at every
startup and before every continuation row. Owner: edit this file only when no row is IN_PROGRESS
or PAUSED, and remove a note once it has served its purpose.

- (none)

## Phase 2 — Catalog breadth (17 → 30/31 THINGs)

Strict top-to-bottom order. Statuses: QUEUED → IN_PROGRESS → DONE; also PAUSED / BLOCKED / SKIPPED
(protocol §2, §9). **Status cells hold only the bare token** — guard greps depend on it; branch
names ride in the Date cell (`<date> · <branch>`).

| ID  | Session                                                        | THING # | Status | PR  | Date       | Brief |
|-----|----------------------------------------------------------------|---------|--------|-----|------------|-------|
| S00 | Docs: session system bootstrap                                 | —       | DONE   | #11 | 2026-07-04 | (the plan is the brief) |
| S01 | spur-gear-pair (Lewis) + `table` plan-step capability + ADR-0009 | 18    | DONE   | #13 | 2026-07-04 | [S01](briefs/S01-spur-gear-pair.md) |
| S02 | stepped-shaft-fillet (Kt fits; real-arg multi-column table)    | 19      | DONE   | #15 | 2026-07-04 | [S02](briefs/S02-stepped-shaft-fillet.md) |
| S03 | rectangular-shaft-torsion (Saint-Venant; twist_rate kind)      | 20      | DONE | #16 | 2026-07-04 | [S03](briefs/S03-rectangular-shaft-torsion.md) |
| S04 | beam-shear-flow (shear_flow kind)                              | 21      | DONE | #17 | 2026-07-04 | [S04](briefs/S04-beam-shear-flow.md) |
| S05 | curved-beam (Winkler; zero new machinery)                      | 22      | DONE | #18 | 2026-07-04 | [S05](briefs/S05-curved-beam.md) |
| S06 | circular-plate (ν in stress; flexural_rigidity kind)           | 23      | DONE | #19 | 2026-07-05 | [S06](briefs/S06-circular-plate.md) |
| S07 | torsional-oscillator (frequency kind; Hz/s/ms units)           | 24      | DONE | #20 | 2026-07-06 | [S07](briefs/S07-torsional-oscillator.md) |
| S08 | shaft-critical-speed (cited-constants mechanism: g)            | 25      | DONE | #21 | 2026-07-06 | [S08](briefs/S08-shaft-critical-speed.md) |
| S09 | impact-loading (energy method; 2nd constants consumer)         | 26      | DONE | #22 | 2026-07-06 | [S09](briefs/S09-impact-loading.md) |
| S10 | slider-crank (exact kinematics at a knob angle)                | 27      | DONE | #24 | 2026-07-06 | [S10](briefs/S10-slider-crank.md) |
| S11 | ball-bearing-life (probability kind; optional threshold table) | 28      | DONE | #25 | 2026-07-06 | [S11](briefs/S11-ball-bearing-life.md) |
| S12 | disk-clutch (uniform wear vs uniform pressure)                 | 29      | DONE | #26 | 2026-07-06 | [S12](briefs/S12-disk-clutch.md) |
| S13 | two-bar-truss (determinate; names Phase 3 at the boundary)     | 30      | DONE | #27 | 2026-07-06 · thing/two-bar-truss | [S13](briefs/S13-two-bar-truss.md) |
| S14 | band-brake — **designated shed item** (see note)               | 31      | SKIPPED | —   | 2026-07-06 | [S14](briefs/S14-band-brake.md) |

**S14 shed note:** band-brake is the pre-authorized shed item (belt-drive already carries the
capstan math). The session that completes S13 either continues to S14 (protocol §2 continuation
rule) or marks it SKIPPED — both are pre-authorized — and then closes the phase per protocol §8.

**S02 block RESOLVED (2026-07-04):** the brief's THING needs Norton's `A·(r/d)^b` shoulder-fillet
Kt coefficients verbatim from a published source. These were BLOCKED (unobtainable from ~12
accessible sources) and then RESOLVED the same day — the owner supplied Norton *Machine Design*
Appendix C directly; the verified `(A,b)` tables (axial/bending/torsion) + citation + r/d envelope +
golden are now recorded in the S02 brief ("Table data — VERIFIED"), cross-checked against the Roark
formula preserved in `log.md`. S02 is back to QUEUED and buildable as briefed; the multi-column
implementation plan (a compiler/verifier logic fix — no schema/artifact change) is in the `log.md`
S02 entry. History: PR #14 (the block + its resolution).

## Phase 3 — Solver depth: solveLinear + statically indeterminate THINGs

ADR-0008 signed off 2026-07-04 with the SPLIT scope (solveLinear approved; nonlinear solveND
deferred). Briefs are DRAFT: the Phase 2 closing session verifies them against merged reality.

| ID  | Session                                                          | THING #s | Status | PR | Date | Brief |
|-----|------------------------------------------------------------------|----------|--------|----|------|-------|
| S15 | solveLinear capability + ADR-0008 amendment + propped-cantilever | +1       | DONE | #32 | 2026-07-06 · phase3/solvelinear-propped-cantilever | [S15](briefs/S15-solvelinear-propped-cantilever.md) |
| S16 | fixed-fixed-beam + fixed-fixed-torsion-shaft                     | +2       | DONE | #34 | 2026-07-06 · phase3/fixed-fixed-family | [S16](briefs/S16-fixed-fixed-family.md) |
| S17 | multi-material binding slots + composite-bar                     | +1       | DONE | #36 | 2026-07-06 · phase3/multi-material-slots | [S17](briefs/S17-multi-material-composite-bar.md) |
| S18 | CTE material column + thermal-assembly                           | +1       | DONE | #37 | 2026-07-06 · phase3/thermal-cte | [S18](briefs/S18-thermal-assembly-cte.md) |
| S19 | bolted-joint-gasket (separation = global refusal)                | +1       | DONE | #38 | 2026-07-06 · thing/bolted-joint-gasket | [S19](briefs/S19-bolted-joint-gasket.md) |
| S20 | Phase 3 close: optional three-parallel-rods + reconciliation + report | +0/1 | DONE | #39 | 2026-07-06 · docs/phase3-close | [S20](briefs/S20-phase3-close.md) |

## Phase 4 — Chaining as the product + portal design

Two tracks in one phase by owner ruling 2026-07-06 (R8, R9): the chaining sessions S21–S25 as
planned 2026-07-04 (S21–S25 briefs verified against merged reality by S20 — see
`reports/phase-3.md`), plus the Phase-3 QC-fix session (QC2) and the portal-design track (D1/D2,
per ADR-0010). **Strict top-to-bottom order; IDs are labels, table position is priority.**
S25 remains the phase-closing row (protocol §8).

| ID  | Session                                                        | Status | PR | Date | Brief |
|-----|----------------------------------------------------------------|--------|----|------|-------|
| QC2 | Phase-3 QC fixes + per-slot default_material (R7)              | DONE | #41 | 2026-07-07 · phase4/qc2-fixes | [QC2](briefs/QC2-phase3-qc-fixes.md) |
| S21 | chain-eval engine extraction + refusal/provenance propagation  | DONE | #42 | 2026-07-07 · phase4/chain-eval-engine | [S21](briefs/S21-chain-eval-engine.md) |
| D1  | Portal IA: category taxonomy + home/catalog redesign + search  | DONE | #44 | 2026-07-07 · phase4/portal-ia-catalog | [D1](briefs/D1-portal-ia-catalog.md) |
| D2  | THING-page wayfinding + cross-linking + visual polish          | DONE | #46 | 2026-07-07 · phase4/thing-wayfinding | [D2](briefs/D2-thing-wayfinding.md) |
| S22 | /chain-builder/ MVP (native controls, no drag-and-drop)        | DONE | #47 | 2026-07-07 · phase4/chain-builder-mvp | [S22](briefs/S22-chain-builder-mvp.md) |
| S23 | URL serialization of chains (versioned fragment encoding)      | IN_PROGRESS | —  | 2026-07-07 · phase4/chain-url-serialization | [S23](briefs/S23-chain-url-serialization.md) |
| S24 | citation/provenance flow through chains + /verification/ section | QUEUED | — | —    | [S24](briefs/S24-chain-provenance.md) |
| S25 | curated example chains + spin-up story + Phase 4 close         | QUEUED | —  | —    | [S25](briefs/S25-chain-examples-close.md) |
