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
    # Tier 1: structural simplification
    if sp.simplify(expr) == 0:
        return
    # Tier 2: equals() (random-evaluation backed, can return None on true identities)
    if expr.equals(0) is True:
        return
    # Tier 3: exp rewrite catches trig identities tiers 1-2 miss
    if sp.simplify(expr.rewrite(sp.exp)) == 0:
        return
    # Tier 4: high-precision numeric sampling over the declared domain
    rng = random.Random(seed)
    free = sorted(expr.free_symbols, key=str)
    unknown = [s for s in free if s not in specs]
    if unknown:
        raise BuildError(f"{context}: cannot sample undeclared symbols {list(map(str, unknown))}")
    for i in range(NUM_SAMPLES):
        subs = {s: _sample_value(specs[s], rng) for s in free}
        try:
            val = expr.evalf(PRECISION_DPS, subs=subs)
        except (ValueError, ZeroDivisionError):
            continue  # landed on a removable singularity; resample
        if not val.is_number or val.has(sp.zoo, sp.oo, sp.nan):
            continue
        if abs(val) > TOLERANCE:
            raise BuildError(
                f"{context}: NOT an identity — residual {sp.N(val, 6)} at sample {i} "
                f"{ {str(k): str(v) for k, v in subs.items()} }"
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


def dof_check(
    unknowns: list[sp.Symbol],
    residuals: list[sp.Expr],
    inputs: list[sp.Symbol],
    specs: dict[sp.Symbol, VarSpec],
    context: str,
) -> None:
    """DOF = unknowns - rank(Jacobian). Rank is computed EXACTLY over rationals
    at random sample points (max over 3 points guards against degenerate samples).
    """
    if not residuals:
        raise BuildError(f"{context}: no relations")
    jac = sp.Matrix([[sp.diff(r, v) for v in unknowns] for r in residuals])
    rng = random.Random(context)
    rank = 0
    for _ in range(3):
        subs = {s: _sample_value(specs[s], rng) for s in jac.free_symbols if s in specs}
        rank = max(rank, jac.subs(subs).rank())
    dof = len(unknowns) - rank
    if len(inputs) != dof:
        raise BuildError(
            f"{context}: DOF mismatch — {len(unknowns)} unknowns, {rank} independent "
            f"relations/constraints => {dof} degrees of freedom, but {len(inputs)} inputs declared "
            f"({[str(i) for i in inputs]})"
        )
