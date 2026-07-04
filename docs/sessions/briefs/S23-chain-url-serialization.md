# S23 — URL serialization of chains (versioned fragment encoding)

- **ID / Title:** S23 — shareable chain URLs: versioned fragment encoding + graceful degradation
- **Phase:** 4
- **Type:** engine (serialization module) + minimal UI (copy-link control)
- **Size:** M
- **Status:** DRAFT — verified by the Phase 3 closing session against merged reality before execution

## Goal

A chain built on `/chain-builder/` is shareable as a plain URL on a static site: the full builder
state round-trips through a versioned URL-fragment encoding, a copy-link control puts the URL on
the clipboard, and decode-on-load degrades gracefully as the catalog evolves — naming exactly
what was dropped, never silently computing a different chain (invariant 5). A frozen v1 URL is
checked into e2e as an append-only compatibility contract: future encoding changes must keep
decoding it, forever.

## Entry criteria

Each with a check command; any false → BLOCKED, do not start (protocol §1.6, §9.1).

- Main CI green: `gh run list --branch main --limit 1`
- Phase 4 ruling line present (protocol §8): `rg -n "Phase 4 approved — JD" docs/sessions/queue.md`
- No PAUSED/IN_PROGRESS rows: `rg -n '\|\s*(IN_PROGRESS|PAUSED)\s*\|' docs/sessions/queue.md` returns nothing
- S21 and S22 DONE in queue: `rg -n "^\| S2[12]" docs/sessions/queue.md` shows both DONE
- The builder and its serializable store exist: `test -f site/src/components/ChainBuilder.tsx`
  and the store shape matches S22's brief (read the component; a drifted store shape is a
  reconcile-first situation, not a silent adaptation)
- node:test infra: `test -f site/tests/chain-eval.test.mjs`

## New capabilities required

**chain-url serialization module** (`site/src/engines/chain-url.ts`) — this session builds it.
Authority: roadmap Phase 4 + owner ruling 2026-07-04 (fragment encoding decided in the approved
Phase 4 design). Nothing else is granted — no storage APIs, no new npm dependencies, no schema
changes. Need more → STOP and BLOCK (protocol §9.2).

## Physics scope

N/A — no physics. The correctness bar is bit-faithful state round-tripping and honest
degradation.

## Envelopes

