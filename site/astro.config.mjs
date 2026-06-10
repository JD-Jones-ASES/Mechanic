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
    // three; see docs/architecture.md "KaTeX three paths").
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});
