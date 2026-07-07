# Phase 4 report — 2026-07-07

- **Summary.** Phase 4 turned the catalog into a *system* and gave it a *home*. Two tracks ran in
  one phase (owner ruling 2026-07-06, R7–R9): the chaining track (S21–S25) built a headless
  chain-evaluation engine, an interactive `/chain-builder/` page, shareable `#v1=` chain URLs,
  per-readout provenance trails, and three curated example chains; the portal track (QC2, D1, D2)
  fixed the Phase-3 QC findings, shipped a course-spine catalog taxonomy with a Pagefind search UI,
  and added THING-page wayfinding. The differentiator the roadmap named — a type-checked system
  simulator where every number keeps its citation — is live, and it opens on the headline story
  (a planetary gearbox spinning up a flywheel, gear ratio trading spin-up time against shaft
  stress). The catalog stayed at 36 THINGs: Phase 4 added no THING (the one physics addition, the
  flywheel spin-up relation, is an amendment to an existing THING; the minimal motor THING was
  deferred to this report's decision list). Every merge passed the full gate; the Phase-3 QC audit
  that opened the phase found zero wrong emitted numbers, and no wrong number was introduced.

- **Sessions.**

  | ID  | Shipped | PR | Deviations (one line) |
  |-----|---------|----|-----|
  | QC2 | Phase-3 QC fixes (4 findings) + per-slot `default_material` field (R7) | #41 | `rg solve_hint` exit-criterion reads literally "returns nothing" but the audit/log necessarily contain the word — honest exception, documented. |
  | S21 | Headless `chain-eval` engine (evaluateChain/planTargets/ports); refusal + provenance propagation | #42 | Added a fan-in guard (silent last-wins → fail-loud) + robustness beyond literal deliverables, review-driven. |
  | D1  | Course-spine `category`/`topic` taxonomy; home/catalog redesign; Pagefind search UI | #44 | Pagefind emits its UI to `dist/pagefind/` (not `dist/_pagefind/` as the brief assumed — underscore dropped at Pagefind 1.0). |
  | D1↝ | Hotfix: exclude catalog listing pages from the Pagefind index | #45 | Owner-directed via task chip; "do not change indexing scope" no longer binding. |
  | D2  | THING-page wayfinding (related · chains-with · prev/next · verification badge) | #46 | Fixed a pre-existing mobile `.config-select` overflow; added a home-hero link to `/chain-builder/` (was reachable only by URL). |
  | S22 | `/chain-builder/` MVP — pick/wire/evaluate up to six nodes, type-checked bindings, refusals propagating | #47 | (see log; native controls, no drag-and-drop, per brief). |
  | S23 | Shareable `#v1=` chain URLs — versioned fragment, graceful banner-named decode-on-load degradation | #48 | `encode/decodeChain` take a context arg the one-arg sketch abbreviated; added `previewSlugs`. |
  | S24 | Per-readout provenance trails + chain assumptions panel + `/verification/` chaining section | #49 | Trails render outside the readouts `<dl>` (a `<details>` inside a dl is an axe violation); assumptions grouped-by-node, not flat-deduped. |
  | S25 | Three curated example chains (frozen `#v1=` URLs) + flywheel spin-up relation `t_spin = I_z·ω/T_d` + Phase 4 close | #50 | Example-3 slot filled with the S20-pinned simplest legal wire (planetary `T_out` → fixed-fixed-torsion-shaft `T`); a tiny same-page reload script for example links (the builder decodes only at mount). |

- **Catalog.** 36 → 36 THINGs (Phase 4 added no THING by design — it added the *system* layer over
  the existing catalog). Capabilities added, one line each:
  - **Chain-evaluation engine** (S21): a headless planner orders forward chains, propagates refusals
    (a refused value is withheld, never forwarded), and carries every number's provenance.
  - **Interactive chain builder** (S22): pick THINGs, wire type-checked ports, watch the whole system
    evaluate — up to six nodes, single-branch configs, native controls.
  - **Shareable chain URLs** (S23): a chain serializes to a `#v1=` fragment; decode-on-load degrades
    gracefully against the live catalog, naming every drop (never a silent different chain).
  - **Provenance through chains** (S24): every chained number has a click-to-open "Where this comes
    from" trail and a chain-level assumptions-in-play panel.
  - **Curated example chains** (S25): `/chain-builder/` opens with three verified frozen-URL examples;
    the flywheel gained a cited, pipeline-verified spin-up-time relation.
  - **Course-spine portal** (D1/D2): a `category`/`topic` taxonomy, a Pagefind search UI, and derived
    THING-page wayfinding (related · chains-with · prev/next · verification badge).
  - **Per-slot `default_material`** (QC2, R7): a material slot may name its landing material.

- **Gate compliance.** Every Phase 4 merge passed the full protocol §3 gate (machine verification +
  site build, physics cross-check where a THING/relation shipped, hand golden, citations, engine
  units, e2e + axe, browser visual pass, three-angle self-review). Every deviation, collected in one
  place (nothing buried):
  - QC2 — the `solve_hint` exit-criterion grep necessarily matches the audit/log text; read as
    "no stale *code* reference", satisfied. No gate lowered.
  - S21 — shipped MORE than the literal deliverables (fan-in guard, robustness), all review-driven.
  - D1 — Pagefind output path is `dist/pagefind/`, correcting a brief/ADR assumption; + the #45
    hotfix (owner-directed) excluding listing pages from the index.
  - D2 — fixed a pre-existing mobile overflow and added a home→builder link (both in-scope polish).
  - S23 — `encode/decodeChain` take a catalog/artifact context (degradation requires it); added
    `previewSlugs`. Flagged owner decision: cross-version default drift (a knob left at default is
    omitted and refilled from the live catalog — see Risks; recommend accept-as-limitation).
  - S24 — provenance trails render as a sibling block outside the `<dl>` (axe), and the assumptions
    "union" is grouped-by-node (attribution-preserving), not flat-deduped.
  - S25 — example-3 is the S20-pinned simplest legal wire (planetary `T_out` → fixed-fixed-torsion-
    shaft `T`, driving a statically-indeterminate solveLinear consumer from a chain); the on-page
    example links use a small progressive-enhancement reload script because the builder decodes the
    URL fragment only at mount (the e2e navigates directly, needing no script). No gate lowered.

- **BLOCKED / SKIPPED rows.** None in Phase 4. (No row was blocked; nothing was skipped.)

- **Spot-check menu (~2 min each).**
  1. **The headline, live.** `/chain-builder/` → click **"Spin-up time vs. shaft stress"** → the
     3-node chain loads (T_out = 350 N·m, τ = 27.85 MPa, P_w = 1 kW = the sun input, t_spin = 0.13 s).
     Drop the sun teeth `N_s` from 24 → 12 and watch **t_spin fall (0.134 → 0.094 s) while τ rises
     (27.9 → 39.8 MPa)** — the gear ratio trading spin-up time against shaft stress.
  2. **The scoped refusal.** `/things/flywheel-disk/` → the new *Spin-up time* readout reads ~0.33 s;
     set **Drive torque `T_d` to −50** and watch t_spin blank to "—" with an *Invalid* banner, while
     stored energy, peak stress, and margin all still stand (the disk keeps spinning in the sim).
  3. **Provenance + degradation.** On any chain, open a readout's *Where this comes from* trail;
     paste a `#v1=` link naming a since-renamed port and confirm the amber "adjusted to the current
     catalog" banner names the drop.
  - **Derivation to eyeball:** flywheel-disk *Governing relations* → the final step
    `t_spin = I_z·ω / T_d` (angular impulse–momentum, from rest), re-derived independently in
    `pipeline/tests/test_flywheel_spinup_physics.py` (dsolve of I·dω/dt = T).
  - **`/verification/` delta:** the chaining honesty section (S24) — what the build proves about a
    chain vs. the cross-THING modeling consistency it does not.

- **Decisions needed before Phase 5.** (numbered, each with a recommendation)
  1. **The minimal motor THING.** The spin-up story drives the chain with the planetary's existing
     `T_s` knob, framed honestly in prose as "the sun-torque knob stands in for a motor." A first-
     class motor THING (a linear torque–speed curve: stall torque + no-load speed) would make the
     source real and let a chain pick an operating point. **Recommendation: build it as a small,
     well-scoped THING** — either the first Phase 5 item or a short interstitial before Phase 5 —
     since it closes the one honesty gap in the headline example and needs no new engine capability.
     (Open since the Phase-3 report, decision 3; reaffirmed here.)
  2. **Phase 5 scope (Materials depth).** The roadmap's Phase 5 grows `data/materials/` under the
     same Feist/provenance rules, each new property column unlocking THING capabilities (ultimate
     strength → burst margins; endurance limits → fatigue; fracture toughness → leak-before-burst),
     adds composites, and closes the Ashby merit-index loop. **Recommendation: approve Phase 5 as
     roadmapped**, and decide there whether the motor THING (1) rides inside it or precedes it. No
     Phase 5 briefs are drafted yet (see below).
  3. **Chain-builder wire UX (carried, not urgent).** The wire dropdowns offer ALL target ports and
     reject illegal picks on *Connect*; surfacing only type-COMPATIBLE targets would remove the
     guessing entirely. **Recommendation: a small D-track polish item if Phase 5 opens a portal
     lane; otherwise defer.** (Flagged in the S24 log.)

- **Next-phase briefs.** **None drafted.** Phase 5 exists at roadmap level only (Materials depth);
  there are no Phase 5 queue rows or brief files yet — unlike the Phase 3→4 handoff, this phase did
  not write the next phase's briefs ahead of time (Phase 4's briefs were pre-written; Phase 5's are
  not). The owner will want to commission Phase 5 briefs (or a planning session like S00) when ruling
  Phase 5, and decide the motor-THING placement (decision 1) at the same time.

- **Risks carried forward.**
  - **Cross-version default drift** (S23, owner-accepted): a knob left at its `default` is omitted
    from the URL and refilled from the *live* catalog, so if a variable's authored default changes
    between the catalog that made a link and the one opening it, that knob shifts with no banner —
    the one catalog-rot axis degradation cannot name. No *wrong* number is emitted (a refilled
    default is a valid current input), only a possibly-different chain. Closing it needs stored
    defaults or a catalog fingerprint. **Recommend: accept as a documented limitation.**
  - **Motor deferral:** until decision 1 lands, the headline spin-up example is driven by the
    planetary's `T_s` knob standing in for a motor (framed honestly in the walkthrough prose and the
    flywheel overview). Correct today; a real motor THING would make it self-contained.
  - **Multi-slot THINGs in chains** (S22 note): a two-material THING (composite-bar, thermal-
    assembly) collapses to a single merged material in the chain builder — a valid uniform-material
    evaluation, but it forgoes the two-material contrast the THING page shows. Documented v1 limit.
