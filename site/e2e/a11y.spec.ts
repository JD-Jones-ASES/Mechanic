/**
 * Accessibility smoke (ADR-0006): axe-core over the THING template page and
 * the materials page; serious/critical violations fail the build.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const path of [
  "things/cantilever-beam/",
  "things/fourbar-linkage/",
  "things/flywheel-disk/",
  "things/thick-walled-cylinder/",
  "materials/",
  "verification/",
  "",
]) {
  test(`axe smoke: /${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    );
    expect(
      serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`),
    ).toEqual([]);
  });
}
