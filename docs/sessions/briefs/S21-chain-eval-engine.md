# S21 — Chain evaluation engine: refusal + provenance propagation (headless, no UI change)

- **ID / Title:** S21 — chain-eval engine extraction + refusal/provenance propagation
- **Phase:** 4
- **Type:** engine
- **Size:** M
- **Status:** DRAFT — verified by the Phase 3 closing session against merged reality before execution

## Goal

`site/src/engines/chain-eval.ts` exists and is the only place chain orchestration lives:
`evaluateChain(...)` walks the planner's `evaluationOrder()`, builds one `RelationEngine` per node
instance, forwards bound values, fans out per-node material values, and returns (a) a per-node
evaluation record wrapping `EvalResult` and (b) per-binding provenance records (value, source
instance/port, the relation citations along the upstream path — the raw material S24 renders).
Refusal propagation is implemented per the DECIDED rule table below, closing the current
invariant-5 gap: ChainDemo.tsx (lines ~99–108) forwards bound values even when the upstream node
is refused. Refusals can leave values fully finite — the sim contract in `docs/architecture.md`
says NaN-sniffing is never sufficient — so today a refused upstream would feed plausible wrong
numbers downstream. ChainDemo.tsx becomes a thin consumer; the live `/chain-demo/` page is
behaviorally identical and its e2e goldens pass unmodified.

## Entry criteria

Each with a check command; any false → BLOCKED, do not start (protocol §1.6, §9.1).

- Main CI green: `gh run list --branch main --limit 1`
- Phase 4 ruling line present (protocol §8): `rg -n "Phase 4 approved — JD" docs/sessions/queue.md`
- No PAUSED/IN_PROGRESS rows: `rg -n '\|\s*(IN_PROGRESS|PAUSED)\s*\|' docs/sessions/queue.md` returns nothing
- Phase 3 rows terminal (S15–S20 DONE or SKIPPED): `rg -n "^\| S1[5-9]|^\| S20" docs/sessions/queue.md`
- ChainGraph planner + type-checker exist: `rg -n "evaluationOrder" site/src/engines/chain.ts`
  and `rg -n "connectionLegal" site/src/engines/units.ts`
- node:test infra exists (no vitest): `test -f site/tests/chain.test.mjs` (Bash tool)
- The orchestration to extract is still in the component: `rg -n "RelationEngine" site/src/components/ChainDemo.tsx`
- Regression goldens present: `rg -n "27.852" site/e2e/chain-demo.spec.ts`

## New capabilities required

**chain-eval engine** (`site/src/engines/chain-eval.ts`) — this session builds it. Authority:
roadmap Phase 4 (chaining as the product) + owner ruling 2026-07-04 (Phase 4 design approved,
refusal-propagation rule table pre-decided). Anything beyond this one module — new schema fields,
pipeline changes, new npm dependencies — is NOT granted: STOP and BLOCK (protocol §9.2).

## Physics scope

N/A — no new physics. The regression net is the existing hand-derived chain-demo goldens
(ring-fixed planetary defaults: ratio 3.5 → T_out = 350 N·m; shaft d = 40 mm → τ = 27.852 MPa;
P = T·ω survives the chain at exactly 1 kW). They are the proof the extraction changed nothing.

## Envelopes

The refusal-propagation rule table. This is DECIDED — implement it, do not re-legislate it:

| # | Upstream condition | Binding effect | Target-node effect |
|---|---|---|---|
| a | `EvalResult.invalid === true` (global) | every binding from that node withholds its value | status `refused-by-upstream`; injected `ValidityMessage` severity `invalid`; propagates transitively |
| b | source port ∈ upstream `invalidVars` (scoped) | ONLY bindings reading that port withhold | target node `refused-by-upstream` (node-level; target-side output scoping is out of scope v1) |
| c | warn-severity messages upstream | value forwards normally | nothing propagates — warn stays local to its node |
| d | bound input has no value (source unevaluated/absent) | nothing to forward | status `incomplete` — distinct from refused; NOT an invalid message |

Decided message texts (exact strings, unit-test-pinned):
- (a) `refused by upstream: '<source instance>' is invalid — bound input '<target port>' withheld`
- (b) `refused by upstream: '<source instance>.<source port>' is refused — bound input '<target port>' withheld`
- (d) `incomplete` is a status on the node record, not a `ValidityMessage`; UI copy is S22's job.

