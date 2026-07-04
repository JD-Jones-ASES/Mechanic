# Session queue

Read `docs/sessions/protocol.md` first; it defines every status and transition used here.

**Active phase: 2**

## Phase gate rulings

A session may only start work in a phase listed here as approved (protocol §8).

- Phase 2 approved — JD 2026-07-04 (rulings recorded in `docs/roadmap.md` header and Phase 2/3 sections)
- Phase 3: NOT YET RULED (the Phase 2 closing session writes `reports/phase-2.md`; owner rules here)
- Phase 4: NOT YET RULED

## OWNER NOTES

Sessions must read and honor notes dated after the last log entry. Owner: edit this file only when
no row is IN_PROGRESS or PAUSED.

- (none)

## Phase 2 — Catalog breadth (17 → 30/31 THINGs)

Strict top-to-bottom order. Statuses: QUEUED → IN_PROGRESS → DONE; also PAUSED / BLOCKED / SKIPPED
(protocol §2, §9).

| ID  | Session                                                        | THING # | Status | PR  | Date       | Brief |
|-----|----------------------------------------------------------------|---------|--------|-----|------------|-------|
| S00 | Docs: session system bootstrap                                 | —       | DONE   | #11 | 2026-07-04 | (the plan is the brief) |
| S01 | spur-gear-pair (Lewis) + `table` plan-step capability + ADR-0009 | 18    | QUEUED | —   | —          | [S01](briefs/S01-spur-gear-pair.md) |
| S02 | stepped-shaft-fillet (Kt fits; real-arg multi-column table)    | 19      | QUEUED | —   | —          | [S02](briefs/S02-stepped-shaft-fillet.md) |
| S03 | rectangular-shaft-torsion (Saint-Venant; twist_rate kind)      | 20      | QUEUED | —   | —          | [S03](briefs/S03-rectangular-shaft-torsion.md) |
| S04 | beam-shear-flow (shear_flow kind)                              | 21      | QUEUED | —   | —          | [S04](briefs/S04-beam-shear-flow.md) |
| S05 | curved-beam (Winkler; zero new machinery)                      | 22      | QUEUED | —   | —          | [S05](briefs/S05-curved-beam.md) |
| S06 | circular-plate (ν in stress; flexural_rigidity kind)           | 23      | QUEUED | —   | —          | [S06](briefs/S06-circular-plate.md) |
| S07 | torsional-oscillator (frequency kind; Hz/s/ms units)           | 24      | QUEUED | —   | —          | [S07](briefs/S07-torsional-oscillator.md) |
| S08 | shaft-critical-speed (cited-constants mechanism: g)            | 25      | QUEUED | —   | —          | [S08](briefs/S08-shaft-critical-speed.md) |
| S09 | impact-loading (energy method; 2nd constants consumer)         | 26      | QUEUED | —   | —          | [S09](briefs/S09-impact-loading.md) |
| S10 | slider-crank (exact kinematics at a knob angle)                | 27      | QUEUED | —   | —          | [S10](briefs/S10-slider-crank.md) |
| S11 | ball-bearing-life (probability kind; optional threshold table) | 28      | QUEUED | —   | —          | [S11](briefs/S11-ball-bearing-life.md) |
| S12 | disk-clutch (uniform wear vs uniform pressure)                 | 29      | QUEUED | —   | —          | [S12](briefs/S12-disk-clutch.md) |
| S13 | two-bar-truss (determinate; names Phase 3 at the boundary)     | 30      | QUEUED | —   | —          | [S13](briefs/S13-two-bar-truss.md) |
| S14 | band-brake — **designated shed item** (see note)               | 31      | QUEUED | —   | —          | [S14](briefs/S14-band-brake.md) |

**S14 shed note:** band-brake is the pre-authorized shed item (belt-drive already carries the
capstan math). The session that completes S13 either continues to S14 (protocol §2 continuation
rule) or marks it SKIPPED — both are pre-authorized — and then closes the phase per protocol §8.

## Phase 3 — Solver depth: solveLinear + statically indeterminate THINGs

ADR-0008 signed off 2026-07-04 with the SPLIT scope (solveLinear approved; nonlinear solveND
deferred). Briefs are DRAFT: the Phase 2 closing session verifies them against merged reality.

| ID  | Session                                                          | THING #s | Status | PR | Date | Brief |
|-----|------------------------------------------------------------------|----------|--------|----|------|-------|
| S15 | solveLinear capability + ADR-0008 amendment + propped-cantilever | +1       | QUEUED | —  | —    | [S15](briefs/S15-solvelinear-propped-cantilever.md) |
| S16 | fixed-fixed-beam + fixed-fixed-torsion-shaft                     | +2       | QUEUED | —  | —    | [S16](briefs/S16-fixed-fixed-family.md) |
| S17 | multi-material binding slots + composite-bar                     | +1       | QUEUED | —  | —    | [S17](briefs/S17-multi-material-composite-bar.md) |
| S18 | CTE material column + thermal-assembly                           | +1       | QUEUED | —  | —    | [S18](briefs/S18-thermal-assembly-cte.md) |
| S19 | bolted-joint-gasket (separation = global refusal)                | +1       | QUEUED | —  | —    | [S19](briefs/S19-bolted-joint-gasket.md) |
| S20 | Phase 3 close: optional three-parallel-rods + reconciliation + report | +0/1 | QUEUED | —  | —    | [S20](briefs/S20-phase3-close.md) |

## Phase 4 — Chaining as the product

Briefs are DRAFT: the Phase 3 closing session verifies them against merged reality.

| ID  | Session                                                        | Status | PR | Date | Brief |
|-----|----------------------------------------------------------------|--------|----|------|-------|
| S21 | chain-eval engine extraction + refusal/provenance propagation  | QUEUED | —  | —    | [S21](briefs/S21-chain-eval-engine.md) |
| S22 | /chain-builder/ MVP (native controls, no drag-and-drop)        | QUEUED | —  | —    | [S22](briefs/S22-chain-builder-mvp.md) |
| S23 | URL serialization of chains (versioned fragment encoding)      | QUEUED | —  | —    | [S23](briefs/S23-chain-url-serialization.md) |
| S24 | citation/provenance flow through chains + /verification/ section | QUEUED | — | —    | [S24](briefs/S24-chain-provenance.md) |
| S25 | curated example chains + spin-up story + Phase 4 close         | QUEUED | —  | —    | [S25](briefs/S25-chain-examples-close.md) |
