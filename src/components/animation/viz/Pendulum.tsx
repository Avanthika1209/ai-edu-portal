'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { AnimationHandle, AnimationPhase, VizCommonProps } from '../types';
import { InputBar, SliderField } from '../shared';

interface Props extends VizCommonProps { }

export const Pendulum = forwardRef<AnimationHandle, Props>(function Pendulum(
  { playing, speed, onPhases, onPlayingChange, onSound, t, fs }, ref
) {
  const [length, setLength] = useState(2.2);   // metres
  const [amplitudeDeg, setAmplitudeDeg] = useState(30);
  const g = 9.8;
  const period = 2 * Math.PI * Math.sqrt(length / g);
  const theta0 = (amplitudeDeg * Math.PI) / 180;

  const tRef = useRef(0);
  const [time, setTime] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastQuarterRef = useRef(-1);

  // angle(t) = theta0 * cos(omega t), omega = 2*pi/period
  const omega = (2 * Math.PI) / period;
  const angle = theta0 * Math.cos(omega * time);
  const angVel = -theta0 * omega * Math.sin(omega * time);

  const phaseOfPeriod = (time % period) / period; // 0..1 within current swing cycle
  const TOTAL = 4;
  const phaseIndex = Math.min(TOTAL - 1, Math.floor(phaseOfPeriod * TOTAL));

  const buildPhases = useCallback((): AnimationPhase[] => [
    { label: 'Released from amplitude', explanation: `The bob is released from ${amplitudeDeg}° with zero velocity — all its energy is gravitational potential energy.`, values: [{ label: 'θ', value: `${(angle * 180 / Math.PI).toFixed(1)}°` }, { label: 'Angular velocity', value: `${angVel.toFixed(2)} rad/s` }], formula: 'θ(t) = θ₀ cos(ωt)', why: 'At maximum displacement, the restoring force (gravity\'s tangential component) is at its strongest, about to accelerate the bob back toward centre.' },
    { label: 'Swinging through equilibrium', explanation: 'As the bob swings down through the lowest point, potential energy converts to kinetic energy — this is where it moves fastest.', values: [{ label: 'θ', value: `${(angle * 180 / Math.PI).toFixed(1)}°` }, { label: 'Angular velocity', value: `${angVel.toFixed(2)} rad/s` }], formula: 'ω = √(g / L)', why: 'At the equilibrium position the restoring force is zero, but the bob\'s momentum carries it through to the other side.' },
    { label: 'Rising on the far side', explanation: 'Kinetic energy converts back to potential energy as the bob climbs toward its amplitude on the opposite side.', values: [{ label: 'θ', value: `${(angle * 180 / Math.PI).toFixed(1)}°` }, { label: 'Angular velocity', value: `${angVel.toFixed(2)} rad/s` }], formula: 'θ(t) = θ₀ cos(ωt)', why: 'Energy is conserved (ignoring air resistance): total mechanical energy stays constant throughout the swing.' },
    { label: 'Momentary stop & return', explanation: 'The bob momentarily stops at the opposite amplitude, then gravity pulls it back — one full period T has nearly elapsed.', values: [{ label: 'Period T', value: `${period.toFixed(2)} s` }, { label: 'Length L', value: `${length.toFixed(2)} m` }], formula: 'T = 2π√(L/g)', takeaway: `A longer pendulum swings slower: period depends only on length and gravity, never on the mass of the bob or (for small angles) the amplitude.` },
  ], [amplitudeDeg, angVel, angle, length, period]);

  useEffect(() => {
    onPhases(buildPhases(), phaseIndex, TOTAL);
    if (phaseIndex !== lastQuarterRef.current) { onSound('tick'); lastQuarterRef.current = phaseIndex; }
  }, [buildPhases, phaseIndex, onPhases, onSound]);

  useEffect(() => {
    onPlayingChange(playing);
    if (!playing) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return; }
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      tRef.current += dt * speed;
      setTime(tRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed]);

  useImperativeHandle(ref, () => ({
    play: () => onPlayingChange(true),
    pause: () => onPlayingChange(false),
    reset: () => { tRef.current = 0; setTime(0); onPlayingChange(false); },
    next: () => { tRef.current += period / TOTAL; setTime(tRef.current); },
    prev: () => { tRef.current = Math.max(0, tRef.current - period / TOTAL); setTime(tRef.current); },
  }), [period, onPlayingChange]);

  // geometry
  const W = 400, H = 300, pivotX = W / 2, pivotY = 34, rodLen = 190;
  const bobX = pivotX + rodLen * Math.sin(angle);
  const bobY = pivotY + rodLen * Math.cos(angle);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <InputBar t={t}>
        <SliderField label="Length" value={length} min={0.5} max={4} step={0.1} onChange={v => { setLength(v); tRef.current = 0; setTime(0); }} t={t} fs={fs} unit=" m" />
        <SliderField label="Amplitude" value={amplitudeDeg} min={5} max={60} step={1} onChange={v => { setAmplitudeDeg(v); tRef.current = 0; setTime(0); }} t={t} fs={fs} unit="°" />
      </InputBar>
      <div style={{ flex: 1, minHeight: 240, borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}`, background: t.bg3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', maxWidth: 420 }}>
          <defs>
            <radialGradient id="bobGrad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fbcfe8" />
              <stop offset="45%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#9d174d" />
            </radialGradient>
            <linearGradient id="ceilingGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
          </defs>
          {/* ceiling mount */}
          <rect x={pivotX - 40} y={10} width={80} height={16} rx={3} fill="url(#ceilingGrad)" />
          {/* arc guide showing swing range */}
          <path d={`M ${pivotX + rodLen * Math.sin(-theta0)} ${pivotY + rodLen * Math.cos(-theta0)} A ${rodLen} ${rodLen} 0 0 1 ${pivotX + rodLen * Math.sin(theta0)} ${pivotY + rodLen * Math.cos(theta0)}`} fill="none" stroke={t.border} strokeWidth={1} strokeDasharray="4 4" />
          {/* rod */}
          <line x1={pivotX} y1={pivotY} x2={bobX} y2={bobY} stroke="#94a3b8" strokeWidth={2.5} />
          {/* pivot */}
          <circle cx={pivotX} cy={pivotY} r={5} fill="#64748b" />
          {/* bob */}
          <circle cx={bobX} cy={bobY} r={17} fill="url(#bobGrad)" stroke="rgba(0,0,0,0.25)" />
          <circle cx={bobX - 5} cy={bobY - 6} r={4} fill="rgba(255,255,255,0.55)" />
        </svg>
      </div>
    </div>
  );
});
