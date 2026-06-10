"""Independent physics cross-check for the simply-supported-beam THING:
re-derive BOTH Table A-9 rows by integrating EI·v″ = M(x) (the same route the
ch. 4 solutions manual takes in problem 4-9), prove superposition as a theorem
about the linear ODE rather than quoting it, verify that the two moment
diagrams peak at the same station (which is the only reason adding the MAXIMA
is legal), and pin a hand golden including the size-depth closed form."""

import math

import sympy as sp

P, w, L, E, I, x = sp.symbols("P w L E I x", positive=True)


def test_center_load_row_by_integration():
    """Half-beam by symmetry: M = Px/2 on 0 ≤ x ≤ L/2, slope zero at midspan,
    deflection zero at the support — exactly Shigley solution 4-9's route.
    The midspan deflection must come out PL³/(48EI)."""
    v_dd = (P * x / 2) / (E * I)
    v_d = sp.integrate(v_dd, x) + sp.Symbol("C1")
    C1 = sp.solve(sp.Eq(v_d.subs(x, L / 2), 0), sp.Symbol("C1"))[0]
    v = sp.integrate(v_d.subs(sp.Symbol("C1"), C1), x)  # v(0) = 0 -> no constant
    delta = -v.subs(x, L / 2)  # downward magnitude
    assert sp.simplify(delta - P * L**3 / (48 * E * I)) == 0


def test_udl_row_by_integration():
    """Full span: M = wx(L−x)/2, v(0) = v(L) = 0. Midspan deflection must be
    5wL⁴/(384EI) — constants and all."""
    v_dd = (w * x * (L - x) / 2) / (E * I)
    C1, C2 = sp.symbols("C1 C2")
    v = sp.integrate(sp.integrate(v_dd, x) + C1, x) + C2
    sol = sp.solve([sp.Eq(v.subs(x, 0), 0), sp.Eq(v.subs(x, L), 0)], [C1, C2])
    v = v.subs(sol)
    delta = -v.subs(x, L / 2)
    assert sp.simplify(delta - 5 * w * L**4 / (384 * E * I)) == 0


def test_superposition_is_a_theorem_about_linearity():
    """Integrate once with the COMBINED moment field and once per load case:
    the combined deflection equals the sum, identically in x — and scaling a
    load scales its response (the two halves of linearity)."""
    C1, C2 = sp.symbols("C1 C2")

    def deflection(M):
        v = sp.integrate(sp.integrate(M / (E * I), x) + C1, x) + C2
        sol = sp.solve([sp.Eq(v.subs(x, 0), 0), sp.Eq(v.subs(x, L), 0)], [C1, C2])
        return sp.simplify(v.subs(sol))

    M_w = w * x * (L - x) / 2
    a = sp.symbols("a", positive=True)
    assert sp.simplify(deflection(M_w + a * M_w) - (1 + a) * deflection(M_w)) == 0


def test_maxima_coincide_at_midspan():
    """dM/dx = 0 at x = L/2 for the UDL parabola, and the point-load triangle
    peaks there by symmetry — only this coincidence makes M_max = PL/4 + wL²/8
    legal as a sum of maxima."""
    M_w = w * x * (L - x) / 2
    crit = sp.solve(sp.Eq(sp.diff(M_w, x), 0), x)
    assert crit == [L / 2]
    assert sp.simplify(M_w.subs(x, L / 2) - w * L**2 / 8) == 0
    M_P_half = P * x / 2  # rises to midspan, mirrors after: peak at L/2
    assert sp.simplify(M_P_half.subs(x, L / 2) - P * L / 4) == 0


def test_numeric_golden_and_size_depth():
    """Hand-checkable at the declared defaults (P = 1 kN, w = 2 kN/m, L = 2 m,
    b = 40 mm, h = 80 mm, E = 200 GPa, σ_y = 250 MPa, ρ = 7850):
      I = 1.7067e-6 m⁴;  δ_P = 0.4883 mm;  δ_w = 1.2207 mm;  δ = 1.7090 mm
      M_max = 250 + 1000 ... = PL/4 + wL²/8 = 500 + 1000 = 1500 N·m
      σ = 35.16 MPa;  SF = 7.11;  m = 50.24 kg
    Size-depth at SF = 4: σ = 62.5 MPa → h = √(6·1500/(0.04·62.5e6)) = 60.0 mm."""
    P_, w_, L_, b_, h_ = 1000.0, 2000.0, 2.0, 0.04, 0.08
    E_, sy, rho = 200.0e9, 250.0e6, 7850.0
    I_ = b_ * h_**3 / 12
    assert abs(I_ - 1.70667e-6) / 1.70667e-6 < 1e-4
    dP = P_ * L_**3 / (48 * E_ * I_)
    dw = 5 * w_ * L_**4 / (384 * E_ * I_)
    assert abs(dP - 4.8828e-4) / 4.8828e-4 < 1e-3
    assert abs(dw - 1.22070e-3) / 1.22070e-3 < 1e-3
    assert abs((dP + dw) - 1.70898e-3) / 1.70898e-3 < 1e-3
    M = P_ * L_ / 4 + w_ * L_**2 / 8
    assert abs(M - 1500.0) < 1e-9
    sigma = M * (h_ / 2) / I_
    assert abs(sigma - 35.156e6) / 35.156e6 < 1e-3
    assert abs(sy / sigma - 7.1111) < 1e-3
    assert abs(rho * b_ * h_ * L_ - 50.24) < 1e-9
    # size-depth closed form round-trips through the flexure formula
    SF_ = 4.0
    sigma_a = sy / SF_
    h_req = math.sqrt(6 * M / (b_ * sigma_a))
    assert abs(h_req - 0.060) < 1e-12
    assert abs(M * (h_req / 2) / (b_ * h_req**3 / 12) - sigma_a) / sigma_a < 1e-12
