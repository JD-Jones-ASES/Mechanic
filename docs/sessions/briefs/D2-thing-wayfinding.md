# D2 — THING-page wayfinding + cross-linking + visual polish

- **ID / Title:** D2 — related THINGs, "chains with", prev/next, verification badge, materials links
- **Phase:** 4 (design track; owner ruling R8, 2026-07-06; spec: `docs/decisions/ADR-0010-portal-ia.md` §4–§5)
- **Type:** feature (site/UI; build-time only — no pipeline changes, no new islands)
- **Size:** M
- **Status:** FULL

## Goal

Every THING page carries static, build-time wayfinding: a related-THINGs row (same topic, then
same category/shared facets), a "chains with" block listing the legal wires its outputs can feed
(computed with the real `connectionLegal` over compiled artifacts — invariant 2 made visible),
prev/next links walking the spine order, a per-THING verification badge (its own audit numbers,
linking to its `/verification/` block), and materials chips linking to `/materials/` anchors.
The remaining ADR-0010 §5 polish (THING-page type scale/spacing consistency with D1's catalog)
lands with it.

## Entry criteria

Each with a check command; any false → BLOCKED, do not start (protocol §1.6, §9.1).

- Main CI green: `gh run list --branch main --limit 1`
- Phase 4 ruling line present: `rg -n "Phase 4 approved — JD" docs/sessions/queue.md`
- No PAUSED/IN_PROGRESS rows: `rg -n '\|\s*(IN_PROGRESS|PAUSED)\s*\|' docs/sessions/queue.md` returns nothing
- D1 DONE (taxonomy + shell exist): `rg -n "^\| D1" docs/sessions/queue.md` shows DONE and
  `rg -n "category" site/src/content.config.ts`
- `connectionLegal` importable at build time: `rg -n "export function connectionLegal" site/src/engines/units.ts`
- Compiled artifacts expose ports (dimension vector + quantity kind per variable):
  `rg -n "quantity_kind" site/src/generated/things/*.json` after a build, or the collection
  schema equivalent in `content.config.ts`
- `/verification/` has per-THING anchors (or trivially can): inspect `verification.astro` for
  per-THING block ids; adding missing `id=` anchors there is an ordinary deliverable here, not a
  capability.

## New capabilities required

**NONE — ADR-0010 §4 as specified.** All wayfinding is computed in Astro frontmatter at build
time from data that already exists (collections + compiled artifacts + `connectionLegal`). No new
islands, no client JS, no dependencies. Needing more → STOP and BLOCK (§9.2).

## Physics scope

N/A — no physics. The "chains with" block must use the engine's real legality verdicts, never a
re-implementation (invariant 4): same-function reuse, not parallel logic.

## Envelopes

N/A. Honesty rule for "chains with": list only wires `connectionLegal` actually accepts, and cap
the display (e.g. top N by target, with a "+k more" static line) rather than truncating silently —
name the cap in the rendered text if one applies.

## Materials axis

Materials chips (the widget's material source line) gain links to `/materials/` row anchors —
display-only; no binding changes.

## Sim sketch

Not a sim session. Placement: verification badge near the title (compact, factual — counts +
link, no gamified iconography); related row + "chains with" after "How it fails"; prev/next as a
footer nav (`rel="prev"/"next"`). All static HTML; new CSS in `global.css` consistent with D1's
tokens.

## Deliverables

- `site/src/pages/things/[slug].astro`: the four wayfinding blocks + badge (build-time computed).
- Anchors on `/verification/` per-THING blocks if absent (`id={slug}`) — additive only.
- `/materials/` table row anchors if absent (`id={material_id}`) — additive only.
- New CSS classes in `global.css` (badge, related row, chains-with list, prev/next footer).
- e2e (`site/e2e/` new spec; existing specs untouched): a known THING page shows expected
  related THINGs; its "chains with" block names a hand-verified legal wire (e.g. planetary
  `T_out` → torsion-shaft `T`) and does NOT name a known-illegal one (kind mismatch); prev/next
  walks the D1 spine order across a category boundary correctly; badge counts match the
  verification page's numbers for the same THING; axe serious/critical = 0 on a THING page.
- `docs/authoring-things.md`: one line noting wayfinding is derived (nothing to author).
- Bookkeeping per protocol §7.

## Exit criteria

- `pnpm build` green (warm — no yaml edits, artifacts reuse; a cold rebuild is NOT expected).
- `pnpm exec playwright test` fully green; all existing specs untouched
  (`git diff main -- site/e2e/things.spec.ts` etc. empty for pre-existing files).
- No new dependencies; no new client JS on THING pages (compare built page script tags to main).
- Machine-proven honesty: the e2e illegal-wire assertion pins that "chains with" is
  `connectionLegal`-driven, not hand-listed.
- Browser visual pass (§5): built dist — walk prev/next through a full category, open a related
  link, click a chains-with wire, follow the badge to the THING's verification block; dark mode +
  mobile sane; console clean; screenshots to scratchpad.
- Log entry appended; queue row D2 → DONE with PR#.

## Out of scope

Prefilled chain-builder URLs in "chains with" (post-S23 upgrade — noted in ADR-0010 §4, decided
at S25 or post-phase) · any change to chain-demo/chain-builder · input-side "fed by" listings
(v1 is outputs-side only; revisit post-phase) · graph visualizations · client-side JS ·
re-ranking or curating related-THING results by hand · pipeline changes.

## Notes

- Trap: importing `connectionLegal` into Astro frontmatter runs it at build time in Node — the
  engines are plain TS with no DOM dependency, so this works; if any engine import drags in a
  Preact dependency chain, that's an S21-style headless violation to report, not to work around.
- Trap: "chains with" pairs are O(N²·ports) at build time — fine at 36 THINGs; compute once into
  a map, not per-page re-scans, to keep build time flat.
- Trap: prev/next ordering must come from the same canonical order constant D1's catalog
  component owns — import it; do not re-declare the order (drift).
- Imitate: `verification.astro` audit-block arithmetic for the badge numbers (same source, same
  counts — the e2e pins they agree).
