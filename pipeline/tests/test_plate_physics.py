"""First-principles cross-check for circular-plate (CLAUDE.md invariant 5).

This RE-DERIVES the uniformly loaded circular-plate results from the axisymmetric
plate equation — it does NOT import thing.yaml's residuals. The model (Kirchhoff
thin-plate theory, small deflections, axisymmetric):

  A plate of flexural rigidity D = E t^3 / (12(1-nu^2)) under a uniform pressure q
  has a transverse deflection w(r) obeying  D * lap^2 w = q,  where lap is the
  axisymmetric Laplacian  lap f = f'' + f'/r.  The general solution is

      w(r) = q r^4/(64 D) + C1 + C2 r^2 + C3 ln r + C4 r^2 ln r .

  REGULARITY at the center (finite slope w'(0) and finite curvature/moment) kills
  the two singular terms: C3 ln r makes w' ~ C3/r blow up, and C4 r^2 ln r makes
  the curvature ~ C4 ln r blow up. So C3 = C4 = 0 and only C1, C2 survive, pinned
  by the two RIM conditions:

    clamped (built-in):   w(a) = 0,  w'(a) = 0
    simply supported:     w(a) = 0,  M_r(a) = 0,  M_r = -D(w'' + nu w'/r)

  The plate bending moments per unit width are M_r = -D(w'' + nu w'/r),
  M_t = -D(nu w'' + w'/r); the surface bending stress is sigma = 6 M / t^2.

Two theorems the page is built on, asserted here:
  A. delta_ss/delta_c = (5+nu)/(1+nu) and sigma_ss/sigma_c = (3+nu)/2, both with
     nu left SYMBOLIC (the nu-cancellation-proof pattern from compound-cylinder).
  B. sigma_c = 3 q a^2/(4 t^2) is material-blind: NO E, NO nu — the clamped-edge
     stress is identical for every material (this is the whole point of the page).

Independent numeric oracle: an mpmath linear solve of the two-constant BC system
(the closed-form deltas are never written in the oracle) reproduces the closed
forms — cross-checking Roark's Formulas for Stress and Strain, Table 11.2, cases
10a (simply supported) and 10b (fixed), which state the identical formulas.

Golden (hand-checkable, arithmetic on the formulas):
  q = 100 kPa, a = 0.3 m, t = 0.01 m, steel E = 200 GPa, nu = 0.30:
    D        = E t^3/(12(1-nu^2)) = 2e5/10.92          = 18315.0 N*m
    delta_c  = q a^4/(64 D)       = 810/1172161        = 0.69103 mm
    sigma_c  = 3 q a^2/(4 t^2)    = 27000/4e-4         = 67.5 MPa   (edge, blind)
    delta_ss = (53/13) delta_c                          = 2.8173 mm
    sigma_ss = 3(3.3) q a^2/(8 t^2) = 89100/8e-4       = 111.375 MPa (center)
    delta_ss/delta_c = (5+0.3)/(1+0.3) = 53/13         = 4.07692
Timoshenko & Woinowsky-Krieger, Theory of Plates and Shells, 2nd ed. Ch.3 §16-17
(the numerical factors 1/64, 3/4, (5+nu)/(1+nu)/64, 3(3+nu)/8 are exact analytic
facts, uncopyrightable).
"""

import math
from pathlib import Path

import mpmath as mp
import sympy as sp
import yaml

THING = (
    Path(__file__).resolve().parents[1].parent
    / "site" / "src" / "content" / "things" / "circular-plate"
)

r, a, t, q, D, nu, E = sp.symbols("r a t q D nu E", positive=True)


def _lap(f):
    """Axisymmetric Laplacian lap f = f'' + f'/r."""
    return sp.diff(f, r, 2) + sp.diff(f, r) / r


def _moments(w):
    """Plate bending moments per unit width (M_r, M_t)."""
    wp, wpp = sp.diff(w, r), sp.diff(w, r, 2)
    M_r = -D * (wpp + nu * wp / r)
    M_t = -D * (nu * wpp + wp / r)
    return M_r, M_t


