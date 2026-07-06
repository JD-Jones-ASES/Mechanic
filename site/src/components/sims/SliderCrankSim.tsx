/**
 * Slider-crank drawn side-on from the engine's solved values: the crank circle
 * and arm, the connecting rod, the piston in its cylinder guide, and — when
 * paused — the force overlay (gas force F, rod obliquity phi, crank torque T,
 * piston velocity v). Every STATIC coordinate and every arrow magnitude comes
 * from the verified closed forms in `values` (invariant 4: no physics math in
 * the widget; the piston sits at the engine's x, the arrows scale with the
 * engine's F/F_rod/T/v).
 *
 * The animate toggle sweeps a PRESENTATION crank angle so the piston's TDC/BDC
 * asymmetry is watchable. While it plays, the readouts and the force overlay
 * stay pinned to the knob theta (the overlay is hidden, since the pose no longer
 * matches the solved forces), and the ONE geometric recompute — the piston reach
 * at the swept angle — renders the linkage pose only. Nothing here is integrated
 * and nothing feeds the engine or the readouts: presentation, NOT integration
 * (batch discipline — the first sim that integrates the motion has broken the
 * design). The engine's `invalid` verdict is the only authoritative refusal
 * signal.
 */
import type { VarRecord } from "../../engines/types";
import { toDisplay } from "../../engines/units";
import { clamp } from "./simMath";
import { SimRefusal } from "./SimRefusal";
import { useSimClock } from "./useSimClock";

