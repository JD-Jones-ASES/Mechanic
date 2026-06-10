"""Independent physics cross-check for the thick-walled cylinder THING: prove
the Lamé two-parameter family actually solves the axisymmetric equilibrium +
compatibility problem (the thing.yaml modeling steps cite it), solve the
boundary conditions ourselves and match the authored constants, pin the
thickness ceiling (bore shear always exceeds the pressure) and the thin-wall
hand-off limit as calculus facts."""

import sympy as sp


def _family():
    r, A, B = sp.symbols("r A B", positive=True)
    sigma_r = A - B / r**2
    sigma_t = A + B / r**2
    return r, A, B, sigma_r, sigma_t


def test_lame_family_satisfies_equilibrium():
    """Axisymmetric equilibrium with no body force: d(r·σ_r)/dr − σ_θ = 0."""
    r, A, B, sigma_r, sigma_t = _family()
    assert sp.simplify(sp.diff(r * sigma_r, r) - sigma_t) == 0


def test_lame_family_satisfies_strain_compatibility():
    """Plane-stress Hooke + u = r·ε_θ: compatibility requires ε_r = d(r·ε_θ)/dr.
    Equilibrium alone admits more fields; this is what pins the elastic one."""
    r, A, B, sigma_r, sigma_t = _family()
    E, nu = sp.symbols("E nu", positive=True)
    eps_t = (sigma_t - nu * sigma_r) / E
    eps_r = (sigma_r - nu * sigma_t) / E
    assert sp.simplify(sp.diff(r * eps_t, r) - eps_r) == 0


def test_boundary_conditions_give_the_authored_constants():
    """σ_r(r_i) = −p and σ_r(r_o) = 0 solve to A = p·r_i²/Δ, B = p·r_i²r_o²/Δ;
    the bore hoop stress follows as p(r_o²+r_i²)/Δ — the authored relation."""
    r, A, B, sigma_r, sigma_t = _family()
    p, r_i, r_o = sp.symbols("p r_i r_o", positive=True)
    sol = sp.linsolve(
        [sp.Eq(sigma_r.subs(r, r_i), -p), sp.Eq(sigma_r.subs(r, r_o), 0)], [A, B]
    )
    A_sol, B_sol = next(iter(sol))
    delta = r_o**2 - r_i**2
    assert sp.simplify(A_sol - p * r_i**2 / delta) == 0
    assert sp.simplify(B_sol - p * r_i**2 * r_o**2 / delta) == 0
    hoop_bore = sigma_t.subs(r, r_i).subs({A: A_sol, B: B_sol})
    assert sp.simplify(hoop_bore - p * (r_o**2 + r_i**2) / delta) == 0


def test_the_thickness_ceiling():
    """τ_max − p = p·r_i²/Δ > 0 for every finite wall, and τ_max → p only as
    r_o → ∞: no thickness elastically contains p ≥ σ_y/2 (Tresca)."""
    p, r_i, r_o = sp.symbols("p r_i r_o", positive=True)
    tau_max = p * r_o**2 / (r_o**2 - r_i**2)
    gap = sp.simplify(tau_max - p - p * r_i**2 / (r_o**2 - r_i**2))
    assert gap == 0
    assert sp.limit(tau_max, r_o, sp.oo) == p
    # and τ_max strictly DECREASES with wall (more metal always helps, just
    # less and less): assert the derivative's SIGN, not mere nonzero-ness.
    # With r_o = r_i + t the numerator/denominator signs are SymPy-decidable.
    t = sp.symbols("t", positive=True)
    dtau = sp.cancel(sp.diff(tau_max, r_o).subs(r_o, r_i + t))
    assert sp.expand(sp.numer(dtau)).is_negative
    assert sp.expand(sp.denom(dtau)).is_positive


