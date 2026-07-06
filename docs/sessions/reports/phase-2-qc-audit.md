# Phase-2 QC audit — 2026-07-06 (owner-directed session, post-Phase-2 close)

**What ran.** Owner-directed quality-control pass over the Phase-2 catalog before Phase 3 work
begins. Two tracks: (A) the full gate suite re-run **from cold** on main — generated artifacts
deleted, every THING re-verified from scratch; (B) a 75-agent fresh-eyes audit — 15 independent
auditors (one per Phase-2 THING + kind-registry + e2e-pin coverage), every actionable finding then
adversarially verified by a 3-lens panel (technical correctness / file evidence / materiality).
A finding counted only if ≥2 of 3 lenses upheld it. All 20 survivors were upheld **3/3**; the
panels rejected nothing, which reflects how specific the auditors' evidence was.

## Headline verdict

**The catalog's emitted numbers are sound.** Every governing formula on all 13 Phase-2 THINGs was
independently re-derived from first principles and matched; every numeric golden recomputed and
confirmed; the Norton/Lewis/Timoshenko table data cross-checked against independent knowledge and
(where accessible) published solution sets. Six auditors returned fully clean
(rectangular-shaft-torsion, curved-beam, disk-clutch, two-bar-truss, kind-registry-usage,
e2e-pins). **Not one wrong computed value was found.** What WAS found: 5 wrong citation locators
(live on /verification/), 7 silent-region envelope gaps (in-bounds knob regions where a model
assumption degrades with no banner — invariant-5 edges), 3 test-quality defects, 1 overview
display-math symbol collision, 1 sim-rendering bug, and a kind-granularity question. Full gate
re-run: **cold `pnpm build` clean (all 30 THINGs re-verified, 37 pages), pytest 297 passed,
unit 19 passed, e2e 82 passed**, live-site spot checks good (/verification/ shows 30;
two-bar-truss ships cos²α).

**Caveat on the citation findings**: the *corrections* below cite book sections partly from model
recall corroborated by web checks — exactly the kind of input protocol rule 6 distrusts. A fix
session must independently re-verify each corrected locator before shipping it (the finding that a
cited locator is WRONG is solid; the proposed replacement needs its own pin).

## Critical findings (3)

1. **stepped-shaft-fillet — nonexistent citation locator (citations).**
   `sources[].verification` (thing.yaml ~line 299) cites the K_t cross-check as *"Roark, Formulas
   for Stress and Strain, Table 6-1 case III-2"* — a table designation that exists in no Roark
   edition (Roark 7th/8th: Table 17.1). The "Table 6-1, part III case 2" structure matches
   **Pilkey**, *Formulas for Stress, Strain, and Structural Matrices* — consistent with the S02
   log entry, which says the closed form was matched against the independently-fetched
   Pilkey/Peterson form, and with the S02 brief (which says Roark 8th Table 17.1). The
   coefficients themselves are correct; the book/table attribution is wrong, live, and repeated in
   the physics-test docstring and log. **Fix:** attribute the actually-used source (Pilkey), or
   re-pin against Roark Table 17.1 properly.

2. **torsional-oscillator — silent past-yield static twist (envelopes).**
   The static-twist relation θ_st = T_app·L/(G·J_p) has no validity envelope, and the only stress
   the page computes depends on the oscillation amplitude Θ, never on T_app. At file defaults,
   static shear-yield onset is T_app ≈ 196 N·m, but the T_app knob spans 1–5000 N·m: at 5000 the
   page shows θ_st = 2.01 rad of fictional elastic twist, banner-free — a within-bounds
   silent-wrong-number region (invariant 5). **Fix:** a shear-yield warn on the static-twist
   relation (the page already carries the identical check for the dynamic amplitude).

3. **slider-crank — sim torque arrow drawn backwards (sim rendering).**
   `SliderCrankSim.tsx`: the drawn frame is y-flipped, so positive θ sweeps counterclockwise (and
   the animation does), and a free-body check at θ=90° confirms positive crank torque is
   counterclockwise in that frame — but the paused force overlay's torque arc (lines ~129–141) is
   built in raw y-down screen angles, so the arrowhead renders **clockwise** for positive T. The
   numbers are right; the arrow contradicts the physics and the sim's own motion. **Fix:** flip
   the arc/arrowhead sense in the overlay.

## Minor findings (16), grouped

**Citations — wrong locators, live on the site (4):**
- spur-gear-pair: the metric Barth factor (6.1+V)/6.1 is cited as Shigley **eq 14-4b** in five
  places (yaml sources/assumption/derivation-rule/comment + test comment); 14-4b is the
  US-customary (1200+V)/1200 form — the metric form is **eq (14-6b)** (corroborated against the
  official 10th-ed solutions manual).
- circular-plate: Timoshenko pin says **§16-17**, but §17 is the annular plate (out of scope);
  the solid-plate content is §16 (ODE in §15).
- impact-loading: Gere pin **§9.7-9.8** is half-wrong (§9.7 is Nonprismatic Beams; impact is
  §9.10; the cantilever deflection is §9.3–9.5/App. H).
- impact-loading: "Shigley **§4-18**" — Ch. 4 ends at §4-17 (Shock and Impact) in 9th–11th eds;
  no edition pinned. (Auditor confidence ~70% — re-verify before fixing.)

