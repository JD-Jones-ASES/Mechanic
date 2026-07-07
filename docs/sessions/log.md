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
- Citations pinned: Shigley 10th ed §13-5/13-7, §14-1, Table 14-2, eq 14-4b [ERRATUM QC1
  2026-07-06: the metric Barth form is eq 14-6b; 14-4b is the ft/min form — corrected on the site,
  see reports/phase-2-qc-audit.md] — topic + Table 14-2
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
  spine). **VERIFIED cross-check data (reuse; do NOT re-fetch):** [ERRATUM QC1 2026-07-06: the
  locator below is MIS-ATTRIBUTED — "Table 6-1 part III case 2" is Pilkey's (*Formulas for Stress,
  Strain, and Structural Matrices*) numbering, not Roark's (Roark 7th/8th prints these fits as
  Table 17.1); the closed form and coefficients themselves are correct and unchanged — see
  reports/phase-2-qc-audit.md] Roark, *Formulas for Stress and
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

## S02 — stepped-shaft-fillet + real-arg multi-column table capability — 2026-07-04 — PR #15 — MERGED

- Shipped: THING 19 `stepped-shaft-fillet` (shoulder-fillet stress concentration; 3 configs
  axial/bending/torsion, three cited Norton App-C `(A,b)` tables, K_t=A·(r/d)^b, σ_max=K_t·σ_nom, SF)
  + the real-arg **multi-column** `table` consumption capability (one lookup at D/d fills BOTH columns
  A,b) as a compile/verify LOGIC change — no schema/artifact-shape change. Catalog 18 → 19.
- Gates: pytest 201 passed (184 baseline + 11 test_tables.py multi-column incl. the S01 two-args
  regression + 6 test_stepped_shaft_physics.py); pnpm build clean (cold — pipeline-source edit busts
  fingerprints; parity 864 values / 19 artifacts, katex 769, mdx 38 files, units 413 refs); unit 17;
  e2e 54 (+4 stepped-shaft: axial golden + material-blind K_t, three-config K_t, D/d table-guard
  refusal, r/d envelope refusal; verification relation-block count 18→19); visual pass: opened built
  dist at /Mechanic/things/stepped-shaft-fillet/ — stepped shaft draws with a StressBands fillet bloom,
  axial F arrows (K_t 1.914); switched to bending (M moment glyph, K_t 1.698) and torsion (T glyph,
  K_t 1.459) — same geometry, different concentration; drove r/d=0.45 → K_t/σ_max/SF blank, bloom→dashed
  marker + banner, A/b LIVE (poison path 2); drove D/d=3 → A,b,K_t,σ_max,SF ALL blank, multi-column guard
  names both columns (poison path 1); 2024-T3→Ti K_t fixed at 1.6981 while SF 1.91→5.12; KaTeX 0 errors;
  console clean; /things/ card + /verification/ block present. review: physics + invariants + code/tests
  (3 fresh-context subagents) + /code-review correctness (3 angles: line-by-line, removed-behavior,
  cross-file). 2 real findings, both FIXED — (a) physics-test docstring claimed cross-check worst-case
  ~3.2% but the real max over the committed points is 4.73% (bending D/d=1.5, r/d=0.25); corrected the
  stated max + softened "comfortably inside" (test still passes honestly, 4.73%<5%); (b) added a
  pipeline regression test for the S01 shape (one single-column table read at two DIFFERENT args → two
  disjoint steps) that only e2e covered before. Rebutted: guard-message names the table's declared arg
  not the lookup arg (pre-existing, not this diff; doesn't affect S02 where `at: Dd` IS the arg);
  same-table-same-arg-twice now errors (intentional, no THING does it); load_configurations is long
  (~440 lines, future helper-extraction — brief scoped bugfixes only). Invariants/cross-file/line-by-line
  angles: clean.
- Golden: by-hand K_t, bending D/d=1.50 (Norton Fig C-2 row A=0.93836, b=-0.25759), r/d=0.10:
  K_t = 0.93836·0.10^(-0.25759) = 1.69809 ≈ 1.698 (test_stepped_shaft_physics.py::test_kt_golden_by_hand,
  which also asserts the authored table carries those coefficients bit-for-bit). Nominal stresses
  (32M/πd³, 16T/πd³, 4F/πd²) re-derived from I/J/A. Norton vs Roark Table 6-1 case III-2 cross-check
  agrees within 5% over D/d≥1.5 (observed max 4.73% bending); band = both sources' own stated fit
  accuracy vs Peterson, NOT tuned to pass.
- Citations pinned: `norton` (Norton *Machine Design: An Integrated Approach* App. C Figs C-1/C-2/C-3,
  owner-provided scan 2026-07-04) — (A,b) read digit-for-digit, cross-checked vs Roark Table 6-1 in the
  physics test. HONEST: the (A,b) are cited DATA, not machine-proven; interpolation between D/d rows IS
  parity-proven. Shigley Fig A-15-8/9 named as the same chart family, never digitized.
- Deviations from brief: (1) σ_nom entered DIRECTLY as a free input rather than computed per-config from
  M/T/F — the decided design in the prior S02 log State section: the single-arch-computes-all-vars
  constraint makes per-config load-derived σ_nom impossible (a zeroed inactive load blows up SF; confirmed
  vs euler/thick-cylinder/combined-shaft). The three nominal formulas live in overview/derivation prose +
  cross-links (cantilever-beam, torsion-shaft, combined-shaft) instead. The brief's Physics-scope wording
  listed them as computed; the log State section had already resolved this. (2) Geometry knobs are the
  ratios D/d and r/d directly (mirrors Norton's chart axes; only ratios set K_t) rather than absolute
  D,d,r. (3) Added a constrained-constant `load_case` (kind count, 1/2/3) so the sim can pick the load
  glyph — the same constrained-constant idiom S01 uses for phi/v_b; invisible to the user (not input, not
  readout). (4) Multi-column table machinery: made real-arg multi-column consumption actually work (in
  scope by brief design — "make it work"); removed the single-column reject, added grouping/scope/verify.
- New capabilities future briefs may rely on: real-arg **multi-column** `table` consumption — several
  targets reading the SAME table at the SAME arg group into ONE plan step, each filling its own column
  (mapped by column NAME; single-column keeps the S01 differently-named-target fallback-to-col-0).
  Each column still counts as one relation (DOF stays honest). Consumers of a group MUST be authored
  CONSECUTIVELY (no intervening plan step), every declared column read in a config MUST be filled, and a
  multi-column consumer MUST name its column (single-column may not). The refusal scope is the UNION of
  every column's eval-descendant reach. No schema/artifact-shape change: `targets` was already
  array(min 1) and the runtime + parity oracle already looped 1-based columns.
- Notes-for-next (S03): traps I hit — (a) `test_tables.py` TABLE_YAML is `textwrap.dedent`'d, so `.replace`
  mutation strings MUST be content-only (no leading indent) or they silently no-op and a negative test
  passes a GOOD fixture (bit me on 3 tests; add an `assert mutation-took` line). (b) Playwright `.fill()`
  on `<input type=range>` throws "Malformed value" for some values (e.g. "3.0") — target the sibling
  number input via `getByLabel("<name> value")` instead (each knob renders a range AND a number input).
  (c) editing pipeline source busts every fingerprint → cold build (~3–4 min). (d) the constrained-constant
  discriminator (`load_case`) is a clean way to give a sim per-config awareness with NO schema change —
  reuse it if a THING's sim must know its active configuration. (e) config switch RESETS knobs to the new
  config's input defaults, so in an e2e/eval read the value AFTER a re-render tick (Preact re-renders
  async — a synchronous read right after dispatching the `input` event is stale).

## S03 — rectangular-shaft-torsion — 2026-07-04 — PR #16 — MERGED

- Shipped: THING 20 `rectangular-shaft-torsion` (Saint-Venant torsion of a solid rectangular bar) —
  the THIRD `table` consumer and its first use outside a machine-element chart: c1(a/b), c2(a/b) from
  Timoshenko §109 (two columns, one lookup at a/b), τ_max=T/(c1·a·b²) at the long-side midpoint
  (corners zero), θ'=T/(c2·a·b³·G), equal-area round-shaft efficiency readouts (η_τ, η_θ > 1 — "why
  square shafts are a bad deal"). New `twist_rate` quantity kind (kinds.py) + `rad/m`, `deg/m` display
  units (units.ts). Catalog 19 → 20.
- Gates: pytest 210 passed (201 baseline + 9 test_rect_torsion_physics.py); pnpm build clean (cold —
  kinds.py edit busts every fingerprint; parity 906 values / 20 artifacts, units 446, katex 822, mdx
  40 prose files); unit 17; e2e 57 (+3 rect-torsion: material-blind goldens + equal-area comparison,
  a/b>10 GLOBAL refusal, a/b<1 swap-labels refusal; verification relation-block count 19→20); visual
  pass (built dist /Mechanic/): cross-section sim renders visibly (2:1 rectangle real fill/stroke, hot
  dots at long-side midpoints + τ_max label, schematic shear humps, dead-corner dots, dashed equal-area
  round overlay, torque arc); drove a/b→12 and SAW the global refusal (SimRefusal figure + two invalid
  banners + every readout blanked incl. the untainted round-shaft ones); Al-2024→steel-4340 moved twist
  1.12→0.41 °/m and SF 10.8→49.7 while τ_max fixed at 15.056 MPa (material-blind); KaTeX + console clean;
  /things/ card + /verification/ block present. review: 5 independent passes (physics + invariants +
  code/tests fresh-context subagents, + /code-review correctness & cleanup finders) — 0 blockers, 0
  majors; physics reviewer re-derived the whole THING from scratch (independent Prandtl BVP). 5 minor
  findings, ALL fixed (see below).
- Golden: square bar a/b=1, c1=0.208: τ_max = 100/(0.208·0.05·0.05²) = 3.84615 MPa (test_rect_torsion_
  physics.py::test_tau_max_golden_by_hand; source Timoshenko §109, pinned in comment; the test also
  asserts the authored square row is exactly (0.208, 0.1406)).
- Citations pinned: `timoshenko` (Theory of Elasticity §107 membrane analogy, §108-109 rectangular
  torsion table) + `roark` (Formulas for Stress and Strain 7th ed Ch.10 closed forms, = Table 10.7 in
  8th ed) cross-checked in the physics test against BOTH the exact Saint-Venant Fourier series (I
  re-derive it; worst |authored−series| ≈ 0.0005) AND Roark's independent closed form. `gere`/`shigley`
  for the round-shaft baseline + Tresca SF. HONEST: the primary Timoshenko PDF was archive.org-blocked
  this session (same block as S02), so the coefficients were pinned by first-principles re-derivation +
  Roark rather than transcription — a STRONGER check, and legitimate because these are the exact solution
  of a PDE (uncopyrightable facts, Feist), not a proprietary fit; the verification field says so plainly.
- Deviations from brief: (1) Coefficient sourcing — briefed to transcribe Timoshenko §109 verbatim; the
  PDF was unreachable, so I authored series-and-Roark-confirmed values and pinned them via the exact
  elasticity solution + Roark's closed form (NOT a §9.1 block: the block criterion is "value can't be
  independently confirmed" and here it is confirmed from first principles; contrast S02's Norton fit,
  which had no analytic check). (2) The named cross-check "Roark 8th ed Table 10.7" was accessed as the
  7th-ed closed form (via amesweb) + the Roark-cited β table (via Wikipedia) — identical coefficients,
  different edition/access path; stated honestly in sources[].verification. (3) Single configuration
  (torque-in) — the brief didn't mandate multiple; a=long/b=short are independent dimensioned inputs
  with a/b derived (physical, and both refusals reachable by the a,b knobs).
- New capabilities future briefs may rely on: `twist_rate` quantity kind (1/L; must not chain into
  curvature/wavenumber) and `rad/m`,`deg/m` display units now in the registries. Pattern proven: a
  cited coefficient table whose values are ALSO an exact analytic solution can be double-pinned in the
  physics test (published data ∧ first-principles re-derivation) — reuse for any classical-elasticity
  coefficient THING (ellipse/triangle torsion, plate coefficients).