# ---------------------------------------------------------------------------
# 1. The governing ODE and its regular general solution
# ---------------------------------------------------------------------------

def test_general_solution_satisfies_the_plate_equation():
    """w = q r^4/(64D) + C1 + C2 r^2 + C3 ln r + C4 r^2 ln r solves D lap^2 w = q,
    and the particular term alone carries the load (lap^2 r^4 = 64)."""
    C1, C2, C3, C4 = sp.symbols("C1 C2 C3 C4")
    w = q * r**4 / (64 * D) + C1 + C2 * r**2 + C3 * sp.log(r) + C4 * r**2 * sp.log(r)
    assert sp.simplify(D * _lap(_lap(w)) - q) == 0
    # the homogeneous quartet really is homogeneous
    for hom in (sp.Integer(1), r**2, sp.log(r), r**2 * sp.log(r)):
        assert sp.simplify(_lap(_lap(hom))) == 0
    # regularity: the slope of the singular terms blows up at r->0 (=> C3=C4=0)
    assert sp.limit(sp.diff(sp.log(r), r), r, 0, "+") is sp.oo
    assert sp.limit(sp.diff(r**2 * sp.log(r), r, 2), r, 0, "+") is -sp.oo


# ---------------------------------------------------------------------------
# 2. Each rim condition, solved independently, gives the four closed forms
# ---------------------------------------------------------------------------

def _regular_solution():
    C1, C2 = sp.symbols("C1 C2")
    return q * r**4 / (64 * D) + C1 + C2 * r**2, C1, C2


def test_clamped_edge_from_the_ode():
    """Clamped: w(a)=0, w'(a)=0 -> delta_c = q a^4/(64 D), max stress at the EDGE
    sigma_c = 3 q a^2/(4 t^2) (radial moment -q a^2/8), and it is MATERIAL-BLIND."""
    w, C1, C2 = _regular_solution()
    sol = sp.solve([w.subs(r, a), sp.diff(w, r).subs(r, a)], [C1, C2], dict=True)[0]
    wc = w.subs(sol)
    delta_c = sp.simplify(wc.subs(r, 0))
    assert sp.simplify(delta_c - q * a**4 / (64 * D)) == 0

    M_r, _ = _moments(wc)
    M_edge = sp.simplify(M_r.subs(r, a))
    assert sp.simplify(M_edge + q * a**2 / 8) == 0  # -q a^2/8 at the clamp
    sigma_c = sp.simplify(6 * sp.Abs(M_edge) / t**2)
    assert sp.simplify(sigma_c - 3 * q * a**2 / (4 * t**2)) == 0
    # material-blind: sigma_c contains neither E nor nu
    assert not ({E, nu} & sigma_c.free_symbols)

    # the edge really governs: center stress 3(1+nu)qa^2/8t^2 is smaller
    M_center = sp.limit(M_r, r, 0)
    sigma_center = sp.simplify(6 * sp.Abs(M_center) / t**2)
    assert sp.simplify(sigma_center - 3 * (1 + nu) * q * a**2 / (8 * t**2)) == 0
    assert (sigma_c / sigma_center).subs(nu, sp.Rational(3, 10)) > 1


def test_simply_supported_edge_from_the_ode():
    """Simply supported: w(a)=0, M_r(a)=0 -> delta_ss = (5+nu)/(1+nu) q a^4/(64D),
    max stress at the CENTER sigma_ss = 3(3+nu) q a^2/(8 t^2). nu enters via M_r."""
    w, C1, C2 = _regular_solution()
    M_r, _ = _moments(w)
    sol = sp.solve([w.subs(r, a), M_r.subs(r, a)], [C1, C2], dict=True)[0]
    wss = w.subs(sol)
    delta_ss = sp.simplify(wss.subs(r, 0))
    assert sp.simplify(delta_ss - (5 + nu) / (1 + nu) * q * a**4 / (64 * D)) == 0

    Mr_ss, Mt_ss = _moments(wss)
    Mr0 = sp.simplify(sp.limit(Mr_ss, r, 0))
    Mt0 = sp.simplify(sp.limit(Mt_ss, r, 0))
    assert sp.simplify(Mr0 - Mt0) == 0                      # equibiaxial at center
    assert sp.simplify(Mr0 - (3 + nu) * q * a**2 / 16) == 0
    sigma_ss = sp.simplify(6 * Mr0 / t**2)
    assert sp.simplify(sigma_ss - 3 * (3 + nu) * q * a**2 / (8 * t**2)) == 0
    # and the rim moment really vanishes (the defining SS condition)
    assert sp.simplify(Mr_ss.subs(r, a)) == 0