**Envelope gaps — in-bounds silent degradation, invariant-5 edges (7):**
- spur-gear-pair: the undercut warn tests only N_p, so a role-reversed mesh (N_p=100, N_g=14 —
  reachable, i bounds [0.05,30]) shows no banner though the 14-tooth member is undercut.
  Symmetric condition on min(N_p, N_g) closes it.
- stepped-shaft-fillet: torsion config's SF = σ_y/σ_max divides tensile yield by a peak *shear*
  stress (~1.73× optimistic); disclosed in prose only — a load_case-scoped warn on SF (the S13
  discriminator idiom) would surface it.
- beam-shear-flow: no aspect-ratio guard; b/h up to 80 reachable where τ=VQ/(Ib) understates true
  peak shear (~13% at b/h=1, ~40% at 2, ~100% at 4 per 2-D elasticity); also "strong axis"
  assumption text false when b > h.
- shaft-critical-speed: no slenderness envelope (L/d down to 0.67 reachable; Euler-Bernoulli
  grossly overpredicts stiffness → ω_c overestimated, non-conservative). The sibling
  simply-supported-beam carries exactly this warn (L > 10·h) — the standard exists and was
  dropped in reuse.
- shaft-critical-speed: the resonance warn brackets only Rayleigh's ω_c; with a light disk the
  true critical sits near ω_cD and a user can run ~1% off it banner-free while sr reads 0.547.
- impact-loading: no small-deflection guard on the cantilever config (δ_i/L ≈ 0.14 reachable with
  both existing warns silent); two-bar-truss carries the exact δ/L < 0.1 pattern to copy.
- ball-bearing-life (note-grade but here for completeness): the R < 1 invalid is unreachable
  (R knob caps at 0.999) — harmless defense-in-depth.

**Test quality (3):**
- torsional-oscillator: golden asserts f = **52.3155** Hz at rel_tol=1e-5; true value 52.316017
  (the docstring itself says 52.316). Passes with ~1.2% headroom by luck of tolerance. Should read
  52.3160.
- impact-loading: the cantilever *stress* half of the cross-check is a tautology (asserts an
  expression equals a copy of itself), so the docstring's "a slip in the c = d/2 cannot survive"
  overstates it; the deflection half (genuine double integration) is fine.
- stepped-shaft-fillet: the test helper `_norton_kt` clamps out-of-domain where the shipped
  lookup refuses (NaN) — dead code today (all cross points in-domain) but would silently weaken a
  future out-of-domain cross-check; docstring claims parity with the runtime.

**Display math (1):**
- ball-bearing-life overview line ~35: L_10h = 2πL10/ω = 10⁶·L10/(60n) reuses the symbol L10 in
  two different units (revolutions vs Mrev) — the right-hand Shigley form is off by 10⁶ under the
  page's own L10 definition. Engine numbers unaffected; the prose equation chain needs one symbol
  disambiguated.

**Kind granularity (1 + 1 note):**
- Bearing lives L10/L_R are `quantity_kind: count` — same kind as gear tooth counts and coil
  counts, so a life readout could legally chain into a tooth-count port. No better kind exists
  today; whether to mint `revolution_count` is an owner-level registry decision (same logic that
  split frequency from angular_velocity).
- (note) Weibull b and load-life exponent a are typed `ratio` though they're pure exponents —
  unchainable (role constant / constrained), so no wrong chain can result today.

## Notable notes (of 23; the rest are in the session transcript, none actionable beyond these)

- spur-gear-pair: the Y-table test cross-check is a pinned transcription (drift guard), not an
  independent derivation — the docstring says so honestly.
- circular-plate + shaft-critical-speed: one tautological sub-assertion each in otherwise-genuine
  test modules (self-ratio factors; an expression compared to itself).
- circular-plate: the ss-deflection warn banner's direction is argued WRONG by the auditor
  (membrane action makes linear theory OVER-predict deflection/stress at given q; it's the
  *strength* that's under-predicted — overview.mdx has it right, the banner text contradicts it).
  Upheld 3/3; treat as part of the text-fix batch.
- e2e-pins: spur-gear-pair is the only material-axis THING of the 13 with no material-cascade e2e
  pin.
- kind-registry: `load_derivation()` assigns `quantity_kind: "ratio"` to every derivation local
  regardless of unit — invisible to chaining today (locals aren't ports) but a latent wrong-kind
  source if locals ever become chainable.
- rectangular-shaft-torsion: linear interpolation across the sparse a/b = 5→10 span carries up to
  ~1.3% coefficient error near a/b ≈ 7.5 — worth a row at a/b = 7 someday.

## Recommendation

One or two dedicated QC-fix queue rows before (or interleaved with) early Phase 3, using this
report as the brief:

1. **Text/citation batch** (low risk, one session): the 4 citation locators + the Pilkey/Roark
   attribution (each independently re-verified at fix time, per rule 6), the bearing overview
   display-math symbol collision, the circular-plate warn-direction text, the golden constant
   52.3160, the two tautological test assertions, the `_norton_kt` clamp→refuse alignment.
   Each thing.yaml touch recompiles that THING — full gates, normal session discipline.
2. **Envelope batch** (behavior changes; needs per-THING visual passes): the 7 envelope items
   above, each a warn (none needs a new invalid), most copying an existing sibling pattern.
   Plus the slider-crank sim arrow fix (component change + visual pass).

The kind-granularity question (`revolution_count`) is an owner registry decision — cheap to add
under the documented "Adding a quantity kind" path if wanted; nothing chains wrongly today.

None of these findings blocks S15 (solveLinear) — it touches pipeline capability, not these
pages.
