# Session log

Append-only; one structured entry per session, newest LAST. The entry template is in
`docs/sessions/protocol.md` §11. Sessions read the last 2 entries at startup — write
`Notes-for-next` as a message to a stranger.

## S00 — Docs: session system bootstrap — 2026-07-04 — PR #11 — MERGED

- Shipped: `docs/sessions/` (protocol, queue, log, runbook, brief template, 25 briefs
  S01–S25, reports stub); ADR-0008 → ACCEPTED (split scope; owner sign-off 2026-07-04);
  roadmap + CLAUDE.md updated with the four owner rulings; doc-gap hardening pass over
  `docs/authoring-things.md` and `docs/architecture.md`. Catalog count unchanged (17).
- Gates: docs-only session — CI green on the PR (pipeline pytest + site build + unit + e2e + axe)
  was the merge gate, verified before merging; no new tests.
- Golden: N/A (no THING shipped).
- Citations pinned: N/A. Note: per-THING briefs name canonical sources; pinning happens in the
  THING sessions themselves.
- Deviations from brief: none (the approved plan was the brief).
- New capabilities future briefs may rely on: the session system itself. The tabulated-data
  capability design (S01 brief + future ADR-0009) and solveLinear design (S15 brief) are DECIDED
  designs — implement them as specified, don't re-litigate; genuine conflicts with reality →
  BLOCKED per protocol §9.2.
- Notes-for-next (S01): the `table` plan-step design in your brief is the deliberate design the
  roadmap demanded — read the whole brief before touching schema. The owner rulings of 2026-07-04
  are enumerated as R1–R6 in `docs/sessions/queue.md` ("Owner rulings on record") with R1–R4 also
  recorded in `docs/roadmap.md` and ADR-0008; Phase 2 is approved, Phases 3–4 are not yet ruled.
  The queue's rulings block is authoritative over anything else you infer.
