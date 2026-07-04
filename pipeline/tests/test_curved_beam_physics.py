"""First-principles cross-check for curved-beam (CLAUDE.md invariant 5).

This RE-DERIVES the Winkler curved-beam bending stress from the two equilibrium
conditions on the section — it does NOT import thing.yaml's residuals. The model:

  Plane sections stay plane and rotate about a neutral axis at radius r_n. A fiber
  at radius r then carries stress proportional to (r_n - r)/r (NOT linear in r,
  because fibers of different radius started at different arc lengths):

      σ(r) = κ (r_n - r) / r           (κ constant, set by the moment)

Two statics conditions on a pure-bending section fix r_n and κ for the rectangle
(width b, dA = b dr, r from r_i to r_o):

  1. No net axial force:  ∫ σ dA = 0  ⇒  r_n = A / ∫(dA/r) = h / ln(r_o/r_i).
  2. Moment about the centroid:  ∫ σ (r_n - r) dA = M  ⇒  κ = M/(A e),  e = r_c - r_n.

Substituting gives σ(r) = M(r_n - r)/(A e r); the inner fiber (r = r_i) peaks at
σ_i = M c_i/(A e r_i) with c_i = r_n - r_i. The crane hook adds a direct tension
P/A with M = P r_c (load through the center of curvature O). Two theorems then
fall out and are asserted here:
  A. The straight-beam limit: as r_c/h → ∞, σ_i → the ordinary Mc/I, PROVEN by
     series expansion (K_i = 1 + (h/r_c)/3 + O((h/r_c)²)).
  B. Roark oracle: the closed form equals the raw integral evaluation, numerically.

Golden (hand-checkable, arithmetic on the formulas; rectangular section):
  r_i = 50 mm, r_o = 100 mm, b = 20 mm, pure moment M = 1 kN·m:
    h = 50 mm, r_c = 75 mm, A = 1000 mm², I = bh³/12 = 2.08333e-7 m⁴
    r_n = h/ln(r_o/r_i) = 50/ln 2 = 72.13475 mm ; e = r_c - r_n = 2.86525 mm
    c_i = 22.13475 mm ; c_o = 27.86525 mm
    σ_i = M c_i/(A e r_i) = 154.505 MPa   (inner, tension)
    σ_o = -M c_o/(A e r_o) = -97.253 MPa  (outer, compression)
    σ_str = Mc/I = 6M/(bh²) = 120.0 MPa   (straight-beam Mc/I)
    K_i = σ_i/σ_str = 1.28754
Consistent with Shigley §3-18 / Roark Ch. 9 (the rectangular r_n = h/ln(r_o/r_i)
and σ = M y/(A e (r_n - y)) are exact analytic facts, uncopyrightable).
"""

import math
from pathlib import Path

import sympy as sp
import yaml

THING = (
    Path(__file__).resolve().parents[1].parent
    / "site" / "src" / "content" / "things" / "curved-beam"
)


# ---------------------------------------------------------------------------
# 1. r_n and σ(r) re-derived symbolically from the two equilibrium conditions
# ---------------------------------------------------------------------------

def test_neutral_axis_from_zero_axial_force():
    """∫ σ dA = 0 over the rectangle forces r_n = h/ln(r_o/r_i). This is the
    curved-beam analogue of 'the neutral axis passes through the centroid' — but
    for a curved bar it does NOT: r_n < r_c always."""
    r, r_i, r_o, b, r_n = sp.symbols("r r_i r_o b r_n", positive=True)
    kappa = sp.symbols("kappa", positive=True)
    sigma = kappa * (r_n - r) / r
    axial = sp.integrate(sigma * b, (r, r_i, r_o))       # net axial force
    r_n_sol = sp.solve(sp.Eq(axial, 0), r_n)[0]
    h = r_o - r_i
    assert sp.simplify(r_n_sol - h / sp.log(r_o / r_i)) == 0


