# Mechanic — Engineering Reference Portal

A browsable database of mechanical/physical THINGS (gears, linkages, beams, vessels, motors…) for
engineering undergraduates, plus a chain builder that wires them into type-checked systems. Each
THING ships an overview, governing equations **with machine-verified derivations**, an interactive
sim, configurable options including material, and a how-it-fails note. Live site — deployed from CI
on every push to `main`; **merge is publish**, there is no review step between merge and the public
site: <https://jd-jones-ases.github.io/Mechanic/>

**Status: v1.0.0 (2026-07-07) — initial development is complete.** 37 THINGs across the
undergraduate spine, the `/chain-builder/` with three curated example chains, ~13 provenance-clean
materials, and `/verification/` as the public trust story. There is no active phase and no queued
work; future development (new THINGs, materials depth, nonlinear solving) is owner-commissioned —
see `docs/roadmap.md` § Future paths. The whole site is labeled **educational — not for design
use**, and is AI-authored end to end under owner-designed verification systems (ADR-0007); the live
`/verification/` page states exactly what the build proves and what rests on citation.

**Hard constraint:** pure static site on GitHub Pages. No server, no serverless, no runtime
backend. All computation happens at build time (Python) or in the browser (generated TS). Anything
that violates this is wrong by definition.

## The five invariants

Violating any of these requires an ADR in `docs/decisions/` and explicit owner sign-off.

1. **Relational core.** A THING declares variables and undirected relations (residual expressions),
   never fixed input→output functions. Knob count per configuration = DOF = independent variables −
   independent relations (build-checked). The planetary gearset (2 DOF, no single ratio) is the
   reference case: if a change breaks it, the change is wrong.
2. **Dimensional analysis is the type system.** Every variable carries an SI dimension 7-vector
   `[L,M,T,I,Θ,N,J]` **and a `quantity_kind`** (angle, ratio, tooth count, and Poisson ν are all
   zero-vector — dimension alone is not enough). Every relation must be dimensionally homogeneous
   (build fails otherwise). Widget chaining is legal iff dimension vector AND quantity kind match;
   v1 chaining is a forward DAG enforced by the planner, not the schema.
3. **Material is a cross-cutting axis.** Material-bound variables (E, σ_y, ρ, …) fan out through
   all relations as a cascade — stiffness, strength, and density are independent axes and the UI
   must make that legible (the "Ti-6Al-4V deflects MORE than mild steel" moment). A THING with no
   physical material axis binds none (bolted-joint-gasket, dc-motor) rather than faking one.
4. **Shared engines, no bespoke sim code.** Relation groups carry facet tags; sims are driven by
   shared engines (`site/src/engines/`) configured by data, and a sim draws only through
   engine-provided values. A THING that "needs" custom math in its widget indicates a missing
   engine capability, not a license to hand-roll.
5. **Credibility spine.** Every emitted number traces to: a relation (with citation), its
   assumptions and validity envelope (violations surface as warn/invalid banners, never silent),
   and a passed unit check. Every material value carries source + basis. SymPy verifies
   derivation-step *equivalence*, not physics: modeling steps (where physics enters by citation)
   are the declared audit surface, so every THING also needs an independent first-principles
   cross-check in `pipeline/tests/`, a hand-checkable numeric golden, and citations pinned against
   accessible sources (`sources[].verification`). **There is no human review gate** — corrections
   flow through the errata path, never silent edits.

## The factory pattern

The Zod schema in `site/src/content.config.ts` IS the THING template. Authoring = writing
`site/src/content/things/<slug>/thing.yaml` + `overview.mdx` + `failure.mdx` per
`docs/authoring-things.md`. The Python pipeline **verifies, never derives blind**: authors supply
solved forms per knob configuration; SymPy checks them against the relations (symbolic + numeric
sampling). There is NO blind `solve()` anywhere in the pipeline. The only non-closed-form paths:
bracketed `solve1d` (sign-change-certified, 60-dps bisection, browser Brent parity-checked) and
certified `solve_linear` groups (square systems PROVEN affine in their targets, exact Gaussian
elimination, back-substitution-verified). Multi-branch solutions (four-bar open/crossed) are each
verified independently. Invalid-severity envelopes may carry a `scope` naming the derived variables
they poison (scoped refusal); unscoped invalids refuse the whole evaluation. The build fails
loudly, naming the THING/step/relation/branch, on: dimension inhomogeneity, DOF mismatch,
unverifiable derivation step, solution residual ≠ 0, branch-count mismatch, unrenderable LaTeX, or
a display unit missing from `site/src/engines/units.ts`. Compilation is incremental: unchanged
THINGs (fingerprint = thing.yaml + pipeline source + SymPy version) are cache-reused, locally and
in CI.

## Build, test, verify

| From | Command | What |
|---|---|---|
| `site/` | `pnpm install && pnpm build` | Python pipeline → gates (KaTeX · MDX · parity · units) → astro → pagefind |
| `site/` | `pnpm preview` | serve the built dist (URLs live under the `/Mechanic/` base path) |
| `site/` | `pnpm run test:unit` | engine unit tests (`node --test`) |
| `site/` | `pnpm exec playwright test` | e2e + axe vs the BUILT dist — build first; locally use `--workers=2` |
| `pipeline/` | `uv run pytest -q` | math layer: compile/verify/emit + per-THING physics cross-checks |

