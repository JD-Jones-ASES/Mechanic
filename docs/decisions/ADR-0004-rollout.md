# ADR-0004: Private repo now; Pages deploy job written but dormant

**Status:** accepted (user-approved 2026-06-10) — **enacted 2026-06-10**: repo flipped public,
Pages enabled (build type: workflow), repo variable `DEPLOY_PAGES=true`; the deploy job now runs on
every push to main. Live: https://jd-jones-ases.github.io/Mechanic/

**Decision.** The repo is private on a Free personal plan. CI builds the full site, runs the entire test
pyramid, and uploads `dist/` as a workflow artifact on every push. The Pages deploy job exists in
`ci.yml` but is gated off. Going live = flip the repo public, enable Pages (source: GitHub Actions), and
remove the gate.

**Why.** Verified June 2026: GitHub Pages cannot publish from a private repo on the Free plan; even on Pro
the *published site* is world-readable (only the source stays private). The user chose private-first at
zero cost over public-from-day-one or paying for Pro. Local preview: `pnpm build && pnpm preview` in
`site/`.

**Consequences.** `astro.config.mjs` already carries `site` + `base: '/Mechanic'` so the eventual Pages
URL is correct from the first deploy; all links go through `import.meta.env.BASE_URL` from day one.
