# S10 — slider-crank (exact kinematics at a knob angle)

- **ID / Title:** S10 — slider-crank: exact position/velocity/acceleration at crank angle θ + quasi-static force path
- **Phase:** 2
- **Type:** THING
- **Size:** M
- **Status:** FULL

## Goal

THING #27 live: exact slider-crank kinematics evaluated at the crank-angle knob θ — x(θ), v(θ),
a(θ) as authored closed forms (ω constant; nothing is ever integrated) — plus a quasi-static force
path (gas force → rod obliquity → crank torque T(θ)) as a second configuration, and the classic
two-term r/l approximation shown as a comparison readout with its error machine-bounded in tests.
Single branch (an in-line slider-crank assembles uniquely for l > r), the fourbar pattern minus
the branch pair. The heaviest sim of the batch: piston + rod + crank.

## Entry criteria

Any false → BLOCKED, do not start (protocol §1.6, §9.1).

- Main CI green: `gh run list --branch main --limit 1`
- No PAUSED/IN_PROGRESS rows: `rg "PAUSED|IN_PROGRESS" docs/sessions/queue.md` → zero matches
- S09 DONE: `rg "\| S09 \|" docs/sessions/queue.md` → status column reads DONE
- The pattern parent exists: `test -f site/src/content/things/fourbar-linkage/thing.yaml` (Bash tool)
- Kinds exist: `rg "angular_acceleration" pipeline/src/mech_pipeline/kinds.py` → ≥1 match, and
  `rg "acceleration" pipeline/src/mech_pipeline/kinds.py` → ≥1 match
