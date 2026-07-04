# S16 — End-restrained family: fixed-fixed beam + fixed-fixed torsion shaft

> DRAFT: verified by the Phase 2 closing session against merged reality before execution.

- **ID / Title:** S16 — fixed-fixed-beam + fixed-fixed-torsion-shaft (two pure solve_linear consumers)
- **Phase:** 3
- **Type:** THING (×2 — one queue row, one PR)
- **Size:** M
- **Status:** DRAFT (see header note)

## Goal

Two THINGs, zero schema or engine changes, exercising S15's capability at both ends of its range:
fixed-fixed-beam (UDL) is the N=4 op-cap stress test — a 4-unknown group {R_A, M_A, R_B, M_B};
fixed-fixed-torsion-shaft is the smallest coupled case — a 2×2 {T_A, T_B}. Both live with full
per-THING gates, cross-linked to their determinate siblings. Catalog +2.

## Entry criteria

Any false → BLOCKED, do not start (§1.6, §9.1).

- Main CI green: `gh run list --branch main --limit 1` → latest run success.
- No PAUSED/IN_PROGRESS rows: `rg -n '\|\s*(IN_PROGRESS|PAUSED)\s*\|' docs/sessions/queue.md` → zero matches.
- Phase 3 ruled: `rg "Phase 3 approved — JD" docs/sessions/queue.md` → the literal ruling line exists
- Dependency S15 DONE: `rg '\| S15' docs/sessions/queue.md` → status column reads DONE.
  (S17 is NOT a dependency — S16 and S17 each depend only on S15 and may run in either order.)
- Capability exists: `rg "certify_linear_group" pipeline/src/mech_pipeline/verify.py`,
  `rg "solve_linear" site/src/content.config.ts`, `test -f pipeline/tests/test_solve_linear.py`.
- Authoring docs shipped: `rg "solve_linear" docs/authoring-things.md`.
- Kinds registered, property seeded (no new ones): `rg '"torque"' pipeline/src/mech_pipeline/kinds.py`
  and `rg "shear_modulus" data/materials/steel-a36.yaml`.
- propped-cantilever's existence is NOT an entry criterion (S15's fallback may have deferred it to
  an S15b row — if that row sits QUEUED above you, §1.2f says it is yours first).

## New capabilities required

NONE — if this work turns out to need a new engine/pipeline/schema capability, STOP and BLOCK
(§9.2); do not improvise one. Specifically: a 4×4 op-cap trip is NOT a capability need — the
pre-authorized fallback is the symmetry reduction below; raising SIMPLIFY_OPS_CAP or the 4-target
cap is the future LU-runtime ADR's business, never yours.

## Physics scope

**fixed-fixed-beam** — prismatic, span L, full-span UDL w, rectangular b×h section (I = bh³/12,
c = h/2, imitate cantilever-beam).

- Group {R_A, M_A, R_B, M_B} from: ΣF `R_A + R_B − w·L = 0`; ΣM about A; slope compatibility
  θ_B = 0; deflection compatibility δ_B = 0. Formulate via the release method: primary structure =
  cantilever fixed at A, redundants R_B and M_B, superposition from the cantilever tables
  (UDL: θ = wL³/6EI, δ = wL⁴/8EI; end load: PL²/2EI, PL³/3EI; end moment: ML/EI, ML²/2EI).
  **Signs are THE trap**: under one global convention the two end moments carry opposite algebraic
  signs; fix the convention in overview.mdx, hold it, and assert golden MAGNITUDES.
- Goldens: **|M_end| = wL²/12** (both ends), R_A = R_B = wL/2, **M_mid = wL²/24** (sagging),
  **δ_max = wL⁴/(384·E·I)** at midspan (clean by symmetry).
- Downstream: σ_max = (wL²/12)·c/I (ends govern — 2× midspan; say so in prose), δ_max, SF.
- Cross-check (`test_fixedfixed_beam_physics.py`): `dsolve(EI·v'''' = −w)` with
  v(0)=v'(0)=v(L)=v'(L)=0; recover all four reactions independently; compare to emitted solutions.
- **PRE-AUTHORIZED FALLBACK (owner 2026-07-04):** if the general 4×4 trips the op cap or emits
  illegible LaTeX, author the symmetric-UDL configuration with an explicit M_A = M_B constraint
  (magnitude convention) reducing the group to 3 unknowns; name the general asymmetric case as
  future work in overview.mdx and the log Deviations line. Do NOT raise the cap ad hoc.

**fixed-fixed-torsion-shaft** — solid circular shaft radius r, fixed both ends, torque T applied
at x = a from the left; b = L − a; J = πr⁴/2 (imitate torsion-shaft).

- Group {T_A, T_B} from: equilibrium `T_A + T_B − T = 0`; twist compatibility at the load point
  `T_A·a/(G·J) − T_B·b/(G·J) = 0`.
- Goldens: **T_A = T·b/L, T_B = T·a/L**. Trap: the LARGER reaction lands on the SHORTER segment —
  do not flip a and b; the golden asserts T_A with b in the numerator.
- Downstream: τ_1 = T_A·r/J and τ_2 = T_B·r/J as separate readouts (no max() in a closed form);
  φ at the load point = T_A·a/(G·J).
