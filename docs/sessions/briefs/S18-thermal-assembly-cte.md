# S18 — CTE material column + thermal-assembly

- **ID / Title:** S18 — CTE material column + thermal-assembly
- **Phase:** 3
- **Type:** engine+THING (data capability: property column, first Θ-slot kinds, display units)
- **Size:** M
- **Status:** DRAFT — verified by the Phase 2 closing session against merged reality before execution

## Goal

The materials database gains a `coefficient_of_thermal_expansion` column with full provenance
(original value + unit + source + basis, golden-tested conversion); new kinds
`temperature_difference` (first nonzero Θ slot in the 7-vector) and `thermal_expansion_coefficient`
(Θ⁻¹); display units `K` and `1e-6/K`. THING `thermal-assembly` is live: a two-material bar
between rigid supports under uniform ΔT, a coupled solve_linear group on S17's slots — ΔT = 0
recovers the unstressed state (e2e pin); a negative test proves the Θ slot participates.

## Entry criteria

Any false → BLOCKED, do not start (protocol §1.6, §9.1).

- Main CI green: `gh run list --branch main --limit 1`
- No claimed/suspended rows (table cells, not the legend line):
  `rg -n '\|\s*(IN_PROGRESS|PAUSED)\s*\|' docs/sessions/queue.md` → zero hits
- Phase 3 ruled: `rg "Phase 3 approved" docs/sessions/queue.md` → the literal ruling line exists
- S15 DONE: `rg "S15.*DONE" docs/sessions/queue.md`; capability present:
  `rg "solve_linear" site/src/content.config.ts` and `test -d site/src/content/things/propped-cantilever`
- S17 DONE: `rg "S17.*DONE" docs/sessions/queue.md`; named slots present:
  `rg -A4 "material_binding" site/src/content/things/composite-bar/thing.yaml` shows two slots
- Scope not already shipped (a hit = shipped early; investigate, do not double-ship): both
  `rg "temperature_difference|thermal_expansion" pipeline/src/mech_pipeline/kinds.py` and
  `rg -l "coefficient_of_thermal_expansion" data/materials pipeline/src/mech_pipeline/ingest.py` → zero hits
- 13 materials seeded: `ls data/materials/*.yaml`

## New capabilities required

This session BUILDS the following (authority: owner-approved Phase 3 design 2026-07-04; roadmap
Phase 3; queue row S18); anything beyond this list → STOP and BLOCK (protocol §9.2):

1. `coefficient_of_thermal_expansion` added to `PROPERTY_KEYS` + `SI_UNIT` (SI unit `1/K`) in
   `ingest.py`; CTE entries appended to `data/materials/*.yaml`; goldens in `test_ingest.py`.
2. Kinds `temperature_difference` and `thermal_expansion_coefficient` in
   `pipeline/src/mech_pipeline/kinds.py`, commented in the file's existing style.
3. Display units `K` and `1e-6/K` (factor 1e-6) in `site/src/engines/units.ts` DISPLAY_FACTORS.
   ΔT display policy is DECIDED: **K only** — no absolute °C/°F, ever (`units.ts` is factor-only;
   offsets are affine and do not belong; ΔT is an interval quantity, so K is exactly right).
4. If a source publishes CTE in `1e-6/°F`, `dims.py` `parse_unit` may need a Fahrenheit-INTERVAL
   token (exactly 5/9 K, multiplicative, no 32-offset — name it so it can never be mistaken for
   absolute temperature); golden-test it.

## Physics scope

