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

/**
 * Pressure vessel (defaults p=2 MPa, r=0.5 m, t=10 mm):
 *   σ_h = pr/t = 100 MPa exactly, σ_l = 50 MPa; A36 (σ_y=248.2 MPa) → SF=2.482.
 * Design config (SF=4, A36): t = SF·p·r/σ_y = 16.12 mm, σ_h = σ_y/SF = 62.05 MPa.
 */
test("pressure vessel: analyze goldens, and the design config runs the relations backwards", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/pressure-vessel/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  await page.getByTestId("material-select").selectOption("steel-a36");
  expect(await readOutput(page, "sigma_h")).toBeCloseTo(100, 1); // MPa
  expect(await readOutput(page, "sigma_l")).toBeCloseTo(50, 1);
  expect(await readOutput(page, "SF")).toBeCloseTo(2.482, 2);

  // same relations, opposite direction: SF becomes a knob, t becomes an output
  await page.getByTestId("config-select").selectOption("design");
  await page.getByTestId("material-select").selectOption("steel-a36");
  await expect(page.locator("#knob-SF")).toBeVisible();
  expect(await readOutput(page, "t")).toBeCloseTo(16.12, 1); // mm
  expect(await readOutput(page, "sigma_h")).toBeCloseTo(62.05, 1);
  expect(errors).toEqual([]);
});

test("pressure vessel: thin-wall envelope refuses thick-wall inputs", async ({ page }) => {
  await page.goto("things/pressure-vessel/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");
  await page.locator("#knob-t").fill("200"); // mm → r/t = 2.5, far past the envelope
  await expect(page.locator(".validity-invalid").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/thick-walled/i);
  // the SIM refuses too — this invalid fires with every value finite, so only
  // the engine's verdict (not NaN-sniffing) can catch it
  await expect(page.locator(".sim figcaption")).toContainText(/nothing honest/i);
});

/**
 * Torsion shaft (defaults T=500 N·m, d=40 mm): τ = 16T/πd³ = 39.79 MPa for EVERY
 * material (stress is material-blind — the THING's aha). 4340 (G = 11.0 Msi =
 * 75.84 GPa): θ = TL/GJ = 0.02623 rad = 1.503°. Power config (50 kW @ 100 rad/s)
 * finds the same T=500 N·m first.
 */
test("torsion shaft: stress ignores the material; twist and margin do not", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/torsion-shaft/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  await page.getByTestId("material-select").selectOption("steel-4340");
  const tau4340 = await readOutput(page, "tau");
  const theta4340 = await readOutput(page, "theta"); // degrees
  const sf4340 = await readOutput(page, "SF");
  expect(tau4340).toBeCloseTo(39.79, 1);
  expect(theta4340).toBeCloseTo(1.503, 2);

  await page.getByTestId("material-select").selectOption("al-6061-t6");
  const tauAl = await readOutput(page, "tau");
  const thetaAl = await readOutput(page, "theta");
  const sfAl = await readOutput(page, "SF");
  expect(tauAl).toBeCloseTo(tau4340, 5); // identical stress, different material
  expect(thetaAl).toBeGreaterThan(theta4340); // lower G → more twist
  expect(sfAl).toBeLessThan(sf4340); //          lower σ_y → less margin
  expect(errors).toEqual([]);
});

test("torsion shaft: power-in config finds the torque; materials without G are not offered", async ({ page }) => {
  await page.goto("things/torsion-shaft/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  // 9 of the 13 seed materials publish a shear modulus; the rest are excluded, visibly
  expect(await page.getByTestId("material-select").locator("option").count()).toBe(9);
  await expect(page.getByText(/not listed here/i)).toBeVisible();

  await page.getByTestId("config-select").selectOption("power-in");
  await expect(page.locator("#knob-P_w")).toBeVisible();
  expect(await readOutput(page, "T")).toBeCloseTo(500, 1); // 50 kW / 100 rad/s
  expect(await readOutput(page, "tau")).toBeCloseTo(39.79, 1);
});

/**
 * Euler column (defaults P=10 kN, L=2 m, d=50 mm, pinned-pinned):
 *   I = π·0.05⁴/64 = 3.068e-7 m⁴; A36 (E=199.95 GPa): P_cr = π²EI/L² = 151.4 kN,
 *   λ = KL/r = 160 > λ_T(A36) = 126.1 → valid. 4340 has the SAME E (29.0 Msi) at
 *   6× the yield strength → P_cr must not move (strength is irrelevant to buckling)
 *   while λ_T drops to 51.4 (the envelope moves instead).
 */
test("euler column: yield strength moves the envelope, never the load", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/euler-column/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  await page.getByTestId("material-select").selectOption("steel-a36");
  const pcrA36 = await readOutput(page, "P_cr"); // kN
  const lamTA36 = await readOutput(page, "lam_T");
  expect(pcrA36).toBeCloseTo(151.4, 0);
  expect(await readOutput(page, "lam")).toBeCloseTo(160, 1);
  expect(lamTA36).toBeCloseTo(126.1, 0);

  await page.getByTestId("material-select").selectOption("steel-4340");
  const pcr4340 = await readOutput(page, "P_cr");
  const lamT4340 = await readOutput(page, "lam_T");
  expect(pcr4340).toBeCloseTo(pcrA36, 1); // same E ⇒ same buckling load
  expect(lamT4340).toBeLessThan(lamTA36 * 0.6); // 6× yield ⇒ much wider Euler validity
  expect(errors).toEqual([]);
});

/**
 * The model hand-off (scoped refusal): at λ = 64 < λ_T the Euler readouts are
 * refused while the Johnson readouts go live — on ONE page, with the sim still
 * drawing. A36 at L = 0.8 m, d = 50 mm: λ = 64, σ_J = 248.2 − (248.2·64/2π)²/
 * 199950 = 216.2 MPa, P_J = σ_J·A = 424.6 kN. At the slender default (λ = 160)
 * the verdicts swap: Johnson refused, Euler live.
 */
test("euler column: end conditions are configurations; the inelastic region hands off to Johnson", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/euler-column/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");
  await page.getByTestId("material-select").selectOption("steel-a36");

  await page.getByTestId("config-select").selectOption("fixed-free");
  await page.getByTestId("material-select").selectOption("steel-a36");
  expect(await readOutput(page, "P_cr")).toBeCloseTo(151.4 / 4, 0); // K=2 ⇒ quarter strength

  await page.getByTestId("config-select").selectOption("pinned-pinned");
  await page.getByTestId("material-select").selectOption("steel-a36");

  // slender default (λ = 160): Euler readouts live, Johnson readouts refused
  expect(await readOutput(page, "P_cr")).toBeCloseTo(151.4, 0);
  await expect(page.locator('[data-output="P_J"] output')).toHaveText("—");
  await expect(page.locator(".sim figcaption")).toContainText(/Euler \(elastic\) governs/i);

  await page.locator("#knob-L").fill("0.8"); // λ = 64 < λ_T: intermediate column
  // the hand-off: a scoped invalid banner names the governing model...
  await expect(page.locator(".validity-invalid").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/Johnson .*governs|Johnson parabola governs/i);
  // ...the Euler readouts are refused (every value finite — the engine's
  // scoped verdict, not NaN, is what blanks them)...
  await expect(page.locator('[data-output="P_cr"] output')).toHaveText("—");
  await expect(page.locator('[data-output="SF_b"] output')).toHaveText("—");
  // ...while the Johnson readouts carry verified numbers on the same page
  expect(await readOutput(page, "sigma_J")).toBeCloseTo(216.2, 0); // MPa
  expect(await readOutput(page, "P_J")).toBeCloseTo(424.6, 0); // kN
  // and the sim keeps drawing, naming the governing model instead of refusing
  await expect(page.locator(".sim figcaption")).toContainText(/Johnson \(inelastic\) governs/i);
  expect(errors).toEqual([]);
});

