# S25 — Curated example chains + spin-up story + Phase 4 close

- **ID / Title:** S25 — curated examples as frozen v1 URLs, flywheel spin-up relation, phase closure
- **Phase:** 4
- **Type:** feature + docs (plus one additive THING amendment — full gate applies to it)
- **Size:** L — solo; never claimed via the continuation rule. If mid-session the work grows
  beyond L, that is a PAUSED trigger (protocol §9.4), not a license to rush.
- **Status:** DRAFT — verified by the Phase 3 closing session against merged reality before execution

## Goal

`/chain-builder/` opens with curated example cards — frozen v1 URLs with prose walkthroughs. The
headline is the roadmap's spin-up story: sun torque → planetary → shaft → flywheel, where the
gear ratio visibly trades spin-up time against shaft stress ("what it costs in stress"). Spin-up
time comes from a NEW cited, pipeline-verified relation in flywheel-disk's `thing.yaml` — never
chain-level widget math (invariant 4). Two more examples ship (belt-drive → torsion-shaft; one
Phase 3 indeterminate consumer chain), each with a hand-derived e2e golden. Then the session
closes Phase 4 per protocol §8 and STOPS for owner direction.

## Entry criteria

Each with a check command; any false → BLOCKED, do not start (protocol §1.6, §9.1).

- Main CI green: `gh run list --branch main --limit 1`
- Phase 4 ruling line present (protocol §8): `rg -n "Phase 4 approved — JD" docs/sessions/queue.md`
- No PAUSED/IN_PROGRESS rows: `rg -n '\|\s*(IN_PROGRESS|PAUSED)\s*\|' docs/sessions/queue.md` returns nothing
- S22, S23, S24 DONE in queue: `rg -n "^\| S2[234]" docs/sessions/queue.md` shows all DONE
- Frozen v1 URL machinery exists: `rg -n "v1=" site/src/engines/chain-url.ts` and the
  append-only contract test: `rg -n "COMPATIBILITY CONTRACT" site/e2e/chain-url.spec.ts`
- flywheel-disk shipped and amendable: `test -f site/src/content/things/flywheel-disk/thing.yaml`
  and `rg -n "I_z" site/src/content/things/flywheel-disk/thing.yaml`
- Seconds display unit exists (S07 added Hz/s/ms): `rg -n '\bs: \{ factor: 1' site/src/engines/units.ts`
  — if absent, adding `s` to `DISPLAY_FACTORS` is an ordinary deliverable here, not a capability.
- Phase 3 THINGs available for the indeterminate example: `rg -n "^\| S1[5-9]" docs/sessions/queue.md`
  shows DONE rows (if the relevant THING was SKIPPED, substitute per Notes and log the deviation).

## New capabilities required

**NONE — if this work turns out to need a new engine/pipeline/schema capability, STOP and BLOCK
(protocol §9.2); do not improvise one.** In particular (DECIDED, owner ruling 2026-07-04):
- **Torque source = REUSE-ONLY in v1.** The spin-up story drives the chain with the planetary's
  existing `T_s` knob, and the walkthrough copy frames that honestly ("the sun-torque knob stands
  in for a motor"). A minimal motor THING (linear torque–speed curve: stall torque + no-load
  speed) is named in the phase report as an OPTIONAL FOLLOW-UP owner decision — it is NOT built
  inside this session. Building it here would smuggle a full per-THING gate into a UI session.
- The flywheel amendment below is authored-content work through the existing pipeline — not a new
  capability.

## Physics scope

DECIDED: spin-up time lives IN flywheel-disk, appended to its `thing.yaml` as an additive
amendment (automatic re-verification — the fingerprint changes, the whole pipeline gate re-runs).
- Relation: `t_spin = I·Δω/T` (design wording; on-disk inertia symbol is `I_z` — use it).
  v1 interpretation DECIDED: spin-up from rest to the existing `omega` knob, so
  `t_spin = I_z·omega/T_d`.
