// @ts-check
import mdx from "@astrojs/mdx";
import preact from "@astrojs/preact";
import { defineConfig } from "astro/config";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

// GitHub Pages project page (ADR-0004): deploy job is dormant until the repo
// goes public, but the base path is correct from day one. All internal links
// must go through import.meta.env.BASE_URL.
export default defineConfig({
  site: "https://jd-jones-ases.github.io",
  base: "/Mechanic",
  integrations: [preact(), mdx()],
  markdown: {
    // Build-time KaTeX for .md/.mdx prose math — zero client JS (path a of
    // three; see docs/architecture.md "KaTeX three paths"). throwOnError makes
    // a TeX error FAIL the build instead of shipping a red .katex-error block —
    // four live pages shipped that way once (a display block wrapped across
    // source lines swallows the rest of the file); check-mdx-math.mjs catches
    // the structural form, this catches the TeX itself.
    remarkPlugins: [remarkMath],
    rehypePlugins: [[rehypeKatex, { throwOnError: true }]],
  },
});
