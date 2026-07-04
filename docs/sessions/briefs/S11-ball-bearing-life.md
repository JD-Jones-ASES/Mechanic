# S11 — ball-bearing-life

- **ID / Title:** S11 — ball-bearing-life (rolling-contact load-life + Weibull reliability)
- **Phase:** 2
- **Type:** THING (the stretch appendix, if attempted, adds engine work; the base THING does not)
- **Size:** M
- **Status:** FULL

## Goal

THING #28 live at `/things/ball-bearing-life/`: bearing load-life closed forms with ball/roller as
configurations, a life-in-hours readout, and the Weibull reliability adjustment beyond R = 0.90.
C10 and C0 are honest catalog-value knobs — the page teaches what the catalog number MEANS, it does
not scrape catalogs. First `probability` quantity kind; adds `h` and `Mrev` display units (S07
already added Hz/s/ms; `Mrev` converts a revolution count, not a time). Catalog 27 → 28. The X,Y
equivalent-load threshold-table module is an OPTIONAL stretch appendix (see below) and cannot
block the merge.

## Entry criteria

Each with a check command; any false → BLOCKED, do not start (protocol §1.6).

- Main CI green: `gh run list --branch main --limit 1`
- No PAUSED/IN_PROGRESS rows: `rg -n '\|\s*(IN_PROGRESS|PAUSED)\s*\|' docs/sessions/queue.md`
  → expect NO match (exit 1)
- Dependency S10 DONE (strict queue order): `rg -n '^\| S10 .*DONE' docs/sessions/queue.md` → one match
- `probability` kind absent (this session adds it): `rg -n 'probability' pipeline/src/mech_pipeline/kinds.py`
  → expect exit 1; a match means a prior session improvised it — stop and reconcile with `log.md`
- `Mrev`/`h` display units absent: `rg -n 'Mrev' site/src/engines/units.ts` → expect exit 1
- exp/ln residual verification precedent exists: `rg -n 'exp' pipeline/tests/test_belt_physics.py` → matches

## New capabilities required

This session builds registry-level additions (authority: batch-4 design, owner ruling 2026-07-04):

1. `probability` quantity kind in `pipeline/src/mech_pipeline/kinds.py` — dimensionless, deliberately
   incompatible with `ratio`/`efficiency` so reliability R can never chain into a geometric-ratio port.
2. Display units in `site/src/engines/units.ts` `DISPLAY_FACTORS`: `h` (factor 3600, on time),
   `Mrev` (factor 1e6, on the revolution count), `min` (factor 60) only if a readout wants it.
   `check-units.mjs` must pass — an unregistered display unit fails the build by design.
3. STRETCH ONLY: the threshold/step lookup mode of the `table` plan step, reserved in the S01/ADR-0009
   schema. Authority: owner ruling 2026-07-04 — "explicitly optional so it cannot block the merge."

Anything else the base THING turns out to need → STOP and BLOCK (protocol §9.2); do not improvise.

## Physics scope

- Load-life at rated reliability: `L10 = 1e6 * (C10/P)**a` in revolutions, with a = 3 (ball) and
  a = 10/3 (roller) as two configurations — a is a cited per-configuration constant, NOT a knob.
  The 1e6 is the rating-basis definition (C10 is the load producing a 10⁶-rev L10); cite it. It is
  not a display artifact.
- Life in hours, authored in SI: `t_10 * omega = 2*pi*L10` (ω angular_velocity, SI rad/s, rpm display;
  t_10 time kind, `h` display). Shigley's `L_h = 1e6*L10/(60*n)` is the display-unit form of the same
  fact — the 60 must NOT appear in a residual.
- Reliability beyond 90%: `x(R) = x0 + (theta - x0)*(ln(1/R))**(1/b)` (Shigley eq. 11-5 form —
  verify the equation number against the printing when pinning), adjusted life `L_R = L10 * x(R)`;
  sanity: x(0.90) ≈ 1. Weibull parameters x0, θ, b are transcribed from Shigley 10th ed §11-4's
  printed set — do NOT trust memory; pin exact values in `sources[].verification`.
- Citations: Shigley 10th ed ch. 11 (§11-3 load-life at rated reliability; §11-4 reliability-life via
  Weibull). Juvinall & Marshek ch. 14 as cross-check. NAME ABMA Std 9 / ISO 281 as the origin of the
  rating framework — named, never ingested; the values used are as printed in Shigley
  (accessible-textbook tier per `docs/data-provenance.md`).
- Golden: a Shigley ch. 11 worked example (load-life sizing or the §11-4 reliability example) —
  transcribe given/answer values from the printing, pin source + value in a test comment.
- Independent cross-check: `pipeline/tests/test_bearing_physics.py` re-derives the reliability
  adjustment from the Weibull CDF directly — `R = exp(-((x - x0)/(theta - x0))**b)`, inverted with
  SymPy — and matches the authored closed form symbolically. Do not import thing.yaml residuals.

## Envelopes

- Static overload: WARN when P > C0 (knob-relative bound; C0 = static rating knob). Reason: above
  the static rating the failure mode is brinelling, not the rating fatigue math — the failure.mdx story.