- New variables: `T_d` (drive torque; dim of torque; `quantity_kind: torque`; input) and `t_spin`
  (dim `[0,0,1,0,0,0,0]`; `quantity_kind: time`; target — the kind already exists in
  `pipeline/src/mech_pipeline/kinds.py`). Display units: `s` (see entry criterion).
- Citation: angular impulse–momentum, `∫T dt = I·Δω` with constant T. Suggested canonical source:
  Hibbeler, *Engineering Mechanics: Dynamics*, 14th ed., Ch. 19 (planar impulse and momentum) —
  pin per protocol §3.4 (verify the actual chapter/section against an accessible copy; an honest
  "not section-pinned" beats a fabricated §).
- Golden: hand-derived (flywheel defaults: compute I_z, pick T_d, verify t_spin by hand in the
  test comment) + the chain-level e2e golden through 4 nodes.
- Independent cross-check: new `pipeline/tests/test_flywheel_spinup_physics.py` re-deriving
  t_spin from angular impulse–momentum (e.g. SymPy `dsolve` of I·dω/dt = T from rest) — NOT by
  importing the thing.yaml residual.

## Envelopes

New guard on the spin-up relation (DECIDED): `T_d > 0`, severity `invalid`, **scoped to
`[t_spin]`** — zero or negative drive torque never reaches ω, but the flywheel's stress/energy
outputs don't depend on T_d, so a global refusal would be dishonest. Physical reason stated in
the message. This is a deliberate second use of scoped refusal (Euler/Johnson precedent).
Existing flywheel envelopes (yield-speed etc.) are untouched.

## Materials axis

No new bindings. flywheel-disk already binds ρ, σ_y, ν; `I_z` inherits ρ, so t_spin moves with
material — the walkthrough gets the invariant-3 beat for free ("denser flywheel, slower spin-up").

## Sim sketch

No new sim. Example cards render on `/chain-builder/` (static, authored in the astro page or an
imported MDX partial): title, one-paragraph walkthrough, the frozen v1 URL as a plain link.
Headline walkthrough narrative (DECIDED): gear ratio trades spin-up time against shaft stress —
crank the ratio, t_spin falls, τ rises; the prose names both numbers and the honest torque-source
framing. Any new card CSS goes in `global.css`.

## Deliverables

- flywheel-disk amendment: `thing.yaml` (+T_d, +t_spin, +relation with citation, +scoped guard,
  +authored solved form in the plan); `overview.mdx` may gain a short spin-up paragraph;
  `failure.mdx` untouched. Full per-THING gate applies to this amendment (protocol §3, all items).
- `pipeline/tests/test_flywheel_spinup_physics.py` (independent cross-check + hand-checked golden).
- Three example cards with frozen v1 URLs + walkthroughs on `/chain-builder/`:
  1. HEADLINE: planetary (T_s as source, honest framing) → torsion-shaft → flywheel-disk spin-up.
  2. belt-drive → torsion-shaft.
  3. One Phase 3 indeterminate consumer chain — a legal force/torque output feeding a Phase 3
     indeterminate THING; the S20 verification pass pins the exact pair against the merged
     catalog (this is the one deliberately-open slot in this brief; choose the simplest legal
     wire, log the choice).
- `site/e2e/chain-examples.spec.ts`: each curated URL decodes into the exact pinned chain and
  matches a hand-derived golden, derivation shown in test comments (`chain-demo.spec.ts`
  precedent); headline pins power conservation through ≥3 nodes AND the t_spin value.
- Phase 4 closure (protocol §8): `docs/roadmap.md` Phase 4 marked shipped with date; `CLAUDE.md`
  reconciled — in Out of scope, "full chaining UI (`/chain-demo/` is the one shipped demo)" is
  replaced to reflect the shipped chain-builder, and the "Where things live" phase status line
  updated; `README` chaining sentence if present; `docs/sessions/reports/phase-4.md` per the §11
  template; queue header → `Active phase: 4 — AWAITING OWNER`.
- Bookkeeping per protocol §7.

## Exit criteria

