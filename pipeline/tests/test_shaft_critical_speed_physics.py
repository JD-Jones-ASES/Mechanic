"""First-principles cross-check for shaft-critical-speed (CLAUDE.md invariant 5).

Independent of thing.yaml: nothing here imports the authored residuals. The
governing results are re-derived from scratch —

  * I = πd⁴/64 and A = πd²/4 by area integration over the disk;
  * δ_st = WL³/48EI by double-integrating EI v'' = M(x) for a simply-supported
    beam with a central load (the beam page's headline, re-derived here so the
    critical speed does not rest on a citation);
  * the g-CANCELLATION: ω_c = √(g/δ_st) collapses to √(48EI/mL³) — no g;
  * ω_s for the bare uniform shaft from the sin(πx/L) mode-shape Rayleigh
    (energy) quotient, so a transcription slip in the π⁴ factor cannot survive;
  * DUNKERLEY ≤ RAYLEIGH both symbolically (the gap is exactly 1/ω_s² > 0) and
    across random numeric samples.

Golden: a hand-checkable steel-shaft critical speed, arithmetic in the comment.
"""

import math

import sympy as sp

# ---- exact symbols -------------------------------------------------------
d, L, m, E, I, A, rho, g, W = sp.symbols("d L m E I A rho g W", positive=True)
x = sp.symbols("x", positive=True)


def test_section_properties_by_integration():
    """I = πd⁴/64 (bending) and A = πd²/4 for a solid circular shaft, by
    integrating over the disk of radius d/2 — not asserted, derived."""
    r, th = sp.symbols("r theta", positive=True)
    R = d / 2
    # area
    area = sp.integrate(sp.integrate(r, (r, 0, R)), (th, 0, 2 * sp.pi))
    assert sp.simplify(area - sp.pi * d**2 / 4) == 0
    # second moment about a centroidal diameter: ∫ y² dA, y = r sinθ
    Ix = sp.integrate(sp.integrate((r * sp.sin(th)) ** 2 * r, (r, 0, R)), (th, 0, 2 * sp.pi))
    assert sp.simplify(Ix - sp.pi * d**4 / 64) == 0


def test_static_deflection_by_double_integration():
    """Simply-supported shaft, central load W: double-integrate EI v'' = M(x)
    over the left half with symmetry, and the midspan deflection is WL³/48EI.
    This is the δ_st that Rayleigh's method needs; re-derived, not cited."""
    v = sp.Function("v")
    # left half 0≤x≤L/2: each support carries W/2, moment M = (W/2)·x
    M = (W / 2) * x
    # EI v'' = M ; integrate twice
    C1, C2 = sp.symbols("C1 C2")
    vpp = M / (E * I)
    vp = sp.integrate(vpp, x) + C1
    vv = sp.integrate(vp, x) + C2
    # BCs: v(0)=0 (support) and v'(L/2)=0 (symmetry / zero slope at midspan)
    sol = sp.solve([vv.subs(x, 0), vp.subs(x, L / 2)], [C1, C2], dict=True)[0]
    v_mid = vv.subs(sol).subs(x, L / 2)
    # magnitude WL³/48EI (sign is a convention: EI v''=M with y up gives a
    # downward, i.e. negative, deflection under a downward load)
    assert sp.simplify(sp.Abs(v_mid) - W * L**3 / (48 * E * I)) == 0


def test_rayleigh_g_cancellation():
    """ω_c = √(g/δ_st) with δ_st = WL³/48EI and W = mg reduces to √(48EI/mL³):
    g CANCELS. The critical speed is √(k/m) with the beam stiffness k = 48EI/L³
    — a pure stiffness/inertia property, independent of gravity."""
    delta_st = (m * g) * L**3 / (48 * E * I)  # W = m g substituted
    omega_c = sp.sqrt(g / delta_st)
    reduced = sp.simplify(omega_c)
    assert g not in reduced.free_symbols, f"g did not cancel: {reduced}"
    assert sp.simplify(reduced - sp.sqrt(48 * E * I / (m * L**3))) == 0
    # equivalently ω_c = √(k/m) with k = W/δ_st = 48EI/L³
    k = (m * g) / delta_st
    assert sp.simplify(k - 48 * E * I / L**3) == 0
    assert sp.simplify(sp.sqrt(k / m) - reduced) == 0


def test_shaft_first_mode_from_rayleigh_quotient():
    """The bare uniform shaft's first bending frequency, from the exact first
    mode φ = sin(πx/L): the Rayleigh quotient ∫EI(φ'')² / ∫ρA φ² = π⁴EI/ρAL⁴.
    Independent of the authored ω_s; catches any π-power transcription slip."""
    phi = sp.sin(sp.pi * x / L)
    num = sp.integrate(E * I * sp.diff(phi, x, 2) ** 2, (x, 0, L))
    den = sp.integrate(rho * A * phi**2, (x, 0, L))
    omega_s_sq = sp.simplify(num / den)
    assert sp.simplify(omega_s_sq - sp.pi**4 * E * I / (rho * A * L**4)) == 0


