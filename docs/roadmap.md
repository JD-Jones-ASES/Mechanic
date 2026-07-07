# Roadmap — toward the final product

Phased plan agreed with the owner 2026-06-10 (in-session). Working rhythm (owner ruling
2026-07-04): sessions run fully autonomously WITHIN a phase — one session = one merged PR, each
session merging its own PR after all gates pass (green CI, multi-angle self-review, browser
visual pass; consistent with ADR-0007) — and at each phase boundary the closing session writes
`docs/sessions/reports/phase-<n>.md` and stops for owner direction. Session mechanics, queue, and
briefs live in `docs/sessions/`. Everything here operates under the five invariants in `CLAUDE.md`
and the verification model in `docs/decisions/ADR-0007` (AI-authored, programmatic gates, no human
review — the site says so on `/verification/`).

**Rough definition of done:** 30–50 THINGs covering the undergraduate spine (statics → mechanics
of materials → machine design → dynamics), a chain-builder that turns the catalog into a
type-checked system simulator, ~30 provenance-clean materials with Ashby merit-index tooling,
and the verification page as the public trust story. Explicitly never: accounts, analytics,
comments, servers (the static-site constraint is permanent).

## Phase 1 — Platform consolidation ✅ complete (2026-06-10, PR #4)

ADR-0007 + site-wide honest framing; `/verification/` page (gates, per-THING audit blocks,
per-source pinning records via `sources[].verification`); all eight sims consume the engine's
authoritative `invalid` verdict (shared `SimRefusal`; finite-invalid cases e2e-pinned); shared
sim machinery (`useSimClock`, `StressBands`); incremental compile cache (fingerprinted artifact
reuse, `actions/cache` in CI — warm builds reuse unchanged THINGs in seconds).

## Phase 2 — Catalog breadth ✅ complete (2026-07-06, 17 → 30 THINGs; report `docs/sessions/reports/phase-2.md`)

**Target (owner ruling 2026-07-04): grow the catalog from 17 to ≈30 THINGs — MET at 30.** The
session-by-session plan was `docs/sessions/queue.md` (S01–S13 shipped THINGs 18–30; S14 band-brake
SKIPPED as the pre-authorized shed item, so Phase 2 landed at exactly 30); the spur-gear
tabulated-data capability went first, designed deliberately, then consumed by later batches. The
closing session (S13) wrote the phase report and set the queue header to AWAITING OWNER for the
Phase 3 ruling.

Batches marched the undergraduate spine (machine elements → structures → plates → dynamics →
machine design → statics), each deliberately exercising a new factory capability:

- **`table` plan step (ADR-0009)** — cited tabulated data with provenance: node-exact at published
  rows, cited linear interpolation, parity-pinned every build, scoped out-of-domain refusal;
  hardened to real-argument multi-column consumption (spur-gear-pair → stepped-shaft-fillet →
  rectangular-shaft-torsion).
- **Five quantity kinds** — `twist_rate`, `shear_flow`, `flexural_rigidity`, `frequency`,
  `probability` — each blocking a silent same-dimension/wrong-kind chain (invariant 2).
- **`role: constant`** — cited physical constants (g; the bearing Weibull parameters): never a
  knob, excluded from DOF arithmetic, mandatory citation, ConstantsPanel
  (shaft-critical-speed → impact-loading → ball-bearing-life).
- **Configuration-discriminator idiom** — a constrained free-integer `mode` selecting cases and
  gating scoped refusals on one shared relation set (impact-loading, two-bar-truss); documented
  in `docs/authoring-things.md`.
- **New display units** — rad/m, deg/m, Hz, s, ms, m/s², h, Mrev.

The full per-THING record (13 sessions: physics scope, gates, goldens, citations, deviations)
lives in `docs/sessions/log.md` — the authoritative session log — with the 10-minute owner
summary in `docs/sessions/reports/phase-2.md`. One substantive correction shipped: the S13
brief's transcribed deflection formula (cos³α) failed independent re-derivation and the site
ships the correct cos²α; that incident plus S11's wrong recalled Weibull θ became protocol
rule 6 (**a brief is a spec, not a source**). The per-THING gate is protocol §3.

## Phase 3 — Solver depth ✅ complete (2026-07-06, 30 → 36 THINGs; report `docs/sessions/reports/phase-3.md`)

Approved JD 2026-07-06; items 1–2 ✅ shipped 2026-06-10; item 3 scope split 2026-07-04.

In dependency order:
1. **Johnson parabola** ✅ — second model on the Euler page with its own envelope; the refusal
   below λ_T became a hand-off. Required (and delivered) a new shared-engine capability:
   **scoped refusal** — invalid envelopes may poison named variables instead of the whole page
   (`scope:` on validity; `EvalResult.invalidVars`; per-readout refusal; sims dash the refused
   model). Tangency at λ_T (value AND slope) is machine-proven in the derivation and the Johnson
   constant re-derived from the tangency requirement in tests.
