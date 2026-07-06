/**
 * Impact loading: a mass raised above an elastic member, dropped, and caught —
 * the member flashing as the stress spikes to n·σ_st at the bottom of the fall.
 * The loading selector `mode` (0 axial rod, 1 cantilever tip strike) redraws the
 * struck member; two side-by-side bars compare the static stress with the impact
 * stress against a yield reference line, both growing with the drop-height knob.
 *
 * IMPORTANT: the clock here only PRESENTS the already-solved state — it plays a
 * raise–drop–flash cycle purely for legibility. Nothing is integrated: there is
 * no equation of motion stepped, no dv/dt, no contact model. The engine has
 * already computed the impact factor n by the energy method; this loop just
 * animates a mass falling and the member flashing at the peak. (Batch
 * discipline: dynamics without a clock — the first sim that integrates the
 * motion has broken the design.)
 */
import type { JSX } from "preact";
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { SimRefusal } from "./SimRefusal";
import { useSimClock } from "./useSimClock";

const clamp = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), hi);

export function ImpactLoadingSim({
  values,
  invalid = false,
}: {
  values: VarRecord;
  invalid?: boolean;
}) {
  // no destructuring defaults for load-bearing values (invariant 5): a confident
  // default figure drawn over a refused state is exactly what the contract forbids
  const mode = values.mode ?? 0; // 0 axial rod, 1 cantilever
  const n = values.n ?? NaN;
  const SF = values.SF ?? NaN;
  const hDrop = values.h ?? NaN;
  const sigma_i = values.sigma_i ?? NaN;
  const sigma_st = values.sigma_st ?? NaN;
  const refused =
    invalid ||
    !Number.isFinite(n) ||
    n <= 0 ||
    !Number.isFinite(SF) ||
    SF <= 0 ||
    !Number.isFinite(sigma_i) ||
    sigma_i <= 0;

  const { t, playing, setPlaying } = useSimClock(!refused);

  // one raise–drop–flash cycle: accelerating fall, a brief contact, a slow raise
  const cyc = (t % 2.2) / 2.2;
  let raise: number; // 1 = mass fully raised at the drop height, 0 = touching member
  if (cyc < 0.45) raise = 1 - (cyc / 0.45) ** 2; // accelerating fall
  else if (cyc < 0.63) raise = 0; // in contact
  else raise = (cyc - 0.63) / 0.37; // linear rise back
  const contact = cyc >= 0.42 && cyc < 0.66;
  const defl = contact ? Math.sin(((cyc - 0.42) / 0.24) * Math.PI) : 0; // 0→1→0 pulse
  const flashOn = defl > 0.4;

  if (refused) {
    return <SimRefusal ariaLabel="Impact-loading diagram (undefined state)" height={260} />;
  }

  const W = 340;
  const H = 300;
  const danger = Number.isFinite(SF) && SF < 1;
  // yield stress reconstructed from the readouts (SF = σ_y / σ_i) so the bars are
  // absolute and the yield line is a real threshold, not an arbitrary scale
  const sigma_y = sigma_i * SF;
  const barBase = 250;
  const barMax = 150; // pixels representing σ_y (the yield line)
  const hImp = clamp((sigma_i / sigma_y) * barMax, 0, barMax * 1.12);
  const hSt = clamp((sigma_st / sigma_y) * barMax, 0.6, barMax * 1.12);
  const yYield = barBase - barMax;
  // raise height grows (sub-linearly) with the drop-height knob
  const visRaise = clamp(22 + 34 * Math.sqrt(clamp(hDrop, 0, 4) / 0.5), 22, 82);
  const visDefl = 15 * defl; // exaggerated member give-way at impact
  const memberClass = danger && contact ? "beam-line beam-yielding" : "beam-line";
  const mpa = (s: number) => (Number.isFinite(s) ? toDisplay(s, "MPa").toFixed(s > 1e6 ? 0 : 2) : "—");

  // ---- member + falling mass geometry, per loading ----
  const massW = 34;
  const massH = 20;
  let stage: JSX.Element;
  if (mode >= 0.5) {
    // cantilever: wall at left, horizontal bar, mass falling onto the tip
    const wallX = 34;
    const yBar = 96;
    const tipX = 196;
    const tipY = yBar + visDefl;
    const massCx = tipX;
    const massBottom = tipY - 2 - raise * visRaise;
    const curve: string[] = [];
    for (let i = 0; i <= 30; i++) {
      const s = i / 30;
      const v = (s * s * (3 - s)) / 2; // cantilever shape v(x)/δ_tip
      curve.push(`${wallX + s * (tipX - wallX)},${yBar + v * visDefl}`);
    }
    stage = (
      <g>
        <rect x={wallX - 14} y={yBar - 40} width="14" height="96" class="beam-wall" />
        <line x1={wallX} y1={yBar} x2={tipX} y2={yBar} class="beam-ghost" />
        <polyline points={curve.join(" ")} class={memberClass} fill="none" />
        {flashOn ? <circle cx={tipX} cy={tipY} r={13} class="impact-flash" /> : null}
        {/* drop trail + falling mass */}
        <line x1={massCx} y1={massBottom - 4} x2={massCx} y2={tipY - 2} class="impact-drop" />
        <rect
          x={massCx - massW / 2}
          y={massBottom - massH}
          width={massW}
          height={massH}
          rx={2}
          class="impact-mass"
        />
        <text x={massCx} y={massBottom - massH - 5} text-anchor="middle" class="sim-label">
          m
        </text>
        <text x={(wallX + tipX) / 2} y={yBar + 44} text-anchor="middle" class="sim-label-small">
          cantilever tip strike
        </text>
      </g>
    );
  } else {
    // axial rod: fixed base plate, vertical bar, mass falling onto the top flange
    const rodX = 110;
    const baseY = 244;
    const topY = 96 + visDefl; // top of rod drops slightly at impact
    const massBottom = topY - 6 - raise * visRaise;
    stage = (
      <g>
        <line x1={rodX - 26} y1={baseY} x2={rodX + 26} y2={baseY} class="scs-base" />
        <rect x={rodX - 24} y={baseY} width="48" height="6" class="beam-wall" />
        <line x1={rodX} y1={96} x2={rodX} y2={baseY} class="beam-ghost" />
        <line x1={rodX} y1={topY} x2={rodX} y2={baseY} class={memberClass} />
        {/* top flange the collar lands on */}
        <line x1={rodX - 16} y1={topY} x2={rodX + 16} y2={topY} class="load-arrow" />
        {flashOn ? <circle cx={rodX} cy={topY} r={13} class="impact-flash" /> : null}
        <line x1={rodX} y1={massBottom} x2={rodX} y2={topY} class="impact-drop" />
        <rect
          x={rodX - massW / 2}
          y={massBottom - massH}
          width={massW}
          height={massH}
          rx={2}
          class="impact-mass"
        />
        <text x={rodX} y={massBottom - massH - 5} text-anchor="middle" class="sim-label">
          m
        </text>
        <text x={rodX} y={baseY + 16} text-anchor="middle" class="sim-label-small">
          axial rod
        </text>
      </g>
    );
  }

  return (
    <figure class="sim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Impact-loading diagram" width="100%">
        <title>A mass dropped onto an elastic member, with static and impact stress bars</title>
        <desc>
          A mass is raised above an elastic member (an axial rod or a cantilever tip, per the loading
          selector), dropped, and caught — the member flashes as the stress spikes at the bottom of
          the fall. Two bars on the right compare the static stress with the impact stress against a
          dashed yield line; the impact bar turns red and the member flashes red when the impact
          stress exceeds yield.
        </desc>

        {stage}

        {/* stress bars: static vs impact, against a yield reference */}
        <line x1={244} y1={yYield} x2={330} y2={yYield} class="beam-ghost" />
        <text x={332} y={yYield + 3} class="sim-label-small">
          σ_y
        </text>
        <rect x={250} y={barBase - hSt} width={26} height={hSt} class="stress-fill" />
        <rect
          x={292}
          y={barBase - hImp}
          width={26}
          height={hImp}
          class={danger ? "stress-fill-over" : "stress-fill"}
        />
        <line x1={244} y1={barBase} x2={330} y2={barBase} class="scs-axis" />
        <text x={263} y={barBase + 13} text-anchor="middle" class="sim-label-small">
          σ_st
        </text>
        <text x={305} y={barBase + 13} text-anchor="middle" class="sim-label-small">
          σ_i
        </text>
      </svg>
      <figcaption>
        <button type="button" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
          {playing ? "Pause" : "Animate"}
        </button>{" "}
        Impact factor n ≈ {Number.isFinite(n) ? n.toFixed(1) : "—"}: static stress {mpa(sigma_st)} MPa
        → impact stress {mpa(sigma_i)} MPa (safety factor{" "}
        {Number.isFinite(SF) ? SF.toFixed(2) : "—"}). Drop and deflection shown exaggerated for
        visibility; the spike is played back, not integrated.
        {danger ? " Impact stress exceeds yield — shown red." : ""}
      </figcaption>
    </figure>
  );
}
