"""Independent physics cross-check for the helical-spring THING: re-derive the
rate from Castigliano's theorem with BOTH energy terms (torsion + direct
shear), quantify the term the authored relation drops, pin the Wahl factor's
structure (limits, table values, ordering vs the direct-shear-only factor),
re-derive the direct-shear factor from first principles, verify the stability
constant ("2.63 for steels") from the exact elastic form, and check the
stiffness/strength axis split plus a hand-checkable numeric golden."""

import math

import sympy as sp

F, d, D, G, E = sp.symbols("F d D G E", positive=True)
N = sp.symbols("N", positive=True)  # active coils
C = sp.symbols("C", positive=True)  # spring index


def test_castigliano_rederives_the_rate_and_bounds_the_dropped_term():
    """U = T²l/(2GJ) + F²l/(2AG) over the active wire; δ = ∂U/∂F. The exact
    result is the authored 8FD³N/(d⁴G) times (1 + 1/(2C²)) — the THING's
    relation (Shigley eq. 10-9) drops the parenthesis, which is < 1 % for
    C ≥ 7.1."""
    T = F * D / 2
    l_w = sp.pi * D * N
    J = sp.pi * d**4 / 32
    A = sp.pi * d**2 / 4
    U = T**2 * l_w / (2 * G * J) + F**2 * l_w / (2 * A * G)
    y_exact = sp.diff(U, F)
    y_approx = 8 * F * D**3 * N / (d**4 * G)
    ratio = sp.simplify(y_exact / y_approx)
    # the exact/approx ratio is exactly 1 + 1/(2C²) with C = D/d
    assert sp.simplify(ratio - (1 + 1 / (2 * (D / d) ** 2))) == 0
    # at the catalog default C = 8 the dropped term is 0.78 %
    assert abs(float(ratio.subs(D, 8 * d).subs(d, 1)) - 1) < 0.008
    # and the rate that follows is the authored relation
    k = sp.simplify(F / y_approx)
    assert sp.simplify(k - G * d**4 / (8 * D**3 * N)) == 0


def test_direct_shear_factor_from_first_principles():
    """τ = Tr/J + F/A on the wire section factors into (8FD/πd³)·(1 + 1/(2C)):
    the K_s = (2C+1)/(2C) of Shigley eq. 10-3, re-derived not quoted."""
    tau_sum = (F * D / 2) * (d / 2) / (sp.pi * d**4 / 32) + F / (sp.pi * d**2 / 4)
    K_s_derived = sp.simplify(tau_sum / (8 * F * D / (sp.pi * d**3)))
    assert sp.simplify(K_s_derived.subs(d, D / C) - (2 * C + 1) / (2 * C)) == 0


def _wahl(c):
    return (4 * c - 1) / (4 * c - 4) + sp.Rational(615, 1000) / c


def test_wahl_factor_limits_and_published_values():
    """K_W → 1 as C → ∞ (a straight torsion bar needs no correction); at the
    classic table points it reproduces the published magnitudes: ≈ +25 % at
    C = 6 and ≈ +40 % at C = 4 (the values Shigley's ch. 10 text quotes)."""
    assert sp.limit(_wahl(C), C, sp.oo) == 1
    assert abs(float(_wahl(6)) - 1.2525) < 1e-4
    assert abs(float(_wahl(4)) - 1.40375) < 1e-5
    # Bergsträsser's alternative sits just below Wahl — at most ~1.4 % at C = 4,
    # shrinking as C grows (the thing.yaml assumption quotes this bound)
    K_B = (4 * C + 2) / (4 * C - 3)
    gaps = [float((_wahl(C) / K_B).subs(C, c)) - 1 for c in (4, 6, 8, 10, 12)]
    assert all(0 < g < 0.014 for g in gaps)
    assert gaps == sorted(gaps, reverse=True)  # monotone shrinking


def test_wahl_exceeds_direct_shear_alone():
    """Curvature only ever adds stress on the inner fiber: K_W > K_s = 1 + 1/(2C)
    across the practical index range — symbolically, their difference has a
    positive numerator and denominator for C > 1."""
    diff = sp.together(_wahl(C) - (2 * C + 1) / (2 * C))
    num, den = sp.fraction(diff)
    # substitute C = 1 + u (u > 0) so positivity is decidable term-by-term
    u = sp.symbols("u", positive=True)
    assert sp.expand(num.subs(C, 1 + u)).as_poly(u).coeffs()[-1] >= 0
    assert all(co > 0 for co in sp.expand(den.subs(C, 1 + u)).as_poly(u).coeffs())
    for c in (4, 5, 6, 8, 10, 12, 20):
        assert float(diff.subs(C, c)) > 0


