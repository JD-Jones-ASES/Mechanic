# S05 — curved-beam

- **ID / Title:** S05 — curved-beam (Winkler bending: crane hook / press frame / C-clamp)
- **Phase:** 2
- **Type:** THING
- **Size:** S
- **Status:** FULL

## Goal

`/things/curved-beam/` live: Winkler curved-beam bending for a rectangular section — the crane
hook / press frame / C-clamp calculation. Pure authored closed forms (the log-formula precedent
is belt-drive's exp), ZERO new machinery: no table, no solving, no kinds, no units. This is the
batch's deliberate breather; treat the small size as budget for extra care on the derivation and
the straight-beam-limit proof, not as slack. Side-by-side straight-beam Mc/I readout shows the
curvature penalty (inner fiber up to ~1.5–2× hotter). Catalog 21 → 22.

## Entry criteria

Any false → BLOCKED, do not start (protocol §1.6, §9.1).

- Main CI green: `gh run list --branch main --limit 1`
- No PAUSED / IN_PROGRESS rows: `rg -n "PAUSED|IN_PROGRESS" docs/sessions/queue.md` returns nothing
- S04 DONE (strict queue order): `rg -n '^\| S04 .*DONE' docs/sessions/queue.md`
- Transcendental-closed-form precedent exists (exp in belt-drive verifies, so ln here will):
  `rg -n "exp" site/src/content/things/belt-drive/thing.yaml`
- Vanishing-limit test precedent exists (the pattern to imitate):
  `test -f pipeline/tests/test_disk_physics.py`

## New capabilities required

**NONE — if this work turns out to need a new engine/pipeline/schema capability, STOP and BLOCK
(protocol §9.2); do not improvise one.** This THING is deliberately zero-new-machinery to balance
the batch; a "small addition" here defeats its purpose in the plan.

## Physics scope

Rectangular section, depth h, inner/outer radii r_i, r_o, centroidal radius r_c = (r_i + r_o)/2:

- Neutral-axis radius: r_n = h / ln(r_o/r_i) — exact closed form with log.
- Eccentricity: e = r_c − r_n (small, positive; the whole model lives in this difference).
- Distances: c_i = r_n − r_i, c_o = r_o − r_n.
- Stresses: σ_i = M·c_i/(A·e·r_i) (inner fiber, hot), σ_o = M·c_o/(A·e·r_o) (outer fiber).
- Hook case (combined direct load): M = P·r_c about the centroid, σ = P/A + bending — the
  combined-loading precedent is eccentric-column.
- Straight-beam comparison readouts: σ_straight = M·c/I with c = h/2, I = A·h²/12, side by side —
  the curvature-penalty ratio is the page's point.
- Sign convention trap: pin Shigley's (M positive puts the inner fiber in tension — the hook
  case) once, in overview.mdx and a thing.yaml comment; sources differ.

Citations: Shigley's *Mechanical Engineering Design*, 10th ed., §3-18 (curved beams in bending;
Table 3-4 gives the rectangular-section r_n). Cross-check: Timoshenko, *Strength of Materials*,
Part I/II (the classic treatment). Independent test oracle: Roark's *Formulas for Stress and
Strain*, 8th ed., ch. 9 curved-beam formulas. Golden: a Shigley §3-18 worked example (the crane
hook family) — pin the book's numbers in a comment; do not reconstruct from memory.

## Envelopes

- r_i > 0 → **invalid** (r_i = 0 makes ln blow up; physically there is no beam). Global.
- r_o > r_i → **invalid** (geometry). Global.
- r_c/h large → **warn**: the straight-beam formula is adequate here; the two models converge.
  This is the honest "you don't need this page" banner — the convergence itself is machine-proven
  in the physics test (the vanishing-hole pattern from rotating-disk-bore).
- Positivity on M (or P), A-defining dimensions.

## Materials axis

