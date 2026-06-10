/**
 * Concentric stress-field bands — the shared visual language for radial
 * stress fields (flywheel, thick cylinder, and whatever comes next): band
 * opacity follows the normalized field profile, the whole field "heats up"
 * as the margin approaches first yield (heat = 0.25 + 0.65·min(1, 1/SF)),
 * and the bands turn red past it. One implementation so the encoding can
 * never drift between THINGs.
 */
import type { JSX } from "preact";

const N_BANDS = 6;

export function StressBands({
  cx,
  cy,
  rInner,
  rOuter,
  profile,
  SF,
}: {
  cx: number;
  cy: number;
  rInner: number;
  rOuter: number;
  /** normalized field value at fraction f ∈ (0,1) across [rInner, rOuter]; 1 = field peak */
  profile: (f: number) => number;
  SF: number;
}): JSX.Element {
  const heat = 0.25 + 0.65 * Math.min(1, Number.isFinite(SF) && SF > 0 ? 1 / SF : 0);
  const danger = Number.isFinite(SF) && SF < 1;
  const bandW = (rOuter - rInner) / N_BANDS;
  const bands = Array.from({ length: N_BANDS }, (_, i) => {
    const f = (i + 0.5) / N_BANDS;
    return {
      r: rInner + (i + 0.5) * bandW,
      alpha: Math.max(0, Math.min(1, profile(f) * heat)),
    };
  });
  return (
    <g>
      {bands.map((b) => (
        <circle
          cx={cx}
          cy={cy}
          r={b.r}
          class={danger ? "stress-band-hot" : "stress-band"}
          stroke-width={bandW}
          stroke-opacity={b.alpha}
          key={b.r}
        />
      ))}
    </g>
  );
}
