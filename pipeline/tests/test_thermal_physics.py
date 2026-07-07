"""Independent physics cross-check for the thermal-assembly THING. NOTHING is
imported from thing.yaml — every result is re-derived from first principles:

  * the mismatch force, by SUPERPOSITION (free-expansion + restoring-force): let
    the clamped two-segment bar expand freely by α_i L_i ΔT, then apply the single
    axial force F that pushes the free end back so the NET elongation is zero (rigid
    walls). This must reproduce F = (α_1 L_1 + α_2 L_2)ΔT / (L_1/(A_1E_1)+L_2/(A_2E_2));
  * the same result a SECOND way, by setting up and solving the coupled 2×2
    equilibrium (F_1 = F_2) + zero-net-elongation compatibility system directly
    (the form the build certifies) — no residual read from thing.yaml;
  * the single-material limit σ = E α ΔT (fully restrained uniform bar);
  * ΔT = 0 ⇒ F = 0 exactly (the unstressed state), and the determinant
    (total flexibility) is strictly positive so the solve is never singular;
  * a PUBLISHED worked example reproduced to the pound and psi (Pytel & Singer,
    Strength of Materials, 4th ed., Problem 266);
  * a hand-checkable numeric golden at SEEDED material values (steel-a36 +
    al-6061-t6) at the THING's declared geometry.

Sign convention (matches the THING): F positive in COMPRESSION, so a temperature
RISE (ΔT>0) gives F>0; a DROP gives F<0 (tension).
"""

import math

import sympy as sp

# positive geometry/material symbols; dT is signed (heating OR cooling)
L1, L2, A1, A2, E1, E2, a1, a2 = sp.symbols("L1 L2 A1 A2 E1 E2 a1 a2", positive=True)
dT = sp.symbols("dT", real=True)
F, F1, F2 = sp.symbols("F F1 F2", real=True)

# the closed form we must independently reproduce (NOT imported):
F_expected = (a1 * L1 + a2 * L2) * dT / (L1 / (A1 * E1) + L2 / (A2 * E2))


def test_force_by_superposition():
    """First principles, superposition method. Free thermal elongation of the
    (series) bar is δ_th = α_1 L_1 ΔT + α_2 L_2 ΔT. A compression-positive force F
    shortens it by δ_F = F L_1/(A_1E_1) + F L_2/(A_2E_2). Rigid walls ⇒ net
    elongation zero ⇒ δ_th = δ_F ⇒ solve for F."""
    delta_th = a1 * L1 * dT + a2 * L2 * dT              # free thermal expansion
    flex = L1 / (A1 * E1) + L2 / (A2 * E2)               # total axial flexibility
    F_solved = sp.solve(sp.Eq(delta_th, F * flex), F)[0]  # net elongation zero
    assert sp.simplify(F_solved - F_expected) == 0


def test_force_by_solving_the_coupled_system():
    """The SECOND way — the coupled 2×2 the build certifies. Equilibrium F_1 = F_2
    and zero-net-elongation compatibility, set up here from the free body and solved
    together. No thing.yaml residual is read."""
    eq_equilibrium = sp.Eq(F1, F2)
    eq_compat = sp.Eq(
        a1 * L1 * dT + a2 * L2 * dT,
        F1 * L1 / (A1 * E1) + F2 * L2 / (A2 * E2),
    )
    sol = sp.solve([eq_equilibrium, eq_compat], [F1, F2], dict=True)[0]
    assert sp.simplify(sol[F1] - F_expected) == 0
    assert sp.simplify(sol[F2] - F_expected) == 0  # F_1 = F_2 falls out


def test_single_material_limit_is_E_alpha_dT():
    """Collapse both segments to one material and area: the fully restrained bar
    develops σ = E α ΔT, the textbook result — independent of length and area."""
    F_same = F_expected.subs({a2: a1, E2: E1, A2: A1})
    sigma = sp.simplify(F_same / A1)  # σ_1 = F/A_1 with A_2=A_1
    assert sp.simplify(sigma - E1 * a1 * dT) == 0


def test_zero_temperature_change_is_unstressed_and_det_positive():
    """ΔT = 0 ⇒ F = 0 exactly (the widget's zero check). The compatibility
    determinant is the total flexibility L_1/(A_1E_1)+L_2/(A_2E_2), strictly positive
    for positive inputs — the solve is never singular (its refusal pin is a yield
    WARN, not a determinant refusal)."""
    assert F_expected.subs(dT, 0) == 0
    flex = L1 / (A1 * E1) + L2 / (A2 * E2)
    assert flex.subs({L1: 1, A1: 1, E1: 1, L2: 1, A2: 1, E2: 1}) > 0
    # heating gives compression (F>0), cooling gives tension (F<0):
    subs_pos = {a1: 12e-6, a2: 23e-6, L1: 0.3, L2: 0.3, A1: 4e-4, A2: 6e-4, E1: 200e9, E2: 69e9}
    assert float(F_expected.subs({**subs_pos, dT: 50})) > 0
    assert float(F_expected.subs({**subs_pos, dT: -50})) < 0


