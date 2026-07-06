"""Independent physics cross-check for the ball-bearing-life THING. Nothing here
imports thing.yaml's residuals; every governing result is re-derived from first
principles:

- the reliability life factor x(R) is obtained by SOLVING the three-parameter
  Weibull survival CDF for the dimensionless life (the thing.yaml relation is the
  authored ANSWER to that inversion);
- the load-life law L10 = 1e6 (C10/P)^a is re-derived from the Lundberg-Palmgren
  L·P^a = const rating basis;
- the SI hours relation t·omega = 2*pi*L10 is proven identical to Shigley's
  printed display form L_h = 1e6·L10_Mrev/(60 n) (the 60 is a display artifact);
- a hand-worked numeric golden (Shigley Ch. 11 formulas) and a transcription
  guard on the cited Weibull constants pin the emitted numbers.
"""

import math
from pathlib import Path

import sympy as sp

REPO_ROOT = Path(__file__).resolve().parents[2]

# Weibull parameters: Shigley's Mechanical Engineering Design, 10th ed.,
# Table 11-6, Manufacturer 2 (02-series bearings, 10^6-revolution rating basis --
# the basis this page uses). x0 = 0.02, theta = 4.459, b = 1.483. Web-corroborated
# 2026-07-06 against two independent reproductions of Table 11-6 (Bartleby, Chegg).
X0, THETA, B = sp.Rational(2, 100), sp.Rational(4459, 1000), sp.Rational(1483, 1000)


def x_of_R(R):
    """Authored reliability life factor x(R) = x0 + (theta - x0)(ln 1/R)^(1/b)."""
    return X0 + (THETA - X0) * sp.log(1 / R) ** (1 / B)


def test_weibull_inversion_is_the_authored_closed_form():
    """SOLVE the 3-parameter Weibull survival CDF R = exp[-((x-x0)/(theta-x0))^b]
    for the dimensionless life x. The root must equal the authored x(R) exactly --
    this is the independent derivation of reliability-life-factor."""
    x, x0, theta, b, R = sp.symbols("x x0 theta b R", positive=True)
    cdf = sp.Eq(R, sp.exp(-((x - x0) / (theta - x0)) ** b))
    roots = sp.solve(cdf, x)
    authored = x0 + (theta - x0) * sp.log(1 / R) ** (1 / b)
    assert any(sp.simplify(r - authored) == 0 for r in roots), roots


def test_weibull_cdf_roundtrip():
    """Substituting the authored x(R) back into the CDF returns R. powdenest(force)
    collapses (z^(1/b))^b -> z, legitimate since z = ln(1/R) > 0 on R in (0,1)."""
    x0, theta, b, R = sp.symbols("x0 theta b R", positive=True)
    authored = x0 + (theta - x0) * sp.log(1 / R) ** (1 / b)
    inner = sp.powdenest(((authored - x0) / (theta - x0)) ** b, force=True)  # -> ln(1/R)
    assert sp.simplify(sp.exp(-inner) - R) == 0


def test_reliability_factor_is_unity_at_ninety_percent():
    """L10 IS the 90%-reliability life, so x(0.90) must return ~1 -- the model's
    self-consistency (and the sanity check the derivation prose cites)."""
    val = float(x_of_R(sp.Rational(90, 100)))
    assert abs(val - 1.0) < 0.01, val  # 0.99335 with the Table 11-6 parameters


def test_reliability_factor_strictly_decreasing_in_R():
    """Higher demanded reliability buys shorter usable life: dx/dR < 0 throughout."""
    R = sp.symbols("R", positive=True)
    d = sp.diff(x_of_R(R), R)
    assert all(float(d.subs(R, sp.Rational(rr, 100))) < 0 for rr in (55, 90, 95, 99))


