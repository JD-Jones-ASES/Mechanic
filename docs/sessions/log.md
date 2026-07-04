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

## S01 — spur-gear-pair + `table` plan-step capability + ADR-0009 — 2026-07-04 — PR #13 — MERGED

- Shipped: the `table` plan step (tabulated data with provenance, ADR-0009) end to end —
  schema → compile → verify → `engines/table.ts` runtime → `check-parity` oracle → `/verification/`;
  first consumer THING 18 `spur-gear-pair` (Lewis bending, Shigley Table 14-2). Catalog 17 → 18.
- Gates: pytest 184 passed (157 baseline + 19 test_tables.py + 7 test_gear_physics.py + 1 combo
  guard); pnpm build clean (cold ≈ 4 min — pipeline-source edit busts every fingerprint; parity 819
  values / 18 artifacts, units 400 refs); unit 17 (+6 table.test.mjs); e2e 50 (+2 gear: goldens +
  scoped refusal); visual pass: opened built dist at /Mechanic/things/spur-gear-pair/ — sim draws
  two proportional pitch circles (yellow 18T pinion + larger blue 36T gear) tangent, red W_t vector,
  per-gear σ_b/SF; drove N_p=10 → pinion readouts blank to "—", pinion dashed "off table", gear
  live, red table-domain banner + yellow interference warn (page stands); material 2024-T3 → 4340
  changed SF_p 4.45 → 20.56 with σ_b fixed; KaTeX clean; console clean. review: physics +
  invariants + code/tests (3 fresh-context subagents) + /code-review high — 4 findings, all fixed
  (SF_g default 6.213→6.212; loud solve1d+table guard + test; ChainDemo planTargets; ) or rebutted.
- Golden: hand-worked Lewis at defaults (N_p=18, N_g=36, m=4mm, b=40mm, T=100 N·m, ω_p=50 rad/s):
  W_t=2777.8 N, K_v=1.29508, Y_p=0.309, Y_g=0.3775, σ_b,p=72.764 MPa > σ_b,g=59.560 MPa (pinion
  governs). Source Shigley §14-1; computed from first principles in test_gear_physics.py.
- Citations pinned: Shigley 10th ed §13-5/13-7, §14-1, Table 14-2, eq 14-4b — topic + Table 14-2
  values web-corroborated (evolventdesign tip-load basis; discrete values via search), consistent
  with Juvinall & Marshek. HONEST: Y is cited data, not machine-proven; kinematics/force path ARE
  re-derived. Could NOT access Juvinall's exact table this session → cross-pinned against the
  web-corroborated multi-source standard set instead (recorded in sources[].verification).
- Deviations from brief: (1) Materials — bound a SINGLE shared `sigma_y` (both gears), not
  independent per-gear materials. Per-gear DIFFERENT materials needs S17 multi-material binding
  slots, NOT granted to S01 (§9.2 capability creep). Per-gear SF STILL lands via Y_p < Y_g (pinion
  governs); the two-material pedagogy is prose + an S17 forward-link in failure.mdx. (2) Golden is
  hand-worked, not Shigley Example 14-1 verbatim (its exact figures weren't web-accessible; the gate
  accepts a by-hand value). (3) `emit_js.py` needed no change (arg fn reuses emit_function) —
  listed as a deliverable but not required. (4) Barth constant 6.1 m/s and φ=20° are constrained
  constant VARIABLES (v_b, phi) to keep relations dimensionally homogeneous — the established
  constraint idiom, since the first-class cited-constants mechanism is S08.
- New capabilities future briefs may rely on: the `table` plan step (interpolate-linear + exact-row;
  threshold + rows_from schema-reserved). S02 (stepped-shaft-fillet) is the next consumer and will
  exercise real-arg multi-column tables — NOTE: multi-column consumption (one lookup filling several
  targets) is NOT built yet; S01 does one target per table entry. The scoped out-of-domain refusal,
  the DOF-as-relation counting, and the parity-oracle pinning are all reusable as-is.
- Notes-for-next (S02): read the "Tables" section in docs/authoring-things.md and ADR-0009 first.
  Traps I hit: (a) `textwrap.dedent` in the Python test fixtures — mutation match-strings must use
  POST-dedent indentation or the negative test silently passes a GOOD fixture (DID NOT RAISE). (b)
  sympy `Float != floor(Float)` is STRUCTURAL (always True, Float vs Integer) — use a numeric
  fractional test for integer checks (fixed in verify.py). (c) empirical/dimensioned constants (the
  6.1 m/s Barth reference) need a constrained-constant variable for homogeneity — S02's Kt fits may
  need the same. (d) multi-column table consumption is the S02 capability delta — design it as a
  deliberate extension of the single-column path (ordered_steps stores one target per table step
  today). (e) main CI had a TRANSIENT Pages-deploy failure at session start (build-test was green);
  a `gh run rerun --failed` cleared it — if preflight shows a red main whose build-test passed but
  deploy says "try again later", re-run before treating it as broken.

