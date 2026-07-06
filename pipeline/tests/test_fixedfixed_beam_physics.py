"""Independent physics cross-check for the fixed-fixed-beam THING. NOTHING is
imported from thing.yaml — every result is re-derived from first principles:

  * the four redundant reactions two independent ways — (1) solving the
    Euler–Bernoulli boundary-value problem EI·v'''' = w with v = v' = 0 at BOTH
    ends, and (2) the force (flexibility) method: release the right end to a
    cantilever, derive its tip deflection and slope under the UDL and the two
    redundants by integration, and impose zero deflection AND zero slope — which
    must agree (R_A = R_B = wL/2, M_A = M_B = wL²/12);
  * the midspan deflection wL⁴/384EI (the maximum, at the centre by symmetry);
  * that the hogging wall moment wL²/12 is exactly TWICE the sagging midspan
    moment wL²/24, so the walls govern the stress;
  * a hand-checkable numeric golden at the declared defaults.

Sign convention (matches test_propped_physics.py): EI·v'''' = w, v downward
positive, M(x) = -EI·v'', V(x) = -EI·v'''.
"""

import math

import sympy as sp

w, L, E, I, x = sp.symbols("w L E I x", positive=True)


def test_reactions_by_boundary_value_problem():
    """Solve EI·v'''' = w with the four clamped boundary conditions v = v' = 0 at
    both ends. Extract the reactions from the shear and moment at each wall and
    confirm the symmetric result — no residuals imported."""
    C1, C2, C3, C4 = sp.symbols("C1 C2 C3 C4")
    gen = (w * x**4 / 24 + C1 * x**3 / 6 + C2 * x**2 / 2 + C3 * x + C4) / (E * I)
    assert sp.simplify(E * I * gen.diff(x, 4) - w) == 0  # gen solves the ODE
    bcs = [
        gen.subs(x, 0),
        gen.diff(x, 1).subs(x, 0),
        gen.subs(x, L),
        gen.diff(x, 1).subs(x, L),
    ]
    sol = sp.solve(bcs, [C1, C2, C3, C4], dict=True)[0]
    vx = gen.subs(sol)
    M = sp.simplify(-E * I * vx.diff(x, 2))  # sagging-positive internal moment
    V = sp.simplify(-E * I * vx.diff(x, 3))
    R_A = sp.simplify(V.subs(x, 0))  # shear just right of wall A = wall reaction
    R_B = sp.simplify(-V.subs(x, L))  # shear at wall B
    M_A = sp.simplify(-M.subs(x, 0))  # magnitude of the hogging wall moment at A
    M_B = sp.simplify(-M.subs(x, L))  # magnitude of the hogging wall moment at B
    assert R_A == w * L / 2
    assert R_B == w * L / 2
    assert M_A == w * L**2 / 12
    assert M_B == w * L**2 / 12


def _cantilever_tip(load_moment):
    """(tip deflection, tip slope) of a cantilever fixed at x=0, free at x=L, by
    integrating EI·v'' = M(x) with v(0)=v'(0)=0. Down-positive."""
    K1, K2 = sp.symbols("K1 K2")
    vp = sp.integrate(load_moment / (E * I), x) + K1
    v = sp.integrate(vp, x) + K2
    s = sp.solve([sp.Eq(v.subs(x, 0), 0), sp.Eq(vp.subs(x, 0), 0)], [K1, K2])
    return sp.simplify(v.subs(s).subs(x, L)), sp.simplify(vp.subs(s).subs(x, L))


def test_reactions_by_force_method():
    """Release the right end to a cantilever fixed at A. Redundants: upward force
    R_B at the tip and a tip couple C (sagging-positive internal moment). Impose
    zero deflection AND zero slope at the released end, solve for R_B and C, then
    equilibrium closes R_A and M_A. Independent of the BVP route."""
    R_B, C = sp.symbols("R_B C", real=True)
    # free-body internal moment beyond a cut at x: UDL + upward R_B + couple C
    M_total = w * (L - x) ** 2 / 2 - R_B * (L - x) + C
    dB, thB = _cantilever_tip(M_total)
    solu = sp.solve([sp.Eq(dB, 0), sp.Eq(thB, 0)], [R_B, C], dict=True)[0]
    R_B_val = sp.simplify(solu[R_B])
    C_val = sp.simplify(solu[C])
    assert R_B_val == w * L / 2  # prop force
    # |wall moment| = |C| = wL²/12 (its sagging-convention sign is opposite the
    # BVP's, but the MAGNITUDE — what the THING reports — is identical)
    assert sp.Abs(C_val) == w * L**2 / 12
    # equilibrium closes the near wall
    R_A_val = sp.simplify(w * L - R_B_val)
    assert R_A_val == w * L / 2


