# S01 — spur-gear-pair + `table` plan-step capability + ADR-0009

- **ID / Title:** S01 — spur-gear-pair (Lewis bending) + tabulated-data capability, end to end
- **Phase:** 2
- **Type:** engine+THING
- **Size:** L — solo; never claimed via continuation. Context low → PAUSE (§9.4) at the seam in Notes.
- **Status:** FULL

## Goal

Catalog 17 → 18. The roadmap's deliberate schema stress test: a first-class `table` plan step
(tabulated data with provenance) lands across schema → compile → verify → emit → browser runtime →
/verification/ audit surface, with spur-gear-pair (Lewis bending, Shigley Table 14-2) as first
consumer — the solve1d + eccentric-column one-PR precedent. ADR-0009 records the design ACCEPTED.

## Entry criteria

Any false → BLOCKED, do not start (protocol §1.6).

- Main CI green: `gh run list --branch main --limit 1`
- No PAUSED/IN_PROGRESS rows: `rg '\|\s*(IN_PROGRESS|PAUSED)\s*\|' docs/sessions/queue.md` → no
  output (table-cell-anchored — a naive word grep false-positives on the status legend)
- Dependency S00 DONE: `rg 'S00.*DONE' docs/sessions/queue.md` → one row
- No half-landed capability: `rg '"table"' site/src/engines/types.ts` → no output (else read log.md first)
- Materials seeded: `test -f data/materials/nylon-66.yaml && test -f data/materials/iron-gray-class30.yaml`
- Kinds exist (none new; ALL must match): `for p in '"count"' '"ratio"' '"velocity"' '"torque"' '"power"'; do
  rg -q "$p" pipeline/src/mech_pipeline/kinds.py || echo "MISSING $p"; done` (Bash) → prints nothing
- Units exist (none new; ALL must match): `for p in '"m/s"' '\brpm:' '\bkW:' '"N\*m"' '\bMPa:' '\bmm:'; do
  rg -q "$p" site/src/engines/units.ts || echo "MISSING $p"; done` (Bash) → prints nothing

## New capabilities required