test("euler column: in Johnson territory the stronger steel finally carries more", async ({ page }) => {
  await page.goto("things/euler-column/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");
  // λ = 48 — inside Johnson territory for BOTH steels (λ_T: A36 ≈ 126, 4340 ≈ 51)
  await page.locator("#knob-L").fill("0.6");

  await page.getByTestId("material-select").selectOption("steel-a36");
  const pJA36 = await readOutput(page, "P_J"); // kN — A36: σ_J = 230.2 MPa → 452 kN
  expect(pJA36).toBeCloseTo(452, 0);
  await page.getByTestId("material-select").selectOption("steel-4340");
  // same E, ~6× the yield: in EULER territory the load would not move — here it must
  const pJ4340 = await readOutput(page, "P_J");
  expect(pJ4340).toBeGreaterThan(pJA36 * 2);
});

test("verification page discloses authorship and the audit surface", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("verification/");
  await expect(page.getByText(/built end to end by an AI/i).first()).toBeVisible();
  await expect(page.getByText(/No human reviews the content/i).first()).toBeVisible();
  // every THING appears with its audit block (count is a deliberate change detector)
  expect(await page.locator("section.relation-block").count()).toBe(21); // +beam-shear-flow (S04)
  await expect(page.getByText(/Where physics enters/i).first()).toBeVisible();
  expect(errors).toEqual([]);
});

/**
 * Eccentric column (defaults P=100 kN, L=1 m, d=50 mm, e=5 mm → ec/r² = 0.8):
 *   A36 (E=199.95 GPa, σ_y=248.21 MPa): P_E=605.4 kN, σ_max=101.67 MPa,
 *   δ=1.226 mm, and the SOLVE1D number: P_y=209.42 kN (the browser's Brent on
 *   the secant equation, parity-checked against 60-digit bisection).
 *   SF_σ=2.441 > SF_P=2.094 — the margins disagree; only the load one is honest.
 */
test("eccentric column: the page solves the secant equation live, and the margins disagree", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/eccentric-column/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  await page.getByTestId("material-select").selectOption("steel-a36");
  expect(await readOutput(page, "P_E")).toBeCloseTo(605.4, 0); // kN
  expect(await readOutput(page, "sigma_max")).toBeCloseTo(101.67, 1); // MPa
  expect(await readOutput(page, "delta_mid")).toBeCloseTo(1.226, 2); // mm
  expect(await readOutput(page, "P_y")).toBeCloseTo(209.42, 1); // kN — the live root
  const sfLoad = await readOutput(page, "SF_y");
  const sfStress = await readOutput(page, "SF_sig");
  expect(sfLoad).toBeCloseTo(2.094, 2);
  expect(sfStress).toBeCloseTo(2.441, 2);
  expect(sfStress).toBeGreaterThan(sfLoad); // the deceptive margin always reads higher

  // same E, ~6x the yield: the ELASTIC readouts must not move, the yield load must
  await page.getByTestId("material-select").selectOption("steel-4340");
  expect(await readOutput(page, "sigma_max")).toBeCloseTo(101.67, 1); // stiffness-only
  expect(await readOutput(page, "P_y")).toBeGreaterThan(2 * 209.42); // strength is back
  expect(errors).toEqual([]);
});

test("eccentric column: past first yield and past P_E the elastic readouts refuse, the load margin survives", async ({ page }) => {
  await page.goto("things/eccentric-column/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");
  await page.getByTestId("material-select").selectOption("steel-a36");

  // P = 300 kN: σ_max would be 426 MPa > σ_y — elastic fiction, refused (scoped)
  await page.locator("#knob-P").fill("300");
  await expect(page.locator(".validity-invalid").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/extreme fiber/i);
  await expect(page.locator('[data-output="sigma_max"] output')).toHaveText("—");
  expect(await readOutput(page, "SF_y")).toBeCloseTo(0.698, 2); // still exact, and honest

  // P = 700 kN > P_E: no bent equilibrium at all — and SF_P still reads
  await page.locator("#knob-P").fill("700");
  await expect(page.locator(".validity")).toContainText(/no bent equilibrium/i);
  await expect(page.locator('[data-output="delta_mid"] output')).toHaveText("—");
  expect(await readOutput(page, "SF_y")).toBeCloseTo(0.299, 2);
  await expect(page.locator(".sim figcaption")).toContainText(/load .*margin|SF_P/i);
});

/**
 * Four-bar (defaults a=40, b=120, c=80, d=100 mm, θ2=0.7 rad ≈ 40.1°):
 *   open circuit:    θ3 = 0.35396 rad = 20.28°, θ4 = 1.00103 rad = 57.36°
 *   crossed circuit: θ3 = −1.06496 rad = −61.02°, θ4 = −1.71203 rad = −98.08°
 * (verified against blind nsolve roots in pipeline/tests/test_fourbar_physics.py)
 */
test("four-bar: one crank angle, two verified circuits, selectable", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/fourbar-linkage/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  expect(await readOutput(page, "theta4")).toBeCloseTo(57.36, 1); // degrees, open
  expect(await readOutput(page, "theta3")).toBeCloseTo(20.28, 1);

  await page.getByTestId("branch-select").selectOption("crossed");
  expect(await readOutput(page, "theta4")).toBeCloseTo(-98.08, 1);
  expect(await readOutput(page, "theta3")).toBeCloseTo(-61.02, 1);
  expect(errors).toEqual([]);
});

