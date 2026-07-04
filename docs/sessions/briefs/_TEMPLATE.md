# S<NN> — <Title>

Every field below is mandatory; write `N/A` explicitly rather than deleting a section. A brief
must let a cold session execute without judgment calls it cannot make alone — pre-answer design
questions here, or expect a BLOCKED stop.

- **ID / Title:** S<NN> — <title>
- **Phase:** 2 | 3 | 4
- **Type:** THING | engine+THING | engine | docs | hotfix
- **Size:** S | M | L — L means solo (never claimed via the continuation rule); if mid-session
  the work grows beyond L, that is a PAUSED trigger (protocol §9.4), not a license to rush.
- **Status:** FULL | DRAFT (DRAFT briefs are verified by the prior phase's closing session before
  execution)

## Goal

One paragraph: what exists on the live site / in the repo when this is done.

## Entry criteria

Each with a check command; any false → BLOCKED, do not start (protocol §1.6). Examples:
- Prior capability exists: `<command that proves it>`
- Main CI green: `gh run list --branch main --limit 1`
- Materials/properties needed already seeded: `<check against data/materials/ or ingest tests>`

## New capabilities required

DEFAULT: **NONE — if this work turns out to need a new engine/pipeline/schema capability, STOP
and BLOCK (protocol §9.2); do not improvise one.** Only engine-session briefs list capabilities
here, each with its authority (ADR / roadmap line / owner ruling).

## Physics scope

Governing relations expected (sketch); canonical citations to use (book, edition, chapter);
suggested numeric-golden source (a specific worked example if known).

## Envelopes

Which validity conditions; warn vs invalid; scoped or global; the physical reason each exists.

## Materials axis

Which properties bind (E, G, σ_y, ρ, …); any new property column needed (→ that's a capability;
see above). If the THING has no material axis, say so and why that's honest.

## Sim sketch

What to draw; which shared engines/components (useSimClock, StressBands, SimRefusal); the draw
key to register. New SVG classes go in global.css.

## Deliverables

Explicit file list, e.g.:
- `site/src/content/things/<slug>/{thing.yaml, overview.mdx, failure.mdx}`
- sim draw component + CSS classes
- `pipeline/tests/test_<slug>_physics.py` (independent cross-check + golden)
- e2e pins (presence + refusal at minimum)
- display-unit / kind registry entries if any

## Exit criteria

Each checkable, e.g.:
- catalog count = <N> on /things/ and in CLAUDE.md/README
- `uv run pytest` count ≥ <prev> + <k>
- machine-proven fact: <the specific limit/theorem the build proves>
- live page renders sim + refusal state (visual pass per protocol §5)
- log entry appended; queue row DONE

## Out of scope

Explicit non-goals — the pressure valve against scope creep.

## Notes

Traps specific to this work; sibling THINGs to imitate (name the slug); anything the executor
would otherwise have to guess.
