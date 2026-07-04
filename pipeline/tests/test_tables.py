"""The `table` plan step through the pipeline, end to end, on a small fixture
(ADR-0009). Tabulated data with provenance is the deliberate schema stress test
the roadmap called for; this file pins the capability itself, independent of its
first consumer (spur-gear-pair): the reference lookup (node-exact + refusal), the
compiled plan shape, the scoped out-of-domain guard (columns + descendants), the
DOF arithmetic (one column = one relation), the parity samples, and that every
dishonest table fails the build loudly by name."""

import json
import textwrap

import pytest
import sympy as sp

from mech_pipeline import BuildError
from mech_pipeline.compile import compile_all
from mech_pipeline.verify import table_lookup_ref

# n (integer count) -> Y (dimensionless), 3 rows; s = W·Y is a downstream force.
# DOF: {n, Y, W, s} = 4 unknowns; inputs [n, W] = 2; relations = proxy (1) +
# the table pinning Y (1) = 2; 4 − 2 = 2 = inputs. It ONLY balances because the
# table counts as a relation — that is the DOF test.
TABLE_YAML = textwrap.dedent("""
    id: table-fixture
    title: Table fixture
    facets: [kinematics]
    variables:
      - {symbol: n, name: Count, unit: "1", quantity_kind: count, default: 20, bounds: [10, 40], integer: true, positive: true}
      - {symbol: W, name: Load, unit: N, quantity_kind: force, default: 1000, bounds: [1, 100000], positive: true}
      - {symbol: Y, name: Factor, unit: "1", quantity_kind: ratio, default: 0.32, bounds: [0.0, 1.0], role: derived}
      - {symbol: s, name: Product, unit: N, quantity_kind: force, default: 320, bounds: [-1000000, 1000000], role: derived}
    tables:
      - id: demo-Y
        name: Demo Table
        citation: src
        provenance: "Demo values, invented for the fixture."
        interpolation_citation: src
        arg: n
        columns: [Y]
        mode: interpolate-linear
        rows:
          - [10, 0.20]
          - [20, 0.32]
          - [40, 0.50]
    relations:
      - id: proxy
        latex: s = W Y
        residual: s - W*Y
        citation: src
    configurations:
      - id: default
        label: Look up Y and scale the load
        inputs: [n, W]
        solutions:
          Y: {table: demo-Y, at: n}
          s: W*Y
    derivation:
      steps:
        - expr: Eq(s, W*Y)
          prose: "Y comes from the cited table; the product is a downstream force."
          rule: "definition: tabulated lookup"
          check: definition
    sim: {engine: statics-cascade, config: {}}
    sources:
      - {id: src, citation: "Fixture source."}
""")


@pytest.fixture
def things_dir(tmp_path):
    d = tmp_path / "things" / "table-fixture"
    d.mkdir(parents=True)
    (d / "thing.yaml").write_text(TABLE_YAML, encoding="utf-8")
    return tmp_path / "things"


def _compile(things_dir, tmp_path):
    out = tmp_path / "generated"
    compile_all(things_dir, out)
    artifact = json.loads((out / "table-fixture.compiled.json").read_text(encoding="utf-8"))
    fns = (out / "table-fixture.fns.ts").read_text(encoding="utf-8")
    return artifact, fns


def _write(things_dir, yaml_text):
    (things_dir / "table-fixture" / "thing.yaml").write_text(yaml_text, encoding="utf-8")


# ---------- the reference lookup (mirrors site/src/engines/table.ts) ----------

def _rows(pairs):
    return [[sp.Float(str(x), 50) for x in row] for row in pairs]


def test_reference_lookup_is_node_exact():
    rows = _rows([[10, 0.20], [20, 0.32], [40, 0.50]])
    for i, (arg, val) in enumerate([(10, 0.20), (20, 0.32), (40, 0.50)]):
        got = table_lookup_ref(rows, sp.Float(str(arg), 50), "interpolate-linear", 1)
        assert got == sp.Float(str(val), 50), f"node {i} not exact"


