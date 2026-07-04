# S09 — impact-loading (energy method; 2nd constants consumer)

- **ID / Title:** S09 — impact-loading: falling-mass impact by energy balance
- **Phase:** 2
- **Type:** THING
- **Size:** S
- **Status:** FULL

## Goal

THING #26 live: falling-mass impact on an elastic member by energy balance — impact factor
n = 1 + √(1 + 2h/δ_st), σ_impact = n·σ_st, δ_impact = n·δ_st — in two configurations (axial rod,
cantilever tip strike). No time integration: the classic energy-method result, its assumptions
declared as cited modeling steps. This is the SECOND consumer of the g constant from S08, which is
what proves the constants mechanism generalizes. The h → 0 ⇒ n = 2 limit (suddenly applied load)
is machine-proven — the surprising, provable golden.

## Entry criteria

Any false → BLOCKED, do not start (protocol §1.6, §9.1).

- Main CI green: `gh run list --branch main --limit 1`
- No PAUSED/IN_PROGRESS rows: `rg "PAUSED|IN_PROGRESS" docs/sessions/queue.md` → zero matches
- S08 DONE: `rg "\| S08 \|" docs/sessions/queue.md` → status column reads DONE
- Constants mechanism exists: `rg -F '"constant"' site/src/content.config.ts` → ≥1 match, AND
  `rg -F "role: constant" site/src/content/things/shaft-critical-speed/thing.yaml` → ≥1 match
- m/s^2 display unit exists: `rg -F '"m/s^2"' site/src/engines/units.ts` → ≥1 match
- Struck-member parent exists: `test -f site/src/content/things/cantilever-beam/thing.yaml` (Bash tool)
- energy kind exists: `rg energy pipeline/src/mech_pipeline/kinds.py` → ≥1 match

## New capabilities required

**NONE — if this work turns out to need a new engine/pipeline/schema capability, STOP and BLOCK
(protocol §9.2); do not improvise one.** In particular: this session CONSUMES the S08 constants
mechanism as merged. If the mechanism cannot express what this brief needs (citation slot,
rendering, DOF exclusion), that is a BLOCK with "awaiting owner sign-off" — never extend it here.

## Physics scope

Energy balance, pure algebra (sqrt): m·g·(h + δ_impact) = ½·k·δ_impact² with k = W/δ_st, W = m·g
(m is the knob; g via the constant — do NOT author a weight knob, that would orphan the mechanism
this session exists to prove out). Solved forms:

- δ_impact = δ_st·(1 + √(1 + 2h/δ_st)); n = 1 + √(1 + 2h/δ_st); σ_impact = n·σ_st
- Config A, axial rod: δ_st = W·L/(E·A), σ_st = W/A (Gere & Goodno §2.8 case)
- Config B, cantilever tip strike: δ_st = W·L³/(3·E·I), σ_st = M·c/I with M = W·L — reuse
  cantilever-beam's section conventions verbatim
- Quadratic-root sign selection (named risk): the physical root is positive. Author the solved
  form directly and verify against the residual with SymPy positive-symbol assumptions
  (h, δ_st, m, g > 0) so the sqrt branch is provable — declaring assumptions is the fix when
  simplification stalls, never loosening the check (protocol rule 1).

Machine-proven limits (pytest):
- h → 0 ⇒ n = 2 exactly, symbolically — the suddenly-applied-load result
- h ≫ δ_st asymptote: σ_impact → √(2·m·g·h·E/V) with V the member volume (axial case) — the
  strain-energy-density pedagogy: σ²/2E per unit volume absorbs the drop, so VOLUME, not section
  modulus, governs impact capacity. Verify the asymptotic bound numerically across samples.

Declared cited modeling steps (assumptions): rigid falling mass; no rebound; no losses; struck
member massless; stresses within the proportional limit.

