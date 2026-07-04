# S15 — solveLinear capability + ADR-0008 amendment + propped-cantilever

> DRAFT: verified by the Phase 2 closing session against merged reality before execution.

- **ID / Title:** S15 — solveLinear capability + ADR-0008 amendment + propped-cantilever (reference consumer)
- **Phase:** 3
- **Type:** engine+THING
- **Size:** L — solo; never claimed via the continuation rule. Growth beyond L is a PAUSED trigger (§9.4).
- **Status:** DRAFT (see header note)

## Goal

The pipeline certifies and exactly solves proven-linear square systems declared as
configuration-level `solve_linear` groups, desugaring them into ordinary verified closed-form eval
steps — zero new runtime engine. ADR-0008 records the implementation decisions under ACCEPTED-SPLIT;
CLAUDE.md carries the pre-agreed carve-out; docs and `/verification/` describe the certificate.
propped-cantilever ships as the reference consumer (catalog +1): the 3×3 {R_A, R_B, M_A} —
eccentric-column's role for solve1d.

## Entry criteria

Any false → BLOCKED, do not start (§1.6, §9.1).

- Main CI green: `gh run list --branch main --limit 1` → latest run success. Red → §9.3 preempts.
- No PAUSED/IN_PROGRESS rows: `rg "PAUSED|IN_PROGRESS" docs/sessions/queue.md` → zero matches.
- Phase 3 ruled: `rg "Phase 3 approved — JD" docs/sessions/queue.md` → exactly one line (§8).
- All Phase 2 rows DONE/SKIPPED: `rg "QUEUED" docs/sessions/queue.md` → no Phase 2 row.
- ADR-0008 present, split sign-off recorded: `test -f docs/decisions/ADR-0008-cyclic-solving.md`
  and `rg "ADR-0008 signed off 2026-07-04" docs/sessions/queue.md`.
- solve1d pattern to mirror: `rg "verify_solve1d_configuration" pipeline/src/mech_pipeline/verify.py`
  and `test -f pipeline/tests/test_solve1d.py`.
- Runtime `nonzero` guard kind (det guard rides it): `rg '"nonzero"' site/src/engines/relation.ts`;
  op cap to reuse: `rg "SIMPLIFY_OPS_CAP = 200" pipeline/src/mech_pipeline/verify.py`.

## New capabilities required

ONE capability, design DECIDED — implement, do not redesign. **`solve_linear` certified
linear-group solving.** Authority: ADR-0008 part (a), ACCEPTED-SPLIT, owner sign-off 2026-07-04.

- **Authoring:** configuration-level `solve_linear: [{targets: [R_A, R_B, M_A], relations:
  [sum-forces, sum-moments, compat-deflection]}]` — NOT per-target `solutions` entries.
- **Ordering rule v1:** groups evaluate after constraints, before `solutions` entries; coefficients
  read only inputs/constraints/material symbols/earlier groups; anything else → loud BuildError.
- **verify.py gains ONE function, `certify_linear_group()`:** (a) affine proof per relation —
  `∂²residual/∂t_i∂t_j ≡ 0` for every target pair AND target-free coefficients; (b) squareness
  `len(targets) == len(relations)` + coverage (every target appears; every relation reads ≥1 target);
  (c) exact solve: A = Jacobian wrt targets, b = −residual|targets→0, `sp.linsolve` requiring a
  unique FiniteSet — else BuildError naming the group; (d) det(A) emitted as a runtime `nonzero`
  guard (existing kind — zero engine change) AND checked nonzero at every verification sample at
  50 dps; (e) DESUGAR: solved forms join `resolved` and flow through the EXISTING resolve_solutions
  → verify_solutions_against_relations (tiered_zero, ≥30 samples at 50 dps) → manifold_points →
  dof_check → `_samples` parity oracle. Nothing new after desugar.
- **Caps (DECIDED):** ≤4 targets/group; op cap = SIMPLIFY_OPS_CAP (200) on coefficients AND solved
  forms; a trip → BuildError naming a future LU-runtime ADR (the recorded revisit trigger), never
  an ad-hoc raise.
