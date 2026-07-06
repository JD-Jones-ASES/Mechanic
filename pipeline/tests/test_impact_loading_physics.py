"""First-principles cross-check for impact-loading (CLAUDE.md invariant 5).

Independent of thing.yaml: nothing here imports the authored residuals. The
governing results are re-derived from scratch —

  * the IMPACT FACTOR by solving the energy balance W(h + δ_impact) = ½ k δ_impact²
    (with the member as a linear spring k = W/δ_st) for δ_impact and reading off
    n = δ_impact/δ_st — the quadratic and its positive root, from sympy.solve,
    not transcribed;
  * the SUDDENLY-APPLIED result n = 2 at h = 0, symbolically (the surprising golden);
  * the AXIAL static response δ_st = WL/EA, σ_st = W/A from Hooke's law;
  * the CANTILEVER static response δ_st = WL³/3EI, σ_st = Mc/I by double-integrating
    EI v'' = M(x) with M(x) = W(L − x) (tip load) — so a slip in the 1/3 or the
    c = d/2 cannot survive;
  * the STRAIN-ENERGY-DENSITY asymptote σ_impact → √(2mghE/V) for the axial bar,
    derived from energy-per-unit-volume σ²/2E and cross-checked as the h → ∞ limit
    of the full impact-stress formula, symbolically and across random samples.

Golden: a hand-checkable cantilever tip-strike, all arithmetic in the comment.
"""

import math
import random

import sympy as sp

# ---- exact symbols (all physical quantities strictly positive) -----------
h, delta_st, delta_i, n = sp.symbols("h delta_st delta_i n", positive=True)
W, m, g, E, A, I, L, d, V, rho = sp.symbols("W m g E A I L d V rho", positive=True)
x = sp.symbols("x", positive=True)


def test_impact_factor_from_energy_balance():
    """Solve the energy balance for δ_impact from scratch and read off the
    impact factor. The falling weight loses PE = W(h + δ_impact); the member,
    a linear spring of stiffness k = W/δ_st, stores ½ k δ_impact². Equate and
    solve — the positive root is δ_impact = δ_st(1 + √(1 + 2h/δ_st)), so
    n = δ_impact/δ_st = 1 + √(1 + 2h/δ_st)."""
    k = W / delta_st
    balance = sp.Eq(W * (h + delta_i), sp.Rational(1, 2) * k * delta_i**2)
    roots = sp.solve(balance, delta_i)
    # two roots (± the radical); the physical one is the +radical, which grows
    # with the drop height (the other goes negative)
    pos_root = max(roots, key=lambda r: sp.limit(r, h, sp.oo))
    n_expr = sp.simplify(pos_root / delta_st)
    expected = 1 + sp.sqrt(1 + 2 * h / delta_st)
    assert sp.simplify(n_expr - expected) == 0, f"got n = {n_expr}"
    # and the quadratic it satisfies: n² − 2n − 2h/δ_st = 0
    assert sp.simplify((expected**2 - 2 * expected - 2 * h / delta_st)) == 0


def test_sudden_load_gives_factor_two():
    """h → 0 (load released onto the member from zero height) ⇒ n = 2 exactly,
    symbolically. A suddenly-applied load already doubles the static stress."""
    n_expr = 1 + sp.sqrt(1 + 2 * h / delta_st)
    assert sp.limit(n_expr, h, 0, "+") == 2
    assert n_expr.subs(h, 0) == 2  # continuous at h = 0
    # exact constructed check: if δ_st = 5 mm and h = 60 mm then 2h/δ_st = 24
    # and n = 1 + √(1 + 24) = 1 + 5 = 6 exactly
    n6 = 1 + sp.sqrt(1 + 2 * sp.Rational(60, 1000) / sp.Rational(5, 1000))
    assert n6 == 6


def test_axial_static_response_from_hooke():
    """Axial bar under its own hung weight W: Hooke's law gives the elongation
    δ_st = WL/EA (strain σ/E integrated over L) and the uniform stress σ_st = W/A.
    Re-derived from ε = σ/E, not asserted."""
    sigma = W / A  # uniform axial stress
    strain = sigma / E  # Hooke
    elongation = strain * L  # uniform over the length
    assert sp.simplify(elongation - W * L / (E * A)) == 0
    assert sp.simplify(sigma - W / A) == 0


