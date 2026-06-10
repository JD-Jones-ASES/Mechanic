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

## Phase 2 — Catalog breadth (next)

March through the curriculum spine in batches; each batch should deliberately exercise a new
factory capability, the way the flywheel exercised `poisson_ratio` and new quantity kinds.

- **Machine elements:** helical compression spring (the G story continued; spring index + solid
  height + buckling envelopes), power screw (friction as an honest knob; self-locking as a
  validity condition), belt/capstan (the exponential).
- **Structures:** simply-supported beam (superposition story), combined bending + torsion shaft
  (principal stress; bridges two existing THINGs), thin-walled tube torsion (Bredt).
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
