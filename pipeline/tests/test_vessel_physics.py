"""Independent physics cross-check for the thin-walled pressure vessel THING:
re-derive the membrane stresses from first-principles statics (integrating the
pressure over the shell, not just quoting the projected-area shortcut), check
the 2:1 hoop/longitudinal ratio, and prove the design-mode inversion."""

import sympy as sp


def test_hoop_stress_by_integrating_the_pressure():
    """Half-shell balance done the honest way: integrate the vertical component
    of p over the semicircular wall and match it against 2 sigma_h t L."""
    p, r, t, L, theta = sp.symbols("p r t L theta", positive=True)
    # vertical resultant of pressure on the half shell: ∫ p·sinθ · (r dθ · L)
    vertical = sp.integrate(p * sp.sin(theta) * r * L, (theta, 0, sp.pi))
    assert sp.simplify(vertical - 2 * p * r * L) == 0  # the projected-area shortcut
    s = sp.Symbol("s", positive=True)
    sigma_h = sp.solve(sp.Eq(2 * t * L * s, vertical), s)[0]
    assert sp.simplify(sigma_h - p * r / t) == 0


def test_longitudinal_stress_and_the_two_to_one_ratio():
    p, r, t = sp.symbols("p r t", positive=True)
    sigma_l = sp.solve(
        sp.Eq(sp.Symbol("s") * 2 * sp.pi * r * t, p * sp.pi * r**2), sp.Symbol("s")
    )[0]
    assert sp.simplify(sigma_l - p * r / (2 * t)) == 0
    sigma_h = p * r / t
    assert sp.simplify(sigma_h / sigma_l - 2) == 0  # independent of ALL dimensions


def test_design_mode_inversion():
    """The design configuration's t = SF·p·r/σ_y is the unique positive solution
    of the same undirected relations — relations have no preferred direction."""
    p, r, t, SF, sigma_y = sp.symbols("p r t SF sigma_y", positive=True)
    sigma_h = p * r / t
    t_solved = sp.solve(sp.Eq(SF * sigma_h, sigma_y), t)
    assert len(t_solved) == 1
    assert sp.simplify(t_solved[0] - SF * p * r / sigma_y) == 0


def test_material_cascade_directions_design_mode():
    """Stronger material -> thinner wall -> less mass; denser material -> more
    mass at equal strength. Strength buys thinness, density prices it."""
    p, r, SF, L, sigma_y, rho = sp.symbols("p r SF L sigma_y rho", positive=True)
    t = SF * p * r / sigma_y
    m = rho * 2 * sp.pi * r * t * L
    assert sp.diff(t, sigma_y) < 0
    assert sp.diff(m, sigma_y) < 0
    assert sp.diff(m, rho) > 0


def test_numeric_golden():
    """Hand-checkable spot value: p=2 MPa, r=0.5 m, t=10 mm -> σ_h = 100 MPa
    exactly; with σ_y = 250 MPa the safety factor is 2.5."""
    sigma_h = 2.0e6 * 0.5 / 0.01
    assert abs(sigma_h - 100.0e6) < 1e-3
    assert abs(250.0e6 / sigma_h - 2.5) < 1e-12
