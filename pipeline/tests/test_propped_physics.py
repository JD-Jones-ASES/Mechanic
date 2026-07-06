"""Independent physics cross-check for the propped-cantilever THING. NOTHING is
imported from thing.yaml — every result is re-derived from first principles:

  * the three redundant reactions two independent ways — (1) solving the
    Euler–Bernoulli boundary-value problem EI·v'''' = w with dsolve, and (2) the
    force (flexibility) method, deriving the primary cantilever's tip deflections
    by integration and imposing zero net deflection at the prop — which must
    agree (R_A = 5wL/8, R_B = 3wL/8, M_A = wL²/8);
  * the midspan deflection wL⁴/192EI from the BVP solution, and the true maximum
    near x = 0.578L for context;
  * that the wall's hogging moment wL²/8 beats the sagging peak 9wL²/128 at 5L/8,
    so the wall governs the stress;
  * a hand-checkable numeric golden at the declared defaults.
"""

import math

import sympy as sp

w, L, E, I, x, R_B = sp.symbols("w L E I x R_B", positive=True)


def _cantilever_tip_deflection(load_moment):
    """Tip deflection of a cantilever fixed at x=0, free at x=L, by integrating
    EI·v'' = M(x) with v(0) = v'(0) = 0 (downward positive). `load_moment` is
    M(x) for the load case."""
    C1, C2 = sp.symbols("C1 C2")
    v = sp.integrate(sp.integrate(load_moment / (E * I), x) + C1, x) + C2
    sol = sp.solve([sp.Eq(v.subs(x, 0), 0), sp.Eq(sp.diff(v, x).subs(x, 0), 0)], [C1, C2])
    return sp.simplify(v.subs(sol).subs(x, L))


def test_reactions_by_force_method():
    """Force method from first principles. Primary structure = cantilever with
    the prop removed. Derive both tip deflections by integration, then impose
    compatibility (net deflection at the free end B is zero)."""
    # UDL w downward: bending moment at x from the free body beyond the cut is
    # M(x) = w(L-x)²/2 (sagging-positive convention consistent with the point case)
    delta_udl = _cantilever_tip_deflection(w * (L - x) ** 2 / 2)
    assert sp.simplify(delta_udl - w * L**4 / (8 * E * I)) == 0  # classic wL⁴/8EI
    # upward end load R_B: moment M(x) = -R_B(L-x)
    delta_prop = _cantilever_tip_deflection(-R_B * (L - x))
    assert sp.simplify(delta_prop + R_B * L**3 / (3 * E * I)) == 0  # -R_B L³/3EI (upward)
    # compatibility: the prop holds B on the wall line — net deflection is zero
    R_B_sol = sp.solve(sp.Eq(delta_udl + delta_prop, 0), R_B)[0]
    assert sp.simplify(R_B_sol - 3 * w * L / 8) == 0
    # equilibrium closes the other two
    R_A_sol = sp.simplify(w * L - R_B_sol)
    M_A_sol = sp.simplify(w * L**2 / 2 - R_B_sol * L)
    assert R_A_sol == 5 * w * L / 8
    assert M_A_sol == w * L**2 / 8


def test_reactions_by_boundary_value_problem():
    """Solve the fourth-order beam equation EI·v'''' = w directly, with the four
    boundary conditions of a propped cantilever: fixed at A (v=v'=0), roller at B
    (v=0, zero moment v''=0). Extract the reactions from the shear and moment at
    the wall and confirm they match the force method — no residuals imported."""
    v = sp.Function("v")
    bvp = sp.Eq(E * I * v(x).diff(x, 4), w)
    # general solution + the four BCs
    C1, C2, C3, C4 = sp.symbols("C1 C2 C3 C4")
    gen = (w * x**4 / 24 + C1 * x**3 / 6 + C2 * x**2 / 2 + C3 * x + C4) / (E * I)
    # verify `gen` actually solves the ODE before using it
    assert sp.simplify(E * I * gen.diff(x, 4) - w) == 0
    bcs = [gen.subs(x, 0), gen.diff(x, 1).subs(x, 0), gen.subs(x, L), gen.diff(x, 2).subs(x, L)]
    sol = sp.solve(bcs, [C1, C2, C3, C4], dict=True)[0]
    vx = gen.subs(sol)
    # M(x) = -EI v''  ;  V(x) = -EI v'''  (downward-load sign convention)
    M = sp.simplify(-E * I * vx.diff(x, 2))
    V = sp.simplify(-E * I * vx.diff(x, 3))
    R_A_bvp = sp.simplify(V.subs(x, 0))  # shear just right of the wall = wall reaction
    M_A_bvp = sp.simplify(-M.subs(x, 0))  # magnitude of the hogging wall moment
    R_B_bvp = sp.simplify(-V.subs(x, L))  # shear at the prop = prop reaction
    assert R_A_bvp == 5 * w * L / 8
    assert R_B_bvp == 3 * w * L / 8
    assert M_A_bvp == w * L**2 / 8


