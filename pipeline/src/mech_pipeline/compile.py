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
                g_id = f"val_{rid.replace('-', '_')}_{i}"
                self.fns.append(emit_function(g_id, cond, vc, boolean=True))
                validity.append({
                    "guard_fn": g_id, "kind": "predicate", "severity": sev,
                    "message": str(_require(env, "message", vc)),
                    "citation": env.get("citation"),
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

    # ---------- configurations ----------
    def load_configurations(self) -> None:
        non_material = [s for s in self.specs if self.specs[s].role != "material"]
        cfgs = []
        self.resolved_by_cfg: dict[str, dict[sp.Symbol, sp.Expr]] = {}
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

            solutions_raw = _require(cfg, "solutions", c)
            targets_needed = {s for s in non_material if s not in inputs and s not in constraints}
            plan = []
            ordered: list[tuple[sp.Symbol, sp.Expr]] = []
            fn_prefix_base = f"cfg_{cid.replace('-', '_')}"
            for target_name, sol in solutions_raw.items():
                tc = f"{c}, solution for '{target_name}'"
                if target_name not in self.table:
                    raise BuildError(f"{tc}: unknown target")
                target = self.table[target_name]
                if target in inputs or target in constraints or self.specs[target].role == "material":
                    raise BuildError(f"{tc}: target is an input/constraint/material variable")
                if isinstance(sol, dict):  # multi-branch
                    labels = list(sol)
                    if branches_meta is None or labels != list(branches_meta.get("labels", [])):
                        raise BuildError(f"{tc}: branch labels must match configuration branches.labels")
                    branch_fns, branch_latex = {}, {}
                    for label, expr_str in sol.items():
                        expr = _parse(expr_str, self.table, f"{tc} [{label}]")
                        check_homogeneous(expr - target, self.unit_map, f"{tc} [{label}]")
                        fn_id = f"{fn_prefix_base}_{target_name}__{label}"
                        self.fns.append(emit_function(fn_id, expr, f"{tc} [{label}]"))
                        branch_fns[label] = fn_id
                        branch_latex[label] = sp.latex(sp.Eq(target, expr), **LATEX_OPTS)
                        ordered.append((target, expr))  # each branch must satisfy relations
                    plan.append({"type": "eval", "target": target_name,
                                 "branch_fns": branch_fns, "latex": branch_latex})
                else:
                    expr = _parse(sol, self.table, tc)
                    check_homogeneous(expr - target, self.unit_map, tc)
                    fn_id = f"{fn_prefix_base}_{target_name}"
                    self.fns.append(emit_function(fn_id, expr, tc))
                    ordered.append((target, expr))
                    plan.append({"type": "eval", "target": target_name, "fn": fn_id,
                                 "latex": sp.latex(sp.Eq(target, expr), **LATEX_OPTS)})
                targets_needed.discard(target)
            if targets_needed:
                raise BuildError(f"{c}: no solution authored for {sorted(map(str, targets_needed))}")

            # NOTE: multi-branch resolve uses each branch independently; v1 things
            # are single-branch, and the four-bar case lands as branch-per-solution.
            resolved = resolve_solutions(ordered, constraints, c)

            # DOF check on the solution manifold (off-manifold sampling overcounts
            # the rank when a relation is implied by the others — see verify.py)
            material_syms = [s for s in self.specs if self.specs[s].role == "material"]
            residual_exprs = [r for _, r in self.residuals]
            residual_exprs += [sym - val for sym, val in constraints.items()]
            pts = manifold_points(inputs, material_syms, resolved, self.specs, seed=c)
            dof_check(non_material, residual_exprs, inputs, pts, c)

            verify_solutions_against_relations(self.residuals, resolved, self.specs, c)
            self.resolved_by_cfg[cid] = resolved

            guards = []
            for gi, (target, expr) in enumerate(ordered):
                for g_name, g_expr, kind, msg in auto_guards(
                    expr, f"{fn_prefix_base}_g{gi}", str(target)
                ):
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
                "samples": self._samples(cid, inputs, constraints, resolved),
            })
        self.artifact["configurations"] = cfgs

    def _samples(self, cid, inputs, constraints, resolved, n=3) -> list[dict]:
        """High-precision SymPy-computed input/output samples — the parity oracle
        for the JS evaluator (checked by site tests and Playwright goldens)."""
        from .verify import _sample_value

        rng = random.Random(f"{self.thing_id}/{cid}/samples")
        out = []
        attempts = 0
        while len(out) < n and attempts < 10 * n:
            attempts += 1
            material_syms = [s for s in self.specs if self.specs[s].role == "material"]
            subs = {s: _sample_value(self.specs[s], rng) for s in [*inputs, *material_syms]}
            sample_in = {str(k): float(v) for k, v in subs.items()}
            sample_out = {}
            ok = True
            for target, expr in resolved.items():
                val = expr.evalf(25, subs=subs)
                if not val.is_number or val.has(sp.zoo, sp.oo, sp.nan):
                    ok = False
                    break
                sample_out[str(target)] = float(val)
            if ok:
                out.append({"inputs": sample_in, "outputs": sample_out})
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
        steps_out = []
        for i, step in enumerate(der.get("steps", [])):
            c = f"{self.ctx}, derivation step {i + 1}"
            expr = _parse(_require(step, "expr", c), local_table, c)
            if isinstance(expr, sp.Eq):
                check_homogeneous(expr.lhs - expr.rhs, local_units, c)
            check_mode = step.get("check", "identity")
            if check_mode not in ("identity", "definition"):
                raise BuildError(f"{c}: check must be identity|definition")
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


def compile_all(things_dir: Path, out_dir: Path) -> list[str]:
    out_dir.mkdir(parents=True, exist_ok=True)
    compiled = []
    for yaml_path in sorted(things_dir.glob("*/thing.yaml")):
        artifact, fns_ts = ThingCompiler(yaml_path.parent).compile()
        slug = artifact["thing"]
        (out_dir / f"{slug}.compiled.json").write_text(
            json.dumps(artifact, indent=2), encoding="utf-8", newline="\n"
        )
        (out_dir / f"{slug}.fns.ts").write_text(fns_ts, encoding="utf-8", newline="\n")
        compiled.append(slug)
    return compiled


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
    print(f"compiled {len(compiled)} thing(s): {', '.join(compiled)}")


if __name__ == "__main__":
    main()
