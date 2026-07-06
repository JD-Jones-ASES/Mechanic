"""First-principles cross-check for two-bar-truss (CLAUDE.md invariant 5).

Independent of thing.yaml: nothing here imports the authored residuals. The
governing results are re-derived from scratch —

  * the MEMBER FORCE F_m = P/(2 cos α) from vector equilibrium of the loaded
    joint (sum of the two member-force vectors plus the load equals zero), solved
    with sympy — not transcribed;
  * the JOINT DEFLECTION δ = P L/(2 A E cos²α) re-derived TWO independent ways,
    which must agree symbolically (the whole point of this THING's test):
      (a) the UNIT-LOAD / virtual-work theorem  δ = Σ N n L/(A E), and
      (b) the COMPATIBILITY-TRIANGLE geometry    e = F_m L/(A E), δ = e/cos α;
    and the exponent is pinned at cos²α (NOT cos³α — see note below);
  * the EULER buckling load P_cr = π²E I/L² re-derived from the buckling ODE
    v'' + k²v = 0 with pinned–pinned ends, cross-pinned against the closed form;
  * the round-bar section properties (A, I, r = d/4) and the transition
    slenderness λ_T = √(2π²E/σ_y), cross-checked against the Euler Column form.

NOTE ON THE EXPONENT. The brief specified δ = P L/(2 A E cos³α); that is a
transcription error. Both independent derivations here give cos²α — one cos α
enters through the member force F_m = P/(2 cos α), a second through the
projection δ = e/cos α of the joint drop onto the member axis. The value is the
standard symmetric two-bar result (web-corroborated 2026-07-06). The site ships
cos²α; this test is the machine proof.

Golden: a hand-checkable steel truss at the widget defaults, all arithmetic in
the comment.
"""

import math

import sympy as sp

# ---- exact symbols (physical quantities strictly positive) ----------------
P, alpha, L, d, E, sigma_y, rho = sp.symbols("P alpha L d E sigma_y rho", positive=True)
A, I, S = sp.symbols("A I S", positive=True)
x = sp.symbols("x", positive=True)


def test_member_force_from_joint_equilibrium():
    """F_m = P/(2 cos α) from vector equilibrium of the joint. Two identical
    members, each at angle α from the vertical, carry a load P applied along the
    axis of symmetry. Sum the two member-force vectors and the load to zero and
    solve for the member force magnitude S — nothing about the residual is used."""
    # member unit vectors from the joint toward each anchor: at angle α from the
    # vertical, symmetric about it. Force on the joint = S times these directions
    # (tension pulls the joint toward the anchors).
    right = sp.Matrix([sp.sin(alpha), sp.cos(alpha)])
    left = sp.Matrix([-sp.sin(alpha), sp.cos(alpha)])
    load = sp.Matrix([0, -P])  # applied load, downward along the symmetry axis
    net = S * right + S * left + load
    # horizontal component cancels identically; vertical fixes S
    assert sp.simplify(net[0]) == 0
    S_sol = sp.solve(sp.Eq(net[1], 0), S)[0]
    assert sp.simplify(S_sol - P / (2 * sp.cos(alpha))) == 0


def test_joint_deflection_two_independent_routes_agree():
    """δ by the unit-load theorem AND by the compatibility triangle must give the
    SAME expression — and it is cos²α, not cos³α."""
    A_expr = sp.pi * d**2 / 4
    F_m = P / (2 * sp.cos(alpha))

    # (a) UNIT-LOAD / virtual work: apply a unit vertical load at the joint; each
    # member then carries n = 1/(2 cos α) by the same equilibrium. The theorem
    # gives the real deflection in the load's direction as δ = Σ N n L/(A E),
    # summed over the two members.
    N_real = F_m
    n_unit = 1 / (2 * sp.cos(alpha))
    delta_unitload = sp.simplify(2 * N_real * n_unit * L / (A_expr * E))

    # (b) COMPATIBILITY TRIANGLE: each member elongates by e = F_m L/(A E)
    # (Hooke); the joint's vertical drop δ projects onto the member axis (at α
    # from the vertical) as e = δ cos α, so δ = e/cos α.
    e_elong = F_m * L / (A_expr * E)
    delta_geom = sp.simplify(e_elong / sp.cos(alpha))

    assert sp.simplify(delta_unitload - delta_geom) == 0, "the two routes disagree"

    # both equal the cos²α closed form the site ships
    delta_cos2 = P * L / (2 * A_expr * E * sp.cos(alpha) ** 2)
    assert sp.simplify(delta_unitload - delta_cos2) == 0

    # and NOT the brief's cos³α: their ratio is exactly cos α (≠ 1), so any state
    # with α > 0 distinguishes them — the correction is real, not cosmetic
    delta_cos3 = P * L / (2 * A_expr * E * sp.cos(alpha) ** 3)
    assert sp.simplify(delta_cos2 / delta_cos3) == sp.cos(alpha)


