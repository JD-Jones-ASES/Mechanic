# S08 — shaft-critical-speed (cited-constants mechanism: g)

- **ID / Title:** S08 — shaft-critical-speed: Rayleigh + Dunkerley (builds the cited-physical-constants mechanism)
- **Phase:** 2
- **Type:** engine+THING
- **Size:** M
- **Status:** FULL

## Goal

THING #25 live: lateral critical speed of a simply-supported shaft carrying a central disk —
Rayleigh single-mass ω_c = √(g/δ_st) and Dunkerley's estimate including the shaft's own mass, with
the machine-proven theorem that Dunkerley ≤ Rayleigh. PLUS the repo's first cited physical
constant: g = 9.80665 m/s² lands via a new `role: constant` mechanism — rendered as a labeled,
cited value (never a knob), excluded from inputs/DOF arithmetic exactly like materials, citation
mandatory. The mechanism is deliberately small: g only, one consumer here, S09 is the second.

## Entry criteria

Any false → BLOCKED, do not start (protocol §1.6, §9.1).

- Main CI green: `gh run list --branch main --limit 1`
- No PAUSED/IN_PROGRESS rows: `rg -n '\|\s*(IN_PROGRESS|PAUSED)\s*\|' docs/sessions/queue.md` → zero matches
- S07 DONE: `rg "\| S07 \|" docs/sessions/queue.md` → status column reads DONE
- S07's capability exists: `rg frequency pipeline/src/mech_pipeline/kinds.py` → ≥1 match, and
  `rg Hz site/src/engines/units.ts` → ≥1 match
- δ_st parent exists: `test -f site/src/content/things/simply-supported-beam/thing.yaml` (Bash tool)
- acceleration kind exists: `rg acceleration pipeline/src/mech_pipeline/kinds.py` → ≥1 match
- Role enum untouched (this session extends it; anything else = crashed prior work, §9.6):
  `rg -F "role must be free|material|derived" pipeline/src/mech_pipeline/compile.py` → 1 match
- m/s^2 unit absent: `rg -F '"m/s^2"' site/src/engines/units.ts` → zero matches

## New capabilities required

This session BUILDS the following (authority: approved plan, owner ruling 2026-07-04; queue row
S08 names it). Anything beyond: STOP and BLOCK (protocol §9.2).

1. **Cited-physical-constants mechanism** — a `role: constant` variable:
   - `site/src/content.config.ts`: BOTH role enums gain `"constant"` (authored schema ~line 25 AND
     compiled-artifact schema ~line 193 — miss one and parity breaks)
   - `pipeline/src/mech_pipeline/compile.py`: the role check (~line 100) accepts it; constants are
     excluded from inputs/knob/DOF arithmetic exactly like materials — find every material-role
     special case with `rg -n "non_material|role == .material." pipeline/src/mech_pipeline/compile.py`
     and treat constants the same at each site
   - Citation MANDATORY: a constant carries value + unit + source id; build fails loudly without
     it (invariant 5 — a number with no provenance is forbidden)
   - UI: renders as a labeled value with its citation, never a knob — KnobPanel emits no control;
     the value appears with its source the way material values do
   - First constant: g = 9.80665 m/s², "standard acceleration of gravity" — EXACT BY DEFINITION
     (CGPM 3, 1901), not a measurement; cite SI Brochure 9th ed. (2019) / NIST SP 330 and say
     "defined" in the prose
2. **Display unit** `m/s^2` in `site/src/engines/units.ts` (the `acceleration` kind exists in
   kinds.py with no display unit today).

## Physics scope

All closed forms (sqrt); Rayleigh's method is statics + an energy argument — a cited modeling
step, no eigen-solving (the single-mass case is exactly one DOF).

- W = m·g — disk weight; m is the knob, g the constant
- δ_st = W·L³/(48·E·I) — the simply-supported-beam central-load result reused verbatim; I = πd⁴/64
- ω_c = √(g/δ_st) — Rayleigh, single central mass. Cite Shigley 10th ed §7-6, eq. 7-22ff region —
  pin the actual equation number from the actual edition; do not trust memory.
- Dunkerley: 1/ω_cD² = 1/ω_1² + 1/ω_s², ω_1 = Rayleigh above, ω_s = (π²/L²)·√(E·I/(ρ·A)) — uniform
  simply-supported shaft first mode. **TRAP (named in the design): π²-factor conventions vary
  across texts** (some fold g and weight-per-length in). Cite the exact equation and edition; the
  first-principles test derives ω_s independently from the sin(πx/L) mode-shape energy quotient so
  a transcription error cannot survive.