- Cross-check (`test_fixedfixed_shaft_physics.py`): Castigliano/strain energy —
  U = T_A²·a/(2GJ) + T_B²·b/(2GJ), minimize over the redundant subject to equilibrium; re-derive
  T·b/L without importing thing.yaml residuals.
- Cross-link the existing torsion-shaft page from overview.mdx (link only; do not edit that THING).

Citations, both: Gere & Goodno, *Mechanics of Materials* (indeterminate beams ch. 10; indeterminate
torsion ch. 3, recent eds); Hibbeler (ch. 12 / ch. 5) as cross-check. Web-pin wL²/12 and T·b/L in
`sources[].verification`; chapter-level pins are honest, fabricated §-numbers are not. Each THING
also gets one numeric hand-check golden, derivation in the test comment.

## Envelopes

All warn severity, global; no invalids. Reasons: yield voids linear elasticity; large deflection
voids superposition.

- Beam: warn σ_max > σ_y; warn δ_max > L/10; match any slenderness warn cantilever-beam carries.
- Shaft: mirror torsion-shaft's existing shear-yield warn convention exactly. Keep a strictly
  interior via knob bounds (siblings' pattern) — at a→0 or a→L a segment vanishes.
- det(A) guards are structurally nonzero in-bounds (beam: EI-power terms; shaft: (a+b)/GJ). Do not
  manufacture singular states; the e2e refusal pin = warn banner, per things.spec.ts sibling pattern.

## Materials axis

- Beam binds E: youngs_modulus, sigma_y: yield_strength, rho: density (cantilever-beam trio).
- Shaft binds G: shear_modulus, sigma_y: yield_strength, rho: density (torsion-shaft's exact trio,
  its thing.yaml lines 135–138).
- No new columns. Legibility moment for BOTH overviews: reactions are material-independent
  (stiffness cancels in the compatibility ratio); material still moves δ, φ, τ, SF.

## Sim sketch

Both on `statics-cascade` (existing engine). Beam: two wall hatches, UDL arrows, reaction arrows +
end-moment arcs scaled to values; imitate cantilever-beam's draw; key `fixed-fixed-beam`. Shaft:
imitate torsion-shaft's draw; applied torque arrow at x = a, reaction arcs at both walls; key
`fixed-fixed-torsion-shaft`. New SVG classes in `global.css`; draws consume evaluated outputs only.

## Deliverables

- `site/src/content/things/fixed-fixed-beam/{thing.yaml, overview.mdx, failure.mdx}`
- `site/src/content/things/fixed-fixed-torsion-shaft/{thing.yaml, overview.mdx, failure.mdx}`
- Two draw components + CSS classes
- `pipeline/tests/test_fixedfixed_beam_physics.py` (dsolve + goldens),
  `pipeline/tests/test_fixedfixed_shaft_physics.py` (Castigliano + goldens)
- e2e pins (presence + warn banner) for both; `sources[].verification` populated
- Bookkeeping per §7 (queue row, log entry, CLAUDE.md/README counts, roadmap)

## Exit criteria

- Catalog +2 on `/things/` and in CLAUDE.md/README.
- `uv run pytest -q` green; count ≥ previous + 6.
- Machine-proven facts: |M_end| − wL²/12 ≡ 0 (or the symmetric-fallback equivalent, recorded as a
  deviation) and T_A − T·b/L ≡ 0 by total back-substitution; δ_max = wL⁴/(384EI) asserted in pytest.
- Both compiled artifacts carry `via.solve_linear` provenance + det `nonzero` guards
  (post-`pnpm build` jq check under `site/src/generated/things/`; never committed).
- `pnpm build` + unit + e2e (things/prose/a11y) + axe green; both `/verification/` audit blocks present.
- Visual pass per §5 on BOTH pages (normal + warn banner screenshotted, described).
- If the 4×4 fallback fired: log Deviations names it AND overview.mdx names the general case as
  future work.
- Log entry appended; queue row DONE with PR#.

## Out of scope

- Any schema/engine/pipeline change (→ §9.2 BLOCK); raising SIMPLIFY_OPS_CAP or the 4-target cap;
  LU runtime.
- Load cases beyond the shipped ones (beam: UDL only; shaft: single applied torque).
- Edits to the existing torsion-shaft THING (cross-link only).
- Two-span continuous beam (deferred — Phase 5+ or owner request; do not batch it thin).

## Notes

- **Sequencing:** build the 2×2 shaft FIRST (small, certain), then the 4×4 beam (the risk item).
  Two THINGs ride one row and one PR; if the beam overruns context after the shaft is complete,
  §9.4 PAUSE with the shaft clean on the branch — do not merge a one-THING PR against a two-THING
  row, and never merge a half-verified THING.
- Sign convention (beam) and a/b orientation (shaft) are the two traps that produce
  wrong-but-plausible goldens. Assert magnitudes; document the convention. Reactions being
  independent of E and G is correct physics — do not "fix" it.
- Siblings to imitate: propped-cantilever (the reference solve_linear group block — copy its
  authoring shape; if S15 deferred it, copy the test_solve_linear.py fixture instead),
  torsion-shaft (geometry/binds/draw), cantilever-beam (envelopes/section pattern).
- PowerShell round-trip trap (§10.1); cold build 3–4 min, slow not hung (§10.2). PR title per §6:
  `THING <N>–<N+1>: fixed-fixed beam + fixed-fixed torsion shaft (Phase 3 consumers)`.
