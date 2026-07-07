/**
 * Θ-kinds display↔SI round-trip (QC2 hardening b). The two temperature kinds
 * S18 added — temperature_difference (SI unit K) and thermal_expansion_coefficient
 * (SI 1/K, displayed as ×10⁻⁶/K) — shipped with no round-trip unit coverage. A
 * display factor that silently drifted would mislabel every ΔT/CTE readout by
 * orders of magnitude (invariant 5: wrong-as-labeled must not slip through).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { fromDisplay, toDisplay } from "../src/engines/units.ts";

const rel = (a, b, tol = 1e-12) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

test("ΔT in K is an interval — 1:1 with SI (no offset scale)", () => {
  assert.equal(fromDisplay(50, "K"), 50);
  assert.equal(toDisplay(50, "K"), 50);
});

test("CTE ×10⁻⁶/K ↔ SI 1/K converts by 1e-6 and round-trips", () => {
  // 23.4 ×10⁻⁶/K (the S18 aluminium value) → 2.34e-5 /K in SI, and back exactly
  assert.ok(rel(fromDisplay(23.4, "1e-6/K"), 2.34e-5), "display→SI");
  assert.ok(rel(toDisplay(2.34e-5, "1e-6/K"), 23.4), "SI→display");
});

test("both Θ display units survive display→SI→display", () => {
  for (const [unit, x] of [
    ["K", 50],
    ["1e-6/K", 11.7], // steel α
  ]) {
    assert.ok(rel(toDisplay(fromDisplay(x, unit), unit), x), `${unit} round-trip`);
  }
});
