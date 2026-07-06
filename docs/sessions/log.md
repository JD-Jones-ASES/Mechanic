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
