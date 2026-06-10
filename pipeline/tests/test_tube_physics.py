"""Independent physics cross-check for the thin-tube-torsion THING: evaluate
the swept-area line integral ∮ r⊥ ds = 2A (the geometric heart of Bredt's
first formula) for an ellipse and a rectangle, re-derive Bredt's second
formula by Castigliano on the shear strain energy, recover the thin-ring
polar moment as the thin limit of the solid/hollow shaft's exact J, verify
the stadium construction the sim draws (real exactly when the isoperimetric
inequality holds, circle at equality), and pin a hand golden."""

import math

import sympy as sp

T, A_m, S, t, L, G = sp.symbols("T A_m S t L G", positive=True)


def test_swept_area_integral_ellipse():
    """∮ (x dy − y dx) = 2·(enclosed area) for x = a cosφ, y = b sinφ."""
    a, b, phi = sp.symbols("a b phi", positive=True)
    x = a * sp.cos(phi)
    y = b * sp.sin(phi)
    integrand = x * sp.diff(y, phi) - y * sp.diff(x, phi)
    loop = sp.integrate(integrand, (phi, 0, 2 * sp.pi))
    assert sp.simplify(loop - 2 * sp.pi * a * b) == 0  # = 2 × area πab


def test_swept_area_integral_rectangle():
    """Same identity walked along a w × h rectangle's four sides (piecewise
    parameterization, moment point at the centroid)."""
    wd, h, s = sp.symbols("w_r h_r s", positive=True)
    # sides: right (x=w/2, y: -h/2→h/2), top (y=h/2, x: w/2→-w/2), left, bottom
    right = sp.integrate((wd / 2), (s, -h / 2, h / 2))          # ∮ x dy on the right edge
    top = sp.integrate((h / 2), (s, -wd / 2, wd / 2))           # ∮ (−y dx) leftward = +(h/2)·w
    loop = 2 * right + 2 * top
    assert sp.simplify(loop - 2 * wd * h) == 0  # = 2 × area


def test_bredt_second_by_castigliano():
    """U = τ²/(2G) over the wall volume with τ = T/(2A_m t) (uniform t):
    U = T²·S·L/(8 A_m² G t), and θ = ∂U/∂T reproduces the authored twist."""
    tau = T / (2 * A_m * t)
    U = tau**2 / (2 * G) * (S * t * L)  # stress² /2G × wall volume
    theta = sp.diff(U, T)
    assert sp.simplify(theta - T * S * L / (4 * A_m**2 * G * t)) == 0


def test_circular_thin_limit_of_exact_J():
    """Bredt's torsion constant for a circle, J = 4A_m²t/S = 2πr³t, must be
    the leading term of the exact hollow-shaft J = (π/2)((r+t/2)⁴ − (r−t/2)⁴)
    as t → 0 — the hand-off back to the solid-shaft page's world."""
    r = sp.symbols("r", positive=True)
    J_bredt = sp.simplify(4 * (sp.pi * r**2) ** 2 * t / (2 * sp.pi * r))
    assert sp.simplify(J_bredt - 2 * sp.pi * r**3 * t) == 0
    J_exact = sp.pi / 2 * ((r + t / 2) ** 4 - (r - t / 2) ** 4)
    leading = sp.series(J_exact, t, 0, 2).removeO()
    assert sp.simplify(leading - 2 * sp.pi * r**3 * t) == 0
    # and the correction is O(t³): the next term exists but is two orders down
    full = sp.expand(J_exact)
    assert sp.simplify(full - 2 * sp.pi * r**3 * t - sp.pi * r * t**3 / 2) == 0


def test_stadium_construction_matches_isoperimetric_envelope():
    """The sim's stadium: corner radius r solves πr² − Sr + A = 0, straight
    length a = (S − 2πr)/2. Real, nonnegative solutions exist exactly when
    S² ≥ 4πA; at equality the stadium IS the circle (a = 0); and the built
    shape reproduces the dialed area and perimeter identically."""
    A, r, a = sp.symbols("A r a", positive=True)
    r_sol = (S - sp.sqrt(S**2 - 4 * sp.pi * A)) / (2 * sp.pi)
    a_sol = (S - 2 * sp.pi * r_sol) / 2
    area_back = sp.pi * r_sol**2 + 2 * r_sol * a_sol
    perim_back = 2 * sp.pi * r_sol + 2 * a_sol
    assert sp.simplify(area_back - A) == 0
    assert sp.simplify(perim_back - S) == 0
    # equality case: S = 2π·R, A = π·R² → r = R, a = 0 (the circle)
    R = sp.symbols("R", positive=True)
    r_eq = sp.simplify(r_sol.subs({S: 2 * sp.pi * R, A: sp.pi * R**2}))
    assert sp.simplify(r_eq - R) == 0
    # violation case goes complex: S² < 4πA leaves a negative discriminant
    disc = (S**2 - 4 * sp.pi * A).subs({S: 1, A: 1})
    assert float(disc) < 0


def test_numeric_golden():
    """Hand-checkable at the declared defaults (T = 500 N·m, A_m = 20 cm²,
    S = 160 mm, t = 2 mm, L = 1 m, AISI-1045 G = 80 GPa, σ_y = 410 MPa,
    ρ = 7870):
      τ = 500/(2·0.002·0.002) = 62.5 MPa     θ = 500·0.16/(4·0.002²·80e9·0.002)
      = 0.03125 rad = 1.790°                 SF = 205/62.5 = 3.28
      m = 7870·0.16·0.002·1 = 2.518 kg
    Isoperimetric room: S²/4π = 20.37 cm² > 20 cm² — barely a section (the
    e2e refusal raises A_m to 25 cm²). Size-wall at SF = 2: t = 1.22 mm."""
    T_, A_, S_, t_, L_ = 500.0, 0.002, 0.16, 0.002, 1.0
    G_, sy, rho = 80.0e9, 410.0e6, 7870.0
    tau = T_ / (2 * A_ * t_)
    assert abs(tau - 62.5e6) < 1e-6
    theta = T_ * S_ * L_ / (4 * A_**2 * G_ * t_)
    assert abs(theta - 0.03125) < 1e-12
    assert abs(math.degrees(theta) - 1.7905) < 1e-3
    assert abs(sy / 2 / tau - 3.28) < 1e-9
    assert abs(rho * S_ * t_ * L_ - 2.5184) < 1e-9
    assert S_**2 / (4 * math.pi) > A_  # the default section exists
    assert S_**2 / (4 * math.pi) < 0.0025  # ...and 25 cm² does not (e2e pin)
    t_req = T_ / (2 * A_ * (sy / (2 * 2.0)))
    assert abs(t_req - 1.2195e-3) / 1.2195e-3 < 1e-3
