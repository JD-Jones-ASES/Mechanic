"""Verification: the tiered equivalence checker, solution and derivation checks,
and DOF arithmetic.

Design (ADR-0002): authored solutions are the PRIMARY path; this module proves
them correct against the undirected relations. Blind solve() is not used at all
in v1 — it verifiably hangs on raw loop-closure trig systems.

The tiered checker is semi-decidable by nature: simplify() and .equals() can
both fail to certify a true identity, so the high-precision numeric tier is
load-bearing and intentionally last (sampling at 50 dps, tolerance 1e-40,
deterministic seed per check context).
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field

import sympy as sp

from . import BuildError

NUM_SAMPLES = 30
PRECISION_DPS = 50
TOLERANCE = sp.Float("1e-40")
# solve1d back-substitution tolerance: the bisection root is found at 60 dps,
# so every relation residual at the rooted point sits ~1e-45 or below for any
# honest configuration, while a wrong bracket/solution lands at O(1)+. Looser
# than TOLERANCE only because the root is numeric, not symbolic.
SOLVE1D_TOLERANCE = sp.Float("1e-25")
SOLVE1D_GRID = 33  # interior sign-change scan: detects multi-root brackets
# simplify() is super-linear and can effectively hang on large trig/radical
# expressions (the blind-solve lesson, ADR-0002). Above this op count the
# symbolic tiers are skipped and the high-precision numeric tier decides.
SIMPLIFY_OPS_CAP = 200
# Numeric-rank zero threshold for the DOF check on transcendental manifolds:
# entries are evaluated at 50 dps, so a truly dependent row collapses to
# ~1e-49 — far below the chop — while generic entries are O(1).
RANK_CHOP = sp.Float("1e-30")


@dataclass
class VarSpec:
    symbol: sp.Symbol
    unit: sp.Expr
    quantity_kind: str
    role: str  # free | material | derived
    default: float
    bounds: tuple[float, float] | None
    integer: bool
    dim: list[float] = field(default_factory=lambda: [0.0] * 7)
    name: str = ""
    latex: str = ""
    display_units: list[str] = field(default_factory=list)


@dataclass
class TableSpec:
    """A compiled tabulated relation (ADR-0009). `rows` are high-precision
    Floats ([arg, col1, ...], strictly increasing arg) used by the verifier;
    the artifact embeds the same values as JS numbers. `columns` are the
    declared template variables the lookup fills (dimensional/kind checks ride
    on them at the consumption site)."""

    id: str
    name: str
    citation: str
    provenance: str
    interpolation_citation: str | None
    arg: str
    arg_integer: bool
    columns: list[str]
    mode: str  # interpolate-linear | exact-row
    rows: list[list[sp.Float]]


def table_lookup_ref(rows: list[list[sp.Float]], arg, mode: str, col: int):
    """Reference lookup mirroring site/src/engines/table.ts EXACTLY (`col` is
    1-based into the row; index 0 is the argument). Returns `sp.nan` on a
    refusal — out of domain (interpolate-linear) or a non-row arg (exact-row) —
    so the browser's NaN-refusal and this oracle cannot diverge."""
    n = len(rows)
    if n == 0:
        return sp.nan
    for i in range(n):
        if arg == rows[i][0]:  # exact node hit: stored value, no interpolation
            return rows[i][col]
    if mode == "exact-row":
        return sp.nan
    if arg < rows[0][0] or arg > rows[n - 1][0]:  # strictly outside the domain
        return sp.nan
    for i in range(n - 1):
        x0, x1 = rows[i][0], rows[i + 1][0]
        if x0 <= arg <= x1:
            y0, y1 = rows[i][col], rows[i + 1][col]
            return y0 + (y1 - y0) * (arg - x0) / (x1 - x0)
    return sp.nan  # unreachable once the domain check has passed