## S02 — stepped-shaft-fillet — 2026-07-04 — PR #14 (draft) — BLOCKED

- Shipped: nothing to the catalog (BLOCKED during data-sourcing, before any THING/pipeline code was
  written). Catalog stays 18. This branch carries ONLY the BLOCKED bookkeeping (queue + this log).
- Gates: not reached. Preflight (§1.6) was fully GREEN — clean `main`, CI success on PR #13,
  node 24.12.0 / pnpm 11.5.2 / uv 0.11.19, Playwright chromium present, all 8 brief entry criteria
  pass (no PAUSED/IN_PROGRESS; S01 DONE; `"table"` in engines/types.ts; `verify_table_configuration`
  present; `uv run --directory pipeline pytest -q -k table` → 22 passed [baseline total 184];
  kinds pressure_stress/ratio/force/torque all present; display units MPa/mm/"N*m"/kN all present).
- Golden / Citations: N/A (no THING authored).
- Deviations from brief: N/A (work did not start).
- New capabilities future briefs may rely on: **multi-column table consumption is IN SCOPE as a
  compiler/verifier LOGIC fix — NOT a schema/artifact-shape change, so NOT a §9.2 BLOCK.** Proven by
  reading the machinery end to end: the compiled `table` plan step already declares `targets:
  array(min 1)` (content.config.ts) and full `rows`; the runtime already loops
  `for c in targets: tableLookup(rows, arg, mode, c+1)` (relation.ts) with a 1-based `col` param
  (table.ts) and unions `guard.scope`; `verify_table` already node-exact-checks every column
  (`for col in range(1, ncol+1)`). The ONLY gaps are compiler+verifier logic (details in State).
  This unblocks the brief's "multi-column is designed-in, make it work" mandate without touching the
  authoring schema `{table, at}` or the artifact shape.
- Notes-for-next: the blocker is DATA, not machinery and not context. Everything needed to finish
  fast once unblocked is in State below. Do NOT start S03 ahead of S02 (strict order) until the
  owner rules on the block.