test("four-bar: non-Grashof geometry warns, and impossible assemblies refuse", async ({ page }) => {
  await page.goto("things/fourbar-linkage/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  await page.locator("#knob-d").fill("300"); // mm: s+l = 340 > p+q = 200 — triple-rocker
  await expect(page.locator(".validity")).toContainText(/Grashof|triple-rocker/i);
  // and at this crank angle the coupler+rocker can't reach: outputs are refused
  await expect(page.locator(".validity-invalid").first()).toBeVisible();
});

/**
 * Flywheel (defaults R=0.15 m, t=25 mm, ω=300 rad/s):
 *   A36 (ρ=0.282 lb/in³=7805.7 kg/m³, ν=0.30, σ_y=248.21 MPa):
 *     m=13.794 kg, E_k=6.983 kJ, e=506.25 J/kg, σ_max=(3.3/8)ρω²R²=6.520 MPa,
 *     SF=38.07, ω_y=1851.0 rad/s = 17675 rpm.
 *   Ti-6Al-4V (ρ=4428.8, ν=0.31, σ_y=868.74 MPa): σ_max=3.711 MPa, SF=234.1,
 *     ω_y=4590 rad/s — and e is IDENTICAL (e = R²ω²/4: the energy a geometry
 *     stores per kg at a given speed is material-blind; the LIMIT is not).
 */
test("flywheel: self-loading stress goldens, and the energy-in config finds the speed", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/flywheel-disk/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  await page.getByTestId("material-select").selectOption("steel-a36");
  expect(await readOutput(page, "m_disk")).toBeCloseTo(13.794, 2);
  expect(await readOutput(page, "E_k")).toBeCloseTo(6.983, 2); // kJ
  expect(await readOutput(page, "e_m")).toBeCloseTo(506.25, 1); // J/kg
  expect(await readOutput(page, "sigma_max")).toBeCloseTo(6.52, 2); // MPa
  expect(await readOutput(page, "SF")).toBeCloseTo(38.07, 1);
  expect(await readOutput(page, "omega_y")).toBeCloseTo(1851, 0); // rad/s, comparable to the ω knob

  // same relations backwards: name the energy, get the speed that stores it
  await page.getByTestId("config-select").selectOption("energy-in");
  await page.getByTestId("material-select").selectOption("steel-a36");
  await expect(page.locator("#knob-E_k")).toBeVisible();
  await page.locator("#knob-E_k").fill("6.9832"); // kJ
  expect(await readOutput(page, "omega")).toBeCloseTo(300, 0); // rad/s
  expect(errors).toEqual([]);
});

test("flywheel material cascade: density IS the load, but the per-kg energy at a speed is geometry's", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/flywheel-disk/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  await page.getByTestId("material-select").selectOption("steel-a36");
  const sigmaSteel = await readOutput(page, "sigma_max");
  const sfSteel = await readOutput(page, "SF");
  const eSteel = await readOutput(page, "e_m");
  const omYSteel = await readOutput(page, "omega_y");

  await page.getByTestId("material-select").selectOption("ti-6al-4v");
  const sigmaTi = await readOutput(page, "sigma_max");
  const sfTi = await readOutput(page, "SF");
  const eTi = await readOutput(page, "e_m");
  const omYTi = await readOutput(page, "omega_y");

  // the inversion of the torsion-shaft lesson: here the stress MOVES with material
  expect(sigmaTi).toBeLessThan(sigmaSteel * 0.62); // lighter disk pulls on itself less
  expect(sfTi).toBeGreaterThan(sfSteel * 5); //        ...and yields far later
  expect(omYTi).toBeGreaterThan(omYSteel * 2); //      yield-onset speed way up
  expect(eTi).toBeCloseTo(eSteel, 4); // e = R²ω²/4 — same geometry+speed, same J/kg, any material
  expect(errors).toEqual([]);
});

/**
 * Thick-walled cylinder (defaults p=20 MPa, r_i=40 mm, t=20 mm → k=1.5, Δ=2e-3 m²):
 *   σ_θi = 20·(3600+1600)/2000 = 52 MPa exactly — for EVERY material (Lamé is
 *   geometry × pressure). τ_max = 20·3600/2000 = 36 MPa.
 *   A36 (σ_y=248.21 MPa): SF = 248.21/72 = 3.447, μ_L = 7805.7·π·0.002 = 49.05 kg/m.
 *   Design (A36, SF=2): r_o = 40·√(248.21/(248.21−80)) = 48.59 mm → t = 8.59 mm.
 *   Design blowup: SF=6.5 ⇒ 2·SF·p = 260 > σ_y — no finite wall, refused.
 *   Rate (A36, SF=2): p = 248.21·2000/(4·3600) = 34.47 MPa.
 */
test("thick cylinder: Lamé goldens, and the stress is material-blind again", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/thick-walled-cylinder/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  await page.getByTestId("material-select").selectOption("steel-a36");
  expect(await readOutput(page, "r_o")).toBeCloseTo(60, 2); // mm
  expect(await readOutput(page, "sigma_ti")).toBeCloseTo(52, 3); // MPa, exact
  expect(await readOutput(page, "sigma_ri")).toBeCloseTo(-20, 3);
  expect(await readOutput(page, "tau_max")).toBeCloseTo(36, 3);
  expect(await readOutput(page, "SF")).toBeCloseTo(3.447, 2);
  expect(await readOutput(page, "mu_L")).toBeCloseTo(49.05, 1); // kg/m

  const sigmaSteel = await readOutput(page, "sigma_ti");
  await page.getByTestId("material-select").selectOption("ti-6al-4v");
  expect(await readOutput(page, "sigma_ti")).toBeCloseTo(sigmaSteel, 5); // material-blind
  expect(await readOutput(page, "SF")).toBeCloseTo(12.07, 1); // ...but the margin is not
  expect(await readOutput(page, "mu_L")).toBeCloseTo(27.83, 1); // ...nor the mass
  expect(errors).toEqual([]);
});

test("thick cylinder: design finds the wall, refuses past the ceiling; rate finds the pressure", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/thick-walled-cylinder/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  await page.getByTestId("config-select").selectOption("design");
  await page.getByTestId("material-select").selectOption("steel-a36");
  await expect(page.locator("#knob-SF")).toBeVisible();
  await page.locator("#knob-SF").fill("2");
  expect(await readOutput(page, "r_o")).toBeCloseTo(48.59, 1); // mm
  expect(await readOutput(page, "t")).toBeCloseTo(8.59, 1);

  // the thickness ceiling: 2·SF·p ≥ σ_y ⇒ no finite wall — refuse, don't lie
  await page.locator("#knob-SF").fill("6.5");
  await expect(page.locator(".validity-invalid").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/finite wall|autofrettage/i);
  // ...and the SIM refuses too — it must not draw a default-geometry wall
  await expect(page.locator(".sim figcaption")).toContainText(/nothing honest|diverges/i);

  // third direction through the same relations: rate the cylinder
  await page.getByTestId("config-select").selectOption("rate");
  await page.getByTestId("material-select").selectOption("steel-a36");
  await page.locator("#knob-SF").fill("2");
  expect(await readOutput(page, "p")).toBeCloseTo(34.47, 1); // MPa
  expect(errors).toEqual([]);
});

test("thick cylinder: overpressure warns at bore yield", async ({ page }) => {
  await page.goto("things/thick-walled-cylinder/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");
  await page.getByTestId("material-select").selectOption("steel-a36");
  await page.locator("#knob-p").fill("200"); // MPa → 2τ = 720 MPa ≫ σ_y
  await expect(page.locator(".validity-warn").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/yield/i);
});

