# Phase 3 report — 2026-07-06

**Audience: JD, ~10 minutes.** Phase 3 = solver depth, executed by the autonomous session system
(S15–S20). This report is written against merged reality (queue.md DONE rows + merged PR titles +
the diffs), not restated intentions.

## Summary

Phase 3 gave the factory its first way to solve **coupled systems with no evaluation order** —
statically indeterminate structures — without ever blind-solving. The owner-approved split scope
(ADR-0008, 2026-07-04) shipped exactly its principled half: **`solveLinear`** (prove the system is
affine in its unknowns, solve it exactly by Gaussian elimination at build time, desugar the closed
forms through the existing verification path) landed in S15, and **`solveND`** (nonlinear cyclic
solving) remained PROPOSED and unbuilt, as ruled. Five sessions then consumed the capability across
its range — a 3×3 reference case, a 4×4, two cancelling-determinant families, the first
material-*dependent* (non-cancelling) solve, the first thermal-Θ solve, and a global-refusal
separation case — growing the catalog **30 → 36** and adding two cross-cutting capabilities along
the way (multi-material binding slots; the coefficient-of-thermal-expansion material column with
the first nonzero temperature dimension). **No merge lowered a gate.** Every emitted number traces
to a machine-checked solve or an independent first-principles cross-check; the one brief with a
transcription error (S15's deflection-max location) was caught by independent re-derivation and
corrected in a dated erratum PR before it could mislead anyone.

Phase-opening context (not counted as Phase 3 sessions): PR #29 wrote the Phase 3 ruling line; PRs
#30–#31 were the owner-directed Phase-2 QC audit + fixes (reported separately in
`reports/phase-2-qc-audit.md`).

## Sessions

