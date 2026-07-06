/**
 * Small pure math helpers shared across sim components — the same factoring as
 * useSimClock/SimRefusal/StressBands, so a one-liner like `clamp` is defined
 * once instead of copied per sim.
 */

/** Constrain x to the closed interval [lo, hi]. */
export const clamp = (x: number, lo: number, hi: number): number =>
  Math.min(Math.max(x, lo), hi);
