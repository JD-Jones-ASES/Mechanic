/**
 * Two-segment bar clamped between rigid walls under a uniform temperature change.
 * Two presentational views, both pure functions of the engine's evaluated outputs
 * (invariant 4 — no widget math beyond layout):
 *   - the CLAMPED bar: two segments (widths to the length ratio, heights to the
 *     area ratio) pinned between two hatched rigid walls, each shaded by its own
 *     material and turned red past its own first yield; inward arrows for a heating
 *     (compression) state, outward for cooling (tension);
 *   - the FREE-EXPANSION ghost: a dashed outline of what the same bar would become
 *     if the walls vanished (each segment grown by its free strain α_i ΔT). The part
 *     that overshoots the right wall is the expansion the walls BLOCKED — the visible
 *     source of the thermal force. On cooling the ghost falls short of the wall,
 *     showing the bar would shrink and is instead held in tension.
 * The engine's `invalid` verdict alone decides refusal (a singular determinant); the
 * per-segment yield tint is a WARN cue computed from |σ_i| vs σ_y,i, exactly as the
 * composite bar tints from its own first-yield margin.
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";

export function ThermalAssemblySim({
  values,
  invalid = false,
}: {
  values: VarRecord;
  invalid?: boolean;
}) {
  // no destructuring defaults: a confident figure over a refused state is exactly
  // what invariant 5 forbids
  const L_1 = values.L_1 ?? NaN;
  const L_2 = values.L_2 ?? NaN;
  const A_1 = values.A_1 ?? NaN;
  const A_2 = values.A_2 ?? NaN;
  const F_1 = values.F_1 ?? NaN;
  const sigma_1 = values.sigma_1 ?? NaN;
  const sigma_2 = values.sigma_2 ?? NaN;
  const eps_1 = values.eps_1 ?? NaN;
  const eps_2 = values.eps_2 ?? NaN;
  const dT = values.dT ?? NaN;
  const sy1 = values.sigma_y_1 ?? Infinity;
  const sy2 = values.sigma_y_2 ?? Infinity;

  const W = 340;
  const H = 214;

  const ok =
    !invalid &&
    [L_1, L_2, A_1, A_2, F_1, sigma_1, sigma_2, eps_1, eps_2, dT].every(Number.isFinite) &&
    L_1 > 0 &&
    L_2 > 0 &&
    A_1 > 0 &&
    A_2 > 0;
  if (!ok) {
    return (
      <SimRefusal
        ariaLabel="Thermal assembly diagram (refused state)"
        label="refused"
        caption="The engine refused this state — there is no honest thermal-stress diagram to draw."
        height={H}
      />
    );
  }

  // each segment's own first-yield WARN cue (|σ_i| ≥ σ_y_i); the page still renders
  const leftYield = Number.isFinite(sy1) && Math.abs(sigma_1) >= sy1;
  const rightYield = Number.isFinite(sy2) && Math.abs(sigma_2) >= sy2;
  const leftClass = leftYield ? "ta-yield" : "ta-seg-left";
  const rightClass = rightYield ? "ta-yield" : "ta-seg-right";

  // heating (ΔT>0) puts the bar in compression: F_1 > 0. Cooling flips it to tension.
  const compression = F_1 >= 0;

  // ---- geometry: clamped bar between two rigid walls ----
  const wallL = 34;
  const wallR = 306;
  const wallGap = wallR - wallL;
  const yBar = 62;
  const pxPerM = wallGap / (L_1 + L_2);
  const w1 = wallGap * (L_1 / (L_1 + L_2));
  const w2 = wallGap - w1;
  const maxA = Math.max(A_1, A_2);
  const hMax = 44;
  const h1 = hMax * (A_1 / maxA);
  const h2 = hMax * (A_2 / maxA);
  const junctionX = wallL + w1;

  // ---- free-expansion ghost (dashed), same px/m scale, anchored at the left wall ----
  const yGhost = 150;
  const hGhost = 18;
  const gw1 = L_1 * (1 + eps_1) * pxPerM;
  const gw2 = L_2 * (1 + eps_2) * pxPerM;
  const ghostEnd = wallL + gw1 + gw2;
  const overhang = ghostEnd - wallR; // + heating (blocked expansion), − cooling (shrink gap)

  const wallTop = 26;
  const wallBot = 98;

  // arrow helper: a horizontal reaction arrow of length `len` (sign = direction), tail at x
  const arrow = (x: number, dir: number, key: string) => {
    const tip = x + dir * 16;
    return (
      <g key={key}>
        <line x1={x} y1={yBar} x2={tip} y2={yBar} class="load-arrow" />
        <path
          d={`M ${tip} ${yBar} L ${tip - dir * 6} ${yBar - 4} M ${tip} ${yBar} L ${tip - dir * 6} ${yBar + 4}`}
          class="load-arrow"
          fill="none"
        />
      </g>
    );
  };

  const mpa = (s: number) => toDisplay(s, "MPa").toFixed(0);

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Two-segment bar clamped between rigid walls under a temperature change" width="100%">
        <title>Thermal assembly: two materials clamped between rigid walls, heated or cooled</title>
        <desc>
          Two segments of different metals joined end to end and pinned between two rigid walls, drawn
          to their length and area ratios and each shaded by its material. Below, a dashed outline shows
          the bar's free (unclamped) length after the same temperature change; the part that overshoots
          the right wall is the expansion the walls blocked, which is what drives the internal force. A
          segment turns red past its own first yield.
        </desc>

        {/* ground line + hatching under both walls */}
        <line x1={wallL - 6} y1={wallBot} x2={wallR + 6} y2={wallBot} class="propped-hatch" />
        {Array.from({ length: 6 }, (_, i) => (
          <line key={`hl${i}`} x1={wallL - 6 + i * 5} y1={wallBot + 7} x2={wallL - 6 + i * 5 - 6} y2={wallBot} class="propped-hatch" />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <line key={`hr${i}`} x1={wallR + 6 - i * 5} y1={wallBot + 7} x2={wallR + 6 - i * 5 + 6} y2={wallBot} class="propped-hatch" />
        ))}

        {/* the two rigid walls */}
        <rect x={wallL - 8} y={wallTop} width={8} height={wallBot - wallTop} class="beam-wall" />
        <rect x={wallR} y={wallTop} width={8} height={wallBot - wallTop} class="beam-wall" />

        {/* clamped bar: two segments, heights to area ratio, centred on yBar */}
        <rect x={wallL} y={yBar - h1 / 2} width={w1} height={h1} class={leftClass} />
        <rect x={junctionX} y={yBar - h2 / 2} width={w2} height={h2} class={rightClass} />
        <rect x={wallL} y={yBar - h1 / 2} width={w1} height={h1} class="sim-outline" />
        <rect x={junctionX} y={yBar - h2 / 2} width={w2} height={h2} class="sim-outline" />
        <line x1={junctionX} y1={yBar - Math.max(h1, h2) / 2 - 3} x2={junctionX} y2={yBar + Math.max(h1, h2) / 2 + 3} class="beam-ghost" />

        {/* reaction arrows: inward for compression (heating), outward for tension (cooling) */}
        {compression
          ? [arrow(wallL + 2, +1, "aL"), arrow(wallR - 2, -1, "aR")]
          : [arrow(wallL + 18, -1, "aL"), arrow(wallR - 18, +1, "aR")]}

        <text x={(wallL + wallR) / 2} y={yBar - hMax / 2 - 8} text-anchor="middle" class="sim-label-small">
          clamped: ΔT {dT > 0 ? "+" : ""}{dT.toFixed(0)} K · {compression ? "compression" : "tension"}
        </text>
        <text x={wallL + w1 / 2} y={yBar + 4} text-anchor="middle" class="sim-label-small">left</text>
        <text x={junctionX + w2 / 2} y={yBar + 4} text-anchor="middle" class="sim-label-small">right</text>

        {/* free-expansion ghost row */}
        <text x={wallL} y={yGhost - 6} class="sim-label-small">free (unclamped) length after ΔT</text>
        {/* the amount blocked / short: shade between the wall and the ghost's free end */}
        {Math.abs(overhang) > 0.5 && (
          <rect
            x={Math.min(wallR, ghostEnd)}
            y={yGhost}
            width={Math.abs(overhang)}
            height={hGhost}
            class="ta-blocked"
          />
        )}
        <rect x={wallL} y={yGhost} width={Math.max(0, gw1)} height={hGhost} class="beam-ghost" fill="none" />
        <rect x={wallL + gw1} y={yGhost} width={Math.max(0, gw2)} height={hGhost} class="beam-ghost" fill="none" />
        {/* right-wall reference line the free end is measured against */}
        <line x1={wallR} y1={yGhost - 3} x2={wallR} y2={yGhost + hGhost + 8} class="beam-wall" stroke-width={2} />
        <text x={wallR} y={yGhost + hGhost + 18} text-anchor="middle" class="sim-label-small">wall</text>
        <text
          x={overhang >= 0 ? Math.min(W - 2, ghostEnd + 3) : ghostEnd - 3}
          y={yGhost + hGhost - 5}
          text-anchor={overhang >= 0 ? "start" : "end"}
          class="sim-label-small"
        >
          {overhang >= 0 ? "blocked →" : "← shrank"}
        </text>
      </svg>
      <figcaption>
        ΔT {dT > 0 ? "+" : ""}{dT.toFixed(0)} K develops an internal force {toDisplay(F_1, "kN").toFixed(1)} kN
        ({compression ? "compression" : "tension"}): σ_left {mpa(sigma_1)} MPa, σ_right {mpa(sigma_2)} MPa
        (the slimmer segment carries the higher stress). Free strains α·ΔT differ —
        left {(eps_1 * 1e6).toFixed(0)}, right {(eps_2 * 1e6).toFixed(0)} µε — and that mismatch,
        blocked by the walls, is the whole force.
        {leftYield ? " Left shown red: past its first yield." : ""}
        {rightYield ? " Right shown red: past its first yield." : ""}
      </figcaption>
    </figure>
  );
}