σ_y binds (SF readout against the inner-fiber stress). The Winkler stress distribution itself is
statics + section geometry — E does not enter, and no deflection readout is in scope, so E and ρ
are honestly unbound. State that on the page rather than padding the axis.

## Sim sketch

Section depth-strip with the hyperbolic σ(r) distribution across it: inner fiber hot, neutral
axis visibly shifted from the centroid toward the inner fiber (draw BOTH axes — the shift IS the
physics). Dashed overlay: the straight-beam linear distribution. The r_c/h knob slides the two
distributions toward coincidence — the convergence the warn banner talks about, made visible.
`StressBands` for σ_i vs σ_y; `SimRefusal` consumed for invalid geometry. Component
`CurvedBeamSim.tsx` in `site/src/components/sims/`, draw key registered in the SIMS map in
`site/src/components/ThingWidget.tsx`; new SVG classes in `site/src/styles/global.css`.

## Deliverables

- `site/src/content/things/curved-beam/{thing.yaml, overview.mdx, failure.mdx}`
- `CurvedBeamSim.tsx` + SIMS registration + global.css classes
- `pipeline/tests/test_curved_beam_physics.py` — independent re-derivation (equilibrium of the
  hyperbolic stress distribution: force resultant zero through r_n, moment resultant = M), the
  Roark-oracle numeric cross-check, the Shigley golden, and the series-expansion limit proof
- e2e pins in `site/e2e/things.spec.ts`: presence + refusal at minimum
- Bookkeeping per protocol §7 (queue row, log entry, CLAUDE.md + README counts, roadmap)
- NO registry diffs — see Exit criteria

## Exit criteria

- Catalog count = 22 on `/things/`, in CLAUDE.md's catalog-state line, and README.
- `uv run pytest -q` green, count strictly above pre-session; `test_curved_beam_physics.py` collected.
- Machine-proven fact: Winkler → Mc/I as r_c/h → ∞, by series expansion in the physics test —
  the leading term of σ_i expanded in h/r_c is exactly the straight-beam value, remainder O(h/r_c).
- Zero-machinery honored, checkable:
  `git diff main -- pipeline/src/mech_pipeline/kinds.py site/src/engines/units.ts site/src/content.config.ts`
  is empty on the branch.
- `pnpm build` clean; visual pass per §5: shifted neutral axis visible, r_c/h knob converges the
  two curves, refusal SEEN at r_o ≤ r_i, material swap moves SF not σ. Screenshots to scratchpad.
- Log entry appended; queue row S05 → DONE with PR#; deploy verified live.

## Out of scope

- Non-rectangular sections (trapezoid, T, round — Shigley Table 3-4 has them; future).
- Deflection of curved beams (Castigliano) — a different page.
- Any registry or schema change whatsoever.

## Notes

- THE named trap (from the approved design): the series-expansion proof needs SymPy assumption
  flags set — declare r_i, r_o, h, r_c positive real, or `ln(r_o/r_i)` will not expand/simplify
  and the limit check silently fails to verify. Budget time for coaxing `series`/`limit`; the
  physics is easy, the assumptions bookkeeping is the work. The log entry must say the proof
  actually verified, not "should verify".
- e = r_c − r_n is a difference of nearly equal numbers at large r_c/h — in the numeric golden,
  check conditioning before blaming the formula.
- Siblings to imitate: `rotating-disk-bore` (the vanishing-limit test pattern), `eccentric-column`
  (combined P + M page structure), `belt-drive` (transcendental closed form in thing.yaml).
  Cross-link cantilever-beam / simply-supported-beam (the straight limit), pressure-vessel and
  thick-walled-cylinder (the "geometry concentrates stress on the inside" family).
- Size S: if all gates pass with ≥50% context left, the continuation rule (protocol §2) makes
  S06 fair game — full startup checks on its brief first.
- Read the S04 log entry's `Notes-for-next` before starting (protocol §1.4).