/**
 * Helical spring (defaults d=4 mm, D=32 mm → C=8, N_a=8, F=100 N, L_0=80 mm):
 *   AISI 1045 (G=80 GPa exactly, σ_y=410 MPa): k = 80e9·0.004⁴/(8·0.032³·8)
 *   = 9765.625 N/m = 9.766 N/mm; δ=10.24 mm; K_W=1.184; τ=150.75 MPa;
 *   SF=205/150.75=1.360; L_s=40 mm.
 *   A36 (G=11.5 Msi=79.29 GPa, σ_y=36 ksi=248.2 MPa): k=9.679 N/mm (−0.9 %!),
 *   SF=0.823. Ti-6Al-4V (G=6.2 Msi=42.75 GPa, σ_y=868.7 MPa): k=5.219 N/mm,
 *   SF=2.881 — the spring inversion: softer AND safer at the same load.
 */
test("spring: rate goldens, and the stiffness/strength axes split across materials", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/helical-spring/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  // 9 of 13 seed materials publish a shear modulus — same exclusion as the shaft
  expect(await page.getByTestId("material-select").locator("option").count()).toBe(9);

  await page.getByTestId("material-select").selectOption("steel-1045");
  expect(await readOutput(page, "C")).toBeCloseTo(8, 5);
  const k1045 = await readOutput(page, "k"); // N/mm
  expect(k1045).toBeCloseTo(9.766, 2);
  expect(await readOutput(page, "delta")).toBeCloseTo(10.24, 1); // mm
  expect(await readOutput(page, "K_w")).toBeCloseTo(1.184, 2);
  expect(await readOutput(page, "tau")).toBeCloseTo(150.75, 1); // MPa
  const sf1045 = await readOutput(page, "SF");
  expect(sf1045).toBeCloseTo(1.36, 1);
  expect(await readOutput(page, "L_s")).toBeCloseTo(40, 2); // mm

  // same G family, very different strength: the rate barely moves, the margin halves
  await page.getByTestId("material-select").selectOption("steel-a36");
  const kA36 = await readOutput(page, "k");
  const sfA36 = await readOutput(page, "SF");
  expect(Math.abs(kA36 / k1045 - 1)).toBeLessThan(0.015); // steels share one G (11.5 Msi vs 80 GPa)
  expect(sfA36).toBeLessThan(sf1045 * 0.65);

  // titanium: the spring inversion — softer AND safer at the same load
  await page.getByTestId("material-select").selectOption("ti-6al-4v");
  const kTi = await readOutput(page, "k");
  const deltaTi = await readOutput(page, "delta");
  const sfTi = await readOutput(page, "SF");
  expect(kTi).toBeCloseTo(5.219, 2);
  expect(deltaTi).toBeGreaterThan(1.8 * 10.24);
  expect(sfTi).toBeGreaterThan(2 * sf1045);
  expect(errors).toEqual([]);
});

test("spring: wind-to-rate finds the coils, and coil bind refuses with finite values", async ({ page }) => {
  await page.goto("things/helical-spring/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");
  await page.getByTestId("material-select").selectOption("steel-1045");

  // same relations backwards: name the rate, get the coil count
  await page.getByTestId("config-select").selectOption("wind-to-rate");
  await page.getByTestId("material-select").selectOption("steel-1045");
  await expect(page.locator("#knob-k")).toBeVisible();
  await page.locator("#knob-k").fill("9.7656"); // N/mm
  expect(await readOutput(page, "N_a")).toBeCloseTo(8, 2);

  // drive the spring solid: δ = 61.4 mm > L_0 − L_s = 40 mm → coil bind
  await page.getByTestId("config-select").selectOption("analyze");
  await page.getByTestId("material-select").selectOption("steel-1045");
  await page.locator("#knob-F").fill("600"); // N
  await expect(page.locator(".validity-invalid").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/coil bind/i);
  // every number is finite here — only the engine's verdict knows; the sim must refuse
  await expect(page.locator(".sim figcaption")).toContainText(/nothing honest/i);
});

/**
 * Power screw (defaults F=5 kN, d_m=28 mm, l=5 mm, f=0.08):
 *   λ = atan(5/28π) = 3.25°; πf·d_m = 7.04 mm > 5 mm → self-locking;
 *   T_R = 70·(0.0120372)/(0.0875646) = 9.623 N·m; T_L = +1.613 N·m;
 *   e = 25/(2π·9.623) = 0.413. Capacity: T_R = 9.6228 N·m raises F = 5 kN.
 */
test("power screw: torque goldens, capacity runs backwards, and friction flips self-locking", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/power-screw/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  expect(await readOutput(page, "lam")).toBeCloseTo(3.25, 1); // degrees
  expect(await readOutput(page, "T_R")).toBeCloseTo(9.62, 1); // N·m
  expect(await readOutput(page, "T_L")).toBeCloseTo(1.61, 1);
  expect(await readOutput(page, "eff")).toBeCloseTo(0.413, 2);

  // drop the friction: T_L goes negative and the warning names the behavior
  await page.locator("#knob-f").fill("0.03");
  expect(await readOutput(page, "T_L")).toBeLessThan(0);
  await expect(page.locator(".validity-warn").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/self-locking|back-drive/i);

  // capacity: the same relations find the load a torque budget can raise
  await page.getByTestId("config-select").selectOption("capacity");
  await expect(page.locator("#knob-T_R")).toBeVisible();
  await page.locator("#knob-T_R").fill("9.6228");
  expect(await readOutput(page, "F")).toBeCloseTo(5.0, 1); // kN
  expect(errors).toEqual([]);
});

test("power screw: the jammed wedge refuses — no finite torque to draw", async ({ page }) => {
  await page.goto("things/power-screw/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  // f·l > π·d_m: 0.5·50 mm vs π·5 mm — the wedge self-jams against raising
  await page.locator("#knob-d_m").fill("5"); // mm
  await page.locator("#knob-l").fill("50"); // mm
  await page.locator("#knob-f").fill("0.5");
  await expect(page.locator(".validity-invalid").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/jam/i);
  await expect(page.locator(".sim figcaption")).toContainText(/jammed wedge/i);
});

/**
 * Belt drive (defaults T_1=400 N, μ=0.3, θ=π, v=15 m/s, m'=0.25 kg/m):
 *   T_c=56.25 N; e^{μθ}=2.566; T_2=56.25+343.75/2.566=190.2 N;
 *   P=(400−190.2)·15=3.147 kW; v*=√(400/0.75)=23.09 m/s.
 *   At v=45: T_c=506.25 N > T_1 — every value finite, state refused (the
 *   engine's verdict, not NaN, is what the sim must obey).
 */
test("belt: capstan goldens, deliver runs backwards, and the speed ceiling refuses", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/belt-drive/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  expect(await readOutput(page, "T_c")).toBeCloseTo(56.25, 1); // N
  expect(await readOutput(page, "T_2")).toBeCloseTo(190.2, 0);
  expect(await readOutput(page, "P_t")).toBeCloseTo(3.147, 2); // kW
  expect(await readOutput(page, "v_star")).toBeCloseTo(23.09, 1); // m/s

  // past the power peak: still valid, but the banner says you're on the wrong side
  await page.locator("#knob-v").fill("30");
  await expect(page.locator(".validity-warn").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/power peak|wrong side/i);

  // the hard ceiling: T_c > T_1 with every value finite — refused, sim included
  await page.locator("#knob-v").fill("45");
  await expect(page.locator(".validity-invalid").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/ceiling|consumed/i);
  await expect(page.locator(".sim figcaption")).toContainText(/no honest drive/i);

  // deliver: name the power, get the tension the belt must carry
  await page.getByTestId("config-select").selectOption("deliver");
  await expect(page.locator("#knob-P_t")).toBeVisible();
  expect(await readOutput(page, "T_1")).toBeCloseTo(400, 0); // N — round trip of the default state
  expect(errors).toEqual([]);
});

