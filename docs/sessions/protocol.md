# Session protocol — the operating manual for autonomous working sessions

You are one autonomous working session (Claude, typically Opus 4.8), cold-starting from
documentation alone. **One session = one context window.** One queue row = one merged PR (or an
honest BLOCKED/PAUSED stop). The five invariants in `CLAUDE.md` and the gates below are
load-bearing. The failure mode this document exists to prevent: a session with a stale or
ambiguous brief silently doing the wrong thing. When docs and reality disagree, **reality wins and
you stop and record** — you never improvise the docs back into agreement.

Rules that hold even if you read nothing else:

1. **Never lower a gate to make it pass** — no weakening, skipping, `xfail`-ing, or deleting a
   test; no downgrading `invalid` → `warn`; no fudged goldens. Gate can't pass honestly → §9.1.
2. **Never merge a partial THING** — a half-verified THING on the public site breaks the
   credibility spine. Context running low → §9.4.
3. **Never start a phase whose ruling line is absent from `queue.md`** — the owner's
   phase-boundary control is real (§8).
4. **Merge is publish.** Every push to main deploys the public site with no review step
   (ADR-0007). Act like it.
5. **Never round-trip repo files through PowerShell `Get-Content`/`Set-Content`** — see §10.1.

## §1 Startup sequence (exact order, do not skip)

1. `CLAUDE.md` (auto-loaded) and this file, in full.
2. `docs/sessions/queue.md` — check, in order:
   a. **OWNER NOTES** → honor every note still present; they override briefs and remain binding
      until the owner removes them.
   b. Queue header says **AWAITING OWNER** → **stop and report**; do nothing. (Only the owner
      flips the header off AWAITING OWNER — see §8.)
   c. Any row **PAUSED** → resuming it IS your session; go to §9.4 resume procedure.
   d. Any row **IN_PROGRESS** → crashed session; go to §9.6.
   e. All rows of the active phase DONE/SKIPPED but `reports/phase-<n>.md` is missing or the
      header is not AWAITING OWNER → the phase close is unfinished; **performing §8 IS your
      session**.
   f. Otherwise: verify the active phase has its literal ruling line
      (`Phase <n> approved — JD <date>`) — absent → **stop and report**. Present → claim the
      **topmost QUEUED row of the active phase**.
3. Your brief: `docs/sessions/briefs/<ID>-<slug>.md`, in full.
4. The **last 2 entries** of `docs/sessions/log.md` — `Notes-for-next` is a contract written for you.
5. The active phase's section of `docs/roadmap.md`. For THING sessions:
   `docs/authoring-things.md` in full. `docs/architecture.md` and ADRs on demand.
6. **Preflight** (all must pass before writing any code):
   - `git status` clean on `main`; `git pull` up to date.
   - `gh run list --branch main --limit 1` shows the latest main run green. Red → §9.3, which
     preempts your brief.
   - Toolchain: `node --version` (24.x), `pnpm --version` (11.5.2 per `packageManager`),
     `uv --version`, Playwright chromium present (`pnpm exec playwright install chromium` in
     `site/` if not).
   - **Every entry criterion in the brief, verified by its stated check command.** Any false →
     do NOT start: mark the row BLOCKED with the failed criterion, log it, stop (§9.1).

## §2 Claiming and branching

Branch names match history: `thing/<slug>` (single THING), `phase<N>/<slug>` (engine, capability,
or feature work), `docs/<slug>`, `hotfix/<slug>`. Your **first commit on the branch** flips the
queue row QUEUED → IN_PROGRESS — the claim marker that makes crashes detectable. **Status cells
hold ONLY the bare token** (QUEUED / IN_PROGRESS / PAUSED / …) — the guard greps in every brief
depend on this; record the branch name in the row's Date cell (`2026-07-12 · thing/foo`), details
in the log. All session-end bookkeeping (§7) rides in the same PR, so `main` only ever shows
QUEUED or DONE for finished work.

**Continuation rule:** after fully completing a row (PR merged, bookkeeping done, deploy verified),
if you judge **≥50% of your context remains**, you MAY claim the next QUEUED row — fresh branch,
fresh PR, full startup checks including a re-read of OWNER NOTES (minus re-reading docs already in
context). Never batch two rows into one PR. When in doubt, stop; a clean stop costs one relaunch.

## §3 The per-THING gate, as commands

All of these, in order, all green, before the PR is opened. Working directories matter.

