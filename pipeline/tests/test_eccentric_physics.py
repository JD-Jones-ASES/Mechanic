"""Independent physics cross-check for the eccentric column THING: re-solve
the beam-column boundary-value problem with SymPy's own machinery (dsolve +
boundary conditions), recover the secant formula by superposition, prove the
solve1d bracket is sound (a unique root always exists in (0, P_E)), and pin
the THING's teaching point — the margin must be taken on load, because the
stress-based margin always overstates it."""

import math

import sympy as sp


def _bisect(f, lo, hi, n=200):
    for _ in range(n):
        mid = (lo + hi) / 2
        if f(lo) * f(mid) <= 0:
            hi = mid
        else:
            lo = mid
    return (lo + hi) / 2


def test_midspan_deflection_from_the_beam_column_bvp():
    """EI·v″ + P·v = −P·e with v(0) = v(L) = 0 (the forced beam-column, not an
    eigenvalue problem): dsolve + boundary conditions give the midspan bow
    δ = e·[sec(kL/2) − 1] — the THING's secant-deflection relation."""
    x, L, E, I, P, e = sp.symbols("x L E I P e", positive=True)
    v = sp.Function("v")
    ode = sp.Eq(E * I * v(x).diff(x, 2) + P * v(x), -P * e)
    sol = sp.dsolve(ode, v(x)).rhs

    constants = sorted((s for s in sol.free_symbols if str(s).startswith("C")), key=str)
    fixed = sp.solve([sp.Eq(sol.subs(x, 0), 0), sp.Eq(sol.subs(x, L), 0)], constants, dict=True)
    assert len(fixed) == 1
    vx = sp.simplify(sol.subs(fixed[0]))

    k = sp.sqrt(P / (E * I))
    delta = sp.simplify(vx.subs(x, L / 2))
    target = e * (1 / sp.cos(k * L / 2) - 1)
    assert sp.simplify(sp.trigsimp(delta - target)) == 0


def test_secant_stress_is_axial_plus_amplified_bending():
    """σ_max = P/A + M_max·c/I with M_max = P(e + δ): substituting δ from the
    BVP and writing I = A·r² collapses to the secant formula — the same
    superposition the THING's derivation step 3 has machine-verified."""
    A, r, c, e, L, E, P = sp.symbols("A r c e L E P", positive=True)
    I = A * r**2
    k = sp.sqrt(P / (E * I))
    delta = e * (1 / sp.cos(k * L / 2) - 1)
    sigma = P / A + P * (e + delta) * c / I
    u = (L / (2 * r)) * sp.sqrt(P / (E * A))
    secant = (P / A) * (1 + (e * c / r**2) / sp.cos(u))
    assert sp.simplify(sigma - secant) == 0


def test_limits_recover_the_simple_stories():
    """e → 0 recovers pure axial stress; P → 0⁺ has the stress vanish with the
    short-strut form (P/A)(1 + ec/r²); P → P_E⁻ diverges (the Euler asymptote)."""
    A, r, c, e, L, E, P = sp.symbols("A r c e L E P", positive=True)
    u = (L / (2 * r)) * sp.sqrt(P / (E * A))
    sigma = (P / A) * (1 + (e * c / r**2) / sp.cos(u))
    # e -> 0: the offset disappears and so does the amplification
    assert sp.simplify(sigma.subs(e, 0) - P / A) == 0
    # P -> 0+: sec(u) -> 1, so sigma/P -> (1 + ec/r^2)/A (the strut formula)
    ratio_limit = sp.limit(sigma / P, P, 0, "+")
    assert sp.simplify(ratio_limit - (1 + e * c / r**2) / A) == 0
    # P -> P_E: u -> pi/2 and the stress diverges
    numeric = sigma.subs({A: 1.9635e-3, r: 0.0125, c: 0.025, e: 0.005, L: 1.0, E: 200e9})
    P_E = math.pi**2 * 200e9 * (1.9635e-3 * 0.0125**2) / 1.0**2
    near = float(numeric.subs(P, 0.999999 * P_E))
    assert near > 1e11  # hundreds of GPa: the asymptote is doing its job


