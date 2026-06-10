"""Verification: the tiered equivalence checker, solution and derivation checks,
and DOF arithmetic.

Design (ADR-0002): authored solutions are the PRIMARY path; this module proves
them correct against the undirected relations. Blind solve() is not used at all
in v1 — it verifiably hangs on raw loop-closure trig systems.

The tiered checker is semi-decidable by nature: simplify() and .equals() can
both fail to certify a true identity, so the high-precision numeric tier is
load-bearing and intentionally last (sampling at 50 dps, tolerance 1e-40,
deterministic seed per check context).
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field

import sympy as sp

from . import BuildError

NUM_SAMPLES = 30
PRECISION_DPS = 50
TOLERANCE = sp.Float("1e-40")
# solve1d back-substitution tolerance: the bisection root is found at 60 dps,
# so every relation residual at the rooted point sits ~1e-45 or below for any
# honest configuration, while a wrong bracket/solution lands at O(1)+. Looser
# than TOLERANCE only because the root is numeric, not symbolic.
SOLVE1D_TOLERANCE = sp.Float("1e-25")
SOLVE1D_GRID = 33  # interior sign-change scan: detects multi-root brackets
# simplify() is super-linear and can effectively hang on large trig/radical
# expressions (the blind-solve lesson, ADR-0002). Above this op count the
# symbolic tiers are skipped and the high-precision numeric tier decides.
SIMPLIFY_OPS_CAP = 200
# Numeric-rank zero threshold for the DOF check on transcendental manifolds:
# entries are evaluated at 50 dps, so a truly dependent row collapses to
# ~1e-49 — far below the chop — while generic entries are O(1).
RANK_CHOP = sp.Float("1e-30")


@dataclass
class VarSpec:
    symbol: sp.Symbol
    unit: sp.Expr
    quantity_kind: str
    role: str  # free | material | derived
    default: float
    bounds: tuple[float, float] | None
    integer: bool
    dim: list[float] = field(default_factory=lambda: [0.0] * 7)
    name: str = ""
    latex: str = ""
    display_units: list[str] = field(default_factory=list)


def _sample_value(spec: VarSpec, rng: random.Random) -> sp.Rational:
    """A random exact rational inside the variable's bounds (so evalf can hit 50 dps)."""
    lo, hi = spec.bounds if spec.bounds else (0.1, 10.0)
    if spec.symbol.is_positive and lo <= 0:
        lo = max(lo, 1e-3) if hi > 1e-3 else hi / 100
    if spec.integer:
        lo_i, hi_i = max(int(lo), 1 if spec.symbol.is_positive else int(lo)), int(hi)
        if hi_i < lo_i:
            hi_i = lo_i
        return sp.Integer(rng.randint(lo_i, hi_i))
    num = rng.randint(1, 10_000)
    return sp.Rational(num, 10_000) * sp.Rational(str(hi - lo)) + sp.Rational(str(lo))


