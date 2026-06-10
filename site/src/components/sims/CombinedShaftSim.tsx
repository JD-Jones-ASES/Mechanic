/**
 * Combined bending + torsion: Mohr's circle, drawn live from the knobs. The
 * circle's center is σ_b/2, its radius IS τ_max, and the two marked points
 * are the element's faces (σ_b, τ_t) and (0, −τ_t) — so the picture the
 * derivation cites is the picture on screen. A von Mises tick on the σ-axis
 * shows σ' for comparison. Axes auto-scale to the circle; the whole figure
 * turns red past first yield on either criterion. Static figure. The
 * engine's `invalid` verdict is the authoritative refusal signal.
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";

export function CombinedShaftSim({ values, invalid = false }: { values: VarRecord; invalid?: boolean }) {
  // no destructuring defaults: a confident default circle over a refused
  // state is exactly what invariant 5 forbids
  const sigma_b = values.sigma_b ?? NaN;
  const tau_t = values.tau_t ?? NaN;
  const tau_max = values.tau_max ?? NaN;
  const sigma_vm = values.sigma_vm ?? NaN;
  const SF_t = values.SF_t ?? Infinity;
  const SF_vm = values.SF_vm ?? Infinity;

  const ok = !invalid && [sigma_b, tau_t, tau_max].every(Number.isFinite) && tau_max > 0;
  const W = 320;
  const H = 230;

  if (!ok) {
    return (
      <SimRefusal
        ariaLabel="Mohr's circle diagram (refused state)"
        label="refused"
        caption="The engine refused this state — there is no honest stress circle to draw."
        height={H}
      />
    );
  }

  // stress-space → pixel mapping: fit the circle (and the σ' tick) with margin
  const cx0 = 150; // pixel x of σ = 0
  const cy0 = 118; // pixel y of τ = 0
  const extent = Math.max(sigma_b / 2 + tau_max, Number.isFinite(sigma_vm) ? sigma_vm : 0, 1);
  const k = 128 / extent; // Pa → px
  const cX = cx0 + (sigma_b / 2) * k;
  const r = tau_max * k;
  const danger = (Number.isFinite(SF_t) && SF_t < 1) || (Number.isFinite(SF_vm) && SF_vm < 1);

  const faceX = cx0 + sigma_b * k; // (σ_b, +τ_t)
  const faceY = cy0 - tau_t * k;
  const face2X = cx0; // (0, −τ_t)
  const face2Y = cy0 + tau_t * k;
  const vmX = Number.isFinite(sigma_vm) ? cx0 + sigma_vm * k : NaN;

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Mohr's circle for the shaft surface element" width="100%">
        <title>Mohr's circle of the combined bending and torsion stress state</title>
        <desc>
          A circle in sigma-tau space centered at half the bending stress with radius equal to
          the maximum shear stress. Two dots mark the element's faces; a tick on the sigma axis
          marks the von Mises stress. The figure turns red past first yield.
        </desc>
        {/* axes */}
        <line x1={14} y1={cy0} x2={W - 8} y2={cy0} class="mohr-axis" />
        <line x1={cx0} y1={14} x2={cx0} y2={H - 26} class="mohr-axis" />
        <text x={W - 22} y={cy0 - 6} class="sim-label">
          σ
        </text>
        <text x={cx0 + 6} y={22} class="sim-label">
          τ
        </text>
        {/* the circle */}
        <circle cx={cX} cy={cy0} r={r} class={danger ? "mohr-circle-hot" : "mohr-circle"} />
        {/* center + radius to τ_max (top of circle) */}
        <circle cx={cX} cy={cy0} r={2.5} class="mohr-point" />
        <line x1={cX} y1={cy0} x2={cX} y2={cy0 - r} class="mohr-radius" />
        <text x={cX + 6} y={cy0 - r / 2} class="sim-label">
          τ_max
        </text>
        {/* element faces and their diameter */}
        <line x1={faceX} y1={faceY} x2={face2X} y2={face2Y} class="mohr-chord" />
        <circle cx={faceX} cy={faceY} r={4} class="mohr-point" />
        <circle cx={face2X} cy={face2Y} r={4} class="mohr-point" />
        <text
          x={faceX > 250 ? faceX - 7 : faceX + 7}
          y={faceY + 4}
          text-anchor={faceX > 250 ? "end" : "start"}
          class="sim-label"
        >
          (σ_b, τ_t)
        </text>
        {/* von Mises tick on the σ axis */}
        {Number.isFinite(vmX) ? (
          <g>
            <line x1={vmX} y1={cy0 - 7} x2={vmX} y2={cy0 + 7} class="mohr-vm" />
            <text x={vmX - 8} y={cy0 + 20} class="sim-label">
              σ′
            </text>
          </g>
        ) : null}
      </svg>
      <figcaption>
        Mohr's circle, live: center σ_b/2 = {Number.isFinite(sigma_b) ? toDisplay(sigma_b / 2, "MPa").toFixed(1) : "—"} MPa,
        radius τ_max = {Number.isFinite(tau_max) ? toDisplay(tau_max, "MPa").toFixed(1) : "—"} MPa; the dots are the
        element's two faces, and σ′ = {Number.isFinite(sigma_vm) ? toDisplay(sigma_vm, "MPa").toFixed(1) : "—"} MPa is
        the von Mises tick.
        {danger ? " Shown red: past first yield on at least one criterion." : ""}
      </figcaption>
    </figure>
  );
}
