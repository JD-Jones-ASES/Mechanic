"""Independent physics cross-check for the composite-bar THING. NOTHING is
imported from thing.yaml — every result is re-derived from first principles:

  * the load share, from the SPRINGS-IN-PARALLEL model: each member is an axial
    spring of rate k_i = A_i E_i / L; a rigid end cap forces a common elongation
    δ, so the member forces are P_i = k_i δ and the share is k_i / Σk. This must
    reproduce P_i = P·A_i E_i /(A_1 E_1 + A_2 E_2) with no residual imported;
  * the same result a second way, by setting up and solving the 2×2 equilibrium
    + equal-elongation system directly (the coupled form the build certifies);
  * the equal-strain corollary σ_1/σ_2 = E_1/E_2 (Hooke on a shared strain);
  * the system determinant A_1 E_1 + A_2 E_2 is strictly positive for positive
    inputs, so the exact solve is always non-singular — no manufactured refusal;
  * a hand-checkable numeric golden at seeded material values (steel-a36 core +
    al-6061-t6 sleeve).
"""

import math

import sympy as sp

P, L, A1, A2, E1, E2, delta = sp.symbols("P L A1 A2 E1 E2 delta", positive=True)
P1, P2 = sp.symbols("P1 P2", positive=True)


def test_load_share_by_springs_in_parallel():
    """First principles: two axial springs in parallel under a rigid end cap.
    Each member has axial stiffness k_i = A_i E_i / L (from δ = P_i L /(A_i E_i)).
    A rigid cap imposes ONE elongation δ on both; the total load is the sum of the
    member forces, so δ = P / (k_1 + k_2) and P_i = k_i δ."""
    k1 = A1 * E1 / L
    k2 = A2 * E2 / L
    d = P / (k1 + k2)  # common elongation of the parallel combination
    P1_pp = sp.simplify(k1 * d)
    P2_pp = sp.simplify(k2 * d)
    # the stiffness-proportional share, independent of L (it cancels)
    assert sp.simplify(P1_pp - P * A1 * E1 / (A1 * E1 + A2 * E2)) == 0
    assert sp.simplify(P2_pp - P * A2 * E2 / (A1 * E1 + A2 * E2)) == 0
    assert sp.simplify(P1_pp + P2_pp - P) == 0  # equilibrium falls out
    # the common elongation matches δ = P L /(A_1E_1 + A_2E_2)
    assert sp.simplify(d - P * L / (A1 * E1 + A2 * E2)) == 0


def test_load_share_by_solving_the_coupled_system():
    """The same result the SECOND way — the coupled 2×2 the build certifies.
    Equilibrium P_1 + P_2 = P and equal-elongation P_1 L/(A_1E_1) = P_2 L/(A_2E_2),
    solved together. Uses sympy.solve on the two equations set up here from the
    free body — no residual read from thing.yaml."""
    eq_equilibrium = sp.Eq(P1 + P2, P)
    eq_compat = sp.Eq(P1 * L / (A1 * E1), P2 * L / (A2 * E2))
    sol = sp.solve([eq_equilibrium, eq_compat], [P1, P2], dict=True)[0]
    assert sp.simplify(sol[P1] - P * A1 * E1 / (A1 * E1 + A2 * E2)) == 0
    assert sp.simplify(sol[P2] - P * A2 * E2 / (A1 * E1 + A2 * E2)) == 0


def test_equal_strain_stress_ratio_equals_modulus_ratio():
    """Hooke on a shared strain: both members see ε = δ/L, so σ_i = E_i ε and the
    stress ratio is the modulus ratio — independent of area. This is the THING's
    punchline (a machine-checked derivation identity in the artifact)."""
    P1_sol = P * A1 * E1 / (A1 * E1 + A2 * E2)
    P2_sol = P * A2 * E2 / (A1 * E1 + A2 * E2)
    sigma1 = P1_sol / A1
    sigma2 = P2_sol / A2
    assert sp.simplify(sigma1 / sigma2 - E1 / E2) == 0
    # and each stress equals E_i times the common strain δ/L
    d = P * L / (A1 * E1 + A2 * E2)
    eps = d / L
    assert sp.simplify(sigma1 - E1 * eps) == 0
    assert sp.simplify(sigma2 - E2 * eps) == 0


def test_determinant_strictly_positive():
    """The 2×2 coefficient determinant is (up to the always-positive factor
    L/(A_1E_1·A_2E_2)) the stiffness sum A_1E_1 + A_2E_2 — strictly positive for
    positive areas and moduli, so the exact solve is never singular. The THING
    manufactures no singular state; its refusal pin is a yield WARN, not a det
    refusal."""
    # A = Jacobian of [P1+P2-P, P1 L/(A1E1) - P2 L/(A2E2)] wrt (P1, P2)
    A = sp.Matrix([[1, 1], [L / (A1 * E1), -L / (A2 * E2)]])
    det = sp.simplify(A.det())
    # det = -L(A1E1 + A2E2)/(A1E1 A2E2): non-zero and never zero for positive args
    assert sp.simplify(det + L * (A1 * E1 + A2 * E2) / (A1 * E1 * A2 * E2)) == 0
    assert det.subs({L: 1, A1: 1, E1: 1, A2: 1, E2: 1}) != 0


