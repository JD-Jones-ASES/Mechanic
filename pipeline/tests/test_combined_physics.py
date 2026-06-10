"""Independent physics cross-check for the combined-shaft THING: derive the
worst-plane shear from the EIGENVALUES of the stress tensor (no Mohr's-circle
formula assumed), derive von Mises from the principal stresses, prove the two
criteria's ratio is bracketed by [1, 2/√3] with the endpoints at pure bending
and pure torsion, verify the equivalent-torque form and the size-diameter
closed form, and pin a hand golden."""

import math

import sympy as sp

sigma, tau = sp.symbols("sigma tau", positive=True)
M, T, d = sp.symbols("M T d", positive=True)


def test_max_shear_is_the_eigenvalue_half_spread():
    """τ_max = (σ₁ − σ₂)/2 from the tensor's eigenvalues must equal the
    authored √((σ/2)² + τ²) — Mohr's circle re-derived as linear algebra."""
    A = sp.Matrix([[sigma, tau], [tau, 0]])
    eigs = list(A.eigenvals().keys())
    spread = sp.simplify(sp.Abs(eigs[0] - eigs[1]) / 2)
    assert sp.simplify(spread - sp.sqrt((sigma / 2) ** 2 + tau**2)) == 0


def test_von_mises_from_principal_stresses():
    """σ'² = σ₁² − σ₁σ₂ + σ₂² (plane stress, third principal zero) must reduce
    to the authored σ² + 3τ² — the deviatoric-invariant route."""
    A = sp.Matrix([[sigma, tau], [tau, 0]])
    s1, s2 = list(A.eigenvals().keys())
    vm2 = sp.simplify(s1**2 - s1 * s2 + s2**2)
    assert sp.simplify(vm2 - (sigma**2 + 3 * tau**2)) == 0


def test_criteria_bracket():
    """ratio² = (2τ_max/σ')² = (σ² + 4τ²)/(σ² + 3τ²): equals 1 at τ = 0 (pure
    bending — the criteria agree) and 4/3 at σ = 0 (pure torsion — Tresca
    2/√3 ≈ 1.155 more conservative); strictly between otherwise since the
    numerator exceeds the denominator by exactly τ²."""
    ratio2 = (sigma**2 + 4 * tau**2) / (sigma**2 + 3 * tau**2)
    assert sp.simplify(ratio2.subs(tau, 0)) == 1
    assert sp.simplify(ratio2.subs(sigma, 0) - sp.Rational(4, 3)) == 0
    num, den = sp.fraction(sp.together(ratio2))
    assert sp.simplify(num - den - tau**2) == 0  # gap is exactly τ² > 0
    assert abs(float(sp.sqrt(sp.Rational(4, 3))) - 2 / math.sqrt(3)) < 1e-12


def test_equivalent_torque_form():
    """With σ = 32M/πd³ and τ = 16T/πd³, the worst shear collapses to
    (16/πd³)·√(M² + T²) — the equivalent-torque shortcut."""
    s = 32 * M / (sp.pi * d**3)
    t = 16 * T / (sp.pi * d**3)
    tmax = sp.sqrt((s / 2) ** 2 + t**2)
    assert sp.simplify(tmax - 16 * sp.sqrt(M**2 + T**2) / (sp.pi * d**3)) == 0


def test_size_diameter_round_trip():
    """The design closed form d = (16√(M²+T²)/(π·τ_allow))^(1/3) substituted
    back gives exactly the allowable worst-plane shear."""
    tau_a = sp.symbols("tau_a", positive=True)
    d_req = (16 * sp.sqrt(M**2 + T**2) / (sp.pi * tau_a)) ** sp.Rational(1, 3)
    s = 32 * M / (sp.pi * d_req**3)
    t = 16 * T / (sp.pi * d_req**3)
    back = sp.simplify(sp.sqrt((s / 2) ** 2 + t**2))
    assert sp.simplify(back - tau_a) == 0


def test_numeric_golden():
    """Hand-checkable at the declared defaults (M = 200 N·m, T = 500 N·m,
    d = 40 mm, σ_y = 250 MPa, ρ = 7850, L = 1 m):
      σ_b = 32·200/π(0.04)³ = 31.83 MPa     τ_t = 16·500/π(0.04)³ = 39.79 MPa
      τ_max = √(15.915² + 39.789²) = 42.85 MPa     σ' = √(σ_b² + 3τ_t²) = 75.91 MPa
      SF_T = 125/42.85 = 2.917      SF_DE = 250/75.91 = 3.293      m = 9.86 kg
    And the criteria gap: SF_DE/SF_T = 2τ_max/σ' = 1.129 — inside [1, 1.155]."""
    M_, T_, d_, L_ = 200.0, 500.0, 0.04, 1.0
    sy, rho = 250.0e6, 7850.0
    pd3 = math.pi * d_**3
    sb = 32 * M_ / pd3
    tt = 16 * T_ / pd3
    assert abs(sb - 31.831e6) / 31.831e6 < 1e-4
    assert abs(tt - 39.789e6) / 39.789e6 < 1e-4
    tmax = math.hypot(sb / 2, tt)
    assert abs(tmax - 42.853e6) / 42.853e6 < 1e-4
    svm = math.sqrt(sb**2 + 3 * tt**2)
    assert abs(svm - 75.913e6) / 75.913e6 < 1e-4
    assert abs(sy / (2 * tmax) - 2.9170) < 1e-3
    assert abs(sy / svm - 3.2932) < 1e-3
    assert abs(rho * math.pi * d_**2 * L_ / 4 - 9.8646) < 1e-3
    ratio = 2 * tmax / svm
    assert 1.0 < ratio < 2 / math.sqrt(3)
    assert abs(ratio - 1.1290) < 1e-3
    # equivalent torque agrees
    assert abs(16 * math.hypot(M_, T_) / pd3 - tmax) / tmax < 1e-12