def test_midspan_deflection_and_true_maximum():
    """From the BVP deflection curve: the midspan value is exactly wL⁴/192EI, and
    the true maximum (slightly larger, ≈ wL⁴/185EI) sits at the IRRATIONAL station
    x = (15 − √33)L/16 ≈ 0.5785L — the reason the THING quotes the clean midspan
    value. (Re-deriving this independently corrects the S15 brief, which stated the
    location as (1+√33)L/16 ≈ 0.42L; that point is on the wrong side of midspan and
    deflects LESS than midspan, so it cannot be the maximum — protocol rule 6.)"""
    # EI·v(x) from the solved BVP (downward positive)
    EIv = w * x**4 / 24 - 5 * w * L * x**3 / 48 + w * L**2 * x**2 / 16
    delta_mid = sp.simplify(EIv.subs(x, L / 2) / (E * I))
    assert sp.simplify(delta_mid - w * L**4 / (192 * E * I)) == 0
    # location of the true maximum: interior root of dv/dx = 0 (evaluate at L=1)
    unit = EIv.subs({w: 1, L: 1})
    interior = [float(r) for r in sp.solve(sp.diff(unit, x), x) if r.is_real and 0 < float(r) < 1]
    xmax = max(interior, key=lambda r: float(unit.subs(x, r)))
    assert abs(xmax - 0.5785) < 1e-3
    assert abs(xmax - float((15 - sp.sqrt(33)) / 16)) < 1e-12  # the correct closed form
    # the true max deflection coefficient (with w = L = 1): between 1/186 and 1/184
    coeff = float(unit.subs(x, xmax))  # = δ_max·EI/(wL⁴)
    assert 1 / 186 < coeff < 1 / 184  # ≈ wL⁴/185EI
    assert coeff > 1 / 192  # and strictly larger than the quoted midspan value


def test_wall_moment_governs_over_sagging_peak():
    """|M|_max is the hogging moment at the wall, wL²/8, which beats the sagging
    peak 9wL²/128 at x = 5L/8 — so first yield is at the wall."""
    # M(x) from the reactions: cut at x, sum moments of the left part
    Mx = sp.expand(5 * w * L / 8 * x - w * L**2 / 8 - w * x**2 / 2)  # -M_A + R_A x - wx²/2
    # sagging peak location and value
    xs = sp.solve(sp.diff(Mx, x), x)
    assert xs == [5 * L / 8]
    M_sag = sp.simplify(Mx.subs(x, 5 * L / 8))
    assert M_sag == 9 * w * L**2 / 128
    M_wall = w * L**2 / 8  # = 16 wL²/128
    assert M_wall > M_sag  # 16/128 > 9/128 — the wall governs
    assert sp.simplify(M_wall - 16 * w * L**2 / 128) == 0


def test_numeric_golden_at_declared_defaults():
    """Hand-checkable at the declared defaults (w = 12 kN/m, L = 2 m, b = 50 mm,
    h = 100 mm, E = 200 GPa, σ_y = 250 MPa, ρ = 7850):
      I = bh³/12 = 4.16667e-6 m⁴
      R_A = 5wL/8 = 15000 N;  R_B = 3wL/8 = 9000 N;  M_A = wL²/8 = 6000 N·m
      σ_max = M_A(h/2)/I = 6000·0.05/4.16667e-6 = 72.0 MPa
      δ_mid = wL⁴/192EI = 12000·16/(192·200e9·4.16667e-6) = 1.20 mm
      SF = 250/72 = 3.4722;  m = ρbhL = 7850·0.05·0.1·2 = 78.5 kg
    """
    w_, L_, b_, h_ = 12000.0, 2.0, 0.05, 0.1
    E_, sy, rho = 200.0e9, 250.0e6, 7850.0
    I_ = b_ * h_**3 / 12
    assert abs(I_ - 4.16667e-6) / 4.16667e-6 < 1e-5
    R_A_ = 5 * w_ * L_ / 8
    R_B_ = 3 * w_ * L_ / 8
    M_A_ = w_ * L_**2 / 8
    assert (R_A_, R_B_, M_A_) == (15000.0, 9000.0, 6000.0)
    sigma = M_A_ * (h_ / 2) / I_
    assert abs(sigma - 72.0e6) / 72.0e6 < 1e-6
    delta_mid = w_ * L_**4 / (192 * E_ * I_)
    assert abs(delta_mid - 1.20e-3) / 1.20e-3 < 1e-5
    assert abs(sy / sigma - 3.47222) < 1e-4
    assert abs(rho * b_ * h_ * L_ - 78.5) < 1e-9
