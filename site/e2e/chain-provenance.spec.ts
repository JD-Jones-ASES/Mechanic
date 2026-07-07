/**
 * S24 — provenance disclosures + assumptions-in-play panel. Runs against the
 * BUILT dist (astro preview). A NEW spec file: the S21/S22/S23 specs stay
 * byte-identical (the brief forbids touching them).
 *
 * Anchor chain = the demo's ring-fixed planetary → torsion shaft (defaults
 * N_s=24, N_p=18, T_s=100 N·m, ω_s=10 rad/s):
 *   T_out = 100·(1 + 60/24) = 350 N·m crosses the T_out → T wire, so the shaft's
 *   τ = 16·350/(π·0.04³) = 27.852 MPa depends on BOTH the shaft's own torsion
 *   relation (cited Gere) AND the planetary torque path (torque-balance, cited
 *   Shigley) reached through that wire. The provenance disclosure must name both.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoSerious(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
  expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`)).toEqual([]);
}

async function addNode(page: Page, value: string) {
  await page.getByTestId("node-picker").selectOption(value);
  await page.getByTestId("add-node").press("Enter");
}

async function connect(page: Page, from: [string, string], to: [string, string]) {
  await page.getByTestId("wire-from-node").selectOption(from[0]);
  await page.getByTestId("wire-from-port").selectOption(from[1]);
  await page.getByTestId("wire-to-node").selectOption(to[0]);
  await page.getByTestId("wire-to-port").selectOption(to[1]);
  await page.getByTestId("wire-connect").press("Enter");
}

test("a downstream readout's provenance traces to BOTH citations, naming the upstream instance and port", async ({
  page,
}) => {
  await page.goto("chain-demo/");
  await expect(page.getByTestId("chain-demo")).toHaveAttribute("data-ready", "true");

  const trail = page.getByTestId("prov-torsion-shaft-tau");
  // collapsed by default (render-on-open): the body is not in the DOM until opened
  await expect(trail.locator(".prov-body")).toHaveCount(0);

  // open the top level: the shaft's OWN relations + citation (Gere) appear
  await trail.locator("summary.prov-summary").click();
  await expect(trail).toContainText("shear-stress"); // shaft torsion relation id
  await expect(trail).toContainText(/Gere/); // shaft torsion citation

  // the shaft has TWO bound inputs (T ← T_out, ω ← ω_c) — node granularity shows
  // both; scope to the torque wire. Its summary names the upstream port + value.
  const input = trail.locator("details.prov-input").filter({ hasText: "T_out" });
  await expect(input).toContainText("T_out"); // upstream OUTPUT port
  await expect(input).toContainText(/planetary/i); // upstream instance / THING title
  await expect(input).toContainText("350"); // the SI value that crossed the wire (N·m)

  // expand the wire: the planetary's torque-balance relation + its citation (Shigley)
  await input.locator("summary").first().click();
  await expect(trail).toContainText("torque-balance"); // planetary relation id
  await expect(trail).toContainText(/Shigley/); // planetary torque-balance citation
});

test("provenance is built from the CURRENT evaluation, not a stale closure", async ({ page }) => {
  await page.goto("chain-demo/");
  await expect(page.getByTestId("chain-demo")).toHaveAttribute("data-ready", "true");

  // change a knob BEFORE opening the disclosure: T_s 100 → 200 doubles T_out to 700
  await page.locator("#knob-T_s").fill("200");

  const trail = page.getByTestId("prov-torsion-shaft-tau");
  await trail.locator("summary.prov-summary").click();
  const input = trail.locator("details.prov-input").filter({ hasText: "T_out" });
  // render-on-open must read the post-edit value (700), never the mount-time 350
  await expect(input).toContainText("700");
  await expect(input).not.toContainText("350");

  // an ALREADY-OPEN disclosure must also update live on a further edit
  await page.locator("#knob-T_s").fill("300");
  await expect(input).toContainText("1050"); // 300 × 3.5
});

test("the assumptions panel lists each node's assumptions and shows a tripped refusal with severity", async ({
  page,
}) => {
  await page.goto("chain-builder/");
  await addNode(page, "disk-clutch::analyze"); // n1 (T_up out; refuses when r_i ≥ r_o)
  await addNode(page, "torsion-shaft::torque-in"); // n2
  await expect(page.getByTestId("chain-builder")).toHaveAttribute("data-ready", "true");
  await connect(page, ["n1", "T_up"], ["n2", "T"]);

  const panel = page.getByTestId("assumptions-panel");
  // a known relation assumption of the shaft is aggregated into the panel
  await expect(panel).toContainText(/solid circular cross-section/i);
  // healthy chain: no invalid flags yet
  await expect(panel.locator('[data-severity="invalid"]')).toHaveCount(0);

  // drive the clutch past its envelope (r_i = 150 mm > r_o = 100 mm): global refusal
  await page.locator("#knob-n1-r_i").fill("150");

  // the refusal appears in the panel at severity invalid — never hidden (invariant 5):
  //  - the clutch's own reason (…inner radius…), and
  //  - the shaft's withheld-input reason (refused by upstream)
  const invalids = panel.locator('[data-severity="invalid"]');
  await expect(invalids.first()).toBeVisible();
  await expect(panel).toContainText(/inner radius/i);
  await expect(panel).toContainText(/refused by upstream/i);
});

test("axe: provenance disclosures + assumptions panel are accessible on all three pages", async ({
  page,
}) => {
  // chain-demo with a provenance disclosure fully expanded (covers the new DOM)
  await page.goto("chain-demo/");
  await expect(page.getByTestId("chain-demo")).toHaveAttribute("data-ready", "true");
  const demoTrail = page.getByTestId("prov-torsion-shaft-tau");
  await demoTrail.locator("summary.prov-summary").click();
  await demoTrail.locator("details.prov-input summary").first().click();
  await expectNoSerious(page);

  // chain-builder with a chain, an open trail, and the assumptions panel present
  await page.goto("chain-builder/");
  await addNode(page, "planetary-gearset::ring-fixed");
  await addNode(page, "torsion-shaft::torque-in");
  await expect(page.getByTestId("chain-builder")).toHaveAttribute("data-ready", "true");
  await connect(page, ["n1", "T_out"], ["n2", "T"]);
  await page.getByTestId("prov-n2-tau").locator("summary.prov-summary").click();
  await page.getByTestId("prov-n2-tau").locator("details.prov-input summary").first().click();
  await expectNoSerious(page);

  // the verification page (new chaining section)
  await page.goto("verification/");
  await expectNoSerious(page);
});