# --- conversion constants used only to turn PUBLISHED seed units into SI ---
_PSI = 6894.757293168  # Pa per psi (exact-ish CODATA-derived)
_LB_IN3 = 0.45359237 / 1.6387064e-5  # kg/m^3 per lb/in^3 (both factors exact)


def test_numeric_golden_seeded_steel_core_al_sleeve():
    """Hand-checkable golden with SEEDED material values (never remembered
    handbook numbers): an A36-steel core inside a 6061-T6-aluminium sleeve, with
    rounded geometry A_1 = 4 cm², A_2 = 6 cm², P = 100 kN, L = 0.5 m.

    Seed values (data/materials/steel-a36.yaml, al-6061-t6.yaml), converted from
    their PUBLISHED units — and picked at the basis the site's pickProperty uses
    (typical > design_minimum > spec_minimum):
      core steel-a36:  E = 29 Msi, σ_y = 36 ksi (spec_minimum, only basis),
                       ρ = 0.282 lb/in³
      sleeve al-6061:  E = 9.9 Msi, σ_y = 276 MPa (TYPICAL, beats the 36-ksi
                       design_minimum), ρ = 0.098 lb/in³

    Hand derivation (stiffness-proportional share):
      A₁E₁ = 4e-4·199.95e9 = 7.998e7 N ;  A₂E₂ = 6e-4·68.26e9 = 4.095e7 N
      Σ = 1.2093e8 ;  f₁ = A₁E₁/Σ = 0.6613 (core 66%), f₂ = 0.3387
      P₁ = 66.13 kN, P₂ = 33.87 kN
      σ₁ = P₁/A₁ = 165.3 MPa ;  σ₂ = P₂/A₂ = 56.4 MPa ;  σ₁/σ₂ = 2.929 = E₁/E₂
      δ = P L/Σ = 0.4134 mm
      SF₁ = 248.2/165.3 = 1.50 (steel core) ;  SF₂ = 276/56.4 = 4.89 (Al sleeve)
      → the STIFF steel core, carrying 2/3 of the load against a spec-minimum
        yield, is the first to yield despite steel being the "stronger" metal.
    """
    E1_ = 29e6 * _PSI  # steel-a36 Young's modulus
    sy1_ = 36e3 * _PSI  # steel-a36 yield (spec_minimum)
    rho1_ = 0.282 * _LB_IN3
    E2_ = 9.9e6 * _PSI  # al-6061-t6 Young's modulus
    sy2_ = 276e6  # al-6061-t6 yield (typical, already SI)
    rho2_ = 0.098 * _LB_IN3
    A1_, A2_, P_, L_ = 4e-4, 6e-4, 1.0e5, 0.5

    S = A1_ * E1_ + A2_ * E2_
    P1_ = P_ * A1_ * E1_ / S
    P2_ = P_ * A2_ * E2_ / S
    assert abs(P1_ + P2_ - P_) < 1e-6  # equilibrium
    assert abs(P1_ - 66134.5) < 1.0  # ~66.13 kN in the core
    assert abs(P2_ - 33865.5) < 1.0
    f1_, f2_ = P1_ / P_, P2_ / P_
    assert abs(f1_ - 0.6613) < 1e-3 and abs(f1_ + f2_ - 1.0) < 1e-12
    s1_, s2_ = P1_ / A1_, P2_ / A2_
    assert abs(s1_ - 165.34e6) / 165.34e6 < 1e-3
    assert abs(s2_ - 56.44e6) / 56.44e6 < 1e-3
    assert abs(s1_ / s2_ - E1_ / E2_) < 1e-9  # equal-strain corollary
    d_ = P_ * L_ / S
    assert abs(d_ - 0.41345e-3) / 0.41345e-3 < 1e-3
    SF1_, SF2_ = sy1_ / s1_, sy2_ / s2_
    assert abs(SF1_ - 1.501) < 5e-3  # steel core margin
    assert abs(SF2_ - 4.890) < 5e-3  # aluminium sleeve margin
    assert SF1_ < SF2_  # the stiff-but-spec-min-strength core yields first
    m_ = (rho1_ * A1_ + rho2_ * A2_) * L_
    assert abs(m_ - 2.3749) < 1e-3  # kg

    # sanity: the closed forms agree with an independent solve of the coupled 2×2
    sol = sp.solve(
        [sp.Eq(P1 + P2, P_), sp.Eq(P1 * L_ / (A1_ * E1_), P2 * L_ / (A2_ * E2_))],
        [P1, P2],
        dict=True,
    )[0]
    assert math.isclose(float(sol[P1]), P1_, rel_tol=1e-9)
    assert math.isclose(float(sol[P2]), P2_, rel_tol=1e-9)
