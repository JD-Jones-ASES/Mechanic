"""Independent physics cross-check for the Euler column THING: solve the
buckling ODE with SymPy's own machinery (dsolve + boundary conditions), find
the first eigenvalue, and pin the THING's teaching point — yield strength is
absent from the load but sets the validity envelope — as calculus facts."""

import sympy as sp


def test_euler_load_from_the_ode_eigenvalue_problem():
    """EI·v'' + P·v = 0, v(0)=0, v(L)=0: dsolve gives sin/cos; the pinned ends
    kill cos and demand sin(kL)=0, whose first nonzero root is the Euler load."""
    x, L, E, I, P = sp.symbols("x L E I P", positive=True)
    v = sp.Function("v")
    ode = sp.Eq(E * I * v(x).diff(x, 2) + P * v(x), 0)
    sol = sp.dsolve(ode, v(x)).rhs

    # v(0) = 0 eliminates the cosine mode
    constants = [s for s in sol.free_symbols if str(s).startswith("C")]
    at0 = sp.solve(sp.Eq(sol.subs(x, 0), 0), constants, dict=True)
    sol0 = sol.subs(at0[0])
    assert sp.simplify(sol0.subs(x, 0)) == 0
    assert sol0 != 0  # a nontrivial mode family survives

    # nontrivial v(L) = 0 requires sin(sqrt(P/EI)·L) = 0
    k = sp.sqrt(P / (E * I))
    candidates = sp.solve(sp.Eq(sp.sin(k * L), 0), P)
    euler = sp.pi**2 * E * I / L**2
    assert any(sp.simplify(c - euler) == 0 for c in candidates), candidates
    # and the surviving mode is exactly the half-sine at that load
    mode = sol0.subs(P, euler)
    assert sp.simplify(mode / mode.coeff(sp.sin(sp.pi * x / L)) - sp.sin(sp.pi * x / L)) == 0


def test_effective_length_scalings():
    """K folds end conditions into the pinned formula: fixed-free pays 4x,
    fixed-fixed earns 4x — a factor of 16 between the classic extremes."""
    E, I, L = sp.symbols("E I L", positive=True)

    def pcr(K):
        return sp.pi**2 * E * I / (K * L) ** 2

    assert sp.simplify(pcr(2) / pcr(1) - sp.Rational(1, 4)) == 0
    assert sp.simplify(pcr(sp.Rational(1, 2)) / pcr(1) - 4) == 0


def test_euler_hyperbola_and_transition():
    """σ_cr = π²E/λ² with λ = L/r, r² = I/A; the σ_y/2 cutoff lands at
    λ_T = sqrt(2π²E/σ_y)."""
    E, I, A, L, sigma_y, lam = sp.symbols("E I A L sigma_y lam", positive=True)
    r = sp.sqrt(I / A)
    sigma_cr = (sp.pi**2 * E * I / L**2 / A).subs(L, lam * r)
    assert sp.simplify(sigma_cr - sp.pi**2 * E / lam**2) == 0
    lam_T = sp.solve(sp.Eq(sp.pi**2 * E / lam**2, sigma_y / 2), lam)
    lam_T_pos = [s for s in lam_T if s.is_positive]
    assert len(lam_T_pos) == 1
    assert sp.simplify(lam_T_pos[0] - sp.sqrt(2 * sp.pi**2 * E / sigma_y)) == 0


def test_strength_is_absent_from_the_load_but_sets_the_envelope():
    """The THING's aha as derivatives: ∂P_cr/∂σ_y = 0 and ∂P_cr/∂E > 0, while
    ∂λ_T/∂σ_y < 0 (stronger material extends Euler's validity leftward)."""
    E, I, L, sigma_y = sp.symbols("E I L sigma_y", positive=True)
    P_cr = sp.pi**2 * E * I / L**2
    lam_T = sp.sqrt(2 * sp.pi**2 * E / sigma_y)
    assert sp.diff(P_cr, sigma_y) == 0
    assert sp.diff(P_cr, E) > 0
    assert sp.diff(lam_T, sigma_y) < 0