def test_stress_constant_from_moment_balance():
    """∫ σ (r_n - r) dA = M fixes κ = M/(A e). Substituting back gives the
    Winkler stress σ(r) = M(r_n - r)/(A e r); check the inner and outer fibers
    match the A·e·r form with c_i = r_n - r_i, c_o = r_o - r_n."""
    r, r_i, r_o, b, M = sp.symbols("r r_i r_o b M", positive=True)
    r_n = (r_o - r_i) / sp.log(r_o / r_i)
    A = b * (r_o - r_i)
    r_c = (r_i + r_o) / 2
    e = r_c - r_n
    kappa = sp.symbols("kappa", positive=True)
    sigma = kappa * (r_n - r) / r
    moment = sp.integrate(sigma * (r_n - r) * b, (r, r_i, r_o))   # about the NA == about centroid (force-free)
    kappa_sol = sp.solve(sp.Eq(moment, M), kappa)[0]
    assert sp.simplify(kappa_sol - M / (A * e)) == 0

    sigma_fixed = sigma.subs(kappa, kappa_sol)
    c_i = r_n - r_i
    c_o = r_o - r_n
    assert sp.simplify(sigma_fixed.subs(r, r_i) - M * c_i / (A * e * r_i)) == 0
    assert sp.simplify(sigma_fixed.subs(r, r_o) - (-M * c_o / (A * e * r_o))) == 0


def test_force_free_distribution_moment_is_reference_independent():
    """Because ∫σ dA = 0, the moment of the stress is the same about ANY axis —
    so 'moment about the neutral axis' and 'moment about the centroid' are equal.
    This is why M = ∫σ(r_n - r)dA can be equated to the applied centroidal moment."""
    r, r_i, r_o, b = sp.symbols("r r_i r_o b", positive=True)
    r_n = (r_o - r_i) / sp.log(r_o / r_i)
    r_c = (r_i + r_o) / 2
    kappa = sp.symbols("kappa", positive=True)
    sigma = kappa * (r_n - r) / r
    m_about_na = sp.integrate(sigma * (r_n - r) * b, (r, r_i, r_o))
    m_about_centroid = sp.integrate(sigma * (r_c - r) * b, (r, r_i, r_o))
    assert sp.simplify(m_about_na - m_about_centroid) == 0


def test_hook_moment_arm_is_the_centroidal_radius():
    """Statics of the crane hook: a load P whose line passes through the center of
    curvature O produces, at the throat centroid, a direct force P and a moment
    M = P·r_c (arm = distance O→centroid = r_c). Inner-fiber stress superposes
    both, both tensile."""
    P, r_i, r_o, b = sp.symbols("P r_i r_o b", positive=True)
    r_n = (r_o - r_i) / sp.log(r_o / r_i)
    r_c = (r_i + r_o) / 2
    A = b * (r_o - r_i)
    e = r_c - r_n
    c_i = r_n - r_i
    M = P * r_c
    sigma_i = P / A + M * c_i / (A * e * r_i)
    # equals direct + bending, the two clearly separable pieces
    assert sp.simplify(sigma_i - (P / A + P * r_c * c_i / (A * e * r_i))) == 0


# ---------------------------------------------------------------------------
# 2. The straight-beam limit — THE punchline — proven by series expansion
# ---------------------------------------------------------------------------

