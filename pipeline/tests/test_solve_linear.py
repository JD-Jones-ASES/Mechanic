"""solve_linear (ADR-0008, certified linear-group solving) through the pipeline,
end to end, on a propped-cantilever fixture: {R_A, R_B, M_A} sit in coupled
equilibrium + compatibility relations with no evaluation order, so the exact
build-time linear solve (certify_linear_group) is the only honest way to ship
them. `linsolve` runs ONLY after the affine certificate passes — there is still
no blind solve() (ADR-0002). Pins: the authoring syntax, the affine proof, the
exact solve (R_B = 3wL/8, R_A = 5wL/8, M_A = wL²/8), the desugar into ordinary
eval steps carrying `via.solve_linear`, the determinant nonzero guard, total
back-substitution into every relation, and that every dishonest variant fails
the build loudly by group / relation / target."""

import json
import textwrap

import pytest

from mech_pipeline import BuildError
from mech_pipeline.compile import compile_all

# A propped cantilever, minimal but complete: full-span UDL w, fixed at A,
# roller at B. The three redundant unknowns are solved as ONE linear group;
# the section second moment I and the peak stress are ordinary downstream
# closed forms that read the group's outputs — the desugar composing with
# `solutions`. Compatibility is authored EI-cancelled (w·L⁴/8 − R_B·L³/3): the
# reactions are material-blind, so E and I never enter the coupled system.
PROPPED_YAML = textwrap.dedent("""
    id: prop-fixture
    title: Propped fixture
    facets: [stress]
    variables:
      - {symbol: w, name: UDL, unit: N/m, quantity_kind: line_load, default: 12000, bounds: [0, 50000], positive: true}
      - {symbol: L, name: Span, unit: m, quantity_kind: length, default: 2.0, bounds: [0.5, 6.0], positive: true}
      - {symbol: b, name: Width, unit: m, quantity_kind: length, default: 0.05, bounds: [0.005, 0.3], positive: true}
      - {symbol: h, name: Height, unit: m, quantity_kind: length, default: 0.1, bounds: [0.005, 0.4], positive: true}
      - {symbol: E, name: Modulus, unit: Pa, quantity_kind: elastic_modulus, default: 200.0e9, bounds: [1.0e9, 400.0e9], positive: true, role: material}
      - {symbol: I, name: Second moment, unit: m**4, quantity_kind: second_moment_of_area, default: 4.16667e-6, bounds: [1.0e-10, 1.0e-2], positive: true, role: derived}
      - {symbol: R_A, name: Reaction at wall, unit: N, quantity_kind: force, default: 15000, bounds: [0, 1.0e7], positive: true, role: derived}
      - {symbol: R_B, name: Reaction at prop, unit: N, quantity_kind: force, default: 9000, bounds: [0, 1.0e7], positive: true, role: derived}
      - {symbol: M_A, name: Fixing moment, unit: N*m, quantity_kind: bending_moment, default: 6000, bounds: [0, 1.0e7], positive: true, role: derived}
      - {symbol: sigma_max, name: Peak stress, unit: Pa, quantity_kind: pressure_stress, default: 7.2e7, bounds: [0, 5.0e9], positive: true, role: derived}
    materials: {binds: {E: youngs_modulus}}
    relations:
      - {id: rect-section, latex: 'I = b h^3/12', residual: I - b*h**3/12, citation: src}
      - {id: sum-forces, latex: 'R_A + R_B = wL', residual: R_A + R_B - w*L, citation: src}
      - {id: sum-moments, latex: 'M_A + R_B L = wL^2/2', residual: M_A + R_B*L - w*L**2/2, citation: src}
      - {id: compatibility, latex: 'wL^4/8 = R_B L^3/3', residual: w*L**4/8 - R_B*L**3/3, citation: src}
      - {id: flexure, latex: 'sigma = M_A c/I', residual: sigma_max*I - M_A*(h/2), citation: src}
    configurations:
      - id: analyze
        inputs: [w, L, b, h]
        solve_linear:
          - {targets: [R_A, R_B, M_A], relations: [sum-forces, sum-moments, compatibility]}
        solutions:
          I: b*h**3/12
          sigma_max: M_A*(h/2)/I
    derivation:
      steps:
        - expr: Eq(w*L**4/8, R_B*L**3/3)
          prose: "Compatibility at the prop; physics enters here."
          rule: "modeling: superposition, zero net deflection at B"
          check: definition
        - expr: Eq(R_B, 3*w*L/8)
          prose: "Solve the 3x3 system; EI cancels, so the reaction is material-blind."
          rule: "exact linear solve"
        - expr: Eq(M_A, w*L**2/8)
          prose: "Back-substitute into moment equilibrium."
          rule: "back-substitution"
    sim: {engine: statics-cascade, config: {draw: x}}
    sources:
      - {id: src, citation: "Fixture source."}
""")