def test_solve1d_bracket_is_sound_unique_root_in_0_PE():
    """The secant-yield residual σ_y − σ_max(P) falls MONOTONICALLY from σ_y
    (at P → 0) to −∞ (at P → P_E): a root always exists in the THING's
    authored bracket and is unique — the certificate behind 'bracket:
    [1e-9·P_E, (1−1e-6)·P_E]'. Checked across a parameter sweep."""
    for (L, d, e, E, sy) in [
        (1.0, 0.05, 0.005, 200e9, 250e6),
        (0.2, 0.01, 1e-4, 1e9, 10e6),     # weakest corner of the declared bounds
        (4.0, 0.3, 0.05, 450e9, 2e9),     # strongest corner
        (2.0, 0.02, 0.02, 70e9, 95e6),    # aluminum-ish slender, big offset
    ]:
        A = math.pi * d * d / 4
        r = d / 4
        ecr = e * (d / 2) / r**2
        P_E = math.pi**2 * E * (A * r**2) / L**2

        def res(P):
            u = (L / (2 * r)) * math.sqrt(P / (E * A))
            return sy - (P / A) * (1 + ecr / math.cos(u))

        lo, hi = 1e-9 * P_E, (1 - 1e-6) * P_E
        assert res(lo) > 0 and res(hi) < 0  # the sign change the build proves per-sample
        # strict monotone decrease on a grid => exactly one root
        vals = [res(lo + (hi - lo) * i / 200) for i in range(201)]
        assert all(b < a for a, b in zip(vals, vals[1:]))


def test_numeric_golden_and_the_margin_gap():
    """Hand-checkable at the page defaults (P = 100 kN, L = 1 m, d = 50 mm,
    e = 5 mm, steel E = 200 GPa, σ_y = 250 MPa):
      ec/r² = 8e/d = 0.8 exactly;  P_E = 605.6 kN;
      u = 40·√(P/EA) = 0.63830 rad, sec(u) = 1.24507;
      σ_max = 50.93·(1 + 0.8·1.24507) MPa = 101.66 MPa;  δ = 1.226 mm;
      P_y = 210.55 kN  ⇒  SF_P = 2.106  <  SF_σ = 2.459.
    The 17% gap, in the unsafe direction, is THE reason margins here are
    taken on load (Shigley §4-13)."""
    P, L, d, e, E, sy = 100e3, 1.0, 0.05, 0.005, 200e9, 250e6
    A = math.pi * d * d / 4
    r = d / 4
    ecr = e * (d / 2) / r**2
    assert abs(ecr - 0.8) < 1e-12  # = 8e/d: exact by hand (modulo float rounding)
    P_E = math.pi**2 * E * (A * r**2) / L**2
    assert abs(P_E - 605.59e3) / 605.59e3 < 1e-3

    u = (L / (2 * r)) * math.sqrt(P / (E * A))
    assert abs(u - 0.63830) < 1e-4
    sigma_max = (P / A) * (1 + ecr / math.cos(u))
    assert abs(sigma_max - 101.66e6) / 101.66e6 < 1e-3
    delta = e * (1 / math.cos(u) - 1)
    assert abs(delta - 1.2258e-3) / 1.2258e-3 < 1e-3

    def res(Py):
        uu = (L / (2 * r)) * math.sqrt(Py / (E * A))
        return sy - (Py / A) * (1 + ecr / math.cos(uu))

    P_y = _bisect(res, 1e-9 * P_E, (1 - 1e-6) * P_E)
    assert abs(P_y - 210.55e3) / 210.55e3 < 1e-3

    SF_load = P_y / P
    SF_stress = sy / sigma_max
    assert abs(SF_load - 2.1055) < 1e-3
    assert abs(SF_stress - 2.4591) < 1e-3
    assert SF_stress > SF_load  # the deceptive margin always reads HIGHER


def test_stress_margin_always_overstates_the_load_margin():
    """σ_max(P)/P is strictly increasing (superlinearity), hence
    SF_σ > SF_P whenever SF_P > 1 — across a random sweep of states."""
    import random

    rng = random.Random("eccentric-margin-sweep")
    checked = 0
    while checked < 40:
        L = rng.uniform(0.2, 4.0)
        d = rng.uniform(0.01, 0.3)
        e = rng.uniform(1e-4, 0.05)
        E = rng.uniform(1e9, 450e9)
        sy = rng.uniform(10e6, 2e9)
        A = math.pi * d * d / 4
        r = d / 4
        ecr = e * (d / 2) / r**2
        P_E = math.pi**2 * E * (A * r**2) / L**2

        def res(Py):
            uu = (L / (2 * r)) * math.sqrt(Py / (E * A))
            return sy - (Py / A) * (1 + ecr / math.cos(uu))

        P_y = _bisect(res, 1e-9 * P_E, (1 - 1e-6) * P_E)
        P = rng.uniform(0.05, 0.95) * P_y  # a state with SF_P > 1
        u = (L / (2 * r)) * math.sqrt(P / (E * A))
        if u >= math.pi / 2:
            continue
        sigma_max = (P / A) * (1 + ecr / math.cos(u))
        assert sy / sigma_max > P_y / P
        checked += 1
