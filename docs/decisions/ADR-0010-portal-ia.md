# ADR-0010: Portal information architecture (course-spine taxonomy, catalog redesign, wayfinding)

**Status:** ACCEPTED — owner sign-off JD 2026-07-06 (ruled in-session with the Phase 4 ruling;
queue rulings R8/R7). Implemented by sessions D1 (taxonomy + home/catalog + search) and D2
(THING-page wayfinding + polish); the R7 `default_material` field ships earlier, in QC2. This ADR
records the design as decided; the executing sessions implement it as specified (genuine
conflicts with reality → BLOCKED per protocol §9.2, not redesign).

## Problem

The home page is one flat, *unordered* card grid of all 36 THINGs (filesystem glob order), and
`/things/` duplicates it. `facets` tags exist but drive nothing; Pagefind indexes every page at
build time but no search UI exists; THING pages have no related-content, no prev/next, no way to
discover what an output can legally feed. An engineering undergraduate — the declared audience —
thinks in courses ("this is in my Solids class") and gets no such structure. The portal's
differentiators (verified derivations, material cascade, type-checked chaining) are invisible
from the catalog surface.

## Decision

### 1. Course-spine taxonomy: authored `category` + optional `topic`

Two additive authored fields per THING (`thing.yaml`), mirrored as additive fields in the Zod
schema (`site/src/content.config.ts`):

- `category` — **required** enum, the undergraduate course the THING belongs to. Values (spine
  order): `mechanics-of-materials`, `machine-design`, `mechanisms-dynamics`.
- `topic` — **optional** string, subgrouping within large categories. The catalog component owns
  the canonical topic list and order; an unknown category or topic **fails the build loudly**
  (invariant-5 house style — no silent "Other" bucket).

There is deliberately **no `statics` category yet**: the catalog holds exactly one
statics-flavored THING (two-bar-truss, whose actual content — axial stress, elongation, buckling
check — is Mechanics of Materials Ch. 1–2 material). A one-item section is worse wayfinding than
none; the enum grows additively when equilibrium/truss THINGs justify it.

The pipeline ignores both fields (verified: `ingest.py` validates material property keys only;
D1 re-verifies before editing). Editing 36 `thing.yaml` files re-fingerprints the whole catalog —
one cold ~3–4 min rebuild, once, locally and in CI.

**The full mapping (the spec D1 authors; verify each against the THING's own overview before
writing — a mapping line that contradicts the shipped physics is a deviation to log, rule 6):**

| Category (display name) | Topic | THINGs |
|---|---|---|
| `mechanics-of-materials` — Mechanics of Materials | Axial, Thermal & Impact | two-bar-truss, composite-bar, thermal-assembly, impact-loading |
| | Beams & Plates | cantilever-beam, simply-supported-beam, propped-cantilever, fixed-fixed-beam, beam-shear-flow, curved-beam, circular-plate |
| | Torsion & Combined Loading | torsion-shaft, rectangular-shaft-torsion, thin-tube-torsion, fixed-fixed-torsion-shaft, combined-shaft |
| | Columns & Stability | euler-column, eccentric-column |
| | Pressure & Rotating Bodies | pressure-vessel, thick-walled-cylinder, compound-cylinder, rotating-disk-bore |
| `machine-design` — Machine Design | Gears & Drives | spur-gear-pair, planetary-gearset, belt-drive, power-screw |
| | Shafts & Bearings | stepped-shaft-fillet, shaft-critical-speed, ball-bearing-life |
| | Joints, Springs & Clutches | bolted-joint-gasket, helical-spring, disk-clutch |
| `mechanisms-dynamics` — Mechanisms, Dynamics & Vibration | *(none)* | fourbar-linkage, slider-crank, flywheel-disk, torsional-oscillator |

22 + 10 + 4 = 36. Ordering within a topic: alphabetical by title (no rank field — nothing to
maintain, nothing to rot).

### 2. Home = the structured catalog (D1)

- **Hero**: the existing mission copy tightened, plus build-proof stats computed at build time
  from the compiled artifacts (N THINGs · N relations, each cited · N derivation identities
  machine-proven · N parity samples — same arithmetic `/verification/` already does), each
  linking to `/verification/`. The chain link points at `/chain-demo/` until the builder ships
  (S22/S25 update it).
