"""Independent physics cross-check for the four-bar linkage THING: solve the
loop-closure equations NUMERICALLY (nsolve — no closed form anywhere) and
check the authored Freudenstein-form solutions against those roots, branch by
branch. Also verifies the Freudenstein elimination symbolically and the
Grashof classification of the default geometry."""

import sympy as sp

A_, B_, C_, D_, TH2 = sp.symbols("a b c d theta2", positive=True)
TH3, TH4 = sp.symbols("theta3 theta4", real=True)

# the authored closed forms, reproduced from thing.yaml
K1 = D_ / A_
K2 = D_ / C_
K3 = (A_**2 - B_**2 + C_**2 + D_**2) / (2 * A_ * C_)
QA = sp.cos(TH2) - K1 - K2 * sp.cos(TH2) + K3
QB = -2 * sp.sin(TH2)
QC = K1 - (K2 + 1) * sp.cos(TH2) + K3
K4 = D_ / B_
K5 = (C_**2 - D_**2 - A_**2 - B_**2) / (2 * A_ * B_)
QD = sp.cos(TH2) - K1 + K4 * sp.cos(TH2) + K5
QF = K1 + (K4 - 1) * sp.cos(TH2) + K5


def th4_closed(sign):
    return 2 * sp.atan((-QB + sign * sp.sqrt(QB**2 - 4 * QA * QC)) / (2 * QA))


def th3_closed(sign):
    return 2 * sp.atan((-QB + sign * sp.sqrt(QB**2 - 4 * QD * QF)) / (2 * QD))


LOOP_X = A_ * sp.cos(TH2) + B_ * sp.cos(TH3) - C_ * sp.cos(TH4) - D_
LOOP_Y = A_ * sp.sin(TH2) + B_ * sp.sin(TH3) - C_ * sp.sin(TH4)

GEOM = {A_: sp.Rational(4, 100), B_: sp.Rational(12, 100),
        C_: sp.Rational(8, 100), D_: sp.Rational(1, 10)}


def test_closed_forms_match_blind_numeric_roots_both_branches():
    """nsolve knows nothing about Freudenstein: seed it from the closed forms
    plus noise and confirm it converges back to them, for both circuits."""
    for th2_val in (sp.Rational(7, 10), sp.Rational(33, 10)):
        subs = {**GEOM, TH2: th2_val}
        for sign in (-1, +1):  # open, crossed
            t4 = th4_closed(sign).subs(subs).evalf(30)
            t3 = th3_closed(sign).subs(subs).evalf(30)
            eqs = [LOOP_X.subs(subs), LOOP_Y.subs(subs)]
            root = sp.nsolve(eqs, (TH3, TH4), (t3 + sp.Rational(1, 50), t4 - sp.Rational(1, 50)),
                             prec=30)
            assert abs(root[0] - t3) < 1e-25, (sign, th2_val)
            assert abs(root[1] - t4) < 1e-25, (sign, th2_val)


def test_freudenstein_elimination_is_an_identity():
    """Squaring-and-adding the isolated θ3 terms must reproduce Freudenstein's
    equation identically in θ4 — pure algebra, checked symbolically."""
    elim = (D_ + C_ * sp.cos(TH4) - A_ * sp.cos(TH2)) ** 2 + \
           (C_ * sp.sin(TH4) - A_ * sp.sin(TH2)) ** 2 - B_**2
    freud = K1 * sp.cos(TH4) - K2 * sp.cos(TH2) + K3 - sp.cos(TH2 - TH4)
    # elim == 0  <=>  freud == 0 : their ratio is the constant 2ac
    assert sp.simplify(sp.expand_trig(elim) - 2 * A_ * C_ * sp.expand_trig(freud)) == 0


def test_default_geometry_is_grashof_crank_rocker():
    lengths = sorted(float(v) for v in GEOM.values())
    s, p, q, l = lengths
    assert s + l < p + q  # Grashof
    assert float(GEOM[A_]) == s  # and the crank is the shortest link: crank-rocker


def test_assembly_condition_equals_discriminant_sign():
    """|b² + c² − f²| ≤ 2bc (f = crank-pin to far-pivot distance) is exactly
    discriminant ≥ 0 for the θ4 quadratic — same condition, two costumes."""
    f2 = A_**2 + D_**2 - 2 * A_ * D_ * sp.cos(TH2)
    cosgamma = (B_**2 + C_**2 - f2) / (2 * B_ * C_)
    disc = (QB**2 - 4 * QA * QC).subs(GEOM)
    for th2_val in (sp.Rational(1, 2), sp.Rational(3, 2), sp.Rational(5, 2), sp.Rational(31, 10)):
        lhs_ok = abs(cosgamma.subs(GEOM).subs(TH2, th2_val).evalf(30)) <= 1
        rhs_ok = disc.subs(TH2, th2_val).evalf(30) >= 0
        assert bool(lhs_ok) == bool(rhs_ok), th2_val


def test_numeric_golden_default_pose():
    """Scratch-validated golden: a=40, b=120, c=80, d=100 mm, θ2=0.7 rad:
    open circuit θ4 = 1.00103 rad, θ3 = 0.35396 rad."""
    subs = {**GEOM, TH2: sp.Rational(7, 10)}
    assert abs(th4_closed(-1).subs(subs).evalf(20) - 1.0010322) < 1e-6
    assert abs(th3_closed(-1).subs(subs).evalf(20) - 0.35395775) < 1e-6