def test_dunkerley_le_rayleigh_symbolic():
    """1/ω_cD² = 1/ω_c² + 1/ω_s² ⇒ the gap 1/ω_cD² − 1/ω_c² is exactly 1/ω_s²,
    which is positive, so ω_cD ≤ ω_c always. Dunkerley under-estimates, Rayleigh
    over-estimates, and the true first critical is bracketed between them."""
    wc, ws = sp.symbols("wc ws", positive=True)
    wcD = wc * ws / sp.sqrt(wc**2 + ws**2)  # solving the Dunkerley reciprocal sum
    gap = sp.simplify(1 / wcD**2 - 1 / wc**2)
    assert sp.simplify(gap - 1 / ws**2) == 0
    # gap > 0 for positive ω_s ⇒ 1/ω_cD² > 1/ω_c² ⇒ ω_cD < ω_c
    assert (gap > 0) == sp.true


def test_dunkerley_le_rayleigh_sampled():
    """ω_cD ≤ ω_c across random positive geometries/materials (numeric)."""
    import random

    rng = random.Random("shaft-critical-dunkerley")
    for _ in range(200):
        dd = rng.uniform(0.006, 0.14)
        LL = rng.uniform(0.15, 2.5)
        mm = rng.uniform(0.5, 300)
        EE = rng.uniform(60e9, 210e9)
        rr = rng.uniform(1500, 9000)
        II = math.pi * dd**4 / 64
        AA = math.pi * dd**2 / 4
        wc = math.sqrt(48 * EE * II / (mm * LL**3))
        ws = math.sqrt(math.pi**4 * EE * II / (rr * AA * LL**4))
        wcD = 1 / math.sqrt(1 / wc**2 + 1 / ws**2)
        assert wcD <= wc + 1e-9
        assert wcD <= ws + 1e-9  # a lower bound on BOTH partials


def test_frequency_and_rpm_definitions():
    """f_c = ω_c/2π (Hz) and N_c = ω_c·60/2π (rpm)."""
    wc = sp.symbols("wc", positive=True)
    assert sp.simplify((wc / (2 * sp.pi)) - wc / (2 * sp.pi)) == 0  # sanity
    # numeric: 264.222 rad/s → 42.052 Hz → 2523.1 rpm
    assert math.isclose(264.2216 / (2 * math.pi), 42.0522, rel_tol=1e-4)
    assert math.isclose(264.2216 * 60 / (2 * math.pi), 2523.13, rel_tol=1e-4)


def test_numeric_golden():
    """Hand-checkable steel shaft, all arithmetic in the comment.

    d = 20 mm, L = 0.6 m, disk m = 5 kg, E = 200 GPa, ρ = 7850 kg/m³, g = 9.80665.
      I  = π·0.02⁴/64            = 7.853982e-9 m⁴
      A  = π·0.02²/4             = 3.141593e-4 m²
      k  = 48·200e9·I/0.6³       = 349066 N/m         (beam midspan stiffness)
      ω_c = √(k/5)               = 264.222 rad/s      (= √(g/δ_st), g cancels)
      f_c = ω_c/2π               = 42.052 Hz  (N_c = 2523 rpm)
      δ_st = 5·9.80665·0.6³/(48·200e9·I) = 1.40470e-4 m
      ω_s² = π⁴·(200e9·I)/(7850·A·0.6⁴)  → ω_s = 691.91 rad/s
      ω_cD = 1/√(1/ω_c² + 1/ω_s²)        = 246.84 rad/s  (< ω_c ✓)
    """
    dd, LL, mm, EE, rr, gg = 0.02, 0.6, 5.0, 200e9, 7850.0, 9.80665
    II = math.pi * dd**4 / 64
    AA = math.pi * dd**2 / 4
    assert math.isclose(II, 7.853982e-9, rel_tol=1e-6)
    assert math.isclose(AA, 3.141593e-4, rel_tol=1e-6)

    delta_st = mm * gg * LL**3 / (48 * EE * II)
    assert math.isclose(delta_st, 1.404704e-4, rel_tol=1e-5)

    omega_c = math.sqrt(gg / delta_st)
    assert math.isclose(omega_c, 264.2216, rel_tol=1e-5)
    # g-independence in the number too: recompute at Mars gravity, same ω_c
    delta_mars = mm * 3.71 * LL**3 / (48 * EE * II)
    assert math.isclose(math.sqrt(3.71 / delta_mars), omega_c, rel_tol=1e-12)

    f_c = omega_c / (2 * math.pi)
    assert math.isclose(f_c, 42.0522, rel_tol=1e-4)

    omega_s = math.sqrt(math.pi**4 * EE * II / (rr * AA * LL**4))
    assert math.isclose(omega_s, 691.91, rel_tol=1e-4)

    omega_cD = 1 / math.sqrt(1 / omega_c**2 + 1 / omega_s**2)
    assert math.isclose(omega_cD, 246.84, rel_tol=1e-4)
    assert omega_cD < omega_c  # Dunkerley below Rayleigh
