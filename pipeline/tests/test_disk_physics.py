"""Independent physics cross-check for the rotating disk with a central bore:
certify the authored annulus field against the complete plane-stress problem
(equilibrium + compatibility + free-free boundary conditions — uniqueness does
the rest), re-run the inertia integral, locate the radial peak by calculus,
and pin the THING's punchlines: the vanishing hole doubles the stress exactly,
the yield-onset speed drops by exactly 1/sqrt(2), and the a -> R limit
recovers the rotating-ring formula."""

import math

import sympy as sp

r, R, a, rho, omega, nu, E = sp.symbols("r R a rho omega nu E", positive=True)

SIGMA_R = (3 + nu) * rho * omega**2 * (R**2 + a**2 - a**2 * R**2 / r**2 - r**2) / 8
SIGMA_T = rho * omega**2 * ((3 + nu) * (R**2 + a**2 + a**2 * R**2 / r**2) - (1 + 3 * nu) * r**2) / 8


def test_field_satisfies_equilibrium_compatibility_and_free_surfaces():
    """The full certificate: (a) radial equilibrium with the centrifugal body
    force, d(r·σ_r)/dr − σ_θ + ρω²r² = 0; (b) strain compatibility
    ε_r = d(r·ε_θ)/dr for the plane-stress Hooke strains; (c) σ_r = 0 at BOTH
    free surfaces. Equilibrium + compatibility + BCs has a unique solution, so
    the authored field IS the elasticity solution — no step of it is taken on
    faith."""
    equilibrium = sp.diff(r * SIGMA_R, r) - SIGMA_T + rho * omega**2 * r**2
    assert sp.simplify(equilibrium) == 0

    eps_t = (SIGMA_T - nu * SIGMA_R) / E
    eps_r = (SIGMA_R - nu * SIGMA_T) / E
    compatibility = sp.diff(r * eps_t, r) - eps_r
    assert sp.simplify(compatibility) == 0

    assert sp.simplify(SIGMA_R.subs(r, a)) == 0
    assert sp.simplify(SIGMA_R.subs(r, R)) == 0


def test_hoop_governs_everywhere_and_peaks_at_the_bore():
    """σ_θ − σ_r = ρω²[2(3+ν)a²R²/r² + 2(1−ν)r²]/8 — both terms positive, so
    the hoop direction governs at every radius; and σ_θ is strictly decreasing
    in r on the annulus, so its max sits at the bore edge with the THING's
    closed form."""
    gap = sp.simplify(SIGMA_T - SIGMA_R - rho * omega**2 * (2 * (3 + nu) * a**2 * R**2 / r**2 + 2 * (1 - nu) * r**2) / 8)
    assert gap == 0
    # dσ_θ/dr < 0: both terms of the derivative are negative for r > 0
    dT = sp.expand(sp.diff(SIGMA_T, r))
    assert sp.simplify(dT + rho * omega**2 * ((3 + nu) * a**2 * R**2 / r**3 + (1 + 3 * nu) * r) / 4) == 0
    bore_max = rho * omega**2 * ((3 + nu) * R**2 + (1 - nu) * a**2) / 4
    assert sp.simplify(SIGMA_T.subs(r, a) - bore_max) == 0


def test_radial_peak_sits_at_the_geometric_mean_radius():
    """dσ_r/dr = 0 has exactly one root between the free surfaces: r = √(aR),
    where σ_r = (3+ν)ρω²(R−a)²/8 — the THING's peak-radial relation."""
    crit = sp.solve(sp.Eq(sp.diff(SIGMA_R, r), 0), r)
    crit_pos = [c for c in crit if c.is_positive]
    assert len(crit_pos) == 1
    assert sp.simplify(crit_pos[0] - sp.sqrt(a * R)) == 0
    peak = sp.simplify(SIGMA_R.subs(r, sp.sqrt(a * R)))
    assert sp.simplify(peak - (3 + nu) * rho * omega**2 * (R - a) ** 2 / 8) == 0


