"""solve1d through the pipeline, end to end, on a Lambert-W fixture: y·e^y = x
has no elementary closed form, so the bracketed-bisection path (ADR-0002) is
the only honest way to ship it. Pins the authoring syntax, the bracket
certificates (sign change + single-root scan), the 60-dps roots in the parity
samples, total back-substitution into every relation, downstream targets, and
that every dishonest variant fails the build loudly by name."""

import json
import math
import textwrap

import pytest

from mech_pipeline import BuildError
from mech_pipeline.compile import compile_all

LAMBERT_YAML = textwrap.dedent("""
    id: lambert-fixture
    title: Lambert fixture
    facets: [kinematics]
    variables:
      - {symbol: x, name: Forcing, unit: "1", quantity_kind: ratio, default: 1.0, bounds: [0.5, 5.0], positive: true}
      - {symbol: y, name: Response, unit: "1", quantity_kind: ratio, default: 0.5671, bounds: [0.0, 5.0], positive: true, role: derived}
      - {symbol: z, name: Doubled response, unit: "1", quantity_kind: ratio, default: 1.1343, bounds: [0.0, 10.0], role: derived}
    relations:
      - id: lambert
        latex: y e^{y} = x
        residual: y*exp(y) - x
        citation: src
      - id: doubled
        latex: z = 2 y
        residual: z - 2*y
        citation: src
    configurations:
      - id: default
        label: Solve the transcendental
        inputs: [x]
        solutions:
          y:
            solve1d:
              relation: lambert
              bracket: ["1e-12", "x"]
          z: 2*y
    derivation:
      steps:
        - expr: Eq(y*exp(y), x)
          prose: "The defining transcendental — no elementary closed form exists."
          rule: "modeling: definition of the response"
          check: definition
    sim: {engine: statics-cascade, config: {}}
    sources:
      - {id: src, citation: "Fixture source."}
""")


@pytest.fixture
def things_dir(tmp_path):
    d = tmp_path / "things" / "lambert-fixture"
    d.mkdir(parents=True)
    (d / "thing.yaml").write_text(LAMBERT_YAML, encoding="utf-8")
    return tmp_path / "things"


def _compile(things_dir, tmp_path):
    out = tmp_path / "generated"
    compile_all(things_dir, out)
    artifact = json.loads((out / "lambert-fixture.compiled.json").read_text(encoding="utf-8"))
    fns = (out / "lambert-fixture.fns.ts").read_text(encoding="utf-8")
    return artifact, fns


def test_solve1d_compiles_and_roots_are_true_lambert_values(things_dir, tmp_path):
    artifact, fns = _compile(things_dir, tmp_path)
    cfg = artifact["configurations"][0]
    steps = {s["target"]: s for s in cfg["plan"]}
    assert steps["y"]["type"] == "solve1d"
    assert steps["y"]["residual_fn"] == "rel_lambert"
    assert steps["y"]["bracket_fns"] == ["cfg_default_y__blo", "cfg_default_y__bhi"]
    assert steps["z"]["type"] == "eval"
    # bracket fns and the residual are all emitted
    for name in ("cfg_default_y__blo", "cfg_default_y__bhi", "rel_lambert"):
        assert name in fns
    # the parity samples carry mpmath bisection roots: y·e^y must equal x
    assert len(cfg["samples"]) == 3
    for s in cfg["samples"]:
        x, y, z = s["inputs"]["x"], s["outputs"]["y"], s["outputs"]["z"]
        assert abs(y * math.exp(y) - x) / x < 1e-12
        assert abs(z - 2 * y) < 1e-12


def test_unbracketed_solve1d_fails_build(things_dir, tmp_path):
    # both endpoints on the same side of the root: f(x)=x(e^x − 1) > 0 and
    # f(x+1) > 0 — the certificate must refuse, naming the step
    bad = LAMBERT_YAML.replace('bracket: ["1e-12", "x"]', 'bracket: ["x", "x + 1"]')
    (things_dir / "lambert-fixture" / "thing.yaml").write_text(bad, encoding="utf-8")
    with pytest.raises(BuildError, match="does NOT produce a sign change"):
        compile_all(things_dir, tmp_path / "generated")


def test_multi_root_bracket_fails_build(things_dir, tmp_path):
    # three roots (x/4, x/2, x) inside (0, 2x): endpoint signs still change
    # (odd count), so only the sign-scan can catch the ambiguity
    bad = LAMBERT_YAML.replace(
        "residual: y*exp(y) - x", "residual: (y - x/4)*(y - x/2)*(y - x)"
    ).replace('bracket: ["1e-12", "x"]', 'bracket: ["1e-12", "2*x"]')
    (things_dir / "lambert-fixture" / "thing.yaml").write_text(bad, encoding="utf-8")
    with pytest.raises(BuildError, match="MULTIPLE roots"):
        compile_all(things_dir, tmp_path / "generated")


def test_unknown_relation_and_unready_symbols_fail_build(things_dir, tmp_path):
    bad = LAMBERT_YAML.replace("relation: lambert", "relation: nope")
    (things_dir / "lambert-fixture" / "thing.yaml").write_text(bad, encoding="utf-8")
    with pytest.raises(BuildError, match="unknown relation 'nope'"):
        compile_all(things_dir, tmp_path / "generated")

    # a bracket reading a symbol that is only evaluated AFTER the solve step
    bad = LAMBERT_YAML.replace('bracket: ["1e-12", "x"]', 'bracket: ["1e-12", "z"]')
    (things_dir / "lambert-fixture" / "thing.yaml").write_text(bad, encoding="utf-8")
    with pytest.raises(BuildError, match="not yet evaluated"):
        compile_all(things_dir, tmp_path / "generated")


def test_identity_derivation_step_may_not_touch_solve1d_targets(things_dir, tmp_path):
    bad = LAMBERT_YAML.replace(
        'rule: "modeling: definition of the response"\n      check: definition',
        'rule: "would need the root in closed form"',
    )
    assert "check: definition" not in bad  # the replace actually landed
    (things_dir / "lambert-fixture" / "thing.yaml").write_text(bad, encoding="utf-8")
    # the taint guard is shared with table lookups now, so its message reads
    # "no closed form (solve1d root or table lookup)"
    with pytest.raises(BuildError, match="no closed form"):
        compile_all(things_dir, tmp_path / "generated")


def test_wrong_downstream_solution_fails_back_substitution(things_dir, tmp_path):
    # z = 3y contradicts the declared relation z = 2y: the rooted point must
    # fail the total back-substitution check, naming the relation
    bad = LAMBERT_YAML.replace("z: 2*y", "z: 3*y")
    (things_dir / "lambert-fixture" / "thing.yaml").write_text(bad, encoding="utf-8")
    with pytest.raises(BuildError, match="doubled"):
        compile_all(things_dir, tmp_path / "generated")
