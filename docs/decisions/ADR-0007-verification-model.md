# ADR-0007: Verification model — programmatic gates, no human review

**Status:** accepted (owner-directed 2026-06-10: "proceed with the project as if there is *no*
human review … call it what it is: AI doing its best to make this project, using documentation
systems designed by me")

**Decision.** This project is AI-authored end to end — THINGs, derivations, prose, sims, tests —
operating under documentation and verification systems designed by the project owner. There is
no human review gate anywhere in the process, and nothing on the site claims otherwise. Accuracy
rests on programmatic due diligence, which is enumerated, enforced, and disclosed:

1. **Build gates (every push):** dimensional homogeneity of every relation; DOF/Jacobian-rank
   checks on the solution manifold; every authored solution back-substituted into every relation
   (tiered symbolic prover + ≥30 numeric samples at 50 dps, per branch); every derivation
   identity proven; KaTeX renderability; JS↔SymPy parity oracle; display-unit resolution
   (`check-units.mjs`); Playwright goldens + axe smoke against the built site.
2. **The audit surface is explicit and minimal:** derivation steps where physics enters by
   citation are badged "modeling step" in the UI; everything else is machine-proven to follow
   from them. Each THING additionally carries an independent physics cross-check in
   `pipeline/tests/` that re-derives the cited result from first principles (e.g. re-solving the
   rotating-disk and Lamé boundary-value problems from equilibrium + compatibility), plus a
   hand-checkable numeric golden.
3. **Citations are pinned programmatically where possible** — against publisher tables of
   contents, indexed full texts, and other accessible documents — and the method is recorded
   per source in `sources[].verification` (rendered on the site's verification page). Citations
   that could not be pinned say so.
4. **Corrections flow through the errata path** (append-only, dated), never silent edits.
   External spot checks are welcome whenever they happen, get recorded the same way, and gate
   nothing.

The site discloses all of this on a dedicated `/verification/` page, and the educational-use
banner ("not for design use") remains site-wide.

**Why.** The previous wording ("human review before merge", "human-reviewed" modeling-step
badges) described an aspiration, not the process — the project owner designs the systems and
spot-checks opportunistically, but does not review THINGs, and pretending otherwise is exactly
the kind of silent misrepresentation invariant 5 exists to ban. Stating the real verification
model plainly is both more honest and more useful: the reader can see precisely what a machine
proved, what rests on a citation, and how that citation was checked.

**Consequences.** CLAUDE.md invariant 5's "textbook worked-example golden test and human review
before merge" is replaced by the gate list above. The THING-page derivation legend, the about
page, and the README now state AI authorship outright. Published worked-example goldens remain
welcome whenever a source is accessible enough to pin one — as an addition to the gates, not a
substitute for them.
