'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { AnimationHandle, AnimationPhase, VizCommonProps } from '../types';
import { InputBar, SliderField } from '../shared';

interface Props extends VizCommonProps { }

const TOTAL = 4;
const RIVER_PATH = 'M 90 150 C 130 170, 150 200, 200 220 C 260 244, 320 250, 370 252';

export const WaterCycle = forwardRef<AnimationHandle, Props>(function WaterCycle(
  { playing, speed, onPhases, onPlayingChange, onSound, t, fs }, ref
) {
  const [temperature, setTemperature] = useState(28);
  const timeRef = useRef(0);
  const [time, setTime] = useState(0);
  const rafRef = useRef<number | null>(null);
  const riverRef = useRef<SVGPathElement>(null);
  const lastPhaseRef = useRef(-1);

  const cycleDur = Math.max(3, 14 - (temperature - 10) * 0.18); // hotter → faster cycle
  const cyclePos = (time % cycleDur) / cycleDur;
  const phaseIndex = Math.min(TOTAL - 1, Math.floor(cyclePos * TOTAL));

  const buildPhases = useCallback((): AnimationPhase[] => [
    { label: 'Evaporation', explanation: `Solar energy heats the sea surface (currently ${temperature}°C). Water molecules gain enough energy to escape as invisible water vapour and rise into the atmosphere.`, values: [{ label: 'Surface temp', value: `${temperature}°C` }], why: 'Higher temperature means faster evaporation — that\'s why this cycle speeds up as you raise the slider.' },
    { label: 'Condensation', explanation: 'As water vapour rises, it cools in the upper atmosphere. Cooler air holds less moisture, so the vapour condenses back into tiny liquid droplets that cluster together as clouds.', values: [{ label: 'Process', value: 'Vapour → liquid droplets' }], why: 'Condensation is exothermic — releasing the energy the water absorbed during evaporation, which powers weather systems.' },
    { label: 'Precipitation', explanation: 'Once cloud droplets grow heavy enough, gravity pulls them down as rain (or snow, if cold enough), falling onto mountains and land.', values: [{ label: 'Form', value: 'Rain' }], why: 'Droplets keep colliding and merging inside a cloud until they\'re too heavy for rising air currents to support.' },
    { label: 'Collection & runoff', explanation: 'Rainwater collects on land, flowing downhill as streams and rivers back into the sea — completing the cycle, ready to evaporate again.', values: [{ label: 'Destination', value: 'Sea / groundwater' }], formula: 'Driven entirely by solar energy + gravity', takeaway: 'The water cycle is a closed loop powered by the sun: the same water molecules have been cycling between sea, sky and land for billions of years.' },
  ], [temperature]);

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
      timeRef.current += dt * speed;
      setTime(timeRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed]);

  useImperativeHandle(ref, () => ({
    play: () => onPlayingChange(true),
    pause: () => onPlayingChange(false),
    reset: () => { timeRef.current = 0; setTime(0); onPlayingChange(false); },
    next: () => { timeRef.current += cycleDur / TOTAL; setTime(timeRef.current); },
    prev: () => { timeRef.current = Math.max(0, timeRef.current - cycleDur / TOTAL); setTime(timeRef.current); },
  }), [cycleDur, onPlayingChange]);

  const evapT = Math.max(0, Math.min(1, cyclePos / 0.25));
  const condT = Math.max(0, Math.min(1, (cyclePos - 0.25) / 0.25));
  const precipT = Math.max(0, Math.min(1, (cyclePos - 0.5) / 0.25));
  const collectT = Math.max(0, Math.min(1, (cyclePos - 0.75) / 0.25));

  const cloudScale = 0.7 + 0.5 * Math.min(1, condT + precipT * 0.3);

  let riverPoint = { x: 90, y: 150 };
  const el = riverRef.current;
  if (el && typeof el.getTotalLength === 'function') {
    try { const len = el.getTotalLength(); riverPoint = el.getPointAtLength(collectT * len); } catch { /* ignore */ }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <InputBar t={t}>
        <SliderField label="Sea surface temperature" value={temperature} min={10} max={40} step={1} onChange={setTemperature} t={t} fs={fs} unit="°C" width={240} />
      </InputBar>
      <div style={{ flex: 1, minHeight: 260, borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}` }}>
        <svg viewBox="0 0 420 300" style={{ width: '100%', height: '100%', display: 'block' }}>
          <defs>
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7dd3fc" /><stop offset="100%" stopColor="#e0f2fe" />
            </linearGradient>
            <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" /><stop offset="100%" stopColor="#075985" />
            </linearGradient>
            <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef9c3" /><stop offset="100%" stopColor="#facc15" />
            </radialGradient>
            <linearGradient id="mtnGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a8a29e" /><stop offset="100%" stopColor="#57534e" />
            </linearGradient>
          </defs>

          <rect x={0} y={0} width={420} height={300} fill="url(#skyGrad)" />

          {/* sun with rotating rays */}
          <g transform={`translate(360,50) rotate(${time * 8 * speed})`}>
            {Array.from({ length: 8 }).map((_, i) => (
              <rect key={i} x={-1.5} y={-38} width={3} height={14} fill="#fde047" opacity={0.8} transform={`rotate(${i * 45})`} />
            ))}
          </g>
          <circle cx={360} cy={50} r={26} fill="url(#sunGrad)" />

          {/* mountain */}
          <path d="M 20 220 L 90 110 L 130 165 L 170 100 L 230 220 Z" fill="url(#mtnGrad)" />
          <path d="M 90 110 L 105 135 L 80 135 Z" fill="#f1f5f9" opacity={0.9} />
          <path d="M 170 100 L 183 122 L 160 122 Z" fill="#f1f5f9" opacity={0.9} />

          {/* river (collection path) */}
          <path ref={riverRef} d={RIVER_PATH} fill="none" stroke="#38bdf8" strokeWidth={4} strokeLinecap="round" opacity={0.7} />

          {/* sea */}
          <path d={`M 0 252 Q 60 ${248 + Math.sin(time * 2) * 2} 120 252 T 240 252 T 360 252 T 420 252 V 300 H 0 Z`} fill="url(#seaGrad)" />

          {/* cloud */}
          <g transform={`translate(230,70) scale(${cloudScale})`} opacity={0.4 + cloudScale * 0.5}>
            <ellipse cx={0} cy={0} rx={40} ry={20} fill="#f8fafc" />
            <ellipse cx={-26} cy={6} rx={26} ry={16} fill="#f8fafc" />
            <ellipse cx={26} cy={6} rx={28} ry={17} fill="#f1f5f9" />
          </g>

          {/* evaporation particles: rise from sea toward cloud */}
          {evapT > 0 && Array.from({ length: 6 }).map((_, i) => {
            const localT = (evapT + i / 6) % 1;
            const x = 200 + i * 12 + Math.sin(time * 3 + i) * 6;
            const y = 245 - localT * 150;
            return <circle key={i} cx={x} cy={y} r={2.4} fill="#e0f2fe" opacity={1 - localT * 0.6} />;
          })}

          {/* precipitation: rain falling from cloud */}
          {precipT > 0 && Array.from({ length: 10 }).map((_, i) => {
            const localT = (precipT + i / 10) % 1;
            const x = 190 + (i % 5) * 20;
            const y = 90 + localT * 110;
            return <line key={i} x1={x} y1={y} x2={x - 2} y2={y + 10} stroke="#38bdf8" strokeWidth={2} strokeLinecap="round" opacity={0.85} />;
          })}

          {/* collection droplet following the river back to the sea */}
          {collectT > 0 && <circle cx={riverPoint.x} cy={riverPoint.y} r={4} fill="#38bdf8" />}

          {/* minimal labels */}
          <text x={210} y={30} fontSize={10} fill="#1e3a8a" fontFamily="ui-monospace,monospace">{['Evaporation', 'Condensation', 'Precipitation', 'Collection'][phaseIndex]}</text>
        </svg>
      </div>
    </div>
  );
});