def test_design_closed_form_round_trips_and_diverges():
    """r_o = r_i·√(σ_y/(σ_y − 2·SF·p)) substituted back into SF = σ_y/(2τ_max)
    is an identity, and the wall diverges exactly at p = σ_y/(2·SF)."""
    p, r_i, SF, sigma_y = sp.symbols("p r_i SF sigma_y", positive=True)
    r_o = r_i * sp.sqrt(sigma_y / (sigma_y - 2 * SF * p))
    tau_max = p * r_o**2 / (r_o**2 - r_i**2)
    assert sp.simplify(sigma_y / (2 * tau_max) - SF) == 0
    assert sp.limit(r_o, p, sigma_y / (2 * SF), "-") is sp.oo


def test_thin_wall_handoff_limit():
    """As t → 0 the bore hoop stress converges to the thin-wall pr/t — the
    pressure-vessel THING's formula is the k → 1 limit of this one."""
    p, r_i, t = sp.symbols("p r_i t", positive=True)
    r_o = r_i + t
    sigma_ti = p * (r_o**2 + r_i**2) / (r_o**2 - r_i**2)
    assert sp.limit(sigma_ti * t / (p * r_i), t, 0, "+") == 1


def test_stress_is_material_blind_but_margin_and_mass_are_not():
    """Back to the torsion-shaft pattern (the flywheel inverted it): Lamé
    stresses are geometry × pressure only; σ_y moves the margin, ρ the mass.
    r_o = r_i + t (the THING's own parameterization) so SymPy can decide signs."""
    p, r_i, t, sigma_y, rho = sp.symbols("p r_i t sigma_y rho", positive=True)
    r_o = r_i + t
    sigma_ti = p * (r_o**2 + r_i**2) / (r_o**2 - r_i**2)
    assert sp.diff(sigma_ti, sigma_y) == 0 and sp.diff(sigma_ti, rho) == 0
    SF = sigma_y * (r_o**2 - r_i**2) / (2 * p * r_o**2)
    assert sp.expand(sp.diff(SF, sigma_y)).is_positive  # (2r_i·t + t²)/(2p·r_o²)
    mu_L = rho * sp.pi * (r_o**2 - r_i**2)
    assert sp.expand(sp.diff(mu_L, rho)).is_positive and sp.diff(mu_L, sigma_y) == 0


def test_numeric_golden():
    """Hand-checkable: p = 20 MPa, r_i = 40 mm, t = 20 mm (k = 1.5, Δ = 2e-3 m²):
      σ_θ,i = 20·(3600+1600)/2000 = 52 MPa     τ_max = 20·3600/2000 = 36 MPa
      SF (σ_y = 250 MPa, Tresca) = 250/72 = 3.4722   μ_L (ρ=7850) = 49.32 kg/m
    Design at SF = 2: r_o = 40·√(250/170) = 48.507 mm.
    Rate at SF = 2: p_allow = 250·2000/(4·3600) = 34.722 MPa."""
    import math

    p, r_i, t = 20.0e6, 0.04, 0.02
    r_o = r_i + t
    delta = r_o**2 - r_i**2
    sigma_ti = p * (r_o**2 + r_i**2) / delta
    assert abs(sigma_ti - 52.0e6) / 52.0e6 < 1e-9
    tau_max = p * r_o**2 / delta
    assert abs(tau_max - 36.0e6) / 36.0e6 < 1e-9
    SF = 250.0e6 / (2 * tau_max)
    assert abs(SF - 3.47222) / 3.47222 < 1e-4
    mu_L = 7850 * math.pi * delta
    assert abs(mu_L - 49.323) / 49.323 < 1e-3
    r_o_design = 0.04 * math.sqrt(250.0 / (250.0 - 2 * 2 * 20.0))
    assert abs(r_o_design - 0.048507) / 0.048507 < 1e-4
    p_rate = 250.0e6 * delta / (2 * 2 * r_o**2)
    assert abs(p_rate - 34.722e6) / 34.722e6 < 1e-4