Citations: Gere & Goodno, *Mechanics of Materials*, 9th ed., §2.8 (impact loading, axial case —
the repo already cites gere; reuse the source id); Juvinall & Marshek, ch. 7 (impact, including
the strain-energy-density design view). Both accessible — pin per protocol §3.4. Golden: a Gere
§2.8 worked example if pinnable; else a by-hand value with arithmetic in the test comment.

## Envelopes

- **warn**, global: struck-member mass not negligible — m_member = ρ·V computed honestly; warn
  when m_member/m_falling > 0.1. Physical reason: the balance ignores the member's own inertia.
- **warn**, global: σ_impact ≥ σ_y. Physical reason: past yield the linear-elastic energy balance
  is void. SF readout σ_y/σ_impact (kind `safety_factor`) alongside.

No invalid envelope by design — do not invent one; the e2e refusal pin becomes a warn-banner pin,
declared in the PR body.

## Materials axis

E (stiffness — STIFFER members take HIGHER impact stress at fixed drop: this page's
counterintuitive-cascade moment; make it legible), σ_y (SF + yield warn), ρ (member-mass warn).
No new property columns.

## Sim sketch

Mass block at height h above the member; config toggle redraws vertical rod vs cantilever tip.
`useSimClock` loops a raise-drop-flash presentation (member flashes at n·δ_st) — **presentation,
not integration; mandatory code comment (batch discipline).** Side-by-side bars σ_st vs σ_impact
scaling visibly with the h knob. Draw key `"impact-loading"` in the ThingWidget.tsx slug map;
component `site/src/components/sims/ImpactLoadingSim.tsx`; new SVG classes in `global.css`.

## Deliverables

- `site/src/content/things/impact-loading/{thing.yaml, overview.mdx, failure.mdx}` — failure.mdx
  MUST state the energy method's unconservatism against wave effects honestly (stress waves and
  local contact stresses can exceed the energy-balance prediction; Juvinall carries the caveat).
  This is a design requirement, not optional flavor.
- `ImpactLoadingSim.tsx` + ThingWidget registration + global.css classes
- `pipeline/tests/test_impact_loading_physics.py` — independent energy-balance re-derivation,
  symbolic h→0 limit, asymptote sampling, numeric golden
- e2e: presence pin + warn-banner pin
- Bookkeeping (protocol §7)

## Exit criteria

- Catalog count = 26 on `/things/` and in CLAUDE.md + README
- `uv run pytest -q` green, ≥ +4 tests vs pre-session count
- Machine-proven facts: h → 0 ⇒ n = 2 symbolically; large-h σ asymptote √(2mghE/V) verified
  across samples
- Both configurations render; the g constant appears as a cited labeled value (mechanism's second
  consumer demonstrated)
- Visual pass per protocol §5 (normal + warn; h knob visibly scales the impact bars; screenshots;
  what-was-checked described)
- Log entry appended; queue row DONE with PR# and date

## Out of scope

- Wave propagation, Hertzian contact stress, strain-rate effects — NAMED in failure.mdx, never modeled
- Rebound / coefficient of restitution, repeated impact, impact fatigue
- Configurations beyond the two given (no horizontal impact, no spring-buffer)

## Notes

- The knob is MASS m; W = m·g is a relation through the constant. A weight knob would silently
  bypass the constants mechanism — the whole point of this session's placement in the batch.
- SymPy trap (named in the design): without positivity assumptions the solved form will not verify
  (√(x²) ≠ x unsigned). Fix with assumptions, never by weakening the residual check.
- Both configurations ship or none: a one-config merge is a partial THING (protocol rule 2). If
  context runs low mid-row, that is PAUSED (§9.4), not a scope cut.
- Cross-links per design: cantilever-beam (the struck member), helical-spring (why springs absorb
  impact — energy per volume), euler-column (suddenly-applied vs static framing), flywheel-disk
  (kinetic-energy storage as the inverse problem).
- Imitate: cantilever-beam (section conventions, δ closed form), compound-cylinder (golden-test
  comment style with pinned source).
- Branch `thing/impact-loading`; PR title `THING 26: impact loading (Phase 2 dynamics: energy method)`.