- **Search box** (see §3), then **category sections in spine order**, topic-subgrouped, cards
  carrying: title, summary, facet chips (facets stay as secondary cross-cutting labels), and a
  per-category accent (CSS token). No pagination, no JS filtering — 36 cards of static HTML.
- `/things/` renders the **same shared component** (one source of truth, no drift); home adds
  the hero around it.

### 3. Search: Pagefind's own UI, catalog pages only (D1)

The `pagefind` CLI (already a dependency, already run in the build script) emits
`pagefind-ui.js`/`pagefind-ui.css` into `dist/_pagefind/` — **zero new dependencies**. D1 adds
the search UI to home and `/things/` only: THING pages stay at their current page weight, and the
UI script loads lazily (on the catalog pages, deferred). Known trap: `_pagefind/` exists only in
built output — the component must degrade gracefully under `astro dev` (visible input, "search
runs on the built site" note or progressive enhancement), and e2e exercises it against the built
dist as usual.

### 4. THING-page wayfinding (D2) — all build-time, all static

- **Related THINGs**: same topic first, then same category/shared facets; small card row after
  "How it fails". Computed in the page template at build time.
- **"Chains with"**: for each THING, the legal wires its outputs can feed — computed at build
  time by running the existing `connectionLegal` (`site/src/engines/units.ts`) over the compiled
  artifacts' port dimension-vectors + quantity kinds (invariant 2 made visible in the catalog).
  Rendered as static links to the target THING pages in v1; upgrading these to prefilled
  chain-builder URLs after S23 is a noted cheap follow-up (S25 or post-phase), not D2 scope.
- **Prev/next** within the spine order (category → topic → alphabetical), so a student can walk
  a course sequence.
- **Verification badge**: the THING's own audit numbers (relations · identities proven ·
  modeling steps · parity samples) linking to its `/verification/` block — the trust story made
  per-page.
- **Materials chips** in the widget link to `/materials/` anchors (the Ashby loop, invariant 3).

### 5. Visual identity: restrained polish (owner-decided)

Keep: the CSS-token system, system font stack, dark mode, native controls (ADR-0006), KaTeX
static rendering. Upgrade: type scale and spacing rhythm, card/section design, per-category
accent tokens, small hand-authored inline SVG category icons (static, no icon library). No
webfonts, no CSS framework, no animation library, no analytics — explicitly rejected below.

### 6. Per-slot `default_material` (R7 — built in QC2, before D1)

`materials:` gains an optional per-slot landing material:
`defaults: { <slot>: <material_id> }` (flat single-material THINGs may use
`defaults: { default: <id> }`). Compile validates the id exists AND qualifies for the slot
(binds-property coverage) — a non-qualifying id is a **build error**, not a silent fallback —
and passes it through the compiled `material_binding`; `ThingWidget` initial selection honors
it, keeping the current staggered-alphabetical behavior when absent. Landing-state e2e pins
(no `selectOption`) cover composite-bar and thermal-assembly, closing QC-audit finding 2.

## Consequences

- Two authored lines per THING become part of the template; `docs/authoring-things.md` gains
  the fields (QC2 adds the slots/authoring updates; D1 adds category/topic to the guide).
- One-time full re-fingerprint rebuild when the 36 yaml files gain `category`/`topic`.
- The catalog component becomes the single owner of category/topic display names and order;
  unknown values fail the build (no drift between yaml and UI).
- Page-weight: THING pages gain only static HTML (wayfinding blocks); the search UI is confined
  to catalog pages. S22's 60 kB eager-JS budget for `/chain-builder/` is unaffected.
- e2e grows: category sections render all 36 exactly once; search returns a known THING on the
  built dist; wayfinding links resolve; axe stays serious/critical = 0 on redesigned pages.

## Alternatives rejected

- **Facet-only filtering** — facets are physics-flavored labels (stress, mass-cost, kinematics),
  not courses; a filter over an unordered pool doesn't answer "where is my Solids material".
  Facets stay as chips, demoted to secondary.
- **A `statics` category now** — one THING; folded per §1, enum grows when the catalog does.
- **Client-side filter/sort UI** — 36 static cards need none of it; JS for what HTML does is
  against the house grain (ADR-0006).
- **Webfont/rebrand** — page weight + licensing surface for a site whose brand is the
  verification story; owner chose restrained polish.
- **A rank/order field per THING** — a maintenance liability; alphabetical-within-topic is
  stable and fair.
