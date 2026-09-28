'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { AnimationHandle, AnimationPhase, VizCommonProps } from '../types';
import { InputBar, SliderField } from '../shared';

interface Props extends VizCommonProps { }

const TOTAL = 4;
const TILT_DEG = 23.5;

export const Seasons = forwardRef<AnimationHandle, Props>(function Seasons(
  { playing, speed, onPhases, onPlayingChange, onSound, t, fs }, ref
) {
  const [orbitSpeed, setOrbitSpeed] = useState(1);
  const angleRef = useRef(0);
  const [angle, setAngle] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastPhaseRef = useRef(-1);

  const tiltRad = (TILT_DEG * Math.PI) / 180;
  const axisDir = { x: Math.sin(tiltRad), y: -Math.cos(tiltRad) }; // fixed direction in space

  const R = 105;
  const earthX = Math.cos(angle) * R;
  const earthY = Math.sin(angle) * R * 0.55;
  const dist = Math.hypot(earthX, earthY) || 1;
  const sunToEarth = { x: earthX / dist, y: earthY / dist };
  // component of axis pointing toward the sun (negative of sun-to-earth direction)
  const northTowardSun = -(axisDir.x * sunToEarth.x + axisDir.y * sunToEarth.y);

  const seasonLabel = northTowardSun > 0.55 ? 'Northern Hemisphere: Summer · Southern Hemisphere: Winter'
    : northTowardSun < -0.55 ? 'Northern Hemisphere: Winter · Southern Hemisphere: Summer'
    : 'Equinox — roughly equal day and night in both hemispheres';

  const phaseIndex = Math.min(TOTAL - 1, Math.floor(((angle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI) * TOTAL));

  const buildPhases = useCallback((): AnimationPhase[] => [
    { label: 'Orbit position A', explanation: `Earth's axis stays pointed the same direction in space throughout its orbit (toward Polaris). Right now: ${seasonLabel}.`, values: [{ label: 'Axial tilt', value: `${TILT_DEG}°` }, { label: 'Tilt-toward-sun', value: northTowardSun.toFixed(2) }], why: 'It is the fixed tilt combined with changing orbital position — not how close Earth is to the sun — that determines which hemisphere gets more direct sunlight.' },
    { label: 'Orbit position B', explanation: `As Earth continues its orbit, the angle between its (unchanging) axis and the sun changes, shifting which hemisphere leans toward the sun.`, values: [{ label: 'Tilt-toward-sun', value: northTowardSun.toFixed(2) }], why: 'Earth\'s distance from the sun barely changes across the year — the tilt effect completely dominates.' },
    { label: 'Orbit position C', explanation: `Sunlight now strikes the other hemisphere more directly, bringing summer there while the first hemisphere experiences winter.`, values: [{ label: 'Tilt-toward-sun', value: northTowardSun.toFixed(2) }], formula: 'Insolation ∝ cos(angle of incidence)', why: 'More direct (less slanted) sunlight delivers more energy per unit area — that extra energy is what makes summers warmer.' },
    { label: 'Orbit position D', explanation: `Completing the year brings the cycle back — this is why seasons repeat annually and are mirrored between the two hemispheres.`, values: [{ label: 'Current state', value: seasonLabel }], takeaway: 'Seasons are caused by Earth\'s ~23.5° axial tilt staying fixed in space while its orbital position changes — not by Earth moving closer to or farther from the sun.' },
  ], [northTowardSun, seasonLabel]);

  useEffect(() => {
    onPhases(buildPhases(), phaseIndex, TOTAL);
    if (phaseIndex !== lastPhaseRef.current) { onSound('tick'); lastPhaseRef.current = phaseIndex; }
  }, [buildPhases, phaseIndex, onPhases, onSound]);

  useEffect(() => {
    onPlayingChange(playing);
    if (!playing) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return; }
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      angleRef.current += dt * speed * orbitSpeed * 0.6;
      setAngle(angleRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, orbitSpeed]);

  useImperativeHandle(ref, () => ({
    play: () => onPlayingChange(true),
    pause: () => onPlayingChange(false),
    reset: () => { angleRef.current = 0; setAngle(0); onPlayingChange(false); },
    next: () => { angleRef.current += (2 * Math.PI) / TOTAL; setAngle(angleRef.current); },
    prev: () => { angleRef.current -= (2 * Math.PI) / TOTAL; setAngle(angleRef.current); },
  }), [onPlayingChange]);

  const W = 380, H = 280, cx = W / 2, cy = H / 2;
  const ex = cx + earthX, ey = cy + earthY;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <InputBar t={t}>
        <SliderField label="Orbit speed" value={orbitSpeed} min={0.2} max={3} step={0.1} onChange={setOrbitSpeed} t={t} fs={fs} unit="x" />
      </InputBar>
      <div style={{ flex: 1, minHeight: 260, borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}`, background: `radial-gradient(circle at 50% 50%, ${t.bg2 || '#0b1120'}, #000)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', maxWidth: 420 }}>
          <defs>
            <radialGradient id="sunGrad2" cx="40%" cy="35%" r="65%"><stop offset="0%" stopColor="#fef9c3" /><stop offset="100%" stopColor="#f59e0b" /></radialGradient>
            <radialGradient id="earthGrad" cx="35%" cy="30%" r="70%"><stop offset="0%" stopColor="#93c5fd" /><stop offset="55%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#1e3a8a" /></radialGradient>
          </defs>
          {/* orbit path */}
          <ellipse cx={cx} cy={cy} rx={R} ry={R * 0.55} fill="none" stroke="rgba(148,163,184,0.3)" strokeWidth={1} strokeDasharray="3 5" />
          {/* sun */}
          <circle cx={cx} cy={cy} r={22} fill="url(#sunGrad2)" />
          {/* earth */}
          <g transform={`translate(${ex},${ey})`}>
            <circle r={11} fill="url(#earthGrad)" />
            {/* fixed-direction axis line */}
            <line x1={-axisDir.x * 20} y1={-axisDir.y * 20} x2={axisDir.x * 20} y2={axisDir.y * 20} stroke="#f8fafc" strokeWidth={1.5} />
            <circle cx={axisDir.x * 20} cy={axisDir.y * 20} r={2} fill="#f8fafc" />
            {/* illuminated side hint: brighter toward sun */}
            <circle r={11} fill="rgba(255,255,255,0.18)" clipPath="none" />
          </g>
          <text x={cx} y={H - 12} textAnchor="middle" fontSize={10} fill={t.text2 || '#94a3b8'}>{seasonLabel}</text>
        </svg>
      </div>
    </div>
  );
});
