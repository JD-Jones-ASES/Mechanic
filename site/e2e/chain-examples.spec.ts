/**
 * Curated example chains (S25). Runs against the BUILT dist (astro preview).
 *
 * The three cards on /chain-builder/ each carry a FROZEN v1 URL (generated
 * against the S23 encoder, never hand-composed). These pins prove each URL
 * decodes with ZERO degradation into its exact chain and reproduces a
 * hand-derived golden — the numbers in the walkthrough prose are the numbers the
 * engine emits. Goldens are hand-derivable from the wired THINGs' verified
 * relations; the derivations live in the comments beside each assertion.
 *
 * The fragments below MUST match the literals in src/pages/chain-builder.astro.
 */
import { expect, test, type Page } from "@playwright/test";

const ready = (page: Page) =>
  expect(page.getByTestId("chain-builder")).toHaveAttribute("data-ready", "true");

async function readNum(page: Page, nodeId: string, sym: string): Promise<number> {
  const loc = page.getByTestId(`node-${nodeId}`).locator(`[data-output="${sym}"] output`);
  await expect(loc, `${nodeId}.${sym} should be a live readout`).not.toHaveText("—");
  return Number.parseFloat((await loc.innerText()).replace(/,/g, ""));
}

async function decodeClean(page: Page) {
  await ready(page);
  await expect(page.getByTestId("decode-error")).toHaveCount(0); // read cleanly
  await expect(page.getByTestId("degraded")).toHaveCount(0); // nothing degraded
}

// The three frozen fragments — identical to the astro page's literals.
const EX_HEADLINE =
  "#v1=eyJub2RlcyI6W3siaWQiOiJuMSIsInNsdWciOiJkYy1tb3RvciIsImNvbmZpZyI6InNwZWVkLWluIn0seyJpZCI6Im4yIiwic2x1ZyI6InBsYW5ldGFyeS1nZWFyc2V0IiwiY29uZmlnIjoicmluZy1maXhlZCJ9LHsiaWQiOiJuMyIsInNsdWciOiJ0b3JzaW9uLXNoYWZ0IiwiY29uZmlnIjoidG9ycXVlLWluIn0seyJpZCI6Im40Iiwic2x1ZyI6ImZseXdoZWVsLWRpc2siLCJjb25maWciOiJzcGVlZC1pbiJ9XSwiYmluZGluZ3MiOlt7ImZyb20iOnsibm9kZSI6Im4xIiwicG9ydCI6IlQifSwidG8iOnsibm9kZSI6Im4yIiwicG9ydCI6IlRfcyJ9fSx7ImZyb20iOnsibm9kZSI6Im4xIiwicG9ydCI6Im9tZWdhX291dCJ9LCJ0byI6eyJub2RlIjoibjIiLCJwb3J0Ijoib21lZ2FfcyJ9fSx7ImZyb20iOnsibm9kZSI6Im4yIiwicG9ydCI6IlRfb3V0In0sInRvIjp7Im5vZGUiOiJuMyIsInBvcnQiOiJUIn19LHsiZnJvbSI6eyJub2RlIjoibjIiLCJwb3J0Ijoib21lZ2FfYyJ9LCJ0byI6eyJub2RlIjoibjMiLCJwb3J0Ijoib21lZ2EifX0seyJmcm9tIjp7Im5vZGUiOiJuMiIsInBvcnQiOiJUX291dCJ9LCJ0byI6eyJub2RlIjoibjQiLCJwb3J0IjoiVF9kIn19XSwia25vYnMiOnt9LCJtYXRlcmlhbHMiOnsibjQiOiJzdGVlbC0xMDQ1In0sImRpc3BsYXlVbml0cyI6e319";
const EX_BELT =
  "#v1=eyJub2RlcyI6W3siaWQiOiJuMSIsInNsdWciOiJiZWx0LWRyaXZlIiwiY29uZmlnIjoiYW5hbHl6ZSJ9LHsiaWQiOiJuMiIsInNsdWciOiJ0b3JzaW9uLXNoYWZ0IiwiY29uZmlnIjoicG93ZXItaW4ifV0sImJpbmRpbmdzIjpbeyJmcm9tIjp7Im5vZGUiOiJuMSIsInBvcnQiOiJQX3QifSwidG8iOnsibm9kZSI6Im4yIiwicG9ydCI6IlBfdyJ9fV0sImtub2JzIjp7fSwibWF0ZXJpYWxzIjp7fSwiZGlzcGxheVVuaXRzIjp7fX0";
