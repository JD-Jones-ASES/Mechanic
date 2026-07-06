# Roadmap — toward the final product

Phased plan agreed with the owner 2026-06-10 (in-session). Working rhythm (owner ruling
2026-07-04): sessions run fully autonomously WITHIN a phase — one session = one merged PR, each
session merging its own PR after all gates pass (green CI, multi-angle self-review, browser
visual pass; consistent with ADR-0007) — and at each phase boundary the closing session writes
`docs/sessions/reports/phase-<n>.md` and stops for owner direction. Session mechanics, queue, and
briefs live in `docs/sessions/`. Everything here operates under the five invariants in `CLAUDE.md`
and the verification model in `docs/decisions/ADR-0007` (AI-authored, programmatic gates, no human
review — the site says so on `/verification/`).

**Rough definition of done:** 30–50 THINGs covering the undergraduate spine (statics → mechanics
of materials → machine design → dynamics), a chain-builder that turns the catalog into a
type-checked system simulator, ~30 provenance-clean materials with Ashby merit-index tooling,
and the verification page as the public trust story. Explicitly never: accounts, analytics,
comments, servers (the static-site constraint is permanent).

## Phase 1 — Platform consolidation ✅ complete (2026-06-10, PR #4)

ADR-0007 + site-wide honest framing; `/verification/` page (gates, per-THING audit blocks,
per-source pinning records via `sources[].verification`); all eight sims consume the engine's
authoritative `invalid` verdict (shared `SimRefusal`; finite-invalid cases e2e-pinned); shared
sim machinery (`useSimClock`, `StressBands`); incremental compile cache (fingerprinted artifact
reuse, `actions/cache` in CI — warm builds reuse unchanged THINGs in seconds).

## Phase 2 — Catalog breadth (in progress)

**Target (owner ruling 2026-07-04): grow the catalog from 17 to ≈30 THINGs.** The
session-by-session plan is `docs/sessions/queue.md` (S01–S14; band-brake is the designated shed
item, so Phase 2 lands at 30 or 31); the spur-gear tabulated-data capability goes first, designed
deliberately, then consumed by later batches.

March through the curriculum spine in batches; each batch should deliberately exercise a new
factory capability, the way the flywheel exercised `poisson_ratio` and new quantity kinds.

- **Machine elements** ✅ batch 1 shipped (2026-06-10): helical compression spring (the G story
  continued; coil-bind/buckling/index envelopes — the buckling bound material-aware through E
  and G via Shigley 10-12), power screw (friction as an honest knob — new `friction_coefficient`
  and `efficiency` kinds; self-locking as a warn envelope, the jammed wedge as a refusal),
  belt/capstan (the catalog's first `exp()`; the speed ceiling as a finite-value refusal, e2e-
  pinned; max-power speed re-derived by calculus in tests). New kinds: `stiffness`,
  `friction_coefficient`, `efficiency`; new display units N/m, N/mm, m/s.
- **Structures** ✅ batch 2 shipped (2026-06-10): simply-supported beam (superposition as a
  visible theorem — δ_P and δ_w are separate readouts that sum; new `line_load` kind), combined
  bending + torsion shaft (live Mohr's-circle sim; Tresca and von Mises side by side, their
  [1, 2/√3] bracket proven in tests; new `bending_moment` kind — the belt-tension bridge THING),
  thin-walled tube torsion (Bredt shear flow; the isoperimetric inequality S² ≥ 4πA_m as an
  invalid envelope — refusal by classical theorem, the sim's stadium construction goes complex
  at exactly the same boundary).
