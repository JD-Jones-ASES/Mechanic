"""Independent physics cross-check for the power-screw THING: re-derive the
raise/lower torques from two-equation block equilibrium with the normal force
kept explicit (the thing.yaml derivation eliminates N in one authored line —
here linsolve does the elimination), prove the self-locking boundary and the
efficiency identities, pin the f → 0 ideal-machine limit, prove a self-locking
square thread is always under 50 % efficient, and check a hand golden."""

import math

import sympy as sp

F, f, d_m, l = sp.symbols("F f d_m l", positive=True)
lam = sp.symbols("lam", positive=True)
N, P = sp.symbols("N P", positive=True)


def _raise_push():
    """Raising: ΣF_x = P − N sinλ − fN cosλ = 0, ΣF_y = −F − fN sinλ + N cosλ = 0
    (Shigley §8-2 free body (a)). Solve BOTH equations for P — no elimination
    shortcuts."""
    eqs = [sp.Eq(P - N * sp.sin(lam) - f * N * sp.cos(lam), 0),
           sp.Eq(-F - f * N * sp.sin(lam) + N * sp.cos(lam), 0)]
    sol = sp.solve(eqs, [P, N], dict=True)[0]
    return sp.simplify(sol[P])


def _lower_push():
    """Lowering: ΣF_x = −P − N sinλ + fN cosλ = 0, ΣF_y = −F + fN sinλ + N cosλ = 0
    (free body (b))."""
    eqs = [sp.Eq(-P - N * sp.sin(lam) + f * N * sp.cos(lam), 0),
           sp.Eq(-F + f * N * sp.sin(lam) + N * sp.cos(lam), 0)]
    sol = sp.solve(eqs, [P, N], dict=True)[0]
    return sp.simplify(sol[P])


def _to_hardware(expr):
    """Replace the trig of λ by the screw geometry, tanλ = l/(πd_m)."""
    t = l / (sp.pi * d_m)
    c = 1 / sp.sqrt(1 + t**2)
    return sp.simplify(expr.subs({sp.sin(lam): t * c, sp.cos(lam): c}))


def test_raise_torque_matches_the_authored_closed_form():
    T_R = _to_hardware(_raise_push()) * d_m / 2
    authored = F * (d_m / 2) * (l + sp.pi * f * d_m) / (sp.pi * d_m - f * l)
    assert sp.simplify(T_R - authored) == 0


def test_lower_torque_matches_the_authored_closed_form():
    T_L = _to_hardware(_lower_push()) * d_m / 2
    authored = F * (d_m / 2) * (sp.pi * f * d_m - l) / (sp.pi * d_m + f * l)
    assert sp.simplify(T_L - authored) == 0


def test_self_locking_boundary():
    """T_L = 0 exactly at πf d_m = l, i.e. f = tanλ; and T_L's sign is the
    sign of (πf d_m − l) since its denominator is positive."""
    T_L = F * (d_m / 2) * (sp.pi * f * d_m - l) / (sp.pi * d_m + f * l)
    roots = sp.solve(sp.Eq(T_L, 0), f)
    assert roots == [l / (sp.pi * d_m)]
    num, den = sp.fraction(sp.together(T_L))
    assert all(arg.is_positive for arg in sp.expand(den).args)  # πd_m + fl > 0 term-by-term


def test_efficiency_identities_and_ideal_limit():
    """e = Fl/(2πT_R) equals the pure-angle form tanλ(1 − f tanλ)/(tanλ + f),
    and as f → 0 the screw becomes an ideal machine: T_R → Fl/2π, e → 1."""
    T_R = F * (d_m / 2) * (l + sp.pi * f * d_m) / (sp.pi * d_m - f * l)
    e = sp.simplify(F * l / (2 * sp.pi * T_R))
    t = sp.symbols("t", positive=True)  # t = tanλ
    e_angle = (t * (1 - f * t) / (t + f)).subs(t, l / (sp.pi * d_m))
    assert sp.simplify(e - e_angle) == 0
    assert sp.simplify(T_R.subs(f, 0) - F * l / (2 * sp.pi)) == 0
    assert sp.simplify(e.subs(f, 0)) == 1


def test_self_locking_implies_under_half_efficiency():
    """At the boundary f = tanλ, e = (1 − tan²λ)/2 < 1/2; and ∂e/∂f < 0, so a
    MORE self-locking screw is LESS efficient still — locking is purchased
    with work. Both facts proven symbolically."""
    t = sp.symbols("t", positive=True)
    e = t * (1 - f * t) / (t + f)
    at_boundary = sp.simplify(e.subs(f, t))
    assert sp.simplify(at_boundary - (1 - t**2) / 2) == 0  # < 1/2 for any real lead angle
    dedf = sp.simplify(sp.diff(e, f))
    num, den = sp.fraction(sp.together(dedf))
    assert sp.expand(-num) == sp.expand(t * (t**2 + 1))  # numerator = −t(1+t²) < 0
    assert sp.expand(den) == sp.expand((t + f) ** 2)  # denominator > 0


def test_numeric_golden():
    """Hand-checkable: F = 5 kN, d_m = 28 mm, l = 5 mm, f = 0.08:
      λ = atan(5/(28π)) = 3.2533°       πf d_m = 7.037 mm > 5 mm → self-locking
      T_R = 70·(0.005 + 0.0070372)/(0.0879646 − 0.0004) = 9.6228 N·m
      T_L = 70·(0.0070372 − 0.005)/(0.0879646 + 0.0004) = 1.6131 N·m
      e = 25/(2π·9.6228) = 0.41346
    Capacity round trip: T_R = 9.6228 N·m raises exactly F = 5 kN."""
    F_, dm_, l_, f_ = 5000.0, 0.028, 0.005, 0.08
    lam_ = math.atan(l_ / (math.pi * dm_))
    assert abs(math.degrees(lam_) - 3.2533) < 1e-3
    assert math.pi * f_ * dm_ > l_  # self-locking
    T_R = F_ * (dm_ / 2) * (l_ + math.pi * f_ * dm_) / (math.pi * dm_ - f_ * l_)
    assert abs(T_R - 9.6228) < 1e-3
    T_L = F_ * (dm_ / 2) * (math.pi * f_ * dm_ - l_) / (math.pi * dm_ + f_ * l_)
    assert abs(T_L - 1.6131) < 1e-3
    e = F_ * l_ / (2 * math.pi * T_R)
    assert abs(e - 0.41346) < 1e-4
    F_back = 2 * T_R * (math.pi * dm_ - f_ * l_) / (dm_ * (l_ + math.pi * f_ * dm_))
    assert abs(F_back - F_) / F_ < 1e-12
