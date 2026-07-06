// Engine unit tests via node:test (Node 24 type-strips the .ts imports).
// Covers the chaining type system: dimension AND quantity-kind must match,
// and cycles are rejected by the planner (invariant 2 / ADR-0002).
import assert from "node:assert/strict";
import { test } from "node:test";
import { ChainGraph } from "../src/engines/chain.ts";
import { brent } from "../src/engines/brent.ts";
import { connectionLegal } from "../src/engines/units.ts";

const ANGVEL = { dim: [0, 0, -1, 0, 0, 0, 0], quantity_kind: "angular_velocity" };
const FREQ = { dim: [0, 0, -1, 0, 0, 0, 0], quantity_kind: "frequency" };
const FORCE = { dim: [1, 1, -2, 0, 0, 0, 0], quantity_kind: "force" };
const TORQUE = { dim: [2, 1, -2, 0, 0, 0, 0], quantity_kind: "torque" };
const ENERGY = { dim: [2, 1, -2, 0, 0, 0, 0], quantity_kind: "energy" };
const ANGLE = { dim: [0, 0, 0, 0, 0, 0, 0], quantity_kind: "angle" };
const RATIO = { dim: [0, 0, 0, 0, 0, 0, 0], quantity_kind: "ratio" };
const PROBABILITY = { dim: [0, 0, 0, 0, 0, 0, 0], quantity_kind: "probability" };
const EFFICIENCY = { dim: [0, 0, 0, 0, 0, 0, 0], quantity_kind: "efficiency" };

test("rad/s -> rad/s is legal", () => {
  assert.equal(connectionLegal(ANGVEL, ANGVEL).ok, true);
});

test("N -> rad/s is rejected on dimensions", () => {
  const r = connectionLegal(FORCE, ANGVEL);
  assert.equal(r.ok, false);
  assert.match(r.reason, /dimension mismatch/);
});

test("torque -> energy is rejected on quantity kind despite equal dimensions", () => {
  const r = connectionLegal(TORQUE, ENERGY);
  assert.equal(r.ok, false);
  assert.match(r.reason, /quantity kind/);
});

test("angle -> ratio is rejected despite both being dimensionless", () => {
  assert.equal(connectionLegal(ANGLE, RATIO).ok, false);
});

test("frequency -> angular_velocity is rejected despite equal dimensions (f-port never wires into an ω-port)", () => {
  const r = connectionLegal(FREQ, ANGVEL);
  assert.equal(r.ok, false);
  assert.match(r.reason, /quantity kind/);
  // and the reverse direction is equally illegal — the 2π is always explicit
  assert.equal(connectionLegal(ANGVEL, FREQ).ok, false);
  // a frequency port DOES accept another frequency port
  assert.equal(connectionLegal(FREQ, FREQ).ok, true);
});

test("probability -> ratio / efficiency is rejected despite all being dimensionless (a reliability is not a ratio)", () => {
  const r = connectionLegal(PROBABILITY, RATIO);
  assert.equal(r.ok, false);
  assert.match(r.reason, /quantity kind/);
  // both a geometric ratio and a power efficiency are off-limits, both directions
  assert.equal(connectionLegal(RATIO, PROBABILITY).ok, false);
  assert.equal(connectionLegal(PROBABILITY, EFFICIENCY).ok, false);
  assert.equal(connectionLegal(EFFICIENCY, PROBABILITY).ok, false);
  // a reliability DOES accept another reliability port
  assert.equal(connectionLegal(PROBABILITY, PROBABILITY).ok, true);
});

test("planner rejects feedback loops (v1 forward-only DAG)", () => {
  const g = new ChainGraph();
  g.addNode({ id: "a", outputs: { w: ANGVEL }, inputs: { win: ANGVEL } });
  g.addNode({ id: "b", outputs: { w: ANGVEL }, inputs: { win: ANGVEL } });
  assert.equal(g.connect({ from: { node: "a", port: "w" }, to: { node: "b", port: "win" } }).ok, true);
  const back = g.connect({ from: { node: "b", port: "w" }, to: { node: "a", port: "win" } });
  assert.equal(back.ok, false);
  assert.match(back.reason, /feedback loop/);
  assert.deepEqual(g.evaluationOrder(), ["a", "b"]);
});

test("brent finds a bracketed root (the solve1d on-ramp works)", () => {
  const root = brent((x) => x * x * x - 2, 0, 2, 1e-13);
  assert.ok(Math.abs(root - Math.cbrt(2)) < 1e-10);
  assert.ok(Number.isNaN(brent((x) => x * x + 1, -1, 1))); // unbracketed -> NaN, not a lie
});
