# Mechanic — Engineering Reference Portal

A browsable, citation-backed database of mechanical and physical THINGS — gears, linkages, beams, pressure
vessels — for engineering undergraduates. Every THING ships its governing equations **with machine-verified
derivations**, an interactive simulation, material selection with visible provenance, and a how-it-fails
note. Pure static site (GitHub Pages); all math is verified and compiled at build time by SymPy.

> **Educational material — not for design use.**

## Develop

```sh
# prerequisites: Node 24.x, pnpm, uv (Python)
cd pipeline && uv sync && uv run pytest          # math layer: compile/verify/emit + tests
cd ../site && pnpm install
pnpm build                                       # runs the Python pipeline, then astro build + pagefind
pnpm preview                                     # serve the built site locally
pnpm exec playwright test                        # end-to-end invariants vs the built site
```

## Orientation

- `CLAUDE.md` — the master spec: mission, the five invariants, factory pattern, provenance rules.
- `docs/architecture.md` — pipeline + the compiled-artifact schema (single source of truth).
- `docs/authoring-things.md` — how to add a THING.
- `docs/data-provenance.md` — citation tiers and the legal frame for material data.
- `docs/decisions/` — ADRs for every load-bearing choice.

Licensing: MIT (code) + CC BY 4.0 (content & dataset) — see `LICENSE`, `LICENSE-content.md`.