def test_reference_lookup_interpolates_linearly():
    rows = _rows([[10, 0.20], [20, 0.32], [40, 0.50]])
    # midway 10->20: 0.20 + (0.32-0.20)/2 = 0.26
    got = table_lookup_ref(rows, sp.Float("15", 50), "interpolate-linear", 1)
    assert abs(float(got) - 0.26) < 1e-12
    # quarter of the way 20->40: 0.32 + (0.50-0.32)*0.25 = 0.365
    got = table_lookup_ref(rows, sp.Float("25", 50), "interpolate-linear", 1)
    assert abs(float(got) - 0.365) < 1e-12


def test_reference_lookup_refuses_out_of_domain_and_nonrow():
    rows = _rows([[10, 0.20], [20, 0.32], [40, 0.50]])
    assert table_lookup_ref(rows, sp.Float("9", 50), "interpolate-linear", 1) is sp.nan
    assert table_lookup_ref(rows, sp.Float("41", 50), "interpolate-linear", 1) is sp.nan
    # exact-row: only exact rows resolve
    assert table_lookup_ref(rows, sp.Float("20", 50), "exact-row", 1) == sp.Float("0.32", 50)
    assert table_lookup_ref(rows, sp.Float("15", 50), "exact-row", 1) is sp.nan


# ---------- the compiled plan + scoped guard ----------

def test_table_compiles_with_correct_plan_shape(things_dir, tmp_path):
    artifact, fns = _compile(things_dir, tmp_path)
    cfg = artifact["configurations"][0]
    steps = {tuple(s.get("targets", [s.get("target")])): s for s in cfg["plan"]}
    y_step = next(s for s in cfg["plan"] if s["type"] == "table")
    assert y_step["targets"] == ["Y"]
    assert y_step["table_id"] == "demo-Y"
    assert y_step["mode"] == "interpolate-linear"
    assert y_step["domain"] == [10.0, 40.0]
    assert y_step["rows"][0] == [10.0, 0.20] and y_step["rows"][-1] == [40.0, 0.50]
    assert y_step["arg_fn"] in fns  # the `at` expression is emitted
    # scoped invalid guard: Y AND its descendant s (which reads Y)
    assert y_step["guard"]["severity"] == "invalid"
    assert y_step["guard"]["scope"] == ["Y", "s"]
    assert y_step["guard"]["citation"] == "src"
    # provenance is exposed for the /verification/ audit surface
    assert artifact["tables"][0]["provenance"].startswith("Demo values")
    assert artifact["tables"][0]["interpolation_citation"] == "src"


def test_parity_samples_reproduce_the_lookup(things_dir, tmp_path):
    artifact, _ = _compile(things_dir, tmp_path)
    cfg = artifact["configurations"][0]
    rows = _rows([[10, 0.20], [20, 0.32], [40, 0.50]])
    assert len(cfg["samples"]) == 3
    for smp in cfg["samples"]:
        n, W = smp["inputs"]["n"], smp["inputs"]["W"]
        Y, s = smp["outputs"]["Y"], smp["outputs"]["s"]
        expect_Y = float(table_lookup_ref(rows, sp.Float(str(n), 50), "interpolate-linear", 1))
        assert abs(Y - expect_Y) < 1e-9
        assert abs(s - W * Y) < 1e-6 * max(abs(s), 1.0)


# ---------- DOF: one column counts as one relation ----------
# NB: TABLE_YAML is textwrap.dedent'd, so mutation match-strings below are
# content-only (no leading indentation) — matching raw indentation would
# silently no-op and the negative tests would pass a GOOD fixture.

