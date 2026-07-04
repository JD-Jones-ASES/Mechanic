# S24 — Citation/provenance flow through chains + /verification/ chaining section

- **ID / Title:** S24 — surface chain provenance records + /verification/ chaining honesty section
- **Phase:** 4
- **Type:** feature + docs
- **Size:** M
- **Status:** DRAFT — verified by the Phase 3 closing session against merged reality before execution

## Goal

Every chain readout on `/chain-builder/` and `/chain-demo/` carries a collapsed-by-default native
`<details>` disclosure tracing the number all the way home: value → its relation (with citation) →
each bound input → the upstream instance/port it came from → THAT value's relation citations,
recursively to chain depth (cap 6). A chain-level "assumptions in play" panel aggregates relation
assumptions and active validity messages across all nodes. `/verification/` gains a chaining
section that states plainly what IS machine-verified in a chain and what is NOT — the roadmap's
bar ("every number keeps its citation through the chain") met without overclaiming (ADR-0007).

## Entry criteria

Each with a check command; any false → BLOCKED, do not start (protocol §1.6, §9.1).

- Main CI green: `gh run list --branch main --limit 1`
- Phase 4 ruling line present (protocol §8): `rg -n "Phase 4 approved — JD" docs/sessions/queue.md`
- No PAUSED/IN_PROGRESS rows: `rg -n "PAUSED|IN_PROGRESS" docs/sessions/queue.md` returns nothing
- S21 and S22 DONE in queue: `rg -n "^\| S2[12]" docs/sessions/queue.md` shows both DONE
  (S23 is assumed merged — order S21→S22→S23→S24 — but is not strictly required; if S23 is not
  DONE, note it in the log and proceed)
- Provenance records exist in the engine: `rg -n "provenance" site/src/engines/chain-eval.ts`
- Relation metadata carries citations + assumptions: `rg -n "assumptions|citation" site/src/engines/types.ts`
- The host pages exist: `test -f site/src/pages/chain-builder.astro && test -f site/src/pages/chain-demo.astro && test -f site/src/pages/verification.astro` (Bash tool)

## New capabilities required

**NONE — if this work turns out to need a new engine/pipeline/schema capability, STOP and BLOCK
(protocol §9.2); do not improvise one.** S21's provenance records and the compiled artifacts'
`RelationMeta` (citation, assumptions) are the complete data supply; this session renders them.

## Physics scope

N/A — no new physics, no new numbers. The e2e anchor is the existing demo chain: shaft τ must
trace to BOTH the shaft torsion relation's citation AND the planetary torque-balance relation's
citation through the T_out → T binding.

## Envelopes

No new relation envelopes. The assumptions panel semantics are DECIDED:
- Contents = union of `RelationMeta.assumptions` for every relation actually used in the current
  evaluation (all nodes) + every ACTIVE `ValidityMessage` across nodes, each tagged with its
  severity and owning instance.
- Refusals (local and refused-by-upstream) appear in the panel with severity `invalid` — the
  panel never hides a refusal behind a disclosure.
- Warn messages appear panel-level but remain local per S21 rule (c): listing is not propagation.

## Materials axis

N/A — no new bindings. Where a bound input's value came from a material property, the disclosure
shows the material source line the MaterialPicker already exposes; do not invent a second
provenance path for materials.

## Sim sketch

Presentation is DECIDED (do not redesign): collapsed-by-default native `<details>/<summary>` per
readout — no new interactive widget classes, keyboard/AT support for free per ADR-0006.
RENDER-ON-OPEN required for perf: disclosure content is built lazily on the `toggle` event, not
during the main render (deep chains × many readouts would otherwise bloat every evaluation).
Depth follows the chain, capped by the 6-node limit. New CSS classes (indentation of the
recursive trace, severity tags in the assumptions panel) go in `global.css`.

## Deliverables

- Provenance disclosure component (e.g. `site/src/components/ProvenanceTrail.tsx`) consuming
  S21's per-binding provenance records; wired into the Readouts rendering on BOTH
  `/chain-builder/` and `/chain-demo/` (consistency is the point — the demo is not left behind).
- Chain-level assumptions-in-play panel component on both pages.
- `/verification/` chaining section (edit `site/src/pages/verification.astro`), stating:
  - MACHINE-VERIFIED: per-THING compiled functions (SymPy-verified solved forms), dimension AND
    quantity-kind legality of every wire (`connectionLegal`), refusal propagation (unit-tested,
    S21), conservation e2e goldens (350 N·m / 27.852 MPa / 1 kW).
  - NOT machine-verified: cross-THING modeling consistency — e.g. the ideal-lossless assumption
    when one THING's output feeds another is a citation-level assumption, not a machine proof.
    Per ADR-0007, this is disclosed, not glossed.
- e2e additions (extend `site/e2e/chain-demo.spec.ts`-adjacent coverage in a NEW spec file;
  existing specs stay untouched): open a downstream readout's disclosure and assert it names the
  upstream instance, port, and both relations' citations; assert the assumptions panel lists a
  known assumption and shows a tripped refusal with severity.
- axe pins covering the new disclosures (serious/critical = 0).
- Bookkeeping per protocol §7.

## Exit criteria

- e2e: shaft τ provenance names `planetary` instance, `T_out` port, and both citations; the
  assumptions panel assertions pass; `pnpm exec playwright test` fully green; existing spec files
  unmodified (`git diff main -- site/e2e/chain-demo.spec.ts` empty).
- axe serious/critical = 0 on `/chain-builder/`, `/chain-demo/`, `/verification/`.
- No new dependencies: `git diff main -- site/package.json site/pnpm-lock.yaml` shows no
  dependency changes.
- EXPLICIT REVIEW ITEM (goes in the PR body): every sentence of the new `/verification/` section
  checked against actually-shipped behavior — each "machine-verified" claim names the test that
  proves it; any claim without a test is rewritten or deleted. An overclaiming /verification/
  page is worse than none.
- Browser visual pass (§5): open disclosures on a 3-node chain in the built dist; SEE the
  recursive trace, the citations, the assumptions panel updating when a knob trips an envelope;
  console clean.
- Log entry appended; queue row S24 → DONE with PR#.

## Out of scope

Curated examples and walkthrough prose (S25) · any change to provenance record CONTENT (that is
S21's engine; gaps found here → BLOCKED, not patched in the UI) · exporting/printing provenance ·
per-material provenance beyond what MaterialPicker already shows · custom disclosure widgets or
animation libraries · rewriting existing /verification/ sections beyond adding the chaining one.

## Notes

- Trap: "citations along the upstream path" must come from the provenance records, not
  re-derived in the component — if the record lacks something the UI needs, that is an S21
  contract gap: BLOCK rather than duplicating engine logic UI-side (invariant 4).
- Trap: render-on-open means the disclosure content must be built from the CURRENT evaluation at
  toggle time — stale-closure bugs (showing pre-knob-change provenance) are the likely failure;
  e2e should change a knob, then open the disclosure.
- Trap: nested `<details>` inside `<details>` for the recursive trace is legal HTML and
  keyboard-accessible — prefer it over a bespoke tree widget.
- Imitate: `/verification/` page's existing audit-block tone — plain declarative sentences, each
  falsifiable; `chain-demo.spec.ts` header comment style for the e2e derivations.
- Feature+docs session: per-THING gate items 2–4 do not apply (protocol §3); three-angle review
  (§4) — with the /verification/ text check as a named finding area — and visual pass (§5) apply
  in full.