def tiered_zero(
    expr: sp.Expr,
    specs: dict[sp.Symbol, VarSpec],
    context: str,
    seed: str,
) -> None:
    """Prove `expr` is identically zero over the declared domain, or fail the build."""
    expr = sp.together(expr)
    # ALL symbolic tiers are gated on size: simplify() AND equals() are
    # super-linear and can effectively hang on loop-closure-sized trig/radical
    # expressions (the blind-solve lesson, ADR-0002). Large expressions go
    # straight to the high-precision numeric tier.
    if sp.count_ops(expr) <= SIMPLIFY_OPS_CAP:
        # Tier 1: structural simplification
        if sp.simplify(expr) == 0:
            return
        # Tier 2: equals() (random-evaluation backed, can return None on true identities)
        if expr.equals(0) is True:
            return
        # Tier 3: exp rewrite catches trig identities tiers 1-2 miss
        if sp.simplify(expr.rewrite(sp.exp)) == 0:
            return
    # Tier 4: high-precision numeric sampling over the declared domain.
    # Solutions may be partial-domain (a four-bar assembles only where the
    # discriminant is nonnegative): complex/singular samples are domain holes
    # to resample, NOT failures — but enough real samples must exist or the
    # identity is uncertified.
    rng = random.Random(seed)
    free = sorted(expr.free_symbols, key=str)
    unknown = [s for s in free if s not in specs]
    if unknown:
        raise BuildError(f"{context}: cannot sample undeclared symbols {list(map(str, unknown))}")
    valid = 0
    attempts = 0
    while valid < NUM_SAMPLES and attempts < 20 * NUM_SAMPLES:
        attempts += 1
        subs = {s: _sample_value(specs[s], rng) for s in free}
        try:
            val = expr.evalf(PRECISION_DPS, subs=subs, chop=True)
        except (ValueError, ZeroDivisionError):
            continue  # landed on a removable singularity; resample
        if not val.is_number or val.has(sp.zoo, sp.oo, sp.nan) or val.is_real is not True:
            continue  # off the real domain (e.g. non-assembling linkage); resample
        valid += 1
        if abs(val) > TOLERANCE:
            raise BuildError(
                f"{context}: NOT an identity — residual {sp.N(val, 6)} at sample {attempts} "
                f"{ {str(k): str(v) for k, v in subs.items()} }"
            )
    if valid < max(10, NUM_SAMPLES // 3):
        raise BuildError(
            f"{context}: only {valid} real-valued samples found in the declared domain after "
            f"{attempts} attempts — cannot certify the identity (check variable bounds)"
        )
    return  # symbolic tiers undecided, numeric tier passed (documented semi-decidability)


def resolve_solutions(
    solutions: list[tuple[sp.Symbol, sp.Expr]],
    constraints: dict[sp.Symbol, sp.Expr],
    context: str,
) -> dict[sp.Symbol, sp.Expr]:
    """Express every solved target in terms of inputs/material vars only.

    Authored solutions may reference earlier targets (evaluated in order);
    here we substitute the chain flat so verification and sampling see closed
    forms over the configuration's actual independents.
    """
    resolved: dict[sp.Symbol, sp.Expr] = dict(constraints)
    for target, expr in solutions:
        flat = expr.subs(resolved)
        if target in flat.free_symbols:
            raise BuildError(f"{context}: solution for {target} references itself")
        resolved[target] = sp.together(flat)
    return resolved


def verify_solutions_against_relations(
    residuals: list[tuple[str, sp.Expr]],
    resolved: dict[sp.Symbol, sp.Expr],
    specs: dict[sp.Symbol, VarSpec],
    context: str,
) -> None:
    """Back-substitute the resolved solutions into every relation residual."""
    for rel_id, residual in residuals:
        substituted = residual.subs(resolved)
        tiered_zero(substituted, specs, f"{context}: relation '{rel_id}'", seed=f"{context}/{rel_id}")


def verify_derivation_step(
    step_eq: sp.Expr,
    check_mode: str,
    local_defs: dict[sp.Symbol, sp.Expr],
    resolved: dict[sp.Symbol, sp.Expr],
    specs: dict[sp.Symbol, VarSpec],
    context: str,
) -> None:
    """`identity` steps must reduce to 0 == 0 under local definitions + verified
    solutions. `definition` steps introduce modeling facts (where physics enters);
    they are dimension-checked elsewhere and flagged for human review in the UI.
    """
    if check_mode == "definition":
        return
    if not isinstance(step_eq, sp.Eq):
        raise BuildError(f"{context}: identity step must be an Eq(...)")
    diff = (step_eq.lhs - step_eq.rhs).subs(local_defs).subs(resolved)
    # locals may be defined in terms of other locals
    for _ in range(3):
        if not (set(diff.free_symbols) & set(local_defs)):
            break
        diff = diff.subs(local_defs)
    tiered_zero(diff, specs, context, seed=context)


def verify_solve1d_configuration(
    inputs: list[sp.Symbol],
    material_syms: list[sp.Symbol],
    constraints: dict[sp.Symbol, sp.Expr],
    ordered_steps: list[tuple],
    residuals: list[tuple[str, sp.Expr]],
    specs: dict[sp.Symbol, VarSpec],
    context: str,
) -> tuple[list[dict], list[dict[sp.Symbol, sp.Expr]]]:
    """The numeric verification campaign for a configuration containing
    `solve1d` plan steps (ADR-0002: bracketed root-finding is the ONLY
    sanctioned non-closed-form path — there is still no blind solve()).

    A solve1d target has no closed form to back-substitute symbolically, so
    the certificate is numeric and per-sample, at high precision:

      1. sample the inputs + material variables (exact rationals);
      2. evaluate the eval-chain at 60 dps;
      3. at each solve1d step: prove the authored bracket actually brackets
         (real, finite, lo < hi, residual sign change) and contains exactly
         one root on a sign-scan grid, then root it with mpmath bisection at
         60 dps via sp.nsolve — bracketed, never blind;
      4. back-substitute the fully-rooted point into EVERY relation residual
         and require it to vanish below SOLVE1D_TOLERANCE.

    Any failure is a BuildError naming the configuration, step and sample.
    Returns (parity_samples, manifold_points): float samples for the JS
    parity oracle (the browser's Brent is checked against these roots), and
    high-precision on-manifold points for the Jacobian-rank DOF check (kept
    as Floats so the rank check takes its numeric path — these points are
    accurate to ~1e-60, not exact, and exact rational rank would overcount).
    """
    rng = random.Random(context)
    free_syms = [*inputs, *material_syms]
    parity: list[dict] = []
    points: list[dict[sp.Symbol, sp.Expr]] = []
    done = 0
    attempts = 0
    while done < NUM_SAMPLES and attempts < 20 * NUM_SAMPLES:
        attempts += 1
        known: dict[sp.Symbol, sp.Expr] = {s: _sample_value(specs[s], rng) for s in free_syms}
        for sym, val in constraints.items():
            known[sym] = val.subs(known) if val.free_symbols else val
        hole = False
        for step in ordered_steps:
            if step[0] == "eval":
                _, target, expr = step
                val = expr.subs(known).evalf(60, chop=True)
                if not val.is_number or val.has(sp.zoo, sp.oo, sp.nan) or val.is_real is not True:
                    hole = True  # off the real domain at this sample; resample
                    break
                known[target] = val
            else:  # ("solve1d", target, residual, blo, bhi, rel_id)
                _, target, residual, blo, bhi, rel_id = step
                sc = f"{context}, solve1d '{target}' (relation '{rel_id}')"
                lo = blo.subs(known).evalf(60, chop=True)
                hi = bhi.subs(known).evalf(60, chop=True)
                if not (lo.is_number and hi.is_number) or not (lo.is_real and hi.is_real):
                    raise BuildError(f"{sc}: bracket endpoints are not real at sample {attempts}")
                if not lo < hi:
                    raise BuildError(f"{sc}: bracket is empty (lo={sp.N(lo, 6)} >= hi={sp.N(hi, 6)}) at sample {attempts}")
                r1 = residual.subs({k: v for k, v in known.items() if k != target})
                extra = r1.free_symbols - {target}
                if extra:
                    raise BuildError(f"{sc}: residual still reads {sorted(map(str, extra))} — not solvable in one unknown")
                f_lo = r1.subs(target, lo).evalf(60, chop=True)
                f_hi = r1.subs(target, hi).evalf(60, chop=True)
                if not (f_lo.is_real and f_hi.is_real and f_lo.is_number and f_hi.is_number):
                    raise BuildError(f"{sc}: residual is not real at a bracket endpoint, sample {attempts}")
                if f_lo * f_hi >= 0:
                    raise BuildError(
                        f"{sc}: bracket does NOT produce a sign change at sample {attempts} "
                        f"(f(lo)={sp.N(f_lo, 6)}, f(hi)={sp.N(f_hi, 6)}; "
                        f"inputs { {str(k): str(sp.N(v, 8)) for k, v in known.items() if k in free_syms} })"
                    )
                # sign-scan: an endpoint sign change proves an odd root count;
                # the grid rejects 3+ roots (an ambiguous widget answer)
                flips = 0
                prev = f_lo
                for gi in range(1, SOLVE1D_GRID + 1):
                    x = lo + (hi - lo) * sp.Rational(gi, SOLVE1D_GRID + 1)
                    fx = r1.subs(target, x).evalf(60, chop=True)
                    if not (fx.is_number and fx.is_real):
                        continue  # grid point off-domain: endpoint certificate still stands
                    if fx != 0 and prev != 0 and fx * prev < 0:
                        flips += 1
                    prev = fx
                if prev * f_hi < 0:
                    flips += 1
                if flips > 1:
                    raise BuildError(
                        f"{sc}: bracket contains MULTIPLE roots ({flips} sign changes on a "
                        f"{SOLVE1D_GRID}-point scan) at sample {attempts} — tighten the bracket"
                    )
                try:
                    # bisection halves once per step: 60-dps tolerance needs
                    # ~210 halvings, far past mpmath's default step cap
                    root = sp.nsolve(r1, target, (lo, hi), solver="bisect", prec=60, maxsteps=500)
                except (ValueError, ZeroDivisionError) as e:
                    raise BuildError(f"{sc}: bisection failed at sample {attempts}: {e}") from e
                known[target] = sp.Float(root, 60)
        if hole:
            continue
        # the rooted point must satisfy EVERY relation (and constraint), not
        # just the one that was solved — the same total check closed forms get
        for rel_id, res in residuals:
            val = res.subs(known).evalf(PRECISION_DPS, chop=True)
            if not val.is_number or val.is_real is not True:
                raise BuildError(f"{context}: relation '{rel_id}' not real at rooted sample {attempts}")
            if abs(val) > SOLVE1D_TOLERANCE:
                raise BuildError(
                    f"{context}: relation '{rel_id}' residual {sp.N(val, 6)} ≠ 0 at the rooted "
                    f"sample {attempts} — the solve1d chain does not satisfy the relations"
                )
        done += 1
        if len(parity) < 3:
            parity.append({
                "inputs": {str(s): float(known[s]) for s in free_syms},
                "outputs": {
                    str(t): float(known[t])
                    for t in known
                    if t not in free_syms and t not in constraints
                },
            })
            points.append(dict(known))
    if done < max(10, NUM_SAMPLES // 3):
        raise BuildError(
            f"{context}: only {done} real-valued solve1d samples found after {attempts} "
            f"attempts — cannot certify the configuration (check variable bounds)"
        )
    return parity, points


def manifold_points(
    inputs: list[sp.Symbol],
    material_syms: list[sp.Symbol],
    resolved: dict[sp.Symbol, sp.Expr],
    specs: dict[sp.Symbol, VarSpec],
    seed: str,
    n: int = 3,
) -> list[dict[sp.Symbol, sp.Expr]]:
    """Exact points ON the solution manifold: sample the independents, derive
    everything else through the verified solutions. Partial-domain solutions
    (non-assembling linkage geometries) yield complex values — resample until
    n fully real points are found, or fail loudly."""
    rng = random.Random(seed)
    pts: list[dict[sp.Symbol, sp.Expr]] = []
    attempts = 0
    while len(pts) < n and attempts < 60 * n:
        attempts += 1
        pt = {s: _sample_value(specs[s], rng) for s in [*inputs, *material_syms]}
        ok = True
        for target, expr in resolved.items():
            val = expr.subs(pt)
            approx = sp.N(val, 30, chop=True)
            if not approx.is_number or approx.has(sp.zoo, sp.oo, sp.nan) or approx.is_real is not True:
                ok = False
                break
            pt[target] = sp.nsimplify(val)
        if ok:
            pts.append(pt)
    if len(pts) < n:
        raise BuildError(
            f"{seed}: could not find {n} real points on the solution manifold inside the "
            f"declared bounds ({attempts} attempts) — check variable bounds"
        )
    return pts


def dof_check(
    unknowns: list[sp.Symbol],
    residuals: list[sp.Expr],
    inputs: list[sp.Symbol],
    points: list[dict[sp.Symbol, sp.Expr]],
    context: str,
) -> None:
    """DOF = unknowns - rank(Jacobian). The rank MUST be evaluated at points
    that satisfy the relations: a relation implied by the others (e.g. the
    planetary power balance, a polynomial combination of Willis + the torque
    relations) has a dependent gradient only ON the manifold — at random
    off-manifold points it looks independent and the count comes out wrong.
    Rank is exact (rational arithmetic) whenever the manifold point is
    rational; max over points guards against coefficients vanishing at an
    unlucky sample. Trig manifolds (loop-closure linkages) yield exact but
    transcendental point values — atan-of-radical entries — where exact rank
    is intractable, so those points fall back to a 50-dps numeric rank with a
    chop far above the noise floor (RANK_CHOP): an implied relation's
    dependent row still collapses to ~1e-49 and is correctly discounted.
    """
    if not residuals:
        raise BuildError(f"{context}: no relations")
    jac = sp.Matrix([[sp.diff(r, v) for v in unknowns] for r in residuals])
    rank = 0
    for pt in points:
        missing = [s for s in jac.free_symbols if s not in pt]
        if missing:
            raise BuildError(f"{context}: manifold point lacks {sorted(map(str, missing))}")
        sub = jac.subs(pt)
        if all(getattr(v, "is_Rational", False) for v in pt.values()):
            rank = max(rank, sub.rank())
        else:
            num = sub.evalf(PRECISION_DPS)
            rank = max(rank, num.rank(iszerofunc=lambda x: abs(x) < RANK_CHOP))
    dof = len(unknowns) - rank
    if len(inputs) != dof:
        raise BuildError(
            f"{context}: DOF mismatch — {len(unknowns)} unknowns, {rank} independent "
            f"relations/constraints => {dof} degrees of freedom, but {len(inputs)} inputs declared "
            f"({[str(i) for i in inputs]})"
        )
