# QC2 — Phase-3 QC fixes + per-slot default_material (R7)

- **ID / Title:** QC2 — Phase-3 QC-fix batch + `default_material` field
- **Phase:** 4 (top row; owner rulings R7/R9, 2026-07-06)
- **Type:** hotfix + engine (one additive schema field) + docs
- **Size:** M
- **Status:** FULL

## Goal

All four confirmed findings of the Phase-3 QC audit are dispositioned-and-fixed, the R7
`default_material` field is live (composite-bar and thermal-assembly LAND on their declared
steel+aluminium pairs), the audit's Track A (cold full-gate re-run) has run green with counts
appended to the audit report, and `docs/authoring-things.md` teaches the factory as it actually
is. **The findings brief is `docs/sessions/reports/phase-3-qc-audit.md` — read it first**; this
file only adds the R7 spec and execution notes (QC1 precedent: the audit report IS the brief).

## Entry criteria

Each with a check command; any false → BLOCKED, do not start (protocol §1.6, §9.1).

- Main CI green: `gh run list --branch main --limit 1`
- Phase 4 ruling line present (protocol §8): `rg -n "Phase 4 approved — JD" docs/sessions/queue.md`
- No PAUSED/IN_PROGRESS rows: `rg -n '\|\s*(IN_PROGRESS|PAUSED)\s*\|' docs/sessions/queue.md` returns nothing
- The audit report exists with 4 confirmed findings: `rg -n "Confirmed findings \(4\)" docs/sessions/reports/phase-3-qc-audit.md`
- The seam finding is still live (no interim fix): `rg -n "solve_linear" pipeline/src/mech_pipeline/compile.py` and confirm no target-collision rejection exists near the solutions loop
- R7/ADR-0010 §6 on record: `rg -n "R7" docs/sessions/queue.md` and `rg -n "default_material" docs/decisions/ADR-0010-portal-ia.md`

## New capabilities required

**The R7 `default_material` field ONLY** (authority: owner ruling R7 2026-07-06; spec:
ADR-0010 §6). Authored shape: `materials.defaults: { <slot>: <material_id> }`. Compile validates
the id exists and qualifies for the slot (a non-qualifying id is a BuildError, never a silent
fallback) and passes it through the compiled `material_binding`; `ThingWidget` initial selection
honors it, falling back to the current staggered-alphabetical behavior when absent. Anything
else → STOP and BLOCK (§9.2).

## Physics scope

N/A — no new physics, no emitted-number changes. (The audit's headline: zero wrong computed
values. Nothing here may change any evaluated result — assert this via unchanged goldens.)

## Envelopes

N/A — no envelope changes. (The audit's two envelope "criticals" were REFUTED — valid-while
semantics, `relation.ts:122`. Do not "fix" them.)

## Materials axis

`defaults` entries for composite-bar (steel core + aluminium sleeve) and thermal-assembly
(steel + aluminium segments) per their briefs' declared pedagogy — the exact ids are the ones the
existing e2e already selectOptions explicitly; read those specs and reuse them.

## Sim sketch

N/A — no visual changes beyond the landing material selection.

## Deliverables

1. **Finding 1 (pipeline seam):** build-time rejection when a `solutions:` target collides with a
   `solve_linear` group target in the same configuration — BuildError naming THING/config/target —
   + a pytest authoring the collision and asserting the refusal (red→green in the PR).
2. **R7 field:** schema (`content.config.ts` additive), compile passthrough + qualify-validation
   (+ pytest for the non-qualifying-id BuildError), `ThingWidget` landing honor, `defaults` lines
   in composite-bar and thermal-assembly `thing.yaml`.
3. **Finding 2 (landing e2e):** landing-state pins for both THINGs — `goto` + `data-ready`, NO
   `selectOption`, assert the declared material pair and one landing readout value (hand-derived
   in a comment).
4. **Findings 3+4 (authoring guide):** slots section (authored `binds: {slot: {sym: prop}}`,
   one-time normalization, per-slot qualifying filter, `defaults`, and the slots×scoped-refusal
   untested-interaction note); delete the `solve_hint` reference (only `solve1d`/`solve_linear`
   exist).
5. **Hardening:** fingerprint guard comment or explicit module list in `compile.py` (glob('*.py')
   brittleness); a Θ-kinds display↔SI round-trip unit test (K, 1e-6/K).
6. **Track A:** delete `site/src/generated/things`, cold `pnpm build`, `uv run pytest -q`, full
   `pnpm exec playwright test` — append counts + per-finding dispositions to
   `reports/phase-3-qc-audit.md` (QC1 pattern).
7. Bookkeeping per protocol §7 (queue row QC2, log entry, same PR).

## Exit criteria

- New pytest count ≥ previous + 2 (collision guard, defaults validation); all green.
- Landing e2e pins pass against built dist; all existing specs untouched and green.
- Track A counts recorded in the audit report Dispositions; no emitted number changed (existing
  goldens all pass unmodified).
- `rg -n "solve_hint" docs/` returns nothing; the slots section exists in authoring-things.md.
- Browser visual pass (§5): composite-bar and thermal-assembly LAND on steel+al with sensible
  readouts; console clean.
- Log entry appended; queue row QC2 → DONE with PR#.

## Out of scope

Any change to evaluated numbers · the refuted envelope "criticals" (they are correct as shipped) ·
the `×10⁻⁶/K` label (noted, no action) · a11y logging detail (noted) · D1/D2 design work ·
category/topic fields (D1) · anything touching S21–S25 scope.

## Notes

- Compile changes re-fingerprint everything — the cold build IS Track A; don't run it twice.
- The collision guard belongs near the existing `solve_linear`-vs-`solve1d`/table/multi-branch
  exclusivity check (`compile.py` ~line 814); imitate its error style.
- `ThingWidget.tsx:133–140` is the landing-selection code the defaults hook into; keep the
  staggered fallback path intact (it is legacy behavior for THINGs without `defaults`).
- Rule 6 applies to the audit report too: re-verify each finding's file/line against HEAD before
  editing (lines drift).