def test_deflection_and_force_diverge_as_truss_flattens():
    """As α → 90° the member loses its vertical bite: both the force and the
    deflection diverge like 1/cos^k α. This is the physical origin of the
    small-displacement warn and the α ≥ 90° refusal."""
    A_expr = sp.pi * d**2 / 4
    F_m = P / (2 * sp.cos(alpha))
    delta = P * L / (2 * A_expr * E * sp.cos(alpha) ** 2)
    assert sp.limit(F_m, alpha, sp.pi / 2, "-") == sp.oo
    assert sp.limit(delta, alpha, sp.pi / 2, "-") == sp.oo
    # at α = 0 (members vertical) the truss is two parallel bars sharing P/2 each:
    # F_m = P/2 and δ = PL/(2AE) — the un-inclined baseline
    assert sp.simplify(F_m.subs(alpha, 0) - P / 2) == 0
    assert sp.simplify(delta.subs(alpha, 0) - P * L / (2 * A_expr * E)) == 0


def test_euler_buckling_from_the_ode():
    """P_cr = π²E I/L² re-derived from the pinned–pinned buckling eigenproblem,
    independent of the closed form. A nudged strut obeys EI v'' = −P v, i.e.
    v'' + k²v = 0 with k² = P/(EI); the pinned ends v(0) = v(L) = 0 force
    sin(kL) = 0, whose first nonzero root kL = π gives P_cr = π²EI/L²."""
    k = sp.symbols("k", positive=True)  # wavenumber; C1 is a free integration const
    C1 = sp.symbols("C1")
    v = C1 * sp.sin(k * x)  # mode consistent with the pinned base v(0) = 0
    # it satisfies the buckling ODE v'' + k²v = 0 with k² = P/(EI)
    assert sp.simplify(sp.diff(v, x, 2) + k**2 * v) == 0
    assert v.subs(x, 0) == 0  # pinned base
    # pinned top v(L) = 0 with C1 ≠ 0 forces sin(kL) = 0; the smallest nonzero
    # root is kL = π (the first buckling mode)
    assert sp.sin(k * L).subs(k, sp.pi / L) == 0
    P_cr = (sp.pi / L) ** 2 * (E * I)  # from k² = P/(EI) at kL = π
    assert sp.simplify(P_cr - sp.pi**2 * E * I / L**2) == 0
    # cross-pin against the Euler Column page's own closed form (K = 1)
    assert sp.simplify(P_cr - sp.pi**2 * E * I / (1 * L) ** 2) == 0


def test_round_bar_section_and_slenderness():
    """A = πd²/4, I = πd⁴/64, and the radius of gyration r = √(I/A) = d/4 for a
    solid round bar; slenderness λ = L/r = 4L/d. The transition slenderness
    λ_T = √(2π²E/σ_y) matches the Euler Column form (K = 1)."""
    A_expr = sp.pi * d**2 / 4
    I_expr = sp.pi * d**4 / 64
    r_g = sp.sqrt(I_expr / A_expr)
    assert sp.simplify(r_g - d / 4) == 0
    lam = L / r_g
    assert sp.simplify(lam - 4 * L / d) == 0
    lam_T = sp.sqrt(2 * sp.pi**2 * E / sigma_y)
    # σ_cr(λ_T) = π²E/λ_T² = σ_y/2 — the σ_y/2 convention, re-derived
    sigma_cr_at_T = sp.pi**2 * E / lam_T**2
    assert sp.simplify(sigma_cr_at_T - sigma_y / 2) == 0


