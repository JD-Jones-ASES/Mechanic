# S26 — dc-motor THING (linear torque–speed) + motor into the headline chain

**Ruling:** R11 (owner, in-session 2026-07-07). **Branch:** `thing/dc-motor`. **One PR.**
This brief was written by the working session from the owner's direct instruction ("the spin-up
story currently uses the planetary's `T_s` knob as an honest motor stand-in. A minimal motor THING
(linear torque–speed curve) would close that one gap. Let's build this") plus the S25 brief's
deferred-motor sketch (stall torque + no-load speed). Per protocol rule 6 it is a spec, not a
source: every formula below is independently re-derived and every citation web-corroborated
before it ships.

## Entry criteria (all verified at claim)

- Queue header shows the release phase with its ruling line present. ✔ (this session recorded it
  on owner instruction)
- `git status` clean on main; latest main CI run green. ✔ (run 28890715628, S25)
- 36 THINGs; `rg -l "dc-motor" site/ pipeline/` returns nothing. ✔ (fresh slug)

## Deliverables

1. **THING 37 — `dc-motor`** (`site/src/content/things/dc-motor/`): permanent-magnet (brushed)
   DC motor at fixed supply voltage, the linear torque–speed line.
   - Variables (8): `T_stall` (stall torque), `omega_0` (no-load speed), `omega` (operating
     speed), `T` (delivered torque), `P` (shaft power, derived), `P_max` (peak available power,
     derived), `omega_p` (peak-power speed, derived), `omega_out` (delivered shaft speed,
     derived pass-through so speed is a wireable output port). No material binding (the
     bolted-joint-gasket precedent: the curve IS the spec; a token material dropdown would be
     dishonest). Category `mechanisms-dynamics`, no topic.
   - Relations (5): torque–speed line `T·ω₀ = T_stall(ω₀ − ω)`; shaft power `P = T·ω`; peak
     power `4·P_max = T_stall·ω₀`; peak-power speed `2·ω_p = ω₀`; rigid coupling
     `ω_out = ω`. DOF = 8 − 5 = 3 per configuration.
   - Configurations (2): `speed-in` (inputs `T_stall, omega_0, omega` — pick a point on the
     curve) and `torque-in` (inputs `T_stall, omega_0, T` — the load picks the point; speed
     out). Same relations, opposite directions — the relational core on display.
   - Validity: warn past no-load speed (delivered torque/power go negative — braking/generating
     regime); warn past stall demand; **unscoped invalid** `omega >= 0` (a demanded torque above
     stall has no motoring operating point — refuse the evaluation).
   - Derivation from the circuit model via free locals (V, R_a, k): T = kI and V = IR_a + kω
     as cited modeling steps, elimination as identity, the vertex form
     `P = P_max − (T_stall/ω₀)(ω − ω_p)²` proving peak power by completing the square.
   - Defaults self-consistent AND chain-consistent: `T_stall=200 N·m, ω₀=300 rad/s, ω=150`
     → `T=100 N·m` (= the planetary's `T_s` default), `P = P_max = 15 kW`, `ω_p = 150`
     (operating exactly at peak power).
2. **Sim** `DcMotorSim` (draw key `dc-motor`): spinning rotor (useSimClock, log-compressed
   visual rate, true numbers in the caption) + torque–speed chart drawn ONLY through engine
   anchors ((0, T_stall)—(ω₀, 0) line, operating dot at (ω, T), ω_p reference, P-vs-P_max bar).
   Consumes `invalid` → SimRefusal. Reuses existing `chart-*`/`fw-*`/`sim-*` classes; no new CSS.
3. **Physics cross-check** `pipeline/tests/test_motor_physics.py` (+ `PHYSICS_TESTS` entry):
   re-derives the line from the circuit model, proves P_max = T_stall·ω₀/4 at ω₀/2 by calculus
   AND by the vertex identity, hand golden at declared defaults. No import of thing.yaml.
4. **Headline example re-minted** (R11): 4 nodes — dc-motor → planetary (T and ω_out wired into
   `T_s`/`omega_s`) → torsion-shaft + flywheel-disk as today. Knobs `{}` (all defaults),
   materials pin `steel-1045` on the flywheel node only. Goldens: `T_out = 350 N·m`,
   `τ = 27.85 MPa`, `P_w = 15 kW`, `t_spin = 0.1341 s` — minted against the S23 encoder, decode
   + evaluate verified to reproduce the goldens BEFORE the literal is frozen (never
   hand-composed). Card copy rewritten (the stand-in sentence retired); `chain-demo` prose
   checked; flywheel derivation prose stays true as written.
5. **e2e**: presence + refusal (+ warn) pins for dc-motor; catalog/verification counts 36 → 37;
   chain-examples spec updated to the new headline. CLAUDE.md/README catalog count 36 → 37.

## Exit criteria

- Full protocol §3 gate green (build, pytest incl. new physics test, unit, e2e, visual pass on
  the built dist: normal + warn + refused states seen, headline example driven by eye).
- Three-angle self-review (§4) run; findings fixed or rebutted in the PR body.
- The live `/things/dc-motor/` page and re-minted headline example verified after deploy.

## Out of scope

Electrical variables as THING variables (voltage/current/efficiency knobs), thermal derating
curves, brushless/AC machines, a motor-driven `chain-demo` rewrite, any new engine capability,
any new quantity kind or display unit (all needed kinds/units exist).
