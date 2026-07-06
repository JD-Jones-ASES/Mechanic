"""Independent physics cross-check for the disk-clutch THING. Nothing here imports
thing.yaml's residuals; both governing torques are re-derived from first principles
by DIRECT INTEGRATION of dT = mu * p(r) * r * 2*pi*r dr over the friction annulus,
eliminating the pressure constant per model via F = int p dA:

- uniform pressure (p = const, new/rigid clutch)  -> (2/3) mu F (ro^3-ri^3)/(ro^2-ri^2)
- uniform wear (p*r = const, run-in clutch)        -> mu F (ro+ri)/2

plus the peak-pressure relation, the machine-proven bracket T_uw <= T_up with its
r_i -> r_o equality limit (mirrors test_combined_physics::test_criteria_bracket),
the r_i = r_o/sqrt(3) torque optimum, and a hand-worked numeric golden.
"""

import math

import sympy as sp

r, r_i, r_o, mu, F = sp.symbols("r r_i r_o mu F", positive=True)


def test_uniform_pressure_torque_by_integration():
    """p = const; F = int p dA fixes p; integrate the friction torque."""
    p = sp.symbols("p", positive=True)
    F_of_p = sp.integrate(p * 2 * sp.pi * r, (r, r_i, r_o))
    p_sol = sp.solve(sp.Eq(F, F_of_p), p)[0]
    T = sp.integrate(mu * p_sol * r * 2 * sp.pi * r, (r, r_i, r_o))
    authored = sp.Rational(2, 3) * mu * F * (r_o**3 - r_i**3) / (r_o**2 - r_i**2)
    assert sp.simplify(T - authored) == 0


def test_uniform_wear_torque_by_integration():
    """p*r = const (wear rate ~ p*v); F = int p dA fixes it; integrate."""
    C = sp.symbols("C", positive=True)
    F_of_C = sp.integrate((C / r) * 2 * sp.pi * r, (r, r_i, r_o))
    C_sol = sp.solve(sp.Eq(F, F_of_C), C)[0]
    T = sp.integrate(mu * (C_sol / r) * r * 2 * sp.pi * r, (r, r_i, r_o))
    authored = mu * F * (r_o + r_i) / 2
    assert sp.simplify(T - authored) == 0


def test_max_pressure_at_inner_radius():
    """Uniform wear peaks at r_i: p_max = F / (2 pi r_i (r_o - r_i))."""
    C = sp.symbols("C", positive=True)
    C_sol = sp.solve(sp.Eq(F, sp.integrate((C / r) * 2 * sp.pi * r, (r, r_i, r_o))), C)[0]
    p_at_ri = sp.simplify((C_sol / r).subs(r, r_i))
    assert sp.simplify(p_at_ri - F / (2 * sp.pi * r_i * (r_o - r_i))) == 0


def test_uniform_wear_is_bracketed_by_uniform_pressure():
    """T_up - T_uw = mu F (r_o - r_i)^2 / (6 (r_o + r_i)) >= 0, with equality only
    in the thin-annulus limit r_i -> r_o. The design consequence: uniform wear is
    always the smaller (safe) torque. (Mirrors test_combined_physics bracket.)"""
    T_up = sp.Rational(2, 3) * mu * F * (r_o**3 - r_i**3) / (r_o**2 - r_i**2)
    T_uw = mu * F * (r_o + r_i) / 2
    diff = sp.simplify(T_up - T_uw)
    assert sp.simplify(diff - mu * F * (r_o - r_i) ** 2 / (6 * (r_o + r_i))) == 0
    # a square over a positive denominator: >= 0 everywhere, = 0 iff r_i = r_o
    assert diff.subs(r_i, r_o) == 0
    # strictly positive for a real annulus (spot-check well inside the domain)
    assert float(diff.subs({mu: 0.3, F: 5000, r_i: 0.05, r_o: 0.1})) > 0


def test_torque_optimal_inner_radius():
    """At fixed p_max, T_uw = pi mu p_max r_i (r_o^2 - r_i^2); dT/dr_i = 0 at
    r_i = r_o/sqrt(3)."""
    p_max = sp.symbols("p_max", positive=True)
    T = sp.pi * mu * p_max * r_i * (r_o**2 - r_i**2)
    roots = sp.solve(sp.Eq(sp.diff(T, r_i), 0), r_i)
    assert any(sp.simplify(rt - r_o / sp.sqrt(3)) == 0 for rt in roots)
    # and it is a maximum (second derivative negative there)
    d2 = sp.diff(T, r_i, 2).subs(r_i, r_o / sp.sqrt(3))
    assert sp.simplify(d2) < 0


def test_numeric_golden():
    """Hand-worked plate clutch, N = 2 friction faces (single-plate): r_o = 100 mm,
    r_i = 50 mm, mu = 0.3, F = 5 kN, slip speed 100 rad/s. Source Shigley 10e
    Sec 16-5; all arithmetic below is by hand."""
    N, mu_, F_, ro, ri, w = 2, 0.3, 5000.0, 0.1, 0.05, 100.0
    T_up = N * (2 / 3) * mu_ * F_ * (ro**3 - ri**3) / (ro**2 - ri**2)
    T_uw = N * mu_ * F_ * (ro + ri) / 2
    p_max = F_ / (2 * math.pi * ri * (ro - ri))
    assert abs(T_up - 233.3333) < 1e-3  # N*m
    assert abs(T_uw - 225.0) < 1e-9  # N*m, exact
    assert T_up > T_uw  # the bracket
    assert abs(p_max - 318309.886) < 1e-2  # Pa (0.318 MPa)
    assert abs(T_up * w - 23333.33) < 1e-1  # slip power, W
    assert abs(T_uw * w - 22500.0) < 1e-6  # W
    assert abs(ro / math.sqrt(3) - 0.0577350) < 1e-6  # r_i_opt, m