# ---------------------------------------------------------------------------
# 3. The nu-symbolic headline factors (proven, not sampled)
# ---------------------------------------------------------------------------

def test_deflection_ratio_is_pure_poisson_nu_symbolic():
    """delta_ss/delta_c = (5+nu)/(1+nu): D, q, a all cancel, leaving only nu."""
    delta_c = q * a**4 / (64 * D)
    delta_ss = (5 + nu) / (1 + nu) * q * a**4 / (64 * D)
    ratio = sp.simplify(delta_ss / delta_c)
    assert sp.simplify(ratio - (5 + nu) / (1 + nu)) == 0
    assert ratio.free_symbols == {nu}                       # nothing but nu survives
    # ~4.077 at nu=0.3; monotonically decreasing in nu (d/dnu = -4/(1+nu)^2 < 0); ->5 as nu->0
    assert abs(float(ratio.subs(nu, sp.Rational(3, 10))) - 53 / 13) < 1e-12
    assert sp.simplify(sp.diff(ratio, nu) + 4 / (1 + nu) ** 2) == 0  # strictly decreasing
    assert sp.limit(ratio, nu, 0) == 5


def test_stress_ratio_nu_symbolic():
    """sigma_ss/sigma_c = (3+nu)/2 > 1: simply supported is hotter than clamped,
    and the excess is pure Poisson."""
    sigma_c = 3 * q * a**2 / (4 * t**2)
    sigma_ss = 3 * (3 + nu) * q * a**2 / (8 * t**2)
    ratio = sp.simplify(sigma_ss / sigma_c)
    assert sp.simplify(ratio - (3 + nu) / 2) == 0
    assert ratio.subs(nu, sp.Rational(3, 10)) == sp.Rational(33, 20)  # 1.65


# ---------------------------------------------------------------------------
# 4. Independent numeric oracle (Roark Table 11.2 cases 10a/10b)
# ---------------------------------------------------------------------------

def _plate_bvp_numeric(a_, t_, q_, nu_, E_, clamped):
    """Solve the two-constant BC system for w = q r^4/(64D) + C1 + C2 r^2 by an
    mpmath LINEAR SOLVE — the closed-form deltas/stresses are never written here.
    Returns (w(0), max surface stress). An INDEPENDENT path from the closed form."""
    mp.mp.dps = 40
    a_, t_, q_, nu_, E_ = map(mp.mpf, (a_, t_, q_, nu_, E_))
    Dn = E_ * t_**3 / (12 * (1 - nu_**2))
    # w  = q r^4/(64D) + C1 + C2 r^2 ; w' = q r^3/(16D) + 2 C2 r
    # w''= 3 q r^2/(16D) + 2 C2
    # BC1 (both): w(a)=0        -> 1*C1 + a^2*C2 = -q a^4/(64D)
    # BC2 clamped: w'(a)=0      -> 0*C1 + 2a*C2  = -q a^3/(16D)
    # BC2 SS: w''(a)+nu w'(a)/a=0-> 0*C1 + 2(1+nu)*C2 = -(3+nu) q a^2/(16D)
    row2 = mp.matrix([[0, 2 * a_]]) if clamped else mp.matrix([[0, 2 * (1 + nu_)]])
    A = mp.matrix([[1, a_**2], [row2[0, 0], row2[0, 1]]])
    rhs2 = -q_ * a_**3 / (16 * Dn) if clamped else -(3 + nu_) * q_ * a_**2 / (16 * Dn)
    b = mp.matrix([-q_ * a_**4 / (64 * Dn), rhs2])
    c = mp.lu_solve(A, b)
    C1, C2 = c[0], c[1]
    w0 = C1  # w(0)

    def Mr(rr):
        wpp = 3 * q_ * rr**2 / (16 * Dn) + 2 * C2
        wp = q_ * rr**3 / (16 * Dn) + 2 * C2 * rr
        return -Dn * (wpp + nu_ * wp / rr)

    if clamped:
        Mmax = abs(Mr(a_))                         # edge
    else:
        Mmax = abs(-Dn * (1 + nu_) * 2 * C2)       # center: -D(1+nu) w''(0), w''(0)=2C2
    return float(w0), float(6 * Mmax / t_**2)


