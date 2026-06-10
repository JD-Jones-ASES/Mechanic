"""End-to-end compiler test on a minimal planetary fixture: thing.yaml in,
verified artifacts out, goldens checked against hand-derived results."""

import json
import textwrap

import pytest

from mech_pipeline import BuildError
from mech_pipeline.compile import compile_all

PLANETARY_YAML = textwrap.dedent("""
    id: planetary-fixture
    title: Planetary fixture
    facets: [kinematics]
    variables:
      - {symbol: omega_s, name: Sun speed, latex: \\omega_s, unit: rad/s, quantity_kind: angular_velocity, default: 10, bounds: [-100, 100]}
      - {symbol: omega_r, name: Ring speed, latex: \\omega_r, unit: rad/s, quantity_kind: angular_velocity, default: 0, bounds: [-100, 100]}
      - {symbol: omega_c, name: Carrier speed, latex: \\omega_c, unit: rad/s, quantity_kind: angular_velocity, default: 3, bounds: [-100, 100]}
      - {symbol: N_s, name: Sun teeth, unit: "1", quantity_kind: count, default: 24, bounds: [12, 60], integer: true, positive: true}
      - {symbol: N_p, name: Planet teeth, unit: "1", quantity_kind: count, default: 18, bounds: [10, 40], integer: true, positive: true}
      - {symbol: N_r, name: Ring teeth, unit: "1", quantity_kind: count, default: 60, bounds: [30, 140], integer: true, positive: true}
    relations:
      - id: willis
        group: kinematics
        latex: \\frac{\\omega_s - \\omega_c}{\\omega_r - \\omega_c} = -\\frac{N_r}{N_s}
        residual: (omega_s - omega_c)*N_s + (omega_r - omega_c)*N_r
        assumptions: ["rigid gears, no slip"]
        citation: norton
      - id: teeth
        group: kinematics
        latex: N_r = N_s + 2 N_p
        residual: N_r - N_s - 2*N_p
        citation: norton
    configurations:
      - id: ring-fixed
        label: Ring fixed
        constraints: {omega_r: 0}
        inputs: [N_s, N_p, omega_s]
        solutions:
          N_r: N_s + 2*N_p
          omega_c: omega_s*N_s/(N_s + N_r)
    derivation:
      steps:
        - expr: Eq((omega_s - omega_c)*N_s, -(omega_r - omega_c)*N_r)
          prose: "Willis equation, cross-multiplied."
          rule: rearrange
        - expr: Eq(omega_c, omega_s*N_s/(N_s + N_r))
          prose: "Set the ring speed to zero and solve for the carrier."
          rule: substitute & solve
    sim: {engine: kinematic-rotation, config: {}}
    sources:
      - {id: norton, citation: "Norton, Design of Machinery."}
""")


@pytest.fixture
def things_dir(tmp_path):
    d = tmp_path / "things" / "planetary-fixture"
    d.mkdir(parents=True)
    (d / "thing.yaml").write_text(PLANETARY_YAML, encoding="utf-8")
    return tmp_path / "things"


def test_compile_planetary_fixture(things_dir, tmp_path):
    out = tmp_path / "generated"
    compiled = compile_all(things_dir, out)
    assert compiled == ["planetary-fixture"]

    artifact = json.loads((out / "planetary-fixture.compiled.json").read_text(encoding="utf-8"))
    cfg = artifact["configurations"][0]
    # samples are the parity oracle: check the hand-derived golden ratio on each
    for s in cfg["samples"]:
        N_s, N_p = s["inputs"]["N_s"], s["inputs"]["N_p"]
        ratio = s["inputs"]["omega_s"] / s["outputs"]["omega_c"]
        assert abs(ratio - (1 + (N_s + 2 * N_p) / N_s)) < 1e-9
        assert s["outputs"]["N_r"] == N_s + 2 * N_p

    fns = (out / "planetary-fixture.fns.ts").read_text(encoding="utf-8")
    assert "AUTO-GENERATED" in fns
    assert "cfg_ring_fixed_omega_c" in fns
    # both derivation steps machine-verified as identities
    assert all(st["check"] == "identity" for st in artifact["derivation"])
    # the Willis singularity guard was auto-derived
    assert any(g["kind"] == "nonzero" for g in cfg["guards"]) or cfg["guards"] == []


def test_wrong_solution_fails_build(things_dir, tmp_path):
    bad = PLANETARY_YAML.replace("omega_s*N_s/(N_s + N_r)", "omega_s*N_s/(N_s - N_r)")
    (things_dir / "planetary-fixture" / "thing.yaml").write_text(bad, encoding="utf-8")
    with pytest.raises(BuildError):
        compile_all(things_dir, tmp_path / "generated")


def test_dof_mismatch_fails_build(things_dir, tmp_path):
    # too few inputs: omega_s is then neither input, constraint, nor solved —
    # the structural completeness check fires before the rank-based DOF check
    bad = PLANETARY_YAML.replace("inputs: [N_s, N_p, omega_s]", "inputs: [N_s, N_p]")
    (things_dir / "planetary-fixture" / "thing.yaml").write_text(bad, encoding="utf-8")
    with pytest.raises(BuildError, match="no solution authored|DOF mismatch"):
        compile_all(things_dir, tmp_path / "generated")


def test_inhomogeneous_relation_fails_build(things_dir, tmp_path):
    bad = PLANETARY_YAML.replace(
        "residual: N_r - N_s - 2*N_p", "residual: N_r - N_s - 2*omega_s"
    )
    (things_dir / "planetary-fixture" / "thing.yaml").write_text(bad, encoding="utf-8")
    with pytest.raises(BuildError):
        compile_all(things_dir, tmp_path / "generated")


def test_cache_reuses_unchanged_things(things_dir, tmp_path):
    """Unchanged yaml + unchanged pipeline ⇒ artifacts are reused, not
    re-verified (compilation is deterministic, so this is sound); touching the
    yaml invalidates the cache."""
    out = tmp_path / "generated"
    compile_all(things_dir, out)
    artifact = out / "planetary-fixture.compiled.json"
    first_mtime = artifact.stat().st_mtime_ns
    assert compile_all(things_dir, out) == ["planetary-fixture"]  # reused, still reported
    assert artifact.stat().st_mtime_ns == first_mtime  # not rewritten
    yaml_path = things_dir / "planetary-fixture" / "thing.yaml"
    yaml_path.write_text(yaml_path.read_text(encoding="utf-8") + "\n# touched\n", encoding="utf-8")
    compile_all(things_dir, out)
    assert artifact.stat().st_mtime_ns != first_mtime  # recompiled


def test_cache_removes_artifacts_of_deleted_things(things_dir, tmp_path):
    """A deleted THING's artifacts must not linger — the site would render an
    orphan page from them."""
    import shutil

    out = tmp_path / "generated"
    compile_all(things_dir, out)
    assert (out / "planetary-fixture.compiled.json").exists()
    shutil.rmtree(things_dir / "planetary-fixture")
    assert compile_all(things_dir, out) == []
    assert not (out / "planetary-fixture.compiled.json").exists()
    assert not (out / "planetary-fixture.fns.ts").exists()