@pytest.fixture
def things_dir(tmp_path):
    d = tmp_path / "things" / "prop-fixture"
    d.mkdir(parents=True)
    (d / "thing.yaml").write_text(PROPPED_YAML, encoding="utf-8")
    return tmp_path / "things"


def _write(things_dir, yaml_text):
    (things_dir / "prop-fixture" / "thing.yaml").write_text(yaml_text, encoding="utf-8")


def _compile(things_dir, tmp_path):
    out = tmp_path / "generated"
    compile_all(things_dir, out)
    artifact = json.loads((out / "prop-fixture.compiled.json").read_text(encoding="utf-8"))
    fns = (out / "prop-fixture.fns.ts").read_text(encoding="utf-8")
    return artifact, fns


def test_solve_linear_compiles_and_solves_exactly(things_dir, tmp_path):
    artifact, fns = _compile(things_dir, tmp_path)
    cfg = artifact["configurations"][0]
    steps = {s["target"]: s for s in cfg["plan"]}
    # the three reactions are ordinary EVAL steps carrying solve_linear provenance
    for t in ("R_A", "R_B", "M_A"):
        assert steps[t]["type"] == "eval"
        via = steps[t].get("via")
        assert via and via["solve_linear"]["relations"] == ["sum-forces", "sum-moments", "compatibility"]
        assert via["solve_linear"]["det_fn"] == steps["R_A"]["via"]["solve_linear"]["det_fn"]
    # the group steps come BEFORE the downstream closed forms (forward DAG)
    order = [s["target"] for s in cfg["plan"]]
    assert order.index("R_A") < order.index("I") < order.index("sigma_max")
    # every parity sample is the EXACT closed form: R_B = 3wL/8, R_A = 5wL/8, M_A = wL²/8
    assert len(cfg["samples"]) == 3
    for s in cfg["samples"]:
        w, L = s["inputs"]["w"], s["inputs"]["L"]
        assert abs(s["outputs"]["R_B"] - 3 * w * L / 8) < 1e-9 * (w * L)
        assert abs(s["outputs"]["R_A"] - 5 * w * L / 8) < 1e-9 * (w * L)
        assert abs(s["outputs"]["M_A"] - w * L**2 / 8) < 1e-9 * (w * L**2)


def test_determinant_nonzero_guard_emitted(things_dir, tmp_path):
    artifact, fns = _compile(things_dir, tmp_path)
    cfg = artifact["configurations"][0]
    det_guards = [g for g in cfg["guards"] if g["kind"] == "nonzero" and "solvelin" in g["guard_fn"]]
    assert len(det_guards) == 1, "exactly one determinant guard for the one group"
    g = det_guards[0]
    assert g["severity"] == "invalid"
    assert g["auto"] is False
    # det(A) = L³/3 CANCELS in the solved forms, so this explicit guard is the
    # only place the determinant is checked — the guard fn must be emitted
    assert g["guard_fn"] in fns
    # the guard is referenced by the plan steps' via.det_fn
    step = next(s for s in cfg["plan"] if s["target"] == "R_B")
    assert step["via"]["solve_linear"]["det_fn"] == g["guard_fn"]


def test_nonlinear_in_targets_fails_build(things_dir, tmp_path):
    # R_A² makes sum-forces quadratic in a target — the affine certificate refuses
    _write(things_dir, PROPPED_YAML.replace("residual: R_A + R_B - w*L", "residual: R_A**2 + R_B - w*L"))
    with pytest.raises(BuildError, match="not linear in the targets"):
        compile_all(things_dir, tmp_path / "generated")


def test_non_square_group_fails_build(things_dir, tmp_path):
    # three targets, two relations — the system is not square
    _write(things_dir, PROPPED_YAML.replace(
        "relations: [sum-forces, sum-moments, compatibility]",
        "relations: [sum-forces, sum-moments]",
    ))
    with pytest.raises(BuildError, match="not square"):
        compile_all(things_dir, tmp_path / "generated")


def test_singular_system_fails_build(things_dir, tmp_path):
    # make compatibility contradict sum-forces (same coefficients, R_A + R_B set
    # to 2wL instead of wL): rows 1 and 3 of A identical but the right-hand sides
    # differ → inconsistent, det ≡ 0, linsolve returns the empty set
    _write(things_dir, PROPPED_YAML.replace(
        "residual: w*L**4/8 - R_B*L**3/3", "residual: R_A + R_B - 2*w*L",
    ))
    with pytest.raises(BuildError, match="not uniquely solvable"):
        compile_all(things_dir, tmp_path / "generated")


def test_ordering_violation_group_reads_downstream_target_fails(things_dir, tmp_path):
    # authoring compatibility in its ORIGINAL EI form makes the coefficient read I
    # (the section's second moment — a downstream `solutions` target, not yet
    # evaluated when the group runs). This is exactly why the shipped THING
    # authors compatibility EI-cancelled: the forward-DAG ordering rule forbids a
    # group coefficient reading a derived variable. Refused loudly, naming I.
    _write(things_dir, PROPPED_YAML.replace(
        "residual: w*L**4/8 - R_B*L**3/3", "residual: w*L**4/(8*E*I) - R_B*L**3/(3*E*I)",
    ))
    with pytest.raises(BuildError, match="not yet evaluated"):
        compile_all(things_dir, tmp_path / "generated")


