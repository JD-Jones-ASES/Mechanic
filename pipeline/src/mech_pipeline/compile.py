"""Compiler: thing.yaml -> verified artifacts (<slug>.fns.ts + <slug>.compiled.json).

Stages (docs/architecture.md): parse -> dimension check -> DOF check -> verify
solutions & derivation -> emit. Fails loudly with thing/configuration/step names.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

import sympy as sp
import yaml
from sympy.parsing.sympy_parser import parse_expr

from . import BuildError
from .dims import check_homogeneous, check_relational_homogeneous, dim_vector, parse_unit
from .emit_js import auto_guards, emit_function, render_fns_ts
from .kinds import QUANTITY_KINDS
from .verify import (
    VarSpec,
    dof_check,
    manifold_points,
    resolve_solutions,
    tiered_zero,
    verify_derivation_step,
    verify_solutions_against_relations,
    verify_solve1d_configuration,
)

IDENT_RE = r"^[A-Za-z_][A-Za-z0-9_]*$"

# Closed parsing namespace: unknown names fail; bare E/I/N never collide with
# sympy builtins because the variable symbol table takes precedence.
_GLOBALS = {
    "Eq": sp.Eq, "pi": sp.pi,
    "sin": sp.sin, "cos": sp.cos, "tan": sp.tan,
    "asin": sp.asin, "acos": sp.acos, "atan": sp.atan, "atan2": sp.atan2,
    "sqrt": sp.sqrt, "Abs": sp.Abs, "Min": sp.Min, "Max": sp.Max,
    "log": sp.log, "exp": sp.exp, "sign": sp.sign, "floor": sp.floor,
    "Piecewise": sp.Piecewise,
    "Integer": sp.Integer, "Float": sp.Float, "Rational": sp.Rational, "Symbol": sp.Symbol,
}

LATEX_OPTS = {"inv_trig_style": "full"}


def _parse(expr_str: str, table: dict[str, sp.Symbol], context: str) -> sp.Expr:
    try:
        expr = parse_expr(str(expr_str), local_dict=table, global_dict=_GLOBALS)
    except Exception as e:
        raise BuildError(f"{context}: cannot parse '{expr_str}': {e}") from e
    unknown = {str(s) for s in expr.free_symbols} - set(table)
    if unknown:
        raise BuildError(f"{context}: undeclared symbol(s) {sorted(unknown)} in '{expr_str}'")
    return expr


def _require(d: dict, key: str, context: str):
    if key not in d:
        raise BuildError(f"{context}: missing required key '{key}'")
    return d[key]


class ThingCompiler:
    def __init__(self, thing_dir: Path):
        self.dir = thing_dir
        raw = yaml.safe_load((thing_dir / "thing.yaml").read_text(encoding="utf-8"))
        self.thing_id = _require(raw, "id", str(thing_dir))
        self.ctx = f"thing '{self.thing_id}'"
        if self.thing_id != thing_dir.name:
            raise BuildError(f"{self.ctx}: id must match directory name '{thing_dir.name}'")
        self.raw = raw
        self.specs: dict[sp.Symbol, VarSpec] = {}
        self.table: dict[str, sp.Symbol] = {}
        self.unit_map: dict[sp.Symbol, sp.Expr] = {}
        self.fns: list[str] = []
        self.artifact: dict = {"schema_version": 1, "thing": self.thing_id}

    # ---------- variables ----------
    def load_variables(self) -> None:
        import re

        out: dict[str, dict] = {}
        material_binds = (self.raw.get("materials") or {}).get("binds", {})
        for v in _require(self.raw, "variables", self.ctx):
            sym_name = _require(v, "symbol", f"{self.ctx} variable")
            c = f"{self.ctx}, variable '{sym_name}'"
            if not re.match(IDENT_RE, sym_name):
                raise BuildError(f"{c}: symbol must be a valid identifier")
            if sym_name in self.table:
                raise BuildError(f"{c}: duplicate symbol")
            kind = _require(v, "quantity_kind", c)
            if kind not in QUANTITY_KINDS:
                raise BuildError(f"{c}: unknown quantity_kind '{kind}' — extend kinds.py if legitimate")
            role = v.get("role", "free")
            if role not in ("free", "material", "derived"):
                raise BuildError(f"{c}: role must be free|material|derived")
            if role == "material" and sym_name not in material_binds:
                raise BuildError(f"{c}: role 'material' but no materials.binds entry")
            assumptions = {"real": True}
            if v.get("positive"):
                assumptions["positive"] = True
            if v.get("integer"):
                assumptions["integer"] = True
            sym = sp.Symbol(sym_name, **assumptions)
            unit = parse_unit(str(_require(v, "unit", c)), c)
            bounds = v.get("bounds")
            spec = VarSpec(
                symbol=sym, unit=unit, quantity_kind=kind, role=role,
                default=float(v.get("default", 1.0)),
                bounds=tuple(float(b) for b in bounds) if bounds else None,
                integer=bool(v.get("integer", False)),
                dim=dim_vector(unit, c),
                name=str(_require(v, "name", c)),
                latex=str(v.get("latex", sym_name)),
                display_units=[str(x) for x in v.get("display_units", [])],
            )
            self.table[sym_name] = sym
            self.specs[sym] = spec
            self.unit_map[sym] = unit
            out[sym_name] = {
                "name": spec.name, "latex": spec.latex, "dim": spec.dim,
                "quantity_kind": kind, "si_unit": str(_require(v, "unit", c)),
                "display_units": spec.display_units, "default": spec.default,
                "bounds": list(spec.bounds) if spec.bounds else None,
                "integer": spec.integer, "role": role,
            }
        for var_sym, prop in material_binds.items():
            if var_sym not in self.table:
                raise BuildError(f"{self.ctx}: materials.binds references unknown variable '{var_sym}'")
            if self.specs[self.table[var_sym]].role != "material":
                raise BuildError(f"{self.ctx}: bound variable '{var_sym}' must have role: material")
        self.artifact["variables"] = out
        self.artifact["material_binding"] = material_binds or None

    # ---------- relations ----------
    def load_relations(self) -> None:
        sources = {s["id"] for s in self.raw.get("sources", [])}
        rels = []
        self.residuals: list[tuple[str, sp.Expr]] = []
        for r in _require(self.raw, "relations", self.ctx):
            rid = _require(r, "id", f"{self.ctx} relation")
            c = f"{self.ctx}, relation '{rid}'"
            residual = _parse(_require(r, "residual", c), self.table, c)
            check_homogeneous(residual, self.unit_map, c)
            cit = _require(r, "citation", c)
            if cit not in sources:
                raise BuildError(f"{c}: citation '{cit}' not found in sources")
            fn_id = f"rel_{rid.replace('-', '_')}"
            self.fns.append(emit_function(fn_id, residual, c))
            validity = []
            for i, env in enumerate(r.get("validity", [])):
                vc = f"{c}, validity[{i}]"
                cond = _parse(_require(env, "condition", vc), self.table, vc)
                if not isinstance(cond, sp.core.relational.Relational):
                    raise BuildError(f"{vc}: condition must be a comparison")
                check_relational_homogeneous(cond, self.unit_map, vc)
                sev = _require(env, "severity", vc)
                if sev not in ("warn", "invalid"):
                    raise BuildError(f"{vc}: severity must be warn|invalid")
                # scoped refusal (model hand-off): an invalid envelope may name
                # the derived variables it poisons instead of refusing the whole
                # evaluation — two models with complementary envelopes can then
                # share one page (Euler/Johnson is the reference case)
                scope = env.get("scope")
                if scope is not None:
                    if sev != "invalid":
                        raise BuildError(f"{vc}: scope only applies to severity 'invalid'")
                    if not isinstance(scope, list) or not scope:
                        raise BuildError(f"{vc}: scope must be a non-empty list of symbols")
                    for s_name in scope:
                        if s_name not in self.table:
                            raise BuildError(f"{vc}: scope references unknown variable '{s_name}'")
                        if self.specs[self.table[s_name]].role != "derived":
                            raise BuildError(
                                f"{vc}: scope variable '{s_name}' has role "
                                f"'{self.specs[self.table[s_name]].role}' — scoped refusal "
                                f"poisons derived outputs, not knobs or material values"
                            )
                g_id = f"val_{rid.replace('-', '_')}_{i}"
                self.fns.append(emit_function(g_id, cond, vc, boolean=True))
                validity.append({
                    "guard_fn": g_id, "kind": "predicate", "severity": sev,
                    "message": str(_require(env, "message", vc)),
                    "citation": env.get("citation"),
                    # dependency list lets the engine evaluate this predicate
                    # even when evaluation was refused (e.g. "cannot assemble"
                    # must not be masked by the undefined-sqrt guard)
                    "needs": sorted(str(s) for s in cond.free_symbols),
                    **({"scope": [str(s) for s in scope]} if scope else {}),
                })
            self.residuals.append((rid, residual))
            rels.append({
                "id": rid, "group": r.get("group", "general"),
                "latex": str(_require(r, "latex", c)),
                "residual_fn": fn_id, "srepr": sp.srepr(residual),
                "assumptions": [str(a) for a in r.get("assumptions", [])],
                "validity": validity, "citation": cit,
            })
        self.artifact["relations"] = rels
        self.residual_by_id = dict(self.residuals)
        self.relation_latex = {r["id"]: r["latex"] for r in rels}

    # ---------- configurations ----------
    def load_configurations(self) -> None:
        non_material = [s for s in self.specs if self.specs[s].role != "material"]
        cfgs = []
        self.resolved_by_cfg: dict[str, dict[sp.Symbol, sp.Expr]] = {}
        # symbols with no closed form in a configuration (solve1d outputs and
        # everything computed from them) — identity derivation steps must not
        # reference these (load_derivation enforces it)
        self.solve_tainted_by_cfg: dict[str, set[sp.Symbol]] = {}
        for cfg in _require(self.raw, "configurations", self.ctx):
            cid = _require(cfg, "id", f"{self.ctx} configuration")
            c = f"{self.ctx}, configuration '{cid}'"
            constraints: dict[sp.Symbol, sp.Expr] = {}
            for k, val in (cfg.get("constraints") or {}).items():
                if k not in self.table:
                    raise BuildError(f"{c}: constraint on unknown variable '{k}'")
                constraints[self.table[k]] = _parse(str(val), self.table, c)
            inputs = [self.table[i] for i in _require(cfg, "inputs", c) if i in self.table]
            if len(inputs) != len(cfg["inputs"]):
                unknown = set(cfg["inputs"]) - set(self.table)
                raise BuildError(f"{c}: unknown input(s) {sorted(unknown)}")
            for i_sym in inputs:
                if self.specs[i_sym].role == "material":
                    raise BuildError(f"{c}: material-bound '{i_sym}' cannot be an input knob")
                if i_sym in constraints:
                    raise BuildError(f"{c}: '{i_sym}' is both input and constrained")

            expected_branches = int(cfg.get("expected_branches", 1))
            branches_meta = cfg.get("branches")
            if expected_branches > 1 and not branches_meta:
                raise BuildError(f"{c}: expected_branches={expected_branches} requires a 'branches' block")
            if expected_branches == 1 and branches_meta:
                raise BuildError(f"{c}: a 'branches' block requires expected_branches > 1")
            labels: list[str | None] = list(branches_meta["labels"]) if branches_meta else [None]
            if branches_meta and len(labels) != expected_branches:
                raise BuildError(
                    f"{c}: branch-count mismatch — expected_branches={expected_branches} but "
                    f"branches.labels has {len(labels)} entries"
                )

            solutions_raw = _require(cfg, "solutions", c)
            targets_needed = {s for s in non_material if s not in inputs and s not in constraints}
            plan = []
            # one solution chain per branch label; unbranched targets are shared
            ordered_by_label: dict[str | None, list[tuple[sp.Symbol, sp.Expr]]] = {
                lab: [] for lab in labels
            }
            all_pairs: list[tuple[sp.Symbol, sp.Expr]] = []  # guard derivation, deduped
            # the plan in authoring order, for the solve1d verification campaign:
            # ("eval", sym, expr) | ("solve1d", sym, residual, blo, bhi, rel_id)
            ordered_steps: list[tuple] = []
            seen_targets: list[sp.Symbol] = []
            solve_targets: set[sp.Symbol] = set()
            material_syms = [s for s in self.specs if self.specs[s].role == "material"]
            any_branched = False
            fn_prefix_base = f"cfg_{cid.replace('-', '_')}"
            for target_name, sol in solutions_raw.items():
                tc = f"{c}, solution for '{target_name}'"
                if target_name not in self.table:
                    raise BuildError(f"{tc}: unknown target")
                target = self.table[target_name]
                if target in inputs or target in constraints or self.specs[target].role == "material":
                    raise BuildError(f"{tc}: target is an input/constraint/material variable")
                if isinstance(sol, dict) and "solve1d" in sol:
                    # bracketed numeric target (ADR-0002): solve a DECLARED
                    # relation for this target inside an authored bracket —
                    # the citation rides on the relation, the bracket is
                    # proven to sign-change at every verification sample
                    sd = sol["solve1d"]
                    if not isinstance(sd, dict):
                        raise BuildError(f"{tc}: solve1d must be a mapping with 'relation' and 'bracket'")
                    rel_id = str(_require(sd, "relation", tc))
                    if rel_id not in self.residual_by_id:
                        raise BuildError(f"{tc}: solve1d references unknown relation '{rel_id}'")
                    residual = self.residual_by_id[rel_id]
                    if target not in residual.free_symbols:
                        raise BuildError(f"{tc}: relation '{rel_id}' does not involve '{target_name}'")
                    knowns = {*inputs, *constraints, *material_syms, *seen_targets}
                    not_ready = residual.free_symbols - knowns - {target}
                    if not_ready:
                        raise BuildError(
                            f"{tc}: relation '{rel_id}' reads {sorted(map(str, not_ready))}, not yet "
                            f"evaluated at this plan step — solve1d runs inside the forward DAG (v1)"
                        )
                    bracket = _require(sd, "bracket", tc)
                    if not isinstance(bracket, list) or len(bracket) != 2:
                        raise BuildError(f"{tc}: bracket must be a [lo, hi] pair of expressions")
                    bexprs: list[sp.Expr] = []
                    b_ids: list[str] = []
                    for j, bs in enumerate(bracket):
                        bc = f"{tc} bracket[{j}]"
                        be = _parse(str(bs), self.table, bc)
                        check_homogeneous(be - target, self.unit_map, bc)
                        loose = be.free_symbols - knowns
                        if loose:
                            raise BuildError(f"{bc}: reads {sorted(map(str, loose))}, not yet evaluated")
                        b_id = f"{fn_prefix_base}_{target_name}__b{'lo' if j == 0 else 'hi'}"
                        self.fns.append(emit_function(b_id, be, bc))
                        bexprs.append(be)
                        b_ids.append(b_id)
                        all_pairs.append((target, be))
                    plan.append({
                        "type": "solve1d", "target": target_name,
                        "residual_fn": f"rel_{rel_id.replace('-', '_')}",
                        "bracket_fns": b_ids,
                        "latex": self.relation_latex[rel_id],
                    })
                    ordered_steps.append(("solve1d", target, residual, bexprs[0], bexprs[1], rel_id))
                    solve_targets.add(target)
                    seen_targets.append(target)
                    targets_needed.discard(target)
                    continue
                if isinstance(sol, dict):  # multi-branch
                    any_branched = True
                    if branches_meta is None or list(sol) != labels:
                        raise BuildError(f"{tc}: branch labels must match configuration branches.labels")
                    branch_fns, branch_latex = {}, {}
                    for label, expr_str in sol.items():
                        expr = _parse(expr_str, self.table, f"{tc} [{label}]")
                        check_homogeneous(expr - target, self.unit_map, f"{tc} [{label}]")
                        fn_id = f"{fn_prefix_base}_{target_name}__{label}"
                        self.fns.append(emit_function(fn_id, expr, f"{tc} [{label}]"))
                        branch_fns[label] = fn_id
                        branch_latex[label] = sp.latex(sp.Eq(target, expr), **LATEX_OPTS)
                        ordered_by_label[label].append((target, expr))
                        all_pairs.append((target, expr))
                    plan.append({"type": "eval", "target": target_name,
                                 "branch_fns": branch_fns, "latex": branch_latex})
                else:
                    expr = _parse(sol, self.table, tc)
                    check_homogeneous(expr - target, self.unit_map, tc)
                    fn_id = f"{fn_prefix_base}_{target_name}"
                    self.fns.append(emit_function(fn_id, expr, tc))
                    for lab in labels:
                        ordered_by_label[lab].append((target, expr))
                    all_pairs.append((target, expr))
                    ordered_steps.append(("eval", target, expr))
                    plan.append({"type": "eval", "target": target_name, "fn": fn_id,
                                 "latex": sp.latex(sp.Eq(target, expr), **LATEX_OPTS)})
                seen_targets.append(target)
                targets_needed.discard(target)
            if targets_needed:
                raise BuildError(f"{c}: no solution authored for {sorted(map(str, targets_needed))}")
            if expected_branches > 1 and not any_branched:
                raise BuildError(
                    f"{c}: branch-count mismatch — expected_branches={expected_branches} "
                    f"but every authored solution is single-branch"
                )

            # EVERY branch is independently resolved and proven against EVERY
            # relation, and the DOF check runs on each branch's own manifold —
            # an unverified crossed-circuit solution must fail the build, not
            # ship as a selectable widget state (CLAUDE.md: branch-count
            # mismatch / solution residual != 0 are loud failures).
            residual_exprs = [r for _, r in self.residuals]
            residual_exprs += [sym - val for sym, val in constraints.items()]
            samples: list[dict] = []
            first_resolved: dict[sp.Symbol, sp.Expr] | None = None
            if solve_targets:
                # the numeric campaign: bracket sign-change + single-root scan
                # + 60-dps bisection + total back-substitution, per sample —
                # and a numeric-rank DOF check at the rooted points
                if branches_meta:
                    raise BuildError(f"{c}: solve1d cannot be combined with multi-branch solutions (v1)")
                samples, pts = verify_solve1d_configuration(
                    inputs, material_syms, constraints, ordered_steps,
                    self.residuals, self.specs, c,
                )
                dof_check(non_material, residual_exprs, inputs, pts, c)
                # symbolic prefix for derivation checks: targets that never
                # read a solve1d output keep their verified closed forms;
                # everything downstream is 'tainted' (no closed form exists)
                resolved: dict[sp.Symbol, sp.Expr] = dict(constraints)
                tainted: set[sp.Symbol] = set(solve_targets)
                for st in ordered_steps:
                    if st[0] != "eval":
                        continue
                    _, t_sym, t_expr = st
                    flat = t_expr.subs(resolved)
                    if flat.free_symbols & tainted:
                        tainted.add(t_sym)
                    else:
                        resolved[t_sym] = sp.together(flat)
                first_resolved = resolved
                self.solve_tainted_by_cfg[cid] = tainted
            else:
                for lab in labels:
                    lc = c if lab is None else f"{c}, branch '{lab}'"
                    resolved = resolve_solutions(ordered_by_label[lab], constraints, lc)
                    pts = manifold_points(inputs, material_syms, resolved, self.specs, seed=lc)
                    dof_check(non_material, residual_exprs, inputs, pts, lc)
                    verify_solutions_against_relations(self.residuals, resolved, self.specs, lc)
                    if first_resolved is None:
                        first_resolved = resolved
                    samples.extend(self._samples(cid, inputs, constraints, resolved, branch=lab))
            # derivation steps are checked against the first branch's closed
            # forms; author branch-independent steps (or definition steps) for
            # anything downstream of the branch split
            self.resolved_by_cfg[cid] = first_resolved or {}

            guards = []
            seen_guards: set[tuple[str, str]] = set()
            for gi, (target, expr) in enumerate(all_pairs):
                for g_name, g_expr, kind, msg in auto_guards(
                    expr, f"{fn_prefix_base}_g{gi}", str(target)
                ):
                    key = (kind, sp.srepr(g_expr))
                    if key in seen_guards:  # ± branches share denominators/sqrt args
                        continue
                    seen_guards.add(key)
                    self.fns.append(emit_function(g_name, g_expr, c))
                    guards.append({"guard_fn": g_name, "kind": kind, "severity": "invalid",
                                   "message": msg, "auto": True})

            cfgs.append({
                "id": cid, "label": str(cfg.get("label", cid)),
                "constraints": {str(k): float(v) if v.is_number else str(v) for k, v in constraints.items()},
                "inputs": [str(i) for i in inputs],
                "plan": plan,
                "branches": branches_meta,
                "guards": guards,
                "samples": samples,
            })
        self.artifact["configurations"] = cfgs

    def _samples(self, cid, inputs, constraints, resolved, n=3, branch=None) -> list[dict]:
        """High-precision SymPy-computed input/output samples — the parity oracle
        for the JS evaluator (checked by site tests and Playwright goldens).
        Multi-branch configurations get a sample set per branch label."""
        from .verify import _sample_value

        seed = f"{self.thing_id}/{cid}/samples"
        if branch is not None:
            seed += f"/{branch}"
        rng = random.Random(seed)
        out = []
        attempts = 0
        while len(out) < n and attempts < 40 * n:
            attempts += 1
            material_syms = [s for s in self.specs if self.specs[s].role == "material"]
            subs = {s: _sample_value(self.specs[s], rng) for s in [*inputs, *material_syms]}
            sample_in = {str(k): float(v) for k, v in subs.items()}
            sample_out = {}
            ok = True
            for target, expr in resolved.items():
                val = expr.evalf(25, subs=subs, chop=True)
                if not val.is_number or val.has(sp.zoo, sp.oo, sp.nan) or val.is_real is not True:
                    ok = False  # off the real domain (e.g. non-assembling linkage); resample
                    break
                sample_out[str(target)] = float(val)
            if ok:
                sample = {"inputs": sample_in, "outputs": sample_out}
                if branch is not None:
                    sample["branch"] = branch
                out.append(sample)
        if len(out) < n:
            raise BuildError(f"{self.ctx}, configuration '{cid}': could not generate parity samples")
        return out

    # ---------- derivation ----------
    def load_derivation(self) -> None:
        der = self.raw.get("derivation") or {}
        local_table = dict(self.table)
        local_specs = dict(self.specs)
        local_units = dict(self.unit_map)
        local_defs: dict[sp.Symbol, sp.Expr] = {}
        for loc in der.get("locals", []):
            c = f"{self.ctx}, derivation local '{loc.get('symbol')}'"
            name = _require(loc, "symbol", c)
            assumptions = {"real": True}
            if loc.get("positive"):
                assumptions["positive"] = True
            sym = sp.Symbol(name, **assumptions)
            unit = parse_unit(str(_require(loc, "unit", c)), c)
            local_table[name] = sym
            local_units[sym] = unit
            bounds = loc.get("bounds")
            local_specs[sym] = VarSpec(
                symbol=sym, unit=unit, quantity_kind="ratio", role="derived",
                default=1.0, bounds=tuple(float(b) for b in bounds) if bounds else None,
                integer=False, dim=dim_vector(unit, c),
            )
            if loc.get("define") is not None:
                local_defs[sym] = _parse(loc["define"], local_table, c)
                check_homogeneous(local_defs[sym] - sym, local_units, c)

        cfg_id = der.get("verifies_configuration") or (
            self.artifact["configurations"][0]["id"] if self.artifact.get("configurations") else None
        )
        resolved = self.resolved_by_cfg.get(cfg_id, {})
        tainted = self.solve_tainted_by_cfg.get(cfg_id, set())
        steps_out = []
        for i, step in enumerate(der.get("steps", [])):
            c = f"{self.ctx}, derivation step {i + 1}"
            expr = _parse(_require(step, "expr", c), local_table, c)
            if isinstance(expr, sp.Eq):
                check_homogeneous(expr.lhs - expr.rhs, local_units, c)
            check_mode = step.get("check", "identity")
            if check_mode not in ("identity", "definition"):
                raise BuildError(f"{c}: check must be identity|definition")
            if check_mode == "identity" and expr.free_symbols & tainted:
                raise BuildError(
                    f"{c}: identity step references solve1d-dependent symbol(s) "
                    f"{sorted(str(s) for s in expr.free_symbols & tainted)} — no closed form "
                    f"exists to verify against; restate it over closed-form variables or "
                    f"mark it 'check: definition'"
                )
            verify_derivation_step(expr, check_mode, local_defs, resolved, local_specs, c)
            steps_out.append({
                "latex": sp.latex(expr, **LATEX_OPTS),
                "prose": str(_require(step, "prose", c)),
                "rule": str(step.get("rule", "")),
                "check": check_mode,
            })
        self.artifact["derivation"] = steps_out

    # ---------- top level ----------
    def compile(self) -> tuple[dict, str]:
        self.load_variables()
        self.load_relations()
        self.load_configurations()
        self.load_derivation()
        self.artifact["sim"] = self.raw.get("sim")
        self.artifact["sources"] = self.raw.get("sources", [])
        self.artifact["title"] = self.raw.get("title", self.thing_id)
        self.artifact["facets"] = self.raw.get("facets", [])
        return self.artifact, render_fns_ts(self.fns, self.thing_id)


def _build_fingerprint() -> str:
    """Hash of everything that determines a compiled artifact besides the
    thing.yaml itself: the pipeline source and the (pinned) SymPy version.
    Compilation is deterministic (seeded sampling), so an unchanged
    fingerprint + unchanged yaml means byte-identical artifacts — safe to
    reuse instead of re-verifying (four-bar branch verification dominates
    full builds)."""
    import hashlib

    h = hashlib.sha256()
    for p in sorted(Path(__file__).resolve().parent.glob("*.py")):
        h.update(p.read_bytes())
    h.update(sp.__version__.encode())
    return h.hexdigest()


def compile_all(things_dir: Path, out_dir: Path) -> list[str]:
    """Compile every THING, reusing cached artifacts for THINGs whose yaml and
    build fingerprint are unchanged (manifest: out_dir/.hashes.json, which is
    inside the gitignored generated tree). Returns all current slugs."""
    import hashlib

    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = out_dir / ".hashes.json"
    try:
        manifest: dict[str, str] = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        manifest = {}
    fingerprint = _build_fingerprint()

    yaml_paths = sorted(things_dir.glob("*/thing.yaml"))
    current = {p.parent.name for p in yaml_paths}
    # drop artifacts of deleted THINGs so the site can't render orphans
    for stale in out_dir.glob("*.compiled.json"):
        if stale.name.removesuffix(".compiled.json") not in current:
            stale.unlink()
            stale.with_name(stale.name.replace(".compiled.json", ".fns.ts")).unlink(missing_ok=True)
    manifest = {k: v for k, v in manifest.items() if k in current}

    compiled, reused = [], []
    for yaml_path in yaml_paths:
        slug_dir = yaml_path.parent.name
        key = hashlib.sha256(fingerprint.encode() + yaml_path.read_bytes()).hexdigest()
        json_out = out_dir / f"{slug_dir}.compiled.json"
        fns_out = out_dir / f"{slug_dir}.fns.ts"
        if manifest.get(slug_dir) == key and json_out.exists() and fns_out.exists():
            reused.append(slug_dir)
            continue
        artifact, fns_ts = ThingCompiler(yaml_path.parent).compile()
        slug = artifact["thing"]
        (out_dir / f"{slug}.compiled.json").write_text(
            json.dumps(artifact, indent=2), encoding="utf-8", newline="\n"
        )
        (out_dir / f"{slug}.fns.ts").write_text(fns_ts, encoding="utf-8", newline="\n")
        manifest[slug] = key
        compiled.append(slug)
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")
    if reused:
        print(f"reused {len(reused)} cached thing(s): {', '.join(reused)}")
    return [*compiled, *reused]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    repo = Path(__file__).resolve().parents[3]  # pipeline/src/mech_pipeline -> repo root
    ap.add_argument("--things", type=Path, default=repo / "site" / "src" / "content" / "things")
    ap.add_argument("--out", type=Path, default=repo / "site" / "src" / "generated" / "things")
    args = ap.parse_args()
    try:
        compiled = compile_all(args.things, args.out)
    except BuildError as e:
        print(f"BUILD FAILED: {e}", file=sys.stderr)
        sys.exit(1)
    print(f"{len(compiled)} thing(s) ready: {', '.join(compiled)}")


if __name__ == "__main__":
    main()
