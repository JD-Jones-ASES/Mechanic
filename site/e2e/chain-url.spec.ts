/**
 * Shareable chain URLs (S23). Runs against the BUILT dist (astro preview).
 *
 * The state round-trips through a versioned `#v1=` fragment; decode-on-load
 * degrades gracefully as the catalog evolves (never silently computing a
 * different chain — invariant 5). These pins cover the frozen compatibility
 * contract, live round-tripping, the copy control, and the two degradation
 * paths (a dropped wire, and a refused newer format).
 */
import { expect, test, type Page } from "@playwright/test";

async function addNode(page: Page, value: string) {
  await page.getByTestId("node-picker").selectOption(value);
  await page.getByTestId("add-node").press("Enter");
}
const ready = (page: Page) =>
  expect(page.getByTestId("chain-builder")).toHaveAttribute("data-ready", "true");
async function readNum(page: Page, nodeId: string, sym: string): Promise<number> {
  const loc = page.getByTestId(`node-${nodeId}`).locator(`[data-output="${sym}"] output`);
  const text = await loc.innerText();
  expect(text, `${nodeId}.${sym} should be numeric, got '${text}'`).not.toBe("—");
  return Number.parseFloat(text.replace(/,/g, ""));
}
/** craft a raw #v1= fragment from an arbitrary object — Node's base64url matches
 * the module's url-safe/no-pad scheme, so the decoder reads what this writes. */
const frag = (obj: unknown) => "#v1=" + Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");

/* =====================================================================
 * FROZEN v1 URL — APPEND-ONLY COMPATIBILITY CONTRACT.
 *
 * DO NOT EDIT the literal below or this test's assertions. A future encoding
 * change MUST keep decoding this exact string into this exact chain, forever;
 * if the format ever grows, ADD a new frozen case beside this one — never
 * change this one. (Generated once from the proven S22 conservation chain with
 * the sun torque driven to 200 N·m: planetary ring-fixed ─T_out→T, ω_c→ω─▶
 * torsion-shaft torque-in. Materials intentionally omitted from the payload so
 * the contract is robust to material-catalog changes; τ is material-independent.)
 * ===================================================================== */
const FROZEN_V1 =
  "#v1=eyJub2RlcyI6W3siaWQiOiJuMSIsInNsdWciOiJwbGFuZXRhcnktZ2VhcnNldCIsImNvbmZpZyI6InJpbmctZml4ZWQifSx7ImlkIjoibjIiLCJzbHVnIjoidG9yc2lvbi1zaGFmdCIsImNvbmZpZyI6InRvcnF1ZS1pbiJ9XSwiYmluZGluZ3MiOlt7ImZyb20iOnsibm9kZSI6Im4xIiwicG9ydCI6IlRfb3V0In0sInRvIjp7Im5vZGUiOiJuMiIsInBvcnQiOiJUIn19LHsiZnJvbSI6eyJub2RlIjoibjEiLCJwb3J0Ijoib21lZ2FfYyJ9LCJ0byI6eyJub2RlIjoibjIiLCJwb3J0Ijoib21lZ2EifX1dLCJrbm9icyI6eyJuMSI6eyJUX3MiOjIwMH19LCJtYXRlcmlhbHMiOnt9LCJkaXNwbGF5VW5pdHMiOnt9fQ";

test("FROZEN v1 URL decodes into the exact pinned chain and readouts (never edit)", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`chain-builder/${FROZEN_V1}`);

  await expect(page.getByTestId("node-count")).toHaveText("2 / 6 nodes");
  await ready(page);
  await expect(page.getByTestId("decode-error")).toHaveCount(0); // read cleanly
  await expect(page.getByTestId("degraded")).toHaveCount(0); // nothing degraded

  // both nodes present, wired, evaluating the conserved numbers
  await expect(page.getByTestId("wire-row")).toHaveCount(2);
  expect(await readNum(page, "n1", "T_out")).toBeCloseTo(700, 1); // 200 × 3.5
  expect(await readNum(page, "n2", "tau")).toBeCloseTo(55.704, 1); // MPa, from the BOUND torque
  expect(errors).toEqual([]);
});