# --- PUBLISHED worked example -------------------------------------------------
# Pytel, A. & Singer, F. L., "Strength of Materials", 4th ed., Problem 266:
# a steel segment (L=15 in, A=1.5 in², E=29e6 psi, α=6.5e-6/°F) joined to an
# aluminium segment (L=10 in, A=2.0 in², E=10e6 psi, α=12.8e-6/°F), clamped between
# UNYIELDING supports and heated ΔT = 100°F (bar "suitably braced against buckling").
# Published answers: internal force P = 26,691.84 lb; σ_steel = 17,795 psi;
# σ_al = 13,346 psi (both compressive). Consistent-US-customary units throughout —
# α[1/°F]·ΔT[°F] is a pure strain, so no unit system is needed.
def test_published_golden_pytel_singer_266():
    a_st, L_st, A_st, E_st = 6.5e-6, 15.0, 1.5, 29e6
    a_al, L_al, A_al, E_al = 12.8e-6, 10.0, 2.0, 10e6
    dT_ = 100.0
    num = (a_st * L_st + a_al * L_al) * dT_          # total free expansion, in
    den = L_st / (A_st * E_st) + L_al / (A_al * E_al)  # total flexibility, in/lb
    P = num / den                                     # lb (compression)
    assert abs(P - 26691.84) / 26691.84 < 1e-3        # matches to 4 sig figs
    sigma_steel = P / A_st
    sigma_al = P / A_al
    assert abs(sigma_steel - 17795.0) / 17795.0 < 1e-3
    assert abs(sigma_al - 13346.0) / 13346.0 < 1e-3


# --- conversion constant used only to turn PUBLISHED seed units into SI ---
_PSI = 6894.757293168  # Pa per psi


def test_numeric_golden_seeded_steel_left_al_right():
    """Hand-checkable golden with SEEDED material values (never remembered handbook
    numbers): an A36-steel left segment and a 6061-T6-aluminium right segment at the
    THING's declared geometry (ΔT = 50 K, L_1 = L_2 = 0.3 m, A_1 = 4 cm², A_2 = 6 cm²).

    Seed values (data/materials/steel-a36.yaml, al-6061-t6.yaml), converted from their
    PUBLISHED units:
      steel-a36:  E = 29 Msi, α = 11.7e-6/K, σ_y = 36 ksi (spec_minimum)
      al-6061-t6: E = 9.9 Msi, α = 23.4e-6/K (13.0e-6/°F × 1.8), σ_y = 276 MPa (typical)

    Hand derivation (superposition):
      δ_th = (11.7e-6·0.3 + 23.4e-6·0.3)·50 = 5.265e-4 m
      flex = 0.3/(4e-4·199.95e9) + 0.3/(6e-4·68.26e9) = 1.10773e-8 m/N
      F = δ_th/flex ≈ 47.53 kN (compression) ; σ_1 = F/A_1 ≈ 118.8 MPa ;
      σ_2 = F/A_2 ≈ 79.2 MPa ; both below yield (248 MPa steel, 276 MPa Al) — no warn.
      Note steel (higher Eα) out-stresses aluminium here even though Al expands ~2×.
    """
    E_st, a_st, sy_st = 29e6 * _PSI, 11.7e-6, 36e3 * _PSI
    E_al, a_al, sy_al = 9.9e6 * _PSI, 23.4e-6, 276e6
    dT_, L1_, A1_, L2_, A2_ = 50.0, 0.3, 4e-4, 0.3, 6e-4

    delta_th = a_st * L1_ * dT_ + a_al * L2_ * dT_
    flex = L1_ / (A1_ * E_st) + L2_ / (A2_ * E_al)
    F_ = delta_th / flex
    assert abs(F_ - 47534.7) / 47534.7 < 1e-4          # 47.535 kN
    s1_, s2_ = F_ / A1_, F_ / A2_
    assert abs(s1_ - 118.837e6) / 118.837e6 < 1e-4     # steel left 118.84 MPa
    assert abs(s2_ - 79.225e6) / 79.225e6 < 1e-4       # al right 79.22 MPa
    assert s1_ > s2_                                     # slimmer segment stresses more (A_1<A_2)
    # the Eα punchline: steel out-stresses aluminium despite Al's larger α
    assert E_st * a_st > E_al * a_al
    # both segments below yield at these defaults -> no warn banner
    assert abs(s1_) < sy_st and abs(s2_) < sy_al
    # free strains differ (the source of the force)
    assert abs(a_st * dT_ - 5.85e-4) < 1e-9
    assert abs(a_al * dT_ - 1.17e-3) < 1e-9

    # sanity: closed form agrees with an independent solve of the coupled 2×2
    sol = sp.solve(
        [sp.Eq(F1, F2),
         sp.Eq(a_st * L1_ * dT_ + a_al * L2_ * dT_, F1 * L1_ / (A1_ * E_st) + F2 * L2_ / (A2_ * E_al))],
        [F1, F2], dict=True,
    )[0]
    assert math.isclose(float(sol[F1]), F_, rel_tol=1e-9)