1. **Machine verification + site gates**: `pnpm build` in `site/` — runs pipeline gen →
   `check:katex` → `check:mdx` → `check:parity` → `check:units` → `astro build` → pagefind.
   Cold ≈ 3–4 min (four-bar branch verification dominates; **slow, not hung** — set command
   timeout ≥ 6 min). Warm rebuilds are seconds.
2. **Independent physics cross-check**: new `pipeline/tests/test_<short>_physics.py` (repo
   convention shortens the slug: `test_belt_physics.py`, `test_ssbeam_physics.py` — match it) that
   RE-DERIVES the governing result from first principles (equilibrium / compatibility / energy /
   `dsolve`) — not by importing `thing.yaml`'s residuals. `uv run pytest -q` in `pipeline/` green.
3. **Hand-checkable numeric golden**: ≥ 1 test asserting a published or by-hand value, source
   pinned in a comment (the Timoshenko-worked-example pattern from compound-cylinder).
4. **Citations**: every `sources[]` entry carries `verification:` with the actual pinning method
   and date. Web-pin where possible. Never invent precision you didn't verify — "not
   section-pinned" is an honest state; a fabricated §-number is not.
5. **Engine unit tests**: `pnpm run test:unit` in `site/`.
6. **E2E + axe**: `pnpm exec playwright test` in `site/` — add pins per the brief; a new THING
   gets at minimum a presence pin and a refusal pin.
7. **Browser visual pass** (§5).
8. **Multi-angle self-review** (§4).
9. **Bookkeeping** (§7) committed into the branch.

