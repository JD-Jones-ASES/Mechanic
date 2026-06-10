"""Independent physics cross-check for the flywheel THING (the machine half of
the human review gate): the authored derivation cites the classical rotating-disk
plane-stress field as a modeling step — here we prove that field actually solves
the axisymmetric equilibrium + compatibility problem, re-run the inertia integral,
and pin the THING's teaching point (specific energy is a pure material index;
geometry cancels) as calculus facts."""

import sympy as sp


def _fields():
    r, R, rho, omega, nu = sp.symbols("r R rho omega nu", positive=True)
    sigma_r = (3 + nu) * rho * omega**2 * (R**2 - r**2) / 8
    sigma_t = rho * omega**2 * ((3 + nu) * R**2 - (1 + 3 * nu) * r**2) / 8
    return r, R, rho, omega, nu, sigma_r, sigma_t


def test_field_satisfies_radial_equilibrium():
    """The axisymmetric equilibrium of a spinning ring, d(r·σ_r)/dr − σ_θ
    + ρω²r² = 0 (Timoshenko's form), must hold for the authored field — this is
    the ODE the thing.yaml 'modeling step' claims is solved."""
    r, R, rho, omega, nu, sigma_r, sigma_t = _fields()
    equilibrium = sp.diff(r * sigma_r, r) - sigma_t + rho * omega**2 * r**2
    assert sp.simplify(equilibrium) == 0


def test_field_satisfies_strain_compatibility():
    """Plane-stress Hooke gives ε_θ = (σ_θ − ν σ_r)/E and ε_r = (σ_r − ν σ_θ)/E;
    with u = r·ε_θ, compatibility requires ε_r = d(r ε_θ)/dr. Equilibrium alone
    admits infinitely many fields — this is the second equation that pins the
    elastic one."""
    r, R, rho, omega, nu, sigma_r, sigma_t = _fields()
    E = sp.Symbol("E", positive=True)
    eps_t = (sigma_t - nu * sigma_r) / E
    eps_r = (sigma_r - nu * sigma_t) / E
    compatibility = sp.diff(r * eps_t, r) - eps_r
    assert sp.simplify(compatibility) == 0


def test_boundary_conditions_and_centre_peak():
    """σ_r(R) = 0 (free rim); both components equal and maximal at the centre,
    where they reach (3+ν)ρω²R²/8; σ_θ ≥ σ_r everywhere in 0 ≤ r ≤ R."""
    r, R, rho, omega, nu, sigma_r, sigma_t = _fields()
    assert sp.simplify(sigma_r.subs(r, R)) == 0
    centre = (3 + nu) * rho * omega**2 * R**2 / 8
    assert sp.simplify(sigma_r.subs(r, 0) - centre) == 0
    assert sp.simplify(sigma_t.subs(r, 0) - centre) == 0
    # peak is at the centre: both components strictly decrease in r
    assert sp.simplify(sp.diff(sigma_r, r) + (3 + nu) * rho * omega**2 * r / 4) == 0
    gap = sp.simplify(sigma_t - sigma_r)  # = (1-ν)ρω²r²/4 ≥ 0 for ν < 1
    assert sp.simplify(gap - (1 - nu) * rho * omega**2 * r**2 / 4) == 0


def test_inertia_and_energy_from_first_principles():
    """I = ∫ r² dm over the uniform solid disk (polar coordinates) = mR²/2,
    and E = ½Iω² in rim-speed form is m(ωR)²/4."""
    r, phi, R, t, rho, omega = sp.symbols("r phi R t rho omega", positive=True)
    I = sp.integrate(sp.integrate(r**2 * rho * t * r, (r, 0, R)), (phi, 0, 2 * sp.pi))
    m = rho * sp.pi * R**2 * t
    assert sp.simplify(I - m * R**2 / 2) == 0
    E_k = I * omega**2 / 2
    assert sp.simplify(E_k - m * (omega * R) ** 2 / 4) == 0


def test_specific_energy_is_a_pure_material_index():
    """The THING's aha: eliminate ω between E/m and σ_max and ALL geometry
    cancels — at the yield-onset speed every disk of a material stores
    e_max = 2σ_y/((3+ν)ρ), independent of R and t. Energy per kilogram is
    bought with σ_y/ρ, not with size."""
    R, t, rho, nu, sigma_y = sp.symbols("R t rho nu sigma_y", positive=True)
    omega_y = sp.sqrt(8 * sigma_y / ((3 + nu) * rho)) / R
    e = (omega_y * R) ** 2 / 4  # E_k/m = (ωR)²/4 from the previous test
    e_max = 2 * sigma_y / ((3 + nu) * rho)
    assert sp.simplify(e - e_max) == 0
    assert sp.diff(e, R) == 0 and sp.diff(e, t) == 0  # geometry is gone
    assert sp.diff(e_max, sigma_y) > 0  # stronger -> more energy per kg
    # and the yield-onset RIM SPEED is a material constant too
    v_rim = omega_y * R
    assert sp.diff(v_rim, R) == 0


def test_stress_moves_with_the_material_here():
    """The deliberate inversion of the torsion-shaft lesson: there the stress
    ignored the material; in a flywheel density IS the load, so σ_max rises
    with ρ while the margin still belongs to σ_y."""
    R, rho, nu, omega, sigma_y = sp.symbols("R rho nu omega sigma_y", positive=True)
    sigma_max = (3 + nu) * rho * omega**2 * R**2 / 8
    assert sp.diff(sigma_max, rho) > 0  # denser -> more self-load
    assert sp.diff(sigma_max, sigma_y) == 0  # strength never moves the stress
    SF = sigma_y / sigma_max
    assert sp.diff(SF, sigma_y) > 0


def test_numeric_golden():
    """Hand-checkable: R = 0.15 m, t = 25 mm, ω = 300 rad/s, generic steel
    (ρ = 7850, ν = 0.29, σ_y = 250 MPa):
      m = 7850·π·0.15²·0.025 = 13.87 kg     I = ½·13.87·0.15² = 0.1561 kg·m²
      E = ½·0.1561·300² = 7023 J            e = E/m = R²ω²/4 = 506.25 J/kg exactly
      σ_max = (3.29/8)·7850·300²·0.15² = 6.537 MPa   SF = 38.24
      ω_y = √(8·250e6/(3.29·7850))/0.15 = 1855.2 rad/s (rim speed 278.3 m/s)"""
    import math

    R, t, omega = 0.15, 0.025, 300.0
    rho, nu, sigma_y = 7850.0, 0.29, 250.0e6
    m = rho * math.pi * R**2 * t
    assert abs(m - 13.87) / 13.87 < 1e-3
    I = m * R**2 / 2
    assert abs(I - 0.15606) / 0.15606 < 1e-3
    E_k = I * omega**2 / 2
    assert abs(E_k - 7022.6) / 7022.6 < 1e-3
    e = E_k / m
    assert abs(e - R**2 * omega**2 / 4) < 1e-9  # 506.25 J/kg, material-blind
    sigma_max = (3 + nu) * rho * omega**2 * R**2 / 8
    assert abs(sigma_max - 6.5373e6) / 6.5373e6 < 1e-3
    SF = sigma_y / sigma_max
    assert abs(SF - 38.242) / 38.242 < 1e-3
    omega_y = math.sqrt(8 * sigma_y / ((3 + nu) * rho)) / R
    assert abs(omega_y - 1855.2) / 1855.2 < 1e-3
    assert abs(omega_y * R - 278.28) / 278.28 < 1e-3