def test_vanishing_hole_doubles_the_stress_exactly():
    """THE punchline: the bore-edge hoop stress over the SOLID disk's centre
    stress goes to exactly 2 as a → 0 — a discontinuity (the solid disk's own
    value is the ratio 1), explained as the equibiaxial hole concentration
    factor K = 2. And the yield-onset speed correspondingly drops by exactly
    1/√2."""
    bore_max = rho * omega**2 * ((3 + nu) * R**2 + (1 - nu) * a**2) / 4
    solid_centre = (3 + nu) * rho * omega**2 * R**2 / 8
    ratio = sp.simplify(bore_max / solid_centre)
    assert sp.simplify(sp.limit(ratio, a, 0, "+")) == 2
    assert sp.simplify(ratio - (2 + 2 * (1 - nu) * a**2 / ((3 + nu) * R**2))) == 0  # f_bore

    sigma_y = sp.symbols("sigma_y", positive=True)
    omega_solid = sp.sqrt(8 * sigma_y / ((3 + nu) * rho)) / R
    omega_bored = 2 * sp.sqrt(sigma_y / (rho * ((3 + nu) * R**2 + (1 - nu) * a**2)))
    speed_ratio = sp.simplify(sp.limit(omega_bored / omega_solid, a, 0, "+"))
    assert sp.simplify(speed_ratio - 1 / sp.sqrt(2)) == 0


def test_thin_ring_limit_recovers_the_rotating_ring_formula():
    """a → R: the annulus degenerates to a thin rotating ring, and the
    bore-edge hoop stress goes to the classical ρω²R² — Poisson's ratio drops
    out entirely, exactly as the one-dimensional ring argument predicts."""
    bore_max = rho * omega**2 * ((3 + nu) * R**2 + (1 - nu) * a**2) / 4
    assert sp.simplify(bore_max.subs(a, R) - rho * omega**2 * R**2) == 0


def test_annulus_inertia_integral():
    """I_z = ∫ r² dm over the annulus = ρtπ(R⁴ − a⁴)/2 = m(R² + a²)/2 — the
    factorization the energy story rides on."""
    t = sp.symbols("t", positive=True)
    I = sp.integrate(r**2 * rho * t * 2 * sp.pi * r, (r, a, R))
    m = rho * sp.pi * (R**2 - a**2) * t
    assert sp.simplify(I - m * (R**2 + a**2) / 2) == 0


def test_numeric_golden():
    """Hand-checkable at the page defaults (R = 150 mm, a = 30 mm, t = 25 mm,
    ω = 300 rad/s, ν = 0.29, ρ = 7850, σ_y = 250 MPa):
    m = 13.32 kg, I_z = 0.1558 kg·m², E_k = 7.01 kJ, e = 526.5 J/kg,
    σ_θ,max = 13.19 MPa, σ_r,max = 4.18 MPa, f_bore = 2.017, ω_y = 1306 rad/s.
    Continuity with the solid flywheel at the same R, t, ω: e rises from
    506.5 to 526.5 J/kg (the removed centre barely stored anything) while the
    yield-onset speed falls from 1844 to 1306 rad/s — the bore's bargain."""
    R_, a_, t_, om = 0.15, 0.03, 0.025, 300.0
    nu_, rho_, sy = 0.29, 7850.0, 250e6
    m = rho_ * math.pi * (R_**2 - a_**2) * t_
    Iz = m * (R_**2 + a_**2) / 2
    Ek = Iz * om**2 / 2
    assert abs(m - 13.317) / 13.317 < 1e-3
    assert abs(Iz - 0.15581) / 0.15581 < 1e-3
    assert abs(Ek - 7011.5) / 7011.5 < 1e-3
    assert abs(Ek / m - 526.5) / 526.5 < 1e-3
    st = rho_ * om**2 * ((3 + nu_) * R_**2 + (1 - nu_) * a_**2) / 4
    sr = (3 + nu_) * rho_ * om**2 * (R_ - a_) ** 2 / 8
    assert abs(st - 13.1875e6) / 13.1875e6 < 1e-3
    assert abs(sr - 4.1839e6) / 4.1839e6 < 1e-3
    f = 2 + 2 * (1 - nu_) * a_**2 / ((3 + nu_) * R_**2)
    assert abs(f - 2.0173) < 1e-3
    omy = 2 * math.sqrt(sy / (rho_ * ((3 + nu_) * R_**2 + (1 - nu_) * a_**2)))
    assert abs(omy - 1306.2) / 1306.2 < 1e-3
    # continuity with the solid disk at identical R, t, ω, material
    e_solid = (R_**2) * om**2 / 4
    e_bored = (R_**2 + a_**2) * om**2 / 4
    assert e_bored > e_solid
    omy_solid = math.sqrt(8 * sy / ((3 + nu_) * rho_)) / R_
    assert omy < 0.75 * omy_solid  # the ~1/sqrt(2) penalty, plus the a² term
