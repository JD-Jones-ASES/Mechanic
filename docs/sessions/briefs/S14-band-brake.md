# S14 — band-brake

- **ID / Title:** S14 — band-brake (capstan reuse; self-locking as refusal-by-sign-change)
- **Phase:** 2
- **Type:** THING
- **Size:** S
- **Status:** FULL

## Goal

THING #31 live at `/things/band-brake/`: band brake on a drum — the capstan relation (belt-drive's
own equation, deliberately re-consumed), braking torque, actuation force from lever geometry in
simple and differential (self-energizing) configurations, and the self-locking transition as an
INVALID envelope triggered by a sign change on the actuation force. Catalog 30 → 31. Honest framing,
stated here and in the queue: this is the DESIGNATED SHED ITEM — belt-drive already owns the capstan
math, so the marginal curriculum value is the lowest in Phase 2. If this brief is executing at all,
someone judged the budget sufficient; the one genuinely new pattern (sign-change refusal) is the
reason it exists. Its completer closes Phase 2 per protocol §8.

## Entry criteria

Each with a check command; any false → BLOCKED, do not start (protocol §1.6).

- Main CI green: `gh run list --branch main --limit 1`
- No PAUSED/IN_PROGRESS rows: `rg -n '\|\s*(IN_PROGRESS|PAUSED)\s*\|' docs/sessions/queue.md`
  → expect NO match (exit 1)
- Dependency S13 DONE: `rg -n '^\| S13 .*DONE' docs/sessions/queue.md` → one match
- S14 row still QUEUED (not SKIPPED): `rg -n '^\| S14 .*QUEUED' docs/sessions/queue.md` → one match.
  If the row says SKIPPED, there is nothing to execute — verify the phase was closed per §8
  (reports/phase-2.md exists, queue header AWAITING OWNER) and stop.
- Capstan oracle exists: `rg -n 'capstan' pipeline/tests/test_belt_physics.py` → matches
- Equation-reuse cross-link target exists: `test -f site/src/content/things/belt-drive/thing.yaml` (Bash) → true

## New capabilities required

**NONE — if this work turns out to need a new engine/pipeline/schema capability, STOP and BLOCK
(protocol §9.2); do not improvise one.** The novelty is pattern-level only (invalid-by-sign-change
on a derived force), which existing envelope machinery expresses. No new kinds or units (angle wrap
φ in rad/deg, friction_coefficient, force, torque, pressure_stress all exist).

## Physics scope

- Capstan: `T_1 = T_2 * exp(mu*phi)` (T_1 tight side; φ wrap angle, rad SI / deg display) —
  belt-drive's equation re-consumed. overview.mdx says so explicitly: same equation, opposite
  purpose — the belt spends friction capacity to transmit power; the brake IS the friction. The
  strongest deliberate equation-reuse pedagogy available in the catalog.
- Braking torque: `T_b = (T_1 - T_2) * r` (drum radius r).
- Simple band configuration: lever equilibrium `a*F_act = T_2*b` → `F_act = T_2*b/a`.
- Differential (self-energizing) configuration: `F_act = (T_2*b - T_1*c)/a` — tight-side tension
  helps apply the band.
- Self-locking threshold: `F_act <= 0  ⇔  b <= c*exp(mu*phi)` — proven algebraically in tests.
- Warn readouts: max lining bearing pressure `p = T_1/(b_w*r)` vs cited allowable; band tensile
  stress `sigma_band = T_1/(b_w*t)` vs cited allowable (b_w band width, t band thickness).
- Rotation direction: self-energizing holds for ONE drum direction. Model one direction, fix the
  convention explicitly in overview, the sim, and relation comments; name the reversal caveat.
- Citations: Shigley 10th ed ch. 16, §16-2 (band-type clutches and brakes); Juvinall & Marshek
  cross-check.
- Golden: a Shigley §16-2 worked band-brake example — transcribe from the printing, pin in a test
  comment. Pin the golden FIRST: it anchors the b/c lever-arm convention (see Notes).
- Independent cross-check: `pipeline/tests/test_bandbrake_physics.py` re-derives the capstan relation
  by the SAME differential-element dsolve route `test_belt_physics.py` owns — shared oracle,
  cross-referenced in a comment, NOT a forked derivation — and proves the self-locking threshold
  algebraically (SymPy: F_act ≤ 0 iff b ≤ c·e^{μφ} for positive tensions), plus the boundary case
  b = c·e^{μφ} → F_act = 0 exactly, plus the golden.

