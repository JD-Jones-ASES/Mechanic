"""Dimensional analysis: unit parsing, SI 7-vectors, homogeneity checking.

Built on sympy.physics.units (NOT pint): it operates on the same symbolic
expressions used for verification, and exports per-dimension exponents that map
directly onto the artifact's 7-vector. `SI._collect_factor_and_dimension` is
semi-private API — pinned to sympy==1.14.0 and covered by self-tests in
tests/test_dims.py (per ADR-0001/0003 risk notes).

7-vector order: [L, M, T, I, Theta, N, J]
(length, mass, time, current, temperature, amount of substance, luminous intensity)
"""

from __future__ import annotations

import sympy as sp
from sympy.physics import units as u
from sympy.physics.units.systems.si import SI, dimsys_SI

from . import BuildError

# Namespace for parsing authored `unit:` strings. Deliberately explicit — an
# unknown unit name must fail the build, not silently become a free symbol.
UNIT_NAMESPACE: dict[str, object] = {
    # SI base + named derived
    "m": u.meter, "kg": u.kilogram, "s": u.second, "A": u.ampere,
    "K": u.kelvin, "mol": u.mole, "cd": u.candela,
    "N": u.newton, "Pa": u.pascal, "J": u.joule, "W": u.watt, "Hz": u.hertz,
    "rad": u.radian, "deg": u.degree,
    # common multiples used in authored content
    "mm": u.millimeter, "cm": u.centimeter, "km": u.kilometer,
    "g": u.gram, "kPa": u.kilo * u.pascal, "MPa": u.mega * u.pascal,
    "GPa": u.giga * u.pascal, "kN": u.kilo * u.newton,
    "minute": u.minute, "hour": u.hour,
    # US customary (materials seed publishes in these)
    "inch": u.inch, "ft": u.foot, "lb": u.pound, "psi": u.psi,
    "ksi": 1000 * u.psi, "Msi": 10**6 * u.psi,
    "lbf": u.pound * u.gee,  # sympy has no pound_force; lbf = lb x standard gravity
}

_DIM_ORDER = (
    "length", "mass", "time", "current", "temperature",
    "amount_of_substance", "luminous_intensity",
)


def parse_unit(unit_str: str, context: str) -> sp.Expr:
    """Parse an authored unit string like 'N', 'kg/m**3', 'rad/s', or '1'."""
    s = unit_str.strip()
    if s in ("1", ""):
        return sp.S.One
    try:
        expr = sp.sympify(s, locals=dict(UNIT_NAMESPACE))
    except (sp.SympifyError, SyntaxError) as e:
        raise BuildError(f"{context}: cannot parse unit '{unit_str}': {e}") from e
    leftover = expr.free_symbols
    if leftover:
        raise BuildError(
            f"{context}: unit '{unit_str}' contains unknown unit name(s) {sorted(map(str, leftover))}; "
            f"add them to dims.UNIT_NAMESPACE if legitimate"
        )
    return expr


def dim_vector(unit_expr: sp.Expr, context: str) -> list[float]:
    """SI dimension exponents [L,M,T,I,Theta,N,J] of a unit expression."""
    if unit_expr == sp.S.One:
        return [0.0] * 7
    try:
        _, dim = SI._collect_factor_and_dimension(unit_expr)
    except ValueError as e:
        raise BuildError(f"{context}: cannot determine dimension: {e}") from e
    deps = dimsys_SI.get_dimensional_dependencies(dim)
    vec = [0.0] * 7
    for d, exp in deps.items():
        name = str(d.name) if hasattr(d, "name") else str(d)
        if name not in _DIM_ORDER:
            raise BuildError(f"{context}: unexpected base dimension '{name}'")
        vec[_DIM_ORDER.index(name)] = float(exp)
    return vec


_SI_BASE = (u.meter, u.kilogram, u.second, u.ampere, u.kelvin, u.mole, u.candela)


