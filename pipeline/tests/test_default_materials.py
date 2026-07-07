"""R7 per-slot `default_material` (ADR-0010 §6): a THING may name the material a
slot LANDS on. compile.py passes the authored `materials.defaults` through to the
artifact and, in compile_all (cache-independently), validates that every landing
id EXISTS in the material seed and QUALIFIES for its slot — publishes every
property the slot binds. A bad id is a loud build error, never a silent fallback.

These pins author a controlled tiny material seed so qualification is exact and
not hostage to the real data/materials/ contents.
"""

import json
import textwrap

import pytest

from mech_pipeline import BuildError
from mech_pipeline.compile import compile_all

# minimal compilable single-slot THING: strain and safety factor off one bound
# material. `defaults` lands the `default` slot on steel-test.
THING_YAML = textwrap.dedent("""
    id: matdef-fixture
    title: Material default fixture
    facets: [stress]
    variables:
      - {symbol: P, name: Load, unit: N, quantity_kind: force, default: 1000, bounds: [0, 1.0e6], positive: true}
      - {symbol: A, name: Area, unit: m**2, quantity_kind: area, default: 1.0e-4, bounds: [1.0e-6, 1.0e-2], positive: true}
      - {symbol: E, name: Modulus, unit: Pa, quantity_kind: elastic_modulus, default: 200.0e9, bounds: [1.0e9, 400.0e9], positive: true, role: material}
      - {symbol: sy, name: Yield, unit: Pa, quantity_kind: pressure_stress, default: 250.0e6, bounds: [1.0e6, 2.0e9], positive: true, role: material}
      - {symbol: eps, name: Strain, unit: "1", quantity_kind: ratio, default: 1.0e-5, bounds: [0, 1], positive: true, role: derived}
      - {symbol: SF, name: Safety factor, unit: "1", quantity_kind: ratio, default: 1.0, bounds: [0, 1.0e9], positive: true, role: derived}
    materials:
      binds: {E: youngs_modulus, sy: yield_strength}
      defaults: {default: steel-test}
    relations:
      - {id: hooke, latex: 'eps = P/(A E)', residual: eps - P/(A*E), citation: src}
      - {id: margin, latex: 'SF = sy A/P', residual: SF - sy*A/P, citation: src}
    configurations:
      - id: analyze
        inputs: [P, A]
        solutions:
          eps: P/(A*E)
          SF: sy*A/P
    sim: {engine: statics-cascade, config: {draw: x}}
    sources: [{id: src, citation: "Fixture."}]
""")


def _material(mid: str, keys: tuple[str, ...]) -> str:
    props = "\n".join(
        f"      - {{key: {k}, value: 1.0e8, unit: Pa, basis: typical, source_id: s, citation: c}}"
        for k in keys
    )
    return textwrap.dedent(f"""
        id: {mid}
        name: {mid}
        class: test
        condition: test
        cost_class: low
        cost_rationale: test
        properties:
    """).rstrip() + "\n" + props + "\n"


@pytest.fixture
def dirs(tmp_path):
    things = tmp_path / "things" / "matdef-fixture"
    things.mkdir(parents=True)
    (things / "thing.yaml").write_text(THING_YAML, encoding="utf-8")
    mats = tmp_path / "materials"
    mats.mkdir()
    # steel-test / alu-test publish BOTH bound properties (qualify); partial-test
    # publishes only youngs_modulus (does NOT qualify a slot binding yield_strength)
    (mats / "steel-test.yaml").write_text(
        _material("steel-test", ("youngs_modulus", "yield_strength")), encoding="utf-8"
    )
    (mats / "alu-test.yaml").write_text(
        _material("alu-test", ("youngs_modulus", "yield_strength")), encoding="utf-8"
    )
    (mats / "partial-test.yaml").write_text(
        _material("partial-test", ("youngs_modulus",)), encoding="utf-8"
    )
    return tmp_path / "things", mats


def _set_defaults(dirs, line: str) -> None:
    (dirs[0] / "matdef-fixture" / "thing.yaml").write_text(
        THING_YAML.replace("defaults: {default: steel-test}", line), encoding="utf-8"
    )


def test_valid_default_passes_through_to_artifact(dirs, tmp_path):
    things, mats = dirs
    compile_all(things, tmp_path / "generated", mats)
    artifact = json.loads((tmp_path / "generated" / "matdef-fixture.compiled.json").read_text("utf-8"))
    assert artifact["material_defaults"] == {"default": "steel-test"}


def test_no_defaults_emits_null(dirs, tmp_path):
    things, mats = dirs
    # drop the whole defaults line: a THING with no landing materials emits null
    (things / "matdef-fixture" / "thing.yaml").write_text(
        THING_YAML.replace("  defaults: {default: steel-test}\n", ""), encoding="utf-8"
    )
    compile_all(things, tmp_path / "generated", mats)
    artifact = json.loads((tmp_path / "generated" / "matdef-fixture.compiled.json").read_text("utf-8"))
    assert artifact["material_defaults"] is None


def test_unknown_default_id_fails(dirs, tmp_path):
    _set_defaults(dirs, "defaults: {default: no-such-material}")
    with pytest.raises(BuildError, match="unknown material id 'no-such-material'"):
        compile_all(dirs[0], tmp_path / "generated", dirs[1])


def test_non_qualifying_default_fails(dirs, tmp_path):
    # partial-test publishes youngs_modulus but NOT yield_strength — the slot binds
    # both, so the landing id does not qualify
    _set_defaults(dirs, "defaults: {default: partial-test}")
    with pytest.raises(BuildError, match="does not qualify for this slot"):
        compile_all(dirs[0], tmp_path / "generated", dirs[1])


def test_unknown_slot_fails(dirs, tmp_path):
    _set_defaults(dirs, "defaults: {sleeve: steel-test}")  # THING has only a `default` slot
    with pytest.raises(BuildError, match="unknown material slot 'sleeve'"):
        compile_all(dirs[0], tmp_path / "generated", dirs[1])
