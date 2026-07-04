# S07 — torsional-oscillator (frequency kind; Hz/s/ms units)

- **ID / Title:** S07 — torsional-oscillator: disk-on-shaft natural frequency (builds the `frequency` kind + Hz/s/ms display units)
- **Phase:** 2
- **Type:** THING
- **Size:** M
- **Status:** FULL

## Goal

THING #24 live: a disk on an elastic shaft, ω_n = √(k_t/J_d), f = ω_n/2π, period T = 1/f — the
catalog's first vibration page, computed entirely from algebra at the knob state. No ODE is
integrated anywhere; the SHM step enters by citation. When done, the `frequency` quantity kind
exists and is chain-incompatible with `angular_velocity` despite identical dimensions, and the
`Hz`/`s`/`ms` display units resolve in `check-units`. The overview names this page as the Phase 4
curated-chain teaser (motor → shaft → flywheel): k_t IS torsion-shaft's result, J_d IS
flywheel-disk's — the strongest chain-port pair in the catalog.

## Entry criteria

Any false → BLOCKED, do not start (protocol §1.6, §9.1).

- Main CI green: `gh run list --branch main --limit 1`
- No PAUSED/IN_PROGRESS rows: `rg "PAUSED|IN_PROGRESS" docs/sessions/queue.md` → zero matches
- Prior row DONE (strict top-to-bottom order): `rg "\| S06 \|" docs/sessions/queue.md` → status column reads DONE
- Parent THINGs whose results are reused verbatim exist:
  `test -f site/src/content/things/torsion-shaft/thing.yaml && test -f site/src/content/things/flywheel-disk/thing.yaml` (Bash tool)
- `frequency` kind not yet present (this session adds it; a hit means a stale brief or crashed
  prior work — reconcile per §9.6, do not double-add): `rg frequency pipeline/src/mech_pipeline/kinds.py` → zero matches
- Hz unit not yet present: `rg Hz site/src/engines/units.ts` → zero matches

## New capabilities required

This session BUILDS the following (authority: owner-approved Batch 3 design + queue row S07,
ruling 2026-07-04). Anything beyond them: STOP and BLOCK (protocol §9.2); do not improvise.

1. **`frequency` quantity kind** in `pipeline/src/mech_pipeline/kinds.py` — dims `[0,0,-1,0,0,0,0]`,
   the SAME vector as `angular_velocity`, deliberately incompatible so an f-port can never chain
   into an ω-port silently. This is exactly the torque/bending_moment move; write the comment in
   that style. The conversion is never implicit: ω = 2πf is an explicit relation on the page.
2. **Display units** in `site/src/engines/units.ts` `DISPLAY_FACTORS`: `Hz` (factor 1), `s`
   (factor 1 — the `time` kind exists today with NO display unit), `ms` (1e-3).

## Physics scope

All closed forms (sqrt); author solved forms per knob configuration per `docs/authoring-things.md`.

- k_t = G·J_p/L — verbatim from torsion-shaft (J_p = πd⁴/32, polar second moment of area)
- J_d = m·r²/2 with m = ρ·π·r²·t — verbatim from flywheel-disk (mass moment, kind `moment_of_inertia`)
- ω_n² = k_t/J_d — the SHM step: a **cited modeling step verified as a definition** (physics enters
  by citation here; this is the declared audit surface per CLAUDE.md invariant 5). Everything
  downstream is algebra SymPy verifies.
- f = ω_n/(2π) — explicit relation; f carries the new `frequency` kind
- T_per = 1/f — period, `time` kind, displayed in s/ms
- θ_st = T_app·L/(G·J_p) — static twist under applied torque, the bridge readout to torsion-shaft
- τ_max = 16·(k_t·Θ)/(πd³) — surface shear at oscillation-amplitude knob Θ (dynamic torque k_t·Θ)

Amplitude-independence is the pedagogical point: ω_n contains no Θ — prove it symbolically.

Citations: Shigley 10th ed §7-6 opening (torsional systems); Juvinall & Marshek (shaft vibration
sections); Timoshenko, *Vibration Problems in Engineering* (the classical SHM source). Every
`sources[]` entry carries `verification:` with method + date; "not section-pinned" is honest,
a fabricated §-number is not (protocol §3.4).

First-principles test: re-derive ω_n from energy — max KE (½·J_d·ω_n²·Θ²) = max PE (½·k_t·Θ²) —
independent of the force-balance route. Golden: a pinned Timoshenko worked example if accessible;
otherwise a hand-checkable steel-shaft value with the arithmetic in the test comment
(the compound-cylinder pattern).

## Envelopes