def _sample_value(spec: VarSpec, rng: random.Random) -> sp.Rational:
    """A random exact rational inside the variable's bounds (so evalf can hit 50 dps)."""
    lo, hi = spec.bounds if spec.bounds else (0.1, 10.0)
    if spec.symbol.is_positive and lo <= 0:
        lo = max(lo, 1e-3) if hi > 1e-3 else hi / 100
    if spec.integer:
        lo_i, hi_i = max(int(lo), 1 if spec.symbol.is_positive else int(lo)), int(hi)
        if hi_i < lo_i:
            hi_i = lo_i
        return sp.Integer(rng.randint(lo_i, hi_i))
    num = rng.randint(1, 10_000)
    return sp.Rational(num, 10_000) * sp.Rational(str(hi - lo)) + sp.Rational(str(lo))


def tiered_zero(
    expr: sp.Expr,
    specs: dict[sp.Symbol, VarSpec],
    context: str,
    seed: str,
) -> None:
    """Prove `expr` is identically zero over the declared domain, or fail the build."""
    expr = sp.together(expr)
    # ALL symbolic tiers are gated on size: simplify() AND equals() are
    # super-linear and can effectively hang on loop-closure-sized trig/radical
    # expressions (the blind-solve lesson, ADR-0002). Large expressions go
    # straight to the high-precision numeric tier.
    if sp.count_ops(expr) <= SIMPLIFY_OPS_CAP:
        # Tier 1: structural simplification
        if sp.simplify(expr) == 0:
            return
        # Tier 2: equals() (random-evaluation backed, can return None on true identities)
        if expr.equals(0) is True:
            return
        # Tier 3: exp rewrite catches trig identities tiers 1-2 miss
        if sp.simplify(expr.rewrite(sp.exp)) == 0:
            return
    # Tier 4: high-precision numeric sampling over the declared domain.
    # Solutions may be partial-domain (a four-bar assembles only where the
    # discriminant is nonnegative): complex/singular samples are domain holes
    # to resample, NOT failures — but enough real samples must exist or the
    # identity is uncertified.
    rng = random.Random(seed)
    free = sorted(expr.free_symbols, key=str)
    unknown = [s for s in free if s not in specs]
    if unknown:
        raise BuildError(f"{context}: cannot sample undeclared symbols {list(map(str, unknown))}")
    valid = 0
    attempts = 0
    while valid < NUM_SAMPLES and attempts < 20 * NUM_SAMPLES:
        attempts += 1
        subs = {s: _sample_value(specs[s], rng) for s in free}
        try:
            val = expr.evalf(PRECISION_DPS, subs=subs, chop=True)
        except (ValueError, ZeroDivisionError):
            continue  # landed on a removable singularity; resample
        if not val.is_number or val.has(sp.zoo, sp.oo, sp.nan) or val.is_real is not True:
            continue  # off the real domain (e.g. non-assembling linkage); resample
        valid += 1
        if abs(val) > TOLERANCE:
            raise BuildError(
                f"{context}: NOT an identity — residual {sp.N(val, 6)} at sample {attempts} "
                f"{ {str(k): str(v) for k, v in subs.items()} }"
            )
    if valid < max(10, NUM_SAMPLES // 3):
        raise BuildError(
            f"{context}: only {valid} real-valued samples found in the declared domain after "
            f"{attempts} attempts — cannot certify the identity (check variable bounds)"
        )
    return  # symbolic tiers undecided, numeric tier passed (documented semi-decidability)


def resolve_solutions(
    solutions: list[tuple[sp.Symbol, sp.Expr]],
    constraints: dict[sp.Symbol, sp.Expr],
    context: str,
) -> dict[sp.Symbol, sp.Expr]:
    """Express every solved target in terms of inputs/material vars only.

    Authored solutions may reference earlier targets (evaluated in order);
    here we substitute the chain flat so verification and sampling see closed
    forms over the configuration's actual independents.
    """
    resolved: dict[sp.Symbol, sp.Expr] = dict(constraints)
    for target, expr in solutions:
        flat = expr.subs(resolved)
        if target in flat.free_symbols:
            raise BuildError(f"{context}: solution for {target} references itself")
        resolved[target] = sp.together(flat)
    return resolved


def verify_solutions_against_relations(
    residuals: list[tuple[str, sp.Expr]],
    resolved: dict[sp.Symbol, sp.Expr],
    specs: dict[sp.Symbol, VarSpec],
    context: str,
) -> None:
    """Back-substitute the resolved solutions into every relation residual."""
    for rel_id, residual in residuals:
        substituted = residual.subs(resolved)
        tiered_zero(substituted, specs, f"{context}: relation '{rel_id}'", seed=f"{context}/{rel_id}")


def verify_derivation_step(
    step_eq: sp.Expr,
    check_mode: str,
    local_defs: dict[sp.Symbol, sp.Expr],
    resolved: dict[sp.Symbol, sp.Expr],
    specs: dict[sp.Symbol, VarSpec],
    context: str,
) -> None:
    """`identity` steps must reduce to 0 == 0 under local definitions + verified
    solutions. `definition` steps introduce modeling facts (where physics enters);
    they are dimension-checked elsewhere and flagged for human review in the UI.
    """
    if check_mode == "definition":
        return
    if not isinstance(step_eq, sp.Eq):
        raise BuildError(f"{context}: identity step must be an Eq(...)")
    diff = (step_eq.lhs - step_eq.rhs).subs(local_defs).subs(resolved)
    # locals may be defined in terms of other locals
    for _ in range(3):
        if not (set(diff.free_symbols) & set(local_defs)):
            break
        diff = diff.subs(local_defs)
    tiered_zero(diff, specs, context, seed=context)


def verify_solve1d_configuration(
    inputs: list[sp.Symbol],
    known_syms: list[sp.Symbol],
    constraints: dict[sp.Symbol, sp.Expr],
    ordered_steps: list[tuple],
    residuals: list[tuple[str, sp.Expr]],
    specs: dict[sp.Symbol, VarSpec],
    context: str,
) -> tuple[list[dict], list[dict[sp.Symbol, sp.Expr]]]:
    """The numeric verification campaign for a configuration containing
    `solve1d` plan steps (ADR-0002: bracketed root-finding is the ONLY
    sanctioned non-closed-form path — there is still no blind solve()).

    A solve1d target has no closed form to back-substitute symbolically, so
    the certificate is numeric and per-sample, at high precision:

      1. sample the inputs + known variables — materials and cited constants
         (exact rationals);
      2. evaluate the eval-chain at 60 dps;
      3. at each solve1d step: prove the authored bracket actually brackets
         (real, finite, lo < hi, residual sign change) and contains exactly
         one root on a sign-scan grid, then root it with mpmath bisection at
         60 dps via sp.nsolve — bracketed, never blind;
      4. back-substitute the fully-rooted point into EVERY relation residual
         and require it to vanish below SOLVE1D_TOLERANCE.

    Any failure is a BuildError naming the configuration, step and sample.
    Returns (parity_samples, manifold_points): float samples for the JS
    parity oracle (the browser's Brent is checked against these roots), and
    high-precision on-manifold points for the Jacobian-rank DOF check (kept
    as Floats so the rank check takes its numeric path — these points are
    accurate to ~1e-60, not exact, and exact rational rank would overcount).
    """
    rng = random.Random(context)
    free_syms = [*inputs, *known_syms]
    parity: list[dict] = []
    points: list[dict[sp.Symbol, sp.Expr]] = []
    done = 0
    attempts = 0
    while done < NUM_SAMPLES and attempts < 20 * NUM_SAMPLES:
        attempts += 1
        known: dict[sp.Symbol, sp.Expr] = {s: _sample_value(specs[s], rng) for s in free_syms}
        for sym, val in constraints.items():
            known[sym] = val.subs(known) if val.free_symbols else val
        hole = False
        for step in ordered_steps:
            if step[0] == "eval":
                _, target, expr = step
                val = expr.subs(known).evalf(60, chop=True)
                if not val.is_number or val.has(sp.zoo, sp.oo, sp.nan) or val.is_real is not True:
                    hole = True  # off the real domain at this sample; resample
                    break
                known[target] = val
            else:  # ("solve1d", target, residual, blo, bhi, rel_id)
                _, target, residual, blo, bhi, rel_id = step
                sc = f"{context}, solve1d '{target}' (relation '{rel_id}')"
                lo = blo.subs(known).evalf(60, chop=True)
                hi = bhi.subs(known).evalf(60, chop=True)
                if not (lo.is_number and hi.is_number) or not (lo.is_real and hi.is_real):
                    raise BuildError(f"{sc}: bracket endpoints are not real at sample {attempts}")
                if not lo < hi:
                    raise BuildError(f"{sc}: bracket is empty (lo={sp.N(lo, 6)} >= hi={sp.N(hi, 6)}) at sample {attempts}")
                r1 = residual.subs({k: v for k, v in known.items() if k != target})
                extra = r1.free_symbols - {target}
                if extra:
                    raise BuildError(f"{sc}: residual still reads {sorted(map(str, extra))} — not solvable in one unknown")
                f_lo = r1.subs(target, lo).evalf(60, chop=True)
                f_hi = r1.subs(target, hi).evalf(60, chop=True)
                if not (f_lo.is_real and f_hi.is_real and f_lo.is_number and f_hi.is_number):
                    raise BuildError(f"{sc}: residual is not real at a bracket endpoint, sample {attempts}")
                if f_lo * f_hi >= 0:
                    raise BuildError(
                        f"{sc}: bracket does NOT produce a sign change at sample {attempts} "
                        f"(f(lo)={sp.N(f_lo, 6)}, f(hi)={sp.N(f_hi, 6)}; "
                        f"inputs { {str(k): str(sp.N(v, 8)) for k, v in known.items() if k in free_syms} })"
                    )
                # sign-scan: an endpoint sign change proves an odd root count;
                # the grid rejects 3+ roots (an ambiguous widget answer)
                flips = 0
                prev = f_lo
                for gi in range(1, SOLVE1D_GRID + 1):
                    x = lo + (hi - lo) * sp.Rational(gi, SOLVE1D_GRID + 1)
                    fx = r1.subs(target, x).evalf(60, chop=True)
                    if not (fx.is_number and fx.is_real):
                        continue  # grid point off-domain: endpoint certificate still stands
                    if fx != 0 and prev != 0 and fx * prev < 0:
                        flips += 1
                    prev = fx
                if prev * f_hi < 0:
                    flips += 1
                if flips > 1:
                    raise BuildError(
                        f"{sc}: bracket contains MULTIPLE roots ({flips} sign changes on a "
                        f"{SOLVE1D_GRID}-point scan) at sample {attempts} — tighten the bracket"
                    )
                try:
                    # bisection halves once per step: 60-dps tolerance needs
                    # ~210 halvings, far past mpmath's default step cap
                    root = sp.nsolve(r1, target, (lo, hi), solver="bisect", prec=60, maxsteps=500)
                except (ValueError, ZeroDivisionError) as e:
                    raise BuildError(f"{sc}: bisection failed at sample {attempts}: {e}") from e
                known[target] = sp.Float(root, 60)
        if hole:
            continue
        # the rooted point must satisfy EVERY relation (and constraint), not
        # just the one that was solved — the same total check closed forms get
        for rel_id, res in residuals:
            val = res.subs(known).evalf(PRECISION_DPS, chop=True)
            if not val.is_number or val.is_real is not True:
                raise BuildError(f"{context}: relation '{rel_id}' not real at rooted sample {attempts}")
            if abs(val) > SOLVE1D_TOLERANCE:
                raise BuildError(
                    f"{context}: relation '{rel_id}' residual {sp.N(val, 6)} ≠ 0 at the rooted "
                    f"sample {attempts} — the solve1d chain does not satisfy the relations"
                )
        done += 1
        if len(parity) < 3:
            parity.append({
                "inputs": {str(s): float(known[s]) for s in free_syms},
                "outputs": {
                    str(t): float(known[t])
                    for t in known
                    if t not in free_syms and t not in constraints
                },
            })
            points.append(dict(known))
    if done < max(10, NUM_SAMPLES // 3):
        raise BuildError(
            f"{context}: only {done} real-valued solve1d samples found after {attempts} "
            f"attempts — cannot certify the configuration (check variable bounds)"
        )
    return parity, points


def verify_table(table: TableSpec, context: str) -> None:
    """Structural + node-exact + refusal certificate for one table (ADR-0009,
    verification parts 1, 2, 4). Fails the build loudly on any violation.

      1. STRUCTURAL: mode legal (interpolate-linear | exact-row ship now;
         threshold is schema-reserved and rejected here); interpolate needs an
         interpolation_citation; ≥2 rows; each row is [arg, col1, ...]; args
         strictly increasing and finite; integer-arg tables need integer rows.
      2. NODE-EXACT: the reference lookup at every row's arg returns that row's
         stored value bit-exactly — no interpolation arithmetic runs at a node,
         so yaml → artifact drift is impossible to hide.
      4. REFUSAL PROVEN: an out-of-domain arg (interpolate) or a between-rows
         arg (exact-row) makes the lookup non-finite — the honest refuse signal.
    (Part 3, the residual back-substitution, needs the configuration and lives
    in verify_table_configuration; part 5 is the /verification/ audit surface.)
    """
    c = f"{context}, table '{table.id}'"
    ncol = len(table.columns)
    if table.mode not in ("interpolate-linear", "exact-row"):
        raise BuildError(
            f"{c}: mode '{table.mode}' is not yet built — interpolate-linear and "
            f"exact-row ship; threshold is schema-reserved until its consumer arrives"
        )
    if table.mode.startswith("interpolate") and not table.interpolation_citation:
        raise BuildError(f"{c}: interpolate-* mode requires an interpolation_citation")
    if len(table.rows) < 2:
        raise BuildError(f"{c}: needs at least 2 rows")
    prev = None
    for ri, row in enumerate(table.rows):
        if len(row) != 1 + ncol:
            raise BuildError(
                f"{c}: row {ri} has {len(row)} value(s), expected {1 + ncol} "
                f"(arg + {ncol} column(s))"
            )
        for x in row:
            if not bool(x.is_finite):
                raise BuildError(f"{c}: row {ri} has a non-finite value {x}")
        arg = row[0]
        if prev is not None and not bool(arg > prev):
            raise BuildError(
                f"{c}: arg column must be strictly increasing (row {ri}: {arg} not > {prev})"
            )
        # numeric fractional-part test — a structural `arg != floor(arg)` is
        # always True (Float vs Integer differ by type), which would misfire
        if table.arg_integer and bool(sp.Abs(arg - sp.floor(arg)) > sp.Float("1e-30")):
            raise BuildError(
                f"{c}: arg variable '{table.arg}' is integer, but row {ri} arg {arg} is not"
            )
        prev = arg
    # part 2 — node-exact
    for ri, row in enumerate(table.rows):
        for col in range(1, ncol + 1):
            got = table_lookup_ref(table.rows, row[0], table.mode, col)
            if got is sp.nan or got != row[col]:
                raise BuildError(
                    f"{c}: NODE-EXACT failed at row {ri}, column {col}: "
                    f"lookup={got} but stored={row[col]}"
                )
    # part 4 — refusal proven, not assumed
    lo, hi = table.rows[0][0], table.rows[-1][0]
    if table.mode == "interpolate-linear":
        for probe in (lo - 1, hi + 1):
            if table_lookup_ref(table.rows, probe, table.mode, 1) is not sp.nan:
                raise BuildError(f"{c}: out-of-domain arg {probe} did NOT refuse (part 4)")
    else:  # exact-row: a strictly-between-rows arg must refuse
        mid = (table.rows[0][0] + table.rows[1][0]) / 2
        if mid != table.rows[0][0] and table_lookup_ref(table.rows, mid, table.mode, 1) is not sp.nan:
            raise BuildError(f"{c}: exact-row non-row arg {mid} did NOT refuse (part 4)")


def verify_table_configuration(
    inputs: list[sp.Symbol],
    known_syms: list[sp.Symbol],
    constraints: dict[sp.Symbol, sp.Expr],
    ordered_steps: list[tuple],
    residuals: list[tuple[str, sp.Expr]],
    tables: dict[str, TableSpec],
    specs: dict[sp.Symbol, VarSpec],
    context: str,
) -> tuple[list[dict], list[dict[sp.Symbol, sp.Expr]]]:
    """The per-sample certificate for a configuration containing `table` plan
    steps (ADR-0009 verification part 3). A table output has no closed form, so
    — exactly like solve1d — the certificate is numeric and per-sample:

      1. sample the inputs + known variables — materials and cited constants
         (exact rationals);
      2. run the plan at 60 dps, resolving each table step by the reference
         lookup (samples are drawn inside the domain; the refusal path is proven
         separately in verify_table);
      3. back-substitute the fully-populated point into EVERY relation residual
         and require it to vanish — the looked-up values join the residual-zero
         certificate that closed forms and solve1d roots already get.

    Returns (parity_samples, manifold_points): float samples for the JS parity
    oracle (the browser's linear interpolation is pinned against these), and the
    on-manifold points for the DOF Jacobian-rank check.
    """
    rng = random.Random(context)
    free_syms = [*inputs, *known_syms]
    parity: list[dict] = []
    points: list[dict[sp.Symbol, sp.Expr]] = []
    done = 0
    attempts = 0
    while done < NUM_SAMPLES and attempts < 40 * NUM_SAMPLES:
        attempts += 1
        known: dict[sp.Symbol, sp.Expr] = {s: _sample_value(specs[s], rng) for s in free_syms}
        for sym, val in constraints.items():
            known[sym] = val.subs(known) if val.free_symbols else val
        hole = False
        for step in ordered_steps:
            if step[0] == "eval":
                _, target, expr = step
                val = expr.subs(known).evalf(60, chop=True)
                if not val.is_number or val.has(sp.zoo, sp.oo, sp.nan) or val.is_real is not True:
                    hole = True
                    break
                known[target] = val
            else:  # ("table", target, table_id, arg_expr, col) — col is 1-based
                _, target, table_id, arg_expr, col = step
                tbl = tables[table_id]
                arg_val = arg_expr.subs(known).evalf(60, chop=True)
                if not arg_val.is_number or arg_val.is_real is not True:
                    hole = True
                    break
                lo, hi = tbl.rows[0][0], tbl.rows[-1][0]
                if bool(arg_val < lo) or bool(arg_val > hi):
                    hole = True  # out of domain: refusal proven elsewhere; resample
                    break
                y = table_lookup_ref(tbl.rows, arg_val, tbl.mode, col)
                if y is sp.nan:
                    hole = True  # exact-row miss on a sampled arg: resample
                    break
                known[target] = sp.Float(y, 50)
        if hole:
            continue
        # the fully-populated point must satisfy EVERY relation — the same total
        # back-substitution closed forms and solve1d roots get. Tolerance is the
        # numeric SOLVE1D_TOLERANCE: the looked-up value is a Float, not symbolic.
        for rel_id, res in residuals:
            val = res.subs(known).evalf(PRECISION_DPS, chop=True)
            if not val.is_number or val.is_real is not True:
                raise BuildError(f"{context}: relation '{rel_id}' not real at table sample {attempts}")
            if abs(val) > SOLVE1D_TOLERANCE:
                raise BuildError(
                    f"{context}: relation '{rel_id}' residual {sp.N(val, 6)} ≠ 0 at table "
                    f"sample {attempts} — the table/solution chain does not satisfy the relations"
                )
        done += 1
        if len(parity) < 3:
            parity.append({
                "inputs": {str(s): float(known[s]) for s in free_syms},
                "outputs": {
                    str(t): float(known[t])
                    for t in known
                    if t not in free_syms and t not in constraints
                },
            })
            points.append(dict(known))
    if done < max(10, NUM_SAMPLES // 3):
        raise BuildError(
            f"{context}: only {done} valid table samples after {attempts} attempts — "
            f"check that the input bounds overlap the table domain"
        )
    return parity, points


def manifold_points(
    inputs: list[sp.Symbol],
    known_syms: list[sp.Symbol],
    resolved: dict[sp.Symbol, sp.Expr],
    specs: dict[sp.Symbol, VarSpec],
    seed: str,
    n: int = 3,
) -> list[dict[sp.Symbol, sp.Expr]]:
    """Exact points ON the solution manifold: sample the independents, derive
    everything else through the verified solutions. Partial-domain solutions
    (non-assembling linkage geometries) yield complex values — resample until
    n fully real points are found, or fail loudly."""
    rng = random.Random(seed)
    pts: list[dict[sp.Symbol, sp.Expr]] = []
    attempts = 0
    while len(pts) < n and attempts < 60 * n:
        attempts += 1
        pt = {s: _sample_value(specs[s], rng) for s in [*inputs, *known_syms]}
        ok = True
        for target, expr in resolved.items():
            val = expr.subs(pt)
            approx = sp.N(val, 30, chop=True)
            if not approx.is_number or approx.has(sp.zoo, sp.oo, sp.nan) or approx.is_real is not True:
                ok = False
                break
            pt[target] = sp.nsimplify(val)
        if ok:
            pts.append(pt)
    if len(pts) < n:
        raise BuildError(
            f"{seed}: could not find {n} real points on the solution manifold inside the "
            f"declared bounds ({attempts} attempts) — check variable bounds"
        )
    return pts


def dof_check(
    unknowns: list[sp.Symbol],
    residuals: list[sp.Expr],
    inputs: list[sp.Symbol],
    points: list[dict[sp.Symbol, sp.Expr]],
    context: str,
) -> None:
    """DOF = unknowns - rank(Jacobian). The rank MUST be evaluated at points
    that satisfy the relations: a relation implied by the others (e.g. the
    planetary power balance, a polynomial combination of Willis + the torque
    relations) has a dependent gradient only ON the manifold — at random
    off-manifold points it looks independent and the count comes out wrong.
    Rank is exact (rational arithmetic) whenever the manifold point is
    rational; max over points guards against coefficients vanishing at an
    unlucky sample. Trig manifolds (loop-closure linkages) yield exact but
    transcendental point values — atan-of-radical entries — where exact rank
    is intractable, so those points fall back to a 50-dps numeric rank with a
    chop far above the noise floor (RANK_CHOP): an implied relation's
    dependent row still collapses to ~1e-49 and is correctly discounted.
    """
    if not residuals:
        raise BuildError(f"{context}: no relations")
    jac = sp.Matrix([[sp.diff(r, v) for v in unknowns] for r in residuals])
    rank = 0
    for pt in points:
        missing = [s for s in jac.free_symbols if s not in pt]
        if missing:
            raise BuildError(f"{context}: manifold point lacks {sorted(map(str, missing))}")
        sub = jac.subs(pt)
        if all(getattr(v, "is_Rational", False) for v in pt.values()):
            rank = max(rank, sub.rank())
        else:
            num = sub.evalf(PRECISION_DPS)
            rank = max(rank, num.rank(iszerofunc=lambda x: abs(x) < RANK_CHOP))
    dof = len(unknowns) - rank
    if len(inputs) != dof:
        raise BuildError(
            f"{context}: DOF mismatch — {len(unknowns)} unknowns, {rank} independent "
            f"relations/constraints => {dof} degrees of freedom, but {len(inputs)} inputs declared "
            f"({[str(i) for i in inputs]})"
        )
