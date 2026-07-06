# Data Provenance

Every number on the site must be traceable; every material value in `data/materials/` carries its source.
This file is the rulebook. The site itself is labeled **educational — not for design use** on every page
that shows material data.

## Legal frame

We compile **facts**. Under *Feist Publications v. Rural Telephone* (US), individual property values
("6061-T6 typical yield strength is 276 MPa") are uncopyrightable facts; compilations are protectable only
in their selection/arrangement. Therefore:

- We extract individual values into **our own schema** with our own selection. We never reproduce a
  source's table layout, ordering, or page scans.
- We never redistribute source PDFs.
- MIL-HDBK-5J carries Distribution Statement A (publicly releasable) but was prepared by a contractor
  (Battelle) — it is **not** established public domain. Cite it; do not claim PD; do not mirror it.
- Contract terms bind even where copyright doesn't: **MatWeb's EULA prohibits automated access and bulk
  storage — never scrape it.** It may be *named* as a manual cross-check ("consistent with MatWeb datasheet
  for X") only.
- Forbidden inputs to the pipeline: anything from MMPDS (Battelle copyright), CC BY-NC-SA material
  (e.g. MIT OCW tables — link as further reading, never ingest), paywalled spec text.
- Our own curated dataset is published under CC BY 4.0 so other educators can reuse it.

## Citation tiers (prefer the highest available)

| Tier | Source class | Use for | Cite as |
|---|---|---|---|
| 1 | MIL-HDBK-5J (2003) | design minimums: Ftu, Fty, E, ρ for 2024/6061/7075, Ti-6Al-4V, 4340, CRES | designation + chapter/table + form/temper + basis (A/B/S) |
| 2 | ASTM designations | specified minimums: A36, A240 (304), A48 (gray iron classes) | "ASTM A36: specified minimum yield 36 ksi" (designation only — no spec text) |
| 3 | US-gov public domain | wood (USDA Wood Handbook FPL-GTR-282), commodity prices → cost classes (USGS MCS) | document + table |
| 4 | Open vendor/association data | CDA alloy pages (brass), manufacturer TDS (polymers) | named datasheet + date |
| 5 | Cross-checks only | NCEES FE Reference Handbook, MatWeb, textbooks | "consistent with …" — never the sole source |

## The `basis` field is not optional

`spec_minimum` (ASTM-style specified minimum) · `design_minimum` (statistical A/B/S basis — systematically
*below* textbook numbers) · `typical` (nominal/average — what textbooks print). Students will see 6061-T6
yield as ~241–248 MPa (B-basis sheet) in 5J and 276 MPa (typical) in their textbook. **Both are correct.**
Where both exist we store both rows; widgets default to `typical` (matches coursework) and display the
basis label next to every value. Never mix bases silently.

## Mechanics of a seed entry (`data/materials/<id>.yaml`)

- Original published value + original unit (`42 ksi`, `10.1 Msi`, `0.098 lb/in3`). SI conversion happens in
  `ingest.py` with golden tests (`42 ksi → 289.58 MPa`). Hand-converted values are a build failure waiting
  to happen — don't.
- `source_id` resolving to a full citation (designation, table, form, temper), plus `verified_at` (URL
  actually consulted) and optional `cross_check`.
- Condition/temper/form pinned ("sheet, 0.25 in, T6") — allowables vary by product form.
- Files are **append-only**: corrections add a dated entry to `errata:` and a new value row; never silently
  edit a published number. The site renders the errata log.

## THING-level source pinning (`sources[].verification`)

Materials provenance (above) is one surface; the other is the THING's own `sources[]` block in
`thing.yaml`. Every relation and validity envelope must cite a source id that resolves there;
each source entry MAY additionally carry a `verification:` string recording **how the citation
was pinned** ("§9.x checked against the publisher TOC, 2026-07-04", "re-derived from the exact
Fourier series + cross-checked against Roark's closed form"). It renders on `/verification/`;
omitting it displays as **"not section-pinned"** — an honest state (ADR-0007). The rules:

- Never invent precision you didn't verify: a fabricated §-number is worse than no pin.
- When the primary PDF is inaccessible (the recurring case since S02), pin by first-principles
  re-derivation plus web-corroboration and SAY SO in the string — the physics test, not
  transcription, carries the weight.
- Coverage is deliberately incremental: older THINGs predate the field and show unpinned
  sources honestly. Backfilling is real verification labor (each pin must actually be performed),
  never a bulk text edit.

## What Materials Project is and isn't (future sidebar, not v1)

MP (CC BY 4.0) provides DFT-computed elastic properties of idealized crystalline phases. Those are not
engineering-alloy allowables, and single-crystal moduli ≠ polycrystalline handbook moduli. If we ever
surface MP data it gets its own clearly-framed pedagogical sidebar; it never populates the materials table.
