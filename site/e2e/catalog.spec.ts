/**
 * Catalog structure + search (D1, ADR-0010 §1–§3), against the built dist.
 *
 * The catalog is static HTML grouped by course-spine category → topic →
 * alphabetical-by-title. These pins assert the WHOLE catalog renders once, in
 * spine order, on BOTH catalog surfaces (home and /things/) from the one shared
 * component — the anti-drift guarantee. Search is Pagefind's own UI, present only
 * on the catalog pages (THING pages keep their page weight).
 */
import { expect, test, type Page } from "@playwright/test";

// The 37 slugs in ADR-0010 spine order: category (MoM → MD → Mechanisms), then
// topic in the ADR's listed order, then alphabetical by title within a topic.
const SPINE_ORDER = [
  // Mechanics of Materials — Axial, Thermal & Impact
  "composite-bar", "impact-loading", "two-bar-truss", "thermal-assembly",
  // Mechanics of Materials — Beams & Plates
  "cantilever-beam", "circular-plate", "curved-beam", "fixed-fixed-beam",
  "propped-cantilever", "simply-supported-beam", "beam-shear-flow",
  // Mechanics of Materials — Torsion & Combined Loading
  "fixed-fixed-torsion-shaft", "rectangular-shaft-torsion", "torsion-shaft",
  "combined-shaft", "thin-tube-torsion",
  // Mechanics of Materials — Columns & Stability
  "eccentric-column", "euler-column",
  // Mechanics of Materials — Pressure & Rotating Bodies
  "compound-cylinder", "rotating-disk-bore", "thick-walled-cylinder", "pressure-vessel",
  // Machine Design — Gears & Drives
  "belt-drive", "planetary-gearset", "power-screw", "spur-gear-pair",
  // Machine Design — Shafts & Bearings
  "ball-bearing-life", "shaft-critical-speed", "stepped-shaft-fillet",
  // Machine Design — Joints, Springs & Clutches
  "disk-clutch", "bolted-joint-gasket", "helical-spring",
  // Mechanisms, Dynamics & Vibration (no topic)
  "dc-motor", "flywheel-disk", "fourbar-linkage", "slider-crank", "torsional-oscillator",
];

const TOPIC_HEADS = [
  "Axial, Thermal & Impact", "Beams & Plates", "Torsion & Combined Loading",
  "Columns & Stability", "Pressure & Rotating Bodies",
  "Gears & Drives", "Shafts & Bearings", "Joints, Springs & Clutches",
];

async function cardSlugs(page: Page): Promise<string[]> {
  return page.locator(".thing-card .thing-card-link").evaluateAll((as) =>
    as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!.match(/\/things\/([^/]+)\//)![1]),
  );
}

for (const surface of ["", "things/"]) {
  test(`catalog on /${surface} renders all 37 THINGs once, in spine order`, async ({ page }) => {
    await page.goto(surface);

    // category sections in spine order
    const cats = await page
      .locator(".cat-section")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-category")));
    expect(cats).toEqual(["mechanics-of-materials", "machine-design", "mechanisms-dynamics"]);

    // every THING exactly once, in the exact spine order (also proves no drift
    // between the home and /things/ renders — same shared component)
    const slugs = await cardSlugs(page);
    expect(slugs).toEqual(SPINE_ORDER);
    expect(new Set(slugs).size).toBe(37);

    // topic subheads present, in order (mechanisms-dynamics has none)
    const topics = await page
      .locator(".topic-title")
      .evaluateAll((els) => els.map((e) => e.textContent!.trim()));
    expect(topics).toEqual(TOPIC_HEADS);
  });
}

test("catalog search returns a known THING and excludes the listing pages (Pagefind UI, built dist)", async ({ page }) => {
  await page.goto("");
  // the search UI is wired on the catalog page and its script loaded
  expect(await page.locator("script[src*='pagefind']").count()).toBeGreaterThan(0);
  const input = page.locator(".catalog-search input[type='text']");
  await expect(input).toBeVisible();

  await input.fill("planetary");
  // Pagefind loads its index async + debounces; a result link to the THING appears
  const hit = page.locator(".catalog-search a[href*='/things/planetary-gearset/']");
  await expect(hit.first()).toBeVisible({ timeout: 15_000 });

  // the catalog LISTING pages (home `/`, `/things/`) are data-pagefind-ignore'd on
  // their grids, so a THING term no longer returns them as noise — their indexed
  // content (hero / intro) doesn't carry the term. THING pages stay findable.
  const pathnames = await page
    .locator(".catalog-search .pagefind-ui__result-link")
    .evaluateAll((as) => as.map((a) => new URL((a as HTMLAnchorElement).href).pathname));
  expect(pathnames.length).toBeGreaterThan(0); // results actually rendered
  expect(pathnames).not.toContain("/Mechanic/"); // home listing gone from results
  expect(pathnames).not.toContain("/Mechanic/things/"); // catalog listing gone too
});

test("THING pages carry no catalog search script — page weight unchanged", async ({ page }) => {
  await page.goto("things/cantilever-beam/");
  await expect(page.getByTestId("thing-widget")).toBeVisible();
  // the Pagefind UI is confined to the catalog pages (ADR-0010 §3)
  expect(await page.locator("script[src*='pagefind']").count()).toBe(0);
  expect(await page.locator("#search").count()).toBe(0);
});
