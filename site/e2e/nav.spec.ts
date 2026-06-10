/**
 * Navigation click-through. The original suite navigated to pages DIRECTLY
 * (page.goto), so every internal href could be broken without a single test
 * noticing — which is exactly what happened: BASE_URL carries no trailing
 * slash, `${base}things/` rendered as /Mechanicthings/, and the whole nav
 * 404'd in a real browser while 17 e2e tests passed. These tests click the
 * actual links a user clicks.
 */
import { expect, test, type Page } from "@playwright/test";

async function expectNot404(page: Page) {
  await expect(page.locator("h1")).not.toContainText("404");
}

test("header navigation links resolve from the home page", async ({ page }) => {
  await page.goto("");
  await page.getByRole("link", { name: "Things", exact: true }).click();
  await expect(page).toHaveURL(/\/Mechanic\/things\/$/);
  await expectNot404(page);

  await page.getByRole("link", { name: "Materials", exact: true }).click();
  await expect(page).toHaveURL(/\/Mechanic\/materials\/$/);
  await expectNot404(page);

  await page.getByRole("link", { name: "About", exact: true }).click();
  await expect(page).toHaveURL(/\/Mechanic\/about\/$/);
  await expectNot404(page);

  await page.getByRole("link", { name: "Mechanic", exact: true }).click();
  await expect(page).toHaveURL(/\/Mechanic\/$/);
  await expectNot404(page);
});

test("catalog cards link to real THING pages", async ({ page }) => {
  await page.goto("things/");
  await page.getByRole("link", { name: /Cantilever Beam/ }).click();
  await expect(page).toHaveURL(/\/Mechanic\/things\/cantilever-beam\/$/);
  await expect(page.getByTestId("thing-widget")).toBeVisible();
});

test("every internal href on home and catalog pages returns a page, not a 404", async ({ page, request }) => {
  const seen = new Set<string>();
  for (const start of ["", "things/"]) {
    await page.goto(start);
    const hrefs = await page.locator("a[href^='/']").evaluateAll((as) =>
      as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!),
    );
    for (const href of hrefs) {
      const path = href.split("#")[0]!;
      if (!path || seen.has(path)) continue;
      seen.add(path);
      const res = await request.get(`http://localhost:4321${path}`);
      expect(res.status(), `${href} (linked from /${start})`).toBeLessThan(400);
      // astro preview serves the 404 page with status 200 for unknown dirs in
      // some hosts' fallbacks — assert on content too
      const body = await res.text();
      expect(body.includes("404 — no such thing"), `${href} body looks like the 404 page`).toBe(false);
    }
  }
  expect(seen.size).toBeGreaterThan(8); // sanity: the sweep actually swept
});