| ID  | Shipped | PR | Key deviation (full detail in log.md) |
|-----|---------|----|----|
| S15 | `solve_linear` capability (ADR-0008 part a) + THING 31 propped-cantilever | [#32](https://github.com/JD-Jones-ASES/Mechanic/pull/32) ([#33](https://github.com/JD-Jones-ASES/Mechanic/pull/33) = brief erratum) | compatibility authored EI-cancelled (forward-DAG rule); **brief's deflection-max location was wrong → corrected** |
| S16 | THING 32 fixed-fixed-beam (4×4) + THING 33 fixed-fixed-torsion-shaft (2×2) | [#34](https://github.com/JD-Jones-ASES/Mechanic/pull/34) ([#35](https://github.com/JD-Jones-ASES/Mechanic/pull/35) = CSS hotfix) | no symmetry-fallback needed (4×4 op count 19 ≪ cap 200) |
| S17 | multi-material binding **slots** + THING 34 composite-bar (first non-cancelling det) | [#36](https://github.com/JD-Jones-ASES/Mechanic/pull/36) | landing default al+al not steel+al (no per-slot default-material field — ⚠️ owner) |
| S18 | **CTE material column** + `temperature_difference`/`thermal_expansion_coefficient` kinds + THING 35 thermal-assembly | [#37](https://github.com/JD-Jones-ASES/Mechanic/pull/37) | CTE primary = ASM Desk-Ed not MIL-HDBK-5J (which gives a curve, not a scalar); no SF readout (signed stress) |
| S19 | THING 36 bolted-joint-gasket (2×2; separation = GLOBAL refusal) | [#38](https://github.com/JD-Jones-ASES/Mechanic/pull/38) | hand-derived golden (no web-pinnable Shigley example); no material axis by design |
| S20 | Phase 3 close — this report + reconciliation + Phase 4 brief verification | [#39](https://github.com/JD-Jones-ASES/Mechanic/pull/39) | optional stretch THING three-parallel-rods **not taken** (closure budget; pre-authorized) |

## Catalog: 30 → 36 THINGs. Capabilities added (plain language)

1. **`solveLinear` — certified exact solving of coupled linear systems.** A configuration may
   declare a `solve_linear` group (a SET of coupled unknowns + the relations that pin them). The
   build proves the system is *affine* in its unknowns (every second derivative w.r.t. a pair of
   unknowns vanishes; coefficients are unknown-free), solves it exactly by Gaussian elimination
   (`sp.linsolve` — never blind `solve()`), checks the determinant non-zero at every 50-digit
   verification sample, and **desugars** the solved forms into ordinary `eval` steps that flow
   through the *existing* total-back-substitution + manifold-DOF + parity-oracle path. **Zero new
   runtime engine** — the determinant ships as an ordinary `nonzero` refusal guard. This is the
   principled half of ADR-0008; the nonlinear `solveND` half stays reserved and unbuilt.
2. **Six statically-indeterminate / coupled THINGs**, spanning the capability's range:
   propped-cantilever (3×3, the reference), fixed-fixed-beam (4×4), fixed-fixed-torsion-shaft
   (2×2), composite-bar (2×2, first **material-dependent** solve — the determinant does *not*
   cancel, so the load share migrates when you swap a material), thermal-assembly (2×2 thermal
   solve), bolted-joint-gasket (2×2 with a global separation refusal).
3. **Multi-material binding slots** (S17) — one THING binds two *independent* materials through
   named slots, each its own labelled `<select>`. A flat `binds` map normalizes to a lone
   `default` slot in one place, so every previously shipped THING is byte-identical. This is the
   invariant-3 "denser/stiffer member changes the answer" moment made literal.
4. **The coefficient-of-thermal-expansion material column + the first nonzero Θ (temperature)
   dimension** (S18) — two new quantity kinds (`temperature_difference` [Θ],
   `thermal_expansion_coefficient` [Θ⁻¹]), display units `K` and `1e-6/K`, and `degF_interval`/`um`
   dimension tokens. α·ΔT reuses the existing `strain` kind. Ten metals gained a CTE value, each
   personally web-fetched from its published source.
5. **New display units** — `GN/m`, `MN/m`, `mm²` (bolted-joint stiffnesses run ~1e9 N/m; routine
   data covered by `check-units`, not a capability).

## ADR-0008 scope sweep — `solveND` still unbuilt (Deliverable 5)

ADR-0008 shipped its **split scope** exactly: part (a) `solveLinear` is built and consumed by six
THINGs; part (b) nonlinear `solveND` remains PROPOSED and unbuilt. Verified this session against the
source tree — the literal command and its complete output:

```
$ rg -i "solvend" pipeline/ site/src
site/src/content.config.ts:// closed forms (compile.py certify_linear_group). `solveND` stays reserved.
$ echo $?
0
```

The single hit is a **schema comment** noting the reserved name — no implementation, no runtime
solver, no plan-step handler. (For contrast, `rg -l "solve_linear:" site/src/content/things` →
**6** consumers, the shipped half.) ADR-0008's own status line reads `ACCEPTED (split scope)` with
part (b) "`solveND` remains PROPOSED and unbuilt"; `docs/architecture.md` carries no `solveND`
implementation either. Part (b) stays out of scope until a THING demands it and the owner signs a
dedicated ADR (the basin-certification question answered first) — unchanged from the 2026-07-04
ruling.

## Gate compliance

Every merged Phase-3 PR passed the full gate: machine verification (`pnpm build`: pipeline gen →
katex/mdx/parity/units → astro → pagefind) + an independent first-principles physics cross-check in
`pipeline/tests/` + a hand-checkable numeric golden + citations recorded in `sources[].verification`
+ engine unit tests + e2e/axe + a browser visual pass + a multi-angle self-review (3–5 independent
fresh-context passes per session). **No gate was ever lowered, weakened, or `xfail`'d; the
planetary-gearset 2-DOF reference case was recompiled and confirmed surviving in every session's
invariants pass.** Every deviation, collected in one place:

- **S15** — (a) the compatibility relation was authored EI-*cancelled* (`w·L⁴/8 − R_B·L³/3`, not
  the brief's `…/(8EI) − …/(3EI)`) because a group coefficient may read only
  inputs/constraints/materials/earlier-groups and `I` is a downstream derived target — the EI form
  would be a forward-DAG violation. Physically identical (EI ≠ 0 divides out); the reactions'
  material-blindness becomes a *machine-checked identity step*. (b) **Brief error corrected (rule
  6):** the brief stated the deflection maximum at `x = (1+√33)L/16 ≈ 0.42L`; independent
  re-derivation gives `x = (15−√33)L/16 ≈ 0.578L` (the brief's point is on the wrong side of
  midspan and deflects *less* than midspan). The site ships the correct location; the S15 brief was
  corrected in the owner-directed erratum PR #33. (c) M_A display unit is `N*m` only (kN·m not in
  the conversion table; no new unit minted).
- **S16** — no fallback fired: the general 4×4 op count is 19 (≪ the `SIMPLIFY_OPS_CAP` of 200), so
  the full asymmetric-sign group shipped as the brief's primary intent and the pre-authorized
  symmetry reduction was *not* needed (the cap was never near, let alone raised). Shaft inputs are
  `[T, a, b, r]` (two segment lengths, L=a+b derived) and use radius `r` per the brief's explicit
  choice.
- **S17** — the landing default is al-2024-t3 core + al-6061-t6 sleeve, not the brief's literal
  "steel core + aluminum sleeve": the live per-slot default is the alphabetically-first *qualifying*
  material by slot position, and hardcoding "steel" would require a per-slot default-material schema
  field — capability creep the slots-design brief forbids (§9.2). The brief's *purpose* (distinct,
  material-driven shares at landing + the swap moment) is met, the declared file defaults *are*
  steel+al, and the e2e + visual pass select steel+al explicitly. **⚠️ Owner item** (see Decisions).
- **S18** — (a) the CTE primary source is the ASM Metals Handbook Desk Edition (via AmesWeb), not
  the brief's pre-named MIL-HDBK-5J, because MIL-HDBK-5J publishes CTE only as a temperature *curve*
  (no typeset scalar) — honest provenance over brief-transcription (rule 6); MIL-HDBK-5J rides as a
  graphical cross-check. (b) nylon-66 / wood / concrete were omitted from the CTE column
  (pre-authorized: no personally-fetchable typeset value / anisotropic / no source pre-named).
  (c) no SF readout — with signed stress (cooling → tension) a σ_y/σ margin flips sign confusingly,
  so yield is shown by a sign-agnostic warn (`σ² < σ_y²`) + the red sim. (d) the sim's
  free-expansion ghost is exaggerated ×60 (real thermal strains ~5e-4 render sub-pixel; disclosed
  in-label, with the true magnitudes in the numeric readouts).
- **S19** — (a) the golden is hand-derived (no accessible Shigley worked example was web-pinnable;
  labeled honestly in the test + verification record). (b) no material axis by design: E never
  enters (the bolt/member stiffnesses `k_b`, `k_m` are direct inputs) and the proof strength is a
  bolt-grade spec value, not a seeded material — 8 THINGs now legitimately omit materials.
  (c) display units GN/m, MN/m, mm² added (anticipated by the brief's Notes as routine).
- **S20** — the optional stretch THING `three-parallel-rods` was **not built.** Per the brief's
  decided order of operations, the go/no-go was taken after scoping the reconciliation: a full THING
  under the full gate (authoring + sim/CSS + physics test + golden + e2e + three fresh-context
  review passes + browser visual pass + a 3–4 min build cycle) is essentially a whole session's
  work, and stacking it on the non-abandonable closure would not leave the required ~20% context
  margin in one window. Both outcomes were pre-authorized; the closure was protected. (The stretch's
  physics — a 1-redundant symmetric three-rod hanger, `F_center = W·k_c/(k_c + 2k_o)` — remains a
  clean pure-`solveLinear` consumer for a future session; the appendix in the S20 brief is
  execution-ready.)

## BLOCKED / SKIPPED rows

- **None BLOCKED.** No Phase-3 session hit the BLOCKED protocol; no gate could-not-pass-honestly
  situation arose.
- **S20 stretch THING three-parallel-rods — not taken (pre-authorized skip).** This is the only
  planned-but-unshipped item; it was an *optional* stretch, abandonable by the brief's own terms,
  and the closure took priority. It is not a BLOCK and needs no owner unblock — re-queue it whenever
  a +1 statically-indeterminate THING is wanted.

## Spot-check menu (~2 min each)

1. [composite-bar](https://jd-jones-ases.github.io/Mechanic/things/composite-bar/) — set both
   members to steel (share is 40:60 by area), then **swap the sleeve to aluminium** and watch the
   load migrate to the stiffer steel core (share → 66%) while every downstream readout cascades.
   The stiff steel core, taking 2/3 of the load against a spec-minimum yield, **yields first** —
   the first material-*dependent* solveLinear (the determinant does not cancel).
2. [thermal-assembly](https://jd-jones-ases.github.io/Mechanic/things/thermal-assembly/) — the E·α
   punchline: a fully restrained **steel** bar out-stresses an **aluminium** one for the same ΔT
   *even though aluminium expands ~2× as much* (steel Eα > al Eα). Drive **ΔT → 0** and watch every
   stress collapse to exactly zero (unstressed recovery).
3. [bolted-joint-gasket](https://jd-jones-ases.github.io/Mechanic/things/bolted-joint-gasket/) —
   drive the external load **P past the separation load P₀** and watch the whole evaluation refuse
   (global SimRefusal, all readouts blank); then soften the gasket stiffness `k_m` and watch the
   joint constant C rise and the bolt get driven harder (the soft-gasket legibility moment).
- **One derivation to eyeball:**
  [propped-cantilever](https://jd-jones-ases.github.io/Mechanic/things/propped-cantilever/)'s
  derivation block — the redundant reactions come out **material-blind** because EI cancels in the
  compatibility relation, and that cancellation is a *machine-checked identity step*, not a prose
  claim. This is the solveLinear reference case.
- **/verification/ delta:** the audit-block count went **30 → 36** (six new coupled-system blocks),
  and "What the build proves" gained a **Coupled linear systems (solveLinear)** bullet — verified
  this session to match `verify.certify_linear_group` exactly (affine proof → exact Gaussian solve →
  per-sample non-zero determinant → desugar → runtime refusal guard).

## Decisions needed before Phase 4

1. **Rule on Phase 4.** *Recommendation: APPROVE.* Write the literal line `Phase 4 approved — JD
   <date>` in `queue.md` and flip the header to `Active phase: 4` in the **same edit** (runbook step
   2e). The Phase 4 design is DECIDED (roadmap "chaining as the product" + the 2026-07-04 ruling);
   all five S21–S25 briefs were verified against merged reality this session (below) and their
   entry-criteria commands still hold. Approving unblocks S21 (chain-eval engine extraction +
   refusal/provenance propagation — headless, no UI change).
2. **Per-slot default-material schema field (flagged by S17 *and* S18).** Multi-material THINGs
   currently *land* on the alphabetically-first qualifying material per slot, so composite-bar opens
   al+al (not steel+al) and thermal-assembly opens al+al (not steel+al) — the pedagogy still works
   (declared defaults are correct; the swap moment is intact; e2e/visual select explicitly), but the
   *landing* state under-sells it. A minimal additive `default_material` per slot would fix the
   landing without touching any relation. *Recommendation:* approve as a small additive schema field
   (own PR, own reasoning) whenever a literal landing state is wanted — it is genuinely cosmetic, so
   **fine to defer**; it is NOT a bug and blocks nothing. No session may build it unsigned (§9.2).
3. **Optional motor THING (surfaces in S25).** The Phase 4 spin-up headline (S25) drives the chain
   with the planetary's existing `T_s` knob and frames it honestly ("the sun-torque knob stands in
   for a motor"). A minimal linear torque–speed motor THING is named there as an *optional
   post-phase follow-up*, not built inside the UI session. *Recommendation:* decide when S25 runs;
   default is to ship the reuse-only story and queue the motor separately.

## Next-phase briefs — status

All five Phase-4 DRAFT briefs (S21–S25) were **verified against merged reality this session.** Their
entry-criteria commands were run and **all still hold** post-Phase-3:

- **S21** (chain-eval engine) — *confirmed unchanged.* `evaluationOrder` in `engines/chain.ts`,
  `connectionLegal` in `engines/units.ts`, `RelationEngine` in `ChainDemo.tsx` (5 hits), the 27.852
  golden in `chain-demo.spec.ts`, `chain.test.mjs`, and `assumptions`/`citation` in `types.ts` (8
  hits) all present.
- **S22** (chain-builder MVP) — *confirmed unchanged.* All four panel components
  (`KnobPanel`, `Readouts`, `MaterialPicker`, `ValidityBanner`) and `ADR-0006-accessibility.md`
  present. (S17's slots work did not rename `MaterialPicker`.)
- **S23** (URL serialization) — *confirmed unchanged.* Its dependencies are S21/S22 build artifacts
  (correctly not yet present); no pre-existing reference drifted.
- **S24** (chain provenance + /verification/ section) — *confirmed unchanged.* `chain-demo.astro`,
  `verification.astro`, and the `RelationMeta` citation/assumptions supply all present. Note: this
  session confirmed the *existing* `/verification/` solveLinear description already matches the
  shipped verifier, so S24's "add a chaining section" mandate is additive as written.
- **S25** (curated examples + spin-up + Phase 4 close) — *lightly edited.* Entry criteria hold
  (`flywheel-disk` `I_z` present, the `s` seconds display unit present from S07, Phase-3 rows DONE).
  Its deliverable 3 explicitly delegates an example-chain "pin" to this closing session: the
  merged catalog **does** offer a legal wire, so a note was added to the S25 brief recommending
  `planetary-gearset.T_out → fixed-fixed-torsion-shaft.T` (both `quantity_kind: torque`; drives a
  Phase-3 indeterminate THING) with force-wire alternatives into `composite-bar.P` /
  `bolted-joint-gasket.P`. Nothing the slot depends on was SKIPPED.

## Risks carried forward

1. **Textbook-PDF inaccessibility (recurring since S02).** Primary-source PDFs stayed frequently
   blocked all phase; the mitigation held — pin by first-principles re-derivation +
   web-corroboration, let the physics test (not transcription) carry the weight. solveLinear made
   this *stronger*: because closed forms exist, the compatibility/solve is a machine-verified
   derivation identity, not a citation.
2. **A brief is a spec, not a source (rule 6, proven a third time).** S15's brief mis-stated the
   propped-cantilever deflection-max location; independent re-derivation caught it and the erratum
   shipped (PR #33). Continue to re-derive every emitted formula; never transcribe.
3. **Phase 4 is a different shape of work — UI and orchestration, not physics.** The per-THING gate
   items 2–4 (physics cross-check, golden, citations) mostly don't apply; the load-bearing gates
   become the refusal-propagation unit tests, the frozen-URL compatibility contract, the
   page-weight budget, and the /verification/ honesty text. S22 and S25 are L-sized solo sessions
   (never claimed via the continuation rule); PAUSE early rather than rush (§9.4).
4. **The chain is where provenance must not leak.** The refusal-propagation gap S21 exists to close
   (finite-but-refused upstream values feeding downstream) is a live invariant-5 risk until S21
   ships; the current `/chain-demo/` is safe only because its demo chain never trips a refusal.
5. **Merge is publish, catalog-wide.** S22's builder touches shared panel components on every THING
   page; a regression is site-wide with no review step. The full e2e sweep across the catalog is the
   required net (same discipline S17's slots work used).