def test_midspan_deflection_is_the_maximum():
    """From the BVP curve, the midspan deflection is exactly wL⁴/384EI, and it is
    the maximum (zero slope at the centre by symmetry)."""
    EIv = w * x**2 * (L - x) ** 2 / 24  # solved BVP deflection × EI (down-positive)
    delta_mid = sp.simplify(EIv.subs(x, L / 2) / (E * I))
    assert sp.simplify(delta_mid - w * L**4 / (384 * E * I)) == 0
    # slope vanishes at midspan -> it is the extremum
    assert sp.simplify((EIv.diff(x) / (E * I)).subs(x, L / 2)) == 0


def test_wall_moment_is_twice_the_midspan_moment():
    """|M|_max is the hogging wall moment wL²/12; the sagging midspan moment is
    wL²/24 — exactly half — so the walls govern first yield."""
    # M(x) from the reactions: cut at x, sum moments of the left part
    # M(x) = R_A·x - M_A - w x²/2  with R_A = wL/2, M_A = wL²/12 (hogging)
    Mx = sp.expand(w * L / 2 * x - w * L**2 / 12 - w * x**2 / 2)
    M_mid = sp.simplify(Mx.subs(x, L / 2))
    assert M_mid == w * L**2 / 24  # sagging peak at midspan
    M_wall = w * L**2 / 12
    assert sp.simplify(M_wall - 2 * M_mid) == 0  # walls carry twice the midspan


def test_stiffer_than_simply_supported():
    """The fixed-fixed midspan deflection is one-fifth of the simply-supported
    beam's 5wL⁴/384EI, and its peak moment two-thirds of the SS wL²/8."""
    ff_defl = w * L**4 / (384 * E * I)
    ss_defl = 5 * w * L**4 / (384 * E * I)
    assert sp.simplify(ss_defl / ff_defl) == 5
    ff_moment = w * L**2 / 12
    ss_moment = w * L**2 / 8
    assert sp.simplify(ff_moment / ss_moment) == sp.Rational(2, 3)


def test_numeric_golden_at_declared_defaults():
    """Hand-checkable at the declared defaults (w = 12 kN/m, L = 3 m, b = 50 mm,
    h = 100 mm, E = 200 GPa, σ_y = 250 MPa, ρ = 7850):
      I = bh³/12 = 4.16667e-6 m⁴
      R_A = R_B = wL/2 = 18000 N;  M_A = M_B = wL²/12 = 9000 N·m
      M_mid = wL²/24 = 4500 N·m
      σ_max = M_A(h/2)/I = 9000·0.05/4.16667e-6 = 108.0 MPa
      δ_max = wL⁴/384EI = 12000·81/(384·200e9·4.16667e-6) = 3.0375 mm
      SF = 250/108 = 2.3148;  m = ρbhL = 7850·0.05·0.1·3 = 117.75 kg
    """
    w_, L_, b_, h_ = 12000.0, 3.0, 0.05, 0.1
    E_, sy, rho = 200.0e9, 250.0e6, 7850.0
    I_ = b_ * h_**3 / 12
    assert abs(I_ - 4.16667e-6) / 4.16667e-6 < 1e-5
    R_A_ = w_ * L_ / 2
    M_A_ = w_ * L_**2 / 12
    M_mid_ = w_ * L_**2 / 24
    assert (R_A_, M_A_, M_mid_) == (18000.0, 9000.0, 4500.0)
    sigma = M_A_ * (h_ / 2) / I_
    assert abs(sigma - 108.0e6) / 108.0e6 < 1e-6
    delta = w_ * L_**4 / (384 * E_ * I_)
    assert abs(delta - 3.0375e-3) / 3.0375e-3 < 1e-5
    assert abs(sy / sigma - 2.31481) < 1e-4
    assert abs(rho * b_ * h_ * L_ - 117.75) < 1e-9
