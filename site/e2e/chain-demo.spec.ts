/**
 * Chaining demo invariants. Goldens are hand-derivable from the two THINGs'
 * verified relations (ring-fixed planetary defaults N_s=24, N_p=18, T_s=100
 * N·m, ω_s=10 rad/s):
 *   ratio 1 + N_r/N_s = 3.5 ⇒ T_out = 350 N·m, ω_c = 2.857 rad/s
 *   shaft (d=40 mm): τ = 16·350/(π·0.04³) = 27.852 MPa
 *   P = T·ω = 350 × 2.857 = 1000 W — exactly the input power 100 × 10:
 *   the conservation law survives the wiring.
 */
import { expect, test, type Page } from "@playwright/test";

async function readOutput(page: Page, symbol: string): Promise<number> {
  const text = await page.locator(`[data-output="${symbol}"] output`).innerText();
  expect(text, `${symbol} readout should be numeric, got '${text}'`).not.toBe("—");
  return Number.parseFloat(text.replace(/,/g, ""));
}

test("gearbox output drives the shaft; power survives the chain", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  await page.goto("chain-demo/");
  await expect(page.getByTestId("chain-demo")).toHaveAttribute("data-ready", "true");

  expect(await readOutput(page, "T_out")).toBeCloseTo(350, 1); // 3.5 × 100 N·m
  expect(await readOutput(page, "tau")).toBeCloseTo(27.852, 1); // MPa, from the BOUND torque
  expect(await readOutput(page, "P_w")).toBeCloseTo(1, 3); // kW — equals input T_s·ω_s = 1000 W

  // crank the sun torque: the consequence lands two THINGs downstream
  await page.locator("#knob-T_s").fill("200");
  expect(await readOutput(page, "T_out")).toBeCloseTo(700, 1);
  expect(await readOutput(page, "tau")).toBeCloseTo(55.704, 1);
  expect(errors).toEqual([]);
});

test("the legality table shows real engine rejections", async ({ page }) => {
  await page.goto("chain-demo/");
  // build-time verdicts from connectionLegal(): both rejection modes on display
  // (.table-scroll scopes past the MaterialPicker's bound-properties table)
  const legality = page.locator(".table-scroll table");
  await expect(legality).toContainText(/dimension mismatch/i);
  await expect(legality).toContainText(/quantity kind mismatch/i);
  expect(await page.locator(".chain-ok").count()).toBeGreaterThanOrEqual(2); // two legal wires
});