- **warn**, global: shaft inertia not negligible — J_shaft = ρ·(π/32)·d⁴·L computed honestly from
  ρ; warn when J_shaft/J_d > 0.1. Physical reason: the lumped-parameter model assumes the shaft
  stores stiffness but no kinetic energy.
- **warn**, global: τ_max ≥ σ_y/2 at amplitude Θ (torsion-shaft's Tresca convention). Physical
  reason: shear yield during oscillation voids linear elasticity.

No invalid envelope by design — do NOT invent one to satisfy the refusal-pin habit; the e2e
refusal pin becomes a warn-banner pin here (state this in the PR body as a declared deviation
from the §3.6 minimum, per this brief).

## Materials axis

G (stiffness axis → ω_n up), ρ (mass axis → J_d up → ω_n DOWN — the counterintuitive cascade;
this page's "Ti-6Al-4V deflects MORE" moment is that a denser disk on the same shaft rings lower),
σ_y (strength axis → shear warn only). One material binds both disk and shaft — a declared
simplification stated in overview.mdx (multi-material slots are Phase 3 / S17, not now). No new
property columns.

## Sim sketch

Fixed wall, shaft, disk at the free end, face marker swinging Θ·sin(2π·f·t) with the phase driven
by `useSimClock` scaled by the computed f. **The animation is PRESENTATION of the solved state,
not integration — write a code comment at the useSimClock call saying exactly that.** This batch's
discipline is dynamics-without-a-clock; the first sim that integrates dθ/dt has violated the batch
design. Amplitude knob visibly scales the swing; material/geometry knobs visibly change the
animated frequency. Draw key `"torsional-oscillator"` registered in the slug→component map in
`site/src/components/ThingWidget.tsx`; component `site/src/components/sims/TorsionalOscillatorSim.tsx`;
new SVG classes go in `global.css`.

## Deliverables

- `site/src/content/things/torsional-oscillator/{thing.yaml, overview.mdx, failure.mdx}` —
  overview names the Phase 4 chain teaser explicitly; failure.mdx covers fatigue at resonance and
  what the lumped model hides
- `pipeline/src/mech_pipeline/kinds.py`: `frequency` kind + deliberate-incompatibility comment
- `site/src/engines/units.ts`: `Hz`, `s`, `ms` entries
- `site/src/components/sims/TorsionalOscillatorSim.tsx` + ThingWidget registration + global.css classes
- `pipeline/tests/test_torsional_oscillator_physics.py` — energy re-derivation, amplitude-independence,
  numeric golden with pinned source
- site unit test: `connectionLegal` (site/src/engines/units.ts) rejects frequency→angular_velocity
  (same dims, different kind)
- e2e: presence pin + warn-banner pin
- Bookkeeping (protocol §7): queue row, log entry, CLAUDE.md/README catalog counts, roadmap tick

## Exit criteria

- Catalog count = 24 on `/things/` and in CLAUDE.md + README
- `uv run pytest -q` (pipeline/) green, ≥ +4 tests vs pre-session count
- Machine-proven facts: (a) energy-route ω_n ≡ force-balance form, symbolically; (b) ω = 2πf holds
  and ω_n contains no amplitude symbol; (c) `connectionLegal` refuses an f→ω connection despite
  equal dimension vectors (unit test)
- `pnpm build` green including `check:units` with Hz/s/ms authored on the page
- Visual pass per protocol §5: oscillation visibly speeds/slows with knobs; warn banner seen;
  normal + warn screenshots in scratchpad; what-was-checked described in PR body and log
- Log entry appended per §11; queue row DONE with PR# and date

## Out of scope

- Any time integration, damping, forced response, resonance curves — the schema never sees a time series
- Multi-disk systems / Holzer method / geared torsional systems
- Chain UI (Phase 4): author chain-worthy ports, build no chaining
- Separate disk vs shaft materials (Phase 3, S17)

## Notes

- Symbol-collision trap: torsion-shaft's J is polar SECOND MOMENT OF AREA (m⁴, kind
  `second_moment_of_area`); the disk's is MASS moment of inertia (kg·m², kind `moment_of_inertia`).
  Use J_p and J_d throughout — the dimensional gate catches misuse, but prose and LaTeX must not blur them.
- The `s`/`ms` units belong to the TIME kind (period readout). Frequency displays in Hz only.
- Declare ω_n² = k_t/J_d as a modeling step per `docs/authoring-things.md`; do not attempt to
  "derive" SHM — SymPy verifies equivalence, not physics (CLAUDE.md invariant 5).
- Imitate: torsion-shaft (relation style, τ < σ_y/2 warn convention), flywheel-disk (ρ→m→J_d
  cascade and `moment_of_inertia` usage).
- Branch `thing/torsional-oscillator`; PR title `THING 24: torsional oscillator (Phase 2 dynamics: frequency kind)`.
