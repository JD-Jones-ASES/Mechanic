"""First-principles cross-check for beam-shear-flow (CLAUDE.md invariant 5).

This RE-DERIVES the transverse-shear formula τ = VQ/(Ib) from the equilibrium of
a beam slice — it does NOT import thing.yaml's residuals. The chain:

  σ(x,y) = M(x)·y/I         (flexure)
  dM/dx  = V                (shear is the moment gradient)
  ⇒ dσ/dx = (V/I)·y

Isolate the sliver of beam ABOVE a horizontal cut at height y1 and sum forces
along the axis: the unbalanced push from the stress gradient over that area is
resisted only by longitudinal shear on the cut (width b). That balance,

  τ(y1)·b = ∫_{y1}^{h/2} (dσ/dx)·b dy = (V/I)·∫_{y1}^{h/2} y·b dy = V·Q(y1)/I,

gives τ = VQ/(Ib) with Q(y1) the first moment of the area beyond the cut. Two
consistency theorems then fall out and are asserted here:
  1. τ_max = 3V/(2A) at the neutral axis (y1 = 0), for the rectangle.
  2. ∫ τ dA over the whole section returns EXACTLY V — the parabola carries the
     shear it is supposed to.
The shear flow q = τ·b = VQ/I and the fastener force F = q·s follow by definition.

Golden (hand-checkable, arithmetic on the formulas above): a built-up beam with
V = 12 kN, rectangular section b = 40 mm, h = 180 mm, fastener spacing s = 75 mm:
  I = bh³/12 = 1.944e-5 m⁴,  Q_na = bh²/8 = 1.62e-4 m³
  τ_max = 3V/2A = 3·12000/(2·0.0072) = 2.5 MPa
  q = V·Q_na/I = 12000·1.62e-4/1.944e-5 = 100 000 N/m = 100 N/mm
  F = q·s = 100 000·0.075 = 7500 N
"""

import math
from pathlib import Path

import sympy as sp
import yaml

THING = (
    Path(__file__).resolve().parents[1].parent
    / "site" / "src" / "content" / "things" / "beam-shear-flow"
)


# ---------------------------------------------------------------------------
# 1. τ = VQ/(Ib) re-derived symbolically from the bending-stress gradient
# ---------------------------------------------------------------------------

def test_shear_formula_from_equilibrium():
    V, b, h, y, y1 = sp.symbols("V b h y y1", positive=True)
    I = b * h**3 / 12
    # dσ/dx = (V/I)·y ; integrate the unbalanced axial force over the area above
    # the cut, divide by the cut width b -> the shear stress there
    axial_gradient = sp.integrate((V / I) * y * b, (y, y1, h / 2))
    tau = axial_gradient / b
    # first moment of the area above the cut, about the neutral axis
    Q = sp.integrate(y * b, (y, y1, h / 2))
    # the derived stress must equal V·Q/(I·b) identically in y1
    assert sp.simplify(tau - V * Q / (I * b)) == 0


def test_tau_max_is_three_halves_the_average():
    V, b, h, y, y1 = sp.symbols("V b h y y1", positive=True)
    I = b * h**3 / 12
    tau = sp.integrate((V / I) * y * b, (y, y1, h / 2)) / b
    tau_na = tau.subs(y1, 0)               # neutral axis
    A = b * h
    assert sp.simplify(tau_na - 3 * V / (2 * A)) == 0
    # and it is a parabola: zero at the free surface y1 = h/2
    assert sp.simplify(tau.subs(y1, h / 2)) == 0


def test_shear_profile_integrates_back_to_V():
    """The whole point of the distribution: summed over the section it is the
    shear force V, exactly — nothing invented, nothing lost."""
    V, b, h, y = sp.symbols("V b h y", positive=True)
    I = b * h**3 / 12
    # τ(y) written directly over the section coordinate y (−h/2..h/2)
    tau_of_y = (V / (2 * I)) * ((h / 2) ** 2 - y**2)
    resultant = sp.integrate(tau_of_y * b, (y, -h / 2, h / 2))
    assert sp.simplify(resultant - V) == 0


def test_shear_flow_is_stress_times_width():
    V, b, h = sp.symbols("V b h", positive=True)
    I = b * h**3 / 12
    Q_na = b * h**2 / 8
    tau_max = 3 * V / (2 * b * h)
    q = V * Q_na / I
    assert sp.simplify(q - tau_max * b) == 0   # q = τ·b at the neutral axis


# ---------------------------------------------------------------------------
# 2. Hand-checkable numeric golden (built-up beam, clean numbers)
# ---------------------------------------------------------------------------

def test_golden_built_up_fastener_spacing():
    V, b, h, s = 12000.0, 0.040, 0.180, 0.075
    A = b * h
    I = b * h**3 / 12
    Q_na = b * h**2 / 8
    tau_max = 3 * V / (2 * A)
    q = V * Q_na / I
    F = q * s
    assert math.isclose(I, 1.944e-5, rel_tol=1e-9)
    assert math.isclose(Q_na, 1.62e-4, rel_tol=1e-9)
    assert math.isclose(tau_max, 2.5e6, rel_tol=1e-9)      # 2.5 MPa
    assert math.isclose(q, 1.0e5, rel_tol=1e-9)            # 100 N/mm
    assert math.isclose(F, 7500.0, rel_tol=1e-9)           # 7.5 kN per fastener


# ---------------------------------------------------------------------------
# 3. Drift guard: the authored thing.yaml solves for exactly these formulas
# ---------------------------------------------------------------------------

def test_authored_solutions_match_first_principles():
    raw = yaml.safe_load((THING / "thing.yaml").read_text(encoding="utf-8"))
    sol = next(c for c in raw["configurations"] if c["id"] == "shear-in")["solutions"]
    V, b, h, s, A, I = sp.symbols("V b h s A I", positive=True)
    env = {"V": V, "b": b, "h": h, "s": s, "A": A, "I": I}
    # τ_max, q, F as authored, with A and I back-substituted
    tau_max = sp.sympify(sol["tau_max"], locals=env).subs(A, b * h)
    q = sp.sympify(sol["q"], locals=env).subs(I, b * h**3 / 12)
    assert sp.simplify(tau_max - 3 * V / (2 * b * h)) == 0
    assert sp.simplify(q - V * (b * h**2 / 8) / (b * h**3 / 12)) == 0
    # the peak-to-average ratio the page advertises is exactly 3/2
    tau_avg = sp.sympify(sol["tau_avg"], locals=env).subs(A, b * h)
    assert sp.simplify(tau_max / tau_avg - sp.Rational(3, 2)) == 0
