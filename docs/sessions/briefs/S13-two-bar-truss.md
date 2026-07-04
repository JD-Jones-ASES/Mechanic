# S13 — two-bar-truss

- **ID / Title:** S13 — two-bar-truss (determinate statics; the Phase 3 bridge page)
- **Phase:** 2
- **Type:** THING
- **Size:** S
- **Status:** FULL

## Goal

THING #30 live at `/things/two-bar-truss/`: the symmetric two-bar truss — member force from joint
equilibrium, member stress, joint deflection by the unit-load method, an Euler buckling check in the
compression configuration, and a mass readout for the material axis. Determinate by construction:
the fourbar authoring pattern at its simplest, zero new machinery. overview.mdx explicitly names the
redundant truss as Phase 3 solveLinear material — this page IS the deliberate phase-boundary bridge.
Catalog 29 → 30. This session also owns the S14 disposition duty (see Notes — read it before starting).

## Entry criteria

Each with a check command; any false → BLOCKED, do not start (protocol §1.6).

- Main CI green: `gh run list --branch main --limit 1`
- No PAUSED/IN_PROGRESS rows: `rg -n '\|\s*(IN_PROGRESS|PAUSED)\s*\|' docs/sessions/queue.md`
  → expect NO match (exit 1)
- Dependency S12 DONE (strict queue order): `rg -n '^\| S12 .*DONE' docs/sessions/queue.md` → one match
- Buckling cross-link target exists: `test -f site/src/content/things/euler-column/thing.yaml` (Bash) → true
- Gere & Goodno citation precedent: `rg -l 'Gere' site/src/content/things` → ≥ 1 match
- Authored-solution pattern exists: `test -f site/src/content/things/fourbar-linkage/thing.yaml` (Bash) → true

## New capabilities required

**NONE — if this work turns out to need a new engine/pipeline/schema capability, STOP and BLOCK
(protocol §9.2); do not improvise one.** Deliberately zero-machinery: no new kinds, no new units —
the batch's closing, lowest-risk session.

## Physics scope

