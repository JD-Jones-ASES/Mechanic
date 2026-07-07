"""Config-level guards are ONLY the auto-emitted denominator/sqrt checks
(nonzero/nonneg) plus solveLinear determinant guards (nonzero) — the runtime
(relation.ts) checks exactly those two kinds. A 'predicate' kind belongs on a
relation's validity envelope, never at the config level; the build rejects one
loudly so a future emit path cannot ship a config guard the runtime would
silently ignore (invariant 5).

There is no authoring path for a config-level predicate guard today (they are all
compiler-generated), so the rejection is exercised by monkeypatching `auto_guards`
to emit one — i.e. it guards against a future compiler change, not user input.
"""

import textwrap

import pytest

import mech_pipeline.compile as compile_mod
from mech_pipeline import BuildError
from mech_pipeline.compile import compile_all

# Minimal compilable THING: y = 2x has no denominator/sqrt, so the REAL
# auto_guards emits no config guard at all — proving the rejection below is
# caused by the injected predicate kind, not a broken fixture.
THING_YAML = textwrap.dedent("""
    id: guardkind-fixture
    title: Guard kind fixture
    facets: [stress]
    variables:
      - {symbol: x, name: X, unit: "1", quantity_kind: ratio, default: 2, bounds: [0.1, 10], positive: true}
      - {symbol: y, name: Y, unit: "1", quantity_kind: ratio, default: 1, bounds: [0, 100], positive: true, role: derived}
    relations:
      - {id: def-y, latex: 'y = 2 x', residual: y - 2*x, citation: src}
    configurations:
      - id: analyze
        inputs: [x]
        solutions:
          y: 2*x
    sim: {engine: statics-cascade, config: {draw: x}}
    sources: [{id: src, citation: "Fixture."}]
""")


@pytest.fixture
def dirs(tmp_path):
    things = tmp_path / "things" / "guardkind-fixture"
    things.mkdir(parents=True)
    (things / "thing.yaml").write_text(THING_YAML, encoding="utf-8")
    mats = tmp_path / "materials"
    mats.mkdir()  # the fixture binds no materials
    return tmp_path / "things", mats


def test_baseline_fixture_compiles(dirs, tmp_path):
    # sanity: with the real auto_guards the fixture compiles cleanly (no config
    # guard is emitted), so a failure in the next test is the injected kind alone
    compile_all(dirs[0], tmp_path / "generated", dirs[1])


def test_config_predicate_guard_rejected(dirs, tmp_path, monkeypatch):
    # force the compiler to emit a config guard of an unhandled kind
    def fake_auto_guards(expr, prefix, target):
        return [(f"{prefix}__pred", expr, "predicate", f"{target} bad")]

    monkeypatch.setattr(compile_mod, "auto_guards", fake_auto_guards)
    with pytest.raises(BuildError, match="predicate"):
        compile_all(dirs[0], tmp_path / "generated", dirs[1])