Two-segment bar: segment 1 (slot A: L₁, A₁, material E₁, α₁), segment 2 (slot B: L₂, A₂, E₂, α₂),
fixed between rigid supports, uniform temperature change ΔT (either sign). Relations (undirected
residuals; solve_linear group `{F_1, F_2}`, 2×2 — well inside S15's caps):

- Equilibrium: `F_1 − F_2 = 0` (one internal force path)
- Compatibility (net elongation zero): `α_1·L_1·ΔT + α_2·L_2·ΔT − F·L_1/(A_1·E_1) − F·L_2/(A_2·E_2) = 0`

Sign convention DECIDED: F positive in compression, so heating (ΔT > 0) with rigid supports gives
positive F — state it in overview.mdx and match the golden's convention explicitly. Readouts:
σ₁ = F/A₁, σ₂ = F/A₂ (pressure_stress), free thermal strain α_i·ΔT (existing `strain` kind).
Citations: Gere, *Mechanics of Materials*, ch. 2 thermal-effects section, or Hibbeler, ch. 4
thermal-stress section — pin edition/§/example against the copy actually consulted; never
fabricate a § number (protocol §3.4). Golden: a **published** worked example from one of those
(published is required here, unlike S19); record `sources[].verification` honestly. Cross-check
`test_thermal_physics.py`: re-derive the mismatch force from first principles (free expansion +
restoring-force superposition) without importing thing.yaml residuals. Negative dimension-gate
test (a deliverable): a relation adding ΔT to a length, or dropping L from an αΔT term, must
raise BuildError — the proof the Θ slot participates.

## Envelopes

- `|σ_i| ≥ σ_y,i` → **warn** (per design): past yield the linear-elastic number is untrustworthy,
  but geometry is not void — warn, never silently proceed, never invalid.
- No invalid envelope: the linear model holds for both heating and cooling. Compressive buckling
  of a slender heated bar is real but unmodeled — discuss in failure.mdx, do not fake an envelope.

## Materials axis

E, α, σ_y bind per slot (two S17 slots: segment A, segment B). ρ does not participate. The CTE
column is the capability — provenance is the critical risk, so sources are PRE-NAMED per family:

- **al-6061-t6, al-7075-t6, al-2024-t3, ti-6al-4v:** MIL-HDBK-5J per-alloy physical-properties
  figures (original unit typically 10⁻⁶ in/in/°F). CAVEAT (CLAUDE.md): MIL-HDBK-5J is publicly
  releasable but **NOT public domain — do not claim otherwise**; say so in the source notes.
- **steel-a36, steel-1045, steel-4340, ss-304, brass-c26000, nylon-66, iron-gray-class30:**
  NIST publications or manufacturer/mill datasheets (the SSAB precedent in steel-a36.yaml).
  VERIFY accessibility at execution; record `sources[].verification` / `verified_at` with what
  you actually checked. MatWeb/FE-Handbook: "consistent with" cross-checks only, never the source.
- **wood-douglas-fir, concrete-normal:** no source pre-named; wood CTE is anisotropic and
  moisture-confounded. If a material's CTE cannot be legally sourced, **omit it from the CTE
  column AND from thermal-assembly's material list rather than fabricate — say so in the log.**
  Omission is pre-authorized; fabrication never is.

Forbidden sources: scraped MatWeb (EULA), anything MMPDS (docs/data-provenance.md). Append-only:
adding a new property entry to an existing yaml complies; editing existing entries does not.
Basis will almost certainly be `typical` (CTE is not a spec minimum) — record what the source
supports, value + unit exactly as published, with the `[unit spelling normalized from '…']`
notes convention where the published spelling can't parse.

## Sim sketch

Two-segment bar between rigid walls; ΔT knob; a free-expansion ghost overlay vs the constrained
bar makes the blocked expansion legible; StressBands per segment; warn banner as elsewhere. Draw
key `thermal-assembly`; imitate composite-bar (nearest sibling); new SVG classes in `global.css`.

## Deliverables

- `data/materials/*.yaml` CTE appends per the source list above (append-only diffs)
- `pipeline/src/mech_pipeline/ingest.py` (+ `dims.py` iff the °F-interval token is needed);
  `test_ingest.py` conversion goldens — µm/(m·K), 1e-6/°F (×1.8 exactly), 1e-6/K → SI 1/K
- `kinds.py`: the two new kinds; `units.ts`: `K`, `1e-6/K` entries (check-units gate must pass)
- Negative Θ dimension-gate test (in `test_dims.py` or alongside the compile negatives)
- `site/src/content/things/thermal-assembly/{thing.yaml, overview.mdx, failure.mdx}` + sim draw
  component + CSS classes
- `pipeline/tests/test_thermal_physics.py` (independent cross-check + published golden)
- e2e pins: presence; warn state; **ΔT = 0 → σ₁ = σ₂ = 0 exactly (unstressed state recovered)**;
  bookkeeping per protocol §7

## Exit criteria

- Catalog count = start + 1 on `/things/` and in CLAUDE.md/README (absolute number depends on
  the S14 shed decision — compute from the queue; the Phase 2 closing session pins it here).
  **[Phase 2 close pin, 2026-07-06: S14 band-brake was SKIPPED, so Phase 2 closed at 30 THINGs and
  Phase-3 THING numbering begins at 31 (S15 propped-cantilever = 31; on the planned S15→S18 sequence
  thermal-assembly lands at THING 35). Recompute from the queue at execution — S15's S15b fallback or
  S16's 4×4 fallback could shift the number.]**
- `uv run pytest -q` green with the itemized new tests present: ≥3 CTE conversion goldens, ≥1
  negative Θ dimension-gate test, cross-check + golden in `test_thermal_physics.py`
- Machine-proven facts: the Θ slot participates (the negative test fails the build when
  mis-authored); the coupled solution back-substitutes to zero into every relation
- `pnpm build` green including check-units with the two new display units; e2e ΔT = 0 pin green;
  visual pass per §5 (normal + warn states screenshotted and described)
- `git diff` on `data/materials/` shows only added lines in existing yamls; every new value
  carries basis + source + verification; log entry appended; queue row S18 → DONE with PR#;
  deploy spot-checked

## Out of scope

Absolute temperature as a quantity (ΔT only); °C/°F display; temperature-dependent E or α
(values are stated-temperature constants — read MIL-HDBK-5J curves at a stated temperature, say
which); transient heat transfer; 2D/3D thermal stress; buckling of the compressed bar
(failure.mdx prose only); any new sim engine.

## Notes

- PowerShell round-trip trap (§10.1): µ, α, σ, Δ, °F everywhere here — Read/Edit/Write tools ONLY.
- Kind pairing: ΔT knob = `temperature_difference`, α = `thermal_expansion_coefficient`; product
  = strain (existing kind). Property-key vs kind-name split is deliberate (cf. youngs_modulus
  property vs elastic_modulus kind) — do not "fix" it.
- Siblings to imitate: composite-bar (two-slot binding + axial sim), propped-cantilever
  (solve_linear syntax), steel-a36.yaml (property-entry provenance format).
- Branch `phase3/thermal-cte`; PR title `THING <N>: thermal-assembly (Phase 3 CTE column + Θ kinds)`.
