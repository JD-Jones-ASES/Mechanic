"""Independent physics cross-check for the fixed-fixed-torsion-shaft THING.
NOTHING is imported from thing.yaml — every result is re-derived from first
principles:

  * the two reaction torques two independent ways — (1) compatibility (the
    rotation at the load point is single-valued: T_A·a/GJ = T_B·b/GJ) combined
    with equilibrium, and (2) Castigliano's theorem (minimise the torsional
    strain energy over the redundant reaction subject to equilibrium) — which
    must agree (T_A = T·b/L, T_B = T·a/L);
  * that the LARGER reaction lands on the SHORTER segment;
  * that the reaction split is independent of G and r (material- and radius-blind);
  * the per-segment shear stresses and the twist at the load point;
  * a hand-checkable numeric golden at the declared defaults.
"""

import math

import sympy as sp

T, a, b, L, r, G = sp.symbols("T a b L r G", positive=True)
T_A = sp.symbols("T_A", positive=True)


def test_reactions_by_compatibility():
    """Equilibrium + compatibility of the twist at the load point. The shaft is
    one continuous piece, so the rotation there is single-valued: reckoned from
    the left it is T_A·a/GJ, from the right T_B·b/GJ. GJ cancels."""
    J = sp.pi * r**4 / 2
    T_B = T - T_A  # equilibrium: reactions sum to the applied torque
    # compatibility: the two twist expressions at the load point are equal
    compat = sp.Eq(T_A * a / (G * J), T_B * b / (G * J))
    # GJ must divide out entirely -> material/radius blind
    reduced = sp.simplify(compat.lhs - compat.rhs) * (G * J)
    reduced = sp.simplify(reduced)
    assert G not in reduced.free_symbols and r not in reduced.free_symbols
    T_A_sol = sp.solve(compat, T_A)[0]
    T_A_sol = sp.simplify(T_A_sol.subs(b, L - a))  # b = L - a
    assert sp.simplify(T_A_sol - T * (L - a) / L) == 0  # T_A = T·b/L
    T_B_sol = sp.simplify((T - T_A_sol))
    assert sp.simplify(T_B_sol - T * a / L) == 0  # T_B = T·a/L


def test_reactions_by_castigliano():
    """Independent route: the torsional strain energy is U = ∫T²/(2GJ) dx over
    each segment. Eliminate T_B by equilibrium, then dU/dT_A = 0 (the redundant
    does no net work — Castigliano's second theorem / least work)."""
    J = sp.pi * r**4 / 2
    U = T_A**2 * a / (2 * G * J) + (T - T_A) ** 2 * b / (2 * G * J)
    T_A_sol = sp.solve(sp.Eq(sp.diff(U, T_A), 0), T_A)[0]
    T_A_sol = sp.simplify(T_A_sol.subs(b, L - a))
    assert sp.simplify(T_A_sol - T * (L - a) / L) == 0  # agrees with compatibility


def test_larger_reaction_on_shorter_segment():
    """T_A − T_B = T(b − a)/L: the near wall (shorter segment) takes the larger
    reaction torque, hence the larger shear stress."""
    T_A_sol = T * b / L
    T_B_sol = T * a / L
    diff = sp.simplify((T_A_sol - T_B_sol).subs(L, a + b))
    assert sp.simplify(diff - T * (b - a) / (a + b)) == 0
    # when b > a (load nearer the left wall) T_A is the larger reaction
    assert diff.subs({T: 1, a: sp.Rational(1, 4), b: sp.Rational(3, 4)}) > 0


def test_shear_and_twist_forms():
    """τ_i = T_i r/J with J = πr⁴/2, and the twist at the load point φ = T_A a/GJ
    equals T_B b/GJ (both give the same rotation — the compatibility we imposed)."""
    J = sp.pi * r**4 / 2
    T_A_sol, T_B_sol = T * b / L, T * a / L
    phi_left = T_A_sol * a / (G * J)
    phi_right = T_B_sol * b / (G * J)
    assert sp.simplify((phi_left - phi_right).subs(L, a + b)) == 0
    tau1 = sp.simplify(T_A_sol * r / J)
    assert sp.simplify(tau1 - 2 * T * b / (sp.pi * L * r**3)) == 0


def test_numeric_golden_at_declared_defaults():
    """Hand-checkable at the declared defaults (T = 500 N·m, a = 0.4 m,
    b = 0.6 m → L = 1.0 m, r = 0.02 m, G = 79 GPa, σ_y = 250 MPa, ρ = 7800):
      L = 1.0 m;  J = πr⁴/2 = π(0.02)⁴/2 = 2.513274e-7 m⁴
      T_A = T·b/L = 500·0.6/1.0 = 300 N·m;  T_B = T·a/L = 200 N·m
      τ_1 = T_A r/J = 300·0.02/2.513274e-7 = 23.873 MPa
      τ_2 = T_B r/J = 200·0.02/2.513274e-7 = 15.915 MPa
      φ   = T_A a/GJ = 300·0.4/(79e9·2.513274e-7) = 6.0439e-3 rad
      SF_1 = (σ_y/2)/τ_1 = 125/23.873 = 5.2360;  SF_2 = 125/15.915 = 7.8540
      m   = ρ·πr²·L = 7800·π·0.02²·1.0 = 9.8018 kg
    """
    T_, a_, b_, r_ = 500.0, 0.4, 0.6, 0.02
    G_, sy, rho = 79.0e9, 250.0e6, 7800.0
    L_ = a_ + b_
    J_ = math.pi * r_**4 / 2
    assert abs(J_ - 2.513274e-7) / 2.513274e-7 < 1e-5
    T_A_ = T_ * b_ / L_
    T_B_ = T_ * a_ / L_
    assert (T_A_, T_B_) == (300.0, 200.0)
    tau1 = T_A_ * r_ / J_
    tau2 = T_B_ * r_ / J_
    assert abs(tau1 - 23.8732e6) / 23.8732e6 < 1e-4
    assert abs(tau2 - 15.9155e6) / 15.9155e6 < 1e-4
    phi = T_A_ * a_ / (G_ * J_)
    assert abs(phi - 6.04386e-3) / 6.04386e-3 < 1e-4
    assert abs((sy / 2) / tau1 - 5.23599) < 1e-4
    assert abs((sy / 2) / tau2 - 7.85398) < 1e-4
    assert abs(rho * math.pi * r_**2 * L_ - 9.80177) < 1e-4
