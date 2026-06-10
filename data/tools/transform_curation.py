"""One-time curation transform: data/curation-raw.json (the verified output of
the 2026-06-10 multi-agent curation run, 78 values: 71 confirmed, 7 flagged,
0 wrong) -> data/materials/*.yaml seed files.

Applies the cross-checker's corrections explicitly (each one annotated below)
and normalizes unit SPELLINGS to the pipeline vocabulary — values are never
changed, and the original published spelling is recorded in notes when it
differs. Committed for reproducibility per docs/data-provenance.md.
"""

from __future__ import annotations

import json
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]

# published spelling -> pipeline unit string (same physical unit, new spelling)
UNIT_MAP = {
    "ksi": "ksi",
    "Mpsi": "Msi",
    "10^3 ksi": "Msi",
    "x 10^3 ksi": "Msi",
    "10^6 psi": "Msi",
    "x10^6 lbf/in2": "Msi",
    "lbf/in2": "psi",
    "psi": "psi",
    "GPa": "GPa",
    "MPa": "MPa",
    "lb/in3": "lb/inch**3",
    "lb/in.^3": "lb/inch**3",
    "g/cc": "g/cm**3",
    "kg/m3": "kg/m**3",
    "pcf": "lb/ft**3",
    "dimensionless": "1",
    "(dimensionless)": "1",
    "-": "1",
}

# Cross-checker corrections (see check.verdicts / overall_notes in curation-raw.json)
RELABEL_BASIS = {
    # handbook moduli carry no statistical basis; relabel for cross-row consistency
    ("al-7075-t6", "youngs_modulus", "design_minimum"): "typical",
    ("al-7075-t6", "shear_modulus", "design_minimum"): "typical",
}
EXTRA_NOTES = {
    ("al-7075-t6", "yield_strength", "design_minimum"):
        "CAUTION (cross-check): MIL-HDBK-5A vintage (NASA CR-123773); current 5J/MMPDS and "
        "AMS-QQ-A-250/12 sheet minimums are ~68-69 ksi.",
    ("al-7075-t6", "ultimate_strength", "design_minimum"):
        "CAUTION (cross-check): MIL-HDBK-5A vintage; current 5J/AMS-QQ-A-250/12 sheet minimum is 78 ksi.",
    ("steel-1045", "ultimate_strength", "typical"):
        "CAUTION (cross-check): single-primary-source value; conflicting 540 MPa reproductions exist. "
        "640 MPa is the hardness-consistent choice (187 HB x ~3.4 = 645); normalized band is 570-700 MPa.",
    ("brass-c26000", "poisson_ratio", "typical"):
        "Cross-check: no exact second source; CDA's own E/G imply 0.33, MakeItFrom gives 0.31. "
        "Treat as the 0.31-0.34 band.",
    ("iron-gray-class30", "youngs_modulus", "typical"):
        "LOWER BOUND of the 13.0-16.4 Msi secant range (ASM Metals Handbook Desk Ed. 1998); gray iron "
        "has no single linear E — never present as a point value without this caveat.",
    ("concrete-normal", "poisson_ratio", "typical"):
        "Conventional design value from the published 0.15-0.20 range; display as a range.",
    ("wood-douglas-fir", "density", "typical"):
        "Published as SPECIFIC GRAVITY 0.48 (ovendry mass / volume at 12% MC), recorded here as the "
        "g/cm^3 equivalent; air-dry density including moisture mass is ~10% higher. Wood is orthotropic.",
}
# wood SG needs a real density unit for SI conversion (value unchanged: SG == g/cm^3 numerically)
UNIT_OVERRIDE = {("wood-douglas-fir", "density"): "g/cm**3"}


def main() -> None:
    raw = json.loads((ROOT / "data" / "curation-raw.json").read_text(encoding="utf-8"))["result"]
    cost = {c["material_id"]: c for c in raw["check"]["cost_classes"]}
    out_dir = ROOT / "data" / "materials"
    out_dir.mkdir(parents=True, exist_ok=True)

    for row in raw["rows"]:
        mid = row["material_id"]
        props = []
        for p in row["properties"]:
            key3 = (mid, p["key"], p["basis"])
            basis = RELABEL_BASIS.get(key3, p["basis"])
            if (mid, p["key"]) in UNIT_OVERRIDE:
                unit = UNIT_OVERRIDE[(mid, p["key"])]
            else:
                unit = UNIT_MAP[p["unit"].strip()]
            notes = p.get("notes", "")
            if unit.replace("**", "") not in (p["unit"], p["unit"].strip()):
                notes = (notes + f" [unit spelling normalized from '{p['unit']}']").strip()
            extra = EXTRA_NOTES.get((mid, p["key"], p["basis"]))
            if extra:
                notes = (notes + " " + extra).strip()
            props.append({
                "key": p["key"],
                "value": p["value"],
                "unit": unit,
                "basis": basis,
                "source_id": p["source_id"],
                "citation": p["source_citation"],
                "verified_at": p.get("verified_at_url", ""),
                "cross_check": p.get("cross_check", ""),
                "notes": notes,
            })
        doc = {
            "id": mid,
            "name": row["name"],
            "class": row["material_class"],
            "condition": row["condition"],
            "cost_class": cost[mid]["cost_class"],
            "cost_rationale": cost[mid]["rationale"],
            "properties": props,
            "errata": [],
        }
        (out_dir / f"{mid}.yaml").write_text(
            yaml.safe_dump(doc, sort_keys=False, allow_unicode=True, width=110),
            encoding="utf-8", newline="\n",
        )
        print(f"wrote {mid}.yaml ({len(props)} properties)")


if __name__ == "__main__":
    main()