- `pnpm build` green cold (flywheel re-verified end to end); `uv run pytest -q` green with count
  ≥ previous + 1 (record both counts in the log).
- Machine-proven fact: the authored `t_spin` solved form is SymPy-verified against the spin-up
  relation (symbolic + numeric sampling) and dimensionally homogeneous — the number in the story
  is pipeline-proven, not widget math.
- Catalog count UNCHANGED (no new THING — motor deferred to owner); `/things/` count and
  CLAUDE.md/README counts still agree.
- All three curated URLs load their exact chains; `pnpm exec playwright test` fully green
  including `chain-examples.spec.ts`; existing specs unmodified.
- Browser visual pass (§5): open each curated URL in the built dist under `/Mechanic/`; SEE the
  headline story work — crank the ratio, watch t_spin fall and τ rise; trip T_d ≤ 0 and SEE the
  scoped refusal withhold t_spin while the flywheel's stress readouts stand; console clean.
- Phase report exists: `test -f docs/sessions/reports/phase-4.md`; queue header reads
  `AWAITING OWNER`; log entry appended; queue row S25 → DONE with PR#.
- The session STOPS; the report's "Decisions needed" carries the motor-THING question with a
  recommendation. No next-phase work exists to claim.

## Out of scope

Building the motor THING (owner decision, post-phase) · any chain-level math in widgets (t_spin
lives in the THING — the invariant-4 line this brief exists to hold) · more than three examples ·
editing S23's encoding (frozen contract) · errata for the flywheel amendment (additive relation,
not a correction — no errata needed, DECIDED) · starting any next-phase row (protocol §8).

## Notes

- **S20 example-3 pin (Phase 3 close, 2026-07-06).** The deliberately-open example-3 slot is
  satisfiable against the merged Phase 3 catalog; the S20 verification pass pinned these legal wires:
  - **Recommended (simplest):** `planetary-gearset` output `T_out` (`quantity_kind: torque`) →
    `fixed-fixed-torsion-shaft` input `T` (`quantity_kind: torque`). This mirrors the existing
    `/chain-demo/` planetary→shaft wire but drives a *statically-indeterminate* THING — the
    fixed-fixed shaft splits the applied torque into two wall reactions `{T_A, T_B}` via
    solveLinear, so the example shows a Phase-3 coupled solve fed by a chain. (`belt-drive` or
    `spur-gear-pair` torque outputs are equally legal sources.)
  - **Alternatives (force wire):** any `quantity_kind: force` output → `composite-bar` input `P`
    (`inputs: [P, L, A_1, A_2]`) or `bolted-joint-gasket` input `P`. `two-bar-truss` and
    `beam-shear-flow` expose force-kind outputs.
  - All ports verified present against the merged catalog 2026-07-06 (S20). Choose the simplest
    legal wire and log the choice per the deliverable; no substitution is needed (nothing was
    SKIPPED that this slot depends on).
- The design JSON writes the inertia symbol as `I_m`; flywheel-disk's shipped symbol is `I_z`
  (thing.yaml). The on-disk symbol wins — do not rename a shipped variable for a doc's notation.
- Trap: appending to a shipped thing.yaml re-fingerprints it — expect a cold-ish rebuild for
  flywheel-disk (§9.5 if anything smells stale; reproduce cold before concluding).
- Trap: the frozen example URLs must be generated AGAINST THE MERGED S23 ENCODER and then treated
  as literals — do not hand-compose base64url payloads.
- Trap: DOF — adding input `T_d` and target `t_spin` must keep knob count = DOF green in every
  configuration touched. Work it out on paper before editing.
- Imitate: `chain-demo.spec.ts` for golden-derivation comments; `eccentric-column` /
  `euler-column` for scoped-refusal authoring; `compound-cylinder` for the golden-source pinning
  pattern; §11 templates for the log entry and phase report.
- If the Phase 3 THING wanted for example 3 was SKIPPED or admits no legal wire, substitute
  another Phase 3 consumer and log the deviation — never silently drop to two examples.
