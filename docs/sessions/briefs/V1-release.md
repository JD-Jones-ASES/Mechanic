# V1 — v1.0.0 release: docs rewrite + human-POV pass + repo polish + tag

**Ruling:** R10 + R12 (owner, in-session 2026-07-07). **Branch:** `docs/v1-release`. **One PR**,
then the tag + GitHub Release after the merge deploys green (the tag is not part of the PR).

## Entry criteria

- S26 merged, deployed, live site spot-checked (catalog at 37).
- `git status` clean on main; latest main CI run green.

## Deliverables

1. **Human-POV site pass** — walk the built (or live) site as a person would: home, catalog +
   search, THING pages across all three categories, chain-builder + all three examples,
   verification, attributions, 404, dark mode, mobile width, console. Findings fixed in this
   branch (content/CSS-level fixes only; anything ADR-scale is recorded, not built).
2. **`CLAUDE.md` rewritten as the lean agent entry point** for a fresh repo download: what the
   project is, the five invariants (kept verbatim in spirit, tightened), how to build and test,
   the hard traps (no blind solve; UTF-8/PowerShell; generated artifacts never committed), and a
   doc map branching to `docs/` — with the session system described as how the repo was built
   and what a future session must do before writing code. Assume the reader is any coding agent,
   not only a queue-driven working session.
3. **`README.md` refreshed as the human entry point** — v1.0.0 framing, catalog 37, accurate
   links; the student and AI-experiment sections kept and reconciled.
4. **`docs/roadmap.md` closed out** — phases 1–4 + release marked complete; "Phase 5 — Materials
   depth" rewritten as **Future paths (no standing queue, owner-commissioned)** per R10.
5. **Queue set to its terminal state** (dormant; nothing claimable without a new ruling line) and
   the session log carries the final entries.
6. **Repo shape polish**: LICENSE/LICENSE-content stay as-is; add CITATION.cff (educational
   resource, cite-this-repo) if it earns its place; confirm no stray/untracked junk ships;
   `.gitignore` intact; no generated artifacts committed.
7. **Tag `v1.0.0` + GitHub Release** on the final green main commit, notes summarizing: 37
   THINGs, the verification model (ADR-0007), the chain-builder, the live site URL, and the
   educational-use disclaimer.

## Exit criteria

- Warm `pnpm build` + full e2e green on the branch; review pass on the diff; PR merged; deploy
  green; live site spot-checked; tag + Release published and visible.

## Out of scope

New THINGs or capabilities beyond S26; analytics; custom domain; restructuring `docs/sessions/`
history (it stays where it is, as the development record).
