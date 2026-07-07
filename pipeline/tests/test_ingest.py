import json
import sqlite3
import textwrap

import pytest

from mech_pipeline import BuildError
from mech_pipeline.ingest import ingest

GOOD = textwrap.dedent("""
    id: al-test
    name: Test Aluminum
    class: aluminum
    condition: "sheet, T6"
    cost_class: medium
    cost_rationale: "test"
    properties:
      - key: yield_strength
        value: 42
        unit: ksi
        basis: design_minimum
        source_id: mil-hdbk-5j
        citation: "MIL-HDBK-5J, test table"
        verified_at: "https://example.test"
        cross_check: "textbook 289 MPa"
      - key: density
        value: 0.098
        unit: lb/inch**3
        basis: typical
        source_id: fe-handbook
        citation: "FE Reference Handbook"
      - key: coefficient_of_thermal_expansion
        value: 13.0
        unit: 1e-6/degF_interval
        basis: typical
        source_id: asm-desk-ed
        citation: "ASM Metals Handbook Desk Edition, test CTE row"
""")


@pytest.fixture
def mat_dir(tmp_path):
    d = tmp_path / "materials"
    d.mkdir()
    (d / "al-test.yaml").write_text(GOOD, encoding="utf-8")
    return d


def test_ingest_converts_and_persists(mat_dir, tmp_path):
    db = tmp_path / "build" / "materials.db"
    js = tmp_path / "generated" / "materials.json"
    assert ingest(mat_dir, db, js) == 1

    con = sqlite3.connect(db)
    rows = con.execute(
        "SELECT key, value_published, unit_published, value_si, basis, unit_si FROM properties ORDER BY key"
    ).fetchall()
    con.close()
    by_key = {r[0]: r for r in rows}
    # 42 ksi -> 289.58 MPa; 0.098 lb/in^3 -> 2712.6 kg/m^3 (golden conversions)
    assert abs(by_key["yield_strength"][3] - 289.58e6) / 289.58e6 < 1e-3
    assert abs(by_key["density"][3] - 2712.6) / 2712.6 < 1e-3
    assert by_key["yield_strength"][4] == "design_minimum"
    # 13.0e-6/°F-interval -> ×1.8 exactly = 23.4e-6/K (the S18 CTE column), stored in SI 1/K
    assert abs(by_key["coefficient_of_thermal_expansion"][3] - 23.4e-6) < 1e-12
    assert by_key["coefficient_of_thermal_expansion"][5] == "1/K"  # unit_si column

    data = json.loads(js.read_text(encoding="utf-8"))
    assert data["educational_only"] is True
    assert data["materials"][0]["id"] == "al-test"


def test_missing_basis_fails(mat_dir, tmp_path):
    bad = GOOD.replace("basis: design_minimum", "basis_removed: x")
    (mat_dir / "al-test.yaml").write_text(bad, encoding="utf-8")
    with pytest.raises(BuildError, match="basis"):
        ingest(mat_dir, tmp_path / "b.db", tmp_path / "m.json")
