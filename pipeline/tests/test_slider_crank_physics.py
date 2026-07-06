"""First-principles cross-check for slider-crank (CLAUDE.md invariant 5).

Independent of thing.yaml: nothing here imports the authored residuals. The
kinematics is re-derived by DIFFERENTIATION and the force path by STATICS —

  * the piston position x(θ) = r·cosθ + √(l²−r²sin²θ) is written from the
    rod-crank-axis right triangle, then DIFFERENTIATED symbolically: the authored
    velocity and acceleration must be exactly ω·dx/dθ and ω²·d²x/dθ² (the derivative
    check IS the first-principles cross-check for this page — a slip in the factoring
    of v or a cannot survive);
  * the long-rod acceleration limit a → −rω²(cosθ + (r/l)cos2θ) — the once- and
    twice-per-rev terms — recovered as the l → ∞ expansion;
  * the two-term travel approximation's error bounded across a sweep of r/l and shown
    to be third-order in r/l (the truncated binomial remainder), symbolically and
    numerically;
  * the crank torque derived TWO independent ways — the moment of the connecting-rod
    force, and virtual work T·dθ = −F·dx — shown to agree, with the long-rod limit
    T → F·r·sinθ;
  * the single-branch condition l > r (the position radical stays real and cosφ > 0
    for every crank angle).

Golden: θ = 90°, r/l = 1/3 — clean exact values (v = −ωr, T = Fr), arithmetic in
the comment.
"""

import math

import sympy as sp

# r, l, ω, F strictly positive; θ a general (real) crank angle
r, l, omega, F = sp.symbols("r l omega F", positive=True)
theta = sp.symbols("theta", real=True)

# independent geometry: the rod (hyp l), the crank pin's transverse offset r·sinθ,
# and the rod's axial reach q form a right triangle -> q = √(l²−r²sin²θ)
q = sp.sqrt(l**2 - r**2 * sp.sin(theta) ** 2)
x = r * sp.cos(theta) + q  # piston position from the crank axis

# the authored forms this test exists to police (copied here as literals, NOT imported)
v_authored = -omega * r * sp.sin(theta) * (1 + r * sp.cos(theta) / q)
a_authored = omega**2 * (
    -r * sp.cos(theta)
    - r**2 * sp.cos(2 * theta) / q
    - r**4 * sp.sin(theta) ** 2 * sp.cos(theta) ** 2 / q**3
)


def test_velocity_is_omega_times_dx_dtheta():
    """v = dx/dt = ω·dx/dθ (ω constant). Differentiate x independently and confirm
    the authored, factored velocity is exactly that derivative."""
    v_from_diff = omega * sp.diff(x, theta)
    assert sp.simplify(v_from_diff - v_authored) == 0, sp.simplify(v_from_diff - v_authored)


def test_acceleration_is_omega2_times_d2x_dtheta2():
    """a = d²x/dt² = ω²·d²x/dθ². Differentiate x twice independently and confirm the
    authored acceleration. Then recover the textbook long-rod two-term form."""
    a_from_diff = omega**2 * sp.diff(x, theta, 2)
    assert sp.simplify(a_from_diff - a_authored) == 0, sp.simplify(a_from_diff - a_authored)
    # long-rod limit: leading term −rω²cosθ, first correction −(r²ω²/l)cos2θ
    lead = -r * omega**2 * sp.cos(theta)
    assert sp.simplify(sp.limit(a_authored, l, sp.oo) - lead) == 0
    corr = sp.limit(l * (a_authored - lead), l, sp.oo)
    assert sp.simplify(corr - (-(r**2) * omega**2 * sp.cos(2 * theta))) == 0


def test_two_term_approx_is_bounded_and_third_order():
    """The exact piston travel from TDC is s = (r+l) − x = r(1−cosθ) + (l−q). The
    two-term series keeps the leading (l−q) ≈ (r²/2l)sin²θ = (r²/4l)(1−cos2θ). The
    dropped remainder is third-order in r/l, so the error is tiny at engine
    proportions and grows (as the cube) with obliquity."""
    disp_exact = (r + l) - x
    disp_approx = r * (1 - sp.cos(theta)) + (r**2 / (4 * l)) * (1 - sp.cos(2 * theta))
    err = disp_approx - disp_exact
    # symbolic: the leading error term is −(r⁴/8l³)sin⁴θ  (i.e. O((r/l)³) vs the 2r stroke)
    leading = sp.limit(l**3 * err, l, sp.oo)
    assert sp.simplify(leading - (-(r**4) / 8 * sp.sin(theta) ** 4)) == 0

    # numeric: worst |err| over a full cycle, as a fraction of the 2r stroke,
    # is small at a typical r/l and grows monotonically with r/l
    f_err = sp.lambdify((r, l, theta), err, "math")

    def worst_frac(ratio: float) -> float:
        rr = 0.05
        ll = rr / ratio
        return max(abs(f_err(rr, ll, 2 * math.pi * k / 1440)) for k in range(1441)) / (2 * rr)

    fracs = [worst_frac(x) for x in (0.10, 0.20, 0.25, 1 / 3, 0.40, 0.50)]
    assert all(b > a for a, b in zip(fracs, fracs[1:])), fracs  # strictly grows with r/l
    assert worst_frac(0.25) < 0.005  # under 0.5% of stroke at a typical engine ratio
    assert worst_frac(0.50) < 0.02  # still under 2% even at the r/l = 0.5 warn threshold


