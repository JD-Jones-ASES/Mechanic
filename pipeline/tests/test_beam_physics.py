"""Independent physics cross-check for the cantilever beam THING (the human
review gate's machine half): re-derive the closed forms from first principles
with SymPy calculus, instead of trusting the authored solutions twice."""

import sympy as sp


def test_cantilever_tip_deflection_from_first_principles():
    P, L, E, I, x = sp.symbols("P L E I x", positive=True)
    M = P * (L - x)                       # internal moment, load at the tip
    v_dd = M / (E * I)                    # Euler-Bernoulli: E I v'' = M(x)
    v_d = sp.integrate(v_dd, x)           # v'(0) = 0 -> constant is 0
    v = sp.integrate(v_d, x)              # v(0) = 0 -> constant is 0
    delta = v.subs(x, L)
    assert sp.simplify(delta - P * L**3 / (3 * E * I)) == 0


def test_cantilever_max_bending_stress():
    P, L, b, h = sp.symbols("P L b h", positive=True)
    I = b * h**3 / 12
    sigma = (P * L) * (h / 2) / I         # sigma = M c / I at the wall
    assert sp.simplify(sigma - 6 * P * L / (b * h**2)) == 0


def test_material_cascade_directions():
    """The pillar-3 'aha': deflection rises when E falls, SF rises when yield
    rises — stiffness and strength are independent axes."""
    P, L, E, I, sigma_y, sigma = sp.symbols("P L E I sigma_y sigma", positive=True)
    delta = P * L**3 / (3 * E * I)
    assert sp.diff(delta, E) < 0          # lower modulus -> more deflection
    SF = sigma_y / sigma
    assert sp.diff(SF, sigma_y) > 0       # higher yield -> higher safety factor
    assert sp.diff(delta, sigma_y) == 0   # ...and yield does NOT affect deflection