test("editing a knob updates the URL; a hard reload reproduces the identical chain", async ({ page }) => {
  await page.goto("chain-builder/");
  await addNode(page, "planetary-gearset::ring-fixed"); // n1
  await ready(page);

  await page.locator("#knob-n1-T_s").fill("250");
  expect(await readNum(page, "n1", "T_out")).toBeCloseTo(875, 1); // 250 × 3.5

  // the store is serialized into the fragment (replaceState, no history spam)
  await expect.poll(() => page.evaluate(() => location.hash)).toContain("#v1=");
  const shared = page.url();

  // a HARD reload of that exact URL reproduces the chain from the fragment alone
  await page.goto(shared);
  await expect(page.getByTestId("node-count")).toHaveText("1 / 6 nodes");
  await ready(page);
  await expect(page.locator("#knob-n1-T_s")).toHaveValue("250");
  expect(await readNum(page, "n1", "T_out")).toBeCloseTo(875, 1);
});

test("the copy-link control puts the shareable URL on the clipboard", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("chain-builder/");
  await addNode(page, "planetary-gearset::ring-fixed");
  await ready(page);
  await expect.poll(() => page.evaluate(() => location.hash)).toContain("#v1=");

  await page.getByTestId("copy-link").click();
  await expect(page.getByTestId("copy-link")).toContainText(/copied/i); // writeText resolved
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toBe(page.url());
  expect(clip).toContain("#v1=");
});

test("a shared link naming a nonexistent port loads the remainder with a banner", async ({ page }) => {
  // a legal 2-node chain, but the wire targets a port that isn't on the shaft
  const bad = frag({
    nodes: [
      { id: "n1", slug: "planetary-gearset", config: "ring-fixed" },
      { id: "n2", slug: "torsion-shaft", config: "torque-in" },
    ],
    bindings: [{ from: { node: "n1", port: "T_out" }, to: { node: "n2", port: "ZZZ" } }],
    knobs: {},
    materials: {},
    displayUnits: {},
  });
  await page.goto(`chain-builder/${bad}`);

  await expect(page.getByTestId("node-count")).toHaveText("2 / 6 nodes"); // both nodes survive
  await ready(page);
  await expect(page.getByTestId("wire-row")).toHaveCount(0); // the bad wire was dropped
  const banner = page.getByTestId("degraded");
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("ZZZ");
  await expect(banner).toContainText(/not an input/i);
  await expect(page.getByTestId("decode-error")).toHaveCount(0); // a partial load, not a refusal
});

test("a #v2= link refuses the whole chain with a newer-version message", async ({ page }) => {
  await page.goto("chain-builder/#v2=anything-here");
  await expect(page.getByTestId("decode-error")).toContainText(/newer version/i);
  await expect(page.getByTestId("node-count")).toHaveText("0 / 6 nodes"); // empty builder
});

test("a shared link whose every node is gone shows the drop banner, not a blank builder", async ({ page }) => {
  // a single node whose slug no longer exists → decode drops it → the store is
  // empty, but the drop MUST still be named (invariant 5 — a blank builder with
  // no banner would be a silent different chain)
  const gone = frag({
    nodes: [{ id: "n1", slug: "ghost-thing", config: "any" }],
    bindings: [],
    knobs: {},
    materials: {},
    displayUnits: {},
  });
  await page.goto(`chain-builder/${gone}`);
  await expect(page.getByTestId("node-count")).toHaveText("0 / 6 nodes"); // nothing survived
  const banner = page.getByTestId("degraded");
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("ghost-thing");
  await expect(banner).toContainText(/no longer in the catalog/i);
  await expect(page.getByTestId("decode-error")).toHaveCount(0); // degraded, not refused
});