export function SliderCrankSim({
  values,
  invalid = false,
}: {
  values: VarRecord;
  invalid?: boolean;
}) {
  // no destructuring defaults for load-bearing values: a confident default pose
  // drawn over a refused state is exactly what invariant 5 forbids
  const r = values.r ?? NaN;
  const l = values.l ?? NaN;
  const theta = values.theta ?? NaN; // the knob angle; the readouts correspond to THIS pose
  const x = values.x ?? NaN; // piston position from the crank axis, engine-solved
  const v = values.v ?? NaN;
  const phi = values.phi ?? NaN;
  const F = values.F ?? NaN;
  const T = values.T ?? NaN;
  const refused =
    invalid ||
    !Number.isFinite(r) ||
    r <= 0 ||
    !Number.isFinite(l) ||
    l <= 0 ||
    !Number.isFinite(x) ||
    !Number.isFinite(theta);

  // PRESENTATION clock: while playing, sweep a display crank angle so the
  // mechanism's motion is visible. It plays back geometry only — there is no
  // dtheta/dt step, no ODE. (See the file header: presentation, not integration.)
  const { t, playing, setPlaying } = useSimClock(!refused);
  const thetaDraw = playing && !refused ? theta + 1.15 * t : theta; // rad, visual sweep from theta

  // world (metres) -> screen; fit x in [-r, l+r] and y in [-r, r], y up
  const W = 372;
  const H = 208;
  const pad = 26;
  const xLo = -r * 1.15;
  const xHi = (l + r) * 1.06;
  const yHalf = r * 1.4;
  const s = Math.min((W - 2 * pad) / (xHi - xLo), (H - 2 * pad) / (2 * yHalf));
  const cyAxis = H / 2;
  const ox = pad - xLo * s;
  const X = (wx: number) => ox + wx * s;
  const Y = (wy: number) => cyAxis - wy * s;

  // after the hooks (rules of hooks): refuse to draw a state the engine refused
  if (refused) {
    return (
      <SimRefusal
        ariaLabel="Slider-crank diagram (undefined state)"
        label="cannot assemble"
        caption="The connecting rod is no longer than the crank (l ≤ r): the mechanism cannot close through a full rotation, so there is no honest pose to draw."
      />
    );
  }

  // pose at the drawn angle (knob theta when paused — matching the engine's x —
  // and the swept presentation angle when playing)
  const pinX = r * Math.cos(thetaDraw);
  const pinY = r * Math.sin(thetaDraw);
  const qDraw = Math.sqrt(Math.max(l * l - r * r * Math.sin(thetaDraw) ** 2, 0));
  const pistX = playing ? pinX + qDraw : x; // paused: the engine value exactly

  const ocx = X(0);
  const ocy = Y(0);
  const px = X(pinX);
  const py = Y(pinY);
  const qx = X(pistX);
  const qy = Y(0);

  const rCircle = r * s;
  const pistHalfH = clamp(rCircle * 0.42, 10, 20);
  const pistHalfW = clamp(rCircle * 0.3, 8, 16);

  const extremeObliquity = Number.isFinite(l) && Number.isFinite(r) && 2 * r > l; // r/l > 0.5 warn
  const showForces = !playing; // forces/velocity only match the pose at the knob theta

  // arrowhead triangle at (tx,ty) pointing along the unit screen vector (ux,uy)
  const head = (tx: number, ty: number, ux: number, uy: number, cls: string, size = 6) => {
    const a = Math.atan2(uy, ux);
    const a1 = a + Math.PI - 0.42;
    const a2 = a + Math.PI + 0.42;
    return (
      <path
        d={`M ${tx} ${ty} L ${tx + size * 1.7 * Math.cos(a1)} ${ty + size * 1.7 * Math.sin(a1)} L ${tx + size * 1.7 * Math.cos(a2)} ${ty + size * 1.7 * Math.sin(a2)} Z`}
        class={cls}
      />
    );
  };

  // gas force F: bold arrow from the cylinder head (right) pushing the piston
  // left, length scaled by F (clamped, monotonic)
  const fpx = clamp(22 + (Number.isFinite(F) ? F : 0) / 4000 * 34, 12, 96);
  const fTailX = qx + pistHalfW + fpx;
  const fTipX = qx + pistHalfW + 2;

  // piston velocity v: thin arrow along the axis (above it), signed
  const vpx = clamp((Number.isFinite(v) ? Math.abs(v) : 0) / 5 * 30, 5, 74);
  const vDir = v < 0 ? -1 : 1;
  const vY = qy - pistHalfH - 12;

  // crank torque T: an arc over the top of the crank circle, arrowhead sense = sign(T)
  const rT = rCircle * 0.72;
  const ta1 = -Math.PI * 0.82;
  const ta2 = -Math.PI * 0.18;
  const pA = (a: number): [number, number] => [ocx + rT * Math.cos(a), ocy + rT * Math.sin(a)];
  const [t1x, t1y] = pA(ta1);
  const [t2x, t2y] = pA(ta2);
  const Tpos = !Number.isFinite(T) || T >= 0;
  const headAng = Tpos ? ta2 : ta1;
  const [thx, thy] = pA(headAng);
  const tang: [number, number] = Tpos
    ? [-Math.sin(ta2), Math.cos(ta2)]
    : [Math.sin(ta1), -Math.cos(ta1)];
  const showTorque = showForces && Number.isFinite(T) && Math.abs(T) > 1e-9 && rT > 12;

  // obliquity phi arc at the piston pin, between the axis and the rod
  const rodAng = Math.atan2(py - qy, px - qx); // screen angle of the rod from the piston pin
  const phiR = 20;

  const thetaDeg = Number.isFinite(theta) ? toDisplay(theta, "deg") : NaN;
  const xmm = Number.isFinite(x) ? toDisplay(x, "mm") : NaN;
  const FkN = Number.isFinite(F) ? toDisplay(F, "kN") : NaN;
  const phiDeg = Number.isFinite(phi) ? toDisplay(phi, "deg") : NaN;

  return (
    <figure class="sim">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Slider-crank mechanism: crank, connecting rod, and piston in a cylinder"
        width="100%"
      >
        <title>Slider-crank at the current crank angle</title>
        <desc>
          A crank turning on a circle, a connecting rod, and a piston sliding in a horizontal
          cylinder. The crank angle sets the pose. When paused, arrows show the gas force on the
          piston, the connecting-rod obliquity, and the crank torque it produces.
        </desc>

        {/* cylinder guide + head (gas comes from the right) */}
        <line x1={X(l - r) - 6} y1={qy - pistHalfH} x2={X(xHi)} y2={qy - pistHalfH} class="sc-cylinder" />
        <line x1={X(l - r) - 6} y1={qy + pistHalfH} x2={X(xHi)} y2={qy + pistHalfH} class="sc-cylinder" />
        <line x1={X(xHi)} y1={qy - pistHalfH} x2={X(xHi)} y2={qy + pistHalfH} class="sc-cylinder" />

        {/* cylinder axis + crank-pin path */}
        <line x1={ocx} y1={qy} x2={X(xHi)} y2={qy} class="beam-ghost" />
        <circle cx={ocx} cy={ocy} r={rCircle} class="beam-ghost" fill="none" />

        {/* torque arc (paused) */}
        {showTorque ? (
          <>
            <path
              d={`M ${t1x} ${t1y} A ${rT} ${rT} 0 0 1 ${t2x} ${t2y}`}
              class={extremeObliquity ? "sc-torque-hot" : "sc-torque"}
              fill="none"
            />
            {head(thx, thy, tang[0], tang[1], extremeObliquity ? "sc-torque-head-hot" : "sc-torque-head", 6)}
            <text x={ocx} y={ocy - rT - 5} text-anchor="middle" class="sim-label">
              T
            </text>
          </>
        ) : null}

        {/* connecting rod, crank arm */}
        <line x1={px} y1={py} x2={qx} y2={qy} class={extremeObliquity ? "sc-rod-hot" : "sc-rod"} />
        <line x1={ocx} y1={ocy} x2={px} y2={py} class="link-crank" />

        {/* obliquity phi arc at the piston pin (paused) */}
        {showForces && Number.isFinite(phi) ? (
          <>
            <path
              d={`M ${qx - phiR} ${qy} A ${phiR} ${phiR} 0 0 ${py < qy ? 1 : 0} ${qx + phiR * Math.cos(rodAng)} ${qy + phiR * Math.sin(rodAng)}`}
              class={extremeObliquity ? "sc-phi-hot" : "sc-phi"}
              fill="none"
            />
            <text x={qx - phiR - 4} y={qy - 4} text-anchor="end" class="sim-label-small">
              φ
            </text>
          </>
        ) : null}

        {/* piston block */}
        <rect
          x={qx - pistHalfW}
          y={qy - pistHalfH}
          width={pistHalfW * 2}
          height={pistHalfH * 2}
          rx={2}
          class="sc-piston"
        />

        {/* pins + crank hub */}
        <circle cx={px} cy={py} r={4} class="link-pin" />
        <circle cx={qx} cy={qy} r={4} class="link-pin" />
        <circle cx={ocx} cy={ocy} r={4} class="fw-hub" />

        {/* gas force F on the piston (paused) */}
        {showForces && Number.isFinite(F) ? (
          <>
            <line x1={fTailX} y1={qy} x2={fTipX} y2={qy} class="sc-force" />
            {head(fTipX, qy, -1, 0, "sc-force-head", 6)}
            <text x={fTailX + 3} y={qy - 5} class="sim-label">
              F
            </text>
          </>
        ) : null}

        {/* piston velocity v (paused) */}
        {showForces && Number.isFinite(v) && Math.abs(v) > 1e-6 ? (
          <>
            <line x1={qx} y1={vY} x2={qx + vDir * vpx} y2={vY} class="sc-vel" />
            {head(qx + vDir * vpx, vY, vDir, 0, "sc-vel-head", 5)}
            <text x={qx + vDir * (vpx + 8)} y={vY + 4} text-anchor={vDir < 0 ? "end" : "start"} class="sim-label-small">
              v
            </text>
          </>
        ) : null}

        {/* crank-angle marker */}
        <text x={ocx - 6} y={ocy + 16} text-anchor="end" class="sim-label-small">
          θ
        </text>
      </svg>
      <figcaption>
        <button type="button" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
          {playing ? "Pause" : "Animate"}
        </button>{" "}
        {playing ? (
          <>
            Sweeping the crank as a presentation — the piston lingers longer near bottom dead centre
            than top. Readouts and the force overlay stay pinned to your set angle θ ={" "}
            {Number.isFinite(thetaDeg) ? thetaDeg.toFixed(0) : "—"}°; pause to see them on the
            mechanism. The motion is played back, not integrated.
          </>
        ) : (
          <>
            Crank at θ = {Number.isFinite(thetaDeg) ? thetaDeg.toFixed(0) : "—"}°: piston at x ={" "}
            {Number.isFinite(xmm) ? xmm.toFixed(1) : "—"} mm. Gas force F ={" "}
            {Number.isFinite(FkN) ? FkN.toFixed(2) : "—"} kN acts through rod obliquity φ ={" "}
            {Number.isFinite(phiDeg) ? phiDeg.toFixed(1) : "—"}° to make the crank torque T.
            {extremeObliquity ? " Shown red: obliquity is extreme (r/l > 0.5)." : ""}
          </>
        )}
      </figcaption>
    </figure>
  );
}