2. **First real `solve1d`/Brent consumer** ✅ — pipeline grew the full bracketed-root path
   (authoring syntax → per-sample sign-change certificate + single-root scan → 60-dps bisection
   → total back-substitution → roots in the parity oracle, so the browser's Brent is checked
   against mpmath every build; static bracket replaced by bracket *functions* of the env). The
   eccentric column (secant formula) consumes it: P_y solved live, and the page's point — the
   margin must be taken on LOAD — falls out of the nonlinearity.
3. **Cyclic / ND solving** — feedback loops, statically indeterminate systems. **Owner ruling
   2026-07-04: ADR-0008 signed off with the SPLIT scope** — `solveLinear` (statically
   indeterminate elastic structures; exact solve, full per-sample certificate) is approved to
   build; nonlinear `solveND` is deferred to a future ADR and remains out of scope until a THING
   demands it and the owner signs that ADR. Execution: sessions S15–S20 in
   `docs/sessions/queue.md`. **`solveLinear` ✅ shipped (S15, PR #32, 2026-07-06 — propped-cantilever
   the reference consumer, catalog → 31); `solveND` remains PROPOSED/unbuilt.** S16 ✅ shipped
   (fixed-fixed beam 4×4 + fixed-fixed torsion shaft 2×2, the range-exercising pure solveLinear
   consumers, catalog → 33). S17 ✅ shipped (multi-material binding slots — one THING binds two
   independent materials — + composite-bar, the first non-cancelling-determinant solveLinear
   consumer where the load share is material-DEPENDENT, catalog → 34). S18 ✅ shipped (CTE material
   column + `temperature_difference`/`thermal_expansion_coefficient` kinds — the first nonzero Θ slot —
   + thermal-assembly, a two-segment bar clamped between rigid walls whose thermal force is a
   material-DEPENDENT solveLinear solve, catalog → 35). S19 ✅ shipped (bolted-joint-gasket — a
   preloaded gasketed joint under external tensile load; a 2×2 solveLinear for the bolt/member force
   split by stiffness, with separation F_m ≤ 0 as a GLOBAL refusal and no material axis by design
   since the stiffnesses are direct inputs, catalog → 36). S20 ✅ closed the phase (PR #39): this
   report, the roadmap/CLAUDE/README reconciliation, the `/verification/` and ADR-0008 sweeps, and
   the Phase 4 DRAFT-brief verification, then set the queue header to AWAITING OWNER for the Phase 4
   ruling. The optional stretch THING (three-parallel-rods) was **not** taken, to protect the
   non-abandonable closure budget (both outcomes were pre-authorized by the S20 brief).

## Phase 4 — Chaining as the product + portal design

**Approved JD 2026-07-06** (ruled in-session; queue rulings R7–R9 recorded with it). Two tracks,
one phase, strict queue order QC2 → S21 → D1 → D2 → S22 → S23 → S24 → S25 (S25 closes).

**Track 1 — chaining, the differentiator.** The type system (dimension 7-vector + quantity kind)
already makes arbitrary forward chains legal; the work is a chain-builder page (pick THINGs, wire
ports, planner orders evaluation), chains serialized into the URL (shareable on a static site),
and curated examples (planetary → shaft → flywheel: spin-up time and what it costs in stress).
Every number keeps its citation through the chain. Sessions S21–S25 as planned 2026-07-04; briefs
verified against merged reality by S20.

**Track 2 — the portal undergraduates deserve** (owner-directed 2026-07-06, ADR-0010). The
Phase-3 QC audit ran at the ruling (zero wrong emitted numbers; 4 findings — report
`docs/sessions/reports/phase-3-qc-audit.md`); QC2 fixes them and ships the R7 per-slot
`default_material` field. Then D1 replaces the flat 36-card home page with a course-spine catalog
(authored `category`/`topic` per THING: Mechanics of Materials / Machine Design / Mechanisms,
Dynamics & Vibration), build-proof stats in the hero, and a Pagefind search UI; D2 adds THING-page
wayfinding — related THINGs, a `connectionLegal`-driven "chains with" block, prev/next along the
spine, per-THING verification badges. Restrained visual polish only (tokens/system
fonts/dark-mode/native controls stay; no webfonts, no frameworks). D1/D2 deliberately precede S22
so the chain-builder ships into the final shell.

## Phase 5 — Materials depth

Grow `data/materials/` under the same Feist/provenance rules. Each new property *column* unlocks
THING capabilities: ultimate strength (already seeded) → burst margins; endurance limits →
fatigue facets; fracture toughness → leak-before-burst. Add composites (the flywheel overview
already names CFRP), and close the Ashby loop with merit-index overlays (σ_y/ρ, E/ρ) tied to the
THINGs that generate them.
