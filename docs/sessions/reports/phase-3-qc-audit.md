# Phase-3 QC audit — 2026-07-06 (owner-directed, run in-session at the Phase 4 ruling)

**What ran.** Owner-directed quality-control pass over the Phase-3 deliverables (PRs #32–#39)
before Phase 4 work begins, run READ-ONLY in plan mode (no builds — see Track A note below).
A 40-agent workflow: 12 independent dimension auditors — one per Phase-3 THING with the physics
re-derived from first principles (propped-cantilever, fixed-fixed family, composite-bar,
thermal-assembly, bolted-joint-gasket), plus the solveLinear verifier code path, material slots,
CTE/Θ kinds, materials provenance, refusal/envelope logic, test/e2e quality, and docs
reconciliation — every actionable finding then adversarially verified by a 3-refuter panel
(≥2 refutations kill a finding), then a completeness critic. Findings the panel *confirmed* were
additionally re-verified by the coordinating session against the source before entering this
report; that final pass overturned two (see "Refuted findings" — a methodology lesson recorded
below).

## Headline verdict

**Phase 3's emitted numbers are sound — zero wrong computed values, again** (matching the QC0
result for Phase 2). Independently confirmed clean:

- All six statically-indeterminate THINGs' physics re-derived from first principles and matched:
  equilibrium + compatibility relations, reactions, moments, load shares, thermal force, joint
  constant, separation load; numeric goldens match hand derivations; e2e pins tight.
- Every `solve_linear` certificate is sound in all six consumers: affine proof
  (∂²r/∂tᵢ∂tⱼ ≡ 0), target-free coefficients, per-sample 50-dps determinant checks, desugared
  closed forms passing total back-substitution, determinant shipped as a runtime `nonzero` guard.
  No blind `solve()` anywhere in `pipeline/`.
- Slot normalization (flat `binds` → lone `default` slot) happens exactly once; legacy THINGs
  compile byte-identical; slot isolation e2e-verified.
- Θ kinds carry correct dimension vectors ([0,0,0,0,1,0,0] and its inverse); all CTE values
  plausibility- and unit-checked against their cited sources; `degF_interval` converts in the
  correct direction; new display units (GN/m, MN/m, mm², K, 1e-6/K) all in `check-units` coverage.
- The planetary-gearset 2-DOF reference case is unaffected by the solveLinear infrastructure.
- Overview/failure prose across all six THINGs makes no claim the math doesn't support.

## Confirmed findings (4) — dispositions → QC2

| # | Sev | Where | Finding | Disposition |
|---|-----|-------|---------|-------------|
| 1 | major | `pipeline/src/mech_pipeline/compile.py` (~519 desugar/solutions seam; `verify.py:198` dict overwrite) | A target authored BOTH in a `solve_linear` group AND in a configuration's `solutions:` block silently overwrites the certified closed form with the manual one — the certificate is lost without an error. Latent: all six shipped THINGs solve disjoint targets in the two paths; nothing wrong is live. | QC2: build-time rejection (BuildError naming THING/config/target) + a pytest that authors the collision and asserts the refusal. |
| 2 | major | `site/e2e/things.spec.ts` (multi-material specs) | The browser-side default material initialization path (`ThingWidget.tsx:133–140`, staggered per-slot defaults) has zero e2e coverage — every multi-material test `selectOption`s first. A silent regression in landing state would ship undetected. | QC2: subsumed by the R7 `default_material` work — landing-state e2e pins for composite-bar and thermal-assembly (no `selectOption`, assert the declared landing pair and a landing readout). |
| 3 | major | `docs/authoring-things.md:30` | The authoring guide teaches only the flat single-material `binds: {E: youngs_modulus, …}` form — the S17 slot form `binds: {slot: {sym: prop}}` is undocumented, so a future session would mis-author multi-material THINGs from the canonical guide. | QC2: add a slots section (authored shape, one-time normalization, per-slot qualifying-material filtering, R7 `default_material`, and the slots × scoped-refusal interaction note below). |
| 4 | minor | `docs/authoring-things.md:98` | References a `solve_hint` authoring mechanism that was never built (only `solve1d` and `solve_linear` shipped). | QC2: delete/replace with the two real paths. |

**Hardening notes (cheap, ride QC2):** (a) the incremental-compile fingerprint hashes
`glob('*.py')` of the pipeline package dir — correct today (all seven modules captured) but
brittle to a future subdirectory refactor; add a guard comment or switch to an explicit module
list/rglob. (b) No round-trip display↔SI unit test covers the new Θ-dimension kinds; add one.
(c) Authoring note: no shipped THING combines named material slots with a *scoped* refusal —
the interaction is untested; the first THING to combine them must add the coverage.

**Noted, no action:** the `×10⁻⁶/K` display label (vs `ppm/K`) is a taste call, correct as
shipped; a11y spec runs axe on all six new pages (0 serious/critical) but doesn't log per-page
detail — acceptable.

## Refuted findings — and a methodology lesson

The refuter panels confirmed, 2-to-1, two "critical" claims that the beam slenderness envelopes
(`condition: L > 10*h`, warn) on propped-cantilever and fixed-fixed-beam are *inverted* because
"the condition fires for slender beams while the message describes short deep beams." The
coordinating session's re-verification overturned both: validity conditions in this project are
**valid-while regions** — `site/src/engines/relation.ts:122–124` evaluates the guard and pushes
the message when the predicate is **false** (`if (ok === false)`), and the THING page renders
envelopes under "Valid while:". `L > 10*h` therefore correctly warns only for short, deep beams,
exactly as the message says — the same pattern QC1 shipped for shaft-critical-speed (`L > 10d`)
and thermal-assembly's yield warn (`σ² < σ_y²`, which fires *above* yield).