def test_johnson_constant_is_forced_by_tangency():
    """Independent re-derivation of the Johnson parabola: demand ANY downward
    parabola σ = σ_y − c·λ² that is tangent to Euler's hyperbola (equal value
    and equal slope at some λ*). Solving the two conditions forces exactly
    Johnson's constant c = (σ_y/2π)²/E, a tangency point at the conventional
    λ_T = √(2π²E/σ_y), and a meeting stress of σ_y/2 — none of the THING's
    'conventions' are free choices."""
    E, sigma_y, lam, c = sp.symbols("E sigma_y lam c", positive=True)
    parab = sigma_y - c * lam**2
    euler = sp.pi**2 * E / lam**2
    sols = sp.solve(
        [sp.Eq(parab, euler), sp.Eq(sp.diff(parab, lam), sp.diff(euler, lam))],
        [c, lam],
        dict=True,
    )
    sols = [s for s in sols if s[lam].is_positive]
    assert len(sols) == 1, sols
    c_star, lam_star = sols[0][c], sols[0][lam]
    assert sp.simplify(c_star - (sigma_y / (2 * sp.pi)) ** 2 / E) == 0
    assert sp.simplify(lam_star - sp.sqrt(2 * sp.pi**2 * E / sigma_y)) == 0
    assert sp.simplify(parab.subs({c: c_star, lam: lam_star}) - sigma_y / 2) == 0


def test_euler_lies_above_johnson_everywhere_except_the_tangency():
    """euler − johnson = c·(λ² − λ_T²)²/λ² — a perfect square. So on (0, λ_T)
    Euler strictly overpredicts (the dangerous side: why the Euler readouts are
    refused there), and beyond λ_T Johnson strictly underpredicts (safe but
    wrong: why the Johnson readouts are refused there). Equality only at λ_T."""
    E, sigma_y, lam = sp.symbols("E sigma_y lam", positive=True)
    c = (sigma_y / (2 * sp.pi)) ** 2 / E
    lam_T = sp.sqrt(2 * sp.pi**2 * E / sigma_y)
    johnson = sigma_y - c * lam**2
    euler = sp.pi**2 * E / lam**2
    gap = sp.simplify(euler - johnson - c * (lam**2 - lam_T**2) ** 2 / lam**2)
    assert gap == 0


def test_johnson_endpoints_and_monotonicity():
    """σ_J(0) = σ_y (a stub column fails at yield), σ_J(λ_T) = σ_y/2, and the
    parabola falls monotonically — so the composite capacity curve is
    continuous and strictly decreasing through the hand-off."""
    E, sigma_y, lam = sp.symbols("E sigma_y lam", positive=True)
    c = (sigma_y / (2 * sp.pi)) ** 2 / E
    lam_T = sp.sqrt(2 * sp.pi**2 * E / sigma_y)
    johnson = sigma_y - c * lam**2
    assert sp.simplify(johnson.subs(lam, 0) - sigma_y) == 0
    assert sp.simplify(johnson.subs(lam, lam_T) - sigma_y / 2) == 0
    assert sp.diff(johnson, lam).is_negative  # −2cλ with c, λ > 0


def test_johnson_numeric_golden():
    """Hand-checkable: E = 200 GPa, σ_y = 250 MPa, λ = 80 (a 1 m pinned rod of
    d = 50 mm has r = 12.5 mm): σ_J = 250e6 − (250e6·80/2π)²/200e9 = 199.3 MPa,
    P_J = σ_J·A = 391.4 kN. Euler at the same λ would claim π²E/λ² = 308 MPa —
    above σ_y itself: the overprediction the hand-off exists to refuse."""
    import math

    E, sy, lam = 200e9, 250e6, 80.0
    s_J = sy - (sy * lam / (2 * math.pi)) ** 2 / E
    assert abs(s_J - 199.34e6) / 199.34e6 < 1e-3
    A = math.pi * 0.05**2 / 4
    assert abs(s_J * A - 391.4e3) / 391.4e3 < 1e-3
    s_euler = math.pi**2 * E / lam**2
    assert s_euler > sy  # Euler's claim is not even below yield here
    lam_T = math.sqrt(2 * math.pi**2 * E / sy)
    assert lam < lam_T  # firmly in Johnson territory


def test_numeric_golden():
    """Hand-checkable: steel E = 200 GPa, d = 50 mm, L = 2 m, pinned-pinned:
    I = π·0.05⁴/64 = 3.0680e-7 m⁴, P_cr = π²·200e9·I/2² = 151.4 kN,
    r = d/4 = 12.5 mm, λ = 160; λ_T(σ_y = 250 MPa) = 125.66 — slender, Euler valid."""
    import math

    I = math.pi * 0.05**4 / 64
    assert abs(I - 3.06796e-7) / 3.06796e-7 < 1e-4
    P_cr = math.pi**2 * 200e9 * I / 2.0**2
    assert abs(P_cr - 151.4e3) / 151.4e3 < 1e-3
    lam = 1.0 * 2.0 / (0.05 / 4)
    assert lam == 160
    lam_T = math.sqrt(2 * math.pi**2 * 200e9 / 250e6)
    assert abs(lam_T - 125.66) / 125.66 < 1e-3
    assert lam > lam_T  # the default widget state sits inside the envelope