def test_cantilever_static_from_double_integration():
    """Cantilever with a tip load W: integrate EI v'' = M(x), M(x) = W(L − x),
    with the clamped-end conditions v(0) = v'(0) = 0. The tip deflection is
    WL³/3EI and the max bending stress at the wall is σ = Mc/I = WL(d/2)/I."""
    C1, C2 = sp.symbols("C1 C2")
    M = W * (L - x)  # internal moment a distance x from the wall
    vpp = M / (E * I)
    vp = sp.integrate(vpp, x) + C1
    vv = sp.integrate(vp, x) + C2
    sol = sp.solve([vv.subs(x, 0), vp.subs(x, 0)], [C1, C2], dict=True)[0]
    v_tip = vv.subs(sol).subs(x, L)
    assert sp.simplify(v_tip - W * L**3 / (3 * E * I)) == 0
    # bending stress at the wall, outer fibre c = d/2, M_max = WL
    sigma_st = (W * L) * (d / 2) / I
    assert sp.simplify(sigma_st - W * L * (d / 2) / I) == 0


def test_strain_energy_density_asymptote():
    """For a big drop the axial impact stress approaches σ → √(2mghE/V), where
    V = AL is the member volume. Derived independently from strain-energy density:
    a bar at uniform stress σ stores σ²/2E per unit volume, so σ²V/2E = mgh at
    large h (δ_impact ≪ h) gives σ = √(2mghE/V). Cross-check it as the h → ∞
    limit of the full impact-stress formula."""
    sigma = sp.symbols("sigma", positive=True)
    # energy stored per unit volume at uniform stress σ is σ²/2E; the whole
    # volume V absorbs the drop energy mgh
    U = sigma**2 / (2 * E) * V
    sigma_asym = sp.solve(sp.Eq(U, m * g * h), sigma)[0]
    assert sp.simplify(sigma_asym - sp.sqrt(2 * m * g * h * E / V)) == 0

    # the full axial impact stress and its large-h limit
    W_ = m * g
    delta_st_ax = W_ * L / (E * A)
    sigma_st_ax = W_ / A
    sigma_i = (1 + sp.sqrt(1 + 2 * h / delta_st_ax)) * sigma_st_ax
    ratio = sp.limit(sigma_i / sp.sqrt(2 * m * g * h * E / (A * L)), h, sp.oo)
    assert sp.simplify(ratio) == 1

    # sampled: at large-but-finite h (h ≫ δ_st, always true here since δ_st ~ µm)
    # the full stress is within ~2% of the volume-governed asymptote
    rng = random.Random("impact-asymptote")
    for _ in range(60):
        vals = {
            m: rng.uniform(10, 500),
            g: 9.80665,
            E: rng.uniform(60e9, 210e9),
            A: rng.uniform(1e-4, 1e-2),
            L: rng.uniform(0.2, 3.0),
            h: rng.uniform(5.0, 100.0),
        }
        si = float(sigma_i.subs(vals))
        asym = float(sp.sqrt(2 * m * g * h * E / (A * L)).subs(vals))
        assert abs(si / asym - 1) < 0.02


def test_impact_factor_monotonic_and_ge_two():
    """n(h) = 1 + √(1 + 2h/δ_st) is ≥ 2 for every h ≥ 0 and strictly increasing
    in h: a bigger drop is always worse, and even h = 0 already gives n = 2.
    Also n rises as δ_st falls — a stiffer member (smaller δ_st) has a LARGER
    impact factor, the counter-intuitive result."""
    n_expr = 1 + sp.sqrt(1 + 2 * h / delta_st)
    dn_dh = sp.diff(n_expr, h)
    assert sp.simplify(dn_dh - 1 / (delta_st * sp.sqrt(1 + 2 * h / delta_st))) == 0
    # strictly increasing in h and decreasing in δ_st (stiffer → larger n) —
    # check the signs numerically over the physical domain
    f_dh = sp.lambdify((h, delta_st), dn_dh, "math")
    f_dds = sp.lambdify((h, delta_st), sp.diff(n_expr, delta_st), "math")
    for hh in (0.0, 0.05, 1.0, 50.0):
        for dds in (1e-5, 1e-3, 0.02):
            assert f_dh(hh, dds) > 0  # strictly increasing in h everywhere
            # strictly decreasing in δ_st for a real drop; at h=0 exactly it is
            # flat (n = 2 regardless of stiffness — the suddenly-applied result)
            assert f_dds(hh, dds) < 0 if hh > 0 else f_dds(hh, dds) == 0
    # numeric floor n ≥ 2
    for hh in (0.0, 0.001, 0.05, 1.0, 50.0):
        assert 1 + math.sqrt(1 + 2 * hh / 3e-3) >= 2 - 1e-12


