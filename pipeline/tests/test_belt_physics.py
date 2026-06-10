"""Independent physics cross-check for the belt-drive THING: solve the capstan
ODE with dsolve (the thing.yaml derivation cites the integration — here the
CAS actually performs it, with and without the centrifugal term), re-derive
the max-power speed by calculus and confirm it is a maximum, prove the speed
ceiling annihilates the power, pin the compounding goldens quoted in the
overview prose, and check a hand golden plus the deliver-config round trip."""

import math

import sympy as sp

mu, theta = sp.symbols("mu theta", positive=True)
m, v, T1 = sp.symbols("m v T_1", positive=True)
phi = sp.symbols("phi", positive=True)
T2 = sp.symbols("T_2", positive=True)


def test_capstan_ode_with_centrifugal_term():
    """Element equilibrium on the arc: dT/dφ = μ(T − m v²), T(0) = T_2. The
    CAS integration must land exactly on the belting equation
    T(θ) − T_c = (T_2 − T_c)·e^{μθ} (Shigley eq. 17-7)."""
    T = sp.Function("T")
    sol = sp.dsolve(sp.Eq(T(phi).diff(phi), mu * (T(phi) - m * v**2)), T(phi),
                    ics={T(0): T2})
    T_at_theta = sol.rhs.subs(phi, theta)
    Tc = m * v**2
    assert sp.simplify(T_at_theta - (Tc + (T2 - Tc) * sp.exp(mu * theta))) == 0


def test_capstan_ode_pure():
    """Euler's 1762 rope-on-a-bollard case (m = 0): dT/dφ = μT integrates to
    the bare exponential T_1/T_2 = e^{μθ}."""
    T = sp.Function("T")
    sol = sp.dsolve(sp.Eq(T(phi).diff(phi), mu * T(phi)), T(phi), ics={T(0): T2})
    assert sp.simplify(sol.rhs.subs(phi, theta) - T2 * sp.exp(mu * theta)) == 0


def _power(v_sym):
    """P(v) at fixed T_1, μ, θ with T_2 eliminated through the belting equation."""
    Tc = m * v_sym**2
    T2_of_v = Tc + (T1 - Tc) * sp.exp(-mu * theta)
    return sp.simplify((T1 - T2_of_v) * v_sym)


def test_power_eliminated_form():
    """P = (T_1 − T_c)(1 − e^{−μθ})·v — the derivation's step 3."""
    P = _power(v)
    expected = (T1 - m * v**2) * (1 - sp.exp(-mu * theta)) * v
    assert sp.simplify(P - expected) == 0


def test_max_power_speed_by_calculus():
    """dP/dv = 0 has exactly one positive root, v* = √(T_1/3m); the second
    derivative there is negative (a true maximum); and at v* the centrifugal
    tension is exactly one-third of T_1 (Khurmi's condition T_c = T/3)."""
    P = _power(v)
    roots = [r for r in sp.solve(sp.Eq(sp.diff(P, v), 0), v) if r.is_positive]
    assert len(roots) == 1
    v_star = roots[0]
    assert sp.simplify(v_star - sp.sqrt(T1 / (3 * m))) == 0
    second = sp.diff(P, v, 2).subs(v, v_star)
    assert sp.simplify(second + 2 * sp.sqrt(3 * m * T1) * (1 - sp.exp(-mu * theta))) == 0
    # a true maximum, not an inflection: −2√(3mT₁)(1−e^{−μθ}) < 0 since e^{−μθ} < 1
    assert float(second.subs({m: 0.25, T1: 400, mu: 0.3, theta: math.pi})) < 0
    assert sp.simplify((m * v_star**2) - T1 / 3) == 0


def test_speed_ceiling_kills_the_power():
    """At T_c = T_1 (v = √(T_1/m)) the transmissible power is exactly zero,
    and beyond it the formula goes negative — the widget's invalid envelope."""
    P = _power(v)
    v_ceiling = sp.sqrt(T1 / m)
    assert sp.simplify(P.subs(v, v_ceiling)) == 0
    past = P.subs(v, 2 * v_ceiling)
    assert sp.simplify(past + 6 * T1 * sp.sqrt(T1 / m) * (1 - sp.exp(-mu * theta))) == 0  # = −6T₁√(T₁/m)(1−e^{−μθ}) < 0


def test_wrap_compounding_goldens():
    """The overview's compounding numbers at μ = 0.3: half a turn 2.57×, one
    turn 6.59×, two turns 43.4×, four turns ≈ 1881× — and every added radian
    multiplies by the same e^μ (that is what an exponential IS)."""
    r = lambda turns: math.exp(0.3 * 2 * math.pi * turns)
    assert abs(r(0.5) - 2.5663) < 1e-3
    assert abs(r(1) - 6.5862) < 1e-3
    assert abs(r(2) - 43.38) < 0.01
    assert abs(r(4) - 1881.5) < 1.0
    assert abs(r(2) / r(1) - r(1)) < 1e-9  # compounding: equal wraps multiply equally


def test_numeric_golden_and_deliver_round_trip():
    """Hand-checkable: T_1 = 400 N, μ = 0.3, θ = π, v = 15 m/s, m' = 0.25 kg/m:
      T_c = 0.25·225 = 56.25 N          e^{μθ} = e^{0.9425} = 2.5664
      T_2 = 56.25 + 343.75/2.5664 = 190.20 N
      P = (400 − 190.20)·15 = 3147.1 W   v* = √(400/0.75) = 23.094 m/s
    Deliver config: P = 3147.1 W at the same speed needs exactly T_1 = 400 N."""
    T1_, mu_, th_, v_, ml_ = 400.0, 0.3, math.pi, 15.0, 0.25
    Tc_ = ml_ * v_**2
    assert abs(Tc_ - 56.25) < 1e-12
    growth = math.exp(mu_ * th_)
    assert abs(growth - 2.56633) < 1e-4
    T2_ = Tc_ + (T1_ - Tc_) / growth
    assert abs(T2_ - 190.195) < 1e-2
    P_ = (T1_ - T2_) * v_
    assert abs(P_ - 3147.07) < 0.1
    v_star_ = math.sqrt(T1_ / (3 * ml_))
    assert abs(v_star_ - 23.094) < 1e-3
    assert v_ < v_star_  # the default state sits below the peak
    # deliver configuration's closed form, round-tripped
    T1_back = Tc_ + P_ / (v_ * (1 - math.exp(-mu_ * th_)))
    assert abs(T1_back - T1_) / T1_ < 1e-12
    # ceiling check: at v = 45 m/s, T_c = 506.25 N > T_1 — the e2e refusal case
    assert ml_ * 45.0**2 > T1_