Engine, feature, and docs sessions run the same list minus items 2–4, plus the brief-specific
certificates (e.g. solveLinear's per-sample certificate tests). A session whose brief ships a
THING alongside engine/feature work runs the full list for that THING.

## §4 Multi-angle self-review

ADR-0007: no human reviews this — **these passes are the review.** Before opening the PR, run
three INDEPENDENT review passes over the full branch diff (separate subagents with fresh context
where the environment supports them; otherwise sequential passes with an explicit persona reset):

- **(a) Physics** — re-derive independently; check signs, limiting cases (r_i→0, ν symbolic,
  λ→λ_T-style limits), units, envelope boundary values, branch labels.
- **(b) Invariants** — the five invariants + factory pattern: no bespoke sim math; sim consumes
  `invalid` AND `invalidVars`; materials only from `data/materials/`; derived defaults recomputed
  as a set; validity on relations, not widgets; **no weakened or deleted tests anywhere in the diff**.
- **(c) Code/tests** — is the physics test actually independent; is the golden actually
  hand-checkable; do new SVG classes exist in `global.css`; are e2e pins meaningful; no committed
  generated artifacts.

Every finding is **fixed or explicitly rebutted in the PR body**. Zero findings from all three
angles on a non-trivial diff is suspicious — say why it's believed. If the `/code-review` skill is
available, run it at high effort in addition, not instead.

## §5 Browser visual pass

Playwright passing is NOT a visual pass — the four-bar once shipped an invisible SVG with every
functional test green. Procedure:

1. `pnpm build` then `pnpm preview` in `site/` — serve the **built dist**. Dev mode skips the
   gates and the `/Mechanic/` base path.
2. Open the new/changed pages with the available browser tooling (Playwright screenshot script or
   the preview/browser tools). URLs include the `/Mechanic/` base path.
3. Verify with eyes: the sim visibly renders and knobs visibly move it; drive a knob into an
   invalid envelope and SEE the refusal (`SimRefusal`; for scoped envelopes, the refused readout
   withheld while the page stands); switch material and watch numbers change; KaTeX blocks render
   with no red error blocks; browser console free of errors; the `/things/` card and
   `/verification/` audit block appear.
4. Screenshot normal AND refused states to the scratchpad. Describe **what was checked** — not
   "looks good" — in the PR body and log entry.

## §6 PR and merge

One PR per queue row. PR title = the future squash-commit title, matching history exactly:
`THING <N>: <name> (<phase context>)` · `Phase 3 (item 3): <capability>` · `Docs: <what>` ·
`Hotfix: <what>`. PR body: link to the brief; the gate checklist with evidence (test counts,
golden value + source, visual-pass description, review findings + dispositions).

Merge with `gh pr merge --squash --delete-branch` ONLY after: local gates green, CI green on the
PR, review findings dispositioned, bookkeeping committed. After merge: watch the main run through
DEPLOY (`gh run watch` or `gh run list --branch main --limit 1`), then spot-check
<https://jd-jones-ases.github.io/Mechanic/> shows the new content. Deploy failed → §9.3.

## §7 Session-end bookkeeping (inside the PR, before merge)

- `queue.md` row → DONE with PR# and date.
- `log.md` → append exactly one entry per the template (§11).
- CLAUDE.md catalog-count line and README count/catalog sentence updated when THINGs shipped.
- `docs/roadmap.md` item marked shipped with date.

After merge (not in the PR): verify the Pages deploy per §6.

## §8 Phase boundary stop rule (hard)

The session that completes the **last QUEUED row of a phase** additionally:

1. Writes `docs/sessions/reports/phase-<n>.md` per the template (§11).
2. Verifies/updates the next phase's DRAFT briefs against merged reality (they were written ahead
   of time; reconcile, don't trust).
3. Sets the queue header to `Active phase: <n> — AWAITING OWNER`.
4. **Stops.**

No session ever starts a next-phase row unless `queue.md` contains the literal ruling line
`Phase <n+1> approved — JD <date>`. This is checkable at startup and exists so the owner's
phase-boundary control is real.

**The owner — never a session — flips the header off AWAITING OWNER**: when ruling, the owner
writes the ruling line AND sets the header to `Active phase: <n+1>` in the same edit (runbook
step 2e). A session that finds a ruling line but an unflipped header stops and reports — it does
not "help".

## §9 Failure protocols

Every branch below ends in a queue flip + log entry + stop. None ends in a lowered gate.

**9.1 BLOCKED — a gate cannot pass honestly.** Examples: a citation can't be pinned and the value
can't be independently confirmed; a solve1d bracket can't be made structural; the physics
cross-check disagrees with the cited source; SymPy can't verify a step and no honest reformulation
works; a brief entry criterion is false. Procedure: capture the exact failing command + output;
revert to the last clean commit or keep honest WIP on the branch; push and open a **draft** PR
titled `BLOCKED: <ID> — <reason>` (visibility without publish risk); flip the queue row to BLOCKED
with a one-line reason + log pointer; append a log entry with full reproduction and what was
tried; stop. **Only the owner flips BLOCKED → QUEUED.**

**9.2 Invariant conflict / capability creep.** If executing the brief would violate an invariant,
or the THING needs a capability the brief's `New capabilities required:` line doesn't grant, or
the work is ADR-scale: do NOT improvise. Drafting an ADR as PROPOSED in `docs/decisions/` is
allowed; **building it unsigned is not.** Then BLOCKED per 9.1 with "awaiting owner sign-off".
The planetary-gearset test applies: if your change would break the 2-DOF reference case, the
change is wrong, not the gearset.

**9.3 Main is broken** (preflight red, or post-merge deploy failure). Fixing main preempts the
queued brief — red main poisons every later session and the public site. Diagnose from the Actions
log. Small and obvious: `hotfix/<slug>` branch, PR `Hotfix: …`, **full gates — hotfixes get no
discount**, merge, verify deploy; then proceed to the queued session only if comfortably more than
half your context remains, else log the hotfix as this session's work and stop. Not small: BLOCKED
per 9.1 against a synthetic top-of-queue row `MAIN BROKEN: <symptom>`.

**9.4 PAUSED — context running low mid-row.** Trigger: you judge you cannot finish ALL remaining
gates + review + bookkeeping with ~20% context margin — gates cost more context than they look.
Stop feature work immediately. Bring the branch to a CLEAN PARTIAL state (everything committed;
ideally `pnpm build` passes — if not, say so explicitly); push the branch; do NOT open a mergeable
PR; flip the row's Status cell to the bare token PAUSED (branch name in the Date cell, per §2 —
never decorate the Status cell); append a log entry whose `State:` section
is exact resume instructions **written for a stranger** (what's done, what's unverified, the next
command to run); stop. The next session's first duty (§1.2c) is resuming this row on the same
branch before claiming anything new.

**9.5 Incremental-cache staleness.** Fingerprint = `thing.yaml` + pipeline source + SymPy version,
so MDX/sim/engine edits legitimately reuse compiled artifacts (correct, not stale). If a
discrepancy smells like a stale artifact: reproduce COLD first — delete `site/src/generated/things`
and rebuild (3–4 min) — before concluding anything. CI's `actions/cache` key hashes the same
inputs; `restore-keys` partial hits are safe because `compile.py` re-checks per-THING
fingerprints. Escape hatch for a genuinely suspect CI cache: `gh cache delete`, or touch a
pipeline source comment to bust the key. **Never hand-edit anything under `site/src/generated/`.**