- **Artifact (DECIDED):** plan steps stay `type: eval` + additive optional `via: {solve_linear:
  {relations: [...], det_fn: ...}}`; `schema_version` stays 1; `solveND` stays reserved, unbuilt.
- **compile.py:** parse/validate groups, enforce ordering, emit desugared steps + det guard.
  **emit_js.py:** no new path — existing CSE shares the det denominator; verify, don't rebuild.
- **CLAUDE.md (DECIDED — apply verbatim, do not reword):** extend the "only paths" sentence to
  three (authored closed forms, bracketed `solve1d`, certified `solve_linear`), then append:
  *"Certified `solve_linear` groups are not blind solving: SymPy `linsolve` runs only on a square
  system PROVEN affine in its targets (∂²r/∂tᵢ∂tⱼ ≡ 0 for every target pair; target-free, op-capped
  coefficients) — bounded deterministic Gaussian elimination — and the emitted closed forms pass
  the same total back-substitution verification as authored solutions."* Replace the out-of-scope
  cyclic-solving line with "Nonlinear/cyclic solving (`solveND`, ADR-0008 part (b) — PROPOSED,
  unbuilt; certified linear `solve_linear` groups are the shipped subset)".

## Physics scope

propped-cantilever: prismatic beam, fixed at A (x=0), roller at B (x=L), full-span UDL w;
rectangular b×h section → I = bh³/12, c = h/2 (imitate cantilever-beam).

- Group (fix ONE sign convention in overview.mdx and hold it): ΣF `R_A + R_B − w·L = 0`; ΣM@A
  `M_A + R_B·L − w·L²/2 = 0`; compatibility (primary structure = cantilever at A, redundant R_B,
  superposition): `w·L⁴/(8·E·I) − R_B·L³/(3·E·I) = 0`.
- Build must prove: **R_B = 3wL/8, R_A = 5wL/8, M_A = wL²/8** (hogging at wall).
- Downstream readouts (DECIDED): |M|_max = M_A = wL²/8 (governs; sagging peak 9wL²/128 at x = 5L/8
  goes in prose only); σ_max = M_A·c/I; δ_mid = wL⁴/(192·E·I) (clean; true δ_max ≈ wL⁴/185EI at
  irrational x = (1+√33)L/16 — prose only); SF = σ_y/σ_max.