def test_straight_beam_limit_by_series_expansion():
    """As r_c/h → ∞ the Winkler inner-fiber stress collapses to the ordinary
    straight-beam Mc/I. Parameterize by t = h/r_c (small) and expand: the
    curvature penalty K_i = σ_i,bending/σ_str has leading term EXACTLY 1, so the
    leading term of σ_i,bending is exactly σ_str, with the first correction
    +t/3 = h/(3 r_c). The named trap: r_c, h must be declared positive or the log
    will not expand.  (This is the machine proof the overview cites.)"""
    r_c, h, t = sp.symbols("r_c h t", positive=True)
    r_i = r_c - h / 2
    r_o = r_c + h / 2
    b, M = sp.symbols("b M", positive=True)
    r_n = (r_o - r_i) / sp.log(r_o / r_i)
    A = b * (r_o - r_i)
    e = r_c - r_n
    c_i = r_n - r_i
    I = b * (r_o - r_i) ** 3 / 12
    sigma_bi = M * c_i / (A * e * r_i)
    sigma_str = M * (h / 2) / I
    K_i = sp.simplify(sigma_bi / sigma_str)
    K_t = K_i.subs(h, t * r_c)                    # in t only (r_c, b, M cancel)

    # leading term is exactly the straight-beam value (K -> 1)
    assert sp.limit(K_t, t, 0, "+") == 1
    # and the whole penalty tends to 1, i.e. σ_i,bending -> σ_str (remainder O(t))
    assert sp.limit(sp.simplify(sigma_bi / sigma_str), h, 0, "+") == 1
    # first correction is +t/3 (remainder O(h/r_c)); series constant term == 1
    series = sp.series(K_t, t, 0, 2).removeO()
    assert series.coeff(t, 0) == 1
    assert sp.simplify(series.coeff(t, 1) - sp.Rational(1, 3)) == 0
    # small-curvature eccentricity e -> I/(A r_c) (the classic e ≈ h²/(12 r_c))
    e_t = e.subs(h, t * r_c)
    approx = (I / (A * r_c)).subs(h, t * r_c)
    assert sp.limit(sp.simplify(e_t / approx), t, 0, "+") == 1


# ---------------------------------------------------------------------------
# 3. Roark oracle: closed form == raw integral evaluation, numerically
# ---------------------------------------------------------------------------

def _winkler_numeric(r_i, r_o, b, M):
    """Evaluate the inner/outer bending stress the raw way: locate r_n by the
    integral ∫dA/r, set κ by the moment integral, read σ at the fibers. This is
    an INDEPENDENT path from the A·e·r closed form (no e, no c_i formulas)."""
    import mpmath as mp
    mp.mp.dps = 40
    r_i, r_o, b, M = map(mp.mpf, (r_i, r_o, b, M))
    A = b * (r_o - r_i)
    inv_r_integral = b * mp.log(r_o / r_i)          # ∫ dA/r
    r_n = A / inv_r_integral
    # κ from ∫ κ(r_n - r)/r · (r_n - r) b dr = M
    integrand = lambda r: (r_n - r) ** 2 / r * b
    denom = mp.quad(integrand, [r_i, r_o])
    kappa = M / denom
    sigma = lambda r: kappa * (r_n - r) / r
    return float(sigma(r_i)), float(sigma(r_o)), float(r_n)


def test_roark_oracle_closed_form_matches_raw_integral():
    r_i, r_o, b, M = 0.05, 0.10, 0.02, 1000.0
    si_num, so_num, rn_num = _winkler_numeric(r_i, r_o, b, M)
    h = r_o - r_i
    r_c = (r_i + r_o) / 2
    A = b * h
    r_n = h / math.log(r_o / r_i)
    e = r_c - r_n
    c_i = r_n - r_i
    c_o = r_o - r_n
    si_cf = M * c_i / (A * e * r_i)
    so_cf = -M * c_o / (A * e * r_o)
    assert math.isclose(rn_num, r_n, rel_tol=1e-12)
    assert math.isclose(si_num, si_cf, rel_tol=1e-10)
    assert math.isclose(so_num, so_cf, rel_tol=1e-10)


# ---------------------------------------------------------------------------
# 4. Hand-checkable numeric golden (clean pure-moment numbers)
# ---------------------------------------------------------------------------

