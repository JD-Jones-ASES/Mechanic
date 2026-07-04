"""First-principles cross-check for stepped-shaft-fillet (CLAUDE.md invariant 5).

This RE-DERIVES the nominal-stress formulas from section geometry (I, J, A) — it
does NOT import thing.yaml's residuals. The fitted stress-concentration
coefficients (A, b) cannot be re-derived from first principles (they digitize
Peterson's photoelastic charts), so the DATA is cross-checked a different, honest
way: the authored Norton A·(r/d)^b fit is compared against Roark's INDEPENDENT
closed-form fit of the same shoulder-fillet charts (Roark, Formulas for Stress
and Strain, Table 6-1 part III case 2). Two independently published digitizations
of the same photoelastic data agreeing within their stated few-percent accuracy
is genuinely independent verification — stronger than most THINGs get.

Roark's fit (verbatim, Roark Table 6-1 / preserved in the S02 session log):
    K_t = C1 + C2·(2h/D) + C3·(2h/D)^2 + C4·(2h/D)^3,     h = (D - d)/2
with C1..C4 polynomials in sqrt(h/r), valid over 0.1 <= h/r <= 2.0 (axial,
bending) and 0.25 <= h/r <= 4.0 (torsion). In the chart ratios,
    2h/D = (D - d)/D = 1 - 1/(D/d),      h/r = (D/d - 1) / (2·r/d).

BAND: Norton (App. C) and Roark/Pilkey (Peterson's SCF) each state their fits
reproduce Peterson's charts to within a few percent (Pilkey's polynomial fits are
typically stated ~5%). We therefore require agreement to within 5% over the
well-stepped D/d >= 1.5 band, where both fits are most reliable; the observed
maximum over the tested points is ~3.2% (bending). We do NOT widen the band to
pass — 5% IS the sources' own stated accuracy. Near D/d -> 1 the two fits diverge
more (both are least reliable there), which is why the cross-check stays at
D/d >= 1.5, exactly as the brief specifies.
"""

import math
from pathlib import Path

import sympy as sp
import yaml

THING = (
    Path(__file__).resolve().parents[1].parent
    / "site" / "src" / "content" / "things" / "stepped-shaft-fillet"
)


def _tables():
    raw = yaml.safe_load((THING / "thing.yaml").read_text(encoding="utf-8"))
    return {t["id"]: {float(r[0]): (float(r[1]), float(r[2])) for r in t["rows"]} for t in raw["tables"]}


def _norton_kt(rows, Dd, rd):
    """Norton K_t = A·(r/d)^b with (A, b) interpolated linearly by D/d — the same
    two-column linear interpolation the pipeline/runtime perform, computed here
    independently of the emitted artifact."""
    xs = sorted(rows)
    if Dd <= xs[0]:
        A, b = rows[xs[0]]
    elif Dd >= xs[-1]:
        A, b = rows[xs[-1]]
    else:
        lo = max(x for x in xs if x <= Dd)
        hi = min(x for x in xs if x >= Dd)
        if lo == hi:
            A, b = rows[lo]
        else:
            (Alo, blo), (Ahi, bhi) = rows[lo], rows[hi]
            f = (Dd - lo) / (hi - lo)
            A, b = Alo + (Ahi - Alo) * f, blo + (bhi - blo) * f
    return A * rd ** b


# ---- Roark's independent closed-form fit (Table 6-1 part III case 2) ----
def _roark_C(load, u, hr):
    """C1..C4 as polynomials in u = sqrt(h/r); coefficients verbatim from Roark."""
    if load == "axial":
        return (
            0.926 + 1.157 * u - 0.099 * hr,
            0.012 - 3.036 * u + 0.961 * hr,
            -0.302 + 3.977 * u - 1.744 * hr,
            0.365 - 2.098 * u + 0.878 * hr,
        )
    if load == "bending":
        return (
            0.947 + 1.206 * u - 0.131 * hr,
            0.022 - 3.405 * u + 0.915 * hr,
            0.869 + 1.777 * u - 0.555 * hr,
            -0.810 + 0.422 * u - 0.260 * hr,
        )
    return (  # torsion
        0.905 + 0.783 * u - 0.075 * hr,
        -0.437 - 1.969 * u + 0.553 * hr,
        1.557 + 1.073 * u - 0.578 * hr,
        -1.061 + 0.171 * u + 0.086 * hr,
    )


def _roark_kt(load, Dd, rd):
    hr = (Dd - 1) / (2 * rd)     # h/r
    t = 1 - 1 / Dd              # 2h/D
    C1, C2, C3, C4 = _roark_C(load, math.sqrt(hr), hr)
    return C1 + C2 * t + C3 * t * t + C4 * t ** 3


# ---------------------------------------------------------------------------
# 1. Nominal stresses re-derived from section geometry (no thing.yaml)
# ---------------------------------------------------------------------------

