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
    TableSpec,
    VarSpec,
    certify_linear_group,
    dof_check,
    manifold_points,
    resolve_solutions,
    tiered_zero,
    verify_derivation_step,
    verify_solutions_against_relations,
    verify_solve1d_configuration,
    verify_table,
    verify_table_configuration,
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


def _mathrm(name: str) -> str:
    """A KaTeX-safe upright operator name for a table's plan-step LaTeX
    (e.g. 'Table 14-2' -> \\mathrm{Table\\ 14\\text{-}2})."""
    safe = name.replace("\\", "").replace(" ", "\\ ").replace("-", "\\text{-}")
    return f"\\mathrm{{{safe}}}"


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


def _normalize_material_binds(raw_binds, context: str) -> tuple[dict, dict]:
    """Fold authored `materials.binds` into the slot-keyed shape the artifact
    carries (S17). The author writes EITHER a flat map ``{symbol: property_key}``
    OR named slots ``{slot: {symbol: property_key}}`` so one THING can bind two
    independent materials (composite-bar's core + sleeve). This is the ONE place
    either shape is normalized — everything downstream (this compiler and the
    whole site) sees slot-keyed binding, with legacy THINGs carrying a lone
    ``default`` slot whose DOM/label the UI keeps byte-identical.

    Returns ``(binding, flat)``: the slot-keyed ``{slot: {sym: prop}}`` for
    emission, and a flat ``{sym: prop}`` lookup (bound symbols are globally
    unique across slots — invariant 3) for load_variables' per-variable checks.
    """
    import re

    if not raw_binds:
        return {}, {}
    if not isinstance(raw_binds, dict):
        raise BuildError(f"{context}: materials.binds must be a mapping")
    values = list(raw_binds.values())
    if all(isinstance(v, str) for v in values):
        binding = {"default": dict(raw_binds)}          # flat -> lone default slot
    elif all(isinstance(v, dict) for v in values):
        binding = {slot: dict(inner) for slot, inner in raw_binds.items()}
    else:
        raise BuildError(
            f"{context}: materials.binds mixes a flat map with named slots — author "
            f"either {{symbol: property_key}} OR {{slot: {{symbol: property_key}}}}, not both"
        )
    flat: dict[str, str] = {}
    for slot, inner in binding.items():
        if not re.match(IDENT_RE, slot):
            raise BuildError(f"{context}: material slot name '{slot}' is not a valid identifier")
        if not inner:
            raise BuildError(f"{context}: material slot '{slot}' binds no symbols")
        for sym, prop in inner.items():
            if not isinstance(prop, str):
                raise BuildError(
                    f"{context}: materials.binds['{slot}']['{sym}'] must be a property-key string"
                )
            if sym in flat:
                raise BuildError(
                    f"{context}: symbol '{sym}' is bound in more than one material slot — "
                    f"bound symbols must be globally unique (invariant 3)"
                )
            flat[sym] = prop
    return binding, flat


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
        self.tables: dict[str, TableSpec] = {}
        self.artifact: dict = {"schema_version": 1, "thing": self.thing_id}

    # ---------- variables ----------
    def load_variables(self) -> None:
        import re

        out: dict[str, dict] = {}
        # material_binding is slot-keyed {slot: {sym: prop}} (S17); material_binds
        # is the flat {sym: prop} lookup the per-variable checks below use.
        material_binding, material_binds = _normalize_material_binds(
            (self.raw.get("materials") or {}).get("binds", {}), self.ctx
        )
        sources = {s["id"] for s in self.raw.get("sources", [])}
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
            if role not in ("free", "material", "derived", "constant"):
                raise BuildError(f"{c}: role must be free|material|derived|constant")
            if role == "material" and sym_name not in material_binds:
                raise BuildError(f"{c}: role 'material' but no materials.binds entry")
            # role: constant — a cited physical constant (g is the first). It is a
            # known injected value excluded from DOF exactly like a material, but
            # its provenance is a source citation ON the variable (not a material
            # property), and that citation is MANDATORY: invariant 5 forbids a
            # number with no provenance. The citation field is meaningless on any
            # other role, so reject it there to keep the mechanism crisp.
            citation = v.get("citation")
            if role == "constant":
                if not citation:
                    raise BuildError(
                        f"{c}: role 'constant' requires a 'citation' — a cited physical "
                        f"constant carries value + unit + source id (invariant 5)"
                    )
                if citation not in sources:
                    raise BuildError(f"{c}: citation '{citation}' not found in sources")
                if sym_name in material_binds:
                    raise BuildError(f"{c}: a constant cannot also be materials-bound")
            elif citation is not None:
                raise BuildError(
                    f"{c}: 'citation' is only meaningful for role 'constant' "
                    f"(materials carry their own provenance; free/derived need none)"
                )
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
            entry = {
                "name": spec.name, "latex": spec.latex, "dim": spec.dim,
                "quantity_kind": kind, "si_unit": str(_require(v, "unit", c)),
                "display_units": spec.display_units, "default": spec.default,
                "bounds": list(spec.bounds) if spec.bounds else None,
                "integer": spec.integer, "role": role,
            }
            if role == "constant":  # its cited source id rides the artifact for the UI
                entry["citation"] = citation
            out[sym_name] = entry
        for var_sym, prop in material_binds.items():
            if var_sym not in self.table:
                raise BuildError(f"{self.ctx}: materials.binds references unknown variable '{var_sym}'")
            if self.specs[self.table[var_sym]].role != "material":
                raise BuildError(f"{self.ctx}: bound variable '{var_sym}' must have role: material")
        self.artifact["variables"] = out
        self.artifact["material_binding"] = material_binding or None

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

    # ---------- tables (ADR-0009) ----------
    def load_tables(self) -> None:
        """Parse and structurally verify the `tables:` block. Each table becomes
        a TableSpec (high-precision rows) that load_configurations consumes; the
        artifact carries table metadata for the /verification/ audit surface."""
        sources = {s["id"] for s in self.raw.get("sources", [])}
        meta: list[dict] = []
        seen: set[str] = set()
        for t in self.raw.get("tables", []):
            tid = _require(t, "id", f"{self.ctx} table")
            c = f"{self.ctx}, table '{tid}'"
            if tid in seen:
                raise BuildError(f"{c}: duplicate table id")
            seen.add(tid)
            cit = _require(t, "citation", c)
            if cit not in sources:
                raise BuildError(f"{c}: citation '{cit}' not found in sources")
            interp_cit = t.get("interpolation_citation")
            if interp_cit is not None and interp_cit not in sources:
                raise BuildError(f"{c}: interpolation_citation '{interp_cit}' not found in sources")
            if t.get("out_of_domain", "invalid") != "invalid":
                raise BuildError(f"{c}: out_of_domain must be 'invalid' — the only supported guard")
            arg = _require(t, "arg", c)
            if arg not in self.table:
                raise BuildError(f"{c}: arg '{arg}' is not a declared variable")
            columns = _require(t, "columns", c)
            if not isinstance(columns, list) or not columns:
                raise BuildError(f"{c}: columns must be a non-empty list of declared variables")
            for col in columns:
                if col not in self.table:
                    raise BuildError(f"{c}: column '{col}' is not a declared variable")
            raw_rows = _require(t, "rows", c)
            if not isinstance(raw_rows, list):
                raise BuildError(f"{c}: rows must be a list")
            rows_hp = [[sp.Float(str(v), 50) for v in row] for row in raw_rows]
            spec = TableSpec(
                id=tid,
                name=str(t.get("name", tid)),
                citation=cit,
                provenance=str(_require(t, "provenance", c)),
                interpolation_citation=interp_cit,
                arg=str(arg),
                arg_integer=bool(self.specs[self.table[arg]].integer),
                columns=[str(col) for col in columns],
                mode=str(_require(t, "mode", c)),
                rows=rows_hp,
            )
            verify_table(spec, self.ctx)  # structural + node-exact + refusal (parts 1,2,4)
            self.tables[tid] = spec
            meta.append({
                "id": tid, "name": spec.name, "citation": cit, "provenance": spec.provenance,
                "interpolation_citation": interp_cit, "mode": spec.mode,
                "arg": spec.arg, "columns": spec.columns,
                "domain": [float(rows_hp[0][0]), float(rows_hp[-1][0])],
                "rows_count": len(rows_hp),
            })
        self.artifact["tables"] = meta

    # ---------- configurations ----------
    def load_configurations(self) -> None:
        # DOF-participating unknowns: free knobs + derived outputs. Materials AND
        # constants are known injected values excluded from DOF/knob arithmetic —
        # a constant mirrors a material exactly, differing only in that its fixed
        # value and provenance ride the variable instead of coming from the DB.
        dof_vars = [s for s in self.specs if self.specs[s].role in ("free", "derived")]
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
                if self.specs[i_sym].role in ("material", "constant"):
                    raise BuildError(
                        f"{c}: {self.specs[i_sym].role} variable '{i_sym}' cannot be an input knob"
                    )
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
            targets_needed = {s for s in dof_vars if s not in inputs and s not in constraints}
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
            table_targets: set[sp.Symbol] = set()
            # tabulated consumers grouped by (table_id, srepr(at)): several
            # targets that read the SAME table at the SAME arg share ONE plan
            # step, each filling its own column (real-arg multi-column lookup).
            table_groups: dict[tuple, dict] = {}
            # materials + constants: injected known values, sampled alongside the
            # inputs for verification/DOF/parity and never counted toward the DOF
            known_syms = [s for s in self.specs if self.specs[s].role in ("material", "constant")]
            any_branched = False
            fn_prefix_base = f"cfg_{cid.replace('-', '_')}"

            # ---- certified linear-group solves (ADR-0008, solveLinear) ----
            # Evaluated after constraints, BEFORE `solutions`. Each group is a
            # square coupled system (a statically indeterminate structure's
            # redundant reactions) that the forward-DAG planner cannot express;
            # certify_linear_group proves it affine in its targets and solves it
            # EXACTLY at build time. The solved closed forms DESUGAR into ordinary
            # eval steps here, so everything downstream (resolve_solutions →
            # back-substitution → manifold DOF check → parity oracle) treats them
            # like any authored solution — nothing new after the desugar.
            linear_groups = cfg.get("solve_linear") or []
            linear_det_guards: list[tuple[dict, str]] = []  # (guard, det srepr) for dedup
            for gi, group in enumerate(linear_groups):
                gc = f"{c}, solve_linear[{gi}]"
                raw_targets = _require(group, "targets", gc)
                raw_rels = _require(group, "relations", gc)
                if not isinstance(raw_targets, list) or not raw_targets:
                    raise BuildError(f"{gc}: targets must be a non-empty list")
                if not isinstance(raw_rels, list) or not raw_rels:
                    raise BuildError(f"{gc}: relations must be a non-empty list")
                g_targets: list[sp.Symbol] = []
                for tname in raw_targets:
                    if tname not in self.table:
                        raise BuildError(f"{gc}: unknown target '{tname}'")
                    tsym = self.table[tname]
                    if tsym in inputs or tsym in constraints or self.specs[tsym].role in ("material", "constant"):
                        raise BuildError(f"{gc}: target '{tname}' is an input/constraint/material/constant variable")
                    if self.specs[tsym].role != "derived":
                        raise BuildError(f"{gc}: target '{tname}' must have role: derived")
                    if tsym in seen_targets or tsym in g_targets:
                        raise BuildError(f"{gc}: target '{tname}' is already solved earlier in this configuration")
                    g_targets.append(tsym)
                g_relations: list[tuple[str, sp.Expr]] = []
                for rid in raw_rels:
                    if rid not in self.residual_by_id:
                        raise BuildError(f"{gc}: unknown relation '{rid}'")
                    g_relations.append((rid, self.residual_by_id[rid]))
                # ORDERING RULE (v1): coefficients read only already-evaluated
                # symbols — inputs, constraints, materials/constants, and EARLIER
                # groups' targets. A relation reading a not-yet-evaluated symbol
                # (a downstream `solutions` target, e.g. the section's I) is a
                # forward-DAG violation, named loudly.
                knowns = {*inputs, *constraints, *known_syms, *seen_targets}
                coeff_syms = set().union(*[r.free_symbols for _, r in g_relations]) - set(g_targets)
                not_ready = coeff_syms - knowns
                if not_ready:
                    raise BuildError(
                        f"{gc}: coefficients read {sorted(map(str, not_ready))}, not yet evaluated "
                        f"at this plan step — a solve_linear group runs after constraints and before "
                        f"`solutions`, reading only inputs/constraints/materials/earlier groups (v1)"
                    )
                solved, det = certify_linear_group(g_targets, g_relations, self.specs, gc)
                rel_ids = [rid for rid, _ in g_relations]
                # det guard: a singular system has no unique solution → refuse the
                # WHOLE evaluation (existing 'nonzero' kind; zero runtime change).
                # Checked pre-plan in relation.ts, so det reads only knowns (above).
                det_fn_id = f"{fn_prefix_base}_solvelin{gi}__det"
                self.fns.append(emit_function(det_fn_id, det, gc))
                names = [self.specs[t].name for t in g_targets]
                subject = (
                    names[0] if len(names) == 1
                    else " and ".join(names) if len(names) == 2
                    else ", ".join(names[:-1]) + ", and " + names[-1]
                )
                linear_det_guards.append((
                    {
                        "guard_fn": det_fn_id, "kind": "nonzero", "severity": "invalid",
                        "message": (
                            f"This configuration is statically indeterminate and its coefficient "
                            f"determinant is zero at these inputs — {subject} are not uniquely "
                            f"determined, so every value is refused rather than guessed."
                        ),
                        "auto": False,
                    },
                    sp.srepr(det),
                ))
                # DESUGAR: each solved form is an ordinary eval step + closed form
                for tname, tsym in zip(raw_targets, g_targets):
                    expr = solved[tsym]
                    fn_id = f"{fn_prefix_base}_{tname}"
                    self.fns.append(emit_function(fn_id, expr, gc))
                    for lab in labels:
                        ordered_by_label[lab].append((tsym, expr))
                    all_pairs.append((tsym, expr))
                    ordered_steps.append(("eval", tsym, expr))
                    plan.append({
                        "type": "eval", "target": tname, "fn": fn_id,
                        "latex": sp.latex(sp.Eq(tsym, expr), **LATEX_OPTS),
                        "via": {"solve_linear": {"relations": rel_ids, "det_fn": det_fn_id}},
                    })
                    seen_targets.append(tsym)
                    targets_needed.discard(tsym)

            for target_name, sol in solutions_raw.items():
                tc = f"{c}, solution for '{target_name}'"
                if target_name not in self.table:
                    raise BuildError(f"{tc}: unknown target")
                target = self.table[target_name]
                if target in inputs or target in constraints or self.specs[target].role in ("material", "constant"):
                    raise BuildError(f"{tc}: target is an input/constraint/material/constant variable")
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
                    knowns = {*inputs, *constraints, *known_syms, *seen_targets}
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
                if isinstance(sol, dict) and "table" in sol:
                    # tabulated lookup (ADR-0009): the column value(s) come from a
                    # cited table at arg = `at`, evaluated inside the forward DAG.
                    # No closed form exists, so like solve1d the value is proven
                    # numerically (verify_table_configuration) and tainted for
                    # derivation identity steps; out-of-domain refuses, scoped.
                    # Targets reading the SAME table at the SAME arg are grouped
                    # into ONE plan step, each filling its own column — a target
                    # whose NAME matches a column template takes that column, and
                    # one that does not (S01's Y_g reading the Y_p-templated single
                    # column) falls back to column 0. The step's latex and guard
                    # message name the full column set, so they are finalized in a
                    # pass after the whole solutions loop (see below).
                    table_id = str(sol["table"])
                    if table_id not in self.tables:
                        raise BuildError(f"{tc}: references unknown table '{table_id}'")
                    tbl = self.tables[table_id]
                    at_expr = _parse(str(_require(sol, "at", tc)), self.table, tc)
                    ncol = len(tbl.columns)
                    # which column does this target fill? A target whose NAME is a
                    # column takes that column. A single-column table also accepts
                    # a differently-named target (S01's Y_g reads the Y_p column);
                    # a multi-column table does NOT — each consumer must name its
                    # column, or a typo silently maps to column 0.
                    if target_name in tbl.columns:
                        col_index = tbl.columns.index(target_name)
                    elif ncol == 1:
                        col_index = 0
                    else:
                        raise BuildError(
                            f"{tc}: target '{target_name}' does not name any column of "
                            f"multi-column table '{table_id}' (columns {tbl.columns}) — "
                            f"a consumer must name the column it fills"
                        )
                    col_tmpl = self.table[tbl.columns[col_index]]
                    check_homogeneous(target - col_tmpl, self.unit_map, f"{tc} table column")
                    if self.specs[target].quantity_kind != self.specs[col_tmpl].quantity_kind:
                        raise BuildError(
                            f"{tc}: target kind '{self.specs[target].quantity_kind}' ≠ column "
                            f"template '{self.specs[col_tmpl].quantity_kind}'"
                        )
                    group_key = (table_id, sp.srepr(at_expr))
                    existing = table_groups.get(group_key)
                    if existing is not None:
                        # a further column of an already-opened group: it must be
                        # authored consecutively (no intervening plan step) so the
                        # ordering stays a forward DAG and the group is one lookup.
                        step = existing["plan"]
                        if plan[-1] is not step:
                            raise BuildError(
                                f"{tc}: columns of table '{table_id}' at the same arg must be "
                                f"authored consecutively (a non-table step interrupts the group)"
                            )
                        if step["targets"][col_index] is not None:
                            raise BuildError(
                                f"{tc}: column '{tbl.columns[col_index]}' of table '{table_id}' is "
                                f"already filled by '{step['targets'][col_index]}'"
                            )
                        step["targets"][col_index] = target_name
                        ordered_steps.append(("table", target, table_id, at_expr, col_index + 1))
                        table_targets.add(target)
                        seen_targets.append(target)
                        targets_needed.discard(target)
                        continue
                    # first column of a new group: validate the arg once
                    knowns = {*inputs, *constraints, *known_syms, *seen_targets}
                    not_ready = at_expr.free_symbols - knowns
                    if not_ready:
                        raise BuildError(
                            f"{tc}: table arg reads {sorted(map(str, not_ready))}, not yet "
                            f"evaluated at this plan step — tables run inside the forward DAG (v1)"
                        )
                    arg_sym = self.table[tbl.arg]
                    check_homogeneous(at_expr - arg_sym, self.unit_map, f"{tc} table arg")
                    if at_expr.is_Symbol and at_expr in self.specs:
                        aspec, tmpl = self.specs[at_expr], self.specs[arg_sym]
                        if aspec.quantity_kind != tmpl.quantity_kind:
                            raise BuildError(
                                f"{tc}: table arg kind '{aspec.quantity_kind}' ≠ template "
                                f"'{tmpl.quantity_kind}' (dimensions alone are not enough)"
                            )
                        if tmpl.integer and not aspec.integer:
                            raise BuildError(
                                f"{tc}: table '{table_id}' has an integer arg but '{at_expr}' is not integer"
                            )
                    arg_fn_id = f"{fn_prefix_base}_{target_name}__arg"
                    self.fns.append(emit_function(arg_fn_id, at_expr, tc))
                    rows_float = [[float(v) for v in row] for row in tbl.rows]
                    lo, hi = rows_float[0][0], rows_float[-1][0]
                    targets_slots: list[str | None] = [None] * ncol
                    targets_slots[col_index] = target_name
                    step = {
                        "type": "table", "targets": targets_slots, "table_id": table_id,
                        "arg_fn": arg_fn_id, "mode": tbl.mode, "rows": rows_float,
                        "domain": [lo, hi],
                        "guard": {  # message + scope filled after the loop (need the column set)
                            "severity": "invalid",
                            "message": "",
                            "citation": tbl.citation,
                            "scope": [],
                        },
                        "latex": "",
                    }
                    plan.append(step)
                    table_groups[group_key] = {
                        "plan": step, "tbl": tbl, "arg_sym": arg_sym,
                        "at_expr": at_expr, "lo": lo, "hi": hi,
                    }
                    ordered_steps.append(("table", target, table_id, at_expr, col_index + 1))
                    table_targets.add(target)
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

            # finalize each table step now its full column set is known: require
            # every column filled (a None slot would be an unlabelled runtime
            # lookup), then build the multi-column latex + guard message. One
            # column keeps S01's exact `Y = Table(N)` form and singular message;
            # several render a tuple `(A, b) = Table(D/d)` and plural message.
            for grp in table_groups.values():
                step, tbl, arg_sym = grp["plan"], grp["tbl"], grp["arg_sym"]
                at_expr, lo, hi = grp["at_expr"], grp["lo"], grp["hi"]
                filled = step["targets"]
                missing = [tbl.columns[i] for i, t in enumerate(filled) if t is None]
                if missing:
                    raise BuildError(
                        f"{c}, table '{tbl.id}': column(s) {missing} are declared but never "
                        f"consumed here — every column of a table read in a configuration must "
                        f"be filled (v1)"
                    )
                if len(filled) == 1:
                    lhs = self.specs[self.table[filled[0]]].latex
                else:
                    lhs = "\\left(" + ",\\ ".join(
                        self.specs[self.table[t]].latex for t in filled
                    ) + "\\right)"
                step["latex"] = (
                    f"{lhs} = {_mathrm(tbl.name)}"
                    f"\\!\\left({sp.latex(at_expr, **LATEX_OPTS)}\\right)"
                )
                names = [self.specs[self.table[t]].name for t in filled]
                if len(names) == 1:
                    subject, verb, tail = names[0], "is", "it (and anything computed from it) is refused."
                else:
                    subject = (
                        " and ".join(names) if len(names) == 2
                        else ", ".join(names[:-1]) + ", and " + names[-1]
                    )
                    verb, tail = "are", "they (and anything computed from them) are refused."
                step["guard"]["message"] = (
                    f"{subject} {verb} read from {tbl.name}, published only for "
                    f"{self.specs[arg_sym].name} between {lo:g} and {hi:g}; outside that range "
                    f"there is no data, so {tail}"
                )

            # scoped-refusal scope for each table step: the column(s) it fills
            # PLUS every downstream eval target that reads them. A σ_b computed
            # from a refused Y must blank too, or the page would show a
            # trustworthy-looking number built on missing data. Walk the eval
            # chain after each table step (forward DAG ⇒ one pass suffices);
            # every column of a shared step unions its reach into one scope.
            table_step_by_target = {t: p for p in plan if p["type"] == "table" for t in p["targets"]}
            scope_reach: dict[int, set[str]] = {}
            for idx, st in enumerate(ordered_steps):
                if st[0] != "table":
                    continue
                tgt_sym = st[1]
                reach = {tgt_sym}
                for later in ordered_steps[idx + 1:]:
                    if later[0] == "eval" and later[2].free_symbols & reach:
                        reach.add(later[1])
                for s in reach:
                    if self.specs[s].role != "derived":
                        raise BuildError(
                            f"{c}: table scope symbol '{s}' has role "
                            f"'{self.specs[s].role}' — scoped refusal poisons derived outputs only"
                        )
                step = table_step_by_target[str(tgt_sym)]
                scope_reach.setdefault(id(step), set()).update(str(s) for s in reach)
            for p in plan:
                if p["type"] == "table":
                    p["guard"]["scope"] = sorted(scope_reach.get(id(p), set()))

            # EVERY branch is independently resolved and proven against EVERY
            # relation, and the DOF check runs on each branch's own manifold —
            # an unverified crossed-circuit solution must fail the build, not
            # ship as a selectable widget state (CLAUDE.md: branch-count
            # mismatch / solution residual != 0 are loud failures).
            residual_exprs = [r for _, r in self.residuals]
            residual_exprs += [sym - val for sym, val in constraints.items()]
            samples: list[dict] = []
            first_resolved: dict[sp.Symbol, sp.Expr] | None = None
            # solve1d and table campaigns are separate dispatch arms (below); a
            # config with BOTH would silently skip the table's residual
            # certificate, miscount DOF, and mis-scope refusals — so refuse it
            # loudly, exactly as the multi-branch combinations already do (v1).
            if solve_targets and table_targets:
                raise BuildError(f"{c}: solve1d and table steps cannot be combined in one configuration (v1)")
            # a solve_linear group desugars to CLOSED FORMS, so it composes with
            # ordinary `solutions` through the else-branch below; combining it
            # with a solve1d/table campaign or multi-branch circuits is out of
            # scope for v1 (each would need its own certificate arm) — refuse it
            # loudly rather than silently drop the group's back-substitution.
            if linear_groups and (solve_targets or table_targets or branches_meta):
                raise BuildError(
                    f"{c}: a solve_linear group cannot be combined with solve1d, table, or "
                    f"multi-branch solutions in one configuration (v1)"
                )
            if solve_targets:
                # the numeric campaign: bracket sign-change + single-root scan
                # + 60-dps bisection + total back-substitution, per sample —
                # and a numeric-rank DOF check at the rooted points
                if branches_meta:
                    raise BuildError(f"{c}: solve1d cannot be combined with multi-branch solutions (v1)")
                samples, pts = verify_solve1d_configuration(
                    inputs, known_syms, constraints, ordered_steps,
                    self.residuals, self.specs, c,
                )
                dof_check(dof_vars, residual_exprs, inputs, pts, c)
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
            elif table_targets:
                # table campaign (ADR-0009): per-sample residual certificate.
                # Each column counts as ONE relation in the DOF check — the
                # table pins that unknown as surely as a closed form would.
                if branches_meta:
                    raise BuildError(f"{c}: tables cannot be combined with multi-branch solutions (v1)")
                samples, pts = verify_table_configuration(
                    inputs, known_syms, constraints, ordered_steps,
                    self.residuals, self.tables, self.specs, c,
                )
                dof_check(dof_vars, residual_exprs + list(table_targets), inputs, pts, c)
                # derivation prefix: table outputs (and everything downstream of
                # them) have no closed form — taint exactly like solve1d outputs
                resolved: dict[sp.Symbol, sp.Expr] = dict(constraints)
                tainted: set[sp.Symbol] = set(table_targets)
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
                    pts = manifold_points(inputs, known_syms, resolved, self.specs, seed=lc)
                    dof_check(dof_vars, residual_exprs, inputs, pts, lc)
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
            # solveLinear determinant guards FIRST: a singular coupled system
            # refuses the whole evaluation before any plan step runs (guards are
            # checked pre-plan in relation.ts). Seed the dedup with each det's
            # srepr so an auto denominator guard that happens to equal the
            # determinant (a non-cancelling solve, e.g. a composite bar) is not
            # emitted twice — for a solve where the determinant cancels (propped
            # cantilever's L³/3), the solved forms carry no det denominator and
            # this explicit guard is the ONLY place the determinant is checked.
            for dg, dsr in linear_det_guards:
                guards.append(dg)
                seen_guards.add(("nonzero", dsr))
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
        # materials + constants are the injected knowns carried in each parity
        # sample's inputs; the oracle (check-parity.mjs) feeds them straight to the
        # engine, so a constant is sampled exactly like a material value (hoisted:
        # self.specs does not change across sampling attempts)
        known_syms = [s for s in self.specs if self.specs[s].role in ("material", "constant")]
        while len(out) < n and attempts < 40 * n:
            attempts += 1
            subs = {s: _sample_value(self.specs[s], rng) for s in [*inputs, *known_syms]}
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
                    f"{c}: identity step references symbol(s) with no closed form "
                    f"(solve1d root or table lookup): "
                    f"{sorted(str(s) for s in expr.free_symbols & tainted)} — nothing to verify "
                    f"the identity against; restate it over closed-form variables or "
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
        self.load_tables()
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
