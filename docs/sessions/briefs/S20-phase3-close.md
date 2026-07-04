# S20 — Phase 3 close: optional three-parallel-rods + reconciliation + report

- **ID / Title:** S20 — Phase 3 close: optional three-parallel-rods + reconciliation + report
- **Phase:** 3
- **Type:** docs (+ optional stretch THING — see Appendix)
- **Size:** M
- **Status:** DRAFT — verified by the Phase 2 closing session against merged reality before execution

## Goal

Phase 3 ends honestly: roadmap.md, CLAUDE.md, README, and `/verification/` match merged reality
**by evidence** (git log / merged-PR diff, not restated intentions); ADR-0008's accepted-split
scope is swept against what exists (solveND still absent); the phase report exists at
`docs/sessions/reports/phase-3.md` per protocol §11; the Phase 4 DRAFT briefs (S21–S25) are
verified/updated; the queue header reads `Active phase: 3 — AWAITING OWNER`; the session STOPS.
Optionally, stretch THING `three-parallel-rods` ships FIRST under the full gate — only if
context allows.

## Entry criteria

Any false → BLOCKED, do not start (protocol §1.6, §9.1).

- Main CI green: `gh run list --branch main --limit 1`
- No claimed/suspended rows (table cells, not the legend line):
  `rg "\| (PAUSED|IN_PROGRESS) \|" docs/sessions/queue.md` → zero hits
- Phase 3 ruled: `rg "Phase 3 approved" docs/sessions/queue.md` → the literal ruling line exists
- S15–S19 all resolved: `rg "^\| S1[5-9] " docs/sessions/queue.md` — every row DONE, or
  BLOCKED/SKIPPED with an owner-visible reason. No QUEUED/IN_PROGRESS/PAUSED row above S20.
  A BLOCKED row does NOT block closure — it becomes a featured section of the report.
