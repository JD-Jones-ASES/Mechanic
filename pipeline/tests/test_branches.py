"""Multi-branch verification: EVERY branch must be independently proven
against EVERY relation. The fixture is the smallest honest two-branch THING —
side of a square from its area, s = ±√A — exercising per-branch resolve,
per-branch DOF (whose manifold points are irrational, covering the numeric
rank path in verify.dof_check), per-branch parity samples, and the
branch-count consistency rules CLAUDE.md promises will fail loudly."""

import json
import textwrap

import pytest

from mech_pipeline import BuildError
from mech_pipeline.compile import compile_all

SQUARE_YAML = textwrap.dedent("""
    id: square-fixture
    title: Square side from area
    facets: [kinematics]
    variables:
      - {symbol: A_sq, name: Area, unit: m**2, quantity_kind: area, default: 4, bounds: [0.5, 9], positive: true}
      - {symbol: s, name: Side, unit: m, quantity_kind: length, default: 2, bounds: [-3, 3], role: derived}
    relations:
      - id: square
        group: kinematics
        latex: s^2 = A
        residual: s**2 - A_sq
        citation: src
    configurations:
      - id: default
        label: Both roots
        constraints: {}
        inputs: [A_sq]
        expected_branches: 2
        branches: {selector: root, labels: [pos, neg]}
        solutions:
          s: {pos: sqrt(A_sq), neg: -sqrt(A_sq)}
    sim: {engine: statics-cascade, config: {}}
    sources:
      - {id: src, citation: "Fixture."}
""")


def _write(tmp_path, yaml_text):
    d = tmp_path / "things" / "square-fixture"
    d.mkdir(parents=True)
    (d / "thing.yaml").write_text(yaml_text, encoding="utf-8")
    return tmp_path / "things"


def test_both_branches_verified_and_sampled(tmp_path):
    things = _write(tmp_path, SQUARE_YAML)
    out = tmp_path / "generated"
    compile_all(things, out)
    artifact = json.loads((out / "square-fixture.compiled.json").read_text(encoding="utf-8"))
    cfg = artifact["configurations"][0]

    step = cfg["plan"][0]
    assert set(step["branch_fns"]) == {"pos", "neg"}
    assert set(step["latex"]) == {"pos", "neg"}

    by_branch = {"pos": [], "neg": []}
    for smp in cfg["samples"]:
        by_branch[smp["branch"]].append(smp)
    assert len(by_branch["pos"]) == 3 and len(by_branch["neg"]) == 3
    for smp in by_branch["pos"]:
        assert smp["outputs"]["s"] > 0
        assert abs(smp["outputs"]["s"] ** 2 - smp["inputs"]["A_sq"]) < 1e-9
    for smp in by_branch["neg"]:
        assert smp["outputs"]["s"] < 0
        assert abs(smp["outputs"]["s"] ** 2 - smp["inputs"]["A_sq"]) < 1e-9

    fns = (out / "square-fixture.fns.ts").read_text(encoding="utf-8")
    assert "cfg_default_s__pos" in fns and "cfg_default_s__neg" in fns


def test_wrong_branch_fails_even_when_other_branch_is_right(tmp_path):
    # the OLD last-write-wins resolve only verified the final branch ('neg');
    # breaking 'pos' proves every branch now goes through verification
    bad = SQUARE_YAML.replace("{pos: sqrt(A_sq), neg: -sqrt(A_sq)}",
                              "{pos: sqrt(A_sq)/2, neg: -sqrt(A_sq)}")
    things = _write(tmp_path, bad)
    with pytest.raises(BuildError, match="pos"):
        compile_all(things, tmp_path / "generated")


def test_branch_count_mismatch_all_solutions_single(tmp_path):
    bad = SQUARE_YAML.replace("s: {pos: sqrt(A_sq), neg: -sqrt(A_sq)}", "s: sqrt(A_sq)")
    things = _write(tmp_path, bad)
    with pytest.raises(BuildError, match="branch-count mismatch"):
        compile_all(things, tmp_path / "generated")


def test_branches_block_without_expected_branches_fails(tmp_path):
    bad = SQUARE_YAML.replace("expected_branches: 2", "expected_branches: 1")
    things = _write(tmp_path, bad)
    with pytest.raises(BuildError, match="expected_branches"):
        compile_all(things, tmp_path / "generated")


def test_solution_labels_must_match_configuration_labels(tmp_path):
    bad = SQUARE_YAML.replace("{pos: sqrt(A_sq), neg: -sqrt(A_sq)}",
                              "{pos: sqrt(A_sq), other: -sqrt(A_sq)}")
    things = _write(tmp_path, bad)
    with pytest.raises(BuildError, match="branch labels must match"):
        compile_all(things, tmp_path / "generated")