/**
 * Simply supported beam (defaults P=1 kN, w=2 kN/m, L=2 m, b=40, h=80 mm →
 * I=1.7067e-6 m⁴). A36 (E=199.95 GPa, σ_y=248.2 MPa): δ_P=0.488 mm,
 * δ_w=1.221 mm, δ=1.709 mm; M_max=1500 N·m; σ=35.16 MPa (material-blind);
 * SF=7.06. Size-depth at SF=4 → h=60.2 mm.
 */
test("ss-beam: both table rows visible, their sum, and size-depth runs backwards", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/simply-supported-beam/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  await page.getByTestId("material-select").selectOption("steel-a36");
  const dP = await readOutput(page, "delta_P"); // mm
  const dw = await readOutput(page, "delta_w");
  const dTot = await readOutput(page, "delta");
  expect(dP).toBeCloseTo(0.488, 2);
  expect(dw).toBeCloseTo(1.221, 2);
  expect(dTot).toBeCloseTo(dP + dw, 3); // superposition, literally
  expect(await readOutput(page, "M_max")).toBeCloseTo(1500, 1); // N·m
  expect(await readOutput(page, "sigma")).toBeCloseTo(35.16, 1); // MPa
  expect(await readOutput(page, "SF")).toBeCloseTo(7.06, 1);

  // stiffness vs strength split again: titanium deflects more AND clears more margin
  await page.getByTestId("material-select").selectOption("ti-6al-4v");
  expect(await readOutput(page, "delta")).toBeGreaterThan(1.7 * dTot);
  expect(await readOutput(page, "sigma")).toBeCloseTo(35.16, 1); // stress is material-blind
  expect(await readOutput(page, "SF")).toBeGreaterThan(20);

  // size-depth: name the margin, get the joist
  await page.getByTestId("config-select").selectOption("size-depth");
  await page.getByTestId("material-select").selectOption("steel-a36");
  await expect(page.locator("#knob-SF")).toBeVisible();
  await page.locator("#knob-SF").fill("4");
  expect(await readOutput(page, "h")).toBeCloseTo(60.2, 0); // mm
  expect(errors).toEqual([]);
});

/**
 * Combined shaft (defaults M=200, T=500 N·m, d=40 mm): σ_b=31.83, τ_t=39.79,
 * τ_max=42.85, σ'=75.91 MPa — all material-blind. A36: SF_T=2.90, SF_DE=3.27
 * (ratio 1.129). Pure torsion (M=0): ratio = 2/√3 = 1.1547 exactly.
 */
test("combined shaft: Mohr goldens, and the two criteria bracket the truth", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/combined-shaft/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  await page.getByTestId("material-select").selectOption("steel-a36");
  expect(await readOutput(page, "sigma_b")).toBeCloseTo(31.83, 1); // MPa
  expect(await readOutput(page, "tau_t")).toBeCloseTo(39.79, 1);
  expect(await readOutput(page, "tau_max")).toBeCloseTo(42.85, 1);
  expect(await readOutput(page, "sigma_vm")).toBeCloseTo(75.91, 1);
  const sfT = await readOutput(page, "SF_t");
  const sfVM = await readOutput(page, "SF_vm");
  expect(sfT).toBeCloseTo(2.9, 1);
  expect(sfVM / sfT).toBeCloseTo(1.129, 2);
  expect(sfVM).toBeGreaterThan(sfT); // Tresca always errs safe

  // pure torsion: maximum disagreement, exactly 2/√3
  await page.locator("#knob-M").fill("0");
  const sfT0 = await readOutput(page, "SF_t");
  const sfVM0 = await readOutput(page, "SF_vm");
  expect(sfVM0 / sfT0).toBeCloseTo(1.1547, 3);

  // size-diameter: name the Tresca margin, get the shaft
  await page.getByTestId("config-select").selectOption("size-diameter");
  await page.getByTestId("material-select").selectOption("steel-a36");
  await page.locator("#knob-SF_t").fill("3");
  expect(await readOutput(page, "d")).toBeCloseTo(40.5, 0); // mm
  expect(errors).toEqual([]);
});

/**
 * Thin tube (defaults T=500 N·m, A_m=20 cm², S=160 mm, t=2 mm, 1045):
 * τ=62.5 MPa, θ=1.79°, SF=3.28, m=2.52 kg. Isoperimetric ceiling for
 * S=160 mm: S²/4π = 20.37 cm² — dialing A_m to 25 cm² asks for a section
 * that cannot exist: every value finite, state refused (pin #3 of the
 * finite-invalid family).
 */
test("thin tube: Bredt goldens, and the isoperimetric envelope refuses impossible sections", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/thin-tube-torsion/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  // 9 of 13 materials publish a shear modulus — same exclusion as shaft/spring
  expect(await page.getByTestId("material-select").locator("option").count()).toBe(9);

  await page.getByTestId("material-select").selectOption("steel-1045");
  expect(await readOutput(page, "tau")).toBeCloseTo(62.5, 1); // MPa
  expect(await readOutput(page, "theta")).toBeCloseTo(1.79, 1); // degrees
  expect(await readOutput(page, "SF")).toBeCloseTo(3.28, 1);
  expect(await readOutput(page, "m_tube")).toBeCloseTo(2.52, 1); // kg

  // ask for more area than the perimeter can enclose: refused by a theorem
  await page.locator("#knob-A_m").fill("25"); // cm²
  await expect(page.locator(".validity-invalid").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/isoperimetric|cannot exist/i);
  await expect(page.locator(".sim figcaption")).toContainText(/no closed curve|isoperimetric/i);

  // size-wall: name the margin, get the thickness
  await page.locator("#knob-A_m").fill("20"); // back inside the envelope
  await page.getByTestId("config-select").selectOption("size-wall");
  await page.getByTestId("material-select").selectOption("steel-1045");
  await page.locator("#knob-SF").fill("2");
  expect(await readOutput(page, "t")).toBeCloseTo(1.22, 1); // mm
  expect(errors).toEqual([]);
});

