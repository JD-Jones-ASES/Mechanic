import pytest
import sympy as sp

from mech_pipeline import BuildError
from mech_pipeline.emit_js import auto_guards, check_powers, emit_function


def test_emit_simple():
    P, L, E, I = sp.symbols("P L E I", positive=True)
    js = emit_function("f", P * L**3 / (3 * E * I), "t")
    assert "f: ({ E, I, L, P }: VarRecord)" in js
    assert "Math.pow" in js or "**" not in js


def test_emit_trig_and_atan2():
    x, y = sp.symbols("x y", real=True)
    js = emit_function("g", sp.atan2(y, x) + sp.sin(x), "t")
    assert "Math.atan2(y, x)" in js
    assert "Math.sin(x)" in js


def test_emit_boolean_predicate():
    d, L = sp.symbols("delta L", positive=True)
    js = emit_function("p", sp.Lt(d / L, sp.Rational(1, 10)), "t", boolean=True)
    assert "<" in js


def test_fractional_power_of_possibly_negative_base_rejected():
    x = sp.Symbol("x", real=True)  # not provably nonnegative
    with pytest.raises(BuildError, match="fractional power"):
        check_powers(x ** sp.Rational(1, 3), "t")
    xp = sp.Symbol("xp", positive=True)
    check_powers(xp ** sp.Rational(1, 3), "t")  # fine when positive


def test_auto_guards_denominator():
    omega_r, omega_c = sp.symbols("omega_r omega_c", real=True)
    guards = auto_guards(1 / (omega_r - omega_c), "g0", "ratio")
    kinds = [g[2] for g in guards]
    assert "nonzero" in kinds


def test_auto_guards_sqrt():
    x = sp.Symbol("x", real=True)
    guards = auto_guards(sp.sqrt(x - 1), "g0", "root")
    assert any(g[2] == "nonneg" for g in guards)
