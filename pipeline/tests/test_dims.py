"""Self-tests for the dimension layer — including the semi-private
SI._collect_factor_and_dimension API we depend on (pinned sympy==1.14.0)."""

import pytest
import sympy as sp

from mech_pipeline import BuildError
from mech_pipeline.dims import (
    check_homogeneous, dim_vector, parse_unit, si_factor,
)


def vec(unit_str):
    return dim_vector(parse_unit(unit_str, "test"), "test")


def test_dim_vectors():
    assert vec("rad/s") == [0, 0, -1, 0, 0, 0, 0]  # angle is dimensionless
    assert vec("N") == [1, 1, -2, 0, 0, 0, 0]
    assert vec("Pa") == [-1, 1, -2, 0, 0, 0, 0]
    assert vec("kg/m**3") == [-3, 1, 0, 0, 0, 0, 0]
    assert vec("m**4") == [4, 0, 0, 0, 0, 0, 0]
    assert vec("1") == [0, 0, 0, 0, 0, 0, 0]
    assert vec("N*m") == [2, 1, -2, 0, 0, 0, 0]  # torque == energy: kinds disambiguate
    assert vec("K") == [0, 0, 0, 0, 1, 0, 0]  # temperature: the first nonzero Theta slot in the catalog
    assert vec("1/K") == [0, 0, 0, 0, -1, 0, 0]  # linear CTE dimension (Theta^-1)
    assert vec("1e-6/degF_interval") == [0, 0, 0, 0, -1, 0, 0]  # CTE per °F-interval: still Theta^-1


def test_unknown_unit_fails():
    with pytest.raises(BuildError, match="unknown unit"):
        parse_unit("furlongs", "test")


def test_homogeneity_pass():
    P, L, E, I, delta = sp.symbols("P L E I delta", positive=True)
    units = {
        P: parse_unit("N", "t"), L: parse_unit("m", "t"),
        E: parse_unit("Pa", "t"), I: parse_unit("m**4", "t"),
        delta: parse_unit("m", "t"),
    }
    check_homogeneous(delta - P * L**3 / (3 * E * I), units, "beam")


def test_homogeneity_fail():
    P, L = sp.symbols("P L", positive=True)
    units = {P: parse_unit("N", "t"), L: parse_unit("m", "t")}
    with pytest.raises(BuildError, match="homogeneous"):
        check_homogeneous(P + L, units, "bad")


def test_transcendental_argument_must_be_dimensionless():
    theta, L = sp.symbols("theta L", positive=True)
    units = {theta: parse_unit("rad", "t"), L: parse_unit("m", "t")}
    check_homogeneous(L * sp.sin(theta), units, "ok")  # rad is dimensionless: fine
    with pytest.raises(BuildError):
        check_homogeneous(sp.sin(L), units, "bad")


# Golden conversions — these guard ingest.py against silent unit mistakes.
GOLDENS = [
    ("ksi", 42.0, 289.58e6, 1e-3),        # 42 ksi -> 289.58 MPa (in Pa)
    ("Msi", 10.1, 69.64e9, 1e-3),         # 10.1 Msi -> 69.64 GPa
    ("lb/inch**3", 0.098, 2712.6, 1e-3),  # -> kg/m^3
    ("lb/ft**3", 150.0, 2402.8, 1e-3),    # 150 pcf -> kg/m^3
    ("GPa", 200.0, 200e9, 1e-9),
    ("MPa", 276.0, 276e6, 1e-9),
    # CTE conversions (S18) -> coherent SI 1/K
    ("1e-6/K", 23.6, 23.6e-6, 1e-9),               # 23.6e-6/K reads through unchanged
    ("um/(m*K)", 23.6, 23.6e-6, 1e-9),             # µm/(m·K) is numerically 1e-6/K
    ("1e-6/degF_interval", 12.8, 23.04e-6, 1e-12),  # per °F-INTERVAL -> ×1.8 EXACTLY (12.8 -> 23.04e-6/K)
]


@pytest.mark.parametrize("unit,val,expected,rtol", GOLDENS)
def test_si_factor_goldens(unit, val, expected, rtol):
    got = val * si_factor(parse_unit(unit, "t"), "t")
    assert abs(got - expected) / expected < rtol, f"{val} {unit} -> {got}, expected {expected}"


# --- Negative Theta-slot gates (S18): the temperature slot must actually participate ---

def test_temperature_difference_is_not_a_length():
    """A temperature interval carries the Theta slot, so it can never be added to a length. If the
    Theta slot did NOT participate (e.g. dT typed as dimensionless), this would silently pass."""
    dT, L = sp.symbols("dT L", positive=True)
    units = {dT: parse_unit("K", "t"), L: parse_unit("m", "t")}
    with pytest.raises(BuildError, match="homogeneous"):
        check_homogeneous(dT + L, units, "temperature-plus-length")


def test_thermal_compatibility_needs_the_length_in_alpha_L_dT():
    """thermal-assembly's compatibility term alpha*L*dT is a LENGTH only because Theta^-1 (alpha) times
    Theta (dT) cancels to a strain, which times L is a length. Drop the L and the thermal term becomes a
    bare strain — adding it to the mechanical elongation F*L/(A*E) (a length) is inhomogeneous and MUST
    fail the build. This is the machine proof that the Theta slot is load-bearing in the compatibility
    relation (brief S18: 'dropping L from an alphadT term must raise BuildError')."""
    alpha, dT, L, F, A, E = sp.symbols("alpha dT L F A E", positive=True)
    units = {
        alpha: parse_unit("1/K", "t"), dT: parse_unit("K", "t"), L: parse_unit("m", "t"),
        F: parse_unit("N", "t"), A: parse_unit("m**2", "t"), E: parse_unit("Pa", "t"),
    }
    # correct: alpha*L*dT (length) minus the mechanical elongation F*L/(A*E) (length) is homogeneous
    check_homogeneous(alpha * L * dT - F * L / (A * E), units, "thermal-compat-ok")
    # mis-authored: drop L from the thermal term -> strain minus length -> build fails
    with pytest.raises(BuildError, match="homogeneous"):
        check_homogeneous(alpha * dT - F * L / (A * E), units, "thermal-compat-missing-L")
