# Mechanic — Engineering Reference Portal

**Live site: https://jd-jones-ases.github.io/Mechanic/**
[![CI](https://github.com/JD-Jones-ASES/Mechanic/actions/workflows/ci.yml/badge.svg)](https://github.com/JD-Jones-ASES/Mechanic/actions/workflows/ci.yml)

A browsable, citation-backed database of mechanical and physical THINGS — gears, beams, shafts,
springs, belts, pressure vessels, linkages — for engineering undergraduates. Every THING ships
its governing equations **with machine-verified derivations**, an interactive simulation,
material selection with visible provenance, and a how-it-fails note. The
[catalog](https://jd-jones-ases.github.io/Mechanic/things/) currently holds 24 THINGs spanning
statics, mechanics of materials, machine design, and dynamics, plus a
[chaining demo](https://jd-jones-ases.github.io/Mechanic/chain-demo/) that wires a gearbox into a
shaft through type-checked port bindings.

Pure static site (GitHub Pages). No server, no accounts, no analytics. All math is verified and
compiled at build time by SymPy; the browser only evaluates generated, pre-proven functions.

> **Educational material — not for design use.** This site is AI-authored end to end under
> owner-designed verification systems; no human reviews the content. The live
> [verification page](https://jd-jones-ases.github.io/Mechanic/verification/) states exactly
> what the build proves and what rests on citation.

## If you're here as a student

Each THING page gives you knobs over the real governing relations — not canned animations:

- **Configurations run the same physics in different directions.** *Analyze* a spring, or name
  the rate you want and let the same relations find the coils to wind. Stress a cylinder, or
  name the safety factor and get the wall that achieves it.
- **Materials are a cross-cutting axis.** Swap A36 steel for Ti-6Al-4V and watch which numbers
  move and which refuse to — stiffness, strength, and density are independent levers, and the
  split between them is most of machine design.
- **The widget refuses to lie.** Push past a model's envelope — coil-bind a spring, overspeed a
  belt, ask a tube to enclose more area than its perimeter allows — and you get a cited
  refusal banner instead of confident nonsense. The boundaries of a model are part of the
  model.
- **Every formula carries its pedigree:** assumptions, validity limits, a step-by-step
  derivation, and a citation into the standard references (Shigley, Gere, Timoshenko…). The
  *how it fails* notes tell you what the tidy formula leaves out.

## If you're here for the AI experiment

This repository is also a live answer to a question: *what does it take for AI-authored
technical content to be trustworthy without a human reviewer?* The owner designed the
verification systems; the AI authors everything under them ([ADR-0007](docs/decisions/)):

- **Dimensional analysis as a type system.** Every variable carries an SI dimension 7-vector
  *and* a quantity kind (angle, ratio, and Poisson's ν are all dimensionless — dimension alone
  is not enough). Builds fail on inhomogeneous relations.
- **No blind solving.** Authors supply closed-form solutions; SymPy *verifies* them against the
  declared relations (symbolic tiers + 50-digit numeric sampling), checks degree-of-freedom
  arithmetic on the solution manifold, and proves every displayed derivation step. Multi-branch
  solutions (a four-bar's two circuits) are each verified independently. Where no closed form
  exists at all (the eccentric column's secant equation), the build certifies an authored
  *bracket* instead — a proven sign change containing exactly one root — and checks the
  browser's live root-finder against 60-digit bisection on every build.
- **A declared audit surface.** Steps where physics *enters* (modeling steps) are labeled as
  such on every page; each gets an independent first-principles cross-check in
  [`pipeline/tests/`](pipeline/tests/) — beam rows re-derived by integrating the ODE, the
  capstan equation re-integrated by `dsolve`, Mohr's circle re-derived from eigenvalues.
- **Honest provenance, recorded.** Every source citation carries a `verification` record of
  *how* it was pinned (and says so plainly when something was not consulted directly). Material
  property values keep their published value, unit, source, and basis.
- **Gates, then adversarial review.** KaTeX renderability, display-unit resolution, and
  JS-vs-SymPy parity are build gates; each batch of THINGs then passes a multi-agent
  adversarial review (physics, provenance, factory discipline) before merge — the review
  reports and their fixes are visible in the PR history.

Corrections welcome: if you find an error, open an issue — fixes land through a dated errata
path, never silent edits.

## Develop

```sh
# prerequisites: Node 24.x, pnpm, uv (Python)
cd pipeline && uv sync && uv run pytest          # math layer: compile/verify/emit + tests
cd ../site && pnpm install
pnpm build                                       # runs the Python pipeline, then astro build + pagefind
pnpm preview                                     # serve the built site locally
pnpm exec playwright test                        # end-to-end invariants vs the built site
```

A cold build takes ≈ 3–4 minutes — verifying the four-bar linkage's two solution branches
dominates — but compiled THINGs are cached by content fingerprint, so warm rebuilds reuse
unchanged THINGs in seconds (locally and in CI). The site deploys from CI on every push to
`main`.

## Orientation

- [`CLAUDE.md`](CLAUDE.md) — the master spec: mission, the five invariants, factory pattern,
  provenance rules.
- [`docs/architecture.md`](docs/architecture.md) — pipeline + the compiled-artifact schema
  (single source of truth).
- [`docs/authoring-things.md`](docs/authoring-things.md) — how to add a THING.
- [`docs/data-provenance.md`](docs/data-provenance.md) — citation tiers and the legal frame for
  material data.
- [`docs/decisions/`](docs/decisions/) — ADRs for every load-bearing choice (ADR-0007 = the
  verification model).
- [`docs/roadmap.md`](docs/roadmap.md) — the phased plan toward the final product.
- [`docs/sessions/`](docs/sessions/) — the autonomous working-session system: protocol, queue,
  per-session briefs, log, and the owner runbook.

## License

MIT (code) + CC BY 4.0 (content & dataset) — see [`LICENSE`](LICENSE) and
[`LICENSE-content.md`](LICENSE-content.md).
