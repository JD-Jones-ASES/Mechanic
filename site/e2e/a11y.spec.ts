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
  "things/propped-cantilever/", // S15: a new sim component (ProppedCantileverSim)
  "things/fixed-fixed-beam/", // S16: new sim component (FixedFixedBeamSim)
  "things/fixed-fixed-torsion-shaft/", // S16: new sim component (FixedFixedShaftSim)
  "things/composite-bar/", // S17: TWO labelled material selects (core + sleeve) + new sim (CompositeBarSim)
  "things/bolted-joint-gasket/", // S19: new sim (BoltedJointSim) + a NO-material-picker page (direct-stiffness inputs)
  "materials/",
  "verification/",
  "things/", // D1: redesigned catalog (category sections + Pagefind search UI)
  "", // D1: redesigned home (hero + stats + search + category sections)
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
