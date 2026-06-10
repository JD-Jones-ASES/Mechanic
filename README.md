# Mechanic — Engineering Reference Portal

**Live site: https://jd-jones-ases.github.io/Mechanic/**

A browsable, citation-backed database of mechanical and physical THINGS — currently a planetary
gearset, cantilever beam, thin-walled pressure vessel, torsion shaft, Euler column, four-bar
linkage, solid-disk flywheel, and thick-walled (Lamé) cylinder, plus a
[chaining demo](https://jd-jones-ases.github.io/Mechanic/chain-demo/) that wires a gearbox into a
shaft with type-checked port bindings. Every THING ships its governing equations
**with machine-verified derivations**, an interactive simulation, material selection with visible
provenance, and a how-it-fails note. Pure static site (GitHub Pages); all math is verified and
compiled at build time by SymPy.

> **Educational material — not for design use.** The site is AI-authored end to end under
> owner-designed verification systems — no human review applies; the live
> [verification page](https://jd-jones-ases.github.io/Mechanic/verification/) lists exactly what
> the build proves and what rests on citation (ADR-0007).

## Develop

```sh
# prerequisites: Node 24.x, pnpm, uv (Python)
cd pipeline && uv sync && uv run pytest          # math layer: compile/verify/emit + tests
cd ../site && pnpm install
pnpm build                                       # runs the Python pipeline, then astro build + pagefind
pnpm preview                                     # serve the built site locally
pnpm exec playwright test                        # end-to-end invariants vs the built site
```

The full build takes ≈ 3–4 minutes; verifying the four-bar linkage's two solution branches against
the loop-closure relations dominates the compile step.

## Orientation

- `CLAUDE.md` — the master spec: mission, the five invariants, factory pattern, provenance rules.
- `docs/architecture.md` — pipeline + the compiled-artifact schema (single source of truth).
- `docs/authoring-things.md` — how to add a THING.
- `docs/data-provenance.md` — citation tiers and the legal frame for material data.
- `docs/decisions/` — ADRs for every load-bearing choice.

Licensing: MIT (code) + CC BY 4.0 (content & dataset) — see `LICENSE`, `LICENSE-content.md`.