def test_roark_oracle_matches_closed_forms():
    """Roark Table 11.2 cases 10a/10b: over several geometries and materials the
    independent BVP solve reproduces the closed-form max deflection and stress."""
    cases = [
        (0.30, 0.010, 1.0e5, 0.30, 200e9),
        (0.50, 0.020, 2.0e5, 0.33, 69e9),
        (0.15, 0.004, 5.0e4, 0.26, 90e9),
    ]
    for a_, t_, q_, nu_, E_ in cases:
        Dn = E_ * t_**3 / (12 * (1 - nu_**2))
        # clamped (10b)
        w0, sig = _plate_bvp_numeric(a_, t_, q_, nu_, E_, clamped=True)
        assert math.isclose(w0, q_ * a_**4 / (64 * Dn), rel_tol=1e-9)
        assert math.isclose(sig, 3 * q_ * a_**2 / (4 * t_**2), rel_tol=1e-9)
        # simply supported (10a)
        w0s, sigs = _plate_bvp_numeric(a_, t_, q_, nu_, E_, clamped=False)
        assert math.isclose(w0s, (5 + nu_) / (1 + nu_) * q_ * a_**4 / (64 * Dn), rel_tol=1e-9)
        assert math.isclose(sigs, 3 * (3 + nu_) * q_ * a_**2 / (8 * t_**2), rel_tol=1e-9)


# ---------------------------------------------------------------------------
# 5. Hand-checkable numeric golden + Timoshenko's tabulated factors
# ---------------------------------------------------------------------------

def test_numeric_golden():
    """Page defaults, steel: hand-checkable arithmetic on the formulas."""
    q_, a_, t_, E_, nu_ = 1.0e5, 0.30, 0.010, 200e9, 0.30
    Dn = E_ * t_**3 / (12 * (1 - nu_**2))
    delta_c = q_ * a_**4 / (64 * Dn)
    sigma_c = 3 * q_ * a_**2 / (4 * t_**2)
    delta_ss = (5 + nu_) / (1 + nu_) * q_ * a_**4 / (64 * Dn)
    sigma_ss = 3 * (3 + nu_) * q_ * a_**2 / (8 * t_**2)
    assert math.isclose(Dn, 18315.018, rel_tol=1e-6)       # N*m (the new kind)
    assert math.isclose(delta_c, 0.69103e-3, rel_tol=1e-4)  # 0.691 mm
    assert math.isclose(sigma_c, 67.5e6, rel_tol=1e-9)      # 67.5 MPa exactly
    assert math.isclose(delta_ss, 2.81728e-3, rel_tol=1e-4)  # 2.817 mm
    assert math.isclose(sigma_ss, 111.375e6, rel_tol=1e-9)  # 111.375 MPa exactly
    assert math.isclose(delta_ss / delta_c, 53 / 13, rel_tol=1e-12)  # 4.07692


