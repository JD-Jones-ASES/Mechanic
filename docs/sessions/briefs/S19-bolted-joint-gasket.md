# S19 — bolted-joint-gasket (separation = global refusal)

- **ID / Title:** S19 — bolted-joint-gasket (separation = global refusal)
- **Phase:** 3
- **Type:** THING
- **Size:** M
- **Status:** DRAFT — verified by the Phase 2 closing session against merged reality before execution

## Goal

THING `bolted-joint-gasket` is live: a preloaded gasketed joint under external tensile load, with
bolt stiffness k_b and combined member+gasket stiffness k_m as DIRECT input knobs, a 2×2
solve_linear group for {F_b, F_m}, readouts C = k_b/(k_b+k_m), bolt stress vs proof strength, and
separation margin P₀ = F_i/(1−C). Separation (F_m ≤ 0) is a GLOBAL invalid refusal. Shigley
ch. 8 cited; failure.mdx names fatigue as the real killer. Pure S15 consumer — zero new machinery.

## Entry criteria

Any false → BLOCKED, do not start (protocol §1.6, §9.1).

- Main CI green: `gh run list --branch main --limit 1`
- No claimed/suspended rows (table cells, not the legend line):
  `rg -n '\|\s*(IN_PROGRESS|PAUSED)\s*\|' docs/sessions/queue.md` → zero hits
- Phase 3 ruled: `rg "Phase 3 approved" docs/sessions/queue.md` → the literal ruling line exists
- S15 DONE (the ONLY dependency): `rg "S15.*DONE" docs/sessions/queue.md`; capability present:
  `rg "solve_linear" site/src/content.config.ts` and `test -d site/src/content/things/propped-cantilever`
- Kinds exist: `rg '"stiffness"' pipeline/src/mech_pipeline/kinds.py` (shipped with
  helical-spring) and `rg '"pressure_stress"' pipeline/src/mech_pipeline/kinds.py`
- Slug free: `test ! -d site/src/content/things/bolted-joint-gasket`

Parallel-safe with S16–S18 (decided): any post-S15 order is legal within Phase 3; the default
remains the topmost QUEUED row per protocol §1.

## New capabilities required

**NONE — if this work turns out to need a new engine/pipeline/schema capability, STOP and BLOCK
(protocol §9.2); do not improvise one.** The direct-stiffness-input design exists precisely to
avoid a frusta capability.

## Physics scope

All modeling questions below are DECIDED — implement, do not redesign.

Inputs (knobs): F_i preload (force), P external tensile load (force), k_b bolt stiffness
(`stiffness` kind), k_m combined member+gasket stiffness (`stiffness` kind), A_t tensile stress
area (area), S_p proof strength (`pressure_stress` kind, direct knob).

- k_b and k_m are DIRECT stiffness inputs, NOT computed from frusta geometry — frusta-based
  member stiffness is named future work in overview.mdx.
- The joint is GASKETED: k_m is the series combination of metal members and gasket, supplied as
  one number. Overview says so, and notes the legibility moment: a soft gasket (low k_m) drives
  C up, so the bolt absorbs more of P.
- S_p is a direct knob because bolt strength classes (SAE/ISO grades, Shigley's proof-strength
  tables) are spec classes, not seeded materials. Default it to a published grade value; cite it.

Relations (undirected residuals; solve_linear group `{F_b, F_m}`, 2×2), with F_m = residual clamp
force taken POSITIVE in compression:

- Equilibrium: `F_b − F_m − P = 0`
- Compatibility (equal incremental deflection): `(F_b − F_i)/k_b − (F_i − F_m)/k_m = 0`

Closed forms the certificate must reproduce: `F_b = F_i + C·P`, `F_m = F_i − (1−C)·P` with
`C = k_b/(k_b + k_m)`. Derived readouts: C (ratio), P₀ = F_i/(1−C) (force), σ_b = F_b/A_t
(pressure_stress), n_p = S_p·A_t/F_b (safety_factor).

Citations: Shigley's *Mechanical Engineering Design* (Budynas & Nisbett), ch. 8 — fastener
stiffness, member stiffness, and tension-joint external-load sections; pin edition and exact §
numbers against the copy actually consulted, never from memory (protocol §3.4). Golden: an
accessible Shigley ch. 8 worked example if pinnable; ELSE a hand-derived numeric golden (pick
k_b/k_m giving a clean C, e.g. C = 1/4, verify every number by hand). Either is authorized —
label which, honestly, in the test comment and `sources[].verification`.