def si_factor(unit_expr: sp.Expr, context: str) -> float:
    """Multiplier converting a value in `unit_expr` to coherent SI base units.

    e.g. psi -> 6894.76 (Pa), lb/inch**3 -> 27679.9 (kg/m^3).
    Uses convert_to against the SI base units rather than raw scale factors —
    sympy's internal scale factors are gram-based, which silently inflates any
    mass-bearing unit by 1000x (golden-tested in tests/test_dims.py).
    """
    if unit_expr == sp.S.One:
        return 1.0
    converted = u.convert_to(unit_expr, list(_SI_BASE))
    factor = sp.N(converted.subs({b: 1 for b in _SI_BASE}), 15)
    if not factor.is_number:
        raise BuildError(f"{context}: unit does not reduce to a numeric SI factor: {converted}")
    return float(factor)


def _strip_minmax(expr: sp.Expr, unit_map: dict[sp.Symbol, sp.Expr], context: str) -> sp.Expr:
    """Min/Max are dimension-transparent: all arguments must share a dimension,
    and the node then carries it. _collect_factor_and_dimension does not know
    them, so check the arguments pairwise and replace the node by its first
    argument before the walk. (Used by e.g. the Grashof condition.)"""
    for node in [*expr.atoms(sp.Min), *expr.atoms(sp.Max)]:
        first = node.args[0]
        for other in node.args[1:]:
            check_homogeneous(first - other, unit_map, f"{context} (inside {type(node).__name__})")
        expr = expr.xreplace({node: first})
    return expr


def check_homogeneous(expr: sp.Expr, unit_map: dict[sp.Symbol, sp.Expr], context: str) -> None:
    """Fail the build unless `expr` is dimensionally homogeneous.

    Substitutes each variable with its unit expression and lets
    _collect_factor_and_dimension walk the result — it raises ValueError on
    mismatched additive terms and on dimensionful arguments to transcendental
    functions.
    """
    missing = [s for s in expr.free_symbols if s not in unit_map]
    if missing:
        raise BuildError(f"{context}: symbols without declared units: {sorted(map(str, missing))}")
    if expr.has(sp.Min) or expr.has(sp.Max):
        expr = _strip_minmax(expr, unit_map, context)
    substituted = expr.subs(unit_map)
    try:
        SI._collect_factor_and_dimension(substituted)
    except ValueError as e:
        raise BuildError(f"{context}: not dimensionally homogeneous: {e}") from e
    _check_function_arguments(expr, unit_map, context)


def _is_dimensionless(expr: sp.Expr, context: str) -> bool:
    if not expr.atoms(u.Quantity):
        return True
    _, dim = SI._collect_factor_and_dimension(expr)
    return dimsys_SI.get_dimensional_dependencies(dim) == {}


def _check_function_arguments(expr: sp.Expr, unit_map: dict, context: str) -> None:
    """sympy 1.14's _collect_factor_and_dimension does NOT reject sin(3*meter);
    enforce dimensionless arguments for transcendental functions ourselves.
    atan2 is special: both arguments must merely share a dimension.
    """
    for f in expr.atoms(sp.Function):
        if isinstance(f, sp.atan2):
            diff = (f.args[0] - f.args[1]).subs(unit_map)
            try:
                SI._collect_factor_and_dimension(diff)
            except ValueError as e:
                raise BuildError(f"{context}: atan2 arguments differ in dimension: {e}") from e
            continue
        if f.func.__name__ in (
            "sin", "cos", "tan", "asin", "acos", "atan", "exp", "log",
            "sinh", "cosh", "tanh",
        ):
            for arg in f.args:
                if not _is_dimensionless(arg.subs(unit_map), context):
                    raise BuildError(
                        f"{context}: argument of {f.func.__name__} must be dimensionless, got {arg}"
                    )


def check_relational_homogeneous(
    rel: sp.core.relational.Relational,
    unit_map: dict[sp.Symbol, sp.Expr],
    context: str,
) -> None:
    """Both sides of a validity condition must share a dimension."""
    check_homogeneous(rel.lhs - rel.rhs, unit_map, context)