def test_downstream_solution_contradicts_relation_fails(things_dir, tmp_path):
    # sigma_max = 2·M_A·c/I contradicts the flexure relation σ·I = M_A·c: the
    # desugared closed form must fail the total back-substitution, by relation
    _write(things_dir, PROPPED_YAML.replace(
        "sigma_max: M_A*(h/2)/I", "sigma_max: 2*M_A*(h/2)/I",
    ))
    with pytest.raises(BuildError, match="flexure"):
        compile_all(things_dir, tmp_path / "generated")


# --- two dedicated minimal fixtures for the determinant-sample and op-cap paths ---

# det = n − 2 with n an integer knob on [1, 3]: the coefficient matrix is
# nonsingular symbolically (linsolve succeeds) but the per-sample determinant
# check hits n = 2 (deterministically, seeded) and refuses.
DET_SAMPLE_YAML = textwrap.dedent("""
    id: prop-fixture
    title: Det sample fixture
    facets: [stress]
    variables:
      - {symbol: n, name: Knob, unit: "1", quantity_kind: count, default: 1, bounds: [1, 3], integer: true}
      - {symbol: c1, name: c1, unit: "1", quantity_kind: ratio, default: 1.0, bounds: [1, 5], positive: true}
      - {symbol: c2, name: c2, unit: "1", quantity_kind: ratio, default: 1.0, bounds: [1, 5], positive: true}
      - {symbol: a, name: a, unit: "1", quantity_kind: ratio, default: 1.0, bounds: [0, 100], positive: true, role: derived}
      - {symbol: bb, name: b, unit: "1", quantity_kind: ratio, default: 1.0, bounds: [0, 100], positive: true, role: derived}
    relations:
      - {id: r1, latex: 'a = c1', residual: a - c1, citation: src}
      - {id: r2, latex: '(n-2) b = c2', residual: (n - 2)*bb - c2, citation: src}
    configurations:
      - id: solve
        inputs: [n, c1, c2]
        solve_linear:
          - {targets: [a, bb], relations: [r1, r2]}
        solutions: {}
    sim: {engine: statics-cascade, config: {draw: x}}
    sources: [{id: src, citation: "Fixture."}]
""")


def test_singular_at_sample_fails_build(things_dir, tmp_path):
    # det = n-2 is symbolically nonzero (linsolve succeeds), so this must fail on
    # the PER-SAMPLE determinant check when the seeded sampler draws n = 2 — not
    # the symbolic simplify(det)==0 path. Match the per-sample message specifically.
    _write(things_dir, DET_SAMPLE_YAML)
    with pytest.raises(BuildError, match="~ 0 at sample"):
        compile_all(things_dir, tmp_path / "generated")


# a coefficient with > SIMPLIFY_OPS_CAP (200) operations — a symbolic exact
# solve this large is the wrong tool and must name the future LU-runtime ADR.
_BIG = "+".join(f"x**{k}" for k in range(1, 160))  # well over SIMPLIFY_OPS_CAP (200)
OP_CAP_YAML = textwrap.dedent(f"""
    id: prop-fixture
    title: Op cap fixture
    facets: [stress]
    variables:
      - {{symbol: x, name: x, unit: "1", quantity_kind: ratio, default: 1.5, bounds: [1, 2], positive: true}}
      - {{symbol: c1, name: c1, unit: "1", quantity_kind: ratio, default: 1.0, bounds: [1, 5], positive: true}}
      - {{symbol: c2, name: c2, unit: "1", quantity_kind: ratio, default: 1.0, bounds: [1, 5], positive: true}}
      - {{symbol: a, name: a, unit: "1", quantity_kind: ratio, default: 1.0, bounds: [0, 1.0e9], positive: true, role: derived}}
      - {{symbol: bb, name: b, unit: "1", quantity_kind: ratio, default: 1.0, bounds: [0, 100], positive: true, role: derived}}
    relations:
      - {{id: r1, latex: 'big a + b = c1', residual: ({_BIG})*a + bb - c1, citation: src}}
      - {{id: r2, latex: 'a - b = c2', residual: a - bb - c2, citation: src}}
    configurations:
      - id: solve
        inputs: [x, c1, c2]
        solve_linear:
          - {{targets: [a, bb], relations: [r1, r2]}}
        solutions: {{}}
    sim: {{engine: statics-cascade, config: {{draw: x}}}}
    sources: [{{id: src, citation: "Fixture."}}]
""")


def test_op_cap_trip_fails_build(things_dir, tmp_path):
    _write(things_dir, OP_CAP_YAML)
    with pytest.raises(BuildError, match="op cap"):
        compile_all(things_dir, tmp_path / "generated")