test("flywheel: overspeed warns at first yield; brittle materials are visibly absent", async ({ page }) => {
  await page.goto("things/flywheel-disk/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  // 10 of 13 seed materials publish a yield strength; grey iron (the classic
  // flywheel material!), wood, and concrete do not — excluded, with a note
  expect(await page.getByTestId("material-select").locator("option").count()).toBe(10);
  await expect(page.getByText(/not listed here/i)).toBeVisible();

  await page.getByTestId("material-select").selectOption("steel-a36");
  await page.locator("#knob-omega").fill("6000"); // rad/s: 400× the default stress
  await expect(page.locator(".validity-warn").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/yield/i);
});

/**
 * Rotating disk with a central bore (defaults R=150, a=30, t=25 mm, ω=300):
 *   A36 (ν=0.30, ρ=7805.7, σ_y=248.21 MPa): m=13.24 kg, E_k=6.972 kJ,
 *   e=526.5 J/kg, σ_θ,max=13.15 MPa, σ_r,max=4.17 MPa, f_bore=2.017,
 *   ω_y=1303 rad/s (the solid flywheel's A36 numbers at the SAME knobs were
 *   σ=6.52 MPa, ω_y=1851, e=506.25 — the bore doubles one and trims the other
 *   while RAISING the per-kg storage at fixed speed).
 *   Vanishing bore a=1 mm: f_bore → 2.000 — the discontinuity, pinned.
 */
test("bored disk: the vanishing hole doubles the stress, and the goldens hold", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/rotating-disk-bore/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  // same exclusion as the flywheel: 10 of 13 materials publish ν, ρ AND σ_y
  expect(await page.getByTestId("material-select").locator("option").count()).toBe(10);

  await page.getByTestId("material-select").selectOption("steel-a36");
  expect(await readOutput(page, "m_disk")).toBeCloseTo(13.24, 1);
  expect(await readOutput(page, "E_k")).toBeCloseTo(6.972, 2); // kJ
  expect(await readOutput(page, "e_m")).toBeCloseTo(526.5, 0); // J/kg — ABOVE the solid disk's 506.25
  expect(await readOutput(page, "sigma_t_max")).toBeCloseTo(13.15, 1); // MPa ≈ 2.017 × solid 6.52
  expect(await readOutput(page, "sigma_r_max")).toBeCloseTo(4.17, 1); // MPa — hoop governs
  expect(await readOutput(page, "f_bore")).toBeCloseTo(2.017, 2);
  expect(await readOutput(page, "omega_y")).toBeCloseTo(1303, 0); // rad/s ≈ solid 1851/√2

  // THE pin: shrink the bore to 1 mm and the penalty refuses to fall below 2
  await page.locator("#knob-a").fill("1"); // mm
  expect(await readOutput(page, "f_bore")).toBeCloseTo(2.0, 3);
  expect(await readOutput(page, "sigma_t_max")).toBeCloseTo(13.04, 1); // exactly 2 × 6.52
  expect(errors).toEqual([]);
});

test("bored disk: energy-in runs backwards, and a bore that eats the rim refuses", async ({ page }) => {
  await page.goto("things/rotating-disk-bore/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");
  await page.getByTestId("material-select").selectOption("steel-a36");

  // same relations backwards: name the energy, get the speed that stores it
  await page.getByTestId("config-select").selectOption("energy-in");
  await page.getByTestId("material-select").selectOption("steel-a36");
  await expect(page.locator("#knob-E_k")).toBeVisible();
  await page.locator("#knob-E_k").fill("6.9719"); // kJ
  expect(await readOutput(page, "omega")).toBeCloseTo(300, 0); // rad/s round trip

  // geometric nonsense refuses loudly: bore radius past the rim
  await page.getByTestId("config-select").selectOption("speed-in");
  await page.getByTestId("material-select").selectOption("steel-a36");
  await page.locator("#knob-a").fill("200"); // mm > R = 150 mm
  await expect(page.locator(".validity-invalid").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/no disk remains/i);
  await expect(page.locator(".sim figcaption")).toContainText(/nothing honest/i);
});

/**
 * Compound cylinder (defaults r_i=40, r_c=60, r_o=90 mm, δ=30 µm, p=100 MPa):
 *   A36 (E=199.95 GPa, σ_y=248.21 MPa, ρ=7805.7): p_c=19.23 MPa,
 *   σ_θ,i^res=−69.21 MPa, σ_θ,i=80.02 MPa, SF_i=1.3788, SF_c=1.3791
 *   (δ_bal=30.008 µm — the declared defaults ARE the balanced fit), μ=159.4.
 *   δ→1 µm hands off to the monobloc cylinder: SF_i→1.005 — the parent
 *   THING's doorstep at this very pressure, the refusal this page escapes.
 *   Over-shrunk (δ=60 µm, p=20 MPa): σ_θ,i=−108.6 MPa < 0 → the SCOPED
 *   refusal poisons SF_i alone (SF_c=1.546 stays live) — the second consumer
 *   of the Euler/Johnson hand-off machinery.
 */
test("compound cylinder: balanced-fit goldens and the monobloc hand-off", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/compound-cylinder/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  // same exclusion as the beam family: 10 of 13 materials publish E, σ_y AND ρ
  expect(await page.getByTestId("material-select").locator("option").count()).toBe(10);

  await page.getByTestId("material-select").selectOption("steel-a36");
  expect(await readOutput(page, "p_c")).toBeCloseTo(19.23, 1); // MPa from 30 µm
  expect(await readOutput(page, "sigma_ti_res")).toBeCloseTo(-69.21, 1); // MPa — the prize
  expect(await readOutput(page, "sigma_ti_tot")).toBeCloseTo(80.02, 1); // MPa, not the monobloc 149.2
  expect(await readOutput(page, "SF_bore")).toBeCloseTo(1.379, 2);
  expect(await readOutput(page, "SF_iface")).toBeCloseTo(1.379, 2); // equal: the balanced fit
  expect(await readOutput(page, "delta_bal")).toBeCloseTo(30.01, 1); // µm ≈ the dialed δ
  expect(await readOutput(page, "mu_L")).toBeCloseTo(159.4, 0);
  await expect(page.locator(".sim figcaption")).toContainText(/margins are equal/i);

  // wind the fit out and the page collapses onto the thick-walled cylinder:
  // at 100 MPa the monobloc wall sits on its first-yield doorstep
  await page.locator("#knob-delta").fill("1"); // µm
  expect(await readOutput(page, "SF_bore")).toBeCloseTo(1.005, 2);
  expect(await readOutput(page, "SF_iface")).toBeCloseTo(2.195, 2);
  expect(errors).toEqual([]);
});

test("compound cylinder: over-shrinking scope-refuses the bore margin, then warns, then geometry refuses globally", async ({ page }) => {
  await page.goto("things/compound-cylinder/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");
  await page.getByTestId("material-select").selectOption("steel-a36");

  // over-shrunk for the pressure: the bore stays compressive at full p — the
  // scoped invalid refuses SF_bore ALONE while the jacket margin stays live
  await page.locator("#knob-delta").fill("60"); // µm
  await page.locator("#knob-p").fill("20"); // MPa
  await expect(page.locator(".validity-invalid").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/net hoop compression/i);
  await expect(page.locator('[data-output="SF_bore"] output')).toHaveText("—");
  expect(await readOutput(page, "SF_iface")).toBeCloseTo(1.546, 2);
  expect(await readOutput(page, "p_c")).toBeCloseTo(38.45, 1); // the fit itself is fine
  await expect(page.locator(".sim figcaption")).toContainText(/jacket margin governs/i);

  // push the fit to assembly yield: the warn names the line autofrettage crosses
  await page.locator("#knob-p").fill("100"); // MPa
  await page.locator("#knob-delta").fill("120"); // µm → |σ_res| = 277 MPa > σ_y
  await expect(page.locator(".validity-warn").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/compressive yield/i);

  // geometric nonsense refuses everything: interface inside the bore
  await page.locator("#knob-r_c").fill("20"); // mm < r_i = 40 mm
  await expect(page.locator(".validity")).toContainText(/no liner remains/i);
  await expect(page.locator(".sim figcaption")).toContainText(/nothing honest/i);
});