def test_bending_nominal_from_section_modulus():
    # σ = M c / I, circular section: I = π d^4 / 64, c = d/2  ⇒  σ = 32 M / (π d^3)
    M, d = sp.symbols("M d", positive=True)
    sigma = M * (d / 2) / (sp.pi * d**4 / 64)
    assert sp.simplify(sigma - 32 * M / (sp.pi * d**3)) == 0


def test_torsion_nominal_from_polar_modulus():
    # τ = T r / J, circular section: J = π d^4 / 32, r = d/2  ⇒  τ = 16 T / (π d^3)
    T, d = sp.symbols("T d", positive=True)
    tau = T * (d / 2) / (sp.pi * d**4 / 32)
    assert sp.simplify(tau - 16 * T / (sp.pi * d**3)) == 0


def test_axial_nominal_from_area():
    # σ = F / A, A = π d^2 / 4  ⇒  σ = 4 F / (π d^2)
    F, d = sp.symbols("F d", positive=True)
    assert sp.simplify(F / (sp.pi * d**2 / 4) - 4 * F / (sp.pi * d**2)) == 0


# ---------------------------------------------------------------------------
# 2. Hand-checkable numeric golden (bending, exact D/d row)
# ---------------------------------------------------------------------------
# Bending, D/d = 1.50 (exact Norton Fig. C-2 row: A = 0.93836, b = -0.25759),
# r/d = 0.10:  K_t = 0.93836 · 0.10^(-0.25759) = 0.93836 · 10^0.25759
#                  = 0.93836 · 1.80965 = 1.6982   (compute by hand from the row)

def test_kt_golden_by_hand():
    A, b = 0.93836, -0.25759                 # Norton Fig. C-2 row D/d = 1.50
    Kt = A * 0.10 ** b
    assert math.isclose(Kt, 1.698, rel_tol=1e-3)
    # and the authored table must carry those exact coefficients bit-for-bit
    assert _tables()["kt-bending"][1.50] == (0.93836, -0.25759)


# ---------------------------------------------------------------------------
# 3. Cross-check Norton's fit against Roark's INDEPENDENT fit (stated 5% band)
# ---------------------------------------------------------------------------
BAND = 0.05   # 5% — the sources' own stated fit accuracy vs Peterson's charts

# (load, table id, D/d, r/d): D/d >= 1.5 (well-stepped band) AND h/r inside
# Roark's first branch (0.1<=h/r<=2.0 axial/bending, 0.25<=h/r<=4.0 torsion)
# AND r/d <= 0.30 (Norton's plotted range).
CROSS_POINTS = [
    ("axial", "kt-axial", 1.50, 0.20),
    ("axial", "kt-axial", 1.50, 0.25),
    ("axial", "kt-axial", 2.00, 0.30),
    ("bending", "kt-bending", 1.50, 0.15),
    ("bending", "kt-bending", 1.50, 0.20),
    ("bending", "kt-bending", 1.50, 0.25),
    ("bending", "kt-bending", 2.00, 0.25),
    ("bending", "kt-bending", 2.00, 0.30),
    ("torsion", "kt-torsion", 1.60, 0.20),
    ("torsion", "kt-torsion", 2.00, 0.25),
    ("torsion", "kt-torsion", 2.00, 0.30),
]


def test_norton_and_roark_fits_agree_within_the_stated_band():
    tables = _tables()
    worst = 0.0
    for load, tid, Dd, rd in CROSS_POINTS:
        hr = (Dd - 1) / (2 * rd)
        lo, hi = (0.25, 4.0) if load == "torsion" else (0.1, 2.0)
        assert lo <= hr <= hi, f"{load} D/d={Dd} r/d={rd}: h/r={hr:.3f} outside Roark's branch"
        kn = _norton_kt(tables[tid], Dd, rd)
        kr = _roark_kt(load, Dd, rd)
        rel = abs(kn - kr) / kr
        worst = max(worst, rel)
        assert rel < BAND, (
            f"{load} D/d={Dd} r/d={rd}: Norton {kn:.4f} vs Roark {kr:.4f} = {rel:.1%} (> {BAND:.0%})"
        )
    # the fits genuinely DIFFER (independent digitizations, not a self-check),
    # yet stay comfortably inside the stated band
    assert 0.005 < worst < BAND


def test_kt_falls_as_the_fillet_gets_more_generous():
    # the whole pedagogy: a bigger r/d is a gentler fillet, so K_t drops toward 1
    rows = _tables()["kt-bending"]
    ks = [_norton_kt(rows, 1.50, rd) for rd in (0.05, 0.10, 0.20, 0.30)]
    assert all(b < a for a, b in zip(ks, ks[1:]))
    assert ks[0] > 1.0
