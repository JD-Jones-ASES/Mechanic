/**
 * THING-page wayfinding (D2, ADR-0010 §4), against the built dist. All of it is
 * static build-time HTML derived from the compiled artifacts + taxonomy — these
 * pins guard the derivation, above all the honesty of "chains with": the wires
 * shown are real `connectionLegal` verdicts, not a hand-authored list.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("chains-with is connectionLegal-driven, not hand-listed", async ({ page }) => {
  await page.goto("things/planetary-gearset/");

  // the block lists a card linking to a legal downstream THING...
  await expect(page.locator('.chains-target-link[href*="/things/torsion-shaft/"]')).toBeVisible();

  // ...and the SPECIFIC legal wires the engine accepts (torque→torque, speed→speed):
  await expect(page.locator('[data-wire="T_out|torsion-shaft|T"]')).toHaveCount(1);
  await expect(page.locator('[data-wire="omega_c|torsion-shaft|omega"]')).toHaveCount(1);

  // ...while the KIND-MISMATCH wire from the SAME output port is absent — angular
  // velocity and torque share no quantity kind, so connectionLegal rejects it. A
  // hand-listed block could never get this distinction exactly right; the engine does.
  await expect(page.locator('[data-wire="omega_c|torsion-shaft|T"]')).toHaveCount(0);

  // the wires carry the invariant-2 provenance, not prose
  await expect(page.locator("#chains-heading")).toBeVisible();
  await expect(page.getByText(/connectionLegal/).first()).toBeVisible();
});

test("related THINGs surfaces same-topic siblings", async ({ page }) => {
  await page.goto("things/cantilever-beam/");
  await expect(page.getByRole("heading", { name: "Related THINGs" })).toBeVisible();
  // cantilever-beam lives in Beams & Plates; a same-topic sibling must be offered.
  // Related cards use .thing-card-link (chains uses .chains-target-link), so this is
  // unambiguously a related card, not a chain target.
  await expect(
    page.locator('.wayfinding .thing-card-link[href*="/things/simply-supported-beam/"]'),
  ).toBeVisible();
});

test("prev/next walks the spine, including across a category boundary", async ({ page }) => {
  // pressure-vessel is the LAST Mechanics-of-Materials THING (Thin-Walled…, last in
  // Pressure & Rotating Bodies); its next crosses into Machine Design → belt-drive
  // (first of Gears & Drives). This is the D1 SPINE_ORDER boundary at index 21→22.
  await page.goto("things/pressure-vessel/");
  const next = page.locator(".thing-nav-next");
  await expect(next).toHaveAttribute("href", /\/things\/belt-drive\/$/);
  await expect(next).toHaveAttribute("rel", "next");

  // the reverse edge agrees: belt-drive's prev points back across the boundary
  await page.goto("things/belt-drive/");
  const prev = page.locator(".thing-nav-prev");
  await expect(prev).toHaveAttribute("href", /\/things\/pressure-vessel\/$/);
  await expect(prev).toHaveAttribute("rel", "prev");

  // the ends of the spine have no wrap-around: first THING no prev, last no next
  await page.goto("things/composite-bar/"); // spine index 0
  await expect(page.locator(".thing-nav-prev")).toHaveCount(0);
  await expect(page.locator(".thing-nav-next")).toHaveCount(1);
  await page.goto("things/torsional-oscillator/"); // spine index 35 (last)
  await expect(page.locator(".thing-nav-next")).toHaveCount(0);
  await expect(page.locator(".thing-nav-prev")).toHaveCount(1);
});

test("verification badge counts match the /verification/ block for the same THING", async ({ page }) => {
  const slug = "cantilever-beam";
  await page.goto(`things/${slug}/`);
  const badge = page.locator(".verify-badge");
  await expect(badge).toBeVisible();
  await expect(badge).toHaveAttribute("href", new RegExp(`/verification/#${slug}$`));
  const badgeNum = async (key: string) =>
    Number.parseInt(await badge.locator(`[data-badge="${key}"]`).innerText(), 10);
  const rel = await badgeNum("relations");
  const idn = await badgeNum("identities");
  const mod = await badgeNum("modeling");
  const smp = await badgeNum("samples");
  expect(rel).toBeGreaterThan(0); // sanity: the badge actually rendered numbers

  // the per-THING verification block (now anchored id={slug}) shows the same audit
  await page.goto(`verification/#${slug}`);
  const section = page.locator(`section.relation-block#${slug}`);
  await expect(section).toHaveCount(1);
  const line = await section.locator("p.citation").first().innerText();
  const grab = (re: RegExp) => {
    const m = line.match(re);
    expect(m, `expected ${re} in "${line}"`).not.toBeNull();
    return Number.parseInt(m![1]!, 10);
  };
  expect(grab(/(\d+) relations/)).toBe(rel);
  expect(grab(/(\d+) identities proven/)).toBe(idn);
  expect(grab(/(\d+) modeling step/)).toBe(mod);
  expect(grab(/(\d+) parity samples/)).toBe(smp);
});

test("material chips link to the materials page rows", async ({ page }) => {
  await page.goto("things/cantilever-beam/");
  const chips = page.locator(".material-chip");
  expect(await chips.count()).toBeGreaterThan(0);
  const href = await chips.first().getAttribute("href");
  expect(href).toMatch(/\/materials\/#[a-z0-9-]+$/);

  // the anchored row actually exists on the materials page (the D2 additive id)
  const id = href!.split("#")[1]!;
  await page.goto("materials/");
  await expect(page.locator(`tr#${id}`)).toHaveCount(1);
});

test("axe: a wayfinding-rich THING page has no serious/critical violations", async ({ page }) => {
  await page.goto("things/planetary-gearset/");
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
  expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`)).toEqual([]);
});