- State: branch `thing/stepped-shaft-fillet`; builds clean (only doc edits). **BLOCKER (§9.1):** the
  brief requires the Kt table to hold Norton's `K_t = A·(r/d)^b` coefficients *verbatim from a
  published source* and forbids self-digitizing the charts ("Shigley Fig. A-15-8/9 … named only,
  never digitized by us"). Norton's / Shigley-A-15's verbatim `(A,b)` per-`D/d` values could NOT be
  obtained or independently confirmed after ~12 sources: ASEE paper `peer.asee.org/…shoulder-fillets.pdf`
  (persistent HTTP 503); Shigley/Norton textbook & appendix PDFs (403 / TLS-cert / binary-unparseable);
  every accessible chart reproduction (IIT-Delhi `web.iitd.ac.in/~jpkhatait/MCL211/Charts_Kt_Kts.pdf`,
  the DOME17 databook, efunda, amesweb) reproduces only the GRAPHICAL curves or the Roark/Pilkey
  closed form — never the numeric `(A,b)`; `gh search code` empty; archive.org has Peterson only as
  a lending scan. Recalled `(A,b)` corroborate Roark only in the mid-`D/d` band (≈2–8%) and diverge
  to ~19% at `D/d→1.01`, and a few-% Roark match cannot certify a 5-digit value *attributed to*
  Shigley/Norton I never read — shipping them = inventing precision + a false citation (credibility
  spine). **VERIFIED cross-check data (reuse; do NOT re-fetch):** Roark, *Formulas for Stress and
  Strain*, Table 6-1 part III case 2 "Shoulder fillet in stepped circular shaft" — `h=(D−d)/2`,
  `K_t = C1 + C2(2h/D) + C3(2h/D)² + C4(2h/D)³`, matched EXACTLY by the independently-fetched
  Pilkey/Peterson form:
  · Axial `σnom=4P/πd²` (0.1≤h/r≤2.0): C1=0.926+1.157√(h/r)−0.099(h/r); C2=0.012−3.036√(h/r)+0.961(h/r);
  C3=−0.302+3.977√(h/r)−1.744(h/r); C4=0.365−2.098√(h/r)+0.878(h/r).
  · Bending `σnom=32M/πd³` (0.1≤h/r≤2.0): C1=0.947+1.206√(h/r)−0.131(h/r); C2=0.022−3.405√(h/r)+0.915(h/r);
  C3=0.869+1.777√(h/r)−0.555(h/r); C4=−0.810+0.422√(h/r)−0.260(h/r).
  · Torsion `τnom=16T/πd³` (0.25≤h/r≤4.0): C1=0.905+0.783√(h/r)−0.075(h/r); C2=−0.437−1.969√(h/r)+0.553(h/r);
  C3=1.557+1.073√(h/r)−0.578(h/r); C4=−1.061+0.171√(h/r)+0.086(h/r).
  (Second branch 2.0≤h/r≤20.0 exists for axial/bending — get from Roark Table 6-1 if the domain needs it.)
  **MULTI-COLUMN IMPLEMENTATION PLAN (logic-only, no schema/artifact change):** (1) compile.py
  `load_configurations` table branch (~L390-462): delete the `len(tbl.columns)!=1` reject; group
  `{table,at}` consumers by key `(table_id, srepr(at_expr))` — S01's two Y-lookups have DIFFERENT
  args so they stay two steps (preserves S01); within a group create ONE plan step with
  `targets=[None]*ncol`, full `rows`, shared `arg_fn`; set `targets[col_index]=target_name` where
  col_index = `tbl.columns.index(name)` if the target matches a column, else 0 for a 1-column table
  (keeps S01's `Y_g` template case); dim/kind-check each target against `columns[col_index]`; require
  consumers of a group be consecutive (`plan[-1] is step`) and all columns filled after the loop;
  build a multi-column latex/guard message. (2) scope loop (~L505): map EACH target→its step and
  UNION each column's eval-descendant reach into that step's `guard.scope`. (3) ordered_steps table
  tuple → carry the col index: `("table", target, table_id, at_expr, col)`. (4) verify.py
  `verify_table_configuration` (~L488): replace hardcoded `table_lookup_ref(...,1)` with `...,col`
  from the tuple. (5) regression tests in `pipeline/tests/test_tables.py` with a SYNTHETIC 2-column
  fixture (no provenance needed for test fixtures) — assert grouping, column-by-name, DOF (each
  column = 1 relation), and that S01 still emits byte-identical single-column steps. THING design
  (decided, sim-sketch-compatible): three PURE configs (bending/torsion/axial) sharing one chain
  `Dd,rd→(A,b via table)→Kt=A·rd^b→σ_max=Kt·σ_nom→SF=σ_y/σ_max`, differing only by which Kt table
  fills `(A,b)`; `σ_nom` entered directly (per-config load-derived σ_nom is impossible here — the
  arch computes all vars in every config and `SF=σ_y/σ_max` blows up if a load is zeroed; confirmed
  vs euler/thick-cylinder/combined-shaft). **OWNER UNBLOCK (fastest → alternatives):** (a) paste
  Norton App-C (or Shigley A-15-7/8/9) `(A,b)` rows + r/d validity into the S02 brief → next session
  builds as briefed and cross-checks vs the Roark data above; OR (b) authorize using Roark's C1-C4
  *directly as relations* (drops the multi-column exercise → re-scope S02); OR (c) authorize a
  transparently project-fitted `(A,b)`-of-Roark table (relaxes "never digitized by us" for this
  fit-of-a-cited-formula case) → keeps multi-column with honest fit-provenance. Recommend (a).
- **RESOLUTION (2026-07-04, same session, interactive):** owner chose unblock option (a) and supplied
  Norton *Machine Design: An Integrated Approach* Appendix C directly (Figs C-1 axial / C-2 bending /
  C-3 torsion, pp. 1028–1029). The `(A,b)` coefficients were read digit-for-digit and cross-checked
  against the preserved Roark formula; all three tables + citation (`norton`) + r/d envelope + a
  by-hand golden are now recorded in the S02 brief under "Table data — VERIFIED". Queue row S02 flipped
  BLOCKED → QUEUED (buildable as briefed); PR #14 retitled to carry the block+resolution docs. The
  full build (multi-column machinery per the plan above + THING + physics test + sim + e2e + gates +
  review + visual pass) did NOT fit this session's remaining budget, so it is handed off CLEAN as a
  QUEUED row for a fresh full-budget session rather than started and PAUSED mid-way (protocol prefers a
  clean stop over confusing inherited state). Provided source PDFs were read in place for fact
  extraction only — never copied into the repo or committed (verified `git ls-files` clean of PDFs).