**9.6 Crash recovery** (queue shows IN_PROGRESS but you're a fresh session). The claimed branch
exists remotely. PR merged but bookkeeping missing → do the bookkeeping only (small `Docs:` PR),
then continue normally. Unmerged → read the log/PR breadcrumbs; **default to a clean restart** on
a fresh branch (rename the stale one `stale/<ID>`) unless the crashed branch is demonstrably
near-complete and intelligible — confusing inherited state is exactly the silent-wrong-work trap.
Say which you chose in the log.

## §10 Environment (Windows 11 Home, PowerShell 5.1 primary shell)

1. **The file-corruption trap (has bitten before):** never round-trip repo files through
   PowerShell `Get-Content`/`Set-Content`/`Out-File`. PS 5.1 reads BOM-less UTF-8 as ANSI and
   silently mojibakes every em-dash and Greek letter (ν, σ, ω, δ — this repo is full of them);
   `-Encoding utf8` on write adds a BOM, which is its own corruption. Repo files are edited with
   the Read/Edit/Write editor tools ONLY. Shell writes are for scratchpad files. If a scripted
   repo transform is truly needed, use the Bash tool (Git Bash handles UTF-8 sanely) and verify
   the diff shows no encoding churn before committing.
2. **Cold build is slow, not hung**: `pnpm build` cold ≈ 3–4 min with long silences. Timeouts
   ≥ 6 min (360 000+ ms). Do not kill and retry — retries re-pay the cold cost.
3. PS 5.1 has no `&&`. Use the Bash tool for chains, or `;` / `if ($?)` in PowerShell. Working
   directories: `pnpm` commands run from `site/`; `uv run pytest -q` from `pipeline/` (or
   `uv run --directory pipeline pytest -q`).
4. **Pins (do not float)**: Node 24.x (`node:sqlite` is RC; `engines` field + CI), pnpm 11.5.2
   (`packageManager` field; `pnpm install --frozen-lockfile`), `uv.lock` committed (SymPy 1.14.0;
   `uv sync --locked`), `setup-uv@v8.2.0` in CI. Never update a lockfile as a side effect — a
   deliberate dependency change is its own PR with owner-visible reasoning.
5. **Playwright**: first run on a machine needs `pnpm exec playwright install chromium` (CI does
   `--with-deps`; locally chromium alone suffices). E2E runs against the BUILT dist — build first.
6. The site serves under the **`/Mechanic/` base path** — visual passes and hand-typed URLs must
   include it; `pnpm preview` serves the built dist correctly.
7. **Line endings / encoding red flag**: a whole-file-rewrite diff on a file you barely touched
   means encoding or EOL churn — stop and fix before committing.
8. Generated artifacts (`site/src/generated/`, `data/build/`) are **never committed**. If
   `git status` shows them, you've done something wrong upstream — `.gitignore` is intact.

## §11 Templates

The brief template lives at `briefs/_TEMPLATE.md`. The other two live here so a session never
invents structure.

### Log entry (append to `docs/sessions/log.md`, newest last)

```markdown
## <ID> — <title> — <date> — PR #<n> — MERGED | BLOCKED | PAUSED
- Shipped: <THINGs/capabilities, slugs, catalog count before → after>
- Gates: pytest <n> passed; pnpm build clean (cold/warm, duration); unit <n>; e2e <n>;
  visual pass: <what was actually looked at, normal + refused>; review: <angles run,
  findings count, fixed/rebutted>
- Golden: <source + value + match precision>
- Citations pinned: <method; anything that couldn't be pinned, said honestly>
- Deviations from brief: none | <each deviation + why>
- New capabilities future briefs may rely on: <or none>
- Notes-for-next: <traps hit, cache/env quirks — written as a message to a stranger>
```

For BLOCKED/PAUSED add:
`- State: <branch, what builds, what doesn't, exact resume instructions or exact blocker + reproduction command>`

### Phase report (`docs/sessions/reports/phase-<n>.md`; audience = JD, 10 minutes)

```markdown
# Phase <n> report — <date>
- Summary: one paragraph — what the phase set out to do and what happened.
- Sessions: table of ID | shipped | PR | deviations (one line each).
- Catalog: <before> → <after> THINGs; capabilities added (one plain-language line each).
- Gate compliance: statement that every merge passed the full gate, plus EVERY deviation
  and rebuttal collected in one list (nothing buried).
- BLOCKED / SKIPPED rows and why.
- Spot-check menu (~2 min each): 2–3 live URLs with one sentence on what to look for;
  one derivation to eyeball; the /verification/ delta.
- Decisions needed before phase <n+1>: numbered questions, each with a recommendation.
- Next-phase briefs: status (DRAFT verified/updated), what the owner may want to edit.
- Risks carried forward.
```
