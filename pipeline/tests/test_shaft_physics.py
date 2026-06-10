"""Independent physics cross-check for the torsion shaft THING: re-derive the
polar moment and the torsion formula by actually integrating the stress
distribution over the section (the step the authored derivation narrates in
prose), and pin the material-blindness of the stress — the THING's teaching
point — as calculus facts."""

import sympy as sp


def test_polar_moment_from_first_principles():
    """J = ∫ r² dA over a solid circle of diameter d, in polar coordinates."""
    r, phi, d = sp.symbols("r phi d", positive=True)
    J = sp.integrate(sp.integrate(r**2 * r, (r, 0, d / 2)), (phi, 0, 2 * sp.pi))
    assert sp.simplify(J - sp.pi * d**4 / 32) == 0


def test_torsion_formula_from_the_stress_distribution():
    """With τ(r) = Gθr/L (rigid-rotation kinematics + Hooke), the resultant
    torque is T = ∫ r τ dA = GθJ/L — giving both θ = TL/GJ and τ_max = T(d/2)/J."""
    r, phi, d, G, theta, L, T = sp.symbols("r phi d G theta L T", positive=True)
    tau_at = G * theta * r / L
    torque = sp.integrate(sp.integrate(r * tau_at * r, (r, 0, d / 2)), (phi, 0, 2 * sp.pi))
    J = sp.pi * d**4 / 32
    assert sp.simplify(torque - G * theta * J / L) == 0
    theta_solved = sp.solve(sp.Eq(T, torque), theta)[0]
    assert sp.simplify(theta_solved - T * L / (G * J)) == 0
    tau_max = tau_at.subs(r, d / 2).subs(theta, theta_solved)
    assert sp.simplify(tau_max - 16 * T / (sp.pi * d**3)) == 0


def test_stress_is_material_blind_but_twist_and_margin_are_not():
    """The cascade pattern unique to this THING: τ contains NO material
    property; G drives only θ; σ_y drives only SF."""
    T, d, L, G, sigma_y = sp.symbols("T d L G sigma_y", positive=True)
    tau = 16 * T / (sp.pi * d**3)
    theta = T * L / (G * (sp.pi * d**4 / 32))
    SF = sigma_y / (2 * tau)
    assert sp.diff(tau, G) == 0 and sp.diff(tau, sigma_y) == 0
    assert sp.diff(theta, G) < 0 and sp.diff(theta, sigma_y) == 0
    assert sp.diff(SF, sigma_y) > 0 and sp.diff(SF, G) == 0


def test_power_speed_tradeoff_at_constant_power():
    """P = Tω: at fixed power, torque (and so stress) rises as speed falls —
    the gearbox lesson, asserted as a derivative."""
    P, omega, d = sp.symbols("P omega d", positive=True)
    tau = 16 * (P / omega) / (sp.pi * d**3)
    assert sp.diff(tau, omega) < 0


def test_numeric_golden():
    """Hand-checkable: T = 500 N·m, d = 40 mm -> τ = 16·500/(π·0.04³)
    = 39.789 MPa; with G = 79 GPa, L = 1 m -> θ = TL/GJ: J = π·0.04⁴/32
    = 2.51327e-7 m⁴, θ = 500/(79e9·2.51327e-7) = 0.025183 rad."""
    import math

    tau = 16 * 500 / (math.pi * 0.04**3)
    assert abs(tau - 39.789e6) / 39.789e6 < 1e-4
    J = math.pi * 0.04**4 / 32
    assert abs(J - 2.51327e-7) / 2.51327e-7 < 1e-4
    theta = 500 * 1.0 / (79e9 * J)
    assert abs(theta - 0.025183) / 0.025183 < 1e-4
