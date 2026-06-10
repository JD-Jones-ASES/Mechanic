/**
 * The shared refusal figure: when the engine refuses a state (invariant 5 —
 * banners, never plausible wrong pictures), sims render this instead of a
 * confident default-geometry drawing. Parameterized so each THING can say
 * specifically why there is nothing honest to draw.
 */
import type { JSX } from "preact";

export function SimRefusal({
  ariaLabel,
  label = "undefined here",
  caption = "This state was refused by the engine — nothing honest to draw.",
  height = 240,
}: {
  ariaLabel: string;
  label?: string;
  caption?: string;
  height?: number;
}): JSX.Element {
  const W = 320;
  const cx = W / 2;
  const cy = height / 2;
  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={ariaLabel} width="100%">
        <title>{ariaLabel}</title>
        <desc>The engine refused this state; there is no honest figure to draw.</desc>
        <circle cx={cx} cy={cy} r={Math.min(80, cy - 14)} class="beam-ghost" fill="none" />
        <text x={cx} y={cy + 4} text-anchor="middle" class="sim-label">
          {label}
        </text>
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
