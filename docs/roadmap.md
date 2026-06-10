# Roadmap — toward the final product

Phased plan agreed with the owner 2026-06-10 (in-session). Working rhythm: complete a phase,
pause for owner direction before starting the next. Everything here operates under the five
invariants in `CLAUDE.md` and the verification model in `docs/decisions/ADR-0007` (AI-authored,
programmatic gates, no human review — the site says so on `/verification/`).

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
  central bore, shrink-fit compound cylinder (the autofrettage story made interactive — and
  secretly a chaining story).
- **The deliberate schema stress-test:** spur gear pair (Lewis bending) forces a
  tabulated-data-with-provenance mechanism (form-factor tables as cited data, not magic
  numbers). Design that capability on purpose, not ad hoc.

Per-THING gate (standard practice, from the flywheel/cylinder sessions): machine verification +
independent first-principles cross-check in `pipeline/tests/` + hand-checkable numeric golden +
web-pinned citations recorded in `sources[].verification` + browser visual pass + multi-angle
code review before merge.

## Phase 3 — Solver depth

In dependency order:
1. **Johnson parabola** for the Euler column — closed-form, converts today's principled refusal
   into a second model with its own envelope; demonstrates model hand-off *within* one page.
2. **First real `solve1d`/Brent consumer** — the engine shipped in v1 as insurance (ADR-0002);
   the deferred eccentric-column secant formula is the natural customer.
3. **Cyclic / ND solving** — feedback loops, statically indeterminate systems. Schema is ready
   (reserved plan-step type); requires a new ADR and owner sign-off before building.

## Phase 4 — Chaining as the product

The differentiator. The type system (dimension 7-vector + quantity kind) already makes arbitrary
forward chains legal; the work is a chain-builder page (pick THINGs, wire ports, planner orders
evaluation), chains serialized into the URL (shareable on a static site), and curated examples
(motor → planetary → shaft → flywheel: spin-up time and what it costs in stress). Every number
keeps its citation through the chain.

## Phase 5 — Materials depth

Grow `data/materials/` under the same Feist/provenance rules. Each new property *column* unlocks
THING capabilities: ultimate strength (already seeded) → burst margins; endurance limits →
fatigue facets; fracture toughness → leak-before-burst. Add composites (the flywheel overview
already names CFRP), and close the Ashby loop with merit-index overlays (σ_y/ρ, E/ρ) tied to the
THINGs that generate them.