def test_dof_counts_the_table_as_a_relation(things_dir, tmp_path):
    # The happy fixture has 4 non-material unknowns {n, W, Y, s} and declares 2
    # inputs [n, W]. dof_check requires inputs == unknowns − independent
    # relations. The only relations authored are `proxy` (1); Y is pinned by the
    # TABLE. So the check passes iff the table contributes a relation: 4 − (1 +
    # 1) = 2 = inputs. If the table were treated as free, DOF would be 3 ≠ 2 and
    # the build would fail — a successful compile is the proof.
    artifact, _ = _compile(things_dir, tmp_path)
    cfg = artifact["configurations"][0]
    assert cfg["inputs"] == ["n", "W"]
    assert sum(1 for s in cfg["plan"] if s["type"] == "table") == 1
    # a wrong knob count IS caught by dof_check: declaring only [n] leaves W
    # neither input, constrained, nor solved → the config is under-specified
    bad = TABLE_YAML.replace("inputs: [n, W]", "inputs: [n]")
    _write(things_dir, bad)
    with pytest.raises(BuildError):
        compile_all(things_dir, tmp_path / "generated")


# ---------- structural failures fail loudly ----------

def test_nonincreasing_arg_fails(things_dir, tmp_path):
    bad = TABLE_YAML.replace("- [20, 0.32]", "- [10, 0.32]")
    _write(things_dir, bad)
    with pytest.raises(BuildError, match="strictly increasing"):
        compile_all(things_dir, tmp_path / "generated")


def test_wrong_row_width_fails(things_dir, tmp_path):
    bad = TABLE_YAML.replace("- [20, 0.32]", "- [20, 0.32, 9.9]")
    _write(things_dir, bad)
    with pytest.raises(BuildError, match="expected 2"):
        compile_all(things_dir, tmp_path / "generated")


def test_threshold_mode_is_reserved_not_built(things_dir, tmp_path):
    bad = TABLE_YAML.replace("mode: interpolate-linear", "mode: threshold")
    _write(things_dir, bad)
    with pytest.raises(BuildError, match="not yet built"):
        compile_all(things_dir, tmp_path / "generated")


def test_interpolate_requires_interpolation_citation(things_dir, tmp_path):
    # remove the whole line (incl. its 4-space post-dedent indent) so the
    # surrounding YAML stays well-formed
    bad = TABLE_YAML.replace("    interpolation_citation: src\n", "")
    _write(things_dir, bad)
    with pytest.raises(BuildError, match="interpolation_citation"):
        compile_all(things_dir, tmp_path / "generated")


def test_out_of_domain_must_be_invalid(things_dir, tmp_path):
    bad = TABLE_YAML.replace(
        "mode: interpolate-linear",
        "mode: interpolate-linear\n    out_of_domain: warn",
    )
    _write(things_dir, bad)
    with pytest.raises(BuildError, match="out_of_domain must be"):
        compile_all(things_dir, tmp_path / "generated")


def test_integer_arg_with_noninteger_row_fails(things_dir, tmp_path):
    bad = TABLE_YAML.replace("- [20, 0.32]", "- [20.5, 0.32]")
    _write(things_dir, bad)
    with pytest.raises(BuildError, match="integer"):
        compile_all(things_dir, tmp_path / "generated")


def test_unknown_citation_fails(things_dir, tmp_path):
    # the table's citation is the one immediately followed by provenance
    bad = TABLE_YAML.replace("citation: src\n    provenance", "citation: nope\n    provenance")
    _write(things_dir, bad)
    with pytest.raises(BuildError, match="not found in sources"):
        compile_all(things_dir, tmp_path / "generated")


def test_unknown_arg_variable_fails(things_dir, tmp_path):
    bad = TABLE_YAML.replace("arg: n", "arg: nope")
    _write(things_dir, bad)
    with pytest.raises(BuildError, match="not a declared variable"):
        compile_all(things_dir, tmp_path / "generated")


# ---------- consumption failures fail loudly ----------

def test_unknown_table_id_at_consumption_fails(things_dir, tmp_path):
    bad = TABLE_YAML.replace("{table: demo-Y, at: n}", "{table: nope, at: n}")
    _write(things_dir, bad)
    with pytest.raises(BuildError, match="unknown table 'nope'"):
        compile_all(things_dir, tmp_path / "generated")


