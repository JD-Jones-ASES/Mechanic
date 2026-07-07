# D1 — Portal IA: category taxonomy + home/catalog redesign + search

- **ID / Title:** D1 — course-spine taxonomy (`category`/`topic`), structured home/catalog, Pagefind search UI
- **Phase:** 4 (design track; owner ruling R8, 2026-07-06; spec: `docs/decisions/ADR-0010-portal-ia.md` §1–§3, §5)
- **Type:** feature (site/UI + 36 additive yaml edits; no pipeline changes)
- **Size:** L — solo; never claimed via the continuation rule; growth beyond L → PAUSED (§9.4)
- **Status:** FULL

## Goal

The home page is a structured catalog: hero with build-proof stats, a working search box, and the
36 THINGs grouped by course-spine category and topic in ADR-0010's mapping and order — no more
flat unordered grid. `/things/` renders the same shared component (no duplicate drift). Every
THING's `thing.yaml` carries its authored `category` (+ `topic` where the ADR says so). Restrained
visual polish per ADR-0010 §5 lands with it (type scale, spacing, cards, per-category accents).

## Entry criteria

Each with a check command; any false → BLOCKED, do not start (protocol §1.6, §9.1).

- Main CI green: `gh run list --branch main --limit 1`
- Phase 4 ruling line present: `rg -n "Phase 4 approved — JD" docs/sessions/queue.md`
- No PAUSED/IN_PROGRESS rows: `rg -n '\|\s*(IN_PROGRESS|PAUSED)\s*\|' docs/sessions/queue.md` returns nothing
- QC2 and S21 DONE: `rg -n "^\| QC2|^\| S21" docs/sessions/queue.md` shows both DONE
- ADR-0010 ACCEPTED with the mapping table: `rg -n "22 \+ 10 \+ 4 = 36" docs/decisions/ADR-0010-portal-ia.md`
- Pipeline ignores unknown top-level thing.yaml keys (re-verify before editing 36 files):
  inspect `pipeline/src/mech_pipeline/ingest.py` — key validation exists for material property
  keys only; no top-level thing.yaml key whitelist. If a whitelist appeared since, BLOCKED.
- Pagefind emits its UI into the dist: after any `pnpm build`,
  `test -f site/dist/_pagefind/pagefind-ui.js` (Bash tool)
- Catalog is 36: `ls site/src/content/things | wc -l` = 36 (if it grew, extend the ADR mapping
  for the new slugs FIRST as part of this session — an unmapped THING is a build error by design)

## New capabilities required

**NONE beyond ADR-0010 §1–§3/§5 as specified** (the `category`/`topic` Zod fields are the ADR's
granted scope; the pipeline is untouched). Anything more — new pipeline steps, new npm
dependencies, client-side filter frameworks — STOP and BLOCK (§9.2).

## Physics scope

N/A — no physics, no emitted-number changes. The regression net is: every existing golden and
e2e spec passes unmodified.

## Envelopes

N/A — no relation envelopes. The analogous honesty rule: an unknown `category`/`topic` value
FAILS THE BUILD loudly (assert in the catalog component); no silent "Other" bucket (ADR-0010 §1).

## Materials axis

N/A — untouched.

## Sim sketch

Not a sim session. Layout per ADR-0010 §2: hero (tightened mission copy + build-time stats from
the compiled artifacts, same arithmetic `/verification/` does, each stat linking there; chain
link → `/chain-demo/` until S22/S25 update it) → search box → category sections in spine order
with topic subheads → cards (title, summary, facet chips, category accent token). New CSS in
`global.css` (tokens for the three category accents; type-scale/spacing polish per §5; small
hand-authored inline SVG category icons — no icon library).

## Deliverables

- `site/src/content.config.ts`: additive `category` (required enum:
  `mechanics-of-materials | machine-design | mechanisms-dynamics`) + `topic` (optional string).
- 36 × `thing.yaml`: one `category:` line each (+ `topic:` per the ADR table). Verify each
  assignment against the THING's own overview while editing (rule 6 — the mapping is a spec,
  not a source); a genuine mismatch is a logged deviation with reasoning, not a silent remap.
- Shared catalog component (e.g. `site/src/components/CatalogSections.astro`) owning the
  category/topic display names + order; unknown value → build error. Consumed by `index.astro`
  and `things/index.astro`.
- Redesigned `site/src/pages/index.astro` (hero + stats + search + sections) and
  `things/index.astro` (sections + search); `global.css` polish per ADR-0010 §5.
- Pagefind UI wiring on the two catalog pages only (script from `_pagefind/`, loaded deferred;
  graceful degradation under `astro dev` where `_pagefind/` doesn't exist).
- e2e: category sections render exactly 36 THING cards once each in ADR order; a search query on
  the built dist returns a known THING; axe serious/critical = 0 on `/` and `/things/`;
  THING-page eager JS unchanged (no new scripts on `/things/{slug}/`).
- `docs/authoring-things.md`: document `category`/`topic` as mandatory template fields.
- Bookkeeping per protocol §7.

## Exit criteria

- Cold `pnpm build` green (the 36 yaml edits re-fingerprint everything — expect the full ~3–4 min
  pipeline pass ONCE; §9.5 if anything smells stale).
- `pnpm exec playwright test` fully green: new catalog/search/axe specs pass, ALL existing specs
  untouched and green (site-wide regression net — merge is publish).
- `uv run pytest -q` green, count unchanged (pipeline untouched).
- No new dependencies: `git diff main -- site/package.json site/pnpm-lock.yaml` empty.
- Machine-checkable honesty: removing any one THING's `category` line fails the build (spot-check
  locally, don't commit it); an unknown category value fails the build.
- Browser visual pass (§5): built dist under `/Mechanic/` — SEE the grouped catalog in spine
  order, search return a THING, dark mode intact, mobile reflow sane; console clean; screenshots
  (desktop + mobile + dark) to scratchpad.
- Log entry appended; queue row D1 → DONE with PR#.

## Out of scope

THING-page wayfinding (D2: related/chains-with/prev-next/badges) · any client-side filter/sort
UI · rank/order fields · a `statics` category (ADR-0010 §1) · webfonts/rebrand · touching
`/chain-demo/`, `/verification/`, `/materials/`, `/about/` beyond the shared shell/polish ·
pipeline/schema changes beyond the two fields · analytics of any kind.

## Notes

- Trap: Zod objects strip unknown keys by default — the fields must be IN the schema or they
  silently vanish from `getCollection` data; that's the loud-failure test in exit criteria.
- Trap: Pagefind's UI assets exist only post-build; e2e must run against the built dist (existing
  pattern), and the dev-mode fallback must not error the console.
- Trap: the hero stats must be COMPUTED from the compiled collection at build time, not
  hardcoded — hardcoded counts are the drift QC audits keep finding elsewhere.
- Imitate: `verification.astro` for iterating compiled artifacts to compute stats;
  `materials/index.astro` for build-time SVG (category icons); existing `.card-grid` CSS as the
  base to evolve, not replace wholesale.
- The `data-pagefind-body`/`data-pagefind-ignore` attributes already exist site-wide — do not
  re-index or change indexing scope in this session.