def test_stability_constant_for_steel():
    """The exact absolute-stability bound L_0 < (πD/α)·√(2(E−G)/(2G+E))
    (Shigley eq. 10-12) specializes to the textbook's 2.63·D/α using the
    steel moduli Shigley uses (E = 30 Msi, G = 11.5 Msi)."""
    expr = sp.pi * sp.sqrt(2 * (E - G) / (2 * G + E))
    steel = float(expr.subs({E: 30e6, G: 11.5e6}))
    assert abs(steel - 2.63) < 0.01  # exact value 2.6249; Shigley prints 2.63
    # and the bound is real for every physical material: with E = 2G(1+ν),
    # E − G = G(1 + 2ν) is a sum of positives, so the sqrt argument is positive
    nu = sp.symbols("nu", positive=True)
    assert sp.expand(2 * G * (1 + nu) - G).is_positive


def test_rate_is_stiffness_margin_is_strength():
    """The torsion-shaft lesson, wound into a coil: ∂k/∂σ_y = 0 and ∂k/∂G > 0,
    while the margin moves with σ_y and never with G."""
    sigma_y, rho = sp.symbols("sigma_y rho", positive=True)
    k = G * d**4 / (8 * D**3 * N)
    tau = _wahl(D / d) * 8 * F * D / (sp.pi * d**3)
    SF = (sigma_y / 2) / tau
    assert sp.diff(k, sigma_y) == 0 and sp.diff(SF, G) == 0
    assert sp.simplify(sp.diff(k, G) - d**4 / (8 * D**3 * N)) == 0
    assert sp.diff(SF, sigma_y) != 0 and sp.diff(tau, G) == 0 and sp.diff(tau, sigma_y) == 0


def test_numeric_golden():
    """Hand-checkable: d = 4 mm, D = 32 mm (C = 8), N_a = 8, F = 100 N,
    L_0 = 80 mm, AISI 1045 normalized (G = 80 GPa, E = 200 GPa,
    σ_y = 410 MPa, ρ = 7870 kg/m³):
      k  = 80e9·(0.004)⁴/(8·(0.032)³·8) = 9765.625 N/m  (9.766 N/mm)
      δ  = 100/9765.625 = 10.24 mm
      K_W = 31/28 + 0.615/8 = 1.18402
      τ  = K_W·8·100·0.032/(π·0.004³) = 150.75 MPa
      SF = 205/150.75 = 1.3598      L_s = 4·10 = 40 mm
      m  = 7870·π²·0.004²·0.032·10/4 = 99.4 g
      buckling limit = 2π·0.032·√(240/360) = 164.1 mm > L_0 → stable
      wind-to-rate round trip: k = 9765.625 → N_a = 8."""
    d_, D_, Na, F_, L0 = 0.004, 0.032, 8.0, 100.0, 0.08
    G_, E_, sy, rho = 80.0e9, 200.0e9, 410.0e6, 7870.0
    k = G_ * d_**4 / (8 * D_**3 * Na)
    assert abs(k - 9765.625) < 1e-6
    delta = F_ / k
    assert abs(delta - 0.01024) / 0.01024 < 1e-9
    c = D_ / d_
    K_w = (4 * c - 1) / (4 * c - 4) + 0.615 / c
    assert abs(K_w - 1.1840179) < 1e-6
    tau = K_w * 8 * F_ * D_ / (math.pi * d_**3)
    assert abs(tau - 150.754e6) / 150.754e6 < 1e-4
    assert abs(sy / 2 / tau - 1.3598) < 1e-3
    L_s = d_ * (Na + 2)
    assert abs(L_s - 0.040) < 1e-12
    assert L0 - delta > L_s  # not coil-bound at the default state
    m_w = rho * math.pi**2 * d_**2 * D_ * (Na + 2) / 4
    assert abs(m_w - 0.09942) / 0.09942 < 1e-3
    limit = 2 * math.pi * D_ * math.sqrt(2 * (E_ - G_) / (2 * G_ + E_))
    assert abs(limit - 0.16415) / 0.16415 < 1e-3 and L0 < limit
    # wind-to-rate: the other configuration's closed form, round-tripped
    assert abs(G_ * d_**4 / (8 * D_**3 * k) - Na) < 1e-9