**The `table` plan step** — authority: roadmap Phase 2 line ("design that capability deliberately,
not ad hoc") + owner-approved plan 2026-07-04 (Option B). The ONLY capability granted; anything
beyond the design below → STOP and BLOCK (§9.2). The design is decided — do not re-litigate.

**Authoring block** (thing.yaml), enforced by Zod in `site/src/content.config.ts`:

```yaml
tables:
  - id: lewis-form-factor-20fd
    citation: shigley                # must resolve in sources[] (build fail otherwise)
    provenance: "Values as published in Table 14-2; 20-deg full-depth involute, load near tip"
    arg: N_p                         # declared variable; kind + integer flag checked vs arg spec
    columns: [Y_p]                   # declared derived variables this table determines
    mode: interpolate-linear         # interpolate-linear | exact-row | threshold (RESERVED)
    interpolation_citation: shigley  # REQUIRED for interpolate-*: who says interpolating is legitimate
    out_of_domain: invalid           # auto-guard; message composed with citation; scope = columns + descendants
    rows:                            # strictly increasing arg; rows_from: data/tables/<id>.yaml RESERVED
      - [12, 0.245]                  # ... every Table 14-2 row, verbatim, through [400, 0.480]
```

Consumed in `configurations.solutions` as `Y_p: { table: lewis-form-factor-20fd, at: N_p }` —
`at` is an expression and may read earlier plan targets; downstream closed forms
(`sigma_b: K_v*W_t/(b*m_mod*Y_p)`) consume the columns normally.

**Modes:** `interpolate-linear` + `exact-row` ship NOW; `threshold` is schema-reserved (compile
rejects it as "not yet built") until its consumer (ball-bearing X,Y) arrives; `exact-row` refuses
any non-row arg. Out-of-domain ALWAYS refuses via an auto-generated invalid Guard carrying the
table's citation through the scoped-refusal machinery — no clamp or extrapolation path in emitted code.

**Compiled artifact:** `PlanStep` union in `site/src/engines/types.ts` gains a third variant:

```ts
| { type: "table"; targets: string[]; table_id: string;
    arg_fn: string;                            // fn of already-evaluated env (forward-DAG ordered)
    mode: "interpolate-linear" | "exact-row";
    rows: number[][];                          // [arg, col1, ...] embedded verbatim in the artifact
    domain: [number, number]; guard: Guard;    // guard: severity 'invalid', scope = targets, table's citation
    latex: string }                            // e.g. Y = \mathrm{Table\ 14\text{-}2}(N)
```

**DOF arithmetic:** one table step consumes 1 arg and determines k columns — counts as k relations
in the configuration's DOF check (compile.py), so knob counts stay honest.

**Verification story (all five parts mandatory)** — `verify.py` grows `verify_table_configuration`
mirroring `verify_solve1d_configuration`:
1. STRUCTURAL: args strictly increasing; values finite; arg/column dims + quantity kinds checked
   like variables; citation resolves; integer-arg tables need an integer-flagged arg; mode legal.
2. NODE-EXACT TRANSCRIPTION CERTIFICATE: the emitted JS lookup, evaluated at EVERY row's arg,
   returns the published value bit-exactly — yaml → artifact → browser drift is machine-caught.
3. SAMPLE BACK-SUBSTITUTION: at each of the ≥30 samples, evaluate the lookup at 50 dps (mpmath),
   back-substitute into EVERY relation reading the columns — table outputs join the residual-zero
   certificate like eval/solve1d; samples land in the parity oracle so browser interpolation is
   pinned against mpmath every build (the solve1d/Brent pattern).
4. REFUSAL PROVEN, NOT ASSUMED: the verifier probes out-of-domain args; the auto-guard must fire, scoped to targets.
5. HONEST AUDIT SURFACE: interpolation between rows is a declared modeling step with its own
   `interpolation_citation`, rendered in the /verification/ audit block — machine-proven: through
   all published points, linear between, refuses outside [12, 400]; by citation: interpolating is
   legitimate. The build cannot prove physics between rows; the site says so.

## Physics scope

- Kinematics: `i = N_g/N_p`; `c = m(N_p+N_g)/2`; `V = ω_p·m·N_p/2` (pitch-line velocity)
- Force path: `W_t = 2T/(m·N_p)`; `P = T·ω`
- Lewis + Barth: `σ_b = K_v·W_t/(b·m·Y)`, `K_v = (6.1+V)/6.1` (metric Barth, Shigley eq 14-4b);
  `Y(N)` from Shigley Table 14-2 (20° full-depth), one lookup per gear (Y_p, Y_g, same table);
  `SF = σ_y/σ_b` per gear. Pressure angle fixed at 20° via configuration constraint — the table's basis.

Citations: Shigley 10th ed. §13-5/13-7 (involute geometry, interference eq 13-11), §14-1/14-2
(Lewis, Table 14-2, Barth). Golden: worked Example 14-1 (the compound-cylinder pattern). Cross-pin
Table 14-2 against a second accessible printing (Juvinall & Marshek's Lewis table) in
`sources[].verification` AND the physics test. **Honesty requirement:** Lewis Y values cannot
practically be re-derived from first principles; the DATA's independent cross-check is a second
published table (kinematics/force path still get first-principles re-derivation) — /verification/
must state this split; do not imply Y is machine-proven physics.

## Envelopes

- Table domain [12, 400] per Y lookup: **invalid**, auto-guard, **scoped** to that gear's Y and
  descendants (σ_b, SF). Reason: no published data outside the rows.
- Interference/undercut minimum pinion teeth (Shigley eq 13-11 closed form): **warn**, global.
  Reason: undercut invalidates the Lewis geometry assumption; the algebra still evaluates.
- Barth K_v velocity range: **warn**. Reason: empirical fit for cut/milled teeth at moderate V;
  outside it the factor loses its cited meaning.

## Materials axis

σ_y binds (SF per gear); ρ if a mass facet is authored. Per-gear material selection so the
pedagogy lands: nylon-66 or gray-iron pinion vs steel gear at identical geometry — same σ_b,
wildly different SF. Both seeds exist; no new property columns.

## Sim sketch

Schematic ONLY — protect the context budget: two pitch circles tangent at the pitch point, radii
from N_p/N_g and m, rotating at ω_p and ω_p/i via `useSimClock`; one tooth-force vector W_t at the
pitch point; σ_b/SF readouts per gear. **NOT rendered involute profiles** (decided; enrichment is
a later session). `SimRefusal` consumes scoped invalids — refused gear's readouts withheld while
the page stands. New `site/src/components/sims/GearPairSim.tsx`; register its draw key; SVG classes in `global.css`.

## Deliverables

- Capability: `site/src/content.config.ts` (tables block); `compile.py` (table plan step + DOF);
  `verify.py` (all five parts); `emit_js.py`; `site/src/engines/types.ts` + `relation.ts`
  (runtime table step); `check-units.mjs`/parity plumbing only if samples require it.
- `docs/decisions/ADR-0009-tabulated-relation-data.md` — SHORT, status ACCEPTED, authority
  owner-approved plan 2026-07-04; Option B rationale + rejected options (A: per-THING constants
  with knob snapping; C: materials-DB-style data files) one paragraph each; `rows_from` reserved.
- `site/src/pages/verification.astro`: tables audit note — machine-proven vs by-citation split,
  incl. the Lewis-Y honesty statement. `docs/authoring-things.md`: new "Tables" section.
- `site/src/content/things/spur-gear-pair/{thing.yaml, overview.mdx, failure.mdx}` — failure note
  previews AGMA contact stress as the deliberate non-model; cross-links torsion-shaft,
  planetary-gearset, belt-drive, power-screw. Sim component + CSS classes (above).
- `pipeline/tests/test_tables.py` (structural failures fail loudly; node-exact cert; refusal
  probe; DOF counting) + `pipeline/tests/test_gear_physics.py` (first-principles force path;
  Example 14-1 golden; Juvinall cross-pin of Y rows).
- e2e pins: presence + refusal (drive N below 12) at minimum.

## Exit criteria

- Catalog count = 18 on /things/, in CLAUDE.md, and in README.
- `uv run pytest -q` (pipeline/) collects > 150 (baseline 150 on main, 2026-07-04), all green;
  test_tables.py + test_gear_physics.py present.
- Machine-proven fact: emitted Y(N) reproduces every Table 14-2 row bit-exactly, linear between,
  scoped invalid outside [12, 400] — asserted by the build, not by hand.
- ADR-0009 ACCEPTED: `rg -l 'ACCEPTED' docs/decisions/ADR-0009*`
- /verification/ shows the tables audit note including the Lewis-Y honesty statement.
- Visual pass per §5 (normal + refused, described, not "looks good"); planetary-gearset still
  builds unchanged (invariant 1 reference case).
- Log entry appended; queue row S01 → DONE with PR# and date; deploy verified.

## Out of scope

Threshold mode (schema-reserved only) · `rows_from` files (reserved only) · rendered involute
profiles · AGMA contact stress · integer tooth-count synthesis · retrofitting existing THINGs onto
tables · any second table consumer (that is S02).

## Notes

- Imitate: eccentric-column PR #7 (capability-plus-first-consumer shape); compound-cylinder
  (worked-example golden, scoped-refusal wiring); planetary-gearset (integer tooth-count knobs).
- Pipeline-source edits bust EVERY fingerprint — every build this session is cold (≈3–4 min,
  slow not hung; timeouts ≥ 6 min).
- The table step's `latex` must survive `check:katex` — render it early, not last.
- PAUSE seam: capability + test_tables.py green and committed, THING not started (§9.4).
- Branch `phase2/spur-gear-table`; PR title e.g.
  `THING 18: spur gear pair + table plan step end to end (Phase 2 tabulated data, ADR-0009)`.