- Notes-for-next (S04 = beam-shear-flow, `shear_flow` kind): traps I hit — (a) `math.cosh(x)` OVERFLOWS
  for large x in a Fourier-series test; guard `1/cosh` with an `x>700 → 0` fallback (sech is ~0 there).
  (b) A transient pnpm deps-check failure ("pnpm install failed") can hit at build start even with a
  clean lockfile — `pnpm install --frozen-lockfile` returns "Already up to date" and re-running the
  build clears it (S01 saw the Pages-deploy variant of this). (c) Editing kinds.py (pipeline source)
  busts EVERY fingerprint → cold build (~4 min); batch your kind addition into the first build. (d) A
  GLOBAL-invalid envelope on a DERIVED table arg (a/b from a,b) does NOT starve the parity sampler —
  n=3 samples is the standard count and the sampler resamples past out-of-domain points, so seeing
  "only 3 samples" is normal, not a bug. (e) In a browser eval, a raw `select.dispatchEvent(new
  Event('change'))` does NOT update a Preact controlled <select> — use preview_fill (or Playwright
  selectOption); and read readouts a tick AFTER the switch (async re-render, per S02's note e). (f) When
  a sim has more than one refusal reason, branch the SimRefusal `caption` on the refused quantity's value
  (finite a/b<1 vs >10) so the figure's reason matches the validity banner's.

## S04 — beam-shear-flow — 2026-07-04 — PR #17 — MERGED

- Shipped: THING 21 `beam-shear-flow` (transverse shear in beams) — τ = VQ/(Ib), the parabolic
  profile with τ_max = 3V/2A at the neutral axis (zero at the surfaces, opposite of bending), shear
  flow q = VQ/I, and the fastener-spacing readout F = q·s. New `shear_flow` quantity kind — the THIRD
  kind on the N/m dimension vector (with `line_load` and `stiffness`), the invariant-2 worked example
  (a paragraph added to `verification.astro`'s hand-authored "dimensional homogeneity" bullet). Single
  config, inputs [V,b,h,s,L], strength-only material axis (σ_y). Catalog 20 → 21.
- Gates: pytest 216 passed (210 baseline + 6 test_shear_flow_physics.py); pnpm build clean (cold —
  kinds.py edit; parity 933 values / 21 artifacts, units 472, katex 859, mdx 42 prose files); unit 17;
  e2e 60 (+3 beam-shear-flow: material-blind goldens + the 3/2 peak; shear-yield warn; slender warn;
  verification relation-block count 20→21); visual pass (built dist /Mechanic/): the textbook figure
  renders — cross-section rectangle + parabolic shear profile peaking at the NA, zero at surfaces, plus
  the built-up-joint elevation with fastener dots at spacing s; drove a tiny section past shear yield and
  SAW the warn banner + the parabola turn red; drove L/h<10 → slender warn; steel→aluminium moved SF only
  (τ_max/q/F fixed); the 3-N/m-kinds prose renders on /verification/; KaTeX + console clean. review: 5
  independent passes (physics + invariants + code/tests subagents, + /code-review correctness & cleanup
  finders) — 0 blockers, 0 majors; physics reviewer re-derived every formula from slice equilibrium and
  hand-checked both goldens; invariants reviewer verified DOF=5 against the real build math. 2 minor
  findings, both fixed (SimRefusal label="refused" drift from SSBeamSim; overview over-claimed that
  /verification/ lists the three theorems — reworded to attribute them to the physics test).
- Golden: built-up beam V=12 kN, b=40 mm, h=180 mm, s=75 mm: I=1.944e-5 m⁴, Q_na=1.62e-4 m³,
  τ_max=3V/2A=2.5 MPa, q=VQ/I=100 N/mm, F=q·s=7.5 kN (test_shear_flow_physics.py; source Gere §5.8-5.11,
  pinned in the docstring; all exact, hand-checkable).
- Citations pinned: `gere` (Mechanics of Materials 9th §5.8-5.11 — shear formula, shear flow, built-up
  beams; topic-level, same source id as the sibling beam pages) + `shigley` (§5-4 Tresca σ_y/2). HONEST:
  the τ=VQ/Ib derivation, the 3/2 peak, and the theorem ∫τ dA = V are ALL re-derived from slice
  equilibrium (symbolic dσ/dx integration) in the physics test, so nothing rests on citation alone; the
  golden is arithmetic on those formulas.
- Deviations from brief: (1) Warn-only THING (no invalid envelope). The brief's "e2e ... refusal at
  minimum" and §5 "SEE the refusal" are satisfied by the two WARN banners (shear yield, slenderness) —
  τ=VQ/Ib is defined and finite for all positive inputs, so there is no physical hard-refusal, and
  inventing one would violate invariant 5. This matches the simply-supported-beam warn-only precedent;
  both reviewers confirmed the warn-only design is the honest call. The sim's SimRefusal branch is the
  defensive contract (consumed, unreachable via knobs). (2) The "built-up flange interface" is modeled
  at the neutral axis (two stacked planks — the MAX shear flow, the critical joint), with the off-NA
  flange case q=VQ_flange/I covered in prose; a movable joint-height knob was considered and dropped as
  needless complexity. (3) Q (first moment, dims L³) is inlined as a derivation local (bh²/8), NOT a
  variable — this avoids minting a second new kind (first_moment_of_area) which would be unauthorized.
- New capabilities future briefs may rely on: `shear_flow` kind now in the registry (N/m; must not chain
  into line_load or stiffness). DECIDED-TASK OUTCOME — thin-tube-torsion Bredt-q migration: EVALUATED,
  STAYS AS-IS. Bredt's q is a derivation LOCAL (`content.config.ts` locals schema has fields
  symbol/unit/positive/bounds/define — NO quantity_kind), and a derivation local is not a chainable
  widget port, so it needs no kind; giving it one requires adding quantity_kind to the locals schema =
  a schema change = §9.2 capability creep, out of scope. The two shear flows (along-beam transverse vs
  Bredt around-a-closed-cell) are contrasted in overview prose instead. Flagged the schema extension as
  a follow-up task for owner consideration (not urgent).
- Notes-for-next (S05 = curved-beam, Winkler, "zero new machinery"): (a) the transient pnpm deps-check
  failure ("pnpm install failed" at build start, clean lockfile) hit TWICE this session — just re-run
  the build, or `pnpm install --frozen-lockfile` (returns "Already up to date") then re-run; do NOT treat
  it as a real failure. (b) S05 needs NO new kind/unit per its title — if you find yourself reaching for
  one, STOP and re-read the brief (it may be a sign of a design detour). (c) A warn-only THING is a fully
  legitimate pattern (simply-supported-beam, now beam-shear-flow) — do not invent an invalid envelope to
  satisfy a "refusal pin"; pin the warn banners instead and say so. (d) Derived-variable `bounds:` are
  display/annotation only (never build-checked, never read at runtime) — loose "sensible range" ceilings
  are fine and the norm; don't agonize over covering the extreme input corner. (e) inlining an
  intermediate as a derivation `local` (with `define:`) is the clean way to use a quantity that would
  otherwise need a new kind you're not authorized to mint (Q=bh²/8 here). Full detail in this entry.

## S05 — curved-beam — 2026-07-04 — PR #18 — MERGED

- Shipped: THING 22 `curved-beam` (Winkler curved-beam bending, rectangular section) — the crane
  hook / C-clamp / press frame. Neutral axis shifts off the centroid to r_n = h/ln(r_o/r_i) (the log
  is the curved-beam analogue of belt-drive's exp), eccentricity e = r_c − r_n drives the inner-fiber
  concentration, side-by-side straight-beam Mc/I readout exposes the curvature penalty K_i (≈1.41× at
  the default hook). Single crane-hook config: combined direct P/A + curved bending, M = P·r_c (the
  eccentric-column combined-loading pattern). DELIBERATE ZERO NEW MACHINERY — no kind, unit, table,
  solve, or schema change. Catalog 21 → 22.
- Gates: pytest 225 passed (216 baseline + 9 test_curved_beam_physics.py); pnpm build clean (WARM —
  no pipeline-source edit, only curved-beam recompiled; parity/katex/mdx/units all green, 29 pages);
  unit 17; e2e 63 (+3 curved-beam: material-blind curvature-penalty golden, r_o≤r_i global refusal,
  r_c/h≥10 nearly-straight warn; verification relation-block count 21→22); visual pass (built dist
  /Mechanic/, verified via DOM inspect after the screenshot renderer stalled mid-session then
  recovered): the sim renders the C-throat member + P load and the stress panel — the curved-beam
  hyperbola σ(r) with the σ_i dot at the hot inner fiber, the dashed straight-beam Mc/I overlay, and
  the NEUTRAL AXIS line (r_n) sitting visibly BELOW the centroid line (r_c) = the shift; drove r_c/h to
  15 and SAW the two profiles' inner-fiber reach converge (gap 23.8px → 1.8px, K_i 1.41 → 1.02) with
  the nearly-straight warn; drove r_o below r_i and SAW the global refusal (all readouts "—", red
  geometry-invalid banner, SimRefusal figure); steel-4340 → al-6061-t6 moved SF 20.6 → 3.8 with σ_i
  fixed at 72.458 MPa (material-blind); KaTeX + console clean. review: 5 independent fresh-context
  passes (physics + invariants + code/tests subagents, + /code-review high correctness & cleanup
  finders) — 0 blockers, 0 majors, 0 minors needing a change; 1 non-blocking FYI (add σ_o to the sim's
  finiteness guard) applied.
- Golden: rectangular curved beam r_i=50, r_o=100 mm, b=20 mm, pure moment M=1 kN·m: r_n=72.135 mm,
  e=2.865 mm, σ_i=154.505 MPa (inner), σ_o=−97.253 MPa (outer), straight-beam Mc/I=120.0 MPa,
  K_i=1.28754 (test_curved_beam_physics.py::test_golden_rectangular_curved_beam; source Shigley §3-18 /
  Roark Ch. 9, pinned in the docstring; exact arithmetic on the formulas). Second golden: the default
  hook (P=12 kN, 40/100 mm, b=30 mm) → σ_i=72.458 MPa (P/A 6.667 + bending 65.791), M=840 N·m.
- Citations pinned: `shigley` (Mechanical Engineering Design 10th §3-18 curved beams + Table 3-4
  rectangular r_n) + `roark` (Formulas for Stress and Strain 8th Ch. 9). HONEST: the Winkler stress is
  NOT taken on citation — the physics test re-derives r_n from ∫σ dA = 0, κ from the moment balance
  ∫σ(r_n−r)dA = M, proves σ_i → Mc/I as r_c/h → ∞ by series expansion, and cross-checks a raw-integral
  (mpmath) oracle against the closed form. The rectangular r_n = h/ln(r_o/r_i) is an exact analytic
  fact (uncopyrightable, Feist), matched by the independent integral — the same double-pin pattern S03
  used for the Timoshenko torsion coefficients. Topic-level, not page-pinned (textbook PDFs blocked, as
  in S02–S04); the analytic re-derivation is the stronger check.
- Deviations from brief: (1) The brief listed TWO invalid geometry envelopes: `r_o > r_i` and
  `r_i > 0`. Only `r_o > r_i` was authored — `r_i > 0` is guaranteed by the variable's `positive: true`
  assumption + bounds, and SymPy auto-evaluates the always-true comparison `r_i > 0` to a boolean (not
  a Relational), which compile.py rejects ("condition must be a comparison"). Folded r_i>0 into the
  neutral-radius assumptions; the reachable geometry refusal (r_o ≤ r_i) remains and is e2e-pinned.
  (2) Single crane-hook configuration rather than separate pure-moment + hook configs: the runtime
  engine applies ONLY numeric constraints (relation.ts:39-41 gates on `typeof v === "number"`), so an
  expression constraint like {M: P*r_c} would be silently ignored at runtime — a two-config split would
  need it. The single config makes M = P·r_c a machine-verified GLOBAL relation and matches Shigley's
  actual crane-hook worked example (combined). Pure bending is exposed as the σ_bi readout + the
  straight-beam comparison; the sim draws the bending distribution (the neutral-axis-shift story) on the
  direct-stress datum. Both reviewers confirmed the single-config design is honest and DOF-balanced
  (20 non-material vars − 16 relations = 4 inputs).
- New capabilities future briefs may rely on: none (zero-new-machinery THING by design). Confirmed
  reusable: a force×length → bending_moment relation (M = P·r_c) is legal — within-relation checking is
  dimension-only, kinds only gate widget chaining/table typing. The single-config combined-load pattern
  (direct + bending superposed, one term's arm derived) is the eccentric-column pattern without solve1d.
- Notes-for-next (S06 = circular-plate, ν in stress, flexural_rigidity kind — this one DOES need a new
  kind + display unit, unlike S05): traps I hit — (a) a validity `condition` that SymPy can prove
  always-true/false from the variable assumptions (e.g. `r_i > 0` with r_i positive) auto-evaluates to a
  bool and the compiler rejects it ("condition must be a comparison") — only author envelopes that are
  genuinely reachable/undecidable; put type-guaranteed positivity in `positive:` + bounds. (b) The
  runtime engine applies ONLY numeric ({v: number}) constraints (relation.ts) — EXPRESSION-valued
  constraints are parsed and DOF-counted at build but SILENTLY IGNORED at runtime, so never model config
  differences with an expression constraint; make the coupled quantity a derived target + a global
  relation instead. (c) The screenshot renderer (preview_screenshot) stalled for ~2 tool calls
  mid-session then recovered on its own — DOM inspection (preview_eval reading element geometry /
  computed styles) is a MORE precise visual-pass substitute and is what the preview tooling itself
  recommends over screenshots; it also lets you assert the exact pixel of the neutral-axis shift. (d) A
  Preact controlled <select> ignores a manually-dispatched change Event (S03's note e, hit again) — use
  preview_fill / Playwright selectOption, and read the readout a tick after. (e) On a GLOBALLY-refused
  state, relation validity predicates still run (documented engine contract, relation.ts:119 — so
  "cannot assemble"-style banners surface), so a finite-but-garbage derived value can trip an incidental
  warn banner alongside the dominant red invalid; this is by-design, not a bug. (f) Warm build: editing
  only content/sim/test (NOT pipeline src) reuses every other THING's cache — build is seconds + astro,
  not the 3–4 min cold cost. (g) Pre-verifying every relation residual + identity step + the limit proof
  in a throwaway SymPy script BEFORE authoring thing.yaml caught the design early and made the first cold
  build pass on the physics; cheap insurance against a 4-min build cycle.

## S06 — circular-plate — 2026-07-05 — PR #19 — MERGED

- Shipped: THING 23 `circular-plate` (uniformly loaded circular plate; clamped AND simply-supported
  edge cases as two always-valid PARALLEL models on one page — the euler-column one-page pattern, no
  branches/no scoped refusal). The FIRST page where Poisson's ratio moves a STRESS: σ_ss =
  3(3+ν)qa²/(8t²) carries ν, σ_c = 3qa²/(4t²) is material-blind. New `flexural_rigidity` quantity kind
  (kinds.py) — the 4th on the [2,1,-2,…] N·m dimension vector (torque/bending_moment/energy/flexural_
  rigidity). Catalog 22 → 23.
- Gates: pytest 235 passed (225 baseline + 10 test_plate_physics.py); pnpm build clean (cold — kinds.py
  edit busts every fingerprint; parity 1005 values / 23 artifacts, katex 954, mdx 46 prose files, units
  532 refs); unit 17; e2e 66 (+3 circular-plate: material-moment goldens + material-blind σ_c, small-
  deflection warn, thin-plate warn; verification relation-block count 22→23); visual pass (built dist
  /Mechanic/): both plate cross-sections render, the BC is VISIBLE in the curves (clamped meets its wall
  with a flat tangent; SS tilts into its supports and sags ~4× deeper), two plan-view StressBands discs;
  drove material steel-a36 → iron-gray-class30 and SAW σ_c hold bit-identical (33.75→33.75) while σ_ss
  moved (55.688→55.013) and deflections grew (D 18310→8011); drove q=300 kPa and SAW the small-deflection
  warn + the SS plate line & disc turn red (SF_ss 0.748<1) while clamped stayed blue (SF_c 1.23); drove
  t=40 mm and SAW the thin-plate warn; KaTeX + console clean; /things/ card + /verification/ block present.
  review: 5 independent fresh-context passes (physics + invariants + code/tests subagents, + /code-review
  correctness & cleanup finders) — 0 correctness bugs across all angles. 4 cosmetic findings fixed (dead
  D read in sim; redundant "sags deeper" SVG annotation overlapping a disc label; 2 tautological asserts
  in test_timoshenko_tabulated_factors now derive 1/64 & 3/4 from the closed forms; monotic→monotonic +
  a monotonicity assert). 3 rebutted (fmtMm/fmtMPa dup = repo-wide convention; single q label = one
  shared input; defl_ratio bounds loose = display-only).
- Golden: q=100 kPa, a=0.3 m, t=0.01 m, steel E=200 GPa, ν=0.3: D=18315.0 N·m, σ_c=67.5 MPa, σ_ss=111.375
  MPa, δ_ss/δ_c=53/13≈4.077 (test_plate_physics.py::test_numeric_golden; source Timoshenko §16-17, pinned
  in docstring; exact arithmetic). Widget DEFAULT is q=50 kPa (a separate self-consistent state, chosen so
  the default is clean even for the soft default material — see Notes-for-next).
- Citations pinned: `timoshenko` (Theory of Plates and Shells 2nd ed. Ch.3 §16-17) + `roark` (Formulas
  for Stress and Strain 8th ed. Table 11.2 cases 10a/10b), both with verification:. HONEST: textbook PDFs
  not web-accessible this session (same block as S02–S05); the four closed forms are re-derived from the
  axisymmetric plate ODE and the (5+ν)/(1+ν) & (3+ν)/2 factors proven with ν SYMBOLIC — a stronger check
  than transcription (exact analytic facts, Feist), cross-checked by an independent mpmath BVP oracle.
- Deviations from brief: (1) σ_y NOT bound; sigma_allow is a free "allowable stress" knob → SF_c, SF_ss.
  The brief's demo material iron-gray-class30 is brittle and has NO yield_strength in the seed, and
  site/src/pages/things/[slug].astro filters out any material missing a bound property — so binding σ_y
  would silently drop gray iron from the picker and destroy the page's core material moment. Binding E+ν
  (both present) keeps gray iron selectable; brittle-vs-ductile becomes pedagogy in failure.mdx. Both the
  invariants reviewer and the conventions finder confirmed this is invariant-3-sound. (2) Warn-only THING
  (no hard-invalid envelope): the plate formulas are finite for all positive q,a,t and 0<ν<½, so there is
  no honest refusal to author (the beam-shear-flow / simply-supported-beam precedent). The brief's
  "refusal SEEN" is met by the two warn banners; SimRefusal stays the defensive contract. (3) Widget
  default q=50 kPa rather than a round 100 kPa (Notes-for-next e).
- New capabilities future briefs may rely on: `flexural_rigidity` kind (N·m; must not chain into
  torque/bending_moment/energy). Pattern: a free "allowable stress" knob when a material demo spans
  ductile+brittle and no single yield column honestly fits both. The euler-column parallel-models-on-one-
  page structure (two always-valid variable sets, one derivation block, NO branches/scope) reused cleanly.
- Notes-for-next (S07 = torsional-oscillator, frequency kind, Hz/s/ms units): traps I hit — (a) materials
  are ordered by SORTED FILENAME (ingest.py:98) and [slug].astro filters to those carrying EVERY bound
  property, PRESERVING order — so materials[0] (the widget default) is the alphabetically-first QUALIFYING
  material, which for E+ν binding is `al-2024-t3` (soft aluminum), NOT steel. If your default-state depends
  on the material (e.g. a deflection/stress envelope), pick free-input defaults clean for that soft default
  material, or your page loads with a warn already showing. (b) The widget computes with the REAL seeded
  material value: steel-a36 E = 29 Msi = 199.95 GPa (NOT a round 200), so a material-dependent readout
  golden (D here) must pin the real value (18310, not 18315) — the material-blind readouts (σ_c) and
  ν-only readouts (defl_ratio) are exact. (c) A warn-only THING is legitimate; do NOT invent an invalid
  envelope to satisfy "refusal SEEN" (invariant 5) — pin the warn banners (S04/S05 precedent). (d) Validity
  `condition` states the VALID region; the banner fires when it's FALSE (e.g. `10*t <= a` valid ⇒ fires
  when t/a>0.1). Write the condition as the valid region, not the trigger. (e) The physics-test golden and
  the widget default do NOT have to be the same input state — I pinned the golden at a clean round q=100 kPa
  and set the widget default lower (q=50 kPa) so the soft-aluminum default loads without a warn; both are
  self-consistent. (f) Pre-verifying ALL physics + every relation residual + identity step in a throwaway
  SymPy script BEFORE authoring (and a fast yaml-parse residual/DOF/default-coherence check after) made the
  FIRST cold build pass green — worth the 5 minutes against a 4-min build cycle (S05 note-g, confirmed again).

## S07 — torsional-oscillator — 2026-07-06 — PR #20 — MERGED

- Shipped: THING 24 `torsional-oscillator` (disk on an elastic shaft; the catalog's first vibration
  page) — ω_n = √(k_t/J_d) computed entirely from algebra at the knob state, NO ODE integrated (the
  SHM step enters as a cited `check: definition`, the declared audit surface). New `frequency` quantity
  kind (Hz) deliberately incompatible with `angular_velocity` despite the identical [0,0,-1,…] vector
  (the f-port-never-chains-into-ω move); new `Hz`/`s`/`ms` display units (the `time` kind had none
  before). Single config, 6 inputs (d,L,R,t_d,Θ,T_app), material binds G/σ_y/ρ. Catalog 23 → 24.
- Gates: pytest 246 passed (235 baseline + 11 test_torsional_oscillator_physics.py); pnpm build clean
  (COLD — kinds.py edit busts every fingerprint; 31 pages, pagefind); unit 18 (+1 chain.test.mjs
  frequency→angular_velocity rejection, both directions); e2e 69 (+3 torsional-oscillator: isochronism,
  √(G/ρ) material-blindness, both warns w/ clean separation; verification relation-block count 23→24);
  visual pass (built dist /Mechanic/): opened /things/torsional-oscillator/ — sim renders AND animates
  (marker endpoint moved 15px/450ms, stroke rgb(147,197,253), NOT the invisible-SVG trap): disk face +
  swinging spoke + hub + Θ envelope + shaft-from-wall labelled "shaft k_t (fixed far end)"; default
  al-2024-t3 warn-clear (f=34.887 Hz, Period 28.664 ms via the ms dropdown, τ=27.579 MPa, SF=5.875);
  aluminium→steel-a36 moved f only 34.9→35.2 Hz (the √(G/ρ) point) while τ tripled 27.6→79.3 and SF
  collapsed 5.9→1.6; cranked Θ ×7 and f held EXACTLY (isochronism) while τ→553 MPa tripped the
  shear-yield warn and the marker turned red (osc-marker-hot, rgb(220,38,38)); 43 KaTeX blocks 0 errors;
  console clean; /things/ card + /verification/ block present. review: 4 independent fresh-context passes
  (physics + invariants + code/tests subagents + /code-review high) — ALL SHIP, 0 blockers/majors/minors.
  1 nit fixed (physics-test docstring clarified live-material-default vs nominal-steel file-default);
  rest rebutted (k_t-in-LaTeX display-only; visOmega/AMP_EXAG cosmetic clamped magic constants;
  invalidVars passed-but-unused = warn-only-THING convention; rpm-equivalent honestly labelled; sim-red
  at SF<1 vs warn at τ≥σ_y/2 coincide exactly at SF=1).
- Golden: G=80 GPa, d=40 mm, L=1 m, R=150 mm, t_d=30 mm, ρ=7800, Θ=0.02 rad, σ_y=400 MPa →
  k_t=20106.2 N·m/rad, J_d=0.18608 kg·m², ω_n=328.71 rad/s, f=52.316 Hz, T=19.11 ms, τ_max=32.0 MPa
  (exact), SF=6.25 (exact) — test_torsional_oscillator_physics.py::test_numeric_golden, arithmetic +
  source (Timoshenko/Young/Weaver *Vibration Problems*; Den Hartog; Gere ch.3) in the module docstring.
- Citations pinned: gere, hibbeler-dyn, timoshenko-vib, juvinall, shigley — each with verification:.
  Web-accessible topics (Gere §3.3-3.5, Shigley §5-4/ch.7) confirmed vs published TOC 2026-07-06;
  timoshenko-vib + juvinall are honestly "topic-level, not page-pinned" (textbooks not web-accessible),
  and the SHM result is re-derived by the ENERGY method in the physics test rather than resting on the
  citation — a stronger check.
- Deviations from brief: (1) k_t is a derivation LOCAL, not a first-class variable/port. Torsional
  stiffness (N·m/rad) has no honest existing quantity kind and the brief authorized ONLY `frequency` +
  Hz/s/ms — minting `torsional_stiffness` = §9.2 capability creep. So k_t=GJ_p/L lives in
  derivation.locals (prose/LaTeX/steps), and the honest existing-kind chain-bridge to torsion-shaft is
  exposed as T_dyn (a genuine `torque` = k_t·Θ) instead. The brief's chain-teaser physics is intact; the
  overview names it; ports (T_dyn, J_d) are authored, chaining is Phase 4. The invariants reviewer
  confirmed this is the invariant-2-correct call (the S04 Q-as-local precedent). (2) Warn-only THING (no
  invalid envelope) — the brief §3.6 refusal-pin becomes a warn-banner pin, as the brief itself
  authorizes; τ=VQ-style formulas here are finite for all positive inputs, so there is no honest
  hard-refusal (S04/S05/S06 precedent). (3) Single configuration (the brief didn't mandate multiple).
  (4) Disk thickness symbol is `t_d` not flywheel's `t` (avoids collision with time on a frequency page).
- New capabilities future briefs may rely on: `frequency` quantity kind (Hz; must NOT chain into
  angular_velocity — the 2π is explicit) and `Hz`/`s`/`ms` display units now in the registries. Pattern
  reconfirmed: a quantity that would need an unauthorized new kind (torsional stiffness) is cleanly a
  derivation LOCAL, with an existing-kind sibling (T_dyn torque) exposed as the real chain port (S04's
  Q-as-local, generalized). The disk-on-shaft ports (T_dyn torque out, J_d moment_of_inertia) are the
  Phase-4 curated-chain teaser motor→shaft→flywheel.
- Notes-for-next (S08 = shaft-critical-speed, cited-constants mechanism g): traps I hit — (a) YAML plain
  (unquoted) list scalars (e.g. an `assumptions:` line) MUST NOT contain a colon-space `": "` — YAML
  reads it as a mapping key and the parse dies with a cryptic "could not find expected ':'". Use an em-dash
  or a `>-` block scalar. Bit me once on a "spring: the twist" phrase. (b) The `frequency`/`time` display
  units are now live — S08's critical speed is an angular_velocity (rad/s→rpm), NOT a frequency; do not
  reflexively reuse Hz. (c) `Hz` and `s` already parse in dims.py UNIT_NAMESPACE (u.hertz/u.second), so a
  `unit: Hz` variable's 7-vector comes out [0,0,-1] with no dims.py change — the display unit is the only
  addition a new time/frequency unit needs. (d) The material FILE defaults follow the torsion-shaft/flywheel
  convention: nominal steel (G=79e9, ρ=7800/7850, σ_y=250e6) for derived-default coherence, EVEN THOUGH the
  live widget default material is the alphabetically-first qualifying seed (al-2024-t3 for a G+ρ+σ_y binding).
  Keep the derived `default:` set computed from the STEEL file defaults; verify the LIVE (aluminium) default
  state is warn-clear separately (that's what the reader sees). (e) A first-class cited-constant `g` is S08's
  actual new mechanism — the constrained-constant idiom (a positive variable pinned by a `constraints: {g: 9.80665}`
  or a residual) is the established workaround (S01's Barth v_b/φ, S02's load_case), but S08 is authorized to
  build the real thing; read its brief before reaching for the workaround. (f) Pre-verifying ALL physics +
  residuals + DOF + the energy-route equivalence in a throwaway SymPy script BEFORE authoring (then a
  seconds-fast standalone `ThingCompiler(dir).compile()` after) made the first cold build pass green — S05/S06
  note-g, confirmed a third time; the standalone compile catches YAML/dim/kind/DOF errors in ~2s vs the 4-min
  full build.

## S08 — shaft-critical-speed + cited-constants mechanism (g) — 2026-07-06 — PR #21 — MERGED

- Shipped: the repo's first `role: constant` mechanism (a cited physical constant — value + unit + mandatory
  source on the variable, excluded from DOF/knob arithmetic exactly like a material, rendered as a labeled
  cited value via a new `ConstantsPanel`, never a knob) end to end: content.config.ts (both role enums +
  `citation` field) → compile.py (`dof_vars` excludes constants, `known_syms` = materials+constants injects
  them, citation presence+resolution enforced, citation rejected on non-constants, constant blocked as
  input/target) → verify.py (`material_syms`→`known_syms` rename across the 3 samplers) → units.ts (`m/s^2`)
  → ThingWidget (constantValues injection) + ConstantsPanel. First constant g=9.80665 m/s². First consumer
  THING 25 `shaft-critical-speed` (Rayleigh ω_c=√(g/δ_st) with the g-CANCELLATION ω_c=√(48EI/mL³);
  Dunkerley ω_cD from the bare-shaft first mode, machine-proven ω_cD≤ω_c; resonance-band warn). Catalog 24 → 25.
- Gates: pytest 260 passed (246 baseline + 6 mechanism-fixture + 8 physics); pnpm build clean (cold — pipeline
  source edit busts fingerprints; parity 1065 values/25 artifacts, katex 1044, mdx 50 files, units 588 refs,
  32 pages); unit 18; e2e 71 (+2 shaft-critical-speed: goldens/g-injection-via-W=mg/Dunkerley<Rayleigh, and
  constant-not-a-knob/resonance-warn; verification relation-block count 24→25); visual pass (built dist
  /Mechanic/): sim renders VISIBLY (shaft stroke rgb(147,197,253) NOT none — no invisible-SVG trap; bowed
  whirl path + disk + bearings + speed axis with shaded resonance band + operating pointer); constants panel
  shows g=9.80665 m/s²·nist with #knob-g count 0; W=49.033 N=m·g proves g injected at its defined value; drove
  ω_op onto ω_c → resonance warn ([shigley]) + shaft/pointer RED + whirl amplitude grew; al→steel raised ω_c
  1518→2523 rpm (E-axis) while W held (material-blind); KaTeX 0 errors; console clean; /things/ card +
  /verification/ (25) present. review: 5 independent fresh-context passes (physics + invariants + code/tests
  subagents + /code-review high correctness & cleanup finders) — 0 blockers/majors/correctness-bugs. 4 cleanup
  findings FIXED (CompiledThing.sources required not optional + drop ??[]; collapse material_syms/constant_syms
  → one known_syms; hoist loop-invariant known_syms out of _samples; drop dead ConstantsPanel title fallback);
  all behavior-preserving, re-verified pytest/build/unit/e2e green after. Rebutted: display-only bounds,
  juvinall unreferenced cross-check (established pattern), defensive sim guards, ConstantsPanel one-line lookup.
- Golden: steel shaft d=20mm, L=0.6m, m=5kg, E=200GPa, ρ=7850: I=7.853982e-9 m⁴, k=48EI/L³=349066 N/m,
  ω_c=√(k/m)=264.222 rad/s=2523 rpm, f_c=42.052 Hz, δ_st=1.40470e-4 m, ω_s=691.91 rad/s, ω_cD=246.84 rad/s
  (<ω_c). Source Shigley §7-6; g from NIST SP 330/SI Brochure. test_shaft_critical_speed_physics.py re-derives
  every result from first principles (area integration, double integration, sin-mode Rayleigh quotient,
  symbolic g-cancellation, Dunkerley≤Rayleigh symbolic+200-sample) — nothing rests on citation.
- Citations pinned: shigley (§7-6 critical speeds + Table A-9), gere (section props), juvinall (cross-check),
  nist (g). g=9.80665 is EXACT BY DEFINITION (3rd CGPM 1901), web-pinned to NIST SP 330. Textbook PDFs not
  web-accessible → topic-level + first-principles re-derivation (the stronger check), stated in verification:.
- Deviations from brief: (1) critical-speed readouts default to rpm (display [rpm,rad/s]) not the brief's
  (rad/s,rpm) — a critical SPEED reads in rpm and must be directly comparable to ω_op for the margin story;
  both units available. ω_s (modal) keeps rad/s-first. (2) Warn-only THING (brief authorizes the refusal pin
  → warn-band pin; ω_c is finite for all positive inputs, no honest hard-refusal; SimRefusal is the defensive
  contract). (3) k_beam (48EI/L³) is a derivation LOCAL to show ω_c=√(k/m) — the torsional-oscillator k_t idiom
  (no unauthorized new kind).
- New capabilities future briefs may rely on: the `role: constant` mechanism — a cited physical constant is a
  variable with `role: constant` + a `citation` resolving in sources[]; it is a known injected value excluded
  from DOF/knob arithmetic (in `known_syms`, not `dof_vars`), sampled into parity.inputs like a material, and
  rendered by ConstantsPanel. FULLY role-driven, NO hardcoded g — a SECOND constant (S09 impact-loading) just
  needs the variable + citation, zero code change. `m/s^2` display unit now in units.ts.
- Notes-for-next (S09 = impact-loading, energy method, 2nd constants consumer): (a) the constants mechanism is
  LANDED and generalizes — declare g (or any constant) as `role: constant` + `citation:`; it works with no
  pipeline change (S09's entry criteria that "this mechanism exists" are satisfied). (b) Give a constant a
  small non-degenerate sampling `bounds` (I used g [9.78,9.83], the real geographic range) with the DEFINED
  value as `default` — the default is what the site injects; the bounds only widen build-time sampling. (c) A
  constant lands in the parity sample.inputs (sampled like a material); the oracle feeds it straight to the
  engine, so no site-side special-casing is needed and none exists (KnobPanel/Readouts never branch on role).
  (d) e2e pins for a constant: assert the `constants-panel` testid shows value+source, `#knob-<sym>` count 0,
  and a readout that equals constant·knob (I used W=m·g=49.03 to prove injection). (e) THE ENVIRONMENT TRAP that
  cost me two no-op builds: the shell cwd (BOTH Bash and PowerShell) persisted as `...\pipeline` after a `cd`,
  so `pnpm -C site build` resolved to `pipeline\site` → ENOENT with exit 0 (pnpm help) OR exit 1. ALWAYS use an
  ABSOLUTE `-C` path: `pnpm -C C:\GitHub_Files\Mechanic\site build`. (f) Pre-verify ALL physics + residuals +
  DOF + the g-cancellation + Dunkerley≤Rayleigh + the ω_s Rayleigh-quotient in a throwaway SymPy script BEFORE
  authoring, then a standalone `ThingCompiler(dir).compile()` — first cold build passed green (S05-S07 note,
  confirmed a fourth time).

## S09 — impact-loading — 2026-07-06 — PR #22 — MERGED

- Shipped: THING 26 `impact-loading` (falling-mass impact by the energy method; NO time integration) — impact
  factor n = 1 + √(1 + 2h/δ_st), σ_impact = n·σ_st, in TWO configurations (axial rod, cantilever tip strike)
  selected by a constrained `mode` discriminator that blends ONE δ_st relation. The SECOND consumer of the
  `role: constant` mechanism (cited g via W = m·g) — proves it generalizes with ZERO pipeline change. Catalog
  25 → 26.
- Gates: pytest 268 passed (260 baseline + 8 test_impact_loading_physics.py); pnpm build clean (WARM — no
  pipeline-source edit; parity 1131 values/26 artifacts, katex 1101, mdx 52 files, units 622, 33 pages); unit 18;
  e2e 73 (+2 impact-loading: n=2-at-h=0/constant/stiffer-cascade, config-toggle/yield-warn; verification
  relation-block 25→26); visual pass (built dist /Mechanic/): axial rod draws a visible blue vertical rod + mass
  on a drop trail + σ_st/σ_i bars vs a dashed σ_y line (readouts n=120.06, σ_i=49.06 MPa, SF=6.61 match computed
  defaults), animation MOVING (mass y 47.65→67.91 / 450ms, not the invisible-SVG trap), constants panel shows
  g=9.80665 m/s²·nist with #knob-g count 0; toggled cantilever → redraws wall+beam+tip mass, readouts switch to
  n=8.21/σ_i=167.8/SF=1.93; al→steel-a36 (cantilever) → σ_i 167.8→263.83 MPa (cascade) with σ_st fixed 20.431
  (material-blind), YIELD WARN banner + σ_i bar RED above yield line; drove h→0 → n=2, σ_i=2·σ_st live; KaTeX +
  console clean, both themes, /things/ card + /verification/ block present. review: 6 independent fresh-context
  passes (physics + invariants + code/tests subagents + /code-review high with 3 finders) — 0 blockers/majors/
  correctness bugs; physics reviewer re-derived every claim from scratch, invariants reviewer recomputed all 10
  axial derived defaults (all match). 2 minors FIXED (σ_st added to the sim's refused gate + dead Number.isFinite
  guards dropped; golden-comment/assertion intermediates set exact 24.7791/6.07731); 1 rebutted (clamp one-liner
  dup'd in 2 sims → follow-up hoist task, not a THING-PR scope change).
- Golden: cantilever E=200 GPa, L=1 m, 30×30 mm, m=20 kg, h=60 mm, g=9.80665 → I=6.75e-8, W=196.133 N,
  δ_st=4.84279 mm, σ_st=43.585 MPa, n=6.07731, δ_i=29.431 mm, σ_i=264.88 MPa, SF=0.944<1 (yields). Source Gere &
  Goodno §2.8; all arithmetic in test_impact_loading_physics.py::test_numeric_golden. Also exact: δ_st=5mm+h=60mm
  ⇒ n=6, and h=0 ⇒ n=2.
- Citations pinned: gere (§2.8 impact loading + strain energy; topic-level, PDF not web-accessible → the impact
  factor, n=2, and √(2mghE/V) asymptote are re-derived from the energy balance in the physics test, the stronger
  check), juvinall (ch.7 impact / strain-energy-density + the unconservatism caveat, topic-level), nist (g =
  9.80665 exact by definition, web-pinned, reused from shaft-critical-speed). All carry verification:.
- Deviations from brief: (1) TWO genuine configs via a constrained discriminator + dimensionally-homogeneous
  LINEAR-BLEND δ_st/σ_st relations, NOT two relation sets — compile.py relations are GLOBAL (every relation holds
  in every config; verify.py:198 back-substitutes ALL residuals, compile.py:350 makes every derived var a target
  in every config), so a config-specific deflection relation is impossible. `mode` (0 axial/1 cantilever,
  constrained per config = the stepped-shaft load_case idiom) blends (1-s)·WL/EA + s·WL³/3EI; both configs verify
  independently and the sim reads values.mode to draw the matching member. (2) Volume V INLINED (m_mem=ρ·A·L),
  not a variable — `volume` is not a registered quantity_kind and adding it to kinds.py (pipeline source) forces a
  COLD rebuild for a unique-dims quantity with no chaining hazard; V=A·L stays in prose. This kept the whole
  session on WARM builds. (3) Warn-only (no invalid envelope): σ_i finite for all positive inputs → no honest
  hard-refusal (S04-S08 precedent); the brief's refusal pin became the yield warn-banner pin. (4) Section depth
  symbol `d` (cantilever-beam's `h` = drop height here).
- New capabilities future briefs may rely on: NONE (consumed S08's constants mechanism unchanged, as designed —
  a second constant needs only the variable + citation). Pattern reconfirmed & reusable: a constrained `mode`
  discriminator + a dimensionally-homogeneous LINEAR BLEND of two formulas gives TWO genuine configurations
  sharing ONE relation set WITHOUT doubling variables — the way to author configs whose physics genuinely differs
  (rod vs beam) when relations must be global. Per-config input defaults do NOT exist (defaults are variable-level;
  content.config.ts configurationSchema has no default override), so one geometry must be warn-clean for BOTH
  configs at the live-default material.
- Notes-for-next (S10 = slider-crank, exact kinematics at a knob angle): (a) the transient pnpm deps-check failure
  ("pnpm install failed" / getSyncResult at command start, clean lockfile) hit ONCE this session on a `pnpm exec
  playwright test` — just re-run; not a real failure (S01/S04/S07 saw variants). (b) configs whose physics differs
  are the constrained-discriminator + linear-blend pattern above — do NOT try config-specific relations (they're
  global; you'll fail the DOF/verify against the OTHER config). Only relations true in EVERY config may be global;
  a genuinely per-config formula must be a mode-blend or a table. (c) defaults are VARIABLE-level only, shared
  across configs — pick a geometry warn-clean for every config at the alphabetically-first qualifying material
  (al-2024-t3 for an E+σ_y+ρ binding), NOT nominal steel. (d) mint a new quantity_kind ONLY when dims collide with
  an existing kind AND chaining must be blocked; a unique-dims quantity (volume) does NOT need one and forcing it
  into kinds.py costs a 4-min COLD rebuild — inline it as S04 did with Q instead. (e) sim gets per-config awareness
  for free by reading the constrained discriminator from values (values.mode, like SteppedShaftSim's
  values.load_case) — no schema change. (f) the standalone `ThingCompiler(dir).compile()` (~2s) after a throwaway
  physics-preverify script caught the whole design before the first build — confirmed a fifth time; do this before
  any `pnpm build`.

## S10 — slider-crank — 2026-07-06 — PR #24 — MERGED

- Shipped: THING 27 `slider-crank` (exact reciprocating kinematics + quasi-static gas torque) — piston
  x(θ)=r·cosθ+√(l²−r²sin²θ) from the crank axis; v=ω·dx/dθ and a=ω²·d²x/dθ² authored FACTORED (shared
  subterm q=√(l²−r²sin²θ)) and machine-checked to be the true 1st/2nd derivatives of x by INDEPENDENT
  SymPy differentiation (the derivative check IS the first-principles cross-check here); force path
  sinφ=(r/l)sinθ, F_rod=F/cosφ, T=F·r·sin(θ+φ)/cosφ. TWO CROSS-CONSTRAINED configs over one shared relation
  set — kinematics knobs [r,l,θ,ω] (F held at its reference) and force knobs [r,l,θ,F] (ω held) — single
  branch (l>r assembles uniquely). Norton's two-term r/l approximation as a comparison readout, error bounded
  vs r/l. Geometry-only, NO material axis. Catalog 26 → 27.
- Gates: pytest 275 passed (268 baseline + 7 test_slider_crank_physics.py); pnpm build clean (WARM — no
  pipeline-source edit, so 26 THINGs cache-reused; BUT slider-crank itself compiled+verified FRESH from no
  cache, so its symbolic tier ran cold-equivalent and terminated in seconds — the factored-forms discipline
  holds, no explosion; parity 27 artifacts, katex 1155 strings, mdx 54 prose files, units OK, 34 pages,
  pagefind; total ~15s first build / ~5s rebuild); unit 18; e2e 75 (+2 slider-crank: θ=90° goldens v=−5/T=200
  + material-picker-absent, force-config torque∝F + obliquity warn + l≤r refusal with blanked readouts;
  verification relation-block count 26→27); visual pass (built dist /Mechanic/): sim renders (crank circle +
  amber arm, blue connecting rod, piston in cylinder guide, force overlay F/v/T/φ — 25 SVG els paused, 11
  playing; NOT the invisible-SVG trap), θ knob DRIVES it (x 171.0→118.6 mm as θ 57°→120°), drove l=30mm<r=50mm
  → SimRefusal "cannot assemble" + TWO invalid banners (engine sqrt-guard + my pedagogical l≤r [norton]) +
  ALL readouts blanked to "—", config switch kinematics↔force swaps the knob set ([r,l,θ,ω]↔[r,l,θ,F]), NO
  material picker (geometry-only), 0 KaTeX errors, console clean; Animate/Pause toggle works (force overlay
  shown paused, hidden while the presentation sweep runs). review: 6 independent passes — 3 fresh-context
  subagents (physics: re-derived everything incl. torque via virtual work, "ship it", 0 bugs; invariants:
  CLEAN incl. adversarial invariant-4 + two-config audit; code/tests: CLEAN, 0 bugs) + /code-review high (3
  finders: correctness 0 bugs after tracing every arrowhead/arc/NaN hot spot; cleanup 4 minor items; altitude
  /conventions 0 violations). 3 cleanup items FIXED (coordinate-alias equalities ocx=ox/ocy=qy=cyAxis made
  explicit; dead Number.isFinite(l&&r) guard in extremeObliquity dropped — refusal gate already proves them;
  qDraw folded into the paused/playing ternary so it isn't computed when paused), rebuilt+retested green. 0
  actionable correctness findings across all 6 angles (believed because: physics was pre-verified in a
  throwaway SymPy script AND re-verified by standalone compile before authoring; the ONE parity failure was
  caught by the build and fixed with a proven-identical stable form; the sim was scoped conservatively to
  avoid the invariant-4 sparkline; each reviewer named the checks it ran).
- Golden: θ=90°, r=50 mm, l=150 mm (r/l=1/3), ω=100 rad/s, F=4000 N → v=−5 m/s EXACTLY (=−ωr), T=200 N·m
  EXACTLY (=Fr, since sin(90°+φ)/cosφ=1), a=125√2=176.7767 m/s², φ=asin(1/3)=19.47°, F_rod=3000√2=4242.64 N,
  x=√0.02=141.42 mm. test_slider_crank_physics.py::test_numeric_golden, all arithmetic in the docstring.
- Citations pinned: norton (Norton, Design of Machinery, 5th ed — slider-crank position/velocity/acceleration
  + the r/l two-term series; engine gas-force torque with rod obliquity) TOPIC-LEVEL — textbook PDF not
  web-accessible this session (same access limit as S02–S09); nothing rests on the citation alone: the
  velocity/acceleration relations are re-derived by INDEPENDENT differentiation of x(θ) and the torque by
  VIRTUAL WORK (T·dθ=−F·dx) in the physics test (the stronger check). uicker (Uicker/Pennock/Shigley, Theory
  of Machines and Mechanisms) topic-level cross-check. Both carry verification:.
- Deviations from brief: (1) TWO CROSS-CONSTRAINED configs (kinematics/force), not "kinematics config + a
  separate force config computing only force vars" — compile.py forces EVERY derived var to be a target in
  EVERY config (compile.py:350; confirmed by the invariants reviewer via the constraint→Jacobian-row DOF
  mechanism), so both configs solve all 10 derived vars; they differ ONLY in which driver (ω vs F) is a knob
  vs a constrained reference. Constraint values EQUAL the drivers' own defaults (F:4000, ω:100), so both
  configs' default states are IDENTICAL and the derived defaults are coherent for both. Honest, invariant-
  sound, and mirrors Norton's separate kinematic/force analysis passes. (2) OMITTED the T(θ)-over-a-cycle
  sparkline the brief sketched: sweeping it via the engine needs engine-in-sim plumbing that does NOT exist
  (→ capability creep / §9.2), and drawing it in-component re-implements the trig = the invariant-4 violation
  the brief ITSELF names. Torque-fluctuation pedagogy delivered instead by interactive θ-drag (the T readout
  + the sim's torque arc both move) + the animate sweep + the failure.mdx flywheel bridge (which names the
  honest refusal to integrate the energy variation). Altitude reviewer confirmed omission is the right call.
  (3) SKIPPED rod angular acceleration (brief-optional) → no rad/s² unit needed (said so, as the brief asks).
  (4) `err` and `disp_exact` authored in CANCELLATION-FREE closed forms (err=−r⁴sin⁴θ/2l(l+q)²,
  disp_exact=r(1−cosθ)+r²sin²θ/(l+q)) — algebraically IDENTICAL to the naive subtractions (proven by SymPy,
  both physics + altitude reviewers independently confirmed simplify()==0) but float64-stable. The naive
  `err=disp_approx−disp_exact` FAILED check-parity by ~2e-6 relative (catastrophic cancellation of two
  near-equal travels); the relation keeps the clean definition, verify.py proves the stable solution
  satisfies it.
- New capabilities future briefs may rely on: NONE (no new engine/pipeline/schema/kind/unit — the brief said
  none required and none were). Two REUSABLE patterns: (i) TWO CROSS-CONSTRAINED configurations express "two
  analysis passes over one mechanism/system" when compile.py forces every derived var into every config —
  make each config a knob for one driver and constrain the other to ITS OWN default (both default states then
  coincide). (ii) A quantity defined as a difference of near-equal terms MUST be authored as a cancellation-
  free closed form (rationalize: l−q → r²sin²θ/(l+q)) or it fails the JS-vs-mpmath parity gate.
- Notes-for-next (S11 = ball-bearing-life, probability kind + optional threshold table): (a) THE PARITY TRAP
  I hit: check-parity.mjs is PURE RELATIVE, RTOL=1e-9, scale=max(|expected|,1e-30) — so ANY quantity that
  gets small via catastrophic float64 cancellation (a difference of two near-equal terms) FAILS parity even
  though it passes standalone compile+verify (mpmath is high-precision and doesn't cancel). The standalone
  `ThingCompiler().compile()` does NOT catch this — only the full build's check-parity does. Fix: author the
  cancellation-prone target as a rationalized closed-form SOLUTION; keep the clean relation definition. (b)
  e2e fills are in the knob's DISPLAY unit, not SI: an angle knob shows DEGREES (display_units [deg,rad]),
  a force knob [kN,N] shows kN — I filled "8000" meaning N and set 8000 kN (T came out 1000×). Check
  display_units[0] before writing a fill. (c) ball-bearing-life's `probability` kind is a NEW kind → editing
  kinds.py busts EVERY fingerprint = COLD ~4-min rebuild; batch it into the first build. The `threshold`
  table mode is schema-RESERVED (compile.py REJECTS it) — if S11's brief needs it, that's a real capability
  (un-reserving + implementing the threshold lookup + parity), so read the brief and confirm it's authorized
  before building; if not granted, don't improvise (§9.2). (d) useSimClock AUTO-plays (unless reduced-motion);
  if your sim overlays force/readout arrows that must match the knob state, HIDE them while playing (as
  slider-crank does with showForces=!playing) — a swept presentation pose carrying knob-state magnitudes lies.
  (e) a global invalid on a sqrt argument produces TWO banners (the engine's emitted sqrt-nonneg guard AND
  your authored envelope) — this is fine and honest (S03 saw the same), but author your envelope message to
  be the pedagogical one since both show.

## S11 — ball-bearing-life — 2026-07-06 — PR #25 — MERGED
- Shipped: THING 28 `ball-bearing-life` (rolling-contact load–life + Weibull reliability) — L10 = 1e6(C10/P)^a
  with ball a=3 / roller a=10/3 as TWO configs over ONE relation set (constrained exponent, the
  impact-loading/stepped-shaft discriminator idiom), life read in hours + Mrev, Weibull adjustment
  x(R)=x0+(θ−x0)(ln 1/R)^(1/b) with L_R=x(R)·L10, SCOPED refusal below R=0.90 (adjusted-life withheld, rated
  L10 stands), brinelling WARN past C0, NO material axis (geometry/catalog THING — the steel is inside the
  ratings C10/C0, planetary-gearset framing). New `probability` quantity kind + `h`/`Mrev` display units.
  Catalog 27 → 28.
- Gates: pytest 284 (275 baseline + 9 test_bearing_physics.py); pnpm build clean (COLD first — kinds.py edit
  busts every fingerprint; then warm; parity 1233 values/28 artifacts, katex 1190, mdx 56 files, units 667,
  35 pages, pagefind); unit 19 (+1 chain.test.mjs: probability↔ratio/efficiency rejected both ways,
  probability→probability legal); e2e 77 (+2 bearing: goldens/8×-halving/cited-constants/no-material-picker;
  ball-vs-roller 10^(1/3)/reliability-trim/scoped R<0.90 refusal with all three adjusted readouts withheld
  while L10 stands; verification relation-block 27→28); visual pass (built dist /Mechanic/): sim renders
  VISIBLY (outer/inner races, shaft+keyway, 9 balls, dashed cage + two log-scaled life bars; 27 SVG els — not
  the invisible-SVG trap), config ball→roller moved L10 1000→2154 Mrev (=10^(1/3)×) and relabeled the sim,
  drove R=0.7 and SAW the SCOPED refusal (x_R/L_R/t_R greyed to "—" + red banner while the rated L10 and the
  whole page stand), constants panel shows x0/θ/b cited to shigley, NO material picker, KaTeX 0 errors,
  console clean, /things/ card + /verification/(28) present; normal + refused states screenshotted.
  review: 6 independent passes — 3 fresh-context subagents (physics/invariants/code-tests) + /code-review
  high (correctness line-by-line / cross-file-registry / cleanup). 2 findings FIXED, 2 rebutted (see below).
- Golden: ball, C10=30 kN, P=3 kN (C10/P=10), n=1200 rpm, R=0.99 → L10=1000 Mrev (=1e6·10^3, exact),
  t_10=13,889 h (=2π·1e9/(40π)/3600), x(0.99)=0.219589578, L_R=219.59 Mrev, t_R=3049.9 h. Sanity
  x(0.90)=0.99335≈1 (L10 IS the 90% life). Source Shigley 10e Ch. 11; all arithmetic in
  test_bearing_physics.py::test_numeric_golden, re-derived (Weibull inversion via sp.solve of the CDF, the
  load–life rating basis, the SI hours-form ≡ Shigley 1e6·L10/(60n)) — nothing rests on the citation.
- Citations pinned: shigley (10e Ch. 11 §11-3 load–life + §11-4 reliability + **Table 11-6 Manufacturer 2**:
  x0=0.02, θ=4.459, b=1.483, the 02-series / 1e6-rev rating basis) — web-corroborated 2026-07-06 vs TWO
  independent reproductions of Table 11-6 (Bartleby + Chegg Shigley-10e-Ch11 solution sets); exponents
  a=3/(10/3) triple-corroborated (ISO 281 / itu.edu.tr Ch. 11 slides / pibsales). HONEST: (x0,θ,b,a) are
  cited DATA, not machine-proven physics; the inversion, rating basis, and hours form ARE machine-proven.
  juvinall (topic cross-check), iso (ISO 281/ABMA framework, NAMED not ingested). Textbook PDF not
  web-accessible for a page-exact quote.
- Deviations from brief: (1) Weibull params carried as `role: constant` (cited, rendered in ConstantsPanel)
  rather than inlined literals — more provenance-forward (credibility spine), reuses S08's constants
  mechanism with ZERO pipeline change; three dimensionless constants prove the mechanism generalizes past g.
  (2) L10/L_R use the EXISTING `count` kind (revolutions) with unit "1" + Mrev display — the brief authorized
  only `probability` as a new kind, and a revolution count IS count-like; no unauthorized kind minted.
  (3) `a` (load–life exponent) is a constrained `free` variable ({a:3} / {a:10/3}), NOT role:constant — the
  exponent differs per config so a single-value constant can't express it; the constrained-discriminator
  idiom (impact-loading `mode`, stepped-shaft `load_case`). (4) Threshold-table STRETCH appendix NOT
  attempted — the base THING passed every §3 gate, but I chose a clean stop over starting a schema-capability
  build (un-reserving `threshold` mode) late in the budget; named as future work below. The row was never
  PAUSED for it (brief forbids).
- New capabilities future briefs may rely on: `probability` quantity kind (dimensionless; must NOT chain into
  ratio/efficiency — a survival probability is neither a geometric ratio nor an efficiency) and `h` (3600 s)
  / `Mrev` (1e6) display units, all in the registries. Patterns reconfirmed: (i) cited FIXED model parameters
  are cleanly `role: constant` + citation — S08's g-mechanism generalizes to a set of dimensionless constants
  with no pipeline change; (ii) a dimensionless COUNT (revolutions) needs no new kind — reuse `count` + unit
  "1" + a scaled display unit; (iii) TWO configs whose physics differs only by a per-config CONSTANT are best
  expressed by constraining that constant directly ({a:3}/{a:10/3}) rather than a linear blend (cleaner than
  impact-loading's blend when the difference is a single parameter, not two whole formulas).
- Notes-for-next (S12 = disk-clutch, uniform wear vs uniform pressure): (a) `probability` + h/Mrev are LANDED.
  (b) THE PROVENANCE TRAP the brief flagged is REAL: my recalled Weibull θ was 4.439; the correct Table-11-6
  value is **4.459**. ALWAYS web-corroborate cited table constants before pinning — the search caught a 0.02
  error that would otherwise have shipped a wrong emitted number. (c) STRETCH DEFERRED: the threshold/step
  `table` mode is STILL schema-RESERVED (compile.py rejects it); S11 did NOT build it. A future threshold
  lookup (the bearing X,Y equivalent-load per Shigley Table 11-1 was the reserved stretch) is a REAL
  capability — un-reserve + implement the lookup + parity + the full S01 certificate story — and must be
  owner-authorized (§9.2); don't improvise it. (d) role:constant with unit "1" + empty display_units works
  (si_unit "1" is check-units-covered); ConstantsPanel renders dimensionless constants cleanly with their
  citation. (e) a constrained non-integer {a: 10/3} parses EXACT (compile.py parse_expr(str(val)) →
  Rational(10,3)); the artifact serializes it as float (compile.py:746) but the parity oracle uses the exact
  Rational, so the ~1e-15 gap is far under RTOL=1e-9 — no S10-style parity trap (and no catastrophic
  cancellation: every target is a product/sum, no near-equal subtraction). (f) a warn-only + scoped-invalid
  THING has NO reachable GLOBAL invalid via the knobs — SimRefusal is the defensive contract; the reachable
  refusal is the SCOPED one (R<0.90 → adjusted-life withheld, page stands), and THAT is the e2e "refusal pin".

## S12 — disk-clutch — 2026-07-06 — PR #26 — MERGED
- Shipped: THING 29 `disk-clutch` (axial disk clutch/brake torque capacity) — BOTH classical pressure
  models as parallel readouts (the combined-shaft two-model pattern, no silent winner): uniform pressure
  T_up = N·(2/3)μF(r_o³−r_i³)/(r_o²−r_i²) (new/rigid) and uniform wear T_uw = N·μF(r_o+r_i)/2 (run-in),
  with the machine-proven bracket T_up−T_uw = N·μF(r_o−r_i)²/(6(r_o+r_i)) ≥ 0 (equality iff r_i→r_o, so
  uniform wear is always the smaller/safe design torque); peak pressure p_max = F/(2π r_i(r_o−r_i)) vs a
  cited p_allow (warn); slip power P = T·ω_slip paired per model; the r_i* = r_o/√3 torque optimum as a
  derived readout (dT/dr_i = 0). r_i ≥ r_o = GLOBAL refusal (annulus doesn't exist). Friction (μ, p_allow)
  as CITED FREE KNOBS — NO material axis. NO new kinds/units/engine capability (brief forbade improvising).
  Catalog 28 → 29. (Second continuation row this session, after S11.)
- Gates: pytest 290 (284 baseline + 6 test_clutch_physics.py); pnpm build clean (WARM — no pipeline-source
  edit, 28 THINGs cache-reused, disk-clutch compiled fresh; parity 1251 values/29 artifacts, katex 1221,
  mdx 58 files, units 689, 36 pages, pagefind); unit 19 (no new kind → no new unit test); e2e 79 (+2 clutch:
  goldens/T_up>T_uw bracket/r_o√3 optimum/no-material-picker; r_i≥r_o global refusal blanking all readouts;
  verification relation-block 28→29); visual pass (built dist /Mechanic/): sim renders VISIBLY (friction
  annulus + 6 slip spokes + dashed r_i* marker; the two pressure profiles — flat uniform-pressure line, 1/r
  uniform-wear curve peaking at r_i; 24 SVG els), drove r_i→95 mm and SAW the bracket CLOSE (T_up 292.56 ≈
  T_uw 292.5) while p_max spiked to 1.68 MPa > p_allow → warn banner + RED wear curve, drove r_i=120>r_o=100
  → GLOBAL refusal (all 6 readouts "—", red invalid banner, SimRefusal "undefined here", page stands), NO
  material picker, KaTeX 0 errors, console clean, /things/ card + /verification/(29) present; normal/warn/
  refused screenshots. review: 4 independent passes — 3 fresh-context subagents (physics/invariants/
  code-tests) all CLEAN + a combined correctness-line-by-line/cross-file/reuse finder (NONE + 1 trivial
  cleanup FIXED: dead NaN guards in the sim's nm/mpa toDisplay wrappers, the S11 hrs fix applied here).
- Golden: N=2 faces, r_o=100 mm, r_i=50 mm, μ=0.3, F=5 kN, ω_slip=100 rad/s → T_up=233.333 N·m (=700/3),
  T_uw=225.0 N·m (exact), p_max=318309.886 Pa=0.318 MPa, P_up=23333.3 W, P_uw=22500 W, r_i*=57.735 mm
  (=100/√3). Source Shigley 10e §16-5; all arithmetic in test_clutch_physics.py, both torques re-derived by
  direct integration (∫ μ p(r) r·2πr dr, p=const and p·r=const, eliminating the pressure constant via
  F=∫p dA) — NOT taken on citation.
- Citations pinned: shigley (10e §16-5 axial clutches: both torque derivations + peak pressure + r_o/√3
  optimum; Table 16-3 friction materials for the μ/p_allow knob RANGES). HONEST: the torque physics is
  re-derived from first principles (the integrals, the T_uw≤T_up bracket, the optimum-is-a-maximum via 2nd
  derivative) in the physics test; the μ≈0.25–0.45 / p_allow≈1–2 MPa dry-lining ranges are CITED KNOB
  RANGES (standard Table 16-3 values), not machine-proven emitted numbers, and a friction-lining materials
  table with full basis/errata provenance is named FUTURE data/materials/ work. juvinall (ch.18 cross-check).
  Textbook PDF not web-accessible for a page-exact quote (same limit as S02–S11).
- Deviations from brief: NONE of substance. Single "analyze" config (parallel readouts, the combined-shaft
  pattern — the brief asked for exactly this). N (friction faces) is a free integer count knob (default 2 =
  single-plate clutch); F is the total axial clamping force, same on every face, N multiplies the torque —
  the golden anchors this convention (pinned first, as the brief warned). The friction-table fetch hit JS
  shells (textbook access limit) so the μ/p_allow ranges use standard Table 16-3 values cited honestly, not
  digit-exact transcription (they are knob ranges, not emitted goldens — low provenance risk, unlike S11's
  Weibull constants).
- New capabilities future briefs may rely on: NONE (no new engine/pipeline/schema/kind/unit — the brief
  said none required and none were). Pattern reconfirmed: a single config with PARALLEL derived readouts
  for two competing models (uniform pressure vs wear, like combined-shaft's Tresca vs von Mises) presents
  both without a silent winner; a machine-proven bracket identity (T_up−T_uw = a perfect square over a
  positive denominator) both proves the ordering AND gives the sim its "gap closes as r_i→r_o" story.
- Notes-for-next (S13 = two-bar-truss, determinate; NAMES Phase 3 at the boundary — this is the LAST
  Phase-2 THING before the S14 shed item; read the queue's S14 shed note + protocol §8 phase-boundary
  rule): (a) NO new machinery is the norm now — S13 (determinate truss) should need none; if you reach for
  a new kind/unit, STOP and re-read the brief. (b) After S13, the session either continues to S14 band-brake
  (protocol §2 continuation) OR marks it SKIPPED (both pre-authorized by the S14 shed note) and then CLOSES
  Phase 2 per protocol §8: write reports/phase-2.md, verify/update the Phase-3 DRAFT briefs against merged
  reality, set the queue header to "Active phase: 2 — AWAITING OWNER", and STOP. Do NOT start any Phase-3
  row (S15+) — Phase 3 has NO ruling line yet ("Phase 3: NOT YET RULED"). (c) a GLOBAL (unscoped) invalid
  is the right refusal when the WHOLE page is meaningless (r_i≥r_o here — no annulus); use scoped only when
  some readouts survive (S11's R<0.90). (d) the standalone-compile parity samples can land in the invalid
  region (r_i>r_o here gave finite-but-negative p_max) and STILL pass check-parity — finite garbage matches
  JS-vs-mpmath; the invalid verdict is a separate UI concern, so don't be alarmed by a weird sample value in
  the standalone compile. (e) friction as the PRODUCT (clutch torque) vs friction as a BUDGET (power-screw,
  belt-drive) is the three-page friction arc — cross-link it. (f) two continuation rows in one session
  (S11+S12) worked cleanly at a healthy context budget; the §2 rule (≥50% remains → may claim next) held.

## S13 — two-bar-truss — 2026-07-06 — PR #27 — MERGED
- Shipped: THING 30 `two-bar-truss` (symmetric determinate two-bar truss — the deliberate Phase-3 bridge
  page). Member force F_m = P/(2cos α) from joint equilibrium ALONE (α from the VERTICAL); joint deflection
  δ = P·L/(2·A·E·cos²α) by the unit-load method; two configs via a loading-sense discriminator `mode`
  (tension: yield governs; compression: each pin-jointed member is also an Euler strut, P_cr = π²EI/L² (K=1)
  reused verbatim from euler-column, SF_buck = P_cr/F_m). Buckling readouts SCOPE-refused in tension (a
  tension member cannot buckle) and below λ_T (Johnson regime — cross-linked euler-column, NOT re-implemented).
  Material binds E/σ_y/ρ: force & stress material-blind, deflection carries E (Ti-vs-steel), mass ρ. Small-
  displacement WARN at δ>L/10; GLOBAL refusal at α≥90° (degenerate geometry). overview names the redundant
  truss as the Phase-3 solveLinear deliverable. NO new engine/pipeline/kind/unit. Catalog 29 → 30.
- Gates: pytest 297 (290 baseline + 7 test_truss_physics.py); pnpm build clean (WARM — no pipeline-source
  edit, 29 THINGs cache-reused, two-bar-truss compiled fresh; 37 pages, pagefind, check katex/mdx/parity/units
  all green); unit 19 (no new kind → no new unit test); e2e 82 (+3 truss: determinate-force/material-blind-
  stress/buckling-governs; Ti>steel deflection cascade; tension scoped-buckling + α≥90° global refusal;
  verification relation-block 29→30); visual pass (built dist /Mechanic/ via preview): sim renders VISIBLY
  (compression A-frame amber members + pin supports + α arc + buckle bow; tension hanging-V blue & straight;
  11 SVG els, member stroke rgb(245,158,11) 4.5px — not the invisible-SVG trap), drove α→91° and SAW the
  GLOBAL refusal (SimRefusal + red α≥90° banner + all readouts "—"), toggled tension and SAW the SCOPED
  buckling refusal (P_cr/SF_buck "—", N_m flips +46.19, page stands), switched al→Ti and SAW δ move
  (0.75→0.49 mm) while F_m/σ held material-blind, KaTeX 0 errors, console clean, /things/ card +
  /verification/(30) present; normal + refused screenshotted. review: 4 independent passes — 3 fresh-context
  subagents (physics/invariants/code-tests) + a /code-review correctness sweep. The physics reviewer
  INDEPENDENTLY confirmed cos²α (not cos³) and the α-from-vertical cos-not-sin convention without being told.
  Single shared finding = display-only derived-default seeds drifting in the ~5th sig-fig (never rendered,
  never build-checked); FIXED all 6 (sigma/SF_y/delta/m_truss/P_cr/SF_buck recomputed exact). 2 cosmetic nits
  (F2 redundant <g> wrapper, F3 duplicated gov-predicate) left/rebutted as harmless. 0 correctness bugs.
- Golden: steel truss at defaults (P=80kN, α=30°, L=2m, d=50mm, E=200GPa/σ_y=250MPa/ρ=7800): F_m=46188.02 N,
  σ=23.5234 MPa, SF_y=10.62773, δ=0.2716 mm, m=61.261 kg, P_cr=151397.8 N, SF_buck=3.27786 (< SF_y → buckling
  governs the compression member). Source Gere & Goodno; all arithmetic in test_truss_physics.py, re-derived
  from first principles (vector equilibrium, unit-load AND compatibility-triangle deflection agreeing
  symbolically, buckling ODE) — nothing on citation.
- Citations pinned: gere (Gere & Goodno 9th — trusses/axial §2.1-2.3, unit-load deflection §9.8-9.9, small-
  displacement), shigley (Euler/Johnson λ_T boundary, cross-link), timoshenko (compatibility-triangle cross-
  check). HONEST: cos²α form web-corroborated 2026-07-06 (Roylance/MIT, δ_v = δ/cos θ) AND re-derived two ways
  in the physics test; textbook PDFs not web-accessible for a page-exact worked example (same limit as
  S02–S12), so the golden is by-hand, cited topic-level.
- Deviations from brief: **(1) THE DEFLECTION EXPONENT. The brief specified δ = P·L/(2·A·E·cos³α); this is a
  transcription error — the correct symmetric two-bar result is cos²α, confirmed FOUR ways: (i) my SymPy
  pre-verify, (ii) both independent physics-test derivations (unit-load + compatibility) agreeing, (iii) the
  brief's OWN stated method (e = F_m L/AE projected via the compatibility triangle, δ = e/cos α) yields cos²α,
  (iv) web-corroboration. Shipped the correct cos²α. A gate could NOT pass honestly with cos³α (the
  independent physics cross-check contradicts it). "Reality wins, record it" — followed the brief's METHOD,
  corrected only its mis-transcribed final formula. ⚠️ OWNER ACTION: the S13 brief's Physics-scope and
  Exit-criteria lines still quote cos³α and should be corrected to cos²α.** (2) The α→90° WARN is a δ/L<0.1
  small-displacement bound (cited Gere, the repo's standard convention / authoring-template example), NOT an
  invented member-inclination angle — the brief flagged "no invented 85°" as the one risk; a deflection-ratio
  bound sidesteps it. (3) Buckling scope-refused in tension via the `mode` discriminator (a tension member
  cannot buckle) — the honest way to present a compression-only check on a shared relation set.
- New capabilities future briefs may rely on: NONE (no new engine/pipeline/schema/kind/unit). Patterns
  reconfirmed: (i) a constrained discriminator (`mode`, impact-loading idiom) both SIGNS a readout (N_m) AND
  GATES a scoped refusal (`mode > 0` on the buckling readouts) — a scoped envelope keyed on a discriminator
  compiles fine because the "condition must be a Relational" check is at PARSE time, BEFORE config-constraint
  substitution, so `mode > 0` (mode free integer, no sign assumption) stays a Relational; at runtime the
  constrained value trips/passes it. This is the clean way to make a check config-specific on a shared
  relation set. (ii) A deflection re-derived two genuinely different ways (energy/virtual-work vs geometry/
  compatibility) agreeing symbolically is a strong physics-test pattern — reuse for any energy-vs-geometry
  result. (iii) A scoped-refusal default state (tension's buckling withheld, or compression when stubby) is a
  legitimate first-impression when it IS the lesson (euler-column precedent) — I defaulted to COMPRESSION so
  the default page is refusal-free and the α→90° global refusal is the single memorable moment.
- PHASE 2 CLOSED (§8) — same session, after the owner confirmed context was fine (45%) and authorized the
  spec fix. Ran the phase-boundary duty as a follow-up docs PR on branch `docs/phase-2-close`: marked S14
  band-brake SKIPPED (pre-authorized shed item; the ≈30 target R2 is met at 30 — did NOT start a full THING
  below the §2 50% continuation threshold); wrote `docs/sessions/reports/phase-2.md` (evidence-based per §11);
  verified all six Phase-3 DRAFT briefs (S15–S20) against merged reality — entry-criteria references all still
  hold (solve1d machinery, binds schema, MaterialPicker, torque/stiffness/pressure_stress kinds, 13 materials,
  CTE-not-shipped, 30 catalog dirs), so NO technical updates were needed; pinned S18's catalog number per its
  request; CORRECTED the S13 brief's cos³α → cos²α (Physics-scope + Exit-criteria, dated notes) now that the
  owner authorized it; set the queue header to `Active phase: 2 — AWAITING OWNER`. S13 itself (THING 30) shipped
  in PR #27 (merged, deploy-verified); the phase-close docs ride a separate PR. Row was NEVER paused.
- Notes-for-next (Phase 3, AFTER the owner rules): (a) Phase 2 is CLOSED and AWAITING OWNER — do NOT start any
  Phase-3 row until `queue.md` carries the literal `Phase 3 approved — JD <date>` ruling line AND the header
  reads `Active phase: 3` (only the OWNER flips both, in one edit — §8). A ruling line with an unflipped header
  = stop and report, don't "help". (b) Once ruled, the topmost QUEUED Phase-3 row is S15 (solveLinear +
  propped-cantilever) — a solo L-size engine session, never claimed via continuation; its design is DECIDED
  (R5/ADR-0008), implement don't redesign. (c) NOTHING is paused; S14 is SKIPPED (not blocked). (d) The
  provenance lesson, now doubly proven (S11 recalled Weibull θ, S13 brief formula): a brief is a spec NOT a
  source — always independently re-derive emitted formulas and web-corroborate constants. (e) Reusable trap: a
  `mode`-style discriminator gating a scoped refusal (`mode > 0`) must be a FREE integer with NO `positive:` —
  else the condition simplifies to True at parse and the compiler rejects it ("condition must be a comparison");
  the Relational check is at parse time, before config-constraint substitution, so `mode > 0` on a free integer
  stays a Relational and works. Default config is compression (configs[0]); the α slider bounds reach 92° so
  the α≥90° global refusal is knob-reachable.

## QC0 — Phase-2 QC audit + Phase-3 stage-setting docs (owner-directed) — 2026-07-06 — PRs #29, #30 — MERGED
- Shipped: the Phase 3 ruling recorded on the owner's in-chat instruction (PR #29: literal ruling line +
  header flip in one edit per runbook 2e; routed via PR instead of direct-to-main so CI validates before
  publish); Phase-3 stage-setting docs (PR #30): authoring-things.md gains `role: constant` and
  configuration-discriminator (`mode`) sections + a correction of the stale "multi-column not built in v1"
  line (S02 shipped it — consecutive same-`(table, at)` entries merge into one lookup, verified against
  compile.py); architecture.md artifact schema gains the `table` plan step (exact emitted shape) and the
  `constant` role; data-provenance.md gains the THING-level `sources[].verification` section; protocol.md
  gains rule 6 (**a brief is a spec, not a source**) echoed in §3.4; roadmap.md Phase-2 section condensed
  187 → 31 lines (the per-THING record lives in THIS log + reports/phase-2.md) and Phase 3 marked ACTIVE;
  CLAUDE.md rulings/rules lines updated; NEW `reports/phase-2-qc-audit.md` (the QC findings report,
  brief-grade). ZERO THING/site/pipeline changes.
- Gates: docs-only PRs, but the QC's Track A re-ran the full suite from COLD on main first: generated tree
  deleted → cold `pnpm build` clean (all 30 THINGs re-verified from scratch, 37 pages, katex/mdx/parity/
  units green, ≈4 min); pytest 297 passed (15 s); unit 19 passed; e2e 82 passed vs built dist (24 s;
  confirms the logged 82 — static grep sees 75, parameterized loops add 7). Live-site spot checks:
  /verification/ = 30 audit blocks with the gate story; two-bar-truss ships cos²α (no cos³ anywhere),
  refusals + material cascade described correctly. CI green on both PRs before merge.
- QC audit (Track B): a 75-agent workflow — 15 fresh-context auditors (13 Phase-2 THINGs + kind-registry
  + e2e-pins), every actionable finding verified by a 3-lens adversarial panel (technical / file-evidence /
  materiality; ≥2 of 3 to survive). Result: **20 confirmed findings (3 critical, 16 minor, 1 note-grade) +
  23 notes; ZERO wrong emitted numbers** — every governing formula independently re-derived and matched,
  every golden recomputed. Criticals: (1) stepped-shaft-fillet cites nonexistent "Roark Table 6-1 case
  III-2" (actual fetched source per the S02 log = Pilkey); (2) torsional-oscillator's static twist has no
  yield envelope (θ_st renders banner-free at T_app far past shear yield — invariant-5 silent region);
  (3) slider-crank sim draws the paused-overlay torque arrow clockwise for positive (counterclockwise) T.
  Full structured report: `docs/sessions/reports/phase-2-qc-audit.md`. NONE fixed this session — all touch
  thing.yaml/site (full per-THING gate work); recommended to the owner as 1–2 QC-fix queue rows, report =
  the brief.
- Golden: n/a (docs). Citations pinned: n/a (docs) — but NOTE: the audit's PROPOSED citation corrections
  (14-6b, §16, §9.10, §4-17, Pilkey table) are themselves recall+web claims; the fix session must
  independently re-verify each before shipping (rule 6 applies to fixes too).
- Deviations from brief: owner-directed interactive session — no queue row, no brief; plan approved
  in-chat. One adaptation: the runbook's direct-to-main ruling commit was denied by the environment's
  permission layer, so the ruling rode PR #29 (same one-edit content, plus CI validation).
- New capabilities future briefs may rely on: none in code. In docs: role:constant, the discriminator
  idiom, and multi-column tables are now in authoring-things.md; protocol rule 6 exists and is load-bearing.
- Notes-for-next (S15 = solveLinear + propped-cantilever, a solo L-size engine session, NEVER claimed via
  continuation): (a) Phase 3 is RULED and the header flipped — S15 is the topmost QUEUED row; its entry
  criteria were verified twice (phase close + this session's spot-verify), all green. (b) Read
  `reports/phase-2-qc-audit.md` before touching any of the 9 THINGs it names; if the owner queues QC-fix
  rows they should precede or interleave early Phase 3 — none of the findings blocks S15 itself. (c) The
  `sources[].verification` backfill for the 5 pre-Phase-1 THINGs at 0% pinned (cantilever-beam,
  fourbar-linkage, planetary-gearset, pressure-vessel, torsion-shaft; catalog average ≈18% of ~328 source
  entries) is real verification labor — recommended as a later-phase row, never a bulk text edit.
  (d) roadmap.md's Phase-2 detail was deliberately condensed; the authoritative per-THING record is THIS
  log — do not re-inflate the roadmap. (e) The QC audit found the gates' blind spots are exactly
  cross-THING consistency (sibling envelope patterns dropped in reuse; asymmetric warns) and citation
  locators — worth a standing audit line in future phase-close briefs.

## QC1 — Phase-2 QC-fix batch (owner-directed) — 2026-07-06 — PR #31 — MERGED
- Shipped: ALL 20 confirmed findings of the Phase-2 QC audit dispositioned (the audit report IS the brief;
  its Dispositions section is the item-by-item record). 3 criticals FIXED: stepped-shaft-fillet phantom
  "Roark Table 6-1 case III-2" attribution → Pilkey + Roark Table 17.1 with dated correction notes in
  yaml/test-docstring/log-errata; torsional-oscillator static-twist shear-yield warn (16·T_app/(πd³) <
  σ_y/2 — the 5000 N·m knob on a ≈196 N·m onset rendered fictional twist banner-free); slider-crank sim
  torque-arrowhead sense swapped (positive T now CCW, matching +θ, the animation sweep, and the θ=90°
  free body; drawn-frame convention documented in the component). 4 citation locators corrected AFTER
  independent re-verification (rule 6): spur-gear 14-4b→14-6b (×5), circular-plate §16-17→§15-16, impact
  Gere §9.7-9.8→§9.8/§9.10, impact Shigley §4-18→§4-17. 7 envelope warns close the silent regions:
  spur-gear SYMMETRIC undercut (Min/Max on the smaller member — old N_p-only check provably vacuous at
  inverted ratios), stepped-shaft torsion-SF disclaimer (load_case < 3, discriminator idiom at warn
  severity), beam-shear-flow wide-flat b < 2h, scs slenderness L > 10d (ssbeam sibling pattern restored)
  + Dunkerley-side resonance band, impact δ_i < L/10, torsional static yield. Test quality: torsional
  golden 52.3155→52.3160 (true 52.316017); impact tautological stress assert → genuine σ = E·c·v″(0)
  derivation; _norton_kt refuses out-of-domain like table.ts. Bearing overview L₁₀h display math
  rewritten (both forms plain revolutions; old chain off by 10⁶ under its own definitions);
  circular-plate warn direction corrected (linear theory OVER-predicts; capacity under-predicted);
  stepped SF default 1.6927. Runbook launch prompt now carries rule 6 verbatim + model-agnostic wording
  (protocol header likewise). RECORDED not fixed: revolution_count kind question (owner), note-grade
  items, mid-bracket resonance observation — all in reports/phase-2-qc-audit.md Dispositions.
- Gates: pnpm build clean (7 THINGs recompiled + re-verified; katex/mdx/parity/units green); pytest 297;
  unit 19; e2e 85 (82 + 3 new warn pins — torsional static yield @1000 N·m steel-a36, spur-gear
  role-reversed 100/14 mesh, scs Dunkerley-only window @1958 rpm steel-a36); visual pass (built dist
  /Mechanic/ via preview): slider-crank paused overlay arrowhead tip up-LEFT of hub pointing left-down
  = CCW at T = +199.87 N·m (verified in DOM coordinates + screenshot), torsional amber static-yield
  banner at T_app = 1000 beside θ_st = 66.1° (screenshot), defaults banner-free, console 0 errors;
  review: 3 independent fresh-context subagents (§4). (a) Physics PASS 13/13 — re-derived the
  Saint-Venant flexure correction from scratch (edge factors 1.126/1.396/1.988 = the quoted
  13%/40%/2×), confirmed the old undercut check silent exactly where the new one fires, redid the sim
  free-body + screen-tangent arithmetic. (b) Invariants PASS 7/7 — recompiled all changed THINGs
  cache-evicted proving the new conditions survive parse as Relationals; truth-tabled them; every
  touched test strengthens or stays neutral. (c) Code/tests PASS — every e2e margin recomputed from raw
  DB values; _norton_kt float-membership + interpolation-branch coverage verified programmatically; tsc
  clean. Findings: 1 should-fix FIXED pre-merge (torsional e2e pin selects steel-a36 — was silently
  dependent on materials-DB file ordering); 2 nits REBUTTED ("2-D elasticity" banner shorthand kept,
  the numbers are the exact classical values; rounded-input comment kept as a deliberate hand-check);
  1 observation RECORDED (mid-bracket resonance gap — enforcement weaker than advice, errs safe).
- Golden: 52.3160 Hz (recomputed full-precision 52.316017 independently by three reviewers + me);
  SF 1.6927 (default chain recomputed, 1.692734).
- Citations pinned: every corrected locator re-verified BEFORE editing — 14-6b vs a published Shigley
  §14 worked-example excerpt; Timoshenko §15/16/17 vs published TOC listings; Gere ch. 9 vs the 9th-ed
  contents listing; Shigley §4-17 vs the ch. 4 contents; Roark Table 17.1 (ch. 17, pp. 809-822) vs
  publisher listings. HONEST: Pilkey's internal table number is NOT independently pinnable from
  accessible sources today — attributed at book level, with the part/case designation credited to
  Pilkey's numbering and the original mis-attribution preserved in dated correction notes.
- Deviations from brief: executed as ONE batch (the report recommended 1-2 rows) per owner instruction
  in-session. S01/S02 log entries carry dated ERRATUM annotations preserving the original wrong text —
  the errata pattern, not silent edits (invariants reviewer: compliant in spirit).
- New capabilities future briefs may rely on: none (no engine/pipeline/schema/kind/unit change).
  Pattern worth reusing: a discriminator-gated WARN (load_case < 3) surfaces a per-configuration
  disclaimer on a shared relation set — the S13 scoped-refusal idiom's warn-severity sibling.
- Notes-for-next (S15 = solveLinear, solo, full-context): (a) e2e pins on material-dependent values
  MUST select a material explicitly — the page default is the alphabetically-first QUALIFYING material
  (al-2024-t3 on most pages) and DB file ordering is not a contract; yaml-comment numbers (ω_c, yield
  onsets) are computed from DECLARED defaults and differ from the live default material. (b) The
  launch prompt in runbook.md changed (rule 6 sentence added) — JD's paste-block is current. (c) The
  QC cycle is CLOSED: audit (QC0) → fixes (QC1) same day; remaining owner decisions are the
  revolution_count kind and the sources[].verification backfill row. (d) Nothing is paused; S15 is the
  topmost QUEUED row of active Phase 3.

## S15 — solveLinear capability + propped-cantilever — 2026-07-06 — PR #32 — MERGED
- Shipped: the `solve_linear` capability (ADR-0008 part a — certified linear-group solving) + THING 31
  `propped-cantilever` (its reference consumer). The pipeline certifies a coupled square system AFFINE in
  its targets (∂²r/∂tᵢ∂tⱼ ≡ 0 per target pair + target-free coefficients), solves it EXACTLY at build time
  with `sp.linsolve` (never blind solve()), and DESUGARS the closed forms into ordinary eval steps that flow
  through the EXISTING verify path (total back-substitution, manifold DOF, parity oracle) — zero new runtime
  engine; det(A) rides an existing `nonzero` guard. propped-cantilever solves the 3×3 {R_A, R_B, M_A} from
  two equilibrium + one compatibility relation; reactions are material-BLIND (EI cancels — a machine-checked
  identity step), σ/δ/SF/mass cascade downstream. Catalog 30 → 31.
- Gates: pytest 311 (297 baseline + 9 test_solve_linear + 5 test_propped_physics); pnpm build clean (COLD —
  verify.py+compile.py edits changed the fingerprint, all 31 THINGs re-verified ~3-4 min; then WARM after the
  review fixes, 30 cache-reused + propped recompiled; 38 pages, katex 1330, mdx 62 files, parity 1359, units
  748, pagefind); unit 19 (no new kind → no new unit test); e2e 88 (85 baseline + 2 propped things pins
  [material-blind reactions + δ/SF cascade; yield warn] + 1 a11y axe on the new page; relation-block 30→31);
  visual pass (built dist /Mechanic/ via preview + Playwright screenshots): sim renders VISIBLY (blue beam
  curve dipping to the teal roller prop, green wall hatch, teal reaction arrows scaled 5:3 + M_A moment arc,
  13 UDL arrows, 47 SVG els — beam-line stroke rgb(147,197,253), NOT the invisible-SVG trap), drove w→50 kN/m
  on nylon and SAW the beam turn RED (rgb(220,38,38)) with BOTH warn banners (yield + small-deflection),
  switched steel→Ti and SAW δ 1.20→2.18 mm / SF 3.45→12.07 while R_A/R_B/M_A/σ HELD material-blind, KaTeX 0
  errors, console clean, /things/ card + /verification/(31) + solveLinear gate bullet present; normal + warn
  screenshotted. review: 5 independent fresh-context subagents — physics / invariants / code-tests (the 3 §4
  angles) + /code-review high's cleanup and altitude-conventions finders. ZERO correctness bugs, ZERO wrong
  emitted numbers, no lowered/weakened tests, no committed artifacts; invariants + altitude passes fully CLEAN
  (they recompiled the planetary 2-DOF reference to confirm it survives, and confirmed solve_tainted is empty
  so the identity derivation steps are genuinely verified not skipped). FIXED 5 findings (3 prose + 2 test
  quality): (i) failure.mdx "eight times the tip deflection" was wrong (removing the prop, the free end goes
  0→wL⁴/8EI = 24× the propped midspan, not 8×; the paired "wall moment 4× larger" IS correct) → reworded;
  (ii)+(iii) overview.mdx + thing.yaml step-7 prose "titanium a third as stiff / δ triples" overstated (Ti
  E≈110 vs 200 GPa → ~half as stiff, δ ~1.8× — matches the live 1.81× and the sibling) → corrected both;
  (iv) test_solve_linear singular-at-sample match tightened "singular|~ 0 at sample"→"~ 0 at sample" to pin
  the per-sample path; (v) op-count comment de-specified. REBUTTED (idiom/defensive): the det-sampling loop
  echoing tiered_zero's scaffold (every verify campaign rolls its own loop — inverse accept polarity here, a
  shared extraction is a cross-cutting refactor out of scope); the constant-det fast-path branch (one eval vs
  30, catches a tiny-nonzero constant simplify misses); srepr-exact guard dedup (harmless double guard at
  worst, moot for propped where det cancels).
- Golden: steel-a36 at declared defaults (w=12 kN/m, L=2 m, b=50 mm, h=100 mm, E=200/σ_y=250/ρ=7850):
  R_A=15 kN, R_B=9 kN, M_A=6000 N·m, σ_max=72 MPa, δ_mid=1.2003 mm, SF=3.4474, m=78.5 kg. Source Gere &
  Goodno ch.10; all arithmetic in test_propped_physics.py, reactions re-derived TWO independent ways (force
  method + solving EI·v''''=w BVP with dsolve) agreeing symbolically — nothing on citation.
- Citations pinned: gere (Gere & Goodno 9th ch.10 indeterminate beams, force method; §5.5 flexure) topic-level
  (textbook PDF not web-accessible, same limit as S02-S13), reactions web-corroborated 2026-07-06 (testbook,
  prepp.in, ScienceDirect all give prop reaction 3wL/8 & FEM wL²/8) AND re-derived in the physics test;
  hibbeler (ch.12 superposition cross-check) topic-level, equilibrium re-derived from the free body.
- Deviations from brief: (1) COMPATIBILITY RELATION authored EI-CANCELLED (`w·L⁴/8 − R_B·L³/3`) not the
  brief's `w·L⁴/(8EI) − R_B·L³/(3EI)`. FORCED by the DECIDED ordering rule: a group coefficient may read only
  inputs/constraints/materials/earlier-groups, and `I` is a downstream derived `solutions` target — the EI
  form would make the group read I (a forward-DAG violation; test_solve_linear's ordering test proves it).
  Physically IDENTICAL (EI ≠ 0 divides out); the material-blindness of the reactions is preserved and becomes
  a MACHINE-CHECKED identity step in the derivation. (2) BRIEF ERROR CORRECTED (rule 6): the brief stated the
  true deflection max at x=(1+√33)L/16 ≈ 0.42L; independent re-derivation (test_propped_physics) gives
  x=(15−√33)L/16 ≈ 0.5785L — the brief's point is on the wrong side of midspan and deflects LESS than midspan,
  so cannot be the max. δ_max ≈ wL⁴/185EI value is correct; only the location was mis-transcribed. overview.mdx
  ships the correct 0.578L. ⚠️ OWNER ACTION: the S15 brief Physics-scope line should be corrected to
  (15−√33)L/16. (3) M_A display unit is N*m only (kN*m not in units.ts DISPLAY_FACTORS; no new unit added per
  "no new columns/units").
- New capabilities future briefs may rely on (S16-S19): `solve_linear` groups — certified exact linear-system
  solving. Author `solve_linear: [{targets:[...], relations:[...]}]` at configuration level; groups run after
  constraints, before solutions; coefficients read only inputs/constraints/materials/earlier-groups (forward
  DAG); ≤4 targets/group, op cap 200 on coeffs+solved-forms (trip → future LU-runtime ADR). det(A) emits a
  nonzero/invalid guard; combining with solve1d/table/branches is refused (v1). solveND stays reserved/unbuilt.
- Notes-for-next: (a) det(A) frequently CANCELS in the solved forms (propped's L³/3 divides out — that IS the
  material-blindness), so auto_guards emits NO det guard; the EXPLICIT det guard in compile.py is the only
  non-singularity check. A future non-cancelling det (S17 composite-bar) WILL get an auto denominator guard on
  the solved forms too — harmless (both invalid, trip together), and seen_guards dedups an exact-srepr match.
  (b) The "singular-at-sample" test uses det=(n-2) with n an integer knob [1,3]: the seeded RNG deterministically
  draws n=2 and the per-sample det check fires — reproducible, not flaky. (c) e2e knob sliders read in the FIRST
  display unit: #knob-w max=50 is 50 kN/m (=50000 N/m), fill "50" not "50000". (d) The EI-cancel compatibility is
  the pattern for S16's fixed-fixed family too; S17's composite-bar is where EI does NOT cancel (two materials)
  and det carries the stiffness distribution — that is where the auto det guard first appears. (e) The desugar
  makes solve_linear STRONGER than solve1d for the audit surface: because closed forms exist, derivation
  `identity` steps CAN reference the solved targets (solve_tainted stays empty), so the compatibility/solve is a
  machine-verified derivation line — do this for S16-S19 too.

## S16 — fixed-fixed beam + fixed-fixed torsion shaft — 2026-07-06 — PR #34 — MERGED
- Shipped: two statically-indeterminate THINGs, both PURE `solve_linear` consumers (zero schema/engine/pipeline
  change), exercising S15's capability at both ends of its range. `fixed-fixed-beam` (UDL) = the 4-unknown group
  `{R_A, M_A, R_B, M_B}` from 2 equilibrium + 2 compatibility (zero deflection AND zero slope at a released end):
  R_A=R_B=wL/2, |M_end|=wL²/12 (hogging, both walls), M_mid=wL²/24 (M_end=2·M_mid), δ_max=wL⁴/384EI at midspan.
  `fixed-fixed-torsion-shaft` (interior torque) = the 2-unknown group `{T_A, T_B}` from equilibrium + twist
  compatibility: T_A=T·b/L, T_B=T·a/L (larger reaction on the SHORTER segment). Both reaction sets material-BLIND
  (EI/GJ cancels in the authored-cancelled compatibility relation — a machine-checked identity step); E/G still move
  δ/φ/SF/mass. Catalog 31 → 33.
- Gates: pytest 322 (311 baseline + 11 new: 6 test_fixedfixed_beam_physics + 5 test_fixedfixed_shaft_physics);
  pnpm build clean (COLD ~3-4 min all 33 re-verified; then WARM after the sim/CSS fix, seconds; 40 pages, parity
  1419 values across 33 artifacts, katex/mdx/units green); unit 19 (no new kind); e2e 94 (88 baseline + 4 things
  pins [beam & shaft material-blind cascade + yield/shear-yield warn] + 2 axe); relation-block detector 31→33.
  visual pass (built dist /Mechanic/ via preview + screenshots): BEAM sim renders visibly (symmetric blue curve
  flat at both walls dipping to midspan = zero-slope built-in condition, 2 reaction arrows + 2 moment arcs + 13 UDL
  arrows, 56 SVG els, beam-line stroke rgb(147,197,253) NOT the invisible-SVG trap), drove w→50 kN/m on nylon and
  SAW it turn RED (rgb(220,38,38)) with 2 warn banners (yield + δ>L/10), switched al→steel and SAW δ 8.39→3.04 mm
  while R_A/M_A/σ HELD material-blind. SHAFT sim renders visibly (2 segments, teal reaction arcs + ink applied arc
  at x=a, scribed twist, 33 SVG els), drove T→20000 on al-6061 and SAW both segments turn RED with 2 warn banners,
  and T_A/T_B/τ HELD while φ moved with material. KaTeX 0 errors, console clean on both. review: 3 independent
  fresh-context subagents (§4). (a) Physics ZERO defects — re-derived both THINGs two ways each (beam: EB BVP +
  force method; shaft: compatibility + Castigliano), confirmed every number/sign/limit/unit/det/envelope-boundary,
  incl. the flagged 4×4 sign trap (opposite-sign wall couples physically honest, not symmetric accident). (b)
  Invariants CLEAN 8/8 — verified against pipeline SOURCE (DOF numeric-rank, coefficient-taint enforcement,
  solve_tainted empty for solve_linear, no new kinds, no weakened/deleted tests, no committed artifacts). (c)
  Code/tests CLEAN — test independence, golden arithmetic, no invisible-SVG (every class enumerated vs global.css),
  meaningful e2e (material-qualification trap avoided), triply-confirmed numbers vs a randomized pipeline sample.
  Zero actionable findings from all three; believed because the diff mostly imitates the proven S15 propped pattern,
  the one novel risk (4×4 signs) got focused attention + 5 independent confirmations, and the process already caught
  its one real bug (below) in the visual pass.
- Golden: BEAM steel-a36 at declared defaults (w=12 kN/m, L=3 m, b=50 mm, h=100 mm, E=200/σ_y=250/ρ=7850): R_A=R_B=18
  kN, M_A=M_B=9000 N·m, M_mid=4500 N·m, σ_max=108 MPa, δ_max=3.0375 mm, SF=2.3148, m=117.75 kg. SHAFT (T=500
  N·m, a=0.4, b=0.6 → L=1 m, r=20 mm, G=79 GPa): T_A=300, T_B=200 N·m, τ_1=23.873 MPa, τ_2=15.915 MPa, φ=6.0439e-3
  rad, SF_1=5.2360, SF_2=7.8540, m=9.8018 kg. All hand-derived in the physics tests; reactions re-derived TWO
  independent ways agreeing symbolically.
- Citations pinned: gere (Gere & Goodno 9th — beam ch.10 indeterminate beams / force method + §5.5 flexure; shaft
  §3.8 indeterminate torsion + §3.3-3.4 torsion formula) + hibbeler (ch.12 superposition cross-check) + shigley
  (§5-4 max-shear-stress σ_y/2, shaft). Topic-level (textbook PDFs not web-accessible, same limit as S02-S15);
  wL²/12 and T·b/L web-corroborated 2026-07-06 AND re-derived from first principles in the physics tests.
- Deviations from brief: (1) NO fallback fired — the general 4×4 op count is 19 (≪ SIMPLIFY_OPS_CAP 200), so the
  full asymmetric-sign group ships as the brief's primary intent; the pre-authorized symmetry reduction was not
  needed. (2) Shaft inputs are [T, a, b, r] (two segment lengths as independent knobs, L=a+b derived) rather than
  [T, a, L, r] — makes a<L structural, no cross-variable bound needed; b=L−a preserved (here L=a+b). (3) Shaft uses
  radius r (J=πr⁴/2) per the brief, where the sibling torsion-shaft uses diameter — same physics, brief's explicit
  choice honored.
- New capabilities future briefs may rely on: none (no engine/pipeline/schema/kind/unit change). Confirmed for
  S17-S19: a solve_linear group whose SOLVED FORMS keep a variable denominator (shaft T_A=Tb/(a+b)) gets BOTH the
  explicit compile.py det guard AND an auto denominator guard — harmless (both invalid, trip together); the
  det-cancels-to-monomial case (beam, like propped) gets only the explicit guard. So S17 composite-bar's non-
  cancelling det behaves as S15 predicted.
- Notes-for-next (S17 = multi-material composite-bar): (a) the EI/GJ-cancel compatibility pattern is now proven
  twice (propped, this pair) — for S17 the stiffness does NOT cancel (two materials), so the compatibility relation
  WILL carry the modulus ratio and det carries the stiffness distribution; author it reading inputs/materials only
  (materials ARE allowed in group coefficients, unlike the derived I). (b) e2e material-qualification trap: the
  shaft binds shear_modulus, and nylon-66/wood/concrete LACK it — page default is the alphabetically-first
  QUALIFYING material (al-2024-t3 for shear_modulus binders), so selectOption explicitly and never use a
  non-qualifying material for a shear-bound THING. (c) FOUND a latent CSS bug (out of scope, flagged as a task):
  `.shaft-body` (global.css) is declared AFTER `.beam-yielding` at equal specificity, so shaft sims setting
  "shaft-body beam-yielding" DON'T turn red — torsion-shaft's caption promises red but stays blue. Fixed MY sim with
  a compound `.shaft-body.ff-yielding` selector (higher specificity, order-independent); torsion-shaft still needs
  the one-line `.shaft-body.beam-yielding { stroke:#dc2626 }` fix. (d) Nothing is paused; S17 is the topmost QUEUED
  row of active Phase 3.

## S17 — multi-material binding slots + composite-bar — 2026-07-06 — PR #36 — MERGED
- Shipped: the material-binding SLOTS capability (one THING binds two INDEPENDENT materials via named slots, each
  with its own labelled native `<select>`) + THING 34 `composite-bar` (its reference consumer). Authored
  `materials.binds` now accepts EITHER a flat `{sym: prop}` map OR named slots `{slot: {sym: prop}}`; a flat map
  normalizes to a lone `default` slot in exactly ONE place (compile.py `_normalize_material_binds`), so every
  previously shipped THING is byte-for-byte unchanged (the `default` slot keeps the legacy legend "Material",
  testid "material-select", aria "Material"). Compiled `material_binding` is now slot-keyed
  `Record<slot, Record<sym, prop>>`. composite-bar (core + sleeve, rigid end plates, centric axial P) solves the
  2×2 `{P_1,P_2}` load share by axial stiffness A·E — the FIRST non-cancelling-determinant `solve_linear` consumer,
  so its reactions are material-DEPENDENT (unlike propped/fixed-fixed, where EI/GJ cancelled): swap the sleeve and
  the load migrates to the stiffer member (invariant 3's legibility moment). Catalog 33 → 34.
- Gates: pytest 336 (322 baseline + 14: 5 test_composite_physics + 9 test_material_slots); pnpm build clean (COLD
  once — compile.py fingerprint changed, all 34 re-verified; then WARM after the review NIT fix, 34 cache-reused;
  41 pages, katex/mdx/parity/units green); unit 19 (no new kind → no new unit test); e2e 99 (95 baseline + 4: 3
  composite-bar `things` pins [A·E share + equal-strain σ ratio + first-yield ordering; slot-isolation swap; yield
  warn] + 1 axe on the new page with TWO labelled selects); relation-block detector 33→34; tsc clean on the
  changed .tsx/.ts (only a pre-existing playwright.config.ts @types/node nit). visual pass (built dist /Mechanic/
  via preview + Playwright screenshots to scratchpad): sim renders VISIBLY (concentric-annulus cross-section to the
  true area ratio — violet sleeve r=46, blue core disk r=29.09=46·√0.4 — + side elevation with end plates & P
  arrow + a load-share bar; 32 SVG els, real fills, NOT the invisible-SVG trap); set BOTH members steel → share
  40:60 (geometric), SWAPPED the sleeve steel→aluminium and SAW the blue core segment grow 40%→66% while every
  readout cascaded (σ_1 100→165 MPa, SF_1 2.48→1.50, δ 0.25→0.41 mm) and the core stayed steel (isolation); cranked
  P→1000 kN and SAW BOTH members turn red with TWO separate yield-warn banners, each naming its member. Legacy
  cantilever-beam confirmed byte-identical (one "Material" picker, testid material-select, default al-2024-t3).
  /things/ card + /verification/(34) present, KaTeX 0 errors, console clean. review: 3 INDEPENDENT fresh-context
  subagents (§4) — (a) physics, (b) invariants, (c) code/tests — TWO of which recompiled the THING through the real
  verifier AND re-ran the pytest suite. ZERO SHOULD-FIX across all three; ZERO wrong emitted numbers; no
  weakened/deleted tests (the only touched assertion is the relation-block change-detector 33→34); no committed
  artifacts. Physics re-derived the A·E share two ways, all 10 declared defaults, and all 12 golden assertions;
  invariants recomputed DOF (4=inputs) and confirmed the planetary 2-DOF canary still compiles; code/tests
  confirmed every SVG class exists + the e2e slot-isolation is real. FIXED 1 NIT (failure.mdx: "the stiffer
  material carries the larger share" → precise "the member with the greater axial stiffness A_iE_i carries the
  larger share" — share ∝ A·E, distinct from stress ∝ E). RECORDED (no change): the redundant-but-harmless det
  guard (non-cancelling det → both the explicit det guard AND an auto-denominator guard, both invalid, trip
  together — exactly as S15/S16 predicted).
- Golden: seeded steel-a36 core + al-6061-t6 sleeve, A_1=4 cm², A_2=6 cm², P=100 kN, L=0.5 m: f_1=0.6613 (core
  66%), P_1=66.13 kN, σ_1=165.34 MPa, σ_2=56.44 MPa, σ_1/σ_2=2.929=E_1/E_2 (equal strain), δ=0.4134 mm, SF_1=1.501
  (steel core), SF_2=4.890 (Al sleeve) → the STIFF steel core, taking 2/3 of the load against a spec-minimum yield,
  yields FIRST despite steel being the "stronger" metal. All hand-derived in test_composite_physics.py from the
  seed files' PUBLISHED values (29/9.9 Msi; 36 ksi spec-min / 276 MPa typical; 0.282/0.098 lb/in³), cross-checked
  against an independent sympy solve of the coupled 2×2.
- Citations pinned: gere (Gere & Goodno 9th ch.2 axially-loaded statically-indeterminate members / compatibility
  method) + hibbeler (ch.4 cross-check) — topic-level (textbook PDFs not web-accessible, same limit as S02–S16);
  the stiffness-proportional share P_i = P·A_iE_i/ΣAE and δ = PL/ΣAE web-corroborated 2026-07-06 AND re-derived
  from first principles (springs in parallel: k_i = A_iE_i/L) in the physics test.
- Deviations from brief: (1) LANDING DEFAULT is al-2024-t3 core + al-6061-t6 sleeve, NOT the brief's literal
  "steel core + aluminum sleeve". FORCED: the live per-slot default is the alphabetically-first QUALIFYING material
  by slot position (both slots share the same qualifying list), and hardcoding "steel core" would require a
  per-slot default-material SCHEMA field — capability creep beyond the DECIDED slots design (§9.2), which the brief
  forbids ("anything beyond this → BLOCK") AND would change every legacy THING's default (breaking "renders
  identically"). The brief's PURPOSE (unequal, material-driven shares at landing + the swap moment) is met: the two
  slots default to DISTINCT materials (slot i → qualifying[i], clamped; legacy single-slot unchanged =
  qualifying[0]), the DECLARED material defaults ARE steel (E_1=200e9) core + aluminium (E_2=69e9) sleeve for file
  coherence + the golden, and the e2e + visual pass select steel+al explicitly. ⚠️ OWNER: if a literal steel-core
  LANDING state is wanted, a future session needs an approved per-slot default-material field. (2) The optional
  mass readout SHIPPED (trivial; exercises the ρ binding on BOTH slots — the independent density axis).
- New capabilities future briefs may rely on (S18–S19): `materials.binds` accepts named slots
  `{slot: {sym: prop}}` (a flat map still normalizes to a `default` slot); compiled `material_binding` is slot-keyed
  `Record<slot, Record<sym, prop>>`; the UI renders one labelled native `<select>` per slot (label =
  TitleCase(slot) + " material"; the `default` slot keeps the legacy "Material" DOM/testid); [slug].astro filters
  each slot's dropdown by that slot's OWN bound properties; ThingWidget fans out each slot over ONLY its own symbols
  (slot isolation, e2e-pinned). Bound symbols must be globally unique across slots (all `role: material`). No
  per-slot default-material selection exists (slot i → qualifying[i] by position).
- Notes-for-next (S18 = thermal-assembly + CTE column): (a) THE authored slot syntax is a NESTED map —
  `materials:` → `binds:` → `core:` → `E_1: youngs_modulus …` → `sleeve: …` — NOT a flat map; see
  composite-bar/thing.yaml. IMPORTANT: the S18 brief's entry-criterion `rg -A4 "material_binding"
  site/src/content/things/composite-bar/thing.yaml` will find NOTHING — the AUTHORED key is `binds:` (the string
  "material_binding" appears only in the COMPILED artifact / generated JSON, which is gitignored). Grep `binds:` +
  the slot names, or the compiled artifact, instead. (b) A new property COLUMN (CTE) is added to
  data/materials/*.yaml + the ingest, NOT to the slots mechanism — bind it in whichever slot(s) need it; per-slot
  filtering auto-drops materials lacking CTE from that slot's dropdown. (c) e2e material-qualification trap persists
  PER SLOT: each slot's page-default is the alphabetically-first QUALIFYING material for THAT slot — always
  selectOption explicit materials, and target the slot testid `material-select-<slot>` (named slots) or
  `material-select` (a `default` slot). (d) composite-bar's det does NOT cancel, so it carries BOTH an explicit det
  guard and an auto-denominator guard (harmless, both invalid, trip together). (e) Nothing is paused; S18 is the
  topmost QUEUED row of active Phase 3.

## S18 — CTE material column + thermal-assembly — 2026-07-06 — PR #37 — MERGED
- Shipped: the `coefficient_of_thermal_expansion` material column (SI `1/K`; 10 metals seeded, append-only) + two
  new quantity kinds `temperature_difference` (K — the FIRST nonzero Θ slot in the 7-vector) and
  `thermal_expansion_coefficient` (Θ⁻¹) + display units `K` and `1e-6/K` + two `dims.py` unit tokens (`degF_interval`
  = 5/9 K exactly, interval-only; `um` micrometer) + THING 35 `thermal-assembly`: a two-segment bar clamped between
  rigid walls under uniform ΔT, the FIRST Θ-slot consumer. `{F_1,F_2}` is a certified 2×2 `solve_linear` group
  (equilibrium F_1=F_2 + zero-net-elongation compatibility); the determinant does NOT cancel (like composite-bar), so
  the thermal force is material-DEPENDENT. Sign convention: F positive in COMPRESSION (heating→compression→F>0,
  σ>0; cooling→tension; ΔT=0→unstressed exactly). The E·α punchline: a fully restrained STEEL bar out-stresses an
  ALUMINIUM one for the same ΔT (steel Eα 2.34e6 > al 1.60e6) even though aluminium expands ~2× as much. Catalog 34 → 35.
- Gates: pytest 347 (336 baseline + 11 new: 6 test_thermal_physics + 2 negative-Θ dimension-gate + 3 CTE conversion
  goldens); pnpm build clean (COLD ~3–4 min — kinds/dims/ingest changed the fingerprint, all 35 re-verified; then WARM
  seconds after the sim-visual fix; 42 pages, katex/mdx/parity/units green incl. the two new display units); unit 19
  (kinds ride the artifact, no new engine unit test); e2e 102 (99 baseline + 3 thermal-assembly `things` pins:
  [goldens + ΔT=0→σ=0 EXACT unstressed recovery] · [Eα cascade steel>al though al expands more + slot isolation] ·
  [yield warn]); relation-block change-detector 34→35. visual pass (built dist /Mechanic/ via preview + screenshots
  normal+warn+unstressed): sim renders VISIBLY (left steel rgb(147,197,253), right al rgb(139,92,246) — NOT the
  invisible-SVG trap), clamped bar between two hatched walls with INWARD compression arrows; drove ΔT 50→300 K and SAW
  BOTH segments turn RED (rgb(220,38,38)) with 2 "has yielded" warn banners (σ_1 713>248, σ_2 475>276 MPa); drove
  ΔT→0 and SAW F=σ_1=σ_2=ε=0 EXACTLY (unstressed); switched materials and SAW σ cascade (steel+al 118.84/79.22 MPa);
  the free-expansion ghost shows the aluminium segment growing MORE than steel (differential expansion) with an amber
  "blocked" overhang. KaTeX 0 errors, console clean; /things/ card + /verification/(35) block present. review: 3
  INDEPENDENT fresh-context subagents (§4). (a) Physics ZERO defects — re-derived F by superposition + coupled 2×2,
  every limit (ΔT=0, single-material σ=EαΔT, cooling→tension), all 6 declared defaults, the Pytel-Singer golden, and
  all 10 CTE conversions; found 1 NON-physics provenance nit (FIXED, below). (b) Invariants ZERO — DOF (5 inputs, group
  = 2 relations), Θ-slot participates (negative tests non-vacuous), append-only CTE (0 deletions), ρ NOT bound, sim
  consumes `invalid` with no bespoke math, solve_linear certified with det guard + taint=0, no weakened/deleted tests,
  no committed artifacts, planetary 2-DOF canary still compiles. (c) Code/tests SOUND — physics test imports only
  math+sympy (no thing.yaml), every SVG class exists in global.css, e2e pins meaningful, degF_interval exact+safely
  named, tsc clean. THREE findings total, ALL resolved: the source_id nit (fixed) + the visual-pass ghost bug (fixed)
  + a rebutted-none.
- Golden: PUBLISHED — Pytel & Singer, *Strength of Materials*, 4th ed., **Problem 266** (steel L=15in A=1.5in²
  E=29e6psi α=6.5e-6/°F + al L=10in A=2.0in² E=10e6psi α=12.8e-6/°F, ΔT=100°F, "braced against buckling"):
  F=26,691.84 lb, σ_steel=17,795 psi, σ_al=13,346 psi — reproduced to 4 sig figs from first principles (via MATHalino).
  Seeded steel-a36+al-6061-t6 golden at THING defaults: F=47,534.7 N, σ_1=118.84 MPa, σ_2=79.22 MPa, matched live.
- Citations pinned: gere (Gere & Goodno 9th §2.5 Thermal Effects) + hibbeler (ch.4) — topic-level (textbook PDFs not
  web-accessible, same limit as S02–S17). Every CTE value PERSONALLY web-fetched from its source: ASM Metals Handbook
  Desk Edition (Davis 1998) via AmesWeb (al-2024/6061/7075, ti-6al-4v, iron-gray), ASM Ready Reference (Cverna 2002)
  via AmesWeb (steel-1045/4340), Callister 7e/Machinery's Handbook via AmesWeb (steel-a36), Sandmeyer mill datasheet
  (ss-304), Copper Development Association copper.org (brass-c26000) — each verified_at URL recorded. Pytel-Singer
  Prob 266 web-corroborated + re-derived. Θ kinds & degF_interval ×1.8 conversion machine-tested.
- Deviations from brief: (1) CTE PRIMARY source for the al/ti alloys is ASM Metals Handbook Desk Edition (via AmesWeb),
  NOT MIL-HDBK-5J as the brief pre-named — because MIL-HDBK-5J publishes CTE only as a temperature CURVE (figure-read,
  no typeset scalar), so the ASM typeset value is the honest precise primary and MIL-HDBK-5J rides as graphical
  cross-check (protocol rule 6: honest provenance over brief-transcription; the brief is a spec not a source). (2)
  nylon-66, wood-douglas-fir, concrete-normal OMITTED from the CTE column (pre-authorized): nylon's datasheets are
  PDF-only (couldn't personally fetch-verify a value; unfilled PA66 spread 80–120e-6/K), wood anisotropic +
  moisture-confounded, concrete no source pre-named. (3) iron-gray-class30 GAINED a CTE entry but does NOT appear in
  thermal-assembly's dropdown — it has no yield_strength (brittle cast iron), and the per-slot filter (needs E+α+σ_y)
  correctly drops it; the UI honestly shows "4 materials not listed" (nylon/wood/concrete/iron-gray). (4) Landing
  default is al-2024-t3(left)+al-6061-t6(right) per the S17 slot-position rule, NOT steel+al — declared file defaults +
  e2e + visual pass all select steel+al explicitly (same forced deviation as S17 composite-bar; a literal steel-left
  landing needs an approved per-slot default-material field — ⚠️ OWNER, still open from S17). (5) No SF readout: with
  signed stress (cooling→tension) a σ_y/σ margin flips sign confusingly, so yield is conveyed by the warn (σ²<σ_y²) +
  the red sim; the brief's readout list (σ, free strain) did not require SF. (6) Sim ghost GROWTH is exaggerated ×60
  (capped on-screen, disclosed in the label "growth exaggerated") because real thermal strains (~5e-4) render the true
  overhang sub-pixel — the numeric ε_i and caption carry the true magnitudes (the §5 pass caught this; beam-deflection
  precedent). (7) Two derived readouts F_1 AND F_2 both shown though equal — the equilibrium F_1=F_2 needs both as
  group targets, and showing them equal teaches "one force through both segments."
- New capabilities future briefs may rely on (S19+): the `coefficient_of_thermal_expansion` property COLUMN (SI 1/K;
  add to `PROPERTY_KEYS`+`SI_UNIT` is done); kinds `temperature_difference` (Θ, unit K) and
  `thermal_expansion_coefficient` (Θ⁻¹, unit 1/K), with α·ΔT = the existing `strain` kind; display units `K` and
  `1e-6/K`; `dims.py` tokens `degF_interval` (=Rational(5,9)·kelvin, interval-only, ×1.8 to /K) and `um` (micrometer).
  A THING may bind α per slot alongside E/σ_y; a material lacking any bound property is auto-dropped from that slot.
- Notes-for-next (S19 = bolted-joint-gasket): (a) the Θ slot works exactly like any other dimension now; a
  temperature-difference knob is a normal free variable (NOT positive — ΔT can be negative) whose product with a
  thermal_expansion_coefficient material is a strain. (b) SIGNED derived stresses (σ can be ±) need bounds spanning
  negative (e.g. [-2e9, 2e9]) and NO `positive:`; the yield warn is `sigma**2 < sigma_y**2` (sign-agnostic |σ|<σ_y),
  which stays a Relational at parse time (σ free, σ_y positive). (c) a real thermal strain is ~1e-3, so ANY sim
  drawing a displacement/expansion must EXAGGERATE it (disclose in-label) or it's sub-pixel — Playwright green ≠
  visible; do the §5 pass. (d) CTE provenance: MIL-HDBK-5J gives CTE as a figure not a scalar — cite the ASM
  Desk-Ed/AmesWeb typeset value as primary; the pre-existing repo id for that source is `asm-desk-ed-1998`. (e) e2e
  per-slot default trap persists: thermal-assembly's slots land on al-2024-t3(left)/al-6061-t6(right); always
  selectOption explicit materials on `material-select-left`/`-right`. (f) Nothing is paused; S19 (bolted-joint-gasket)
  is the topmost QUEUED row of active Phase 3.

## S19 — bolted-joint-gasket — 2026-07-06 — PR #38 — MERGED
- Shipped: THING 36 `bolted-joint-gasket` (a preloaded gasketed joint under external tensile load) — a 2×2
  `solve_linear` for the bolt/member force split {F_b, F_m}, with readouts C = k_b/(k_b+k_m) (the joint
  stiffness constant), separation load P₀ = F_i/(1−C), bolt stress σ_b = F_b/A_t, and proof safety factor
  n_p = S_p·A_t/F_b. Separation (F_m ≤ 0) is a GLOBAL (unscoped) invalid refusal. NO material binding —
  honest: E never enters (k_b/k_m are DIRECT inputs by design) and S_p is a bolt-grade spec value, not a
  seeded material. Pure S15 solveLinear consumer: ZERO new kinds/schema/engine machinery. Added display
  units GN/m, MN/m, mm² (DISPLAY_FACTORS data rows, per the brief's Notes). Catalog 35 → 36.
- Gates: pytest 354 (347 baseline + 7 test_boltedjoint_physics); pnpm build clean (WARM — no pipeline-source
  edit, only the new THING compiles + astro; 43 pages, katex 1527, mdx 72 files, parity 1485 values, units
  884 refs incl. the 3 new display units); unit 19 (no engine change); e2e 106 (102 baseline + 3 bolted-joint
  [goldens+load-split; GLOBAL separation refusal = all 6 readouts blank + SimRefusal; proof warn while
  clamped] + 1 axe on the new no-material-picker page); relation-block change-detector 35→36.
  visual pass (built dist /Mechanic/ via preview + screenshots normal+separation+warn): sim renders VISIBLY
  (blue bolt head/shank/nut, violet members, amber gasket line, outward P arrows, and two force-share bars
  straddling a dashed preload line — 15 rects, real fills, NOT the invisible-SVG trap); drove P 10→60 kN past
  P₀=50 and SAW the GLOBAL refusal (SimRefusal "separated" figure + red invalid banner + ALL readouts "—");
  raised F_i=40/P=44 kN and SAW the bolt bar turn red (#dc2626) with the amber proof warn while readouts
  stayed LIVE (page stands, F_m=18 kN>0); softened k_m 1.0→0.25 GN/m and SAW C rise 0.5→0.8, F_b 30→33 kN
  (the gasket legibility moment — soft gasket drives the bolt harder); KaTeX 0 errors, console clean;
  /things/ card + /verification/(36 relation blocks) present.
- review: 5 INDEPENDENT fresh-context passes (§4) — (a) physics, (b) invariants, (c) code/tests subagents +
  /code-review high (correctness + cleanup/conventions finders). Physics re-derived the load-share TWO ways
  from scratch (APPROVED, ZERO findings; explicitly confirmed the soft-gasket prose is NOT backwards — soft
  gasket raises C AND raises P₀, kept distinct). Invariants: all five PASS (DOF 12−6=6 via the real Jacobian
  rank check; det = 1/k_b+1/k_m never singular; no-material justification honest; sim pure layout consuming
  `invalid` + SimRefusal, no destructuring defaults). Code/tests: 9 checks pass (physics test imports only
  sympy — genuinely first-principles; golden hand-checkable + exact; every CSS class exists; units convert
  correctly; no committed artifacts). 3 findings FIXED: (a) dead `F_i` removed from `scaleMax=Math.max(P0,F_b)`
  (F_b ≥ F_i always; positivity now rests on the ok-guard's P₀>0, with a comment); (b) overview prose tension
  resolved (named the DEFAULT as an already-gasketed joint at C=0.5, above bare-metal's 0.15–0.25); (c)
  separation e2e completed with the n_p blanked-readout assertion (all 6 derived readouts). Rebutted (no
  change): invalidVars unread is correct (this THING's refusal is global-only, matching composite/thermal);
  `S_p ?? Infinity` and the per-sim arrow helper are established sibling idioms; the "is this really S19?" nit
  is confirmed correct against queue.md.
- Golden: HAND-DERIVED (labeled honestly — no accessible Shigley worked example was web-pinnable), a clean
  C = 1/2 state: F_i=25 kN, P=10 kN, k_b=k_m=1 GN/m, A_t=100 mm², S_p=600 MPa → C=0.5, F_b=30 kN, F_m=20 kN,
  P₀=50 kN, σ_b=300 MPa, n_p=2.0. Every value checked by hand and re-derived TWO independent ways
  (compatibility solve; combined-stiffness δ=P/(k_b+k_m)) in test_boltedjoint_physics.py; matches the live
  widget default exactly.
- Citations pinned: `shigley` (Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., ch. 8 —
  §8-4 joint constant C, §8-5 bolt/member forces + separation, Table 8-11 metric proof strengths) —
  topic-level, NOT page-pinned (textbook PDF not web-accessible, same honest limit as sibling THINGs);
  web-corroborated 2026-07-06 (MechaniCalc "Bolted Joint Analysis"; Univ. of Portland ME fastener notes) AND
  re-derived from first principles. HONEST proof-strength nuance recorded in sources[].verification: ISO 898-1
  splits Class 8.8 into 580 MPa (d≤16 mm) / 600 MPa (16<d≤72 mm); 600 MPa is Shigley Table 8-11's M16–M36
  value (the default); S_p (property class) and A_t (thread size) are independent knobs, so the default
  pairing is honest.
- Deviations from brief: (1) Golden is hand-derived, not a Shigley worked example (the gate authorizes either;
  none was web-pinnable — labeled honestly in the test + verification). (2) Added display units GN/m (1e9),
  MN/m (1e6), mm² (1e-6) — anticipated by the brief's Notes as "routine data covered by check-units, not a
  capability" (joint stiffnesses run ~1e9 N/m; N/m and kN/m alone render unreadably). (3) Default A_t=100 mm²
  is a clean representative area (≈ between M12 and M16), framed as an independent thread-size input while S_p
  carries the cited Class-8.8 value with its diameter nuance disclosed — keeps the core load-share golden
  clean and honest. (4) Sim adds a proof-warn tint (bolt bar red at σ_b≥S_p) — presentational, computed from
  the same engine values as the sibling yield tints (composite/thermal), not bespoke physics.
- New capabilities future briefs may rely on: none (pure S15 solveLinear consumer; zero new kinds/schema/
  engine). Display units GN/m, MN/m, mm² now in DISPLAY_FACTORS. Pattern: a non-cancelling-determinant 2×2
  solve_linear whose coefficients read only INPUTS (k_b, k_m, F_i, P) needs NO EI-cancellation gymnastics
  (contrast propped/fixed-fixed) — det guard is a plain k_b+k_m≠0 and the forces are input-dependent (like
  composite/thermal). A GLOBAL invalid on a SIGNED derived var (F_m: no `positive:`, bounds spanning negative)
  is the simple original refusal path.
- Notes-for-next (S20 = Phase 3 close): (a) S19 is the last catalog-growing Phase 3 row before the close; S20
  writes reports/phase-3.md, reconciles the Phase 4 DRAFT briefs, and sets the queue header to
  `Active phase: 3 — AWAITING OWNER` then STOPS (protocol §8) — do NOT start Phase 4 (no ruling line exists).
  (b) the transient pnpm deps-check failure ("pnpm install failed" before test:unit) hit once — run
  `pnpm install --frozen-lockfile` ("Already up to date") then re-run; not a real failure (S03/S04 precedent).
  (c) the /verification/ relation-block e2e count is now 36 — S20's optional three-parallel-rods THING would
  bump it to 37 (else it stays 36). (d) a NO-material THING is fully supported end to end (material_binding
  null; [slug].astro + ThingWidget guard it; e2e asserts material-select count 0) — 8 THINGs now omit
  materials. (e) Nothing is paused; S20 (Phase 3 close) is the topmost QUEUED row.

## S20 — Phase 3 close: reconciliation + report — 2026-07-06 — PR #39 — MERGED
- Shipped: the Phase 3 closure (docs-only; ZERO site/pipeline/test files touched). `docs/sessions/reports/
  phase-3.md` (the §11 phase report); roadmap/CLAUDE/README reconciled to merged reality (Phase 3 → ✅ complete,
  catalog 30 → 36 via `solveLinear` + 6 statically-indeterminate/coupled THINGs); the README "No blind solving"
  bullet gained a certified-linear-solve sentence (the flagship Phase 3 capability /verification/ already
  describes); the S25 brief pinned its delegated example-3 chain wire; queue header → `Active phase: 3 —
  AWAITING OWNER`, S20 → DONE. Catalog UNCHANGED at 36 — the optional stretch THING three-parallel-rods was
  NOT taken (pre-authorized skip to protect the non-abandonable closure budget; go/no-go decided after scoping
  the reconciliation, both outcomes compliant per the brief).
- Gates: docs session (protocol §3 minus per-THING items 2–4). NO site/pipeline file touched, so no local
  `pnpm build`/e2e/axe required by the brief's exit criteria — CI green on the PR is the docs-session merge
  gate (S00 precedent). Evidence sweep: `ls site/src/content/things | wc -l` → 36 (matches CLAUDE/README, both
  already 36 on main from S19/#38); `rg -i "solvend" pipeline/ site/src` → 1 hit (reserved schema comment, no
  implementation — part (b) still PROPOSED/deferred; verbatim command+output recorded in the report);
  `/verification/` is auto-generated (an audit block per THING by construction, so all 6 solveLinear THINGs
  covered + totals self-reconcile 30 → 36) and its hand-authored "Coupled linear systems (solveLinear)" prose
  was checked against `verify.certify_linear_group` TODAY and matches (affine proof → exact linsolve/Gaussian
  → per-sample non-zero det → desugar → runtime refusal guard); all S21–S25 entry-criteria commands re-run and
  hold. review: 3 INDEPENDENT fresh-context subagents (§4, adapted for a docs diff) — (A) reality audit vs
  git/gh/disk/source = ZERO defects (every PR↔session↔THING mapping, count, technical claim confirmed); (B)
  completeness/drift = 1 finding FIXED (the solveND sweep command+output was prose-only → added a verbatim
  "ADR-0008 scope sweep" section, Deliverable 5) + flagged header-flip/log-entry which THIS bookkeeping commit
  lands; (C) protocol compliance = COMPLIANT on all 6 checks (no gate lowered — docs-only diff touches zero
  tests/engine/pipeline; §8 plan correct; stretch SKIP recorded, no partial THING; no Phase-4 work; no
  encoding churn, UTF-8 no BOM, Θ/σ/√/→/× intact; branch `docs/phase3-close`, PR title per §6).
- Golden: N/A (no THING shipped).
- Citations pinned: N/A (docs session). The report's per-session PR links + THING numbers were fact-checked
  against `gh pr list --state merged` and `git log` (S15=#32/T31 propped-cantilever, S16=#34/T32-33 fixed-fixed
  family, S17=#36/T34 composite-bar, S18=#37/T35 thermal-assembly, S19=#38/T36 bolted-joint-gasket — all
  correct; #33 = S15 brief erratum, #35 = shaft-CSS hotfix).
- Deviations from brief: (1) Stretch THING three-parallel-rods NOT built (pre-authorized optional; both
  outcomes compliant) — rationale in the report's SKIPPED + gate-compliance sections. (2) README gained a
  one-sentence solveLinear addition beyond Deliverable 3's literal "count/catalog sentence" — reconciles the
  public trust story to the flagship Phase 3 capability (already on /verification/), i.e. Phase-3
  reconciliation, not out-of-scope drift; noted here per the out-of-scope clause. Everything else per brief.
- New capabilities future briefs may rely on: none (docs). Phase 3 is CLOSED and AWAITING OWNER.
- Notes-for-next (owner / next session): (a) the queue header reads `Active phase: 3 — AWAITING OWNER`; the
  OWNER — never a session — rules Phase 4 by writing the literal `Phase 4 approved — JD <date>` line AND
  flipping the header to `Active phase: 4` in the SAME edit (runbook 2e). A session that finds a ruling line
  but an unflipped header STOPS and reports (§8). (b) `reports/phase-3.md` "Decisions needed" has THREE items:
  rule on Phase 4 (recommend APPROVE — S21–S25 verified, entry criteria hold), the per-slot default-material
  schema field (flagged by S17 AND S18 — multi-material THINGs LAND on al+al not steel+al; cosmetic-but-real,
  safe to defer, needs an approved additive field, buildable only after sign-off §9.2), and the optional motor
  THING (surfaces when S25 runs). (c) all five Phase 4 briefs are verified against merged reality; S25 carries
  the S20-pinned example-3 wire `planetary-gearset.T_out → fixed-fixed-torsion-shaft.T` (both torque). (d) once
  ruled, S21 (chain-eval engine extraction — headless, no UI change) is the topmost Phase 4 row.

## P4L — Phase 4 launch: ruling recorded + Phase-3 QC audit + portal-design rulings (owner-directed) — 2026-07-06 — PR #40 — MERGED
- Shipped (docs only, no build inputs touched): the Phase 4 ruling recorded per runbook 2e on owner
  in-session instruction (header → `Active phase: 4`; literal ruling line; Phase-3 precedent) + THREE new
  owner rulings R7/R8/R9 (per-slot `default_material` approved; portal design track approved as ADR-0010;
  QC2 row added) + `reports/phase-3-qc-audit.md` + `decisions/ADR-0010-portal-ia.md` (ACCEPTED) + briefs
  QC2/D1/D2 + roadmap Phase-4 rewrite (two tracks) + CLAUDE.md reconciliation. Phase 4 queue order is now
  QC2 → S21 → D1 → D2 → S22 → S23 → S24 → S25; S25 remains the closing row; S21–S25 briefs untouched.
- QC audit (read-only, ran in plan mode — Track A cold re-run deferred to QC2): 40 agents — 12 dimension
  auditors (per-THING physics re-derived from first principles; solveLinear verifier; slots; CTE/Θ kinds;
  provenance; refusals; tests; docs) × 3-refuter adversarial panels × completeness critic. HEADLINE: zero
  wrong emitted numbers (Phase 2's QC0 result repeated). 4 confirmed findings → QC2: (1) major, latent
  compile.py seam — a target authored in BOTH solve_linear and solutions silently overwrites the certified
  form (no shipped THING does); (2) major, landing-state (default-material init) has zero e2e coverage —
  subsumed by R7 work; (3) major, authoring-things.md never teaches the S17 slot binds form; (4) minor,
  stale `solve_hint` reference. Hardening notes: fingerprint glob brittleness, Θ display round-trip test,
  slots×scoped-refusal untested interaction.
- METHODOLOGY LESSON (binding on future audits, recorded in the report): the panels CONFIRMED 2-to-1 two
  false "criticals" claiming the beam slenderness warns (`L > 10*h`) are inverted — they are not; validity
  conditions are VALID-WHILE regions (`site/src/engines/relation.ts:122` pushes the message when the
  predicate is FALSE; pages render "Valid while:"). The coordinating session's engine-read overturned both
  pre-report. Future envelope audits must pin the valid-while semantics in the auditor prompt.
- Owner decisions taken in-session (recorded as rulings/ADR, closing phase-3.md's "Decisions needed" items
  1–2): Phase 4 APPROVED; design track EARLY in Phase 4 (D1/D2 before S22, so the chain-builder ships into
  the final shell); catalog IA = course-spine categories (`category` enum + optional `topic`; full 36-THING
  mapping in ADR-0010 — 22 MoM / 10 MD / 4 Mechanisms-Dynamics; no 1-item `statics` section, enum grows
  additively); visual identity = restrained polish (no webfonts/frameworks); R7 default_material approved
  now (rides QC2). Item 3 (motor THING) stays open until S25, unchanged.
- Gates: docs-only PR — CI green; S21's entry-criteria greps verified passing post-merge
  (`rg -n "Phase 4 approved — JD" docs/sessions/queue.md`; header flipped in the same edit; no
  IN_PROGRESS/PAUSED rows). No thing.yaml/pipeline/site-source change → no fingerprint change, no
  site-content delta on deploy.
- New capabilities future briefs may rely on: none yet — R7 field (QC2) and category/topic fields (D1) are
  signed but unbuilt; §9.2 satisfied by R7/R8 + ADR-0010 when those sessions run.
- Notes-for-next (QC2 is the topmost QUEUED row): (a) the findings brief is the audit report — read it plus
  `briefs/QC2-phase3-qc-fixes.md` (R7 spec + execution notes); (b) re-verify finding file/lines against
  HEAD before editing (rule 6 applies to audit reports too); (c) do NOT "fix" the refuted envelope
  criticals; (d) QC2's cold build IS Track A — run it once, append counts to the report's Dispositions;
  (e) D1 expects catalog = 36 — if QC2 or anything grows it, extend the ADR-0010 mapping first.

## QC2 — Phase-3 QC fixes + per-slot default_material (R7) — 2026-07-07 — PR #41 — MERGED
- Shipped: the four confirmed Phase-3 QC-audit findings + the R7 `default_material` field. (1)
  compile-time rejection of a solve_linear/solutions target collision (BuildError naming
  thing/config/target — closes the verify.py:198 dict last-wins seam); (2) R7 additive
  `materials.defaults` (schema → compile passthrough → cache-independent `validate_default_materials`
  → `ThingWidget` landing) — composite-bar lands steel-a36 core + al-6061-t6 sleeve, thermal-assembly
  lands steel-a36 left + al-6061-t6 right; (3) authoring-things.md "Material slots and landing
  materials" section; (4) solve_hint→solve1d/solve_linear doc fix. Hardening: fingerprint
  glob→rglob, Θ round-trip unit test, slots×scoped-refusal doc note. Catalog UNCHANGED (36 → 36); no
  emitted number changed (audit headline holds).
- Gates: pytest 360 passed (was 354; +5 test_default_materials, +1 collision); pnpm build clean —
  Track A COLD (rm -rf generated/things) 3m20s, parity 1485/36, units 884, 43 pages; unit 22 (+3 Θ
  round-trip); e2e 108 (+2 landing) incl. axe 0 serious/critical; visual pass (built dist, /Mechanic/):
  both THINGs LAND on ASTM A36 steel + 6061-T6 aluminium (browser values f_1=0.66135, σ_1=118.84),
  composite P→max fires the CORE-yielded warn (SF_1=0.15), console clean; review: 6 fresh-context
  passes (3 angle + 3 /code-review high) — ZERO critical/major/real findings; 2 cleanup nits fixed by
  comment, 1 rebutted.
- Golden: composite f_1 = (4·199.948)/(4·199.948+6·68.258) = 0.6613 (A·E load share); thermal
  σ_1 = F/A_1 = 47.53 kN / 4 cm² = 118.84 MPa. Both in e2e comments and reproduced live.
- Citations pinned: N/A — no new citation/material/relation. R7 only names existing material ids the
  e2e already selects (steel-a36, al-6061-t6), validated to EXIST + QUALIFY against data/materials/.
- Deviations from brief: (1) the exit criterion `rg -n "solve_hint" docs/` reads literally as "returns
  nothing", but the QC2 brief, the audit report, and this log necessarily contain the word (they
  DOCUMENT the finding — append-only history, not rewritten to satisfy a grep) — the criterion is
  satisfied for the finding's actual target, authoring-things.md. (2) Added cross-reference comments in
  [slug].astro / chain-demo.astro / ChainDemo.tsx beyond the brief's named files, per a self-review
  finding (comment-only; ties the three qualification-predicate copies to the R7 build gate + notes
  ChainDemo doesn't yet honor defaults). Everything else per brief.
- New capabilities future briefs may rely on: the R7 `materials.defaults` field is LIVE — a THING may
  name each slot's landing material (compile-validated to exist + qualify; else a loud BuildError).
  Slots×scoped-refusal remains untested (documented — first THING to combine them adds the e2e).
- Notes-for-next (S21 is the topmost QUEUED row): (a) `validate_default_materials` is cache-INDEPENDENT
  (runs before the per-THING cache loop) — a data/materials edit that de-qualifies a landing id is
  caught even on a warm build; the material seed is deliberately NOT in the build fingerprint (artifact
  bytes don't depend on materials). (b) the R7 qualification predicate now lives in THREE places
  (things/[slug].astro `hasKeys`, chain-demo.astro, pipeline `material_property_coverage`) —
  cross-referenced in comments; keep them in step or a build gate looser than the UI filter could land
  a THING on a material its dropdown hides. (c) ChainDemo does NOT yet honor `material_defaults` (inert
  — no chained THING declares defaults; S21+ chain-builder work, noted inline). (d) landing e2e pins
  use NO selectOption + assert the select value + a readout — copy that pattern. (e) any pipeline edit
  re-fingerprints everything → cold build ~3.5 min; the QC2 cold build doubled as Track A (don't run it
  twice). (f) catalog still 36 — D1 mapping unaffected.

## S21 — chain-eval engine extraction + refusal/provenance propagation — 2026-07-07 — PR #42 — MERGED
- Shipped: `site/src/engines/chain-eval.ts` — the one place chain orchestration lives. `evaluateChain(nodes,
  bindings)` builds the real `ChainGraph` (type-check + forward order), evaluates each node with ONE
  `RelationEngine` per INSTANCE, propagates refusals per the brief's decided rule table (a/b/c/d), and returns
  per-node eval records (`status: evaluated | refused-by-upstream | incomplete`) + per-binding provenance.
  `ChainDemo.tsx` refactored to a thin consumer (−39 net lines; `ports()` moved into the engine, `planTargets`
  exported from it). Closes the invariant-5 gap: a refused upstream output — FINITE values included — is now
  withheld, never forwarded. Catalog unchanged (36). No emitted number changed (demo goldens byte-identical).
- Gates: unit 22 → 37 (+15 chain-eval, all in `tests/chain-eval.test.mjs`); pnpm build clean (WARM — only site
  TS touched, no fingerprint bust; 43 pages, parity/katex/mdx/units green), exit 0; e2e 108 passed (incl. axe;
  `chain-demo.spec.ts` byte-identical to main — the regression net); tsc clean on both files (only the
  pre-existing playwright.config `process` error remains); visual pass (built dist, /Mechanic/chain-demo/):
  ready=true, T_out=350 / τ=27.852 MPa / P=1 kW at defaults, T_s=200→700, T_s=500+d=20mm → shear-yield WARN
  banner renders (Greek σ_y + em-dash intact), steel-4340 vs al-2024-t3 → τ material-blind (1114.1) while SF/θ
  move and T_out unchanged, console clean; review: 5 fresh-context passes (3 angle + 2 code-review finders) +
  /code-review high — findings below, all fixed or dispositioned; **two mutations the code/tests reviewer
  found were fixed AND the fix verified by re-injecting each mutation and watching the new test fail.**
- Golden: N/A (engine session — per-THING gate items 2–4 do not apply, protocol §3). Regression net is the
  hand-derived demo goldens (T_out=350, τ=27.852, P=1 kW; T_s=200→700, τ=55.704), all green unmodified.
- Citations pinned: N/A (no new citation/material/relation).
- Deviations from brief: (1) Added two robustness features BEYOND the literal deliverables, both inside the
  granted module and review-driven: a FAN-IN guard (two wires into one input → fail loud, was silent last-wins
  with misreported provenance) and WIRE-OWNED bound ports (a withheld/incomplete binding deletes its target
  port from the eval env so a stale knob default can't silently satisfy a driven input). (2) Provenance is
  NODE-level (per binding: all cited relations of the upstream THINGs, transitive, deduped), not per-step —
  plain eval steps carry no per-step relation linkage in the artifact and inventing one is forbidden (brief:
  "do not invent a parallel metadata path"); solve1d/solveLinear steps DO carry links (residual_fn /
  via.solve_linear) for a future S24 refinement. (3) `constantValues` (role:constant) are injected into each
  node eval (matching ThingWidget) — additive vs the original demo, no-op for the two demo THINGs (neither
  declares a constant). Everything else per brief.
- New capabilities future briefs may rely on: `evaluateChain` + exported types (`ChainNodeSpec`,
  `NodeEvalRecord`, `ProvenanceRecord`, `ChainEvalResult`, `NodeStatus`, `UpstreamRelation`) and `planTargets`,
  `classifyBoundInput`. The refusal-propagation rule table is LIVE. S22 (chain-builder) and S24 (provenance
  rendering) are the intended consumers.
- Notes-for-next (immediate next QUEUED row is **D1 — Portal IA**, a design session that does NOT touch
  chaining; the notes below are the engine handoff for **S22**, the real consumer): (a) `evaluateChain(nodes,
  bindings)` builds the ChainGraph itself and THROWS on illegal/cyclic/**fan-in** wiring — it does NOT yet
  tolerate a binding to a node absent from `nodes` (that also throws, via connect "unknown node"). So S22 either
  passes only complete chains, or extends evaluateChain to tolerate absent sources → `incomplete`. (b) `knobs`
  = a node's UNBOUND input values ONLY; bound ports are owned by the wire (a knob for a bound port is deleted
  when the wire is withheld). (c) Material resolution stays in the UI (`pickProperty` → `materialValues`
  VarRecord); the engine is HEADLESS — keep it that way (a build-check greps `components/|preact`). (d) A
  refused node is FORCED `result.invalid=true` (so Readouts/sims blank it) — `status` and `result.invalid` are
  separate signals; read status for UI copy, invalid for value-trust. (e) `incomplete` is effectively
  unreachable end-to-end with the CURRENT RelationEngine (an undefined output only arises from a global-invalid
  node → rule a), so its logic is unit-pinned via `classifyBoundInput`; it becomes reachable only when S22 adds
  partial-graph support. (f) TRAP — the NUL-byte bite: I accidentally wrote a raw NUL (U+0000) as a
  template-literal separator (`\`${a}<NUL>${b}\``); `file <f>` then reports "data", ripgrep/Grep treat the file
  as binary, and it commits as a git-binary blob. SWEEP every new engine file:
  `python -c "print(open(F,'rb').read().count(b'\x00'))"`. Fix with the Edit tool or Git-Bash `tr -d '\000'`
  (UTF-8-safe; only 0x00, never a valid UTF-8 continuation byte) — NEVER PowerShell. (g) TRAP — a review
  subagent that runs `git checkout <file>` to "restore after mutation testing" will CLOBBER your uncommitted
  working-tree fixes on that file; commit fixes before spawning cleanup-prone reviewers, or instruct them
  read-only. (h) PRE-EXISTING latent gap (NOT fixed here, out of scope): config-level `predicate` guards are
  never checked in `relation.ts` (dead `:false` branch + a comment promising a post-eval pass that doesn't
  exist). Confirmed dormant — `auto_guards` only emits `nonzero`/`nonneg`; `predicate` is exclusively
  relation-`validity` (which IS checked). A future THING that expresses a whole-node refusal must use relation
  validity, not a config guard — or add a build assert. Worth an owner ticket.

## CGK — config-guard kind enforcement (owner-directed, from S21 review note-h) — 2026-07-07 — PR #43 — MERGED
- Shipped: resolves the pre-existing latent gap S21 flagged (log note-h above): a config-level guard of a kind
  other than `nonzero`/`nonneg` was silently ignored by `relation.ts` (dead `:false` branch + a comment about a
  post-eval pass that never existed), so a config `predicate` guard with `severity:invalid` would never fire —
  an unchecked refusal could ship (invariant-5 hole the S21 chain-eval propagation leans on). Fixed on BOTH
  layers: (1) `relation.ts` now THROWS on an unexpected config guard kind (never silent); (2) `compile.py`
  rejects (BuildError naming THING/config/kind) any config guard whose kind is not nonzero/nonneg. Owner-directed
  (task chip spun from the S21 review) — not a queue row; no THING/catalog change (stays 36).
- Gates: pytest 360 → 362 (+2 test_config_guards: baseline-compiles + predicate-rejected-via-monkeypatch);
  unit 37 → 38 (+1 engine.test.mjs: config predicate guard throws); pnpm build clean COLD (compile.py edit busts
  fingerprints; 43 pages, all gates); e2e 108 passed (no THING behavior change); tsc clean; **both new tests
  mutation-verified** (revert the throw → engine test fails; remove the assert → pipeline test fails; each
  restored green). Review: 1 fresh-context adversarial subagent → APPROVE, zero blocking findings (independently
  re-ran both mutations; traced the guard list to exactly two nonzero/nonneg append paths → zero regression /
  false-positive risk). No browser visual pass needed — the change is not observable in the preview (jq confirms
  all 268 built config guards are nonzero(260)/nonneg(8), zero predicate; every THING evaluates identically).
- Golden: N/A. Citations pinned: N/A. Deviations from brief: N/A (owner-directed, no brief).
- New capabilities future briefs may rely on: config-level guards are now machine-guaranteed nonzero/nonneg
  (build-asserted AND runtime-fail-loud). A whole-node refusal MUST be expressed as a relation `validity`
  envelope (predicate, checked), never a config guard — the build now enforces this, closing S21 note-h.
- Notes-for-next: next QUEUED row is unchanged — **D1 (Portal IA)**. This fix touched only relation.ts +
  compile.py + two tests; it does not affect D1. The monkeypatch pattern in `test_config_guards.py`
  (`monkeypatch.setattr(compile_mod, "auto_guards", ...)`) is the way to test a compiler-internal invariant that
  has no authoring path — reuse it if you need to prove "the compiler can't emit X."

## D1 — Portal IA: course-spine taxonomy + structured home/catalog + Pagefind search — 2026-07-07 — PR #44 — MERGED
- Shipped: the flat unordered home grid → a course-spine catalog (hero + build-proof stats + Pagefind
  search + 36 THINGs grouped by category/topic in ADR-0010 spine order); `/things/` renders the same
  shared `CatalogSections.astro` (no drift). New authored fields `category` (required Zod enum) + `topic`
  (optional) in content.config.ts + all 36 thing.yaml. `Search.astro` (Pagefind Default UI, PROD-gated,
  catalog pages only). `lib/stats.ts` (shared build-proof totals for the hero AND /verification/).
  Catalog unchanged at 36 THINGs — a design/IA session, no THING added.
- Gates: pytest 362 (unchanged, pipeline untouched); pnpm build clean COLD (36 yaml re-fingerprint → full
  pipeline pass ~3.5 min, then warm rebuilds seconds) — 43 pages, katex/mdx/parity/units + pagefind green;
  unit 38 (unchanged); e2e 108 → 113 (+5: catalog spine-order ×2 surfaces, search returns a THING,
  no-search-script-on-THING-pages, axe /things/) — ALL prior specs unmodified & green; visual pass (built
  dist, /Mechanic/): 3 category sections in spine order w/ distinct accents+icons, 36 cards, hero stats
  36/288/136/186 == /verification/, live search "planetary" → planetary-gearset #1, dark + mobile (375px,
  zero h-overflow) clean, console clean; review: 6 fresh-context agents (3 angle + 3 code-review finders)
  — zero correctness bugs / zero invariant weakenings; 10 findings fixed, 5 rebutted/deferred (PR #44).
- Golden: N/A — no emitted numbers (IA/design session; per-THING gate items 2–4 N/A per protocol §3). The
  regression net is the full 113-spec e2e + the honesty gate proven loud locally (remove a category line →
  Zod build error; unknown topic / topic-on-topicless-category / empty topic → CatalogSections build error).
- Citations pinned: N/A — no new citation/material/relation.
- Deviations from brief: (1) PATH CORRECTION — Pagefind 1.5.2 emits its UI to `dist/pagefind/`, NOT
  `dist/_pagefind/` as the brief entry-criterion + ADR-0010 §3 assumed (underscore dropped at Pagefind 1.0
  so the dir survives Jekyll/GitHub-Pages). Verified locally AND live (/Mechanic/pagefind/pagefind-ui.js
  serves the real lib). Search.astro uses the real path; ADR-0010 §3 carries a dated implementation note.
  NOT a BLOCK — the criterion's intent (Pagefind emits a usable UI) is satisfied. (2) Fixed a pre-existing
  mobile nav overflow (≤375px) via global.css flex-wrap — in scope for the D1 restrained-polish track,
  spotted in the visual/adversarial pass. (3) Restored the home→/materials/ link (the ADR hero spec listed
  only stats+chain; a reviewer flagged the dropped Ashby entry point — invariant 3 showcase). Else per brief.
- New capabilities future briefs may rely on: authored `category`/`topic` taxonomy is LIVE (required enum
  + optional slug, validated in CatalogSections.astro; unknown/empty → loud build error);
  `CatalogSections.astro` is the shared catalog (single owner of display names + spine order) — D2 renders
  or extends it; `lib/stats.ts` `catalogTotals(compiled)` is the one source for build-proof numbers;
  Pagefind Default UI wiring (PROD-gated, `pagefind/` path, JS aria-label fix) is reusable.
- Notes-for-next (immediate next QUEUED row = D2, THING-page wayfinding): (a) PAGEFIND INDEX NOISE (owner
  decision pending) — all four broad reviewers flagged that the catalog listing pages (home, /things/, and
  secondarily /verification/ /chain-demo/) are Pagefind-indexed, so search returns them as low-ranked noise
  (the THING page always ranks #1 — clutter, not wrong answers). D1 did NOT fix it because the brief says
  "do not change indexing scope in this session." Recommended fix (repo's own pattern): add
  `data-pagefind-ignore` to the `<div class="catalog">` in CatalogSections.astro (THING pages stay indexed)
  + an e2e that a THING search omits the listing pages. Spawned as a task chip. (b) the `pagefind/` (no
  underscore) path is the real one — do NOT reintroduce `_pagefind`. (c) category/topic slugs + display
  names live ONLY in CatalogSections.astro `CATEGORIES[]`; a new topic with zero THINGs now fails the build
  (empty-topic assertion) — assign ≥1 THING when you add a topic. (d) hero + /verification/ stats share
  lib/stats.ts — change the arithmetic once, both follow. (e) e2e catalog pins run against the BUILT dist
  (Pagefind assets exist only post-build); `SPINE_ORDER` in catalog.spec.ts is the alphabetical-within-topic
  order — update it if a THING title changes. (f) axe now covers / and /things/; the Pagefind input needs
  its JS-injected aria-label (Search.astro) or axe label-title-only fails. (g) catalog still 36 — no
  CLAUDE.md/README count change this session.

## PFN — exclude catalog listings from Pagefind index (owner-directed, D1 follow-up) — 2026-07-07 — PR #45 — MERGED
- Shipped: `data-pagefind-ignore` on the `<div class="catalog">` root in CatalogSections.astro, so the
  36-THING catalog LISTING is no longer indexed a 2nd/3rd time on the home + /things/ aggregator pages.
  Closes the D1 search-quality finding all four D1 review agents flagged (search returned Home / "The
  catalog" as noise for almost any THING term). THING pages keep their own data-pagefind-body → every
  THING stays findable; the home hero + /things/ intro (outside .catalog) stay indexed. Owner-directed
  (task chip from the D1 review) — not a queue row. Catalog unchanged (36).
- Gates: pytest 362 (unchanged, pipeline untouched); pnpm build clean WARM (only CatalogSections.astro +
  catalog.spec.ts touched, no fingerprint bust); unit 38 (unchanged); e2e 113 (the search spec EXTENDED
  to assert results include a THING AND exclude `/` and `/things/`, with a results>0 guard on the
  selector — passes); behavioral pass (built dist): search "beam" → 5 beam THING pages with home/things
  ABSENT (were present before the fix), "planetary" → planetary-gearset present + listings absent
  (e2e-pinned); rendering unchanged (36 cards, spine order, axe /+/things/ green). Review: single
  documented self-review (3 angles) — zero findings; the diff is one indexing attribute (repo's own
  pattern) + one assertion, behaviorally verified with two terms, and CatalogSections was already
  6-agent-reviewed in D1.
- Golden: N/A. Citations pinned: N/A.
- Deviations from brief: N/A — owner-directed, no brief. The D1 brief's "do not change indexing scope"
  no longer binds (owner explicitly directed this change via the task chip).
- New capabilities future briefs may rely on: catalog listing pages are excluded from the search index;
  a THING-term search returns THING pages, not the aggregators. /verification/ + /chain-demo/ still index
  their own content (they legitimately discuss THINGs) so they can still appear — that's content, not
  listing noise.
- Notes-for-next: next QUEUED row is unchanged — **D2 (THING-page wayfinding)**. This closes D1
  Notes-for-next item (a). The `.pagefind-ui__result-link` selector is Pagefind Default UI's result
  anchor — reuse it for any future search assertion.

## D2 — THING-page wayfinding + cross-linking + visual polish — 2026-07-07 — PR #46 — MERGED
- Shipped: every THING page now carries build-time static wayfinding (ADR-0010 §4) — a per-THING
  **verification badge** (own audit counts → `/verification/#<slug>`), a **related-THINGs** row (topic →
  category → shared-facet, category-accented cards), a **"chains with"** block (legal output→input wires
  computed by the engine's own `connectionLegal`, grouped by target THING, capped at 8 with an honest
  "+k more"), **prev/next** spine navigation, and static **material chips** → `/materials/` rows. Additive
  anchors: `id={slug}` on `/verification/` blocks, `id={id}` on `/materials/` rows. New libs
  `lib/catalog.ts` (spine taxonomy + ordering, now the SINGLE owner) and `lib/wayfinding.ts`
  (related/chains/neighbors, memoised once/build). No THING added — catalog stays 36; no new island, no
  client JS, no pipeline change, no new dependency.
- Gates: pytest N/A (pipeline untouched); unit 38 (unchanged — engines only gained an exported `portOf`);
  pnpm build clean WARM (~10 s, no yaml re-fingerprint; 43 pages, katex/mdx/parity/units + pagefind green);
  e2e 113 → **120** (+7 `wayfinding.spec.ts`; all pre-existing specs byte-identical to main) — the honesty
  pin is the quantity-KIND discriminator (ball-bearing-life `x_R→euler-column.K` ratio→ratio present vs
  `L10→euler-column.K` count→ratio, IDENTICAL zero dimension, absent; `L10→spur-gear-pair.N_p` count→count
  present); visual pass (built dist, `/Mechanic/`): badge → verification block, related row, chains-with
  chips + "+7 more" on planetary, prev/next across the MoM→MD boundary (pressure-vessel ↔ belt-drive),
  material chips resolve, dark+light+mobile 375px zero h-overflow, console clean; review: **6 fresh-context
  passes** (3 angle + 3 code-review finders) — ZERO product correctness bugs; 1 MAJOR test-honesty issue
  fixed + consensus cleanups applied, 2 findings rebutted.
- Golden: N/A — design/feature session, no emitted numbers (per-THING gate items 2–4 N/A, protocol §3).
  Regression net is the 120-spec e2e.
- Citations pinned: N/A — no new citation/material/relation.
- Deviations from brief: (1) Fixed a **pre-existing** mobile `.config-select` horizontal overflow (≤40rem)
  via a CSS-only media query (mirrors the existing `.material-picker` cap) — spotted in the §5 visual pass,
  in scope for ADR-0010 §5's polish track, and directly D1-precedented (D1 fixed a pre-existing mobile nav
  overflow the same way). No D2 element overflowed. (2) Added `data-pagefind-ignore` to the wayfinding
  cross-reference blocks (related/chains/prev-next) AND the badge — they repeat OTHER THINGs' titles /
  identical boilerplate, which would reintroduce the listing-noise PFN removed; the THING page stays indexed
  for its own content. Everything else per brief.
- New capabilities future briefs may rely on: `lib/wayfinding.ts` `buildWayfinding(things, compiled)` (memoised
  related/chains/neighbors maps) — S22/S24 can reuse the "chains with" computation; `lib/catalog.ts`
  `spineGroups`/`spineOrdered`/`categoryBySlug`/`accentVarFor` (the ONE spine-order owner — import, never
  re-declare); `lib/stats.ts` `thingAudit`/`isModeling`/`isIdentity` (the per-THING audit + step-kind
  predicates, shared with `/verification/`); `chain-eval.ts` `portOf(artifact, sym)` (the shared Port
  constructor). `/verification/#<slug>` and `/materials/#<id>` are now stable deep-link anchors.
- Notes-for-next (next QUEUED row = **S22, /chain-builder/ MVP**): (a) "Chains with" is the intended
  discovery surface for S22 — it lists, per THING, the legal target THINGs + exact `fromPort→toPort` pairs
  (`data-wire="from|toThing|toPort"` attributes on the built pages); it is THING-granularity (union of ports
  over ALL configs), so a listed pair is legal in SOME config pairing, not necessarily simultaneously — S22's
  real chain instantiates one config per node. (b) The "chains with" links are plain `/things/<slug>/` in v1;
  the ADR-0010 §4 upgrade to PREFILLED chain-builder URLs is a cheap post-S23 follow-up (decided at S25 or
  post-phase) — wire it once S23's URL encoding exists. (c) `buildWayfinding`'s memo is a build-singleton
  keyed on NOTHING (assumes the whole-catalog contract); fine for `astro build`, but any new caller passing a
  subset gets the full-catalog result, and `astro dev` won't invalidate it on a content edit (dev-only). (d)
  RELATED_CAP=6: the largest topic (beams-plates, 7 THINGs) has exactly 6 same-topic siblings, so tier-1 is
  never truncated TODAY — if a topic grows past 7, revisit whether to disclose the related cap like chains
  does. (e) DISPLAY_CAP=8 chain targets, spine-ordered; the planetary e2e assumes torsion-shaft stays within
  the cap (~3rd) — adding earlier-spine torque/speed-input THINGs could push it out. (f) catalog still 36 — no
  CLAUDE.md/README count change.