def test_arg_reading_unevaluated_symbol_fails(things_dir, tmp_path):
    # `at: s` reads s, which is only evaluated AFTER the table step
    bad = TABLE_YAML.replace("{table: demo-Y, at: n}", "{table: demo-Y, at: s}")
    _write(things_dir, bad)
    with pytest.raises(BuildError, match="not yet evaluated"):
        compile_all(things_dir, tmp_path / "generated")


def test_arg_kind_mismatch_fails(things_dir, tmp_path):
    # feed a ratio (r) where the table's arg is a count (n): same dimension
    # (both dimensionless), so only the quantity-kind guard can reject it
    bad = TABLE_YAML.replace(
        "  - {symbol: W, name: Load,",
        '  - {symbol: r, name: Ratio arg, unit: "1", quantity_kind: ratio, default: 20, bounds: [10, 40]}\n'
        "  - {symbol: W, name: Load,",
    ).replace("{table: demo-Y, at: n}", "{table: demo-Y, at: r}").replace(
        "inputs: [n, W]", "inputs: [n, W, r]"
    )
    _write(things_dir, bad)
    with pytest.raises(BuildError, match="kind"):
        compile_all(things_dir, tmp_path / "generated")


def test_table_plus_solve1d_in_one_config_fails_loudly(things_dir, tmp_path):
    # a config with BOTH a table and a solve1d step would silently skip the
    # table residual certificate and miscount DOF — it must refuse loudly, the
    # way table+multi-branch and solve1d+multi-branch already do (v1)
    bad = (
        TABLE_YAML.replace(
            "tables:\n",
            '  - {symbol: q, name: Root, unit: "1", quantity_kind: ratio, default: 0.5, bounds: [0, 1], positive: true, role: derived}\n'
            "tables:\n",
        )
        .replace(
            "relations:\n",
            "relations:\n  - {id: qrel, latex: 'q^2 = Y', residual: q**2 - Y, citation: src}\n",
        )
        .replace("s: W*Y", "s: W*Y\n      q: {solve1d: {relation: qrel, bracket: ['1e-9', '1']}}")
    )
    _write(things_dir, bad)
    with pytest.raises(BuildError, match="cannot be combined"):
        compile_all(things_dir, tmp_path / "generated")


def test_identity_derivation_step_may_not_touch_table_target(things_dir, tmp_path):
    # flip the lone step to an identity check: it references s and Y, both
    # table-tainted (no closed form), so the taint guard must refuse it
    bad = TABLE_YAML.replace("check: definition", "check: identity")
    assert "check: identity" in bad
    _write(things_dir, bad)
    with pytest.raises(BuildError, match="no closed form"):
        compile_all(things_dir, tmp_path / "generated")


def test_wrong_downstream_solution_fails_back_substitution(things_dir, tmp_path):
    # s = 2·W·Y contradicts the declared relation s = W·Y: the populated point
    # must fail the total residual check, naming the relation
    bad = TABLE_YAML.replace("s: W*Y", "s: 2*W*Y")
    _write(things_dir, bad)
    with pytest.raises(BuildError, match="proxy"):
        compile_all(things_dir, tmp_path / "generated")


def test_single_column_guard_message_is_unchanged(things_dir, tmp_path):
    # S01-preservation: the single-column path keeps the SINGULAR guard message
    # and the `Y = Table(n)` latex it emitted before multi-column support existed
    # (the message/latex are now built in a post-loop pass; this pins byte-parity).
    artifact, _ = _compile(things_dir, tmp_path)
    step = next(s for s in artifact["configurations"][0]["plan"] if s["type"] == "table")
    assert step["targets"] == ["Y"]
    assert step["guard"]["scope"] == ["Y", "s"]
    assert step["latex"].startswith("Y = ")
    assert step["guard"]["message"] == (
        "Factor is read from Demo Table, published only for Count between 10 and 40; "
        "outside that range there is no data, so it (and anything computed from it) is refused."
    )


# ============================================================================
# Real-arg MULTI-COLUMN consumption (the S02 stepped-shaft-fillet capability):
# several targets reading the SAME table at the SAME arg are grouped into ONE
# plan step, each filling its own column. S01 (single column read at two
# DIFFERENT args → two separate steps) is unaffected and is pinned above.
# ============================================================================