Decode-on-load degradation rules (DECIDED — this is the module's validity model):

- Unknown slug or configuration → drop that node AND its bindings; load the valid remainder.
- Unknown port → drop only that binding.
- Unknown material id → fall back to the node's default material.
- Unknown display unit → fall back to the SI default unit.
- EVERY drop/fallback appears in a legible banner naming exactly what was dropped and why —
  the banner is mandatory whenever anything degraded; silently computing a different chain is the
  forbidden failure mode (invariant 5).
- Higher format version (e.g. `#v2=`) → refuse to load ANY chain; show a version message ("this
  link was made by a newer version of the builder"). Never best-effort-parse a future format.
- Malformed payload (bad base64url/JSON, cap violations) → refuse with a message; empty builder.

## Materials axis

Material selections serialize by material id only (values always come from `data/materials/` at
load time — never serialize property values). Unknown id degrades per the table above.

## Sim sketch

N/A — UI surface is one native copy-link `<button>` (clipboard write of `location.href`) plus the
degradation banner region. Fragment updates use `history.replaceState` on state change — no
history spam. No new visual components.

## Deliverables

- `site/src/engines/chain-url.ts` — `encodeChain(state) → string`, `decodeChain(fragment) →
  {state, dropped: [...], error?}`. Encoding DECIDED: `#v1=` literal prefix + base64url-encoded
  JSON of the S22 store, verbatim S22 shape:
  `{ nodes: [{id, slug, config}], bindings: [{from:{node,port}, to:{node,port}}], knobs: {nodeId: {sym: SI number}}, materials: {nodeId: materialId}, displayUnits: {nodeId: {sym: unit}} }`.
  The `#v1=` fragment prefix ALONE carries the format version — the payload is the S22 store
  as-is, with NO inner `version` field. Compact grammar REJECTED (more code, more bug surface;
  fragment length budget is generous). Floats: SI values via default JS number→string
  (JSON.stringify), which IS shortest-round-trip — pin this fact in a comment. Knobs equal to the
  variable's default (exact SI equality) are OMITTED; the decoder refills defaults.
- Length budget (DECIDED): total URL > 2000 chars → still produce the full URL but show a warning
  ("link may be too long for some contexts — remove nodes or overrides"); NEVER shorten or
  truncate silently.
- Copy-link control + decode-on-load wiring + degradation banner in `ChainBuilder.tsx`.
- `site/tests/chain-url.test.mjs` — round-trip property coverage via a seeded-PRNG generator loop
  (node:test only; no property-testing library — no new deps): random valid states →
  `decode(encode(s))` deep-equals `s`, including float precision and omitted-default refill;
  degradation unit cases; higher-version refusal; malformed-payload refusal.
- `site/e2e/chain-url.spec.ts`:
  - FROZEN v1 URL: a literal URL string with a doc comment marking it an APPEND-ONLY
    COMPATIBILITY CONTRACT (this test is never edited, only appended to) — must decode into the
    exact pinned chain and readouts.
  - Edit a knob → URL updates → hard reload reproduces the identical chain and readouts.
  - Degradation: a URL naming a nonexistent port loads the remainder with a banner naming the
    dropped binding; a `#v2=` URL shows the version message.
- Bookkeeping per protocol §7.

## Exit criteria

- `pnpm run test:unit` green with the round-trip property suite included (record count delta in
  the log).
- `pnpm exec playwright test` fully green; frozen-URL, reload-reproduction, and both degradation
  e2e cases pass; existing specs untouched.
- No storage APIs: `rg -n "localStorage|sessionStorage|indexedDB" site/src/` returns nothing.
- No new dependencies: `git diff main -- site/package.json site/pnpm-lock.yaml` shows no
  dependency changes.
- Machine-proven fact: decode∘encode = identity over the generated state space, and the frozen v1
  URL decodes identically — the compatibility contract is a test, not a promise.
- Browser visual pass (§5): build a chain in the built dist, copy the link, open it in a fresh
  tab under `/Mechanic/`, SEE the identical chain; hand-corrupt a port name in the fragment and
  SEE the banner name the drop; console clean.
- Log entry appended; queue row S23 → DONE with PR#.

## Out of scope

Persistence beyond the URL (no localStorage, no saved-chains list — explicitly out of scope) ·
query-string encoding (fragment DECIDED: no CDN/cache-key interference on GitHub Pages,
replaceState without history spam, generous length budget, nothing sent anywhere — consistent
with the no-analytics policy; do not reopen) · short-link services (server-shaped) · compressing
the payload (revisit only if real chains blow the budget) · migrating the format (v1 is the
format; v2 is a future session's problem, constrained by the frozen test).

## Notes

- Trap: `decodeChain` must validate against the CURRENT catalog artifacts at load time — the
  encoding stores slugs/config ids/ports/material ids, and every one of them can rot as the
  catalog evolves. Degradation is the normal path, not the exception path.
- Trap: exact-SI-equality for the omit-defaults rule — compare against the artifact's `default`
  field, not a display-rounded value, or knobs silently snap on round-trip.
- Trap: `replaceState` with the fragment must not scroll-jump or re-trigger decode-on-load;
  decode runs once at mount, encode runs on state change.
- The base path matters: the frozen URL in e2e should be fragment-only relative navigation (or
  built from the test baseURL) so it survives the `/Mechanic/` prefix.
- Engine+UI session: per-THING gate items 2–4 do not apply (protocol §3); three-angle review (§4)
  and visual pass (§5) apply in full.
