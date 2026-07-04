# S22 — /chain-builder/ MVP: native controls, no drag-and-drop

- **ID / Title:** S22 — /chain-builder/ MVP page + ChainBuilder island
- **Phase:** 4
- **Type:** feature
- **Size:** L — solo; never claimed via the continuation rule. If mid-session the work grows
  beyond L, that is a PAUSED trigger (protocol §9.4), not a license to rush.
- **Status:** DRAFT — verified by the Phase 3 closing session against merged reality before execution

## Goal

`/chain-builder/` is live: a user picks THINGs and configurations from the catalog, adds up to 6
node instances, wires output ports to input ports through native `<select>` rows, and sees every
node evaluate in planner order with the full per-THING UI (knobs, readouts, material picker,
validity banner) — refusals propagating per S21's rules, illegal wires rejected with the engine's
real reason strings. This is the largest UI session of the project: the state model below is
pre-pinned so the session assembles rather than designs.

## Entry criteria

Each with a check command; any false → BLOCKED, do not start (protocol §1.6, §9.1).

- Main CI green: `gh run list --branch main --limit 1`
- Phase 4 ruling line present (protocol §8): `rg -n "Phase 4 approved — JD" docs/sessions/queue.md`
- No PAUSED/IN_PROGRESS rows: `rg -n "PAUSED|IN_PROGRESS" docs/sessions/queue.md` returns nothing
- S21 DONE in queue: `rg -n "^\| S21" docs/sessions/queue.md` shows DONE
- chain-eval engine exists headless: `test -f site/src/engines/chain-eval.ts` and
  `rg -n "refused-by-upstream" site/src/engines/chain-eval.ts`
- The four panel components exist: `ls site/src/components/{KnobPanel,Readouts,MaterialPicker,ValidityBanner}.tsx` (Bash tool)
- ADR-0006 (native controls / a11y) unchanged: `test -f docs/decisions/ADR-0006-accessibility.md`

## New capabilities required

**NONE — if this work turns out to need a new engine/pipeline/schema capability, STOP and BLOCK
(protocol §9.2); do not improvise one.** The builder consumes S21's engine and the existing
ChainGraph/connectionLegal as-is.

## Physics scope

N/A — no new physics. The e2e conservation golden is hand-derived by this session from already-
verified relations, derivation shown in test comments (the `chain-demo.spec.ts` precedent:
planetary ring-fixed defaults give ratio 3.5, T_out = 350 N·m, P conserved at 1 kW).

## Envelopes

No new relation envelopes. The builder's obligation is DISPLAY of three distinct node states,
visually and programmatically distinguishable (decided in S21): local refusal (the node's own
`ValidityBanner` invalid message) vs `refused-by-upstream` (S21's distinct message text, rendered
through the same banner plus a node-level state class) vs `incomplete` (neutral copy, e.g.
`input 'T' is unbound — connect a source or set a knob`; NOT styled as an error).

## Materials axis

Per-node `MaterialPicker` rendered for every node whose artifact has a non-null
`material_binding`, exactly as `/chain-demo/` does for the shaft. Material resolution
(`pickProperty` → SI `VarRecord`) stays UI-side per S21's decided boundary. No new properties.

## Sim sketch

Not a sim page. Layout: node cards in planner `evaluationOrder()` (re-layout on every wiring
change), each card = title + config label + MaterialPicker (if bound) + KnobPanel (unbound inputs
only) + Readouts + ValidityBanner. Binding editor: rows of native `<select>`s —
source instance.port → target instance.port — with add/remove buttons. Rejections (from calling
`graph.connect()` for real) render the engine's actual reason strings in an `aria-live="polite"`
region: `dimension mismatch: [...] → [...]`, `quantity kind mismatch: ... (same dimensions,
different meaning)`, `connection would create a feedback loop (out of scope in v1)`. DECIDED per
ADR-0006: this is NOT a drag-and-drop canvas — a read-only SVG chain diagram is optional garnish,
never the interaction surface, and is not required for MVP. New CSS classes go in `global.css`.

## Deliverables