# arg x (a REAL ratio) → two columns [A, b]; downstream p = A·x^b and z = 10·p.
# DOF: {x, A, b, p, z} = 5 unknowns, input [x] = 1; relations kfit + down (2)
# plus the table pinning A AND b (2) = 4; 5 − 4 = 1. It ONLY balances if EACH
# column counts as one relation — the two-column DOF test.
TABLE2_YAML = textwrap.dedent("""
    id: table2-fixture
    title: Two-column table fixture
    facets: [kinematics]
    variables:
      - {symbol: x, name: Ratio arg, unit: "1", quantity_kind: ratio, default: 2.0, bounds: [1.0, 4.0], positive: true}
      - {symbol: A, name: Coefficient A, unit: "1", quantity_kind: ratio, default: 0.9, bounds: [0.0, 2.0], positive: true, role: derived}
      - {symbol: b, name: Exponent b, unit: "1", quantity_kind: ratio, default: -0.2, bounds: [-1.0, 0.0], role: derived}
      - {symbol: p, name: Product, unit: "1", quantity_kind: ratio, default: 0.78, bounds: [0.0, 10.0], positive: true, role: derived}
      - {symbol: z, name: Downstream, unit: "1", quantity_kind: ratio, default: 7.8, bounds: [0.0, 100.0], positive: true, role: derived}
    tables:
      - id: demo-AB
        name: Demo AB
        citation: src
        provenance: "Demo two-column values, invented for the fixture."
        interpolation_citation: src
        arg: x
        columns: [A, b]
        mode: interpolate-linear
        rows:
          - [1.0, 0.80, -0.10]
          - [2.0, 0.90, -0.20]
          - [4.0, 1.00, -0.30]
    relations:
      - {id: kfit, latex: 'p = A x^{b}', residual: p - A*x**b, citation: src}
      - {id: down, latex: 'z = 10 p', residual: z - 10*p, citation: src}
    configurations:
      - id: default
        label: Look up A and b at one arg, form the product
        inputs: [x]
        solutions:
          A: {table: demo-AB, at: x}
          b: {table: demo-AB, at: x}
          p: A*x**b
          z: 10*p
    derivation:
      steps:
        - expr: Eq(z, 10*p)
          prose: "z scales the tabulated product; A and b are tainted, so this is a definition step."
          rule: "definition: downstream of a two-column tabulated lookup"
          check: definition
    sim: {engine: statics-cascade, config: {}}
    sources:
      - {id: src, citation: "Fixture source."}
""")


@pytest.fixture
def things2_dir(tmp_path):
    d = tmp_path / "things" / "table2-fixture"
    d.mkdir(parents=True)
    (d / "thing.yaml").write_text(TABLE2_YAML, encoding="utf-8")
    return tmp_path / "things"


def _compile2(things2_dir, tmp_path, yaml_text=None):
    if yaml_text is not None:
        (things2_dir / "table2-fixture" / "thing.yaml").write_text(yaml_text, encoding="utf-8")
    out = tmp_path / "generated"
    compile_all(things2_dir, out)
    artifact = json.loads((out / "table2-fixture.compiled.json").read_text(encoding="utf-8"))
    fns = (out / "table2-fixture.fns.ts").read_text(encoding="utf-8")
    return artifact, fns


def test_two_columns_group_into_one_step(things2_dir, tmp_path):
    artifact, fns = _compile2(things2_dir, tmp_path)
    tsteps = [s for s in artifact["configurations"][0]["plan"] if s["type"] == "table"]
    assert len(tsteps) == 1, "A and b at the same arg must share ONE plan step"
    step = tsteps[0]
    assert step["targets"] == ["A", "b"]      # positional: column 0 = A, column 1 = b
    assert step["table_id"] == "demo-AB"
    assert step["arg_fn"] in fns              # ONE arg fn for the whole group
    assert step["rows"][0] == [1.0, 0.80, -0.10]
    assert step["rows"][-1] == [4.0, 1.00, -0.30]


