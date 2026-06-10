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
]


@pytest.mark.parametrize("unit,val,expected,rtol", GOLDENS)
def test_si_factor_goldens(unit, val, expected, rtol):
    got = val * si_factor(parse_unit(unit, "t"), "t")
    assert abs(got - expected) / expected < rtol, f"{val} {unit} -> {got}, expected {expected}"