def test_sign_convention_and_which_check_governs():
    """The signed member force N_m = (1 − 2s)F_m is +F_m in tension (s = 0) and
    −F_m in compression (s = 1) — same magnitude, opposite sign. At the widget
    defaults the buckling margin is the smaller of the two checks, so buckling
    (not yield) governs the compression member — the pedagogical headline."""
    F_m = sp.Symbol("F_m", positive=True)
    s = sp.Symbol("s")
    N_m = (1 - 2 * s) * F_m
    assert sp.simplify(N_m.subs(s, 0) - F_m) == 0  # tension, positive
    assert sp.simplify(N_m.subs(s, 1) + F_m) == 0  # compression, negative
    # governing-check comparison at the defaults (numbers from the golden below)
    SF_y_def = 10.62773
    SF_buck_def = 3.27787
    assert SF_buck_def < SF_y_def  # buckling governs a slender compression member


def test_numeric_golden():
    """Hand-checkable steel truss at the widget defaults, all arithmetic here.

    Two solid round bars, d = 50 mm, L = 2 m, at α = 30° from the vertical,
    E = 200 GPa, σ_y = 250 MPa, ρ = 7800 kg/m³, joint load P = 80 kN.
      A     = πd²/4 = π·0.05²/4              = 1.963495e-3 m²
      I     = πd⁴/64 = π·0.05⁴/64            = 3.067962e-7 m⁴
      r     = d/4 = 0.0125 m ; λ = L/r = 2/0.0125 = 160
      λ_T   = √(2π²·200e9/250e6)             = 125.6637   (slender: 160 > λ_T)
      cos30 = 0.8660254 ; cos²30 = 0.75
      F_m   = P/(2cos30) = 80000/1.7320508   = 46188.02 N   (46.19 kN)
      σ     = F_m/A = 46188.02/1.963495e-3   = 23.52337 MPa
      SF_y  = σ_y/σ = 250/23.52337           = 10.62773
      δ     = PL/(2AE cos²30)
            = 160000/(2·1.963495e-3·200e9·0.75) = 2.716244e-4 m  (0.2716 mm)
      m     = 2ρAL = 2·7800·1.963495e-3·2    = 61.2611 kg
      P_cr  = π²EI/L² = π²·200e9·3.067962e-7/4 = 151397.9 N  (151.4 kN)
      SF_bk = P_cr/F_m = 151397.9/46188.02   = 3.27787   (buckling governs)
    """
    P_, a_, L_, d_ = 80000.0, math.radians(30), 2.0, 0.05
    E_, sy_, rho_ = 200e9, 250e6, 7800.0

    A_ = math.pi * d_**2 / 4
    assert math.isclose(A_, 1.963495e-3, rel_tol=1e-6)
    I_ = math.pi * d_**4 / 64
    assert math.isclose(I_, 3.067962e-7, rel_tol=1e-6)
    r_ = d_ / 4
    lam = L_ / r_
    assert math.isclose(lam, 160.0, rel_tol=1e-12)
    lam_T = math.sqrt(2 * math.pi**2 * E_ / sy_)
    assert math.isclose(lam_T, 125.6637, rel_tol=1e-6)
    assert lam > lam_T  # slender enough for Euler

    F_m = P_ / (2 * math.cos(a_))
    assert math.isclose(F_m, 46188.02, rel_tol=1e-6)
    sigma = F_m / A_
    assert math.isclose(sigma, 23.52337e6, rel_tol=1e-5)
    SF_y = sy_ / sigma
    assert math.isclose(SF_y, 10.62773, rel_tol=1e-5)

    delta = P_ * L_ / (2 * A_ * E_ * math.cos(a_) ** 2)
    assert math.isclose(delta, 2.716244e-4, rel_tol=1e-5)

    m_truss = 2 * rho_ * A_ * L_
    assert math.isclose(m_truss, 61.2611, rel_tol=1e-5)

    P_cr = math.pi**2 * E_ * I_ / L_**2
    assert math.isclose(P_cr, 151397.9, rel_tol=1e-5)
    SF_buck = P_cr / F_m
    assert math.isclose(SF_buck, 3.27787, rel_tol=1e-5)
    assert SF_buck < SF_y  # buckling is the governing failure mode in compression
