# ADR-0009: Tabulated relation data (the `table` plan step)

**Status:** ACCEPTED — owner sign-off JD 2026-07-04 (the S00 plan, ruling R5: "the tabulated-data
`table` plan step, Option B"). Implemented in session S01 alongside its first consumer,
spur-gear-pair (Lewis bending). This ADR records the design as built.

## Problem

Some governing quantities are published as **tables**, not formulas. The Lewis form factor `Y(N)`
for a gear tooth is the motivating case: it comes from a graphical layout of the tooth profile (or
its digital equivalent), and Shigley Table 14-2 lists it at two dozen tooth counts. There is no
closed form to verify against, yet the number is load-bearing — it sets the bending stress. The
factory has three verified plan steps (`eval`, `solve1d`, and multi-branch `eval`); none can
express "look this up in a cited table and interpolate." Ad-hoc magic numbers in a THING's YAML
would violate the credibility spine (invariant 5): no provenance, no envelope, no audit surface.

## Decision — Option B: a first-class `table` plan step

A THING declares a `tables:` block (cited, with provenance); a configuration consumes it in
`solutions` as `Y: { table: <id>, at: <expr> }`, where `at` is an expression over already-evaluated
symbols (forward DAG, like a `solve1d` bracket). The compiled artifact carries the rows verbatim
and a scoped out-of-domain guard. The mechanism, end to end:

- **Dimensional typing.** The table's `arg` and `columns` are declared variables serving as
  dimension + quantity-kind templates; every consumption is checked against them (invariant 2).
- **DOF honesty.** Each column a table fills counts as one relation in the DOF check, so knob
  counts stay exact — the table pins its output as surely as a closed form would.
- **Verification (five parts, all machine-gated).** (1) structural: strictly-increasing finite
  args, legal mode, integer-arg tables need integer rows, citations resolve; (2) node-exact: the
  lookup returns each published value bit-exactly, so yaml→artifact→browser drift is caught;
  (3) per-sample back-substitution: the looked-up value joins the residual-zero certificate every
  relation gets, with the samples landing in the parity oracle so the browser's interpolation is
  pinned against mpmath every build; (4) refusal proven: out-of-domain (or non-row) args are shown
  to refuse; (5) honest audit surface: `/verification/` states that interpolation-between-rows is a
  declared modeling step (its own `interpolation_citation`) and that the tabulated numbers rest on
  citation, not machine-proof.
- **Refusal is scoped.** Out of the tabulated domain the lookup returns a non-finite value, which
  the engine turns into a scoped `invalid` refusal — the column and its descendants blank, the
  table's citation rides along, the rest of the page stands. There is **no clamp or extrapolation**
  in the emitted lookup: outside the data there is nothing honest to return.

Modes: `interpolate-linear` and `exact-row` ship. `threshold` is schema-reserved and the compiler
rejects it ("not yet built") until its consumer arrives (ball-bearing X/Y factors, S11). Loading
rows from an external file (`rows_from: data/tables/<id>.yaml`) is **reserved**, not built — the
first table is small enough to inline, and an external-file path wants its own provenance rules
(the data-provenance ADR frame) before it ships.

## Rejected alternatives

- **Option A — per-THING constants with knob snapping.** Bake the table into the THING as inline
  numbers and snap the knob to the nearest tabulated tooth count. Rejected: it hides provenance
  inside one THING (no shared, cited mechanism), snapping lies about the input the user chose, and
  it gives no honest out-of-domain refusal — the exact "plausible wrong number, surfaced silently"
  failure invariant 5 exists to ban.
- **Option C — a materials-DB-style external data collection.** Model tables like the materials
  seed: SQLite/JSON files ingested with their own schema and provenance tooling. Rejected as
  premature for v1: it is heavier machinery than one small form-factor table needs, and it splits a
  THING's math across two systems. The `rows_from` hook is reserved so this can be revisited when a
  table is large enough to justify it, without changing the plan-step contract.

## Consequences

The catalog gains a fourth verified plan step with the same "shared engine, no bespoke math" shape
as `solve1d`. `/verification/` gains a tabulated-data audit note stating the machine-proven vs
by-citation split. The Lewis-Y honesty line is explicit: the interpolation and the refusal are
machine-proven; the numbers themselves are cited data, cross-checked against a second published
source, not first-principles physics.