const EX_INDETERMINATE =
  "#v1=eyJub2RlcyI6W3siaWQiOiJuMSIsInNsdWciOiJwbGFuZXRhcnktZ2VhcnNldCIsImNvbmZpZyI6InJpbmctZml4ZWQifSx7ImlkIjoibjIiLCJzbHVnIjoiZml4ZWQtZml4ZWQtdG9yc2lvbi1zaGFmdCIsImNvbmZpZyI6ImFuYWx5emUifV0sImJpbmRpbmdzIjpbeyJmcm9tIjp7Im5vZGUiOiJuMSIsInBvcnQiOiJUX291dCJ9LCJ0byI6eyJub2RlIjoibjIiLCJwb3J0IjoiVCJ9fV0sImtub2JzIjp7fSwibWF0ZXJpYWxzIjp7fSwiZGlzcGxheVVuaXRzIjp7fX0";

test("HEADLINE example: a real motor drives the gearbox; spin-up time and shaft stress from one delivered torque; power conserved through 4 nodes", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`chain-builder/${EX_HEADLINE}`);

  await expect(page.getByTestId("node-count")).toHaveText("4 / 6 nodes");
  await decodeClean(page);
  // motor T→T_s, motor ω_out→ω_s, T_out→T (shaft), ω_c→ω (shaft), T_out→T_d (flywheel)
  await expect(page.getByTestId("wire-row")).toHaveCount(5);

  // dc-motor speed-in defaults (T_stall=200, ω₀=300, ω=150): the peak-power point —
  //   T = 200·(1−150/300) = 100 N·m,  P = 100·150 = 15 kW = P_max = 200·300/4
  expect(await readNum(page, "n1", "T")).toBeCloseTo(100, 1);
  expect(await readNum(page, "n1", "P")).toBeCloseTo(15, 2); // kW
  // planetary ring-fixed (N_s=24, N_p=18 ⇒ N_r=60, ratio 1+N_r/N_s = 3.5), sun torque
  // AND sun speed now BOUND to the motor (T_s=100, ω_s=150):
  //   T_out = 3.5 × 100 = 350 N·m,  ω_c = ω_s·N_s/(N_s+N_r) = 150·24/84 = 42.857 rad/s
  expect(await readNum(page, "n2", "T_out")).toBeCloseTo(350, 1);
  // shaft (d = 40 mm) carries the BOUND torque and the BOUND carrier speed:
  //   τ = 16·350/(π·0.04³) = 27.85 MPa
  //   P_w = T·ω = 350 × 42.857 = 15 000 W = 15 kW — EXACTLY the motor's output P.
  //   Power survives the wiring: conservation pinned across motor → planetary → shaft.
  expect(await readNum(page, "n3", "tau")).toBeCloseTo(27.85, 1);
  expect(await readNum(page, "n3", "P_w")).toBeCloseTo(15, 2);
  // flywheel (steel-1045 ρ=7870, R=0.15, t=25 mm, ω=300) driven by the same T_out=350:
  //   I_z = ρπR⁴t/2 = 0.156459 kg·m²,  t_spin = I_z·ω/T_d = 0.156459·300/350 = 0.1341 s
  expect(await readNum(page, "n4", "t_spin")).toBeCloseTo(0.1341, 2);
  expect(errors).toEqual([]);
});