(a)/(b) inject their message into the node's `messages` so the existing `ValidityBanner` renders
them with zero component changes. Node record shape (decided): `{ instanceId, status:
'evaluated' | 'refused-by-upstream' | 'incomplete', result: EvalResult, refusedBy?: {instance,
port}[] }`. Instance ids are opaque strings distinct from thing slugs — the same THING may appear
twice; ChainDemo may keep using slugs as its two instance ids (ids are opaque, goldens hold).

## Materials axis

No new bindings. Decided boundary: `evaluateChain` accepts per-node material values already
resolved to an SI `VarRecord`; `pickProperty`/`MaterialRow` resolution stays in the UI layer
(`MaterialPicker.tsx`) — otherwise the engine would import a component, violating the headless
requirement.

## Sim sketch

N/A — no visual change. `/chain-demo/` must look and behave pixel-identically after the refactor
(keep the `data-ready` attribute gating e2e). The visual pass (§5) is on the untouched demo.

## Deliverables

- `site/src/engines/chain-eval.ts` — `evaluateChain` + exported types (node spec with instance
  id + slug + configuration, node eval record, provenance record). Zero imports from
  `site/src/components/`; no Preact imports.
- `site/tests/chain-eval.test.mjs` (node:test, pattern of `chain.test.mjs`) covering, at minimum:
  evaluation ordering; global upstream refusal poisons downstream (with finite forwarded values);
  scoped `invalidVars` poisons only bindings reading the poisoned port; warn messages do not
  propagate; provenance record lists every relation citation on the upstream path; duplicate-THING
  instances evaluate independently; `incomplete` vs `refused-by-upstream` distinction.
- `site/src/components/ChainDemo.tsx` refactored to consume the engine.
- Bookkeeping per protocol §7 (queue row, log entry) in the same PR.

## Exit criteria

- `pnpm run test:unit` green in `site/`; total strictly greater than the pre-session count
  (record both numbers in the log entry).
- `pnpm exec playwright test` green AND `git diff main -- site/e2e/chain-demo.spec.ts` is empty —
  the goldens are the regression net; touching them defeats the point.
- Headless check: `rg -n "components/|preact" site/src/engines/chain-eval.ts` returns nothing.
- No new dependencies: `git diff main -- site/package.json site/pnpm-lock.yaml` shows no
  dependency changes (repo-root lockfile likewise untouched).
- Machine-proven fact: a finite-valued but refused upstream output cannot reach a downstream
  computation — pinned by a unit test whose upstream values are all finite.
- Browser visual pass (§5) on `/chain-demo/` under the `/Mechanic/` base path: knobs move numbers,
  T_s = 200 shows 700 N·m, banner renders, console clean.
- Log entry appended; queue row S21 → DONE with PR#.

## Out of scope

`/chain-builder/` UI (S22) · URL serialization (S23) · provenance rendering (S24 — this session
only produces the records) · cyclic chains (ChainGraph keeps rejecting them; ADR-0008 deferred
nonlinear solveND) · target-side scoped poisoning (marking only the target outputs that depend on
a poisoned input) · any new npm dependency · schema changes.

## Notes

- Provenance assembly: compiled artifacts carry `relations: RelationMeta[]` each with `citation`
  and `assumptions` (`site/src/engines/types.ts`). Map each plan step's target to its relation via
  the fn-name linkage in `relation.ts` — verify the exact correspondence there before assuming it;
  do not invent a parallel metadata path.
- Trap: `RelationEngine` instances must be per node INSTANCE, not per slug, or duplicate-THING
  chains share state. The fns module itself may be shared (it is pure functions).
- Trap: rule (b) target-side granularity is node-level ON PURPOSE — computing which target outputs
  depend on a poisoned input needs plan dependency analysis that v1 explicitly skips. Do not
  half-build it.
- Sibling pattern to imitate: `site/tests/chain.test.mjs` for test structure; `ChainDemo.tsx` is
  the integration blueprint being dismantled — its `ports()` helper likely moves into the engine.
- Type/size: engine session — per-THING gate items 2–4 (physics cross-check, golden, citations)
  do not apply (protocol §3); everything else does, including the three-angle review (§4).
