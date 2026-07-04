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
