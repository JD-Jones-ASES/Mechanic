/**
 * Prose-math integrity against the built site: no page may ship a KaTeX error
 * block or leak raw $$ delimiters into rendered text. Pins the failure class
 * that reached production on 2026-06-10 (a display block wrapped across
 * source lines swallowed the rest of four overviews into red error text) —
 * the build gates (check-mdx-math, throwOnError) should make this test
 * unreachable, which is exactly why it exists.
 */
import { expect, test } from "@playwright/test";

test("every THING page renders its prose math without KaTeX errors or raw $$", async ({ page }) => {
  await page.goto("things/");
  const slugs = await page
    .locator("a[href*='/things/']")
    .evaluateAll((as) =>
      [...new Set(as.map((a) => (a as HTMLAnchorElement).pathname))].filter((p) =>
        /\/things\/[^/]+\/$/.test(p),
      ),
    );
  expect(slugs.length).toBeGreaterThanOrEqual(14); // the catalog, not a stub list

  for (const path of slugs) {
    await page.goto(path);
    const errors = await page.locator(".katex-error, [class*='katex-error']").count();
    expect(errors, `${path} ships a KaTeX error block`).toBe(0);
    const article = (await page.locator("article").innerText()).slice(0, 20000);
    expect(article.includes("$$"), `${path} leaks raw $$ into rendered prose`).toBe(false);
  }
});