- overview.mdx: the superposition/compatibility identity MACHINE-CHECKED as a derivation step —
  possible because closed forms exist (unlike solve1d's taint). The pedagogical payoff; do it.
- Citations: Gere & Goodno, *Mechanics of Materials*, indeterminate beams (ch. 10 recent eds);
  Hibbeler ch. 12 cross-check. Web-pin an accessible R_B = 3wL/8 statement in
  `sources[].verification`; chapter-level pins are honest, fabricated §-numbers are not.
- Goldens: symbolic R_B = 3wL/8, M_A = wL²/8 + one numeric hand-check (derivation in test comment).
- Cross-check (`test_propped_physics.py`): `dsolve(EI·v'''' = −w)`, BCs v(0)=v'(0)=v(L)=0 and
  EI·v''(L)=0; extract reactions; compare to emitted solutions — never import thing.yaml residuals.

## Envelopes

Mirror cantilever-beam's set — all warn, global: σ_max > σ_y (yielded — linear numbers void);
δ_mid > L/10 (small-deflection broken); any slenderness warn the sibling carries. No invalids.
det(A) is structurally nonzero for in-bounds knobs — do NOT manufacture a singular configuration;
the e2e "refusal" pin = the yield warn banner, per cantilever-beam in `site/e2e/things.spec.ts`.

## Materials axis

Binds E: youngs_modulus, sigma_y: yield_strength, rho: density (cantilever-beam trio). No new
columns. Trap: **E cancels in the reactions**; material moves δ and SF but NOT R_B — correct
physics, say it in the overview as a legibility moment.

## Sim sketch

Engine `statics-cascade` (existing; NO new sim engine — decided). Side view: wall hatch at A,
roller at B, UDL arrows, reaction arrows + M_A arc scaled to values. Imitate cantilever-beam's
draw; key `propped-cantilever`; new SVG classes in `global.css`; draw consumes evaluated outputs only.

## Deliverables

- `docs/decisions/ADR-0008-cyclic-solving.md` (ACCEPTED-SPLIT confirmed; implementation
  placeholders filled if S00 left them); `CLAUDE.md` (verbatim edits + catalog count);
  `docs/architecture.md` (stage + `via`); `docs/authoring-things.md` (syntax, ordering, caps)
- `site/src/content.config.ts` (authored schema + compiled `via`);
  `pipeline/src/mech_pipeline/compile.py`, `verify.py` (`certify_linear_group`)
- `pipeline/tests/test_solve_linear.py` — positive fixture + negatives (nonlinear-in-targets,
  non-square, singular-at-sample, op-cap trip, downstream-solution-contradicts-relation), each
  BuildError naming thing/configuration/relation/target
- `site/src/content/things/propped-cantilever/{thing.yaml, overview.mdx, failure.mdx}`;
  `pipeline/tests/test_propped_physics.py`; draw component + CSS; e2e pins (presence + warn banner)
- `/verification/` coupled-linear-system gate bullet; bookkeeping per §7 (queue, log, counts, roadmap)

## Exit criteria

- `rg -i "accepted" docs/decisions/ADR-0008-cyclic-solving.md` shows split-accept with 2026-07-04;
  `rg "solveND" pipeline/src site/src/engines` → no implementation hits (reserved-name mentions ok).
- `uv run pytest -q` green; count ≥ previous + 8 (≥6 solve_linear, ≥2 propped physics).
- Post-`pnpm build`: compiled propped-cantilever artifact has `type: eval` steps for R_A/R_B/M_A
  carrying `via.solve_linear` + a det `nonzero` guard in `guards[]` (jq; never commit generated);
  `git diff main -- site/src/engines/` empty except additive-optional fields in `types.ts`.
- Machine-proven fact: R_B − 3wL/8 ≡ 0 and M_A − wL²/8 ≡ 0 by total back-substitution into all
  three relations; the compatibility identity is a machine-verified derivation step.
- `pnpm build` green (parity covers new samples); unit + e2e things/prose/a11y + axe green incl.
  the new page; `/verification/` describes the certificate accurately (linearity proof, exact
  solve, det guard, total back-substitution — review angle (b) checks the claim).
- Catalog +1 on `/things/` and CLAUDE.md/README; visual pass per §5 (normal + warn screenshotted,
  described); log entry appended; queue row DONE with PR#.

## Out of scope

- `solveND` / nonlinear groups (ADR-0008 part (b), PROPOSED — building unsigned is §9.2).
- LU/numeric runtime step — the op-cap BuildError names it as a future ADR; do not draft-and-build.
- Groups interleaved with `solutions` or reading later state; >4 targets; any cap raise.
- chain-demo/chain-builder exposure (Phase 4); fixed-fixed family, composite-bar, two-span beam.

## Notes

- **Pre-authorized fallback (owner, 2026-07-04):** if the full per-THING gate cannot finish with
  §9.4 margin, ship capability + tests + ADR/docs as a complete engine-session PR (§3 gate minus
  items 2–4, plus certificate tests); record the deviation in the log, add a QUEUED row
  `S15b — propped-cantilever (pure consumer)` in the same PR, mark S15 DONE. Never merge a half-verified THING.
- `linsolve` runs ONLY after the affine certificate passes. No `sp.solve` anywhere. The parity
  oracle needs no root machinery — closed forms compare directly. Mirror `test_solve1d.py`'s
  fixture style (in-memory thing dicts, loud BuildError asserts).
- Siblings: eccentric-column (how a solver capability presents on the page and `/verification/`),
  cantilever-beam (thing.yaml shape, binds, statics-cascade, section), simply-supported-beam (UDL).
- PowerShell round-trip trap (§10.1); cold build 3–4 min, slow not hung (§10.2). PR title per §6:
  `Phase 3 (item 1): solveLinear + propped cantilever (THING <N>)`.
