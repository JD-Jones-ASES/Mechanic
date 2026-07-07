# Contributing

Mechanic is at v1.0.0 and its initial development is complete. The most valuable contribution is a
**correction**: if a number, derivation, citation, or validity envelope on the live site looks
wrong, please [open an issue](https://github.com/JD-Jones-ASES/Mechanic/issues) naming the THING
page and what you expected. Confirmed errors land through a dated errata path
([`docs/data-provenance.md`](docs/data-provenance.md)) — never silent edits — and material-data
corrections keep their full provenance trail.

A few things to know before proposing larger changes:

- **The verification model is the product.** Every emitted number must trace to a cited relation,
  pass dimensional checks, and carry an independent physics cross-check
  ([`docs/decisions/ADR-0007`](docs/decisions/ADR-0007-verification-model.md)). A change that
  weakens a gate will not be merged, however nice the feature.
- **New THINGs** follow [`docs/authoring-things.md`](docs/authoring-things.md) and the full
  per-THING gate in [`docs/sessions/protocol.md`](docs/sessions/protocol.md) §3 (machine
  verification, first-principles cross-check, hand-checkable golden, pinned citations, e2e pins,
  visual pass, multi-angle review).
- **The static-site constraint is permanent**: no servers, no analytics, no accounts.
- **Material data has legal rules**: values are cited facts (Feist); source PDFs and table layouts
  are never redistributed, and some sources are forbidden outright — see
  [`docs/data-provenance.md`](docs/data-provenance.md) before touching `data/materials/`.

Build and test: see the *Develop* section of the [README](README.md), and
[`CLAUDE.md`](CLAUDE.md) if you are pointing a coding agent at this repo.
