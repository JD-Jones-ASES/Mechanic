/**
 * /chain-builder/ invariants (S22). Runs against the BUILT dist (astro preview).
 *
 * Conservation golden (hand-derived from the two THINGs' verified relations;
 * ring-fixed planetary defaults N_s=24, N_p=18, ω_s=10 rad/s, T_s=100 N·m):
 *   N_r = N_s + 2·N_p = 60;  reduction 1 + N_r/N_s = 3.5
 *   ⇒ T_out = 100·3.5 = 350 N·m,  ω_c = 10/3.5 = 2.857 rad/s
 *   shaft (torque-in, wired T=350, ω=2.857): P = T·ω = 350·2.857 = 1000 W = 1 kW
 *     — exactly the planetary input power T_s·ω_s = 100·10 = 1000 W: the
 *     conservation law survives the wiring (the point of verified chaining).
 *   shaft τ = 16·T/(π·d³), d=40 mm = 16·350/(π·0.04³) = 27.852 MPa (from the
 *     BOUND torque, so it also proves T_out crossed the wire).
 * The flywheel is fed the SAME ω_c (fan-out) and must evaluate — the third node.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function addNode(page: Page, value: string) {
  await page.getByTestId("node-picker").selectOption(value);
  await page.getByTestId("add-node").press("Enter"); // keyboard activation (ADR-0006)
}

async function connect(page: Page, from: [string, string], to: [string, string]) {
  await page.getByTestId("wire-from-node").selectOption(from[0]);
  await page.getByTestId("wire-from-port").selectOption(from[1]);
  await page.getByTestId("wire-to-node").selectOption(to[0]);
  await page.getByTestId("wire-to-port").selectOption(to[1]);
  await page.getByTestId("wire-connect").press("Enter");
}

async function readNum(page: Page, nodeId: string, sym: string): Promise<number> {
  const loc = page.getByTestId(`node-${nodeId}`).locator(`[data-output="${sym}"] output`);
  const text = await loc.innerText();
  expect(text, `${nodeId}.${sym} readout should be numeric, got '${text}'`).not.toBe("—");
  return Number.parseFloat(text.replace(/,/g, ""));
}

const ready = (page: Page) =>
  expect(page.getByTestId("chain-builder")).toHaveAttribute("data-ready", "true");

test("keyboard-only 3-node build: power is conserved through the chain", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("chain-builder/");

  await addNode(page, "planetary-gearset::ring-fixed"); // n1
  await addNode(page, "torsion-shaft::torque-in"); // n2
  await addNode(page, "flywheel-disk::speed-in"); // n3
  await ready(page);
  await expect(page.getByTestId("node-count")).toHaveText("3 / 6 nodes");

  // planetary T_out → shaft T, and ω_c fans out to BOTH shaft ω and flywheel ω
  await connect(page, ["n1", "T_out"], ["n2", "T"]);
  await connect(page, ["n1", "omega_c"], ["n2", "omega"]);
  await connect(page, ["n1", "omega_c"], ["n3", "omega"]);
  await expect(page.getByTestId("wire-row")).toHaveCount(3);
  await ready(page);

  expect(await readNum(page, "n1", "T_out")).toBeCloseTo(350, 1); // 3.5 × 100 N·m
  expect(await readNum(page, "n2", "tau")).toBeCloseTo(27.852, 1); // MPa, from the BOUND torque
  expect(await readNum(page, "n2", "P_w")).toBeCloseTo(1, 3); // kW — equals input T_s·ω_s = 1 kW
  expect(await readNum(page, "n3", "E_k")).toBeGreaterThan(0); // fan-out reached the third node

  // driving the sun torque lands two THINGs downstream
  await page.locator("#knob-n1-T_s").fill("200");
  expect(await readNum(page, "n1", "T_out")).toBeCloseTo(700, 1);
  expect(await readNum(page, "n2", "tau")).toBeCloseTo(55.704, 1);
  expect(await readNum(page, "n2", "P_w")).toBeCloseTo(2, 3); // 200·10 = 2 kW, still conserved
  expect(errors).toEqual([]);
});

test("wiring re-orders the nodes into planner evaluation order", async ({ page }) => {
  await page.goto("chain-builder/");
  await addNode(page, "torsion-shaft::torque-in"); // n1 added first
  await addNode(page, "planetary-gearset::ring-fixed"); // n2 added second
  await ready(page);

  const cards = page.locator(".cb-node");
  // before wiring: DOM order == add order (n1 shaft, n2 planetary)
  await expect(cards.nth(0)).toHaveAttribute("data-testid", "node-n1");

  // wire planetary → shaft: the planetary must now evaluate FIRST, so the cards flip
  await connect(page, ["n2", "T_out"], ["n1", "T"]);
  await expect(cards.nth(0)).toHaveAttribute("data-testid", "node-n2"); // planetary now first
  await expect(cards.nth(1)).toHaveAttribute("data-testid", "node-n1");
});

test("illegal wires are rejected with the engine's real reason strings", async ({ page }) => {
  await page.goto("chain-builder/");
  await addNode(page, "planetary-gearset::ring-fixed"); // n1
  await addNode(page, "euler-column::any-end"); // n2 (K is an input here)
  await ready(page);

  // torque → ratio: different dimension
  await connect(page, ["n1", "T_out"], ["n2", "K"]);
  await expect(page.getByTestId("wire-error")).toContainText(/dimension mismatch/i);

  // tooth count → ratio: SAME (zero) dimension, different quantity kind
  await connect(page, ["n1", "N_r"], ["n2", "K"]);
  await expect(page.getByTestId("wire-error")).toContainText(
    /quantity kind mismatch: count → ratio/i,
  );
  await expect(page.getByTestId("wire-row")).toHaveCount(0); // neither wire was added
});

test("a wire that would close a feedback loop is rejected; duplicate instances keep distinct knobs", async ({
  page,
}) => {
  await page.goto("chain-builder/");
  await addNode(page, "torsion-shaft::torque-in"); // n1 (outputs P_w)
  await addNode(page, "torsion-shaft::power-in"); // n2 (P_w in, T out) — SAME THING twice
  await ready(page);

  // the two instances have independent, uniquely-id'd knobs (idPrefix)
  await expect(page.locator("#knob-n1-d")).toBeVisible();
  await expect(page.locator("#knob-n2-d")).toBeVisible();

  await connect(page, ["n1", "P_w"], ["n2", "P_w"]); // legal power → power
  await expect(page.getByTestId("wire-row")).toHaveCount(1);

  await connect(page, ["n2", "T"], ["n1", "T"]); // would close n1 → n2 → n1
  await expect(page.getByTestId("wire-error")).toContainText(/feedback loop/i);
  await expect(page.getByTestId("wire-row")).toHaveCount(1); // still just the one legal wire
});

test("an upstream refusal withholds the downstream node's readouts", async ({ page }) => {
  await page.goto("chain-builder/");
  await addNode(page, "disk-clutch::analyze"); // n1 (T_up out; global refusal when r_i ≥ r_o)
  await addNode(page, "torsion-shaft::torque-in"); // n2
  await ready(page);

  await connect(page, ["n1", "T_up"], ["n2", "T"]); // torque → torque
  await ready(page);
  expect(await readNum(page, "n2", "P_w")).toBeGreaterThan(0); // healthy while the clutch is valid

  // drive the clutch past its envelope: r_i = 150 mm > r_o = 100 mm → global refusal
  await page.locator("#knob-n1-r_i").fill("150");

  // the clutch refuses locally…
  await expect(page.getByTestId("node-n1")).toHaveAttribute("data-node-state", "refused");
  await expect(page.getByTestId("node-n1")).toContainText(/inner radius/i);
  // …and the withheld torque refuses the shaft downstream (S21's distinct text)
  await expect(page.getByTestId("node-n2")).toHaveAttribute("data-node-state", "refused-upstream");
  await expect(page.getByTestId("node-n2")).toContainText(/refused by upstream/i);
  expect(
    await page.getByTestId("node-n2").locator('[data-output="P_w"] output').innerText(),
  ).toBe("—"); // no plausible wrong number crossed the wire (invariant 5)
});

test("axe: no serious/critical violations on a built chain", async ({ page }) => {
  await page.goto("chain-builder/");
  await addNode(page, "planetary-gearset::ring-fixed");
  await addNode(page, "torsion-shaft::torque-in");
  await ready(page);
  await connect(page, ["n1", "T_out"], ["n2", "T"]);
  await ready(page);

  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
  expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`)).toEqual([]);
});