Cross-check `test_boltedjoint_physics.py`: re-derive C from spring first principles (springs
sharing an incremental deflection — stiffness-weighted load split), independent of thing.yaml
residuals; assert F_b = F_i + C·P and F_m = F_i − (1−C)·P against the emitted functions.

## Envelopes

- `F_m ≤ 0` → **GLOBAL invalid** (unscoped — decided): the joint has separated; the linear
  load-sharing model is void everywhere past separation (the bolt takes all of P; C is
  meaningless). Whole-evaluation refusal. Do NOT soften to warn, do NOT scope it, do NOT model
  post-separation behavior.
- `σ_b ≥ S_p` → **warn**: bolt loaded past proof — preload is no longer guaranteed, but the
  linear math still holds, hence warn not invalid.
- Knob ranges enforce F_i > 0, k_b > 0, k_m > 0, A_t > 0 (a joint without preload or with a
  degenerate spring is not this model).

## Materials axis

NO material binding — decided, and honest: E never enters (stiffnesses are direct inputs by
design) and bolt strength comes from grade tables via the S_p knob, which no seeded material
represents. State this reasoning in overview.mdx; name frusta-based k_m and a bolt-grade table
as future work. Do not add a token material dropdown to look invariant-3 compliant — a material
axis that changes nothing would be dishonest.

## Sim sketch

Joint cross-section: bolt through two clamped members with a visible gasket line. Force-share
bars for F_b and F_m animating as the P knob cranks toward P₀; at separation the readouts are
withheld and SimRefusal replaces them. All displayed numbers come from emitted fns — no math in
the widget (invariant 4). Register draw key `bolted-joint-gasket`; imitate helical-spring's
registration pattern (nearest stiffness-knob sibling). New SVG classes go in `global.css`.

## Deliverables

- `site/src/content/things/bolted-joint-gasket/{thing.yaml, overview.mdx, failure.mdx}`
  (failure.mdx: fatigue is the real killer — fluctuating bolt-stress amplitude scales with C;
  point at the Phase 5 endurance-limit column)
- Sim draw component + CSS classes
- `pipeline/tests/test_boltedjoint_physics.py` (independent cross-check + golden)
- e2e pins: presence; **separation refusal — crank P past P₀ → invalid banner, readouts
  withheld, SimRefusal visible**; warn pin at σ_b ≥ S_p
- No kind/unit registry entries expected (see Notes on display units); bookkeeping per protocol §7

## Exit criteria

- Catalog count = start + 1 on `/things/` and in CLAUDE.md/README (absolute number depends on
  the S14 shed decision and Phase 3 ordering — compute from the queue at execution)
- `uv run pytest -q` green; `test_boltedjoint_physics.py` contributes ≥2 tests (cross-check,
  golden)
- Machine-proven fact: F_b = F_i + C·P and F_m = F_i − (1−C)·P back-substitute to zero into both
  relations at every verification sample, with the det(A) guard (k_b + k_m ≠ 0) emitted
- `pnpm build` + unit + e2e + axe green; separation-refusal pin green; visual pass per §5 with
  normal AND separated states screenshotted and described
- Citations pinned per §3.4; golden labeled published-or-hand-derived honestly
- Log entry appended; queue row S19 → DONE with PR#; deploy spot-checked

## Out of scope

Frusta member-stiffness computation (named future work); bolt-grade/thread geometry tables;
fatigue math (Goodman lines — Phase 5 endurance column); torque–preload relation (T = K·F_i·d);
multi-bolt patterns and load eccentricity; material binding; post-separation modeling of any
kind.

## Notes

- SIGN-CONVENTION TRAP: Shigley writes F_m = (1−C)·P − F_i with compression negative; this THING
  uses residual clamp POSITIVE (F_m = F_i − (1−C)·P; separation at F_m ≤ 0). Reconcile when
  pinning the golden or the test fails on signs, not physics — name the source's convention in
  the test comment.
- `stiffness` (N/m) shares dimensions with `line_load` — the kind keeps them apart; k_b and k_m
  MUST carry `stiffness`.
- Display units: helical-spring should already cover stiffness display — verify with
  `rg "N/m" site/src/engines/units.ts`. If kN/m or MN/m is wanted and missing, a DISPLAY_FACTORS
  row for an existing kind is routine data covered by check-units, not a capability.
- Siblings to imitate: helical-spring (stiffness knobs), propped-cantilever (solve_linear
  syntax + solve-provenance display), euler-column/eccentric-column (refusal wiring precedent —
  note theirs is scoped; yours is GLOBAL, the simpler original path).
- Branch name: `thing/bolted-joint-gasket`. PR title per §6:
  `THING <N>: bolted-joint-gasket (Phase 3 load-sharing)`.
