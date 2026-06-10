# ADR-0003: One artifact format — generated fns.ts + compiled.json metadata

**Status:** accepted

**Decision.** Each THING compiles to exactly two generated files: `<slug>.fns.ts` (pure functions, the only
executable math) and `<slug>.compiled.json` (everything else: variables with dim 7-vector + quantity_kind,
relations with callable residual ids + srepr provenance, configurations with discriminated-union plan steps,
branches + selector + continuity hint, severity-tagged guards/validity with message + citation, verified
derivation steps as LaTeX, material bindings, sources). Schema lives in `docs/architecture.md`; the Zod
schema and the Python emitter must both conform to it.

**Why.** Planning research produced three competing formats (MathJSON walker, jscode functions, custom
expression tree). The jscode route satisfies every requirement the design stress-test surfaced — Brent only
needs a callable residual, guards can be compiled functions, branches are just multiple functions — with
verified printer coverage and loud failure on unsupported constructs. One format, one schema document.

**Consequences.** `quantity_kind` is mandatory alongside the dimension vector (angle/ratio/count/ν are all
zero-vector — dimension alone cannot type-check chaining). Validity envelopes attach to *relations* so they
survive re-emission and chaining. Generated files are never committed and never hand-edited.