Two identical members, each at angle α from VERTICAL, meeting at a loaded joint. Knobs: P, α, L,
member diameter d, material. Members are solid round bars — DECIDED, so A and I both come from one
knob d (do not re-litigate into a free-A/free-I pair; that breaks the buckling check's honesty).

- Joint equilibrium: `F_m = P / (2*cos(alpha))` — two unknowns, two equations, determinate by
  construction. Authored solution back-substituted; NO solver (fourbar pattern at its simplest).
- Section: `A = pi*d**2/4`, `I = pi*d**4/64`.
- Member stress: `sigma = F_m / A`; yield SF readout `SF_y = sigma_y / sigma` per sibling pattern.
- Joint deflection (unit-load method): `delta = P*L / (2*A*E*cos(alpha)**3)` — the small-displacement
  assumption is DECLARED in the assumptions list (the cos³α is a linearized-geometry result).
- Compression configuration (P reversed): per-member Euler check reusing the euler-column result
  verbatim — `P_cr = pi**2*E*I / L**2` (pinned-pinned, K = 1, cited: truss members are pin-jointed by
  model), `SF_buck = P_cr / F_m`.
- Mass readout: `m = 2*rho*A*L`. Overview teases the σ_y/ρ merit index (Phase 5 Ashby work).
- REQUIRED SENTENCE, not color: overview.mdx names the redundant (three-bar / statically
  indeterminate) truss as Phase 3 solveLinear material — equilibrium alone no longer determines the
  forces; compatibility must be solved. That is the batch design's phase-boundary setup.
- Citations: Gere & Goodno 9th ed (axially loaded members; unit-load/energy deflection —
  repo-precedented); Timoshenko, Strength of Materials Part I, as cross-check.
- Golden: a Gere & Goodno worked two-bar example — transcribe from the printing, pin in a test comment.
- Independent cross-check: `pipeline/tests/test_truss_physics.py` re-derives δ by DIRECT GEOMETRY —
  member elongation `e = F_m*L/(A*E)` projected to joint displacement via the compatibility
  triangle — independently of the energy route, and requires symbolic agreement. Two genuinely
  different derivations agreeing is the point of this THING's test. Also: equilibrium re-derivation
  of F_m; the buckling readout cross-pinned against the Euler closed form; the golden.

## Envelopes

- α → 90° (the tightrope singularity): WARN-then-INVALID pair. The physical reason is
  small-displacement linearization failure as cos α → 0 (force and deflection diverge). THRESHOLDS
  MUST CARRY CITATIONS — the batch design names this the one risk: no invented "85°". Source them
  from a citable statement (Gere & Goodno's small-displacement validity discussion, or a named
  design-practice bound on member inclination). If after honest search no pinnable bound exists,
  BLOCK per §9.1 — an invented threshold is a fabricated citation.
- Structural: 0 < α < 90° — INVALID at/beyond (geometry degenerates).
- Compression configuration: slenderness validity on the Euler check, reusing euler-column's own
  envelope form and citation, scoped to the buckling readouts. Johnson is NOT re-implemented here —
  cross-link euler-column instead.

## Materials axis

YES — E (deflection), σ_y (yield SF), ρ (mass) all bind from `data/materials/`; no new property
columns. The Ti-vs-steel legibility moment applies directly to δ. The mass readout plus SF makes the
stiffness/strength/density independence visible per invariant 3.

## Sim sketch

Two bars from anchors to a loaded joint; the α knob visibly swings the geometry; load arrow at the
joint; exaggerated δ drawn; member stroke/color encodes tension vs compression. Driving α toward 90°
flattens the truss while the force readouts blow up — then the refusal lands: the memorable moment.
Compression configuration reverses the arrow and hints a buckle bow. `StressBands` for σ vs σ_y where
it fits; `SimRefusal` for invalid states. Component `site/src/components/sims/TrussSim.tsx`, draw key
`two-bar-truss`, new SVG classes in `global.css`.

## Deliverables

- `site/src/content/things/two-bar-truss/{thing.yaml, overview.mdx, failure.mdx}`
- `TrussSim.tsx` + draw-key registry entry + `global.css` classes
- `pipeline/tests/test_truss_physics.py` (geometry-route δ, equilibrium, Euler cross-pin, golden)
- e2e pins: presence + refusal (α driven into the invalid region)
- Display-unit / kind registry entries: N/A

## Exit criteria

- `/things/` shows 30; CLAUDE.md catalog line + README count updated to 30
- `uv run pytest -q` green, ≥ 5 new tests in `test_truss_physics.py` over baseline
- Machine-proven fact: `delta = P*L/(2*A*E*cos(alpha)**3)` verified against the relations by SymPy
  AND independently re-derived by the compatibility-triangle route in tests, the two agreeing
  symbolically
- α-envelope thresholds carry pinned citations (visible in `sources[].verification`)
- overview.mdx contains the Phase 3 solveLinear bridge statement
- Visual pass per §5: normal + refused screenshots, what-was-checked described
- Log entry appended; queue row S13 → DONE with PR# + date
- S14 disposition executed per Notes (continuation or SKIPPED + phase closure)

## Out of scope

Redundant / asymmetric / n-bar trusses (Phase 3 solveLinear — NAMED in overview, not built) ·
large-displacement or snap-through nonlinearity · joint/gusset/pin detail design · Johnson-region
compression (cross-link euler-column only).

## Notes

- **THE PHASE-BOUNDARY DUTY.** S14 (band-brake) is the queue's designated shed item. After S13 is
  fully complete (merged, bookkeeping done, deploy verified), do exactly ONE of:
  (a) continue to S14 under protocol §2's continuation rule (≥ 50% context remaining; fresh branch,
  fresh PR) — S14's completer then closes the phase; or
  (b) mark the S14 queue row SKIPPED (pre-authorized by the queue's shed note) and close Phase 2
  yourself per protocol §8: write `docs/sessions/reports/phase-2.md` (template in §11), verify/update
  the Phase 3 DRAFT briefs (S15–S20) against merged reality, set the queue header to
  `Active phase: 2 — AWAITING OWNER`, and STOP.
  Closure costs real context (a report + six DRAFT briefs to reconcile) — budget it into the choice.
  When in doubt, choose (b): a clean phase close beats a paused shed item.
- α is measured from VERTICAL. State the convention in overview, the sim, and relation comments —
  from-horizontal is the classic transcription error and would silently swap cos/sin everywhere.
- The compatibility-triangle test only agrees with the energy route under the same small-displacement
  linearization; declare that assumption once, prominently.
- Imitate: fourbar-linkage (authored solutions, back-substitution, no solver), euler-column (buckling
  readout, envelope, `scope:` syntax), simply-supported-beam (energy-method-as-visible-theorem framing).
- Cross-links to author: euler-column (chain-port pair: its P_cr feeds SF_buck), eccentric-column
  (load off the joint centroid — failure.mdx material), cantilever-beam (frame vs truss framing).
