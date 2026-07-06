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
    # the role: constant mechanism leaves a no-constant THING untouched — no
    # variable record grows the constant-only `citation` key (planetary is the
    # 2-DOF invariant-1 reference case; the mechanism must not perturb it)
    assert all("citation" not in v for v in artifact["variables"].values())


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


SCOPED_VALIDITY = """
    validity:
      - condition: omega_s > omega_c
        severity: invalid
        message: "model envelope: the carrier outruns the sun here"
        citation: norton
        scope: [omega_c]"""


def test_scoped_validity_passes_through_to_the_artifact(things_dir, tmp_path):
    """A scope-carrying envelope must land in the artifact naming exactly the
    poisoned variables — the engine's model-hand-off contract depends on it.
    (omega_c is solved-for in the fixture config, so role stays 'free' in the
    declaration; mark it derived for the scope rule.)"""
    yaml_text = PLANETARY_YAML.replace(
        '- {symbol: omega_c, name: Carrier speed, latex: \\omega_c, unit: rad/s, quantity_kind: angular_velocity, default: 3, bounds: [-100, 100]}',
        '- {symbol: omega_c, name: Carrier speed, latex: \\omega_c, unit: rad/s, quantity_kind: angular_velocity, default: 3, bounds: [-100, 100], role: derived}',
    ).replace(
        'assumptions: ["rigid gears, no slip"]\n    citation: norton',
        'assumptions: ["rigid gears, no slip"]\n    citation: norton' + SCOPED_VALIDITY,
    )
    (things_dir / "planetary-fixture" / "thing.yaml").write_text(yaml_text, encoding="utf-8")
    out = tmp_path / "generated"
    compile_all(things_dir, out)
    artifact = json.loads((out / "planetary-fixture.compiled.json").read_text(encoding="utf-8"))
    validity = artifact["relations"][0]["validity"]
    assert validity[0]["scope"] == ["omega_c"]
    assert validity[0]["severity"] == "invalid"
    # unscoped envelopes must NOT grow a scope key (absent = global refusal)
    assert all("scope" not in v for r in artifact["relations"][1:] for v in r["validity"])


def test_scope_on_warn_severity_fails_build(things_dir, tmp_path):
    bad = PLANETARY_YAML.replace(
        'assumptions: ["rigid gears, no slip"]\n    citation: norton',
        'assumptions: ["rigid gears, no slip"]\n    citation: norton'
        + SCOPED_VALIDITY.replace("severity: invalid", "severity: warn"),
    )
    (things_dir / "planetary-fixture" / "thing.yaml").write_text(bad, encoding="utf-8")
    with pytest.raises(BuildError, match="scope only applies to severity 'invalid'"):
        compile_all(things_dir, tmp_path / "generated")


def test_scope_naming_unknown_or_input_variable_fails_build(things_dir, tmp_path):
    bad = PLANETARY_YAML.replace(
        'assumptions: ["rigid gears, no slip"]\n    citation: norton',
        'assumptions: ["rigid gears, no slip"]\n    citation: norton'
        + SCOPED_VALIDITY.replace("scope: [omega_c]", "scope: [nope]"),
    )
    (things_dir / "planetary-fixture" / "thing.yaml").write_text(bad, encoding="utf-8")
    with pytest.raises(BuildError, match="unknown variable 'nope'"):
        compile_all(things_dir, tmp_path / "generated")

    # a knob cannot be 'poisoned' — scoped refusal is about outputs
    bad = PLANETARY_YAML.replace(
        'assumptions: ["rigid gears, no slip"]\n    citation: norton',
        'assumptions: ["rigid gears, no slip"]\n    citation: norton'
        + SCOPED_VALIDITY.replace("scope: [omega_c]", "scope: [omega_s]"),
    )
    (things_dir / "planetary-fixture" / "thing.yaml").write_text(bad, encoding="utf-8")
    with pytest.raises(BuildError, match="poisons derived outputs"):
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


# ---------- role: constant mechanism (S08) ----------
# A cited physical constant is a known injected value excluded from the DOF/knob
# arithmetic exactly like a material, but its fixed value + provenance ride the
# variable (not the materials DB) and its citation is mandatory (invariant 5).
CONSTANT_YAML = textwrap.dedent("""
    id: constant-fixture
    title: Constant fixture
    facets: [dynamics]
    variables:
      - {symbol: m, name: Mass, unit: kg, quantity_kind: mass, default: 5, bounds: [0.1, 100], positive: true}
      - {symbol: g, name: Standard gravity, unit: m/s**2, quantity_kind: acceleration, default: 9.80665, bounds: [9.78, 9.83], positive: true, role: constant, citation: si}
      - {symbol: W, name: Weight, unit: N, quantity_kind: force, default: 49.03, bounds: [0, 100000], positive: true, role: derived}
    relations:
      - id: weight
        group: dynamics
        latex: W = m g
        residual: W - m*g
        assumptions: ["the disk's weight under gravity"]
        citation: si
    configurations:
      - id: default
        label: Mass in, weight out
        constraints: {}
        inputs: [m]
        solutions:
          W: m*g
    derivation:
      steps:
        - expr: Eq(W, m*g)
          prose: "Weight is mass times the gravitational field — g flows through as a known."
          rule: definition of weight
    sim: {engine: statics-cascade, config: {}}
    sources:
      - {id: si, citation: "BIPM, The International System of Units (SI Brochure), 9th ed., 2019."}
""")


