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

## Phase 2 — Catalog breadth (in progress)

**Target (owner ruling 2026-07-04): grow the catalog from 17 to ≈30 THINGs.** The
session-by-session plan is `docs/sessions/queue.md` (S01–S14; band-brake is the designated shed
item, so Phase 2 lands at 30 or 31); the spur-gear tabulated-data capability goes first, designed
deliberately, then consumed by later batches.

March through the curriculum spine in batches; each batch should deliberately exercise a new
factory capability, the way the flywheel exercised `poisson_ratio` and new quantity kinds.

- **Machine elements** ✅ batch 1 shipped (2026-06-10): helical compression spring (the G story
  continued; coil-bind/buckling/index envelopes — the buckling bound material-aware through E
  and G via Shigley 10-12), power screw (friction as an honest knob — new `friction_coefficient`
  and `efficiency` kinds; self-locking as a warn envelope, the jammed wedge as a refusal),
  belt/capstan (the catalog's first `exp()`; the speed ceiling as a finite-value refusal, e2e-
  pinned; max-power speed re-derived by calculus in tests). New kinds: `stiffness`,
  `friction_coefficient`, `efficiency`; new display units N/m, N/mm, m/s.
- **Structures** ✅ batch 2 shipped (2026-06-10): simply-supported beam (superposition as a
  visible theorem — δ_P and δ_w are separate readouts that sum; new `line_load` kind), combined
  bending + torsion shaft (live Mohr's-circle sim; Tresca and von Mises side by side, their
  [1, 2/√3] bracket proven in tests; new `bending_moment` kind — the belt-tension bridge THING),
  thin-walled tube torsion (Bredt shear flow; the isoperimetric inequality S² ≥ 4πA_m as an
  invalid envelope — refusal by classical theorem, the sim's stadium construction goes complex
  at exactly the same boundary).
- **Radial-field family (already promised by existing failure notes):** rotating disk with a
  central bore ✅ shipped 2026-06-10 (the vanishing-hole ×2 as a machine-proven limit; 1/√2
  speed penalty; e_m rises at fixed speed — both flywheel cross-links live); shrink-fit
  compound cylinder ✅ shipped 2026-06-10 (ν-cancellation proven with ν symbolic; the
  two-shell optimum r_c = √(r_i·r_o) → capacity σ_y(1−r_i/r_o), approaching 2× the monobloc
  ceiling, machine-proven; scoped refusal's second consumer — over-shrunk bores refuse SF_bore
  alone; Timoshenko's own worked example as a published test golden; new µm display unit).
  The radial-field family is complete.
- **The deliberate schema stress-test:** spur gear pair (Lewis bending) ✅ shipped 2026-07-04
  (S01, PR #13) — forced a tabulated-data-with-provenance mechanism designed on purpose: the
  first-class `table` plan step (ADR-0009), cited form-factor data with node-exact lookup, linear
  interpolation pinned in the parity oracle, and a scoped out-of-domain refusal. Catalog 17 → 18.

Per-THING gate (standard practice, from the flywheel/cylinder sessions): machine verification +
independent first-principles cross-check in `pipeline/tests/` + hand-checkable numeric golden +
web-pinned citations recorded in `sources[].verification` + browser visual pass + multi-angle
code review before merge. The gate is expanded into exact commands in
`docs/sessions/protocol.md` §3.

## Phase 3 — Solver depth (items 1–2 ✅ shipped 2026-06-10; item 3 approved 2026-07-04, split scope)

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
   `docs/sessions/queue.md`.

## Phase 4 — Chaining as the product

The differentiator. The type system (dimension 7-vector + quantity kind) already makes arbitrary
forward chains legal; the work is a chain-builder page (pick THINGs, wire ports, planner orders
evaluation), chains serialized into the URL (shareable on a static site), and curated examples
(motor → planetary → shaft → flywheel: spin-up time and what it costs in stress). Every number
keeps its citation through the chain. Execution: sessions S21–S25 in `docs/sessions/queue.md`;
those briefs are DRAFT until the Phase 3 closing session verifies them.

## Phase 5 — Materials depth

Grow `data/materials/` under the same Feist/provenance rules. Each new property *column* unlocks
THING capabilities: ultimate strength (already seeded) → burst margins; endurance limits →
fatigue facets; fracture toughness → leak-before-burst. Add composites (the flywheel overview
already names CFRP), and close the Ashby loop with merit-index overlays (σ_y/ρ, E/ρ) tied to the
THINGs that generate them.