- **Radial-field family (already promised by existing failure notes):** rotating disk with a
  central bore ✅ shipped 2026-06-10 (the vanishing-hole ×2 as a machine-proven limit; 1/√2
  speed penalty; e_m rises at fixed speed — both flywheel cross-links live); shrink-fit
  compound cylinder ✅ shipped 2026-06-10 (ν-cancellation proven with ν symbolic; the
  two-shell optimum r_c = √(r_i·r_o) → capacity σ_y(1−r_i/r_o), approaching 2× the monobloc
  ceiling, machine-proven; scoped refusal's second consumer — over-shrunk bores refuse SF_bore
  alone; Timoshenko's own worked example as a published test golden; new µm display unit).
  The radial-field family is complete.
- **The deliberate schema stress-test:** spur gear pair (Lewis bending) ✅ shipped 2026-07-04
  (S01, PR #13) — forced a tabulated-data-with-provenance mechanism designed on purpose: the
  first-class `table` plan step (ADR-0009), cited form-factor data with node-exact lookup, linear
  interpolation pinned in the parity oracle, and a scoped out-of-domain refusal. Catalog 17 → 18.
- **Second table consumer, real-arg multi-column:** stepped-shaft-fillet (shoulder-fillet stress
  concentration) ✅ shipped 2026-07-04 (S02, PR #15) — hardened the `table` capability under a REAL
  argument (D/d) filling TWO columns (A, b) from one lookup, three cited Norton App-C tables
  (axial/bending/torsion), K_t = A·(r/d)^b applied to a nominal stress, with two independent scoped
  poison paths (D/d table auto-guard + r/d authored envelope). Multi-column consumption is a
  compiler/verifier logic extension, no schema/artifact change. Catalog 18 → 19.
- **Third table consumer, classical-elasticity coefficients:** rectangular-shaft-torsion
  (Saint-Venant torsion of a solid rectangular bar) ✅ shipped 2026-07-04 (S03, PR #16) — the
  first `table` use outside a machine-element chart: c1(a/b), c2(a/b) from Timoshenko §109 (two
  columns, one lookup), τ_max at the long-side midpoint (corners carry zero), and an equal-area
  round-shaft efficiency comparison ("why square shafts are a bad deal"). New `twist_rate` quantity
  kind + `rad/m`, `deg/m` display units; a/b outside [1, 10] refuses globally rather than
  extrapolate. The coefficients are cross-checked against the exact Fourier-series solution and
  Roark's independent closed form in the physics test. Catalog 19 → 20.
- **Transverse shear + the third N/m kind:** beam-shear-flow (τ = VQ/Ib) ✅ shipped 2026-07-04
  (S04, PR #17) — the parabolic shear distribution (τ_max = 3V/2A at the neutral axis, zero at the
  surfaces), shear flow q = VQ/I, and the fastener-spacing readout F = q·s. Ships the `shear_flow`
  quantity kind — the THIRD kind on the N/m dimension vector (with `line_load` and `stiffness`),
  making it the invariant-2 worked example on `/verification/`. A strength-only material axis
  (σ_y for the shear-yield warn; E and ρ genuinely do not enter). The τ = VQ/Ib formula, the 3/2
  peak, and the theorem that the parabola integrates back to exactly V are re-derived from slice
  equilibrium in the physics test. thin-tube-torsion's Bredt shear flow was evaluated for migration
  and left as-is (a derivation local carries no `quantity_kind` slot — a schema change is out of
  scope). Catalog 20 → 21.
- **Curvature stress + a deliberate zero-machinery breather:** curved-beam (Winkler bending) ✅
  shipped 2026-07-04 (S05) — the crane hook / C-clamp / press frame. The neutral axis shifts off the
  centroid to r_n = h/ln(r_o/r_i) (the log is the curved-beam analogue of belt-drive's exp), the tiny
  eccentricity e = r_c − r_n drives the inner-fiber concentration, and a side-by-side straight-beam
  Mc/I readout exposes the curvature penalty K_i (≈1.4× at the default hook). A single crane-hook
  configuration superposes the direct P/A on the curved bending with M = P·r_c (the combined-loading
  pattern from eccentric-column). Deliberately ZERO new machinery — no kind, unit, table, solve, or
  schema change — with the effort spent instead on the derivation and a machine-proven straight-beam
  limit: σ_i → Mc/I as r_c/h → ∞, verified by series expansion (K_i = 1 + (h/r_c)/3 + …) in the physics
  test, which also re-derives r_n and κ from the two section-equilibrium conditions and cross-checks
  against Roark. Strength-only material axis (σ_y; E and ρ genuinely do not enter). Catalog 21 → 22.
- **Poisson's ratio in a stress + a new kind:** circular-plate (uniform-pressure bending) ✅ shipped
  2026-07-05 (S06) — a tank head / porthole / valve cover, with the clamped and simply-supported edge
  cases side by side as two always-valid parallel models (the euler-column one-page pattern, no
  branches, no scoped refusal). The FIRST page where Poisson's ratio moves a STRESS: the
  simply-supported center stress σ_ss = 3(3+ν)qa²/(8t²) carries ν, while the clamped-edge stress
  σ_c = 3qa²/(4t²) is material-blind (no E, no ν) — swap steel for gray iron and σ_ss shifts while σ_c
  holds for ANY material. Ships the new `flexural_rigidity` quantity kind, the FOURTH on the [2,1,-2,…]
  N·m dimension vector (with torque, bending_moment, energy) — a deliberate registry stress test. The
  material axis binds E and ν (not σ_y: the demo pair includes brittle gray iron, which has no yield
  point, so the strength check takes a user-set allowable stress). All four closed forms are re-derived
  from the axisymmetric plate ODE D∇⁴w = q, and the (5+ν)/(1+ν) deflection ratio and (3+ν)/2 stress
  ratio are proven with ν symbolic. Two global warns (thin-plate t/a>0.1, small-deflection δ>t/2).
  Catalog 22 → 23.
- **The catalog's first dynamics page + a new kind:** torsional-oscillator (disk on an elastic shaft)
  ✅ shipped 2026-07-06 (S07) — a torsion pendulum / crankshaft-flywheel / driveline resonance. The
  natural frequency ω_n = √(k_t/J_d) is computed entirely from algebra at the knob state — NO ODE is
  integrated anywhere; the SHM step enters as a cited `check: definition` (the declared audit surface).
  Ships the new `frequency` quantity kind (Hz), deliberately incompatible with `angular_velocity` despite
  the identical [0,0,-1,…] dimension vector — an f-port can never chain silently into an ω-port, the 2π is
  always explicit — plus the `Hz`/`s`/`ms` display units (the `time` kind had none before). Two pedagogical
  headlines: the pitch is amplitude-independent (ω_n carries no Θ — isochronism) while the stress at the
  amplitude is proportional to it; and ω_n ∝ √(G/ρ), so the frequency is nearly material-blind across
  metals while the shear margin σ_y/G is not. k_t = GJ_p/L is a derivation local (no unauthorized
  `torsional_stiffness` kind); the honest chain-bridge to torsion-shaft is the peak restoring torque
  T_dyn = k_t·Θ. One material drives both disk and shaft (a stated simplification; multi-material is S17).
  Two warns (shaft-inertia J_shaft/J_d>0.1, shear-yield τ≥σ_y/2). The overview names the Phase 4 curated
  chain (motor → shaft → flywheel). ω_n re-derived two independent ways (Rayleigh energy + the equation of
  motion) in the physics test. Catalog 23 → 24.
- **The first cited physical constant + a second dynamics page:** shaft-critical-speed (Rayleigh +
  Dunkerley) ✅ shipped 2026-07-06 (S08) — the whirling speed of a disk on a shaft between two bearings.
  Ships the repo's first `role: constant` mechanism: g = 9.80665 m/s² (standard gravity, exact by
  definition, CGPM 1901) lands as a labeled, cited value — never a knob — excluded from the DOF/knob
  arithmetic exactly like a material, with a mandatory citation (invariant 5), plus the `m/s^2` display
  unit. The headline is the g-CANCELLATION: Rayleigh's ω_c = √(g/δ_st) collapses to √(48EI/mL³), so the
  critical speed is pure stiffness-over-inertia and gravity drops out entirely — proven symbolically.
  Dunkerley's estimate folds in the shaft's own distributed mass (ω_s from the exact sin-mode Rayleigh
  quotient) and is machine-proven never higher than Rayleigh's (ω_cD ≤ ω_c), bracketing the true first
  critical. Two material axes pull opposite ways (E raises ω_c, ρ lowers ω_cD); the disk mass is a free
  payload knob, not material-bound. A resonance-band warn (within 20% of ω_c) is the only envelope. The
  δ_st is the simply-supported-beam headline result reused verbatim (chain-port pair). Catalog 24 → 25.
- **The constants mechanism generalizes + the energy method:** impact-loading (falling-mass impact) ✅
  shipped 2026-07-06 (S09) — a mass dropped from height h onto an elastic member, by energy balance
  (no time integration). The impact factor n = 1 + √(1 + 2h/δ_st) multiplies both the static deflection
  and the static stress; σ_impact = n·σ_st. Two configurations — an axial rod (σ_st = W/A, δ_st = WL/EA)
  and a cantilever tip strike (σ_st = Mc/I, δ_st = WL³/3EI) — are selected by a constrained loading
  discriminator that lets both share one δ_st relation (a dimensionally-homogeneous linear blend), the
  same idiom stepped-shaft uses for its load case. It is the SECOND consumer of the `role: constant`
  mechanism (cited g, via W = mg): proof the mechanism generalizes with zero pipeline change. Two
  machine-proven headlines: h → 0 ⇒ n = 2 exactly (a suddenly-applied load already doubles the stress),
  and the large-drop asymptote σ_impact → √(2mghE/V) — the strain-energy-density result that VOLUME, not
  section modulus, governs impact capacity. The counter-intuitive material cascade: a stiffer material
  takes HIGHER impact stress (smaller δ_st ⇒ larger n; σ_st is material-blind). Two warns (member not
  massless, impact stress past yield); no invalid envelope by design. Catalog 25 → 26.
- **Exact reciprocating kinematics + gas torque (the four-bar limit):** slider-crank ✅ shipped
  2026-07-06 (S10) — crank r, connecting rod l, piston. Position x(θ) = r·cosθ + √(l²−r²sin²θ) from
  the crank axis; velocity and acceleration are ω·dx/dθ and ω²·d²x/dθ² (ω constant, nothing integrated),
  authored FACTORED with the shared subterm q = √(l²−r²sin²θ) and machine-checked to be the true first
  and second derivatives of x by INDEPENDENT SymPy differentiation (the derivative check IS the
  first-principles cross-check). Two CROSS-CONSTRAINED configurations over one shared relation set —
  kinematics (spin the crank at ω, gas force held at its reference) and a quasi-static force path (push
  with gas force F, crank speed held at its reference); each makes one driver a knob and constrains the
  other to its own default, so both default states coincide. Force path: obliquity sinφ = (r/l)sinθ, rod
  force F/cosφ, crank torque T = F·r·sin(θ+φ)/cosφ (cross-checked by virtual work T·dθ = −F·dx, and
  → F·r·sinθ for a long rod). Norton's two-term r/l approximation rides alongside the exact travel as a
  comparison readout, its error rationalised to −r⁴sin⁴θ/2l(l+q)² (cancellation-free for the JS-vs-mpmath
  parity gate) and bounded across a sweep of r/l. Single branch (l > r assembles uniquely — the four-bar's
  open/crossed pair collapses); geometry-only, NO material axis (the crank's whirl and torsional vibration
  carry the material story, forward-linked). Invalid at l ≤ r (cannot assemble), warn at r/l > 0.5 (extreme
  obliquity). No new engine/pipeline/schema/kind/unit. Catalog 26 → 27.
- **Rolling-contact bearing life + the first reliability page:** ball-bearing-life ✅ shipped
  2026-07-06 (S11) — the catalog rating C₁₀ is the load at which 90% of a population survives 10⁶
  revolutions, not a strength. The load–life power law L₁₀ = 10⁶(C₁₀/P)^a runs ball (a = 3, point
  contact) and roller (a = 10/3, line contact) as two configurations over one relation set — the cited
  exponent constrained per configuration — with the life read in hours and millions of revolutions.
  Beyond the 90% rating, the three-parameter Weibull reliability adjustment
  x(R) = x₀ + (θ − x₀)(ln 1/R)^(1/b) trims the usable life (asking for 99% survival cuts it to about a
  fifth), and below the cited R = 0.90 domain the reliability-adjusted readouts scoped-refuse while the
  rated L₁₀ stands. Ships the new `probability` quantity kind (a survival probability must never chain
  into a ratio or an efficiency port) and the `h` / `Mrev` display units. The Weibull parameters
  (Shigley Table 11-6, Manufacturer 2) are carried as cited role:constant values; there is deliberately
  NO material axis — the bearing steel is baked into the catalog ratings (the planetary-gearset framing).
  The Weibull inversion, the 10⁶-revolution rating basis, and the hours conversion are re-derived from
  first principles in the physics test. Catalog 27 → 28.
- **Two friction models on one clutch face:** disk-clutch ✅ shipped 2026-07-06 (S12) — an axial plate
  clutch or brake, with the two classical contact-pressure models shown as parallel readouts (the
  combined-shaft two-model pattern, no silent winner). A new rigid clutch presses uniformly,
  T_up = N·(2/3)μF(r_o³−r_i³)/(r_o²−r_i²); a run-in lining wears until p·r is constant,
  T_uw = N·μF(r_o+r_i)/2. Their difference collapses to a perfect square over a positive denominator,
  T_up − T_uw = N·μF(r_o−r_i)²/(6(r_o+r_i)) ≥ 0, so uniform wear is always the smaller — and therefore the
  conservative design — torque, with equality only in the thin-annulus limit; the bracket is machine-proven
  and gives the sim its "gap closes as r_i → r_o" story. Peak lining pressure p_max = F/(2π r_i(r_o−r_i))
  is checked against a cited allowable (a warn), the slip power P = T·ω_slip is reported for each model, and
  the torque-optimal bore r_i* = r_o/√3 (from dT/dr_i = 0 at fixed p_max) is a derived readout marked on the
  friction face. r_i ≥ r_o refuses globally (no annulus). Friction (μ and the allowable pressure) enters as
  cited free knobs from Shigley Table 16-3 — deliberately NO material axis (a friction-lining materials
  table is named future data/materials/ work, as on the bearing page). Both torque integrals are re-derived
  from first principles by direct integration in the physics test. No new engine/pipeline/kind/unit. Catalog
  28 → 29.
- **Determinate statics + the Phase-3 bridge:** two-bar-truss ✅ shipped 2026-07-06 (S13) — the
  symmetric two-bar truss, the smallest statically determinate structure. Member force
  F_m = P/(2 cos α) from joint equilibrium alone (α measured from the vertical), diverging as the
  truss flattens toward α = 90°; joint deflection δ = P L/(2 A E cos²α) by the unit-load method,
  re-derived two independent ways (virtual work AND the compatibility-triangle projection) that must
  agree symbolically. Two configurations via a loading-sense discriminator — tension (yield governs)
  and compression, where each pin-jointed member is also an Euler strut (P_cr = π²E I/L², K = 1,
  reused verbatim from the Euler Column page); the buckling readouts are scope-refused in tension (a
  tension member cannot buckle) and below the transition slenderness λ_T (the Johnson regime, cross-
  linked not re-implemented). Material binds E/σ_y/ρ: the member force and stress are material-blind
  while the deflection carries E (the Ti-vs-steel moment) and the mass carries ρ. A small-displacement
  warn at δ > L/10 and a global refusal at α ≥ 90° (degenerate geometry). The overview names the
  redundant/indeterminate truss as the Phase-3 `solveLinear` deliverable — this page is the
  determinate rung right below it. NOTE: the brief specified δ with cos³α; independent derivation gives
  cos²α (the brief's own compatibility-triangle method yields cos²α — only its transcribed formula was
  wrong), and the site ships the corrected cos²α. No new engine/pipeline/kind/unit. Catalog 29 → 30.

Per-THING gate (standard practice, from the flywheel/cylinder sessions): machine verification +
independent first-principles cross-check in `pipeline/tests/` + hand-checkable numeric golden +
web-pinned citations recorded in `sources[].verification` + browser visual pass + multi-angle
code review before merge. The gate is expanded into exact commands in
`docs/sessions/protocol.md` §3.

## Phase 3 — Solver depth (items 1–2 ✅ shipped 2026-06-10; item 3 approved 2026-07-04, split scope)

In dependency order:
1. **Johnson parabola** ✅ — second model on the Euler page with its own envelope; the refusal
   below λ_T became a hand-off. Required (and delivered) a new shared-engine capability:
   **scoped refusal** — invalid envelopes may poison named variables instead of the whole page
   (`scope:` on validity; `EvalResult.invalidVars`; per-readout refusal; sims dash the refused
   model). Tangency at λ_T (value AND slope) is machine-proven in the derivation and the Johnson
   constant re-derived from the tangency requirement in tests.
2. **First real `solve1d`/Brent consumer** ✅ — pipeline grew the full bracketed-root path
   (authoring syntax → per-sample sign-change certificate + single-root scan → 60-dps bisection
   → total back-substitution → roots in the parity oracle, so the browser's Brent is checked
   against mpmath every build; static bracket replaced by bracket *functions* of the env). The
   eccentric column (secant formula) consumes it: P_y solved live, and the page's point — the
   margin must be taken on LOAD — falls out of the nonlinearity.
3. **Cyclic / ND solving** — feedback loops, statically indeterminate systems. **Owner ruling
   2026-07-04: ADR-0008 signed off with the SPLIT scope** — `solveLinear` (statically
   indeterminate elastic structures; exact solve, full per-sample certificate) is approved to
   build; nonlinear `solveND` is deferred to a future ADR and remains out of scope until a THING
   demands it and the owner signs that ADR. Execution: sessions S15–S20 in
   `docs/sessions/queue.md`.

## Phase 4 — Chaining as the product

The differentiator. The type system (dimension 7-vector + quantity kind) already makes arbitrary
forward chains legal; the work is a chain-builder page (pick THINGs, wire ports, planner orders
evaluation), chains serialized into the URL (shareable on a static site), and curated examples
(motor → planetary → shaft → flywheel: spin-up time and what it costs in stress). Every number
keeps its citation through the chain. Execution: sessions S21–S25 in `docs/sessions/queue.md`;
those briefs are DRAFT until the Phase 3 closing session verifies them.

## Phase 5 — Materials depth

Grow `data/materials/` under the same Feist/provenance rules. Each new property *column* unlocks
THING capabilities: ultimate strength (already seeded) → burst margins; endurance limits →
fatigue facets; fracture toughness → leak-before-burst. Add composites (the flywheel overview
already names CFRP), and close the Ashby loop with merit-index overlays (σ_y/ρ, E/ρ) tied to the
THINGs that generate them.
