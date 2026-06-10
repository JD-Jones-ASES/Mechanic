/**
 * Planetary gearset animation: sun / planets / ring drawn to tooth-count
 * proportions, spun at the engine-computed speeds. rAF runs only while
 * playing; autoplay is disabled under prefers-reduced-motion (ADR-0006).
 * Planet spin comes from the sun-planet mesh relation
 * (ω_s − ω_c)·N_s = −(ω_p − ω_c)·N_p — same Willis form, planet as the ring.
 */
import { useEffect, useRef, useState } from "preact/hooks";
import type { VarRecord } from "../../engines/types";

function gearTicks(cx: number, cy: number, r: number, n: number, angle: number): string {
  const ticks: string[] = [];
  const count = Math.max(6, Math.round(n / 3));
  for (let i = 0; i < count; i++) {
    const a = angle + (i * 2 * Math.PI) / count;
    ticks.push(
      `M ${cx + 0.88 * r * Math.cos(a)} ${cy + 0.88 * r * Math.sin(a)} L ${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`,
    );
  }
  return ticks.join(" ");
}

export function PlanetarySim({ values }: { values: VarRecord }) {
  const { N_s = 24, N_p = 18, N_r = 60, omega_s = 0, omega_c = 0, omega_r = 0 } = values;
  const reduced =
    typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [playing, setPlaying] = useState(!reduced);
  const [t, setT] = useState(0);
  const raf = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    if (!playing) return;
    const tick = (now: number) => {
      if (last.current) setT((t) => t + Math.min(now - last.current, 100) / 1000);
      last.current = now;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf.current);
      last.current = 0;
    };
  }, [playing]);

  // visual time scale: full speed is hypnotic but unreadable
  const SLOW = 0.15;
  const thS = omega_s * t * SLOW;
  const thC = omega_c * t * SLOW;
  const thR = omega_r * t * SLOW;
  const omega_p = N_p === 0 ? 0 : omega_c - ((omega_s - omega_c) * N_s) / N_p;

  const scale = 120 / (N_r + 8);
  const rS = (N_s / 2) * scale;
  const rP = (N_p / 2) * scale;
  const rR = (N_r / 2) * scale;
  const rCarrier = rS + rP;
  const planets = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];

  return (
    <figure class="sim">
      <svg viewBox="-140 -140 280 280" role="img" aria-label="Planetary gearset diagram" width="100%">
        <title>Planetary gearset: sun, three planets, ring, and carrier</title>
        <desc>
          Gears drawn proportional to tooth counts; tick marks show each gear rotating at the
          computed speed.
        </desc>
        {/* ring */}
        <circle r={rR + 6} class="gear-ring-outer" fill="none" />
        <circle r={rR} class="gear-ring" fill="none" />
        <path d={gearTicks(0, 0, rR, N_r, thR)} class="gear-teeth" />
        {/* carrier arms + planets */}
        {planets.map((off) => {
          const px = rCarrier * Math.cos(thC + off);
          const py = rCarrier * Math.sin(thC + off);
          return (
            <g key={off}>
              <line x1="0" y1="0" x2={px} y2={py} class="carrier-arm" />
              <circle cx={px} cy={py} r={rP} class="gear-planet" />
              <path d={gearTicks(px, py, rP, N_p, omega_p * t * SLOW)} class="gear-teeth" />
            </g>
          );
        })}
        {/* sun */}
        <circle r={rS} class="gear-sun" />
        <path d={gearTicks(0, 0, rS, N_s, thS)} class="gear-teeth" />
        <circle r={2.5} class="gear-hub" />
      </svg>
      <figcaption>
        <button type="button" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
          {playing ? "Pause" : "Animate"}
        </button>{" "}
        Drawn to tooth-count proportions; rotation slowed for readability.
      </figcaption>
    </figure>
  );
}