- Phase 4 briefs exist to verify: `ls docs/sessions/briefs/S2[1-5]-*.md` → 5 files
- Report location exists or is creatable: `test -f docs/sessions/reports/phase-2.md` (the Phase 2
  close's precedent; create `docs/sessions/reports/` only if genuinely absent and say so)

## New capabilities required

**NONE — if this work turns out to need a new engine/pipeline/schema capability, STOP and BLOCK
(protocol §9.2); do not improvise one.** The stretch THING is a pure solve_linear consumer; if it
turns out to need anything new, DROP THE STRETCH — never block the closure on it.

## Physics scope

N/A for the mandatory scope. Stretch THING: see Appendix.

## Envelopes

N/A for the mandatory scope. Stretch THING: see Appendix.

## Materials axis

N/A for the mandatory scope. Stretch THING: see Appendix.

## Sim sketch

N/A for the mandatory scope. Stretch THING: see Appendix.

## Deliverables

Mandatory, in this order (stretch, if attempted, comes FIRST so the report reflects final reality):

1. **Evidence list before any edit**: `git log --oneline main --since=<Phase 3 start date>` +
   `gh pr list --state merged --limit 40 --json number,title,mergedAt` + the Phase 3 entries of
   `docs/sessions/log.md`. Every doc claim below gets a PR# attached or gets corrected. Reality
   wins; claims are edited to match merges, never the reverse. If a session cut scope silently,
   the report SAYS SO — catching that drift is why this session exists.
2. `docs/roadmap.md` Phase 3 section reconciled: shipped dates, the ACTUAL THING list, the actual
   capability wording.
3. CLAUDE.md catalog-count and phase-status lines reconciled; README count/catalog sentence.
   Recount from disk, not memory: `ls site/src/content/things` vs `/things/` vs the docs.
4. `/verification/` audited: an audit block exists for every solveLinear THING actually shipped;
   the certificate description matches what `verify.py` DOES today (read the code — later
   sessions may have adjusted caps or messages since S15 wrote the page).
5. ADR-0008 scope-vs-reality sweep: `rg -i "solvend" pipeline/ site/src` → no implementation
   anywhere (reserved/doc/schema-comment mentions only); part (b) still PROPOSED/deferred.
   Record the sweep command + result in the report.
6. `docs/sessions/reports/phase-3.md` per the protocol §11 template exactly: summary; per-session
   table; catalog before → after + capabilities in plain language; gate compliance with EVERY
   deviation and rebuttal in one list (nothing buried); BLOCKED/SKIPPED rows and why; spot-check
   menu; numbered pre-Phase-4 decisions with recommendations; brief status; risks carried forward.
7. S21–S25 DRAFT briefs verified/updated against merged reality — each brief either edited or
   explicitly confirmed unchanged; the report lists which, per brief. Check their entry-criteria
   commands still hold against post-Phase-3 file paths and counts.
8. `docs/sessions/queue.md`: S20 row → DONE with PR#; header set to the literal
   `Active phase: 3 — AWAITING OWNER`.
9. `docs/sessions/log.md` entry.

One queue row = ONE PR carrying everything above (plus the stretch if shipped).

## Exit criteria

- `docs/sessions/reports/phase-3.md` exists with per-session PR links and gate evidence
- Re-read check performed AFTER editing: CLAUDE.md/README/roadmap statements match queue.md DONE
  rows and merged PR titles exactly — verified by re-reading, not assumed
- solveND sweep result (command + output) recorded in the report
- Report lists S21–S25 verification status per brief
- Queue header literally reads `Active phase: 3 — AWAITING OWNER`; S20 row DONE with PR#
- If any site file was touched (`/verification/`, stretch THING): `pnpm build` + e2e + axe green;
  if the stretch shipped, full per-THING gate evidence in the PR body; if it did not ship, the
  report says so and why (both outcomes are compliant)
- Log entry appended; deploy spot-checked after merge
- **Session STOPS. Zero Phase 4 work** — not even "harmless prep"; no session starts Phase 4
  without the literal `Phase 4 approved — JD <date>` ruling line (protocol §8)

## Out of scope

Any Phase 4 implementation (chain engine, builder, URL serialization); re-litigating ADR-0008
part (b) / solveND; two-span continuous beam (explicitly deferred — Phase 5+ or owner request);
fixing non-Phase-3 doc drift beyond what the evidence sweep surfaces (note it in the report
instead); editing OWNER NOTES.

## Notes

- Order of operations is DECIDED: entry checks → stretch go/no-go immediately (skip if less than
  ~60% context remains after startup + scoping the reconciliation; record the decision in the
  report either way) → if GO, stretch first under the full gate → mandatory closure → one PR.
- The stretch is ABANDONABLE; the closure is not. If mid-stretch the gates threaten the closure
  budget, drop the stretch commits cleanly and proceed to closure — never PAUSE this row for the
  stretch's sake, and never merge a partial THING (protocol rules 1–2 beat the stretch).
- Branch `docs/phase3-close` (or `phase3/close-plus-rods`); PR title per §6:
  `Docs: Phase 3 close — reconciliation + report`, or
  `THING <N>: three-parallel-rods + Phase 3 close` if the stretch shipped.
- Reconciliation trap: log.md entries are self-reports; merged PR titles + diffs are the
  evidence. Where they disagree, the diff wins and the report flags it.

## Appendix — stretch THING (optional): three-parallel-rods

Structured like S11's stretch appendix: ships only if context allows; full gate, no discount.

- **Physics:** rigid hanger bar carried by three vertical parallel rods sharing a central load W;
  1-redundant symmetric axial truss. Symmetry is DECLARED, not solved: the two outer rods are
  identical (A_o, L_o, slot material E_o) and carry one variable F_outer — say so in
  overview.mdx; that is why the group is 2×2, not 3×3. Relations: equilibrium
  `2·F_outer + F_center − W = 0`; compatibility (equal elongation)
  `F_outer·L_o/(A_o·E_o) − F_center·L_c/(A_c·E_c) = 0`. solve_linear group
  `{F_outer, F_center}`. Closed form the certificate reproduces:
  `F_center = W·k_c/(k_c + 2·k_o)` with k = AE/L. Readouts σ_outer, σ_center, load fractions.
- **Golden + citation:** hand-derived golden from the stiffness-share formula with steel/aluminum
  numbers (hand-checkable; authorized). Citation: Hibbeler, *Mechanics of Materials*, ch. 4
  statically-indeterminate axially-loaded members — pin edition/§ against the copy consulted.
  Cross-check `test_threerods_physics.py`: springs-in-parallel first principles, independent of
  thing.yaml residuals (composite-bar's cross-check is the model to imitate).
- **Envelopes:** `|σ_i| ≥ σ_y,i` → warn (first yield in whichever rod). Load direction is fixed
  (hanging, all rods in tension) so no separation/compression case — say so in overview.mdx.
- **Materials axis:** two S17 slots (outer pair, center rod) binding E and σ_y — swap the center
  rod's material and watch the load share migrate (the invariant-3 moment, same as
  composite-bar).
- **Sim:** three rods + hanger bar; W knob; StressBands per rod; draw key `three-parallel-rods`;
  imitate composite-bar. New SVG classes in `global.css`.
- **Deliverables/pins:** `site/src/content/things/three-parallel-rods/{thing.yaml, overview.mdx,
  failure.mdx}`; sim + CSS; physics test + golden; e2e presence + warn pins; catalog count +1
  everywhere it is stated.
