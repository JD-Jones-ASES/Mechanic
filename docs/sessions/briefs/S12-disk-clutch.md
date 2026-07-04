# S12 — disk-clutch

- **ID / Title:** S12 — disk-clutch (uniform wear vs uniform pressure, parallel readouts)
- **Phase:** 2
- **Type:** THING
- **Size:** S
- **Status:** FULL

## Goal

THING #29 live at `/things/disk-clutch/`: axial disk clutch/brake torque capacity with BOTH classical
pressure models presented as parallel readouts — the combined-shaft Tresca/von-Mises page pattern —
plus max lining pressure, slip-power readouts, and the r_i = r_o/√3 optimum as a derived readout.
The bracket theorem T_uw ≤ T_up (equality as r_i → r_o) is machine-proven in tests. Catalog 28 → 29.

## Entry criteria

Each with a check command; any false → BLOCKED, do not start (protocol §1.6).

- Main CI green: `gh run list --branch main --limit 1`
- No PAUSED/IN_PROGRESS rows: `rg -n '\|\s*(IN_PROGRESS|PAUSED)\s*\|' docs/sessions/queue.md`
  → expect NO match (exit 1)
- Dependency S11 DONE (strict queue order): `rg -n '^\| S11 .*DONE' docs/sessions/queue.md` → one match
- `friction_coefficient` kind exists: `rg -n 'friction_coefficient' pipeline/src/mech_pipeline/kinds.py` → matches
- Parallel-readout precedent exists: `test -f site/src/content/things/combined-shaft/thing.yaml` (Bash) → true
- Bracket-proof precedent exists: `rg -in 'bracket' pipeline/tests/test_combined_physics.py` → matches

## New capabilities required

**NONE — if this work turns out to need a new engine/pipeline/schema capability, STOP and BLOCK
(protocol §9.2); do not improvise one.** No new kinds, no new display units (friction_coefficient,
pressure_stress, torque, power, angular_velocity all exist).

## Physics scope

Per friction face (N faces multiply — see Notes on per-face bookkeeping):

- Uniform pressure: `T_up = (2/3) * mu * F * (r_o**3 - r_i**3) / (r_o**2 - r_i**2)`
- Uniform wear: `T_uw = mu * F * (r_o + r_i) / 2`
- Max lining pressure (uniform wear, at r_i): `p_max = F / (2*pi*r_i*(r_o - r_i))` — compared against
  a cited allowable knob `p_allow`.
- Slip power as paired readouts matching the torque pair: `P_up = T_up*omega_slip`,
  `P_uw = T_uw*omega_slip` (ω_slip a knob; the parallel pattern carries through — no silent winner).
- Optimum as a derived readout: `r_i_opt = r_o/sqrt(3)`, from maximizing T_uw at fixed p_max
  (`T = pi*mu*p_max*r_i*(r_o**2 - r_i**2)`, dT/dr_i = 0). The d/dr_i argument is a derivation step
  SymPy verifies.
- Bracket theorem (the machine-proven fact): per face,
  `T_up - T_uw = mu*F*(r_o - r_i)**2 / (6*(r_o + r_i)) >= 0`, hence T_uw ≤ T_up with equality iff
  r_i = r_o (thin-annulus limit). SymPy proves the identity symbolically; mirror
  `test_combined_physics.py::test_criteria_bracket`.
- Citations: Shigley 10th ed ch. 16, §16-5 (frictional-contact axial clutches: both derivations and
  the r_i optimum); Juvinall & Marshek ch. 18 cross-check.
- Golden: a Shigley §16-5 worked plate-clutch example — transcribe from the printing, pin in a test comment.
- Independent cross-check: `pipeline/tests/test_clutch_physics.py` re-derives BOTH torque integrals
  from first principles with `sympy.integrate` — `T = ∫ mu*p(r)*r * 2*pi*r dr` with p = const
  (uniform pressure) and p·r = const (uniform wear), eliminating p via `F = ∫ p dA` per model. Direct
  integration, not thing.yaml residuals.

## Envelopes

- `r_i < r_o`: INVALID, global — the annulus does not exist; nothing on the page is meaningful.
- `p_max > p_allow`: WARN — lining overloaded relative to the cited allowable; the run-in/wear story
  in failure.mdx.
- Positivity on F, μ, radii, ω_slip: structural invalids.

## Materials axis

NONE bound from `data/materials/`. μ and `p_allow` are cited FREE KNOBS with typical dry-lining
ranges in the knob bounds, cited to the friction-materials table as printed in Shigley ch. 16 (pin
the exact table number in-session). State in overview.mdx (or log) that a friction-lining materials
table is FUTURE WORK belonging to the `data/materials/` provenance regime (basis + errata
discipline) — it is material data, NOT the ADR-0009 relation-table capability. Flag the
no-material-axis choice consciously, as S11 does.

## Sim sketch

Annular friction interface with the two pressure profiles p(r) drawn side by side — flat (uniform
pressure) vs ∝ 1/r peaking at r_i (uniform wear) — each above its own torque readout, imitating
combined-shaft's two-model presentation. Knobs r_i/r_o morph the profiles; mark r_i_opt = 0.577·r_o
on the radius axis. Optional slip rotation via `useSimClock`. `SimRefusal` when r_i ≥ r_o.
Component `site/src/components/sims/ClutchSim.tsx`, draw key `disk-clutch`, new SVG classes in
`global.css`.

## Deliverables

- `site/src/content/things/disk-clutch/{thing.yaml, overview.mdx, failure.mdx}`
- `ClutchSim.tsx` + draw-key registry entry + `global.css` classes
- `pipeline/tests/test_clutch_physics.py` (two integrals, bracket theorem + equality limit, optimum, golden)
- e2e pins: presence + refusal (r_i ≥ r_o)
- Display-unit / kind registry entries: N/A

## Exit criteria

- `/things/` shows 29; CLAUDE.md catalog line + README count updated to 29
- `uv run pytest -q` green, ≥ 5 new tests in `test_clutch_physics.py` over baseline
- Machine-proven fact: T_uw ≤ T_up via the `(r_o - r_i)**2 / (6*(r_o + r_i))` identity, with the
  r_i → r_o equality limit, proven symbolically in tests; the r_i_opt derivation step verified in the
  pipeline
- Golden pinned with source comment
- Visual pass per §5: normal + refused screenshots, what-was-checked described
- Log entry appended; queue row S12 → DONE with PR# + date

## Out of scope

Cone clutches · engagement transient / temperature rise (time integration is out of v1) · wear-life
prediction · the friction-lining materials table (named future work only) · multi-disk stack
mechanics beyond the N-face multiplier.

## Notes

- No silent winner: overview presents uniform wear as what designers use after run-in (cited) and
  uniform pressure as the new/rigid-clutch model. The page shows both and says why they differ; it
  does not pick.
- Per-face vs total torque is the classic transcription trap — Shigley's formulas are per pair of
  mating surfaces. Be explicit in every relation which one it expresses; N (friction faces) is
  `count` kind with the integer flag.
- Pin the golden BEFORE finalizing conventions — it anchors whether F is per-face or total in the
  cited example.
- Imitate: combined-shaft (parallel-model readouts and its bracket-proof test), flywheel-disk (what
  the clutch accelerates — the Phase 4 motor → clutch → flywheel chain), power-screw and belt-drive
  cross-links (friction as budget vs friction as the product — the three-page friction arc).