**Lesson (binding on future audits):** two of three independent refuters pattern-matched
"condition fires when true" and upheld a false critical; the one dissenting refuter had read the
engine. Audit prompts must PIN the valid-while semantics (quote `relation.ts:122`) before asking
anyone to judge envelope logic, and any envelope finding needs the engine read, not just the
yaml. One rejected finding each on thermal-assembly sim labeling, the queue header, and
architecture.md were correctly killed by the panels.

## Completeness-critic gaps (recorded; not findings)

Default-material landing path untested (→ finding 2, actioned) · fingerprint glob brittleness
(→ hardening a) · Θ display round-trip (→ hardening b) · slots × scoped-refusal interaction
(→ hardening c) · a11y logging detail (noted) · solveLinear never exercised against a 2-DOF
manifold THING like the planetary — nothing requires it; recorded as a fact, not a gap to close.

## Track A — cold full-gate re-run: DEFERRED TO QC2

QC0's Track A (delete generated artifacts, cold `pnpm build`, `uv run pytest`, full e2e) could
not run in this read-only session. QC2 runs it as its verification step and appends the counts
to this report's Dispositions section, QC1-style. Until then, the standing evidence is CI green
on every Phase-3 merge plus the live-site spot checks in `reports/phase-3.md`.

## Dispositions — QC2 (2026-07-07, PR #41)

All four confirmed findings fixed, the three hardening notes actioned, the R7 `default_material`
field shipped, and Track A run green. **No emitted number changed** — every existing golden and
parity sample passed unmodified (the headline holds).

**Per-finding:**

| # | Fix | Evidence |
|---|-----|----------|
| 1 (solve_linear/solutions seam) | `compile.py` snapshots the group targets before the solutions loop and raises a `BuildError` naming thing/config/target on a collision. | `test_solve_linear.py::test_solve_linear_target_also_in_solutions_fails` authors the collision with the *correct* `R_B = 3wL/8` form (so it compiled cleanly before) and asserts the refusal — verified **red→green** (neutered guard → `DID NOT RAISE`; restored). |
| 2 (landing-state e2e gap) | Subsumed by R7: `things.spec.ts` landing pins for composite-bar and thermal-assembly — no `selectOption`, assert the declared pair + a hand-derived readout. | 2 new e2e; both LAND on steel-a36 + al-6061-t6 (browser-confirmed). |
| 3 (undocumented slot form) | `authoring-things.md` "Material slots and landing materials (S17 / R7)" section: named slots, one-time normalization, per-slot qualifying filter, R7 `defaults`, slots×scoped-refusal note (hardening c). | Section present; flat-`binds` comment points to it. |
| 4 (stale solve_hint) | Replaced the never-built `solve_hint` reference with the two real non-closed-form paths (solve1d / solve_linear). | `rg solve_hint docs/authoring-things.md` → none. |

**R7 `default_material` (ruling R7, ADR-0010 §6):** additive `materials.defaults` schema field; compile
passthrough + cache-independent `validate_default_materials` (existence + per-slot qualification, loud
`BuildError` on a bad id); `ThingWidget` landing honors it with the staggered fallback intact;
composite-bar lands steel-a36 core + al-6061-t6 sleeve, thermal-assembly lands steel-a36 left +
al-6061-t6 right. Pins: `test_default_materials.py` (passthrough, null, unknown-id, non-qualifying,
unknown-slot).

**Hardening:** (a) `_build_fingerprint` uses `rglob('*.py')` (captures a future subpackage) — material
seed deliberately NOT in the fingerprint; R7 validation is cache-independent instead (runs before the
per-THING cache loop, so a seed edit that de-qualifies a landing id is caught even on a fully-cached
rebuild). (b) `units.test.mjs` Θ-kinds display↔SI round-trip (K interval 1:1, CTE ×10⁻⁶/K ↔ 1/K by
1e-6). (c) slots×scoped-refusal note added to the authoring guide.

**Track A — cold full-gate re-run (2026-07-07):**
- `rm -rf site/src/generated/things` then cold `pnpm build`: **clean, 3m20s**, 43 pages; check:parity
  **1485** values / 36 artifacts; check:units **884** refs; pagefind 43 pages / 9331 words.
- `uv run pytest -q`: **360 passed** (was 354; +5 default-materials, +1 collision).
- `pnpm run test:unit`: **22 passed** (was 19; +3 Θ round-trip).
- `pnpm exec playwright test`: **108 passed** (was 106; +2 landing) incl. axe smoke 0 serious/critical.
- Browser visual pass: both THINGs LAND on ASTM A36 steel + 6061-T6 aluminium with sensible readouts;
  composite-bar P→max fires the CORE-yielded warn (SF_1=0.15); console clean.

**Self-review:** six independent passes (3 angle + 3 `/code-review high` finders) — zero
critical/major/real correctness findings. Two non-blocking cleanup nits fixed by comment (cross-reference
the three copies of the qualification predicate; note that ChainDemo does not yet honor R7 defaults —
chain-builder S21+); one rebutted (the deliberate cache-independent yaml re-parse).

**Rule-6 / literal-criterion note:** the exit criterion `rg -n "solve_hint" docs/` is satisfied for the
finding's target (`authoring-things.md`); the QC2 brief, this report, and `log.md` still contain the word
because they *document* the finding (append-only history — not rewritten to satisfy a literal grep).