def test_timoshenko_tabulated_factors():
    """The classic numerical factors (Timoshenko & Woinowsky-Krieger §16-17,
    also every plate table), read OUT OF the closed forms as w_max = alpha q a^4/D
    and sigma_max = beta q a^2/t^2: clamped alpha=1/64, beta=3/4; simply supported
    at nu=0.3 alpha=(5+nu)/(1+nu)/64, beta=3(3+nu)/8."""
    qs, as_, ts, Ds = sp.symbols("q a t D", positive=True)
    nu_ = sp.Rational(3, 10)
    # clamped factors derived from the closed forms (not asserted against themselves)
    alpha_c = sp.simplify((qs * as_**4 / (64 * Ds)) / (qs * as_**4 / Ds))
    beta_c = sp.simplify((3 * qs * as_**2 / (4 * ts**2)) / (qs * as_**2 / ts**2))
    assert alpha_c == sp.Rational(1, 64)                               # clamped deflection factor
    assert beta_c == sp.Rational(3, 4)                                 # clamped stress factor
    alpha_ss = ((5 + nu_) / (1 + nu_)) / 64
    beta_ss = 3 * (3 + nu_) / 8
    assert abs(float(alpha_ss) - 0.0637019) < 1e-6
    assert abs(float(beta_ss) - 1.2375) < 1e-9


def test_thin_plate_and_small_deflection_boundaries():
    """The two warn envelopes are reachable and correctly directional at the page
    defaults: t/a = 1/30 (thin, OK) and delta_ss = 2.82 mm < t/2 = 5 mm (OK), and
    both trip when pushed."""
    q_, a_, t_, E_, nu_ = 1.0e5, 0.30, 0.010, 200e9, 0.30
    Dn = E_ * t_**3 / (12 * (1 - nu_**2))
    delta_ss = (5 + nu_) / (1 + nu_) * q_ * a_**4 / (64 * Dn)
    assert t_ / a_ < 0.1 and delta_ss < t_ / 2                 # defaults valid
    # thicken to t=0.04 -> t/a = 0.133 (thin warn); raise q to 3e5 -> delta > t/2
    assert 0.04 / a_ > 0.1
    delta_hi = (5 + nu_) / (1 + nu_) * 3.0e5 * a_**4 / (64 * Dn)
    assert delta_hi > t_ / 2


# ---------------------------------------------------------------------------
# 6. Drift guard: the authored thing.yaml solves for exactly these formulas
# ---------------------------------------------------------------------------

def test_authored_solutions_match_first_principles():
    raw = yaml.safe_load((THING / "thing.yaml").read_text(encoding="utf-8"))
    cfg = next(c for c in raw["configurations"] if c["id"] == "uniform-pressure")
    q_s, a_s, t_s, sa_s, E_s, nu_s = sp.symbols("q a t sigma_allow E nu", positive=True)
    env = {"q": q_s, "a": a_s, "t": t_s, "sigma_allow": sa_s, "E": E_s, "nu": nu_s}
    vals = dict(env)
    for name, expr in cfg["solutions"].items():
        vals[name] = sp.sympify(str(expr), locals=vals)
    Ds = E_s * t_s**3 / (12 * (1 - nu_s**2))
    assert sp.simplify(vals["D"] - Ds) == 0
    assert sp.simplify(vals["delta_c"] - q_s * a_s**4 / (64 * Ds)) == 0
    assert sp.simplify(vals["sigma_c"] - 3 * q_s * a_s**2 / (4 * t_s**2)) == 0
    assert sp.simplify(vals["delta_ss"] - (5 + nu_s) / (1 + nu_s) * q_s * a_s**4 / (64 * Ds)) == 0
    assert sp.simplify(vals["sigma_ss"] - 3 * (3 + nu_s) * q_s * a_s**2 / (8 * t_s**2)) == 0
    assert sp.simplify(vals["defl_ratio"] - (5 + nu_s) / (1 + nu_s)) == 0
    # the ratio readout really is the two authored deflections' quotient
    assert sp.simplify(vals["defl_ratio"] - vals["delta_ss"] / vals["delta_c"]) == 0
    # sigma_c authored form carries no material property
    assert not ({E_s, nu_s} & vals["sigma_c"].free_symbols)