- Reliability domain: INVALID outside 0.9 ≤ R < 1, SCOPED to the reliability-adjusted variables
  (L_R and descendants) — rated-reliability readouts stand (eccentric-column `scope:` precedent).
  Reason: the Weibull fit is cited on that domain; R → 1 diverges.
- Positivity on P, C10, C0, ω: structural invalids.

## Materials axis

NONE — a geometry/catalog THING like planetary-gearset and fourbar-linkage. Bearing steel is not a
user axis: the catalog ratings C10/C0 already encapsulate it, so material binding is not "physically
natural" here (invariant 3's constraint). Flag this consciously in overview.mdx AND the log entry.

## Sim sketch

Schematic bearing cross-section (races, balls, cage) rotating via `useSimClock` at knob speed; a life
readout bar making the a-power sensitivity legible — double P, watch life drop to ~1/8 (ball). Keep
the drawing schematic; readouts are the product. `SimRefusal` for the R envelope — scoped, so the
adjusted-life readout is withheld while the page stands. Component `site/src/components/sims/BearingSim.tsx`,
draw key `ball-bearing-life`, new SVG classes in `global.css`.

## Deliverables

- `site/src/content/things/ball-bearing-life/{thing.yaml, overview.mdx, failure.mdx}`
- `BearingSim.tsx` + draw-key registry entry + `global.css` classes
- `pipeline/src/mech_pipeline/kinds.py`: + `probability`
- `site/src/engines/units.ts`: + `h`, `Mrev` (+ `min` if used); `check-units.mjs` coverage
- `pipeline/tests/test_bearing_physics.py` (repo short-name convention, cf. `test_belt_physics.py`)
- e2e pins: presence + refusal (R out of domain → withheld readout visible)
- Stretch only: threshold-mode code (`compile.py`, `verify.py`, `types.ts`, `relation.ts`) + Table 11-1 rows

## Exit criteria

- `/things/` shows 28; CLAUDE.md catalog line + README count updated to 28
- `uv run pytest -q` (in `pipeline/`) green, ≥ 5 new tests in `test_bearing_physics.py` over baseline
- Machine-proven fact: the authored reliability closed form is SymPy-equivalent to the inversion of
  the Weibull CDF (independent route), and all solved forms pass residual-zero sampling
- `rg -n 'probability' pipeline/src/mech_pipeline/kinds.py` and `rg -n 'Mrev' site/src/engines/units.ts`
  both match; check-units gate green inside `pnpm build`
- Golden pinned to the named Shigley example, source comment in the test
- Visual pass per §5: normal + refused screenshots, what-was-checked described
- Log entry appended; queue row S11 → DONE with PR# + date

## Stretch appendix — X,Y equivalent load (OPTIONAL; must not block the merge)

Decision gate: attempt ONLY after the base THING has passed every §3 gate and ≥ 40% context remains.
Otherwise skip without ceremony — no queue consequence; name it as future work in Notes-for-next.

- Scope: third `table` lookup mode — threshold/step. `P = X*V*F_r + Y*F_a` with X,Y switched on
  F_a/(V·F_r) vs e per Shigley Table 11-1 (ABMA-derived values as printed in the textbook; same
  named-not-ingested provenance as above). Adds a `combined-load` configuration.
- Implement across `compile.py` / `verify.py` / `types.ts` / `relation.ts` with the FULL S01
  verification story: structural checks, node-exact transcription certificate, per-sample
  back-substitution, out-of-domain refusal probe, parity samples vs mpmath. Extend the S01 capability
  tests; do not fork a parallel test path.
- Mini exit criteria (all or none — a half-built mode gets stripped, never merged):
  - threshold mode covered by the same certificate tests as interpolate-linear/exact-row
  - Table 11-1 rows transcribed, citation resolving in `sources[]`
  - e2e pin for the combined-load configuration including its refusal
  - `/verification/` audit block shows the table's machine-proven statement
- If attempted and not finishable: strip the stretch commits cleanly before opening the PR; the base
  THING merges alone. Never PAUSE the row for the stretch.

## Out of scope

ISO 281 modified-life factors (a_ISO, lubrication/contamination) · ingesting ABMA/ISO documents or
scraping any bearing catalog (C10/C0 stay knobs) · application/spectrum loading · a material axis ·
the X,Y module beyond the appendix's decision gate.

## Notes

- The 60-and-10⁶ trap: the engine computes in SI. The 10⁶ in the L10 relation is a cited rating
  definition and belongs there; the 60 in Shigley's hours formula is a display artifact and does not.
- `probability` ≠ `ratio`: the new kind exists precisely so R cannot chain into ratio/efficiency
  ports. Do not shortcut with `kind: ratio`.
- Weibull parameters quoted from memory are a provenance violation waiting to happen — transcribe, pin.
- a is per-configuration, not a knob; DOF arithmetic per configuration must come out right.
- Imitate: planetary-gearset (no-material-axis framing), belt-drive (exp/ln residuals),
  eccentric-column (`scope:` syntax for the scoped invalid).
- Cross-links to author: torsion-shaft / combined-shaft (the carried shaft), spur-gear-pair (gear
  separating force = radial load; an explicit Phase 4 chain-port pair), shaft-critical-speed.
