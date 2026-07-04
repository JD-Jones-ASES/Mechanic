"""Independent physics cross-check for the planetary gearset THING: re-derive
the Willis equation from rolling (no-slip) constraints at the two pitch
contacts, the torque split from quasi-static equilibrium of a massless planet,
and power conservation as the algebraic consequence of the two — none of it by
importing the THING's residuals. This THING is invariant 1's 2-DOF reference
case; until this module existed its only pipeline coverage was compiler
fixtures (test_compile_e2e.py), not physics.

Sign conventions match the THING: all angular velocities positive in the same
sense; external torques T_s, T_r, T_c applied to sun, ring, carrier."""

import sympy as sp


def _pitch_radii():
    """Pitch radii proportional to tooth counts (shared module m): the meshes
    only assemble when r_r = r_s + 2 r_p, i.e. N_r = N_s + 2 N_p."""
    m, N_s, N_p = sp.symbols("m N_s N_p", positive=True)
    r_s = m * N_s / 2
    r_p = m * N_p / 2
    N_r = N_s + 2 * N_p
    r_r = m * N_r / 2
    return m, N_s, N_p, N_r, r_s, r_p, r_r


def test_willis_from_rolling_constraints():
    """No-slip at the sun-planet pitch point and at the planet-ring pitch
    point, planet center carried at radius r_s + r_p: eliminating the planet
    spin ω_p yields exactly the THING's Willis residual
    (ω_s − ω_c)·N_s + (ω_r − ω_c)·N_r = 0."""
    m, N_s, N_p, N_r, r_s, r_p, r_r = _pitch_radii()
    omega_s, omega_r, omega_c, omega_p = sp.symbols("omega_s omega_r omega_c omega_p")

    v_center = omega_c * (r_s + r_p)
    # sun-planet contact: sun surface speed = planet material point speed
    eq_sun = sp.Eq(omega_s * r_s, v_center - omega_p * r_p)
    # planet-ring contact: ring surface speed = planet material point speed
    eq_ring = sp.Eq(omega_r * r_r, v_center + omega_p * r_p)

    omega_p_solved = sp.solve(eq_sun, omega_p)[0]
    closure = eq_ring.subs(omega_p, omega_p_solved)
    # closure ⇔ Willis: their difference of sides must be a nonzero multiple
    # of the Willis residual (−m/2 here), identically in every symbol
    willis = (omega_s - omega_c) * N_s + (omega_r - omega_c) * N_r
    assert sp.simplify((closure.lhs - closure.rhs) - willis * m / 2) == 0


def test_torque_split_from_planet_statics():
    """Massless planet in quasi-static equilibrium: moment balance about the
    planet center forces equal tangential mesh forces F at both contacts;
    gear equilibria then give the THING's torque relations
    T_r = T_s·N_r/N_s and T_c = −T_s·(N_s + N_r)/N_s, and torque balance
    T_s + T_r + T_c = 0 follows."""
    m, N_s, N_p, N_r, r_s, r_p, r_r = _pitch_radii()
    F1, F2 = sp.symbols("F1 F2")

    # planet moment balance about its own center (both forces tangential,
    # opposite lever sense): F1·r_p − F2·r_p = 0
    F = sp.solve(sp.Eq(F1 * r_p, F2 * r_p), F1)[0]  # F1 = F2
    assert F == F2

    # external torques balancing the mesh reactions on each member
    T_s = F2 * r_s
    T_r = F2 * r_r
    T_c = -2 * F2 * (r_s + r_p)  # pin force 2F at the carrier radius

    assert sp.simplify(T_r - T_s * N_r / N_s) == 0
    assert sp.simplify(T_c + T_s * (N_s + N_r) / N_s) == 0
    assert sp.simplify(T_s + T_r + T_c) == 0


def test_power_balance_is_forced_by_willis_plus_statics():
    """T_s·ω_s + T_r·ω_r + T_c·ω_c collapses to (T_s/N_s)·(Willis residual):
    the power relation is not an independent physical input — it is implied by
    kinematics + statics, which is why the THING keeps 2 DOF, not 1."""
    N_s, N_r, T_s = sp.symbols("N_s N_r T_s", positive=True)
    omega_s, omega_r, omega_c = sp.symbols("omega_s omega_r omega_c")

    T_r = T_s * N_r / N_s
    T_c = -T_s * (N_s + N_r) / N_s
    power = T_s * omega_s + T_r * omega_r + T_c * omega_c
    willis = (omega_s - omega_c) * N_s + (omega_r - omega_c) * N_r
    assert sp.simplify(power - T_s / N_s * willis) == 0


def test_classic_configurations():
    """The two hand-checkable special cases every textbook quotes: carrier
    fixed → ω_r/ω_s = −N_s/N_r (a reversing reduction); ring fixed →
    ω_s/ω_c = 1 + N_r/N_s."""
    N_s, N_r = sp.symbols("N_s N_r", positive=True)
    omega_s, omega_r, omega_c = sp.symbols("omega_s omega_r omega_c")
    willis = (omega_s - omega_c) * N_s + (omega_r - omega_c) * N_r

    ratio_carrier_fixed = sp.solve(willis.subs(omega_c, 0), omega_r)[0] / omega_s
    assert sp.simplify(ratio_carrier_fixed + N_s / N_r) == 0

    omega_c_ring_fixed = sp.solve(willis.subs(omega_r, 0), omega_c)[0]
    assert sp.simplify(omega_s / omega_c_ring_fixed - (1 + N_r / N_s)) == 0


def test_numeric_golden():
    """Hand-checkable at the THING's own defaults (N_s = 24, N_p = 18,
    N_r = 24 + 2·18 = 60, T_s = 100 N·m, ring fixed, ω_s = 10 rad/s):
    T_r = 100·60/24 = 250, T_c = −100·84/24 = −350 (so T_out = 350 N·m —
    the same value the chain-demo e2e pins), ω_c = 24·10/84 = 20/7 ≈ 2.857143,
    and the power check closes exactly: 100·10 + 250·0 − 350·(20/7) = 0."""
    N_s, N_p, T_s, omega_s, omega_r = 24, 18, 100.0, 10.0, 0.0
    N_r = N_s + 2 * N_p
    assert N_r == 60

    T_r = T_s * N_r / N_s
    T_c = -T_s * (N_s + N_r) / N_s
    assert abs(T_r - 250.0) < 1e-12
    assert abs(T_c + 350.0) < 1e-12

    omega_c = (N_s * omega_s + N_r * omega_r) / (N_s + N_r)
    assert abs(omega_c - 20.0 / 7.0) < 1e-12

    power = T_s * omega_s + T_r * omega_r + T_c * omega_c
    assert abs(power) < 1e-9