## Envelopes

- Self-locking: INVALID when `F_act <= 0`, GLOBAL within the differential configuration (decided —
  not scoped): when the brake grabs with zero input, the lever-equilibrium premise that F_act sets
  the band tensions has collapsed; every readout describes a machine in a different regime. This
  upgrades power-screw's self-locking WARN (a feature, for screws) into the catalog's crispest
  refusal (a hazard, for brakes) — failure.mdx tells exactly that story.
- `p > p_allow`: WARN (lining). `sigma_band > sigma_allow`: WARN (band).
- Wrap-angle domain: follow belt-drive's authored φ bounds convention (check its thing.yaml in
  session; do what it does, including whether φ > 2π is legal).
- Positivity on a, b, c, r, b_w, t, μ: structural invalids.

## Materials axis

NONE — imitate belt-drive, which binds no material. μ, p_allow, and sigma_allow are cited FREE KNOBS
with typical ranges from the friction-materials values as printed in Shigley ch. 16 (pin the exact
table number in-session). Shares disk-clutch's future-work note: a friction-lining table is
`data/materials/`-regime material data, not ADR-0009 relation-table work. Flag the no-material-axis
choice consciously in overview and the log.

## Sim sketch

Drum with wrapped band and actuation lever; band stroke thickness encodes the tension gradient along
the wrap (BeltSim precedent); drum rotation-direction arrow; the F_act arrow at the lever end visibly
SHRINKS as μ, φ, or c grows — then the sign flips and `SimRefusal` takes the page. Watching the
required force vanish before the refusal lands is the page's memorable moment; make it legible.
Component `site/src/components/sims/BandBrakeSim.tsx`, draw key `band-brake`, new SVG classes in
`global.css`.

## Deliverables

- `site/src/content/things/band-brake/{thing.yaml, overview.mdx, failure.mdx}`
- `BandBrakeSim.tsx` + draw-key registry entry + `global.css` classes
- `pipeline/tests/test_bandbrake_physics.py` (shared capstan oracle, self-locking theorem, boundary, golden)
- e2e pins: presence + refusal (drive the differential config into self-lock and pin the refusal)
- Display-unit / kind registry entries: N/A

## Exit criteria

- `/things/` shows 31; CLAUDE.md catalog line + README count updated to 31
- `uv run pytest -q` green, ≥ 4 new tests in `test_bandbrake_physics.py` over baseline
- Machine-proven fact: `F_act <= 0 ⇔ b <= c*exp(mu*phi)` proven algebraically in tests; the capstan
  re-derivation agrees with the belt-drive oracle
- Golden pinned with source comment
- Visual pass per §5: normal + self-locked-refusal screenshots, what-was-checked described
- Log entry appended; queue row S14 → DONE with PR# + date
- PHASE 2 CLOSED per protocol §8 (this completer's duty): `docs/sessions/reports/phase-2.md` written
  (template §11); Phase 3 DRAFT briefs (S15–S20) verified/updated against merged reality; queue
  header set to `Active phase: 2 — AWAITING OWNER`; STOP. Reserve ≥ 25–30% context for closure
  BEFORE judging the row finishable — if you cannot fund both the THING and the closure, PAUSE early
  (§9.4) rather than close sloppily. A small follow-on `Docs:` PR is the natural vehicle for closure
  edits after the THING merge.

## Out of scope

Shoe brakes (internal/external, long-shoe pressure distributions) · brake fade / thermal transients ·
band bending stiffness effects · modeling both rotation directions (one direction + named caveat
only) · the friction-lining materials table (future work, shared note with disk-clutch).

## Notes

- Honesty requirement: overview must not oversell. Say plainly that the governing relation lives on
  belt-drive and this page exists for the brake-side consequences — self-energizing, self-locking,
  lining pressure. The queue says it; the page can too.
- Sign conventions are the whole game. Define T_1 (tight side) unambiguously; place lever arms b (T_2
  side) and c (T_1 side) correctly — a swapped b/c silently converts self-energizing into
  de-energizing, and the theorem test will NOT catch a consistently-wrong convention. The pinned
  golden anchors the convention; author relations to match it, not memory.
- Imitate: belt-drive (exp residuals, φ display handling, no material axis, tension-gradient sim),
  power-screw (the self-locking narrative to contrast against), eccentric-column (invalid envelope
  syntax).
- Cross-links to author: belt-drive (same equation, opposite purpose), power-screw (self-locking
  sibling), disk-clutch (axial vs radial friction machines).
