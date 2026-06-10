# ADR-0006: Accessibility — WCAG 2.2 AA intent, enforced by CI smoke

**Status:** accepted

**Decision.** Target WCAG 2.2 AA. Concretely: widgets use native form controls (`<input type="range">`,
`<select>`) — no custom slider divs; all interactions keyboard-operable; validity/branch state announced
via `aria-live`; KaTeX keeps its parallel MathML output for screen readers; SVG sims carry titles/desc and
respect `prefers-reduced-motion` (animations become scrubbing, never autoplay); visible focus and AA
contrast in both themes. CI runs an axe-core smoke pass (via Playwright) on the THING template page and
fails on serious/critical violations.

**Why.** An undergraduate reference will be used inside university courses where Section 508/EN 301 549
conformance is expected, and the cheap time to build it in is before the widget API ossifies.
