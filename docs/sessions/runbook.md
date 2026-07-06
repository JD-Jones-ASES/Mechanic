# Operator runbook (for JD)

One page. The docs are the memory — you never need to keep context between sessions, review PRs,
run builds, or touch repo files with PowerShell.

## The launch prompt

Paste this verbatim to start every session (Claude Code, best available model — Fable 5 as of
2026-07 — repo at `C:\GitHub_Files\Mechanic`). It never needs editing:

> Read docs/sessions/protocol.md and follow it exactly. You are one autonomous working session.
> Do the startup sequence, claim the next session per the queue rules (resuming any PAUSED work
> first), execute it to a merged PR with every gate honestly green, do the session-end
> bookkeeping, and stop. If the queue says AWAITING OWNER, an entry criterion fails, or you hit
> the BLOCKED protocol — stop and report clearly instead of improvising. Never lower a gate.
> A brief is a spec, not a source: independently re-derive emitted formulas and web-corroborate
> cited constants before they ship.

## What you do, when

1. **Normal day (5 seconds):** paste the launch prompt. Repeat when the session ends. Skim the
   session's final report — especially its `Deviations` line.
2. **Phase boundary (10–15 minutes):** a session will end saying "phase report written, AWAITING
   OWNER". Then:
   a. Read `docs/sessions/reports/phase-<n>.md`.
   b. Click 2–3 items from its spot-check menu on the live site.
   c. Skim the `Deviations` lines in `docs/sessions/log.md` for the phase.
   d. Answer the report's "Decisions needed" questions — edit next-phase briefs/queue rows if you
      want changes.
   e. In `docs/sessions/queue.md`, in ONE edit: write the ruling line
      `Phase <n+1> approved — JD <date>` AND change the header from
      `Active phase: <n> — AWAITING OWNER` to `Active phase: <n+1>`. Commit to main as
      `Docs: owner phase ruling`. (Both parts matter — sessions stop on an AWAITING OWNER header
      and never flip it themselves.)
   f. Paste the launch prompt.
3. **Interjecting mid-series** (any time NO row is IN_PROGRESS or PAUSED): edit
   `docs/sessions/queue.md` directly — reorder QUEUED rows, add a row + brief, mark a row SKIPPED
   with a reason, or add a dated line under OWNER NOTES
   (`- OWNER NOTE 2026-07-12: cite SKF, not Shigley, for the bearing tables`).
   Commit to main as `Docs: owner queue edit`. Sessions honor OWNER NOTES until you remove them —
   a queue edit survives; a chat remark doesn't. **Caution when reordering:** Phase 2 briefs
   hard-code their predecessor as an entry criterion, and some orders are real dependencies
   (S01 → S02/S03 table capability; S07 → S08 frequency kind; S08 → S09 constants mechanism) —
   if you reorder, also update the affected briefs' "Dependency … DONE" entry criteria, or prefer
   an OWNER NOTE over a reorder.
4. **A session ends BLOCKED:** read its log entry (it contains the exact blocker and a
   reproduction command). Resolve — edit the brief, make a ruling, sign an ADR, or SKIP the row.
   Flip the row BLOCKED → QUEUED (or SKIPPED). Paste the launch prompt.
5. **A session ends PAUSED** (ran low on context mid-row): nothing to do — the next launch
   resumes it automatically. Paste the launch prompt.
6. **Something looks wrong on the live site:** add an OWNER NOTE describing what you saw and
   paste the launch prompt — the hotfix protocol (protocol §9.3) and errata path handle it. Don't
   edit thing.yaml math yourself under time pressure; that's what the gates are for.

## What the safety rails are

Sessions may not: lower/skip/weaken any gate, merge a partial THING, start a phase you haven't
ruled on, build an unsigned ADR-scale capability, or touch repo files via PowerShell round-trips.
Every merge requires the full gate list in protocol §3 plus a three-angle self-review (§4) —
that self-review is the review (ADR-0007). Every session leaves an audit trail: queue status,
log entry, PR body with gate evidence.