/*
 * Spur gear pair (Lewis bending) — the first `table` plan-step consumer.
 * Defaults N_p=18, N_g=36, m=4 mm, b=40 mm, T=100 N·m, ω_p=50 rad/s. The
 * bending stresses are MATERIAL-INDEPENDENT (σ_b = K_v W_t/(b m Y), no σ_y):
 *   W_t = 2·100/(0.004·18) = 2777.8 N = 2.7778 kN
 *   Y_p = Table14-2(18) = 0.309 (node) ; Y_g = interp(36) = 0.3775
 *   σ_b,p = 1.29508·2777.8/(0.04·0.004·0.309) = 72.764 MPa
 *   σ_b,g = same / 0.3775                       = 59.560 MPa  (pinion higher → governs)
 */
test("spur gear pair computes the Lewis goldens; pinion governs", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/spur-gear-pair/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  expect(await readOutput(page, "i")).toBeCloseTo(2, 5);
  expect(await readOutput(page, "W_t")).toBeCloseTo(2.7778, 3); // kN
  expect(await readOutput(page, "Y_p")).toBeCloseTo(0.309, 4); // exact node lookup
  expect(await readOutput(page, "Y_g")).toBeCloseTo(0.3775, 4); // interpolated 34→38
  expect(await readOutput(page, "sigma_b_p")).toBeCloseTo(72.764, 2); // MPa, material-blind
  expect(await readOutput(page, "sigma_b_g")).toBeCloseTo(59.56, 2); // MPa, material-blind
  // the pedagogy: smaller Y_p → higher stress → lower margin, whatever the material
  expect(await readOutput(page, "SF_p")).toBeLessThan(await readOutput(page, "SF_g"));
  expect(errors).toEqual([]);
});

test("spur gear pair: a pinion below the table domain refuses that gear alone", async ({ page }) => {
  await page.goto("things/spur-gear-pair/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  await page.locator("#knob-N_p").fill("10"); // < 12: off the bottom of Table 14-2
  // scoped invalid: the pinion's tabulated readout and its dependents refuse,
  // carrying the table citation — while the gear side stays live (page stands)
  await expect(page.locator(".validity-invalid").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/Table 14-2/);
  await expect(page.locator('[data-output="Y_p"] output')).toHaveText("—");
  await expect(page.locator('[data-output="sigma_b_p"] output')).toHaveText("—");
  await expect(page.locator('[data-output="SF_p"] output')).toHaveText("—");
  // the gear (N_g = 36, in domain) is untouched — the page stands
  expect(await readOutput(page, "Y_g")).toBeCloseTo(0.3775, 4);
  expect(await readOutput(page, "sigma_b_g")).toBeGreaterThan(0);
});

/*
 * Stepped shaft, shoulder fillet (S02) — the second `table` consumer and the
 * first REAL-arg MULTI-COLUMN one: one lookup at D/d fills BOTH (A, b).
 * Default config = axial, D/d = 1.50 (exact Norton Fig. C-1 row A = 0.99957,
 * b = -0.28221), r/d = 0.10, σ_nom = 100 MPa:
 *   K_t = 0.99957·0.10^(-0.28221) = 1.9144 (pure geometry, material-blind)
 *   σ_max = K_t·σ_nom = 191.4 MPa ;  SF = σ_y/σ_max (material-dependent)
 */
test("stepped shaft: axial K_t golden, and material moves SF but never K_t", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/stepped-shaft-fillet/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  expect(await readOutput(page, "Kt")).toBeCloseTo(1.914, 2); // node lookup, both columns
  expect(await readOutput(page, "sigma_max")).toBeCloseTo(191.4, 0); // MPa, material-blind
  const ktBefore = await readOutput(page, "Kt");
  const sfBefore = await readOutput(page, "SF");
  // K_t is pure geometry: switch material and it must not move; SF must
  await page.getByTestId("material-select").selectOption("steel-4340");
  expect(await readOutput(page, "Kt")).toBeCloseTo(ktBefore, 5); // unchanged — geometry
  expect(await readOutput(page, "sigma_max")).toBeCloseTo(191.4, 0); // unchanged — geometry
  expect(Math.abs((await readOutput(page, "SF")) - sfBefore)).toBeGreaterThan(1); // σ_y up ⇒ SF up
  expect(errors).toEqual([]);
});

test("stepped shaft: the three loadings concentrate the same geometry differently", async ({ page }) => {
  await page.goto("things/stepped-shaft-fillet/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");
  // same D/d = 1.5, r/d = 0.10 — only the cited (A, b) table changes with load
  expect(await readOutput(page, "Kt")).toBeCloseTo(1.914, 2); // axial (default)
  await page.getByTestId("config-select").selectOption("bending");
  expect(await readOutput(page, "Kt")).toBeCloseTo(1.698, 2); // Norton Fig. C-2
  await page.getByTestId("config-select").selectOption("torsion");
  expect(await readOutput(page, "Kt")).toBeCloseTo(1.459, 2); // Norton Fig. C-3 (interp 1.33→2.00)
});

test("stepped shaft: D/d off the table refuses the coefficients and everything below", async ({ page }) => {
  await page.goto("things/stepped-shaft-fillet/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");
  // POISON PATH 1 — the table auto-guard. Axial covers D/d 1.01–2.00; push D/d
  // to 3.0 and there are no coefficients, so A, b AND everything below refuse.
  await page.getByLabel("Diameter ratio D/d value").fill("3");
  await expect(page.locator(".validity-invalid").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/Norton Fig\. C-1|published only/);
  await expect(page.locator('[data-output="A"] output')).toHaveText("—"); // the columns themselves
  await expect(page.locator('[data-output="b"] output')).toHaveText("—");
  await expect(page.locator('[data-output="Kt"] output')).toHaveText("—");
  await expect(page.locator('[data-output="sigma_max"] output')).toHaveText("—");
  await expect(page.locator('[data-output="SF"] output')).toHaveText("—");
});

test("stepped shaft: r/d past the fit range refuses K_t but keeps the looked-up coefficients", async ({ page }) => {
  await page.goto("things/stepped-shaft-fillet/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");
  // POISON PATH 2 — the authored r/d envelope, INDEPENDENT of the table guard.
  // r/d = 0.45 > 0.30 (Norton's plotted limit): the power-law fit has no basis,
  // so K_t downward refuse — but A and b (D/d still in the table) stay live.
  await page.locator("#knob-rd").fill("0.45");
  await expect(page.locator(".validity-invalid").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/plotted only up to r\/d/);
  expect(await readOutput(page, "A")).toBeGreaterThan(0); // honest lookups, D/d in domain
  expect(await readOutput(page, "b")).toBeLessThan(0);
  await expect(page.locator('[data-output="Kt"] output')).toHaveText("—");
  await expect(page.locator('[data-output="sigma_max"] output')).toHaveText("—");
  await expect(page.locator('[data-output="SF"] output')).toHaveText("—");
});