- `site/src/pages/chain-builder.astro` + `site/src/components/ChainBuilder.tsx` (island).
- Catalog picker (DECIDED scope): every THING/configuration with `configuration.branches === null`
  — multi-branch configurations (four-bar open/crossed) are EXCLUDED in v1; configurations whose
  plan contains `solve1d` steps are INCLUDED (the browser engine already runs Brent). Node cap 6.
  The same THING may appear twice (opaque instance ids `n1`…`n6` from S21).
- Single serializable store (DECIDED shape — S23 serializes exactly this; keep it plain JSON, no
  Maps/functions at the boundary):
  `{ nodes: [{id, slug, config}], bindings: [{from:{node,port}, to:{node,port}}], knobs: {nodeId: {sym: SI number}}, materials: {nodeId: materialId}, displayUnits: {nodeId: {sym: unit}} }`
- Lazy fns loading via `import.meta.glob` as ChainDemo does — REQUIRED pattern: a THING's fns
  module loads on node add, never eagerly.
- `site/e2e/chain-builder.spec.ts`: keyboard-only construction of a 3-node chain
  (planetary-gearset → torsion-shaft → a third node; flywheel-disk via ω_c → omega is a legal
  angular_velocity wire and recommended) with a hand-derived conservation golden; both illegal-
  binding rejection modes pinned; cycle rejection pinned; an upstream refusal (drive a knob past
  a validity envelope) visibly refusing downstream readouts with the refused-by-upstream text.
- axe pins for `/chain-builder/` in the existing a11y spec pattern.
- Bookkeeping per protocol §7.

## Exit criteria

- e2e: the 3-node keyboard-only build passes with its conservation golden; rejection texts and
  refused-by-upstream text pinned; `pnpm exec playwright test` fully green — all existing specs
  untouched (`git diff main -- site/e2e/chain-demo.spec.ts` empty).
- axe serious/critical = 0 on `/chain-builder/`.
- Page-weight budget (DECIDED): eager island JS for `/chain-builder/` ≤ 60 kB gz (THING-page
  precedent ≈ 40 kB gz per `docs/architecture.md`, +50% for picker/wiring chrome); per-THING fns
  chunks MUST NOT be in the eager graph. Check after `pnpm build` (Bash tool):
  `for f in $(rg -o '_astro/[^"]+\.js' dist/chain-builder/index.html | sort -u); do gzip -c "dist/$f" | wc -c; done`
  — sum ≤ 61440 and no `*.fns.*` chunk in the list. Over budget → trim, do not raise the cap.
- `pnpm build` green (full gate chain); `pnpm run test:unit` green.
- Browser visual pass (§5): build a chain by hand in the built dist under `/Mechanic/`; SEE nodes
  re-order on wiring, an illegal wire announce its reason, a refusal propagate, a material switch
  move downstream numbers; console clean; screenshots (normal + refused) to scratchpad.
- Log entry appended; queue row S22 → DONE with PR#.

## Out of scope

URL serialization (S23 — but the store shape above is its contract; do not deviate from it
casually) · provenance disclosures (S24) · curated examples (S25) · drag-and-drop canvas ·
multi-branch configurations (revisit after ship, not in v1) · cyclic chains · persistence of any
kind (no localStorage) · editing THING internals from the builder (knobs and materials only —
relations stay authored) · more than 6 nodes.

## Notes

- Trap: `evaluationOrder()` only returns nodes reachable in the binding graph correctly when
  every node was `addNode`-ed — rebuild the ChainGraph from the store on every mutation rather
  than mutating a long-lived instance; the store is the single source of truth.
- Trap: knob state must survive a node's inputs changing bound/unbound status — an input that
  becomes bound hides its knob but keeps its stored value (unbind restores it).
- Trap: keyboard-only e2e means no `.click()` conveniences that assume pointer — drive selects
  with keyboard where the test claims keyboard operability.
- Imitate: `ChainDemo.tsx` for glob-loading, `data-ready` gating, and panel wiring;
  `chain-demo.astro` for the page shell; the build-time legality table there is a pattern worth
  echoing in the builder's static docs section (real verdicts as page content).
- Feature session: per-THING gate items 2–4 do not apply (protocol §3); the three-angle review
  (§4) and visual pass (§5) apply in full.