Pins (do not float): Node 24.x, pnpm 11.5.2 (`packageManager` field), SymPy 1.14.0 (`uv.lock`
committed). A cold build ≈ 3–4 minutes — four-bar branch verification dominates; **slow, not
hung** — and warm rebuilds take seconds. Editing pipeline source (anything under
`pipeline/src/`) re-fingerprints every THING: budget one cold build.

## Hard-won traps (each of these has bitten a real session)

- **Never round-trip repo files through PowerShell `Get-Content`/`Set-Content`** — PS 5.1 silently
  mojibakes UTF-8 (this repo is full of ν, σ, ω, em-dashes). Use dedicated editor tools or Git Bash.
- **Generated artifacts (`site/src/generated/`, `data/build/`) are never committed** — only
  authored text is.
- Validity conditions are **VALID-WHILE** regions: the banner fires when the condition is FALSE.
- The pipeline auto-emits an unscoped `nonzero` guard for every solution denominator — a formula
  dividing by a knob refuses the whole page at exactly knob = 0; word envelope messages for both
  regimes, and never give a discriminator/envelope variable a `positive:` assumption that would
  collapse its condition to `True` at parse.
- A final derivation step whose expr IS the configuration solution verifies **vacuously** — mark it
  `check: definition` and prove the identification in the physics test instead.
- A stray NUL byte makes a file silently git/ripgrep-binary (greps skip it) — sweep new files.
- **A spec/brief is not a source**: independently re-derive every emitted formula and
  web-corroborate every cited constant before it ships (this has twice caught wrong numbers in the
  spec itself).

## Toolchain discipline

Use the standard tool; do not hand-roll substitutes — and do not add dependencies without
demonstrated need. Symbolic math/verification: SymPy via `uv run`. Dimensions:
`sympy.physics.units` (namespace whitelist in `pipeline/src/mech_pipeline/dims.py`). Material DB:
SQLite (stdlib / `node:sqlite`). Site: Astro 6 content collections + Zod. Math rendering: KaTeX at
build time only. Islands: Preact + signals, native form controls. E2E: Playwright vs built dist
(+ axe smoke).

## Data provenance (full text: `docs/data-provenance.md`)

Every material value: original published value + unit (converted programmatically, with tests),
source id + exact designation/table, and **basis** (`spec_minimum` | `design_minimum` | `typical`).
Legal frame is **fact extraction** (Feist): individual values are uncopyrightable facts; we cite
them — never redistribute source PDFs, never reproduce a source's table layout/selection. Forbidden
in the pipeline: scraped MatWeb (EULA), anything MMPDS, CC BY-NC-SA content. Seed files in
`data/materials/` are append-only; corrections get dated errata entries.

## Working on this repo

The catalog was built by autonomous working sessions governed by `docs/sessions/protocol.md`, with
`docs/sessions/queue.md` as the single source of truth for sanctioned work and
`docs/sessions/log.md` as the complete development record. That system is **dormant at v1.0.0 but
remains the law for substantive changes**: a new THING follows `docs/authoring-things.md` and the
full per-THING gate (protocol §3 — machine verification, independent physics cross-check,
hand-checkable golden, pinned citations, e2e presence + refusal pins, browser visual pass,
multi-angle self-review), and no session starts phase-scale work without an owner ruling line in
the queue. **Never lower a gate to make it pass. Never merge a partial THING.** For small fixes
(typos, prose, docs) the build gates suffice — but remember merge is publish.

## Where things live

`docs/architecture.md` — pipeline + the compiled-artifact schema (single source of truth).
`docs/authoring-things.md` — how to write a THING (the checklist of author mistakes is earned).
`docs/data-provenance.md` — citation tiers + the legal frame. `docs/decisions/` — ADRs; read before
re-litigating a choice (ADR-0007 = the verification model; ADR-0008 = solver scope; ADR-0010 =
portal IA). `docs/roadmap.md` — the phased history and the owner-commissioned future paths.
`docs/sessions/` — session protocol, queue, briefs, log, phase reports, and the owner runbook.
`reports/phase-<n>.md` under `docs/sessions/reports/` — the 10-minute owner summaries, including
two QC audits (both found zero wrong emitted numbers).

## Out of scope (v1 — an ADR + owner sign-off reopens any of these)

Nonlinear/cyclic solving (`solveND`, ADR-0008 part (b) — PROPOSED, unbuilt; certified linear
`solve_linear` groups are the shipped subset) · chaining UI beyond the shipped `/chain-builder/`
(cyclic/multi-branch chaining and a drag-and-drop canvas stay out) · Materials Project integration
· fluids & time-integration dynamics engines · Pyodide sandbox · integer tooth-count synthesis ·
eccentric-column solve-for-P (transcendental) · coupler-curve inverse · custom domain · analytics
(none, stated policy) · accounts/comments (static site).
