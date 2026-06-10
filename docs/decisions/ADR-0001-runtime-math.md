# ADR-0001: Runtime math = build-time compile (hybrid), not Pyodide, not hand-written JS

**Status:** accepted (user-approved 2026-06-10)

**Decision.** SymPy runs at build time only: it verifies authored derivations and solved forms, then emits
plain typed TypeScript functions (`sympy.printing.jscode` + `cse()`) plus a JSON metadata artifact. The
browser evaluates pure `Math.*` functions — zero runtime math dependencies.

**Why not Pyodide.** Verified June 2026: core + SymPy ≈ 10.5 MB over the wire, ~8–15 s cold start on a
mid-range laptop before first result. Wrong default for "instant, snappy widgets". Door stays open: an
opt-in "open in sandbox" Pyodide page can be added later without touching the data model (jsDelivr serves
it; GitHub Pages limits are not a problem — JupyterLite deploys Pyodide to Pages routinely).

**Why not hand-written JS per THING.** Duplicates the math in two places and nothing machine-verifies the
widget against the documented derivation — breaks invariant 5.

**Why not a MathJSON/AST interpreter.** No SymPy→MathJSON exporter exists (verified); `jscode` has verified
coverage (Piecewise/Abs/atan2/Min/Max/sign/floor) and raises `PrintMethodNotImplementedError` on anything
unsupported — loud failure beats a hand-maintained walker. `srepr` is kept in the artifact for provenance.

**Consequences.** A Python toolchain (uv) is a hard build dependency; CI runs it before `astro build`.
Fractional powers of possibly-negative bases must be detected at emission (JS `Math.pow` returns NaN where
SymPy may intend a real odd root).