def test_columns_map_by_name_not_authoring_order(things2_dir, tmp_path):
    # author b BEFORE A (a content-only 3-step swap): the targets array is still
    # [A, b] because a column is chosen by NAME, not by authoring order
    swapped = (
        TABLE2_YAML.replace("A: {table: demo-AB, at: x}", "__TMP__")
        .replace("b: {table: demo-AB, at: x}", "A: {table: demo-AB, at: x}")
        .replace("__TMP__", "b: {table: demo-AB, at: x}")
    )
    assert "b: {table: demo-AB, at: x}\n" in swapped  # b really is first now
    artifact, _ = _compile2(things2_dir, tmp_path, swapped)
    step = next(s for s in artifact["configurations"][0]["plan"] if s["type"] == "table")
    assert step["targets"] == ["A", "b"]


def test_two_column_scope_is_the_union_of_both_reaches(things2_dir, tmp_path):
    # refusing the lookup poisons BOTH columns and everything downstream:
    # A, b, p (reads A and b), z (reads p) — the union of the two reaches, sorted
    artifact, _ = _compile2(things2_dir, tmp_path)
    step = next(s for s in artifact["configurations"][0]["plan"] if s["type"] == "table")
    assert step["guard"]["scope"] == ["A", "b", "p", "z"]
    assert step["guard"]["severity"] == "invalid"


def test_two_column_dof_counts_each_column_as_a_relation(things2_dir, tmp_path):
    # a successful compile IS the proof: 5 unknowns − (2 relations + 2 columns) =
    # 1 = the single input x. If a column were treated as free, DOF would be 2.
    artifact, _ = _compile2(things2_dir, tmp_path)
    assert artifact["configurations"][0]["inputs"] == ["x"]


def test_two_column_parity_reproduces_both_columns(things2_dir, tmp_path):
    artifact, _ = _compile2(things2_dir, tmp_path)
    rows = _rows([[1.0, 0.80, -0.10], [2.0, 0.90, -0.20], [4.0, 1.00, -0.30]])
    samples = artifact["configurations"][0]["samples"]
    assert samples
    for smp in samples:
        x = smp["inputs"]["x"]
        xf = sp.Float(str(x), 50)
        expA = float(table_lookup_ref(rows, xf, "interpolate-linear", 1))
        expb = float(table_lookup_ref(rows, xf, "interpolate-linear", 2))
        assert abs(smp["outputs"]["A"] - expA) < 1e-9
        assert abs(smp["outputs"]["b"] - expb) < 1e-9
        assert abs(smp["outputs"]["p"] - expA * x ** expb) < 1e-6 * max(abs(smp["outputs"]["p"]), 1.0)
        assert abs(smp["outputs"]["z"] - 10 * smp["outputs"]["p"]) < 1e-6 * max(abs(smp["outputs"]["z"]), 1.0)


def test_two_column_latex_and_message_name_both_columns(things2_dir, tmp_path):
    artifact, _ = _compile2(things2_dir, tmp_path)
    step = next(s for s in artifact["configurations"][0]["plan"] if s["type"] == "table")
    assert step["latex"].startswith("\\left(A,\\ b\\right) = ")   # tuple LHS
    assert "Demo" in step["latex"]                                # the table name
    msg = step["guard"]["message"]
    assert "Coefficient A" in msg and "Exponent b" in msg         # both columns named
    assert "are read from" in msg
    assert "they (and anything computed from them) are refused." in msg


