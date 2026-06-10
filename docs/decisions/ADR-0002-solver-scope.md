# ADR-0002: Solver scope v1 = verified closed forms + Brent fallback; authored solutions are primary

**Status:** accepted (user-approved 2026-06-10)

**Decision.** Authors write the solved form for each knob configuration; the build *verifies* it against
the undirected relations (tiered symbolic checker + ≥30 high-precision numeric samples). Blind
`sympy.solve()` runs only as a fallback under a hard wall-clock timeout. We additionally ship a ~50-line
Brent root-finder and a `solve1d` plan-step type, even though no v1 THING requires it.

**Why.** Empirically verified (SymPy 1.14.0): blind `solve()` on the raw four-bar loop-closure trig system
hangs >5 minutes with no exception — CI would hang, not fail. With a tan-half-angle hint it solves in
0.8 s, but auto-derived expressions explode (916 ops/branch vs ~20 hand-derived). Authored forms are
smaller, numerically saner (atan2 formulations), and the verification is cheap and total.

**Why ship Brent anyway.** It is the on-ramp for fluids (Colebrook) and feedback loops, it future-proofs
the plan-step union (`eval | solve1d | solveND-reserved`), and it costs ~50 lines. Cyclic/ND solving stays
out of scope (see CLAUDE.md).