- Readouts: ω_c (rad/s, rpm), f_c = ω_c/2π (Hz — reuses S07's frequency kind), Dunkerley estimate,
  resonance margin against operating-speed knob N_op
- Machine-proven identities (pytest): (a) ω_c = √(k/m) with k = W/δ_st ⇒ g cancels W ⇒ √(g/δ_st),
  symbolically; (b) Dunkerley ≤ Rayleigh (lower-bound property) across numeric samples.

Citations: Shigley 10th ed §7-6 (critical speeds: Rayleigh, Dunkerley), equation-pinned; Juvinall
& Marshek as cross-check. Golden: a pinned Shigley §7-6 worked example if accessible; else a
hand-checkable steel-shaft value with arithmetic in the test comment.

## Envelopes

- **warn**, global: resonance band — |N_op − ω_c|/ω_c < 0.20. Physical reason: near ω_c the
  undamped model's whirl amplitude grows without bound; operating margin is standard practice.
  Cite what the source actually recommends — if Shigley/Juvinall state a different margin, use
  the source's number, not this sketch's.
- Declared assumptions (assumptions list, not envelopes): disk at midspan; bearings as simple
  supports; shaft flexure only (no gyroscopic terms, no damping).

No invalid envelope by design — do not invent one; the e2e refusal pin becomes a warn-band pin,
declared in the PR body.

## Materials axis

E (stiffness → δ_st → ω_c), ρ (shaft self-mass → Dunkerley's ω_s — density DROPS the estimate;
stiffness raises it: two independent axes visible on one page). The disk mass m is a free knob,
not material-bound — the disk is a payload, not a modeled body; say so in overview.mdx. No new
property columns.

## Sim sketch

Side view: shaft on two bearing pedestals, central disk, exaggerated static sag δ_st; whirl bow
animated via `useSimClock` — **presentation of the solved state, not integration; mandatory code
comment, same as S07 (batch discipline).** Speed axis with N_op marker, ω_c and Dunkerley marks,
warn band shaded; knobs visibly move the marks. Draw key `"shaft-critical-speed"` in the
ThingWidget.tsx slug map; component `site/src/components/sims/ShaftCriticalSpeedSim.tsx`; new SVG
classes in `global.css`.

## Deliverables

- Mechanism: content.config.ts (role enums ×2), compile.py (role check + exclusion at every
  material-special-cased site + mandatory-citation check), pipeline tests for the mechanism
  (constant excluded from DOF; missing citation fails the build; planetary unaffected)
- `site/src/engines/units.ts`: `m/s^2`
- `site/src/content/things/shaft-critical-speed/{thing.yaml, overview.mdx, failure.mdx}`
- `ShaftCriticalSpeedSim.tsx` + ThingWidget registration + global.css classes
- `pipeline/tests/test_shaft_critical_speed_physics.py` — g-cancellation identity, independent
  mode-shape derivation of ω_s, Dunkerley ≤ Rayleigh sampling, numeric golden
- Site unit/e2e: g renders as labeled cited value with NO input control; presence + warn-band pins
- Bookkeeping (protocol §7)

## Exit criteria

- Catalog count = 25 on `/things/` and in CLAUDE.md + README
- `uv run pytest -q` green, ≥ +5 tests vs pre-session count (mechanism tests + physics tests)
- Machine-proven facts: Dunkerley ≤ Rayleigh across samples; ω_c = √(g/δ_st) derived from √(k/m)
  with g cancelling W, symbolically
- planetary-gearset still compiles at 2 DOF after the role change (cold `pnpm build` green — the
  invariant-1 reference case; if it breaks, the change is wrong, not the gearset)
- e2e proves g is displayed with citation and is not a knob
- Visual pass per protocol §5 (normal + warn band; screenshots; what-was-checked described)
- Log entry appended; queue row DONE with PR# and date

## Out of scope

- Any constant other than g; a constants registry/database; per-THING constant overrides
- Multi-mass Rayleigh–Ritz, transfer matrix, gyroscopic effects, damping, actual whirl dynamics
- Solving for L or d given a target ω_c beyond what authored closed forms already give

## Notes

- Branch `phase2/shaft-critical-speed` (engine+THING → capability naming per protocol §2).
- Order of work: land the role mechanism WITH its tests first (schema → compile → UI → cold build
  proving all 24 existing THINGs and their DOF counts unchanged), THEN author the THING. The
  cross-cutting change is small but touches four layers; interleaving it with authoring is how
  silent DOF drift happens.
- Kind discipline: ω_c is `angular_velocity` (rad/s, rpm); f_c is `frequency` (Hz). Blurring them
  un-does S07's entire point.
- Imitate: simply-supported-beam (δ_st source of truth — say in overview.mdx that δ_st is
  literally its headline result, chain-port pair #2), torsional-oscillator (presentation-comment
  discipline, f readout), flywheel-disk (disk drawing). Cross-link eccentric-column as the sibling
  "the margin is not where you think" page.
- S09's entry criteria check this mechanism exists — a half-landed mechanism blocks the batch.