test("BELT example: a belt's transmitted power sizes the torque and shear of a shaft", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`chain-builder/${EX_BELT}`);
  await expect(page.getByTestId("node-count")).toHaveText("2 / 6 nodes");
  await decodeClean(page);
  await expect(page.getByTestId("wire-row")).toHaveCount(1); // P_t → P_w

  // belt analyze defaults (T_1=400 N, μ=0.3, θ=π, v=15, m'=0.25):
  //   T_c = m'v² = 56.25 N,  T_2 = T_c+(T_1−T_c)e^{−μθ} = 190.2 N,  P = (T_1−T_2)v = 3147 W
  expect(await readNum(page, "n1", "P_t")).toBeCloseTo(3.147, 2); // kW
  // shaft power-in (ω=100, d=40 mm) backs out the torque, then the shear:
  //   T = P/ω = 3147/100 = 31.47 N·m,  τ = 16·31.47/(π·0.04³) = 2.504 MPa
  expect(await readNum(page, "n2", "T")).toBeCloseTo(31.47, 1);
  expect(await readNum(page, "n2", "tau")).toBeCloseTo(2.504, 2); // MPa
  expect(errors).toEqual([]);
});

test("INDETERMINATE example: a gearbox torque feeds a doubly-clamped shaft's coupled solve", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`chain-builder/${EX_INDETERMINATE}`);
  await expect(page.getByTestId("node-count")).toHaveText("2 / 6 nodes");
  await decodeClean(page);
  await expect(page.getByTestId("wire-row")).toHaveCount(1); // T_out → T

  expect(await readNum(page, "n1", "T_out")).toBeCloseTo(350, 1);
  // fixed-fixed shaft analyze (a=0.4, b=0.6, L=1.0): the 2×2 solveLinear splits the
  // applied T=350 into wall reactions T_A = T·b/L = 210, T_B = T·a/L = 140 (larger on
  // the SHORTER segment), material-blind; τ_1 = T_A·r/J with J=πr⁴/2 = π·0.02⁴/2:
  //   τ_1 = 210·0.02/2.51327e-7 = 16.71 MPa
  expect(await readNum(page, "n2", "T_A")).toBeCloseTo(210, 1);
  expect(await readNum(page, "n2", "T_B")).toBeCloseTo(140, 1);
  expect(await readNum(page, "n2", "tau_1")).toBeCloseTo(16.71, 1); // MPa
  expect(errors).toEqual([]);
});

test("the example cards render with their frozen URLs and load the chain in-page", async ({ page }) => {
  await page.goto("chain-builder/");
  const cards = page.locator(".cb-example");
  await expect(cards).toHaveCount(3);
  // each SHIPPED card link carries the exact frozen fragment this spec pins — so a
  // drift between the astro literals and these (in either direction) fails here,
  // not silently (the belt/indeterminate tests below drive this spec's own copies).
  const links = page.locator("a[data-chain-example]");
  const hrefRe = (frag: string) => new RegExp(frag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$");
  await expect(links.nth(0)).toHaveAttribute("href", hrefRe(EX_HEADLINE));
  await expect(links.nth(1)).toHaveAttribute("href", hrefRe(EX_BELT));
  await expect(links.nth(2)).toHaveAttribute("href", hrefRe(EX_INDETERMINATE));

  // clicking an example while already on the page reloads and rebuilds the chain
  await links.first().click();
  await expect(page.getByTestId("node-count")).toHaveText("4 / 6 nodes");
  await ready(page);
  expect(await readNum(page, "n4", "t_spin")).toBeCloseTo(0.1341, 2);
});

test("flywheel spin-up: t_spin reads on the THING page, and T_d ≤ 0 scopes only t_spin off", async ({ page }) => {
  await page.goto("things/flywheel-disk/");
  const tSpin = page.locator('[data-output="t_spin"] output');
  const sigmaMax = page.locator('[data-output="sigma_max"] output');
  const sf = page.locator('[data-output="SF"] output');

  // present at the widget defaults (speed-in config, T_d = 50 N·m)
  await expect(tSpin).not.toHaveText("—");
  await expect(sigmaMax).not.toHaveText("—");
  const sfBefore = (await sf.innerText()).trim();

  // drive the drive-torque non-positive: the scoped refusal withholds ONLY t_spin
  await page.locator("#knob-T_d").fill("-50");
  await expect(tSpin).toHaveText("—"); // spin-up time withheld
  await expect(sigmaMax).not.toHaveText("—"); // stress still stands (scope = [t_spin])
  await expect(sf).toHaveText(sfBefore); // margin unchanged — T_d touches nothing else
  // the invalid-severity reason is surfaced, not silent (invariant 5)
  await expect(page.locator(".validity-invalid").first()).toBeVisible();
});
