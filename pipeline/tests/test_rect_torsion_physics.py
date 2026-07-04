"""First-principles cross-check for rectangular-shaft-torsion (CLAUDE.md invariant 5).

Unlike a digitized chart, the rectangular-bar torsion coefficients c1(a/b), c2(a/b)
are the EXACT solution of a classical PDE (Saint-Venant torsion), so this test
RE-DERIVES them from the closed Fourier series — it does NOT import thing.yaml's
residuals, and it does not trust the coefficient table on faith. Two independent
routes must both agree with every authored value:

  1. The exact Saint-Venant / Prandtl series (the physics itself). For a rectangle
     of long side a, short side b, r = a/b >= 1:
         c2(r) = 1/3 - (64/pi^5)(1/r) * SUM_{n odd} (1/n^5) tanh(n*pi*r/2)
         c1(r) = c2(r) / ( 1 - (8/pi^2) * SUM_{n odd} (1/n^2) / cosh(n*pi*r/2) )
     These are calibrated by the classic square values (0.208, 0.1406) and the
     thin-strip limit c1 = c2 = 1/3, both reproduced below.

  2. Roark's INDEPENDENT closed-form fit (Roark's Formulas for Stress and Strain,
     7th ed. Ch. 10; Table 10.7 in the 8th ed.), converted to the full-side
     convention with t = b/a:
         K = a b^3 [1/3 - 0.21 t (1 - t^4/12)]         ->  c2 = K/(a b^3)
         tau_max = 3T/(8 a b^2)[1 + 0.6095 t + 0.8865 t^2 - 1.8023 t^3 + 0.9100 t^4]
                   (with 2a,2b half-sides)             ->  c1 = 1/(3 * that bracket)

The exact series is the strongest possible cross-check (it IS the physics), so the
authored table is required to match it to <= 0.001 — the rounding of a 3-decimal
published table. Roark's fit is required to agree within its own stated accuracy.
The a/b -> infinity thin-strip limit 1/3 is the consistency oracle the brief names.

Provenance note: the primary Timoshenko & Goodier PDF was not reachable this
session (archive.org refused), so the authored values are pinned by this exact
re-derivation plus Roark rather than by transcription — a stronger check, and
legitimate because these are uncopyrightable facts (the exact solution of a PDE),
not a proprietary curve fit (contrast stepped-shaft-fillet, where the data ARE a
digitized fit and can only be cross-checked against a second fit).
"""

import math
from pathlib import Path

import sympy as sp
import yaml

THING = (
    Path(__file__).resolve().parents[1].parent
    / "site" / "src" / "content" / "things" / "rectangular-shaft-torsion"
)

# number of odd terms; the series decay (1/n^5 tanh, 1/n^2 sech) is so fast that
# 25 odd terms is already machine-exact at the ratios tested
_ODD = [2 * k - 1 for k in range(1, 26)]


def _table():
    """The authored coefficient table as {a/b: (c1, c2)} — the drift guard: the
    test's claims are pinned to exactly what thing.yaml ships."""
    raw = yaml.safe_load((THING / "thing.yaml").read_text(encoding="utf-8"))
    tbl = next(t for t in raw["tables"] if t["id"] == "rect-torsion-coeffs")
    assert tbl["arg"] == "ab" and tbl["columns"] == ["c1", "c2"]
    return {float(r[0]): (float(r[1]), float(r[2])) for r in tbl["rows"]}


# ---------------------------------------------------------------------------
# The exact Saint-Venant series (first principles) and Roark's independent fit
# ---------------------------------------------------------------------------

def _sech(x: float) -> float:
    # 1/cosh(x); cosh overflows a float around x ~ 710, where sech is already ~0
    return 0.0 if x > 700 else 1.0 / math.cosh(x)


def c2_exact(r: float) -> float:
    S5 = sum((1.0 / n**5) * math.tanh(n * math.pi * r / 2) for n in _ODD)
    return 1.0 / 3 - (64.0 / math.pi**5) * (1.0 / r) * S5


def c1_exact(r: float) -> float:
    S2 = sum((1.0 / n**2) * _sech(n * math.pi * r / 2) for n in _ODD)
    return c2_exact(r) / (1.0 - (8.0 / math.pi**2) * S2)


def c2_roark(r: float) -> float:
    t = 1.0 / r
    return 1.0 / 3 - 0.21 * t * (1 - t**4 / 12)


def c1_roark(r: float) -> float:
    t = 1.0 / r
    poly = 1 + 0.6095 * t + 0.8865 * t**2 - 1.8023 * t**3 + 0.9100 * t**4
    return 1.0 / (3 * poly)


# ---------------------------------------------------------------------------
# 1. Calibration: the series reproduces the textbook anchors
# ---------------------------------------------------------------------------

def test_series_reproduces_the_classic_square():
    # a square (a/b = 1): the famous coefficients 0.208 and 0.1406
    assert math.isclose(c1_exact(1.0), 0.208, abs_tol=5e-4)
    assert math.isclose(c2_exact(1.0), 0.1406, abs_tol=5e-4)


def test_thin_strip_limit_is_one_third():
    # a/b -> infinity: both coefficients approach 1/3 (the infinite-strip membrane)
    for r in (10.0, 50.0, 500.0):
        assert c1_exact(r) < 1.0 / 3 and c2_exact(r) < 1.0 / 3
    assert math.isclose(c1_exact(1000.0), 1.0 / 3, abs_tol=1e-3)
    assert math.isclose(c2_exact(1000.0), 1.0 / 3, abs_tol=1e-3)


# ---------------------------------------------------------------------------
# 2. Every authored row must match the exact series AND Roark
# ---------------------------------------------------------------------------