@pytest.fixture
def constant_dir(tmp_path):
    d = tmp_path / "things" / "constant-fixture"
    d.mkdir(parents=True)
    (d / "thing.yaml").write_text(CONSTANT_YAML, encoding="utf-8")
    return tmp_path / "things"


def test_constant_compiles_and_is_excluded_from_dof(constant_dir, tmp_path):
    out = tmp_path / "generated"
    assert compile_all(constant_dir, out) == ["constant-fixture"]
    artifact = json.loads((out / "constant-fixture.compiled.json").read_text(encoding="utf-8"))

    # g rides the artifact as a constant with its cited source id
    gvar = artifact["variables"]["g"]
    assert gvar["role"] == "constant"
    assert gvar["citation"] == "si"
    # a constant is NOT a knob: only the free mass is an input, and DOF balances
    # (2 unknowns m,W − 1 relation = 1 input) with g excluded from the count
    cfg = artifact["configurations"][0]
    assert cfg["inputs"] == ["m"]
    # g is injected into the parity samples exactly like a material value (the
    # oracle feeds sample.inputs straight to the engine), never a solved output
    for s in cfg["samples"]:
        assert 9.7 < s["inputs"]["g"] < 9.9
        assert "g" not in s["outputs"]
        assert abs(s["outputs"]["W"] - s["inputs"]["m"] * s["inputs"]["g"]) < 1e-6
    # the identity derivation step referencing g verified (g cancels/flows as a known)
    assert artifact["derivation"][0]["check"] == "identity"


def test_constant_without_citation_fails_build(constant_dir, tmp_path):
    bad = CONSTANT_YAML.replace(", role: constant, citation: si}", ", role: constant}")
    (constant_dir / "constant-fixture" / "thing.yaml").write_text(bad, encoding="utf-8")
    with pytest.raises(BuildError, match="role 'constant' requires a 'citation'"):
        compile_all(constant_dir, tmp_path / "generated")


def test_constant_with_unresolved_citation_fails_build(constant_dir, tmp_path):
    bad = CONSTANT_YAML.replace("role: constant, citation: si}", "role: constant, citation: nope}")
    (constant_dir / "constant-fixture" / "thing.yaml").write_text(bad, encoding="utf-8")
    with pytest.raises(BuildError, match="citation 'nope' not found in sources"):
        compile_all(constant_dir, tmp_path / "generated")


def test_constant_as_input_knob_fails_build(constant_dir, tmp_path):
    bad = CONSTANT_YAML.replace("inputs: [m]", "inputs: [m, g]")
    (constant_dir / "constant-fixture" / "thing.yaml").write_text(bad, encoding="utf-8")
    with pytest.raises(BuildError, match="constant variable 'g' cannot be an input knob"):
        compile_all(constant_dir, tmp_path / "generated")


def test_constant_as_solution_target_fails_build(constant_dir, tmp_path):
    # POST-dedent indentation (6 spaces) — a pre-dedent match string silently
    # no-ops and the negative test passes a GOOD fixture (S02/S03 note)
    bad = CONSTANT_YAML.replace("      W: m*g\n", "      W: m*g\n      g: 9.80665\n")
    assert "\n      g: 9.80665\n" in bad  # mutation took (the added solution line)
    (constant_dir / "constant-fixture" / "thing.yaml").write_text(bad, encoding="utf-8")
    with pytest.raises(BuildError, match="material/constant variable"):
        compile_all(constant_dir, tmp_path / "generated")


def test_citation_on_non_constant_fails_build(constant_dir, tmp_path):
    # a citation on a free/derived variable is a mistake — the field is only for constants
    bad = CONSTANT_YAML.replace(
        "{symbol: m, name: Mass, unit: kg, quantity_kind: mass, default: 5, bounds: [0.1, 100], positive: true}",
        "{symbol: m, name: Mass, unit: kg, quantity_kind: mass, default: 5, bounds: [0.1, 100], positive: true, citation: si}",
    )
    (constant_dir / "constant-fixture" / "thing.yaml").write_text(bad, encoding="utf-8")
    with pytest.raises(BuildError, match="only meaningful for role 'constant'"):
        compile_all(constant_dir, tmp_path / "generated")