- m/s^2 display unit exists (S08 shipped it — queue order settles the design's conditional):
  `rg -F '"m/s^2"' site/src/engines/units.ts` → ≥1 match

## New capabilities required

**NONE — if this work turns out to need a new engine/pipeline/schema capability, STOP and BLOCK
(protocol §9.2); do not improvise one.** The `rad/s^2` display-unit entry (only if rod angular
acceleration is surfaced — see Physics scope) is a routine `units.ts` registry addition gated by
`check-units`, not a capability.

## Physics scope

Closed forms with sqrt and trig — exactly the fourbar pattern, single branch. θ is a knob;
evaluation happens at the knob state, never along a trajectory.

Config A — kinematics (crank r, rod l, constant crank speed ω):
- x(θ) = r·cosθ + √(l² − r²·sin²θ) — piston position from the crank axis
- v(θ) = ω·dx/dθ and a(θ) = ω²·d²x/dθ² — authored FACTORED closed forms (ω constant, so no ∂ω
  terms); a(θ) carries kind `acceleration`, display m/s^2
- Two-term approximation as a COMPARISON READOUT (not a relation the solver uses — keep it out of
  the DOF count): Norton's r/l series ≈ r(1−cosθ) + (r²/4l)(1−cos2θ) measured from TDC. Pin
  Norton's exact form and reference frame — x(θ) above is from the crank axis; they differ by the
  constant l + r. Reconcile explicitly or the "error" you test is the frame mismatch.
- Optional: rod angular acceleration as a readout — if surfaced, add `rad/s^2` to units.ts (kind
  exists, unit doesn't); if not surfaced, skip both, and say so in the log.

Config B — quasi-static force path:
- Obliquity: sinφ = (r/l)·sinθ; rod force = F/cosφ; crank torque T(θ) = F·r·sin(θ+φ)/cosφ —
  authored closed form, pinned to Norton. l > r (enforced below) guarantees |sinφ| < 1 and
  cosφ > 0, so the force path needs no second branch — state this in the derivation.

Citations: Norton, *Design of Machinery* (slider-crank position/velocity/acceleration, exact and
approximate forms; engine torque) — chapter-level pinning against the publisher TOC per the
design; a §-number you cannot see is a fabrication, TOC-level pinning is honest (protocol §3.4).
Cross-check: Uicker, Pennock & Shigley, *Theory of Machines and Mechanisms*.

Tests: independent SymPy differentiation of x(θ) must reproduce the authored v and a — the
derivative check IS the first-principles cross-check here; the approximation error proven bounded
vs r/l across samples; numeric golden at a specific state (e.g. θ = 90°, r/l = 1/3, hand
arithmetic in the comment) or a pinned Norton worked example.

## Envelopes

- **invalid**, global: l ≤ r — the mechanism cannot assemble through a full crank rotation (the
  sqrt argument reaches zero within the cycle). Mirrors fourbar's Grashof honesty: refuse, name
  the reason. This is the e2e refusal pin.
- **warn**, global: r/l > 0.5 — extreme rod obliquity; rod force grows as 1/cosφ and the two-term
  approximation degrades. Physical reason: real engines run r/l ≈ 1/3–1/4 (cite Norton's stated
  range if the text gives one; otherwise state the warn threshold as a declared choice).

## Materials axis

None — pure kinematics plus a quasi-static force path; no material property enters any relation.
That is honest, and fourbar-linkage is the precedent: say explicitly in overview.mdx why there is
no material dropdown (geometry-only page), and let failure.mdx point at combined-shaft and
torsional-oscillator for where material re-enters the crankshaft story.

## Sim sketch

The heaviest sim of the batch — budget context deliberately; growth beyond M mid-session is a
PAUSED trigger (§9.4), not a rush license. Side view: crank circle + crank arm, connecting rod,
piston in a cylinder guide. The θ knob positions the mechanism exactly. An animate toggle may
sweep a PRESENTATION phase via `useSimClock` while readouts stay pinned to the knob θ —
**mandatory code comment: presentation, not integration (batch discipline).** T(θ) sparkline over
0–2π with a marker at the knob θ: generate the curve by evaluating the compiled solved forms
through the shared relation engine (`site/src/engines/relation.ts`) — sweeping an emitted closed
form is data-driven; re-implementing the trig inside the component is bespoke sim math (invariant
4 violation). Draw key `"slider-crank"` in the ThingWidget.tsx slug map; component
`site/src/components/sims/SliderCrankSim.tsx`; new SVG classes in `global.css`.

## Deliverables

- `site/src/content/things/slider-crank/{thing.yaml, overview.mdx, failure.mdx}` — thing.yaml
  declares TWO configs and branch count 1; overview says the slider-crank IS a four-bar limit
  (link fourbar-linkage); failure.mdx carries the flywheel-disk bridge (torque fluctuation is WHY
  engines carry flywheels — with an honest refusal to integrate the energy variation until a
  future capability) and the crankshaft torsional-vibration teaser (link torsional-oscillator)
- `SliderCrankSim.tsx` + ThingWidget registration + global.css classes
- `site/src/engines/units.ts`: `rad/s^2` entry IF rod angular acceleration is surfaced (decide
  early; check-units gates it)
- `pipeline/tests/test_slider_crank_physics.py` — independent differentiation, approximation
  error bound, numeric golden
- e2e: presence pin + refusal pin (drive l below r, see SimRefusal)
- Bookkeeping (protocol §7)

## Exit criteria

- Catalog count = 27 on `/things/` and in CLAUDE.md + README
- `uv run pytest -q` green, ≥ +4 tests vs pre-session count
- Machine-proven facts: authored v(θ) and a(θ) ≡ SymPy derivatives of x(θ), symbolically; the
  two-term approximation's error bounded vs r/l across samples
- Cold `pnpm build` completes within the normal budget (≥ 6 min timeout per protocol §10.2; the
  factored-forms discipline is what keeps verify.py's symbolic tier terminating) — record the
  cold duration in the log entry
- Refusal visibly renders at l ≤ r; visual pass per protocol §5 (normal + refused screenshots;
  knob θ visibly drives the mechanism; what-was-checked described)
- Log entry appended; queue row DONE with PR# and date

## Out of scope

- Time integration of anything: no energy-fluctuation integral for flywheel sizing (refused
  honestly on-page), no shaking-force / inertia-force balance, no dynamic simulation
- Offset slider-crank; coupler-curve work; multi-cylinder arrangements
- Rod/crank stress or buckling sizing (other pages own that)

## Notes

- THE trap, named in the design (fourbar precedent — budget build time): exact-derivative closed
  forms explode when expanded. Author v and a FACTORED, keeping √(l² − r²·sin²θ) as a shared
  subterm. If symbolic equivalence stalls in verify.py, refactor the authored form — never fall
  back to numeric-only verification or weaken a gate (protocol rule 1).
- Single branch is a declaration, not an omission: fourbar verifies two branches independently;
  this THING declares one and the build's branch-count check must agree.
- The approximation readout must not become a relation: it exists to be compared against the exact
  form, with its error proven bounded — that comparison is the pedagogy.
- Kind discipline: piston a(θ) is `acceleration` (m/s^2); crank ω is `angular_velocity` (rad/s,
  rpm); rod angular acceleration, if surfaced, is `angular_acceleration` (rad/s^2). No blurring.
- Imitate: fourbar-linkage (linkage thing.yaml structure, envelope honesty, sim drawing
  conventions, verification budget), belt-drive (angle-rich relation style).
- Branch `thing/slider-crank`; PR title `THING 27: slider-crank (Phase 2 dynamics: exact kinematics at a knob angle)`.
