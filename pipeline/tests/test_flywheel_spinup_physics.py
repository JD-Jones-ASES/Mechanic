"""Independent physics cross-check for the flywheel spin-up amendment (S25).

The THING adds one relation, t_spin = I_z·ω / T_d: the time a constant drive
torque T_d needs to bring the disk from rest up to speed ω. Here we re-derive
that time from first principles TWO independent ways — integrating the rotational
equation of motion I·dω/dt = T with `dsolve`, and evaluating the angular
impulse–momentum integral ∫T dt = ∫I dω directly — never importing thing.yaml's
residual. Then we confirm the inertia composition (t_spin moves with ρ through
I_z, the invariant-3 beat), the sign of the refusal boundary, and the hand golden.

This is the machine half of the human review gate (CLAUDE.md invariant 5); the
authored derivation cites Hibbeler, Dynamics, ch. 19 (principle of angular impulse
and momentum) as the modeling step, and this file proves that principle yields the
emitted formula.
"""

import math

import sympy as sp


def test_spinup_from_equation_of_motion_dsolve():
    """Newton–Euler for fixed-axis rotation, I·dω/dt = T with T constant.
    Integrate from rest ω(0)=0: ω(t) = (T/I)·t, so the time to reach a target
    speed ω_f is t = I·ω_f / T — the emitted relation, obtained by solving the
    ODE, not by transcription."""
    t, I, T = sp.symbols("t I T", positive=True)
    w = sp.Function("w")
    sol = sp.dsolve(sp.Eq(I * w(t).diff(t), T), w(t), ics={w(0): 0})
    assert sp.simplify(sol.rhs - T * t / I) == 0  # ω(t) = (T/I) t
    w_f = sp.Symbol("w_f", positive=True)
    t_spin = sp.solve(sp.Eq(sol.rhs, w_f), t)[0]
    assert sp.simplify(t_spin - I * w_f / T) == 0


def test_spinup_from_impulse_momentum_integral():
    """The cited principle itself (angular impulse = change in angular momentum),
    integrated directly: ∫₀ᵗ T dτ = ∫₀^ω I dω with T and I constant gives
    T·t = I·ω, hence t = I·ω / T."""
    t, tau, I, T, w, omega = sp.symbols("t tau I T w omega", positive=True)
    angular_impulse = sp.integrate(T, (tau, 0, t))  # ∫T dτ = T·t
    momentum_change = sp.integrate(I, (w, 0, omega))  # ∫I dω = I·ω
    t_spin = sp.solve(sp.Eq(angular_impulse, momentum_change), t)[0]
    assert sp.simplify(t_spin - I * omega / T) == 0


def test_spinup_inherits_the_disk_inertia_and_moves_with_material():
    """t_spin is built on the disk's OWN inertia I_z = ½mR² = ρπR⁴t/2, so it is
    material-dependent through ρ and geometry-dependent through R⁴. Re-derive the
    composition and check the monotonicities the widget's material axis shows."""
    R, t_th, rho, omega, T_d = sp.symbols("R t_th rho omega T_d", positive=True)
    m = rho * sp.pi * R**2 * t_th
    I_z = m * R**2 / 2
    t_spin = I_z * omega / T_d
    assert sp.simplify(t_spin - rho * sp.pi * R**4 * t_th * omega / (2 * T_d)) == 0
    assert sp.diff(t_spin, rho) > 0  # denser disk -> more inertia -> slower spin-up (invariant 3)
    assert sp.diff(t_spin, T_d) < 0  # more drive torque -> faster
    assert sp.diff(t_spin, omega) > 0  # higher target speed -> longer
    assert sp.diff(t_spin, R) > 0  # bigger disk -> R⁴ inertia -> much slower


def test_refusal_boundary_is_physical():
    """The scoped refusal is authored at T_d > 0. That is the physical boundary:
    with no net accelerating torque (T_d ≤ 0) the disk never reaches speed, and
    the closed form returns a non-positive, unphysical time. Confirm the sign of
    t_spin flips exactly at T_d = 0 (I_z, ω > 0 always)."""
    I_z, omega = 0.156, 300.0
    assert I_z * omega / 50.0 > 0
    assert I_z * omega / 1.0 > 0
    assert I_z * omega / -1.0 < 0
    assert I_z * omega / -50.0 < 0


def test_numeric_golden_spinup():
    """Hand-checkable. Generic steel disk on the widget's on-disk defaults
    (R = 0.15 m, t = 25 mm, ω = 300 rad/s, ρ = 7850 kg/m³):
        m   = 7850·π·0.15²·0.025            = 13.872 kg
        I_z = ½·13.872·0.15²                 = 0.15606 kg·m²
        t   = I_z·ω / T_d = 0.15606·300/50   = 0.93637 s   (widget default T_d = 50 N·m)
    and the chain-builder headline (flywheel material steel-1045, ρ = 7870 kg/m³,
    T_d = the planetary's delivered torque T_out = 350 N·m):
        I_z = 7870·π·0.15⁴·0.025 / 2         = 0.156459 kg·m²
        t   = 0.156459·300 / 350             = 0.13411 s
    """
    R, t_th, omega, rho = 0.15, 0.025, 300.0, 7850.0
    m = rho * math.pi * R**2 * t_th
    I_z = m * R**2 / 2
    assert abs(I_z - 0.15606) / 0.15606 < 1e-3
    t_default = I_z * omega / 50.0
    assert abs(t_default - 0.93637) / 0.93637 < 1e-3

    I_head = 7870.0 * math.pi * R**4 * t_th / 2  # ρπR⁴t/2, steel-1045
    assert abs(I_head - 0.156459) / 0.156459 < 1e-3
    t_head = I_head * omega / 350.0
    assert abs(t_head - 0.13411) / 0.13411 < 1e-3
