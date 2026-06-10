/**
 * E2E invariants against the built site. Golden numbers are hand-derivable:
 *
 * Planetary (ring-fixed, defaults N_s=24, N_p=18, ω_s=10 rad/s, T_s=100 N·m):
 *   N_r = 24 + 2·18 = 60;  ω_c = 10·24/84 = 2.8571 rad/s (ratio 3.5:1)
 *   T_r = 100·60/24 = 250 N·m;  T_c = −100·84/24 = −350 N·m
 *
 * Beam (defaults P=500 N, L=1 m, b=30 mm, h=50 mm → I=3.125e-7 m⁴, σ=40 MPa):
 *   A36 steel (E=199.95 GPa, σ_y=248.2 MPa): δ=2.667 mm, SF=6.21
 *   Ti-6Al-4V (E=110.3 GPa,  σ_y=868.7 MPa): δ=4.834 mm, SF=21.7
 *   → THE pillar-3 assertion: the "stronger" material deflects MORE
 *     while its safety factor is HIGHER. Stiffness ≠ strength.
 */
import { expect, test, type Page } from "@playwright/test";

async function readOutput(page: Page, symbol: string): Promise<number> {
  const text = await page.locator(`[data-output="${symbol}"] output`).innerText();
  const value = Number.parseFloat(text.replace(/,/g, ""));
  expect(text, `${symbol} readout should be numeric, got '${text}'`).not.toBe("—");
  return value;
}

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));
  return errors;
}

test("planetary gearset computes the Willis ring-fixed goldens", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/planetary-gearset/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  expect(await readOutput(page, "N_r")).toBe(60);
  expect(await readOutput(page, "omega_c")).toBeCloseTo(2.8571, 3);
  expect(await readOutput(page, "T_r")).toBeCloseTo(250, 5);
  expect(await readOutput(page, "T_c")).toBeCloseTo(-350, 5);
  expect(errors).toEqual([]);
});

test("planetary configurations are different knob sets over the same relations", async ({ page }) => {
  await page.goto("things/planetary-gearset/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  // carrier-fixed: ω_r = −ω_s·N_s/N_r = −10·24/60 = −4 (reversal — the star gear)
  await page.getByTestId("config-select").selectOption("carrier-fixed");
  expect(await readOutput(page, "omega_r")).toBeCloseTo(-4, 3);

  // general (differential action): two speed knobs now exist
  await page.getByTestId("config-select").selectOption("general");
  await expect(page.locator("#knob-omega_r")).toBeVisible();
  expect(await readOutput(page, "omega_c")).toBeCloseTo((10 * 24 + 0 * 60) / 84, 3);
});

test("beam material cascade: Ti-6Al-4V deflects MORE than A36 steel yet has a HIGHER safety factor", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/cantilever-beam/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  await page.getByTestId("material-select").selectOption("steel-a36");
  const deltaSteel = await readOutput(page, "delta"); // mm
  const sfSteel = await readOutput(page, "SF");
  const massSteel = await readOutput(page, "m_beam");
  expect(deltaSteel).toBeCloseTo(2.667, 2);
  expect(sfSteel).toBeCloseTo(6.21, 1);

  await page.getByTestId("material-select").selectOption("ti-6al-4v");
  const deltaTi = await readOutput(page, "delta");
  const sfTi = await readOutput(page, "SF");
  const massTi = await readOutput(page, "m_beam");

  expect(deltaTi).toBeGreaterThan(deltaSteel); // stiffness ≠ strength, part 1
  expect(sfTi).toBeGreaterThan(sfSteel); //       stiffness ≠ strength, part 2
  expect(massTi).toBeLessThan(massSteel);
  expect(deltaTi).toBeCloseTo(4.834, 2);
  expect(errors).toEqual([]);
});

test("validity envelope fires as a visible warning, not a silent wrong number", async ({ page }) => {
  await page.goto("things/cantilever-beam/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  // drive the load to the max on a soft material: nylon yields long before 5 kN
  await page.getByTestId("material-select").selectOption("nylon-66");
  await page.locator("#knob-P").fill("5000");
  await expect(page.locator(".validity-warn, .validity-invalid").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/yield/i);
});

test("derivations and equations render as KaTeX with MathML", async ({ page }) => {
  await page.goto("things/planetary-gearset/");
  expect(await page.locator(".katex").count()).toBeGreaterThan(5);
  expect(await page.locator(".katex math").count()).toBeGreaterThan(0); // screen-reader MathML
});
