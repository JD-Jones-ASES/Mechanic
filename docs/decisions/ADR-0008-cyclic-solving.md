# ADR-0008: Cyclic / N-dimensional solving (solveND)

**Status:** ACCEPTED (split scope) — owner sign-off JD 2026-07-04, adopting the Recommendation
below as written: **(a) `solveLinear` is approved to build** (statically indeterminate elastic
structures — exact solve, full certificate; direction: prove linearity, solve exactly at build
time, desugar to ordinary verified closed forms — zero new runtime engine); **(b) full nonlinear
`solveND` remains deferred** and requires its own ADR with the basin-certification question
answered before any build. Drafted 2026-06-10 alongside the solve1d work.

**Part (a) `solveLinear` shipped 2026-07-06 (session S15, propped-cantilever as the reference
consumer).** Part (b) `solveND` remains PROPOSED and unbuilt. See "Implementation (part a)" below.

## What it would unlock

Two THING families the current forward-DAG planner cannot express:

1. **Statically indeterminate structures** — a propped cantilever, a two-material composite bar,
   a bolted joint with a gasket: the unknowns (redundant reactions, load shares) appear in
   *coupled* relations with no evaluation order. These are core sophomore material and the most
   requested gap in the curriculum spine.
2. **Feedback chains** (Phase 4+) — a governor that throttles the motor that spins the governor;
   thermal-electrical coupling. The chain-builder's planner currently *rejects* cycles by design
   (`chain.ts`); cyclic chains are the long-term differentiator behind "chaining as the product".

## Candidate design (what sign-off would approve exploring)

- **Plan-step type `solveND`** (already reserved in the artifact schema): a SET of targets and a
  SET of declared relations, square by construction, checked square by the existing DOF/rank
  machinery at build time.
- **Runtime solver: damped Newton** on the emitted residual functions, with the Jacobian
  *emitted symbolically by SymPy at build time* (no runtime differentiation, no numerical
  Jacobian noise) — the same "shared engine, no bespoke math" shape as `solve1d`/Brent.
- **Authoring mirrors solve1d**: the author supplies an initial-guess EXPRESSION per target
  (functions of already-evaluated symbols), the way solve1d's author supplies a bracket.
- **Build-time certificate, per verification sample** (the honest-verification crux): start from
  the authored guess, run the same Newton the browser will run at high precision, require
  convergence to a residual below tolerance, back-substitute into EVERY relation, and emit the
  converged point into the parity samples so the browser's Newton is oracle-checked — the exact
  pattern solve1d ships today.

## What cannot be honestly certified (the hard part, stated plainly)

`solve1d` earns its certificate from a *theorem*: a sign change brackets a root, bisection
cannot lose it, and a one-root scan makes it unique. **No equivalent theorem exists in N
dimensions.** Newton from an authored guess can: diverge for knob settings the verification
samples missed; converge to a *different, physically wrong* solution branch (every multi-root
system has them); or oscillate. Sampling demonstrates convergence at ~30 points — it does not
prove it over the whole knob box. Mitigations on the table (each costs complexity): per-sample
basins recorded into the artifact with runtime distance-to-oracle checks; refusing (SimRefusal)
whenever Newton's residual fails to vanish or the step diverges — refusal stays the floor, as
everywhere; restricting v1 of solveND to LINEAR systems (statically indeterminate elastic
structures are linear! — LU solve, no convergence question at all, certificate restored).

## Recommendation

Split the decision: **(a) `solveLinear` for statically indeterminate THINGs** — exact solve,
total certificate, unlocks the propped cantilever / composite bar family with no honesty
compromise; **(b) full nonlinear `solveND`** — defer until a THING actually demands it, and
require its own ADR with the basin-certification question answered. This mirrors ADR-0002's
shape: ship the principled subset, leave the dangerous generality unbuilt.

## Implementation (part a — `solveLinear`, shipped session S15)

As built, matching the "prove linearity, solve exactly, desugar" direction with **zero new runtime
engine**:

- **Authoring.** A configuration carries an optional `solve_linear: [{targets: [...], relations:
  [...]}]` — a SET of coupled derived targets and the DECLARED relations that pin them. Groups
  evaluate after `constraints`, before `solutions`; a group coefficient may read only inputs,
  constraints, materials/constants, and earlier groups' targets (a forward DAG — reading a
  downstream `solutions` target fails the build). (`docs/authoring-things.md`.)
- **Certificate (`verify.certify_linear_group`).** (a) affine proof — ∂²r/∂tᵢ∂tⱼ ≡ 0 for every
  target pair and target-free coefficients; (b) square + covering; (c) exact solve — A = Jacobian
  wrt targets, b = −(residual|targets→0), `sp.linsolve` requiring a unique FiniteSet with
  target-free entries; (d) det(A) checked non-zero at every verification sample (50 dps); (e) caps —
  ≤ 4 targets/group, `SIMPLIFY_OPS_CAP` (200) on coefficients and solved forms, a trip naming a
  future LU-runtime ADR. `sp.solve` is nowhere; `linsolve` runs ONLY after the affine certificate.
- **Desugar (`compile.load_configurations`).** The solved closed forms become ordinary `type: eval`
  plan steps (carrying an additive `via.solve_linear` provenance annotation) and flow through the
  EXISTING path — `resolve_solutions` → total back-substitution into every relation (≥30 samples,
  50 dps) → manifold DOF check → `_samples` parity oracle. Nothing new runs after the desugar.
- **Runtime.** det(A) emits as an ordinary `nonzero` guard (existing kind — no engine change): a
  singular system refuses the whole evaluation. `schema_version` stays 1; `solveND` stays reserved
  and unbuilt.

The determinant frequently **cancels** in the solved forms (the propped cantilever's L³/3 divides
out, which is exactly why its reactions are material-blind), so the explicit determinant guard —
not an auto denominator guard — is what certifies non-singularity.

## Out of scope regardless

Time integration / dynamics (a different engine class), optimization, and anything that would
move computation off the static site (invariant: no server).
