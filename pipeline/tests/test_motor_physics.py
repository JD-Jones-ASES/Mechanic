"""Independent first-principles cross-check for dc-motor (THING 37).

Re-derives the permanent-magnet DC motor's linear torque-speed line from the
steady-state armature-circuit model. NOTHING is imported from thing.yaml —
this is an independent route to the same physics (the ADR-0007 audit surface):

    armature loop (steady state):   V = I*R_a + k*omega    (back-EMF E = k*omega)
    electromechanical coupling:     T = k*I                (k_t = k_e = k in SI)

Model per Hughes & Drury, Electric Motors and Drives, 5th ed., ch. 3
(eqs. 3.5-3.10); peak power at half no-load speed per §3.4.6 and the MIT 2.007
motor tutorial §3.1-3.2.
"""

import sympy as sp

# circuit constants are physically positive; speed/torque stay REAL so the
# braking (omega > omega_0) and over-stall (T > T_stall) regimes are visible
V, R_a, k = sp.symbols("V R_a k", positive=True)
omega = sp.symbols("omega", real=True)
T = sp.symbols("T", real=True)


def _line_from_circuit():
    """T(omega) from KVL + the coupling — the independent derivation."""
    I = (V - k * omega) / R_a  # KVL: whatever back-EMF doesn't cancel, R converts to current
    return k * I  # T = k*I


def test_line_matches_intercept_form():
    """The circuit model IS the authored line T = T_stall*(1 - omega/omega_0)
    with T_stall = k*V/R_a and omega_0 = V/k — exactly, not approximately."""
    T_circuit = _line_from_circuit()
    T_stall = k * V / R_a
    omega_0 = V / k
    authored = T_stall * (1 - omega / omega_0)
    assert sp.simplify(T_circuit - authored) == 0


def test_intercepts_are_stall_and_no_load():
    T_circuit = _line_from_circuit()
    # shaft locked: all the supply's current, none of its back-EMF
    assert sp.simplify(T_circuit.subs(omega, 0) - k * V / R_a) == 0
    # no-load: back-EMF eats the whole supply, no current left to make torque
    assert sp.simplify(T_circuit.subs(omega, V / k)) == 0


def test_peak_power_by_calculus():
    """P = T*omega peaks at omega_0/2 with P_max = T_stall*omega_0/4 —
    a genuine maximum (second derivative negative), delivering T_stall/2."""
    P = _line_from_circuit() * omega
    crit = sp.solve(sp.diff(P, omega), omega)
    omega_0 = V / k
    assert crit == [omega_0 / 2]
    assert sp.simplify(sp.diff(P, omega, 2) + 2 * k**2 / R_a) == 0  # < 0 everywhere
    P_max = P.subs(omega, omega_0 / 2)
    T_stall = k * V / R_a
    assert sp.simplify(P_max - T_stall * omega_0 / 4) == 0  # = V**2/(4*R_a)
    assert sp.simplify(_line_from_circuit().subs(omega, omega_0 / 2) - T_stall / 2) == 0


def test_peak_power_by_vertex_form():
    """The derivation's completing-the-square step, independently:
    P = P_max - (T_stall/omega_0)*(omega - omega_0/2)**2 identically."""
    T_st, w0 = sp.symbols("T_st w0", positive=True)
    w = sp.symbols("w", real=True)
    P = T_st * w * (1 - w / w0)
    vertex = T_st * w0 / 4 - (T_st / w0) * (w - w0 / 2) ** 2
    assert sp.expand(P - vertex) == 0


def test_torque_in_inversion():
    """The torque-in configuration's solved speed omega = omega_0*(1 - T/T_stall)
    is the same line read backwards: substituting it into T(omega) returns T."""
    T_st, w0 = sp.symbols("T_st w0", positive=True)
    omega_solved = w0 * (1 - T / T_st)
    line_T = T_st * (1 - omega_solved / w0)
    assert sp.simplify(line_T - T) == 0


def test_refusal_boundary_signs():
    """Over-stall demand has no motoring point: the solved speed goes negative
    exactly when T > T_stall, is zero AT stall, and positive below it —
    the sign structure the unscoped `omega >= 0` refusal relies on."""
    omega_solved = 300 * (1 - T / 200)  # omega_0=300, T_stall=200
    assert omega_solved.subs(T, 250) < 0  # over-stall: refused
    assert omega_solved.subs(T, 200) == 0  # at stall: valid boundary
    assert omega_solved.subs(T, 100) > 0  # motoring
    # and past no-load speed the delivered torque goes negative (braking warn)
    T_line = 200 * (1 - omega / 300)
    assert T_line.subs(omega, 350) < 0
    assert T_line.subs(omega, 300) == 0


def test_numeric_golden_at_declared_defaults():
    """Hand arithmetic at the THING's declared defaults
    (T_stall = 200 N*m, omega_0 = 300 rad/s, omega = 150 rad/s):

        T     = 200*(1 - 150/300)   = 100 N*m
        P     = 100*150             = 15 000 W = 15 kW
        P_max = 200*300/4           = 15 000 W  (the default point IS the peak)
        omega_p = 300/2             = 150 rad/s

    and the peak coincidence is exact: omega_default = omega_p, so P == P_max.
    """
    T_stall, omega_0, w = 200.0, 300.0, 150.0
    T_val = T_stall * (1 - w / omega_0)
    P_val = T_val * w
    P_max = T_stall * omega_0 / 4
    assert abs(T_val - 100.0) < 1e-12
    assert abs(P_val - 15000.0) < 1e-9
    assert abs(P_max - 15000.0) < 1e-9
    assert abs(omega_0 / 2 - w) < 1e-12


def test_chain_handoff_golden():
    """The headline-chain handoff, by hand: the motor's default point delivers
    T = 100 N*m at omega = 150 rad/s into the planetary's sun. Ring-fixed with
    N_s = 24, N_p = 18 gives N_r = 60 and ratio (N_s+N_r)/N_s = 3.5, so
    T_out = 350 N*m and omega_c = 150*24/84 = 42.857 rad/s — power conserved:
    100*150 = 350*(150*24/84) = 15 000 W exactly (the ideal-gearset check)."""
    T_m, w_m = 100.0, 150.0
    N_s, N_p = 24, 18
    N_r = N_s + 2 * N_p
    ratio = (N_s + N_r) / N_s
    T_out = T_m * ratio
    omega_c = w_m * N_s / (N_s + N_r)
    assert abs(T_out - 350.0) < 1e-12
    assert abs(omega_c - 150.0 * 24 / 84) < 1e-12
    assert abs(T_m * w_m - T_out * omega_c) < 1e-9  # ideal power balance
