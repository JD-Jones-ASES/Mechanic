import pytest
import sympy as sp

from mech_pipeline import BuildError
from mech_pipeline.dims import parse_unit
from mech_pipeline.verify import (
    VarSpec, dof_check, resolve_solutions, tiered_zero,
    verify_solutions_against_relations,
)


def spec(sym, unit="1", bounds=(0.5, 10.0), integer=False):
    return VarSpec(
        symbol=sym, unit=parse_unit(unit, "t"), quantity_kind="ratio", role="free",
        default=1.0, bounds=bounds, integer=integer,
    )


def specs_for(*syms, **overrides):
    return {s: overrides.get(str(s), spec(s)) for s in syms}


def test_tiered_zero_trig_identity():
    x = sp.Symbol("x", real=True)
    tiered_zero(sp.sin(x) ** 2 + sp.cos(x) ** 2 - 1, {x: spec(x)}, "trig", "seed")


def test_tiered_zero_rejects_non_identity():
    x = sp.Symbol("x", real=True)
    with pytest.raises(BuildError, match="NOT an identity"):
        tiered_zero(sp.sin(x) - x / 2, {x: spec(x)}, "bad", "seed")


def test_tiered_zero_sqrt_needs_positivity():
    # sqrt(x^2) == x only with positive=True — assumptions are load-bearing.
    xp = sp.Symbol("xp", positive=True)
    tiered_zero(sp.sqrt(xp**2) - xp, {xp: spec(xp)}, "sqrt-pos", "seed")


WILLIS_SYMS = sp.symbols("omega_s omega_r omega_c", real=True) + sp.symbols(
    "N_s N_p N_r", positive=True, integer=True
)


def willis_setup():
    omega_s, omega_r, omega_c, N_s, N_p, N_r = WILLIS_SYMS
    specs = {
        omega_s: spec(omega_s, "rad/s", (-100.0, 100.0)),
        omega_r: spec(omega_r, "rad/s", (-100.0, 100.0)),
        omega_c: spec(omega_c, "rad/s", (-100.0, 100.0)),
        N_s: spec(N_s, "1", (12, 60), integer=True),
        N_p: spec(N_p, "1", (10, 40), integer=True),
        N_r: spec(N_r, "1", (30, 140), integer=True),
    }
    residuals = [
        ("willis", (omega_s - omega_c) * N_s + (omega_r - omega_c) * N_r),
        ("teeth", N_r - N_s - 2 * N_p),
    ]
    return specs, residuals


def test_willis_ring_fixed_solution_verifies():
    omega_s, omega_r, omega_c, N_s, N_p, N_r = WILLIS_SYMS
    specs, residuals = willis_setup()
    resolved = resolve_solutions(
        [(N_r, N_s + 2 * N_p), (omega_c, omega_s * N_s / (N_s + N_r))],
        constraints={omega_r: sp.S.Zero},
        context="ring-fixed",
    )
    verify_solutions_against_relations(residuals, resolved, specs, "ring-fixed")
    # the teaching golden: ratio = 1 + N_r/N_s
    ratio = sp.simplify(omega_s / resolved[omega_c])
    assert sp.simplify(ratio - (1 + (N_s + 2 * N_p) / N_s)) == 0


def test_wrong_solution_fails_loudly():
    omega_s, omega_r, omega_c, N_s, N_p, N_r = WILLIS_SYMS
    specs, residuals = willis_setup()
    resolved = resolve_solutions(
        [(N_r, N_s + 2 * N_p), (omega_c, omega_s * N_s / (N_s - N_r))],  # wrong sign
        constraints={omega_r: sp.S.Zero},
        context="bad",
    )
    with pytest.raises(BuildError):
        verify_solutions_against_relations(residuals, resolved, specs, "bad")


def test_dof_check():
    omega_s, omega_r, omega_c, N_s, N_p, N_r = WILLIS_SYMS
    specs, residuals = willis_setup()
    exprs = [r for _, r in residuals] + [omega_r]  # ring-fixed constraint
    unknowns = list(WILLIS_SYMS)
    dof_check(unknowns, exprs, [N_s, N_p, omega_s], specs, "ok")  # DOF = 6-3 = 3
    with pytest.raises(BuildError, match="DOF mismatch"):
        dof_check(unknowns, exprs, [N_s, N_p], specs, "too-few")
    with pytest.raises(BuildError, match="DOF mismatch"):
        dof_check(unknowns, exprs, [N_s, N_p, omega_s, omega_c], specs, "too-many")
