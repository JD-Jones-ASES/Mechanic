"""Materials ingestion: data/materials/*.yaml -> SQLite + materials.json.

Provenance rules (docs/data-provenance.md): every value is stored AS PUBLISHED
(original value + original unit) plus a programmatic SI conversion derived from
sympy's unit data (golden-tested — silent conversion mistakes undermine the
site's stated correctness value). `basis` is first-class and never defaulted.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

import yaml

from . import BuildError
from .dims import parse_unit, si_factor

VALID_BASIS = ("spec_minimum", "design_minimum", "typical")
VALID_COST = ("low", "medium", "high", "very_high")
PROPERTY_KEYS = (
    "density", "youngs_modulus", "shear_modulus", "poisson_ratio",
    "yield_strength", "ultimate_strength", "compressive_strength",
    "modulus_of_rupture",
)
# SI display convention per property (values stored in coherent SI base units)
SI_UNIT = {
    "density": "kg/m^3", "youngs_modulus": "Pa", "shear_modulus": "Pa",
    "poisson_ratio": "1", "yield_strength": "Pa", "ultimate_strength": "Pa",
    "compressive_strength": "Pa", "modulus_of_rupture": "Pa",
}

SCHEMA_SQL = """
CREATE TABLE materials (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, class TEXT NOT NULL,
    condition TEXT NOT NULL, cost_class TEXT NOT NULL, cost_rationale TEXT NOT NULL,
    educational_only INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE properties (
    material_id TEXT NOT NULL REFERENCES materials(id),
    key TEXT NOT NULL, basis TEXT NOT NULL,
    value_published REAL NOT NULL, unit_published TEXT NOT NULL,
    value_si REAL NOT NULL, unit_si TEXT NOT NULL,
    source_id TEXT NOT NULL, citation TEXT NOT NULL,
    verified_at TEXT, cross_check TEXT, notes TEXT,
    PRIMARY KEY (material_id, key, basis)
);
CREATE TABLE errata (
    material_id TEXT NOT NULL REFERENCES materials(id),
    date TEXT NOT NULL, note TEXT NOT NULL
);
"""


def convert_to_si(value: float, unit_str: str, context: str) -> float:
    return float(value) * si_factor(parse_unit(unit_str, context), context)


def load_material(path: Path) -> dict:
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    ctx = f"material '{path.stem}'"
    for key in ("id", "name", "class", "condition", "cost_class", "cost_rationale", "properties"):
        if key not in raw:
            raise BuildError(f"{ctx}: missing required key '{key}'")
    if raw["id"] != path.stem:
        raise BuildError(f"{ctx}: id must match filename")
    if raw["cost_class"] not in VALID_COST:
        raise BuildError(f"{ctx}: cost_class must be one of {VALID_COST}")
    props = []
    for p in raw["properties"]:
        pc = f"{ctx}, property '{p.get('key')}'"
        for key in ("key", "value", "unit", "basis", "source_id", "citation"):
            if key not in p:
                raise BuildError(f"{pc}: missing '{key}'")
        if p["key"] not in PROPERTY_KEYS:
            raise BuildError(f"{pc}: unknown property key (valid: {PROPERTY_KEYS})")
        if p["basis"] not in VALID_BASIS:
            raise BuildError(f"{pc}: basis must be one of {VALID_BASIS} — never defaulted")
        value_si = convert_to_si(float(p["value"]), str(p["unit"]), pc)
        props.append({
            "key": p["key"], "basis": p["basis"],
            "value_published": float(p["value"]), "unit_published": str(p["unit"]),
            "value_si": value_si, "unit_si": SI_UNIT[p["key"]],
            "source_id": str(p["source_id"]), "citation": str(p["citation"]),
            "verified_at": str(p.get("verified_at", "")),
            "cross_check": str(p.get("cross_check", "")),
            "notes": str(p.get("notes", "")),
        })
    raw["properties"] = props
    raw.setdefault("errata", [])
    return raw


def ingest(materials_dir: Path, out_db: Path, out_json: Path) -> int:
    mats = [load_material(p) for p in sorted(materials_dir.glob("*.yaml"))]
    if not mats:
        raise BuildError(f"no materials found in {materials_dir}")

    out_db.parent.mkdir(parents=True, exist_ok=True)
    out_db.unlink(missing_ok=True)
    con = sqlite3.connect(out_db)
    con.executescript(SCHEMA_SQL)
    for m in mats:
        con.execute(
            "INSERT INTO materials VALUES (?,?,?,?,?,?,1)",
            (m["id"], m["name"], m["class"], m["condition"], m["cost_class"], m["cost_rationale"]),
        )
        for p in m["properties"]:
            con.execute(
                "INSERT INTO properties VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                (m["id"], p["key"], p["basis"], p["value_published"], p["unit_published"],
                 p["value_si"], p["unit_si"], p["source_id"], p["citation"],
                 p["verified_at"], p["cross_check"], p["notes"]),
            )
        for e in m["errata"]:
            con.execute("INSERT INTO errata VALUES (?,?,?)", (m["id"], str(e["date"]), str(e["note"])))
    con.commit()
    con.close()

    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(
        json.dumps({"educational_only": True, "materials": mats}, indent=2),
        encoding="utf-8", newline="\n",
    )
    return len(mats)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    repo = Path(__file__).resolve().parents[3].parent
    ap.add_argument("--materials", type=Path, default=repo / "data" / "materials")
    ap.add_argument("--out-db", type=Path, default=repo / "data" / "build" / "materials.db")
    ap.add_argument("--out-json", type=Path, default=repo / "site" / "src" / "generated" / "materials.json")
    args = ap.parse_args()
    try:
        n = ingest(args.materials, args.out_db, args.out_json)
    except BuildError as e:
        print(f"INGEST FAILED: {e}", file=sys.stderr)
        sys.exit(1)
    print(f"ingested {n} material(s) -> {args.out_db.name}, {args.out_json}")


if __name__ == "__main__":
    main()