def test_crank_torque_two_ways_and_long_rod_limit():
    """Derive the crank torque independently two ways and require agreement:
    (a) the moment of the rod force, T = F·r·sin(θ+φ)/cosφ with sinφ = (r/l)sinθ;
    (b) virtual work, T·dθ = −F·dx (the gas force F drives the piston in −x).
    Also check cosφ = q/l and the long-rod limit T → F·r·sinθ."""
    phi = sp.asin(r * sp.sin(theta) / l)
    assert sp.simplify(sp.cos(phi) - q / l) == 0  # cosφ = q/l
    t_moment = F * r * sp.sin(theta + phi) / sp.cos(phi)
    t_virtual_work = -F * sp.diff(x, theta)
    assert sp.simplify(sp.expand_trig(t_moment) - t_virtual_work) == 0
    # a very long rod removes the obliquity: T → F·r·sinθ
    assert sp.simplify(sp.limit(t_moment, l, sp.oo) - F * r * sp.sin(theta)) == 0
    # rod force always exceeds the gas force (cosφ ≤ 1): F_rod = F/cosφ ≥ F
    f_rod = F / sp.cos(phi)
    assert sp.simplify(f_rod - F * l / q) == 0  # = F·l/q, and q ≤ l so F_rod ≥ F


def test_stroke_and_dead_centres():
    """Top and bottom dead centre, stroke 2r, and the vanishing of both piston
    velocity and crank torque at the dead centres (the toggle positions)."""
    assert sp.simplify(x.subs(theta, 0) - (r + l)) == 0  # TDC
    assert sp.simplify(x.subs(theta, sp.pi) - (l - r)) == 0  # BDC
    assert sp.simplify((x.subs(theta, 0) - x.subs(theta, sp.pi)) - 2 * r) == 0  # stroke = 2r
    v = omega * sp.diff(x, theta)
    assert sp.simplify(v.subs(theta, 0)) == 0
    assert sp.simplify(v.subs(theta, sp.pi)) == 0
    phi = sp.asin(r * sp.sin(theta) / l)
    t = F * r * sp.sin(theta + phi) / sp.cos(phi)
    assert sp.simplify(t.subs(theta, 0)) == 0
    assert sp.simplify(t.subs(theta, sp.pi)) == 0


def test_single_branch_requires_long_rod():
    """The in-line slider-crank assembles on ONE branch iff l > r: the position
    radical l²−r²sin²θ (minimum l²−r² at θ = 90°) then stays positive for every
    crank angle, and |sinφ| = (r/l)|sinθ| < 1 keeps cosφ > 0 (no open/crossed
    pair). With l ≤ r the radical goes negative near mid-stroke."""
    radicand = l**2 - r**2 * sp.sin(theta) ** 2
    assert sp.simplify(radicand.subs(theta, sp.pi / 2) - (l**2 - r**2)) == 0
    # l = 0.10 < r = 0.12: radical negative at θ = 90° (no assembly there)
    assert (0.10**2 - 0.12**2 * math.sin(math.pi / 2) ** 2) < 0
    # l = 0.15 > r = 0.05: radical positive everywhere (min = 0.0200 > 0)
    assert min(0.15**2 - 0.05**2 * math.sin(math.pi * k / 180) ** 2 for k in range(361)) > 0


def test_numeric_golden():
    """Hand-checkable state: θ = 90°, r = 50 mm, l = 150 mm (r/l = 1/3),
    ω = 100 rad/s, F = 4000 N. At θ = 90° several results collapse to clean values.

      q     = √(l²−r²sin²θ) = √(0.15²−0.05²·1) = √0.0200        = 0.14142136 m
      x     = r·cos90° + q  = 0 + 0.14142136                    = 0.14142136 m
      v     = −ω·r·sinθ·(1 + r·cosθ/q) = −100·0.05·1·(1 + 0)     = −5.0 m/s   (exact −ωr)
      a     = −ω²(r·cosθ + r²·cos2θ/q + r⁴sin²θcos²θ/q³)
            = −100²(0 + 0.05²·(−1)/0.14142136 + 0)
            = 10000·0.0025/0.14142136                           = 176.7767 m/s²  (= 125√2)
      φ     = asin(r·sinθ/l) = asin(1/3)                        = 0.33983691 rad (19.471°)
      F_rod = F/cosφ = 4000/√(1−1/9) = 4000·3/(2√2) = 3000√2    = 4242.6407 N
      T     = F·r·sin(θ+φ)/cosφ; at θ = 90°, sin(90°+φ) = cosφ, so
            = F·r = 4000·0.05                                   = 200.0 N·m  (exact Fr)
    """
    rr, ll, om, ff = 0.05, 0.15, 100.0, 4000.0
    th = math.pi / 2
    qv = math.sqrt(ll**2 - rr**2 * math.sin(th) ** 2)
    assert math.isclose(qv, math.sqrt(0.02), rel_tol=1e-12)
    xv = rr * math.cos(th) + qv
    assert math.isclose(xv, math.sqrt(0.02), rel_tol=1e-12)
    vv = -om * rr * math.sin(th) * (1 + rr * math.cos(th) / qv)
    assert math.isclose(vv, -5.0, rel_tol=1e-12)
    av = -(om**2) * (
        rr * math.cos(th)
        + rr**2 * math.cos(2 * th) / qv
        + rr**4 * math.sin(th) ** 2 * math.cos(th) ** 2 / qv**3
    )
    assert math.isclose(av, 125 * math.sqrt(2), rel_tol=1e-9)
    phiv = math.asin(rr * math.sin(th) / ll)
    assert math.isclose(phiv, math.asin(1 / 3), rel_tol=1e-12)
    f_rod = ff / math.cos(phiv)
    assert math.isclose(f_rod, 3000 * math.sqrt(2), rel_tol=1e-9)
    tv = ff * rr * math.sin(th + phiv) / math.cos(phiv)
    assert math.isclose(tv, 200.0, rel_tol=1e-9)
