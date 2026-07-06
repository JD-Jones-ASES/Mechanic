"""First-principles cross-check for spur-gear-pair (CLAUDE.md invariant 5).

This RE-DERIVES the kinematics and force path from equilibrium and rigid-body
kinematics — it does NOT import thing.yaml's residuals. The Lewis form factor Y
cannot practically be re-derived from first principles (it is a graphical/
digital layout of the tooth form), so the DATA is cross-checked a different,
honest way: the authored Table 14-2 values are compared against the standard
20° full-depth, tip-load Lewis form factors reproduced across independent
references (Shigley; Juvinall & Marshek; web-corroborated 2026-07-04), plus the
geometric consistency any such table must show (monotone increasing toward the
rack limit ≈ 0.485). The Lewis bending FORMULA itself is a cited model; here we
pin its structure, its hand-checkable golden, and the "pinion governs" fact.
"""

import math
from pathlib import Path

import sympy as sp
import yaml

THING = Path(__file__).resolve().parents[1].parent / "site" / "src" / "content" / "things" / "spur-gear-pair"


def _table_rows():
    raw = yaml.safe_load((THING / "thing.yaml").read_text(encoding="utf-8"))
    tbl = next(t for t in raw["tables"] if t["id"] == "lewis-form-factor-20fd")
    return {int(r[0]): float(r[1]) for r in tbl["rows"]}


# ---------------------------------------------------------------------------
# 1. Kinematics and the force path, re-derived from scratch (no thing.yaml)
# ---------------------------------------------------------------------------

def test_mesh_ratio_from_equal_pitchline_speed():
    # two pitch circles rolling without slip share a tangential speed:
    #   omega_p * r_p = omega_g * r_g,  r = d/2 = m N / 2
    # => omega_p / omega_g = r_g / r_p = N_g / N_p = i
    m, N_p, N_g, w_p = sp.symbols("m N_p N_g omega_p", positive=True)
    r_p, r_g = m * N_p / 2, m * N_g / 2
    w_g = w_p * r_p / r_g  # equal surface speed at the pitch point
    i = sp.simplify(w_p / w_g)
    assert sp.simplify(i - N_g / N_p) == 0


def test_transmitted_load_from_torque_equilibrium():
    # free body of the pinion: the applied torque T is reacted by a single
    # tangential tooth force W_t acting at the pitch radius r_p = m N_p / 2
    #   sum of moments = 0:  T - W_t * r_p = 0  =>  W_t = 2T/(m N_p)
    T, m, N_p, W_t = sp.symbols("T m N_p W_t", positive=True)
    r_p = m * N_p / 2
    W_t_solved = sp.solve(sp.Eq(T - W_t * r_p, 0), W_t)[0]
    assert sp.simplify(W_t_solved - 2 * T / (m * N_p)) == 0


def test_centre_distance_is_tangent_pitch_circles():
    m, N_p, N_g = sp.symbols("m N_p N_g", positive=True)
    c = (m * N_p / 2) + (m * N_g / 2)  # pitch circles tangent, centre-to-centre
    assert sp.simplify(c - m * (N_p + N_g) / 2) == 0


# ---------------------------------------------------------------------------
# 2. Hand-checkable numeric golden (default configuration)
# ---------------------------------------------------------------------------
# Inputs: N_p=18, N_g=36, m=4 mm, b=40 mm, T=100 N·m, omega_p=50 rad/s,
#         sigma_all=370 MPa, phi=20°, Barth v_b=6.1 m/s.
# By hand (Shigley §14-1, eq 14-6b metric):
#   W_t = 2T/(m N_p)      = 200 / 0.072            = 2777.78 N
#   V   = omega_p m N_p/2 = 50 * 0.004 * 9         = 1.8 m/s
#   K_v = (6.1 + V)/6.1   = 7.9/6.1                = 1.29508
#   Y_p = Table14-2(18) = 0.309 ; Y_g = Table14-2(36) = 0.3775 (interp 34→38)
#   sigma_b_p = K_v W_t/(b m Y_p) = 1.29508*2777.78/(0.04*0.004*0.309) = 72.76 MPa
#   sigma_b_g = 1.29508*2777.78/(0.04*0.004*0.3775)                    = 59.56 MPa
#   SF_p = 370/72.764 = 5.085 ; SF_g = 370/59.560 = 6.212

