/**
 * Shared rAF clock for animated sims. One implementation of the ADR-0006
 * behavior (autoplay disabled under prefers-reduced-motion) instead of a
 * copy per sim — the loop runs only while `playing` AND `active`; pass
 * active=false to stop it entirely (e.g. while the engine refuses the
 * state: re-rendering a static refusal figure at 60 fps is battery burn).
 * Frame deltas are clamped to 100 ms so a backgrounded tab doesn't jump.
 */
import { useEffect, useRef, useState } from "preact/hooks";

export function useSimClock(active = true): {
  t: number;
  playing: boolean;
  setPlaying: (updater: (p: boolean) => boolean) => void;
} {
  const reduced =
    typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [playing, setPlaying] = useState(!reduced);
  const [t, setT] = useState(0);
  const raf = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    if (!playing || !active) return;
    const tick = (now: number) => {
      if (last.current) setT((v) => v + Math.min(now - last.current, 100) / 1000);
      last.current = now;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf.current);
      last.current = 0;
    };
  }, [playing, active]);

  return { t, playing, setPlaying };
}