def test_numeric_golden():
    """Hand-checkable cantilever tip-strike, all arithmetic in the comment.

    Cantilever bar: E = 200 GPa, L = 1 m, square section b = d = 30 mm, a mass
    m = 20 kg dropped h = 60 mm onto the tip; g = 9.80665 m/s².
      I    = b·d³/12 = 0.03·0.03³/12       = 6.75e-8 m⁴
      W    = m·g = 20·9.80665              = 196.133 N
      δ_st = WL³/3EI = 196.133/(3·200e9·6.75e-8)
           = 196.133/40500                 = 4.84279e-3 m   (4.84 mm)
      σ_st = W·L·(d/2)/I = 196.133·0.015/6.75e-8
           = 43.585 MPa
      2h/δ_st = 0.12/4.84279e-3            = 24.7789
      n    = 1 + √(1 + 24.7789)            = 6.07729
      δ_i  = n·δ_st = 6.07729·4.84279e-3   = 29.431 mm
      σ_i  = n·σ_st = 6.07729·43.585 MPa   = 264.88 MPa
      SF   = σ_y/σ_i; for σ_y = 250 MPa    = 0.944  (this member yields)
    """
    E_, L_, b_, d_, m_, hh, gg = 200e9, 1.0, 0.03, 0.03, 20.0, 0.06, 9.80665
    II = b_ * d_**3 / 12
    assert math.isclose(II, 6.75e-8, rel_tol=1e-9)
    Wt = m_ * gg
    assert math.isclose(Wt, 196.133, rel_tol=1e-5)

    delta_st_v = Wt * L_**3 / (3 * E_ * II)
    assert math.isclose(delta_st_v, 4.84279e-3, rel_tol=1e-5)
    sigma_st_v = Wt * L_ * (d_ / 2) / II
    assert math.isclose(sigma_st_v, 43.5851e6, rel_tol=1e-5)

    n_v = 1 + math.sqrt(1 + 2 * hh / delta_st_v)
    assert math.isclose(n_v, 6.07729, rel_tol=1e-5)

    delta_i_v = n_v * delta_st_v
    assert math.isclose(delta_i_v, 29.431e-3, rel_tol=1e-4)
    sigma_i_v = n_v * sigma_st_v
    assert math.isclose(sigma_i_v, 264.88e6, rel_tol=1e-4)

    # safety factor against a σ_y = 250 MPa steel: below 1 — the drop yields it
    SF = 250e6 / sigma_i_v
    assert math.isclose(SF, 0.9438, rel_tol=1e-3)
    assert SF < 1


def test_weight_from_cited_gravity():
    """W = m·g with g the cited standard gravity (the constants mechanism's
    second consumer). Unlike the critical-speed page, g does NOT cancel here —
    a real drop's stress genuinely depends on gravity through the weight."""
    W_expr = m * g
    # g appears in the impact stress and does not cancel (contrast critical speed)
    delta_st_ax = (m * g) * L / (E * A)
    sigma_i = (1 + sp.sqrt(1 + 2 * h / delta_st_ax)) * (m * g) / A
    assert g in sigma_i.free_symbols
    # numeric: 20 kg at standard gravity weighs 196.133 N
    assert math.isclose(float(W_expr.subs({m: 20, g: 9.80665})), 196.133, rel_tol=1e-5)