/*
 * Rectangular shaft in torsion (S03) — the THIRD `table` consumer (c1, c2 vs a/b)
 * and its first use outside a machine-element chart. Defaults T=200 N·m,
 * a=60 mm, b=30 mm (a/b=2.0, an EXACT table row: c1=0.246, c2=0.229), L=0.5 m:
 *   tau_max = T/(c1·a·b^2) = 200/(0.246·0.06·0.03^2) = 15.056 MPa (material-blind)
 *   equal-area circle: r_eq=sqrt(ab/pi)=23.94 mm, tau_round=2T/(pi r_eq^3)=9.284 MPa
 *   stress penalty eta_tau = 15.056/9.284 = 1.622  (the rectangle is a bad deal)
 */
test("rectangular torsion: peak-stress golden and the equal-area circle beats it, material-blind", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/rectangular-shaft-torsion/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  await page.getByTestId("material-select").selectOption("steel-4340");
  expect(await readOutput(page, "tau_max")).toBeCloseTo(15.06, 1); // MPa, node lookup a/b=2
  expect(await readOutput(page, "tau_round")).toBeCloseTo(9.284, 1); // equal-area circle, lower
  expect(await readOutput(page, "eta_tau")).toBeCloseTo(1.622, 2); // rectangle carries MORE
  expect(await readOutput(page, "eta_tau")).toBeGreaterThan(1); // ...always, the page's point
  const tauSteel = await readOutput(page, "tau_max");
  const twistSteel = await readOutput(page, "thetap"); // deg/m
  const sfSteel = await readOutput(page, "SF");

  // the torsion-shaft lesson repeats: tau_max is blind to the material; only the
  // twist (G) and the margin (sigma_y) move
  await page.getByTestId("material-select").selectOption("al-6061-t6");
  expect(await readOutput(page, "tau_max")).toBeCloseTo(tauSteel, 5); // identical stress
  expect(await readOutput(page, "thetap")).toBeGreaterThan(twistSteel); // lower G → more twist/m
  expect(await readOutput(page, "SF")).toBeLessThan(sfSteel); //            lower σ_y → less margin
  expect(errors).toEqual([]);
});

test("rectangular torsion: a/b past the tabulated 10 refuses globally — no fabricated coefficient", async ({ page }) => {
  await page.goto("things/rectangular-shaft-torsion/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  // a=60 mm, drop b to 5 mm → a/b = 12 > 10 (past Timoshenko's last row). The
  // authored envelope refuses the WHOLE evaluation rather than extrapolate.
  await page.getByLabel("Short side (b) value").fill("5");
  await expect(page.locator(".validity-invalid").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/table stops at a\/b = 10|interpolation would invent/i);
  for (const sym of ["tau_max", "thetap", "eta_tau", "tau_round", "SF"]) {
    await expect(page.locator(`[data-output="${sym}"] output`)).toHaveText("—");
  }
  await expect(page.locator(".sim figcaption")).toContainText(/nothing honest|outside the tabulated/i);
});

test("rectangular torsion: a/b below 1 tells you to swap the labels", async ({ page }) => {
  await page.goto("things/rectangular-shaft-torsion/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  // a=20 mm with b=30 mm default → a/b = 0.667 < 1: the "long" side is shorter.
  // The refusal names the fix rather than a bare "out of domain".
  await page.getByLabel("Long side (a) value").fill("20");
  await expect(page.locator(".validity-invalid").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/swap your labels|a is meant to be the LONG side/i);
  await expect(page.locator('[data-output="tau_max"] output')).toHaveText("—");
});

/*
 * Beam shear flow (S04) — τ = VQ/Ib, and the THIRD `shear_flow` kind on the N/m
 * dimension vector. Warn-only THING (like simply-supported-beam): the shear
 * formula is defined for all positive inputs, so envelope-visibility is pinned
 * via the two warn banners, not a hard refusal. Defaults V=8 kN, 50×150 mm
 * section, s=100 mm, L=2 m (all material-blind):
 *   τ_max = 3V/2A = 3·8000/(2·0.0075) = 1.60 MPa ; τ_avg = V/A = 1.067 MPa (ratio 1.5)
 *   q = τ_max·b = 1.6e6·0.05 = 80 000 N/m = 80 N/mm ; F = q·s = 8000 N = 8 kN
 */
test("beam shear flow: parabola goldens are material-blind; the peak is 3/2 the average", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("things/beam-shear-flow/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  await page.getByTestId("material-select").selectOption("steel-4340");
  expect(await readOutput(page, "tau_max")).toBeCloseTo(1.6, 2); // MPa
  expect(await readOutput(page, "tau_avg")).toBeCloseTo(1.0667, 2); // MPa
  expect(await readOutput(page, "ratio")).toBeCloseTo(1.5, 5); // the parabola's signature
  expect(await readOutput(page, "q")).toBeCloseTo(80, 1); // N/mm
  expect(await readOutput(page, "F_fastener")).toBeCloseTo(8, 2); // kN
  const sfSteel = await readOutput(page, "SF");

  // statics + geometry only: switching material moves ONLY the margin
  await page.getByTestId("material-select").selectOption("al-6061-t6");
  expect(await readOutput(page, "tau_max")).toBeCloseTo(1.6, 2); // unchanged
  expect(await readOutput(page, "q")).toBeCloseTo(80, 1); // unchanged
  expect(await readOutput(page, "F_fastener")).toBeCloseTo(8, 2); // unchanged
  expect(await readOutput(page, "SF")).toBeLessThan(sfSteel); // lower σ_y → less margin
  expect(errors).toEqual([]);
});

test("beam shear flow: a tiny section past shear yield warns, not silently", async ({ page }) => {
  await page.goto("things/beam-shear-flow/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  // shrink the section and crank V so τ_max = 3V/2A clears σ_y/2 (Tresca shear yield)
  await page.getByLabel("Section width value").fill("10"); // mm
  await page.getByLabel("Section height value").fill("20"); // mm → A=2e-4 m²
  await page.getByLabel("Transverse shear force value").fill("200"); // kN → τ_max=1500 MPa
  await expect(page.locator(".validity-warn").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/shear yield|maximum-shear-stress/i);
});

test("beam shear flow: a short, deep beam warns about neglected shear deflection", async ({ page }) => {
  await page.goto("things/beam-shear-flow/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");

  // L/h below 10 (L=1 m, h=0.15 m → 6.67): the beam pages' neglected shear deflection matters
  await page.getByLabel("Span (for the slenderness check) value").fill("1");
  await expect(page.locator(".validity-warn").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/short, deep beam|shear deflection/i);
});