def test_loadlife_from_rating_definition():
    """Re-derive L10 = 1e6 (C10/P)^a from the Lundberg-Palmgren rating basis:
    fatigue life obeys L·P^a = const, and C10 is DEFINED as the load giving
    L = 1e6 rev, so const = 1e6·C10^a."""
    C10, P, a, L = sp.symbols("C10 P a L", positive=True)
    const = 1_000_000 * C10 ** a  # rating point: P = C10 -> L = 1e6 rev
    L_of_P = sp.solve(sp.Eq(L * P ** a, const), L)[0]
    assert sp.simplify(L_of_P - 1_000_000 * (C10 / P) ** a) == 0


def test_hours_relation_matches_shigley_display_form():
    """The SI relation t*omega = 2*pi*L10 (each rev is 2*pi rad) is the SAME fact
    as Shigley's printed L_h = 1e6·L10_Mrev/(60 n), n in rev/min -- the 60 and 1e6
    are display conversions, not physics."""
    L10, n = sp.symbols("L10 n", positive=True)  # L10 in revolutions, n in rev/min
    omega = 2 * sp.pi * n / 60  # rad/s
    t_hours = (2 * sp.pi * L10 / omega) / 3600
    shigley = 1_000_000 * (L10 / 1_000_000) / (60 * n)  # L10 expressed in Mrev
    assert sp.simplify(t_hours - shigley) == 0


def test_ball_vs_roller_exponent_ratio():
    """The only difference between the configurations is the exponent: at
    C10/P = 10 a roller bearing outlasts a ball bearing by 10^(10/3)/10^3 = 10^(1/3)."""
    ratio = (sp.Integer(10) ** sp.Rational(10, 3)) / (sp.Integer(10) ** 3)
    assert abs(float(ratio) - 10 ** (1 / 3)) < 1e-9  # 2.15443...


def test_numeric_golden():
    """Hand-worked example from the cited Shigley formulas (Sec 11-3 load-life,
    Sec 11-4 reliability). Ball bearing, C10 = 30 kN, P = 3 kN (C10/P = 10),
    n = 1200 rev/min, R = 0.99. All arithmetic below is by hand; source
    Shigley 10e Ch. 11."""
    C10, P, a = 30000.0, 3000.0, 3
    L10 = 1_000_000 * (C10 / P) ** a
    assert L10 == 1e9  # 1000 Mrev, exact

    n = 1200.0  # rev/min
    omega = 2 * math.pi * n / 60  # rad/s
    t10_s = 2 * math.pi * L10 / omega
    assert abs(t10_s - 5e7) < 1.0  # 5.0e7 s, exact
    assert abs(t10_s / 3600 - 13888.889) < 0.01  # 13,889 h

    xR = float(x_of_R(sp.Rational(99, 100)))
    assert abs(xR - 0.219589578) < 1e-6  # reliability factor at R = 0.99
    L_R = L10 * xR
    assert abs(L_R / 1e6 - 219.5896) < 1e-3  # 219.6 Mrev
    t_R_h = (2 * math.pi * L_R / omega) / 3600
    assert abs(t_R_h - 3049.855) < 0.01  # 3050 h

    # h = 0 analogue for bearings: at R = 0.90 the adjusted life returns the rating
    assert abs(x_of_R(sp.Rational(90, 100)) * L10 / 1e6 - 993.35) < 0.5  # ~L10


def test_yaml_weibull_constants_match_table_11_6():
    """Transcription guard (the S03 pattern): the authored role:constant defaults
    must equal the Table 11-6 Manufacturer-2 values bit-for-bit -- a yaml typo in a
    cited constant is a provenance violation the re-derivation tests cannot catch."""
    import yaml

    p = REPO_ROOT / "site" / "src" / "content" / "things" / "ball-bearing-life" / "thing.yaml"
    data = yaml.safe_load(p.read_text(encoding="utf-8"))
    consts = {v["symbol"]: v["default"] for v in data["variables"] if v.get("role") == "constant"}
    assert consts["x0"] == 0.02
    assert consts["theta"] == 4.459
    assert consts["b"] == 1.483