def test_multi_column_target_must_name_a_column(things2_dir, tmp_path):
    # a consumer of a MULTI-column table that names no column would silently map
    # to column 0 — reject it (single-column S01 template reuse stays allowed).
    # C reads demo-AB but is not a column; the loop must refuse it by name.
    fixture = textwrap.dedent("""
        id: table2-fixture
        title: Non-column consumer
        facets: [kinematics]
        variables:
          - {symbol: x, name: Ratio arg, unit: "1", quantity_kind: ratio, default: 2.0, bounds: [1.0, 4.0], positive: true}
          - {symbol: A, name: Coefficient A, unit: "1", quantity_kind: ratio, default: 0.9, bounds: [0.0, 2.0], positive: true, role: derived}
          - {symbol: b, name: Exponent b, unit: "1", quantity_kind: ratio, default: -0.2, bounds: [-1.0, 0.0], role: derived}
          - {symbol: C, name: Bad target, unit: "1", quantity_kind: ratio, default: 0.9, bounds: [0.0, 2.0], positive: true, role: derived}
        tables:
          - id: demo-AB
            name: Demo AB
            citation: src
            provenance: "Demo two-column values."
            interpolation_citation: src
            arg: x
            columns: [A, b]
            mode: interpolate-linear
            rows:
              - [1.0, 0.80, -0.10]
              - [2.0, 0.90, -0.20]
              - [4.0, 1.00, -0.30]
        relations:
          - {id: crel, latex: 'C = A', residual: C - A, citation: src}
        configurations:
          - id: default
            label: A third target names no column
            inputs: [x]
            solutions:
              A: {table: demo-AB, at: x}
              b: {table: demo-AB, at: x}
              C: {table: demo-AB, at: x}
        derivation:
          steps:
            - {expr: 'Eq(C, A)', prose: "C is tainted.", rule: "definition", check: definition}
        sim: {engine: statics-cascade, config: {}}
        sources:
          - {id: src, citation: "Fixture source."}
    """)
    with pytest.raises(BuildError, match="does not name any column"):
        _compile2(things2_dir, tmp_path, fixture)


def test_unfilled_column_fails_loudly(things2_dir, tmp_path):
    # declare a two-column table but fill only column A (b comes from a formula):
    # the b column is left an unlabelled runtime lookup — refuse it by name
    bad = TABLE2_YAML.replace("b: {table: demo-AB, at: x}", "b: x - 1.8")
    with pytest.raises(BuildError, match="never consumed"):
        _compile2(things2_dir, tmp_path, bad)


def test_columns_authored_non_consecutively_fail(things2_dir, tmp_path):
    # an eval between the two column consumers would make the runtime (which
    # fills all columns at the group's single step) and the pipeline verification
    # (which fills b at b's later position) disagree — refuse the interleaving
    fixture = textwrap.dedent("""
        id: table2-fixture
        title: Non-consecutive columns
        facets: [kinematics]
        variables:
          - {symbol: x, name: Ratio arg, unit: "1", quantity_kind: ratio, default: 2.0, bounds: [1.0, 4.0], positive: true}
          - {symbol: A, name: Coefficient A, unit: "1", quantity_kind: ratio, default: 0.9, bounds: [0.0, 2.0], positive: true, role: derived}
          - {symbol: b, name: Exponent b, unit: "1", quantity_kind: ratio, default: -0.2, bounds: [-1.0, 0.0], role: derived}
          - {symbol: w, name: Interloper, unit: "1", quantity_kind: ratio, default: 3.0, bounds: [0.0, 10.0], positive: true, role: derived}
        tables:
          - id: demo-AB
            name: Demo AB
            citation: src
            provenance: "Demo two-column values."
            interpolation_citation: src
            arg: x
            columns: [A, b]
            mode: interpolate-linear
            rows:
              - [1.0, 0.80, -0.10]
              - [2.0, 0.90, -0.20]
              - [4.0, 1.00, -0.30]
        relations:
          - {id: wrel, latex: 'w = x + 1', residual: w - (x + 1), citation: src}
        configurations:
          - id: default
            label: An eval interrupts the two column consumers
            inputs: [x]
            solutions:
              A: {table: demo-AB, at: x}
              w: x + 1
              b: {table: demo-AB, at: x}
        derivation:
          steps:
            - expr: Eq(w, x + 1)
              prose: "An ordinary closed form written between the two column lookups."
              rule: "definition"
              check: definition
        sim: {engine: statics-cascade, config: {}}
        sources:
          - {id: src, citation: "Fixture source."}
    """)
    with pytest.raises(BuildError, match="consecutively"):
        _compile2(things2_dir, tmp_path, fixture)