def test_golden_rectangular_curved_beam():
    r_i, r_o, b, M = 0.05, 0.10, 0.02, 1000.0     # 50 mm, 100 mm, 20 mm, 1 kN·m
    h = r_o - r_i
    r_c = (r_i + r_o) / 2
    A = b * h
    I = b * h**3 / 12
    r_n = h / math.log(r_o / r_i)
    e = r_c - r_n
    c_i = r_n - r_i
    c_o = r_o - r_n
    sigma_i = M * c_i / (A * e * r_i)
    sigma_o = -M * c_o / (A * e * r_o)
    sigma_str = M * (h / 2) / I
    K_i = sigma_i / sigma_str
    assert math.isclose(r_n, 0.07213475, rel_tol=1e-6)      # 72.13 mm
    assert math.isclose(e, 0.00286525, rel_tol=1e-5)        # 2.865 mm (small!)
    assert math.isclose(sigma_i, 154.505e6, rel_tol=1e-4)   # 154.5 MPa (inner, hot)
    assert math.isclose(sigma_o, -97.253e6, rel_tol=1e-4)   # -97.3 MPa (outer)
    assert math.isclose(sigma_str, 120.0e6, rel_tol=1e-6)   # straight-beam 120 MPa
    assert math.isclose(K_i, 1.28754, rel_tol=1e-4)         # 29% penalty at r_c/h=1.5


def test_golden_default_crane_hook():
    """The widget defaults (a crane hook): r_i=40, r_o=100 mm, b=30 mm, P=12 kN.
    Combined direct + bending at the inner fiber, hand-checkable."""
    r_i, r_o, b, P = 0.04, 0.10, 0.03, 12000.0
    h = r_o - r_i
    r_c = (r_i + r_o) / 2
    A = b * h
    r_n = h / math.log(r_o / r_i)
    e = r_c - r_n
    c_i = r_n - r_i
    M = P * r_c
    sigma_bi = M * c_i / (A * e * r_i)
    sigma_i = P / A + sigma_bi
    assert math.isclose(M, 840.0, rel_tol=1e-9)             # 12000 · 0.07
    assert math.isclose(P / A, 6.6667e6, rel_tol=1e-4)      # direct 6.67 MPa
    assert math.isclose(sigma_bi, 65.791e6, rel_tol=1e-4)   # bending 65.8 MPa
    assert math.isclose(sigma_i, 72.458e6, rel_tol=1e-4)    # total 72.5 MPa


# ---------------------------------------------------------------------------
# 5. Drift guard: the authored thing.yaml solves for exactly these formulas
# ---------------------------------------------------------------------------

def test_authored_solutions_match_first_principles():
    raw = yaml.safe_load((THING / "thing.yaml").read_text(encoding="utf-8"))
    sol = next(c for c in raw["configurations"] if c["id"] == "hook")["solutions"]
    P, r_i, r_o, w = sp.symbols("P r_i r_o w", positive=True)
    env = {"P": P, "r_i": r_i, "r_o": r_o, "w": w}
    # evaluate the authored forward chain symbolically
    vals = {}
    for name, expr in sol.items():
        vals[name] = sp.sympify(str(expr), locals={**env, **vals})
    # r_n, e, σ_i, K_i as authored must equal the first-principles forms
    h = r_o - r_i
    r_c = (r_i + r_o) / 2
    A = w * h
    r_n = h / sp.log(r_o / r_i)
    e = r_c - r_n
    c_i = r_n - r_i
    M = P * r_c
    assert sp.simplify(vals["r_n"] - r_n) == 0
    assert sp.simplify(vals["e"] - e) == 0
    assert sp.simplify(vals["sigma_i"] - (P / A + M * c_i / (A * e * r_i))) == 0
    assert sp.simplify(vals["K_i"] - c_i * h / (6 * e * r_i)) == 0
    # and the penalty really is σ_bending/σ_straight (ties the readout to meaning)
    assert sp.simplify(vals["K_i"] - vals["sigma_bi"] / vals["sigma_str"]) == 0