def test_authored_table_matches_exact_series():
    """The strong check: each published row equals the exact PDE solution to the
    precision of a 3-decimal table."""
    worst = 0.0
    for r, (c1, c2) in _table().items():
        d1 = abs(c1 - c1_exact(r))
        d2 = abs(c2 - c2_exact(r))
        worst = max(worst, d1, d2)
        assert d1 <= 1e-3, f"a/b={r}: c1 authored {c1} vs exact {c1_exact(r):.5f} (Δ={d1:.5f})"
        assert d2 <= 1e-3, f"a/b={r}: c2 authored {c2} vs exact {c2_exact(r):.5f} (Δ={d2:.5f})"
    # the table is genuinely rounded data, not machine-exact: the worst row is a
    # real (small) rounding gap, not zero — proof we didn't just echo the series
    assert 1e-4 < worst <= 1e-3


def test_authored_table_matches_roark_independent_fit():
    """Roark's separately published closed form agrees with every authored row
    within its stated accuracy — a second, independent publication."""
    worst = 0.0
    for r, (c1, c2) in _table().items():
        worst = max(worst, abs(c1 - c1_roark(r)), abs(c2 - c2_roark(r)))
    # Roark's polynomial fit is stated good to a few tenths of a percent; observed
    # worst over the grid is well under 0.001 in absolute coefficient terms
    assert worst < 1.5e-3


def test_columns_trend_monotonically_toward_one_third():
    """Both coefficients rise monotonically with a/b toward the 1/3 strip limit —
    the brief's 'trend toward 1/3' requirement."""
    rows = _table()
    rs = sorted(rows)
    c1s = [rows[r][0] for r in rs]
    c2s = [rows[r][1] for r in rs]
    assert all(a < b for a, b in zip(c1s, c1s[1:]))
    assert all(a < b for a, b in zip(c2s, c2s[1:]))
    # the last authored row (a/b = 10) already sits within ~0.021 of 1/3
    assert rows[10.0][0] < 1.0 / 3 and (1.0 / 3 - rows[10.0][0]) < 0.03
    assert rows[10.0][1] < 1.0 / 3 and (1.0 / 3 - rows[10.0][1]) < 0.03


# ---------------------------------------------------------------------------
# 3. Round-shaft baseline re-derived from first principles (no thing.yaml)
# ---------------------------------------------------------------------------

def test_round_shaft_stress_from_polar_modulus():
    # tau = T r / J with J = pi r^4 / 2  ->  tau = 2 T / (pi r^3) = 16 T / (pi d^3)
    T, r = sp.symbols("T r", positive=True)
    tau = T * r / (sp.pi * r**4 / 2)
    assert sp.simplify(tau - 2 * T / (sp.pi * r**3)) == 0


def test_round_shaft_twist_rate_from_polar_moment():
    # theta' = T / (G J), J = pi r^4 / 2  ->  theta' = 2 T / (pi r^4 G)
    T, G, r = sp.symbols("T G r", positive=True)
    tp = T / (G * sp.pi * r**4 / 2)
    assert sp.simplify(tp - 2 * T / (sp.pi * r**4 * G)) == 0


# ---------------------------------------------------------------------------
# 4. Hand-checkable numeric golden (square bar, exact table row)
# ---------------------------------------------------------------------------
# a/b = 1 (square), c1 = 0.208 exactly (Timoshenko §109 / series 0.20817):
#   T = 100 N*m, a = b = 0.05 m
#   tau_max = T / (c1 a b^2) = 100 / (0.208 * 0.05 * 0.05^2)
#           = 100 / 2.6e-5 = 3.846154e6 Pa = 3.84615 MPa   (by hand)

def test_tau_max_golden_by_hand():
    T, a, b, c1 = 100.0, 0.05, 0.05, 0.208
    tau = T / (c1 * a * b**2)
    assert math.isclose(tau, 3.846154e6, rel_tol=1e-5)
    # and the authored square row must carry exactly (0.208, 0.1406)
    assert _table()[1.0] == (0.208, 0.1406)


# ---------------------------------------------------------------------------
# 5. The page's point: an equal-area round shaft beats the rectangle, worse as
#    the section elongates. Re-derived independently from the exact series.
# ---------------------------------------------------------------------------

def _eta_tau(r: float) -> float:
    """Stress penalty tau_rect / tau_round for a rectangle of ratio r=a/b vs the
    equal-AREA circle, both carrying the same torque. Independent of thing.yaml:
    fix b=1, then a=r; A=ab=r; r_eq=sqrt(A/pi); tau_round=2T/(pi r_eq^3);
    tau_rect=T/(c1_exact(r) a b^2). T cancels in the ratio."""
    a, b = r, 1.0
    r_eq = math.sqrt(a * b / math.pi)
    tau_round = 2.0 / (math.pi * r_eq**3)          # T = 1
    tau_rect = 1.0 / (c1_exact(r) * a * b**2)       # T = 1
    return tau_rect / tau_round


def test_rectangle_always_loses_to_equal_area_circle_on_stress():
    # every rectangle carries MORE peak stress than the equal-area circle...
    for r in (1.0, 1.5, 2.0, 3.0, 5.0):
        assert _eta_tau(r) > 1.0
    # ...the square by ~36%, and the penalty grows monotonically as it elongates
    assert math.isclose(_eta_tau(1.0), 1.36, abs_tol=0.03)
    penalties = [_eta_tau(r) for r in (1.0, 1.5, 2.0, 3.0, 5.0)]
    assert all(a < b for a, b in zip(penalties, penalties[1:]))