def test_lewis_golden_by_hand():
    N_p, N_g, m, b, T, w = 18, 36, 0.004, 0.040, 100.0, 50.0
    v_b, sigma_all = 6.1, 370e6
    rows = _table_rows()

    W_t = 2 * T / (m * N_p)
    V = w * m * N_p / 2
    K_v = (v_b + V) / v_b
    Y_p = rows[18]                       # exact node
    Y_g = rows[34] + (rows[38] - rows[34]) * (36 - 34) / (38 - 34)  # linear interp
    sigma_b_p = K_v * W_t / (b * m * Y_p)
    sigma_b_g = K_v * W_t / (b * m * Y_g)

    assert math.isclose(W_t, 2777.7778, rel_tol=1e-5)
    assert math.isclose(V, 1.8, rel_tol=1e-9)
    assert math.isclose(K_v, 1.2950820, rel_tol=1e-6)
    assert math.isclose(Y_g, 0.3775, rel_tol=1e-9)
    assert math.isclose(sigma_b_p, 72.764e6, rel_tol=1e-4)
    assert math.isclose(sigma_b_g, 59.560e6, rel_tol=1e-4)
    assert math.isclose(sigma_all / sigma_b_p, 5.0849, rel_tol=1e-4)   # SF_p
    assert math.isclose(sigma_all / sigma_b_g, 6.2122, rel_tol=1e-4)   # SF_g


def test_pinion_governs_at_equal_geometry_and_material():
    # the whole pedagogy: same load, module, material — pinion works harder
    rows = _table_rows()
    assert rows[18] < rows[36 if 36 in rows else 34]  # fewer teeth → smaller Y
    # sigma_b ∝ 1/Y and SF ∝ Y, so at equal everything else the pinion (smaller
    # Y) has the higher stress and the lower margin
    Y_p, Y_g = rows[18], rows[34] + (rows[38] - rows[34]) * 0.5
    assert Y_p < Y_g               # 0.309 < 0.3775
    assert (1 / Y_p) > (1 / Y_g)   # sigma_b,p > sigma_b,g


# ---------------------------------------------------------------------------
# 3. Cross-pin the Lewis Y DATA (independent published set + geometry)
# ---------------------------------------------------------------------------
# The standard 20° full-depth, tip-load Lewis form factor Y. Identical across
# Shigley Table 14-2, Juvinall & Marshek, and other references because they all
# derive from the same standard tooth geometry (web-corroborated 2026-07-04).
STANDARD_Y = {
    12: 0.245, 13: 0.261, 14: 0.277, 15: 0.290, 16: 0.296, 17: 0.303,
    18: 0.309, 19: 0.314, 20: 0.322, 21: 0.328, 22: 0.331, 24: 0.337,
    26: 0.346, 28: 0.353, 30: 0.359, 34: 0.371, 38: 0.384, 43: 0.397,
    50: 0.409, 60: 0.422, 75: 0.435, 100: 0.447, 150: 0.460, 300: 0.472,
    400: 0.480,
}


def test_authored_table_matches_the_independent_published_set():
    assert _table_rows() == STANDARD_Y


def test_table_is_geometrically_consistent():
    rows = _table_rows()
    teeth = sorted(rows)
    # strictly increasing in tooth count (fewer teeth = weaker, smaller Y)
    ys = [rows[n] for n in teeth]
    assert all(b > a for a, b in zip(ys, ys[1:]))
    # bounded above by the rack limit (N → ∞), Y_rack ≈ 0.485 for 20° full depth
    assert ys[-1] < 0.485
    # domain endpoints the THING relies on
    assert teeth[0] == 12 and teeth[-1] == 400
