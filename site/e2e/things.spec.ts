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

test("euler column: end conditions are configurations; the inelastic region refuses to answer", async ({ page }) => {
  await page.goto("things/euler-column/");
  await expect(page.getByTestId("thing-widget")).toHaveAttribute("data-ready", "true");
  await page.getByTestId("material-select").selectOption("steel-a36");

  await page.getByTestId("config-select").selectOption("fixed-free");
  await page.getByTestId("material-select").selectOption("steel-a36");
  expect(await readOutput(page, "P_cr")).toBeCloseTo(151.4 / 4, 0); // K=2 ⇒ quarter strength

  await page.getByTestId("config-select").selectOption("pinned-pinned");
  await page.getByTestId("material-select").selectOption("steel-a36");
  await page.locator("#knob-L").fill("0.8"); // λ = 64 < λ_T: intermediate column
  await expect(page.locator(".validity-invalid").first()).toBeVisible();
  await expect(page.locator(".validity")).toContainText(/intermediate|Johnson/i);
  // and no confident mode-shape drawing beside the refusal banner — this
  // invalid fires with every value finite (the engine's verdict, not NaN)
  await expect(page.locator(".sim figcaption")).toContainText(/nothing honest/i);
});

test("verification page discloses authorship and the audit surface", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("verification/");
  await expect(page.getByText(/built end to end by an AI/i).first()).toBeVisible();
  await expect(page.getByText(/No human reviews the content/i).first()).toBeVisible();
  // every THING appears with its audit block (count is a deliberate change detector)
  expect(await page.locator("section.relation-block").count()).toBe(11);
  await expect(page.getByText(/Where physics enters/i).first()).toBeVisible();
  expect(errors).toEqual([]);
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
  expect(Math.abs(kA36 / k1045 - 1)).toBeLessThan(0.01); // steels share one G
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
