'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback, RefObject } from 'react';
import { AnimationHandle, AnimationPhase, VizCommonProps } from '../types';
import { InputBar, SliderField } from '../shared';

interface Props extends VizCommonProps { }

// Deoxygenated circuit: vena cava → right atrium → right ventricle → pulmonary artery (to lungs)
const DEOXY_PATH = 'M 66 16 C 80 40, 84 55, 90 88 C 96 120, 96 160, 92 205 C 88 245, 130 258, 150 232 C 168 208, 168 120, 158 70 C 152 42, 150 24, 150 12';
// Oxygenated circuit: pulmonary vein (from lungs) → left atrium → left ventricle → aorta (to body)
const OXY_PATH = 'M 316 16 C 302 40, 298 55, 296 90 C 292 128, 292 168, 296 212 C 300 252, 250 266, 226 236 C 206 210, 214 110, 226 62 C 232 40, 236 24, 238 12';

const TOTAL = 4;
const PHASE_BOUNDS = [0, 0.4, 0.55, 0.85, 1.0];

export const HeartAnimation = forwardRef<AnimationHandle, Props>(function HeartAnimation(
  { playing, speed, onPhases, onPlayingChange, onSound, t, fs }, ref
) {
  const [bpm, setBpm] = useState(72);
  const timeRef = useRef(0);
  const [time, setTime] = useState(0);
  const rafRef = useRef<number | null>(null);
  const deoxyPathRef = useRef<SVGPathElement>(null);
  const oxyPathRef = useRef<SVGPathElement>(null);
  const [, forceTick] = useState(0);
  const lastBeatSound = useRef(-1);
  const lastPhaseRef = useRef(-1);

  const cycleDur = 60 / bpm; // seconds per full heartbeat
  const cyclePos = (time % cycleDur) / cycleDur; // 0..1 within current beat

  const phaseIndex = PHASE_BOUNDS.findIndex((b, i) => i < TOTAL && cyclePos >= b && cyclePos < PHASE_BOUNDS[i + 1]);
  const idx = phaseIndex === -1 ? TOTAL - 1 : phaseIndex;

  const buildPhases = useCallback((): AnimationPhase[] => [
    { label: 'Ventricular diastole — chambers fill', explanation: 'Both atria and ventricles are relaxed. Deoxygenated blood flows in from the vena cava, oxygenated blood flows in from the pulmonary veins, and both AV valves (tricuspid, mitral) hang open to let chambers fill passively.', values: [{ label: 'Heart rate', value: `${bpm} bpm` }, { label: 'AV valves', value: 'Open' }, { label: 'Semilunar valves', value: 'Closed' }], why: 'Most ventricular filling happens passively, before the atria even contract — the pressure gradient alone pulls blood downward.' },
    { label: 'Atrial systole — atria contract', explanation: 'The atria contract together, squeezing the last ~20% of blood into the ventricles through the still-open tricuspid and mitral valves.', values: [{ label: 'Atria', value: 'Contracting' }, { label: 'Ventricles', value: 'Relaxed' }], why: 'This final "atrial kick" tops off ventricular filling right before the much stronger ventricular contraction begins.' },
    { label: 'Ventricular systole — blood is ejected', explanation: 'The ventricles contract forcefully. Rising pressure slams the tricuspid and mitral valves shut (preventing backflow) and forces open the pulmonary and aortic valves, ejecting blood into the pulmonary artery and aorta.', values: [{ label: 'AV valves', value: 'Closed' }, { label: 'Semilunar valves', value: 'Open' }, { label: 'Pressure', value: 'Peak' }], why: 'Valves are one-way check valves — they only open when pressure behind them exceeds pressure ahead of them, guaranteeing blood moves in a single direction.' },
    { label: 'Isovolumetric relaxation', explanation: 'Ventricles relax and pressure drops. The semilunar valves snap shut to stop blood falling back in from the arteries, just before the next filling phase begins.', values: [{ label: 'All valves', value: 'Momentarily closed' }], formula: '60–100 bpm = healthy resting heart rate', takeaway: 'The heart is really two synchronized pumps in one organ: the right side sends blood to the lungs for oxygen, the left side sends that oxygenated blood to the rest of the body.' },
  ], [bpm]);

  useEffect(() => {
    onPhases(buildPhases(), idx, TOTAL);
    if (idx !== lastPhaseRef.current) { lastPhaseRef.current = idx; }
  }, [buildPhases, idx, onPhases]);

  // heartbeat sound once per cycle (near the systole onset)
  useEffect(() => {
    const beatNumber = Math.floor(time / cycleDur);
    if (cyclePos >= 0.55 && cyclePos < 0.58 && beatNumber !== lastBeatSound.current) {
      onSound('heartbeat'); lastBeatSound.current = beatNumber;
    }
  }, [time, cyclePos, cycleDur, onSound]);

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

  useEffect(() => { forceTick(v => v + 1); }, []); // ensure path refs are measured after mount

  useImperativeHandle(ref, () => ({
    play: () => onPlayingChange(true),
    pause: () => onPlayingChange(false),
    reset: () => { timeRef.current = 0; setTime(0); onPlayingChange(false); },
    next: () => { timeRef.current += cycleDur / TOTAL; setTime(timeRef.current); },
    prev: () => { timeRef.current = Math.max(0, timeRef.current - cycleDur / TOTAL); setTime(timeRef.current); },
  }), [cycleDur, onPlayingChange]);

  // chamber contraction scale
  const atrialScale = cyclePos >= 0.4 && cyclePos < 0.55 ? 0.88 : 1;
  const ventricleScale = cyclePos >= 0.55 && cyclePos < 0.85 ? 0.8 : 1;
  const avValvesOpen = cyclePos < 0.55;
  const semilunarOpen = cyclePos >= 0.55 && cyclePos < 0.85;

  const particles = (pathRef: RefObject<SVGPathElement>, count: number, colorId: string) => {
    const el = pathRef.current;
    if (!el || typeof el.getTotalLength !== 'function') return null;
    let len = 0;
    try { len = el.getTotalLength(); } catch { return null; }
    if (!len) return null;
    return Array.from({ length: count }).map((_, i) => {
      const frac = ((time * 0.35 * speed) + i / count) % 1;
      const pt = el.getPointAtLength(frac * len);
      return <circle key={i} cx={pt.x} cy={pt.y} r={4} fill={`url(#${colorId})`} opacity={0.95} />;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <InputBar t={t}>
        <SliderField label="Heart rate" value={bpm} min={40} max={160} step={2} onChange={setBpm} t={t} fs={fs} unit=" bpm" width={220} />
      </InputBar>
      <div style={{ flex: 1, minHeight: 260, borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}`, background: `radial-gradient(ellipse at 50% 40%, ${t.bg2 || '#1a0e12'}, ${t.bg3 || '#0b0507'})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 380 300" style={{ width: '100%', height: '100%', maxWidth: 420 }}>
          <defs>
            <radialGradient id="blueBlood" cx="35%" cy="30%" r="70%"><stop offset="0%" stopColor="#bfdbfe" /><stop offset="100%" stopColor="#1d4ed8" /></radialGradient>
            <radialGradient id="redBlood" cx="35%" cy="30%" r="70%"><stop offset="0%" stopColor="#fecaca" /><stop offset="100%" stopColor="#b91c1c" /></radialGradient>
            <linearGradient id="raGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#60a5fa" /><stop offset="100%" stopColor="#1e40af" /></linearGradient>
            <linearGradient id="rvGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#1e3a8a" /></linearGradient>
            <linearGradient id="laGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f87171" /><stop offset="100%" stopColor="#991b1b" /></linearGradient>
            <linearGradient id="lvGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ef4444" /><stop offset="100%" stopColor="#7f1d1d" /></linearGradient>
          </defs>

          {/* vessel guide paths (also used to compute particle motion) */}
          <path ref={deoxyPathRef} d={DEOXY_PATH} fill="none" stroke="rgba(59,130,246,0.25)" strokeWidth={10} strokeLinecap="round" />
          <path ref={oxyPathRef} d={OXY_PATH} fill="none" stroke="rgba(239,68,68,0.25)" strokeWidth={10} strokeLinecap="round" />

          {/* heart outer silhouette */}
          <path d="M 190 268 C 130 232, 40 190, 40 110 C 40 58, 82 28, 122 40 C 150 48, 172 70, 190 96 C 208 70, 230 48, 258 40 C 298 28, 340 58, 340 110 C 340 190, 250 232, 190 268 Z"
            fill="rgba(127,29,29,0.15)" stroke="rgba(239,68,68,0.35)" strokeWidth={1.5} />

          {/* Right Atrium */}
          <g style={{ transformOrigin: '90px 90px', transform: `scale(${atrialScale})`, transition: 'transform 0.15s ease-out' }}>
            <ellipse cx={90} cy={90} rx={38} ry={34} fill="url(#raGrad)" opacity={0.92} />
          </g>
          {/* Right Ventricle */}
          <g style={{ transformOrigin: '105px 205px', transform: `scale(${ventricleScale})`, transition: 'transform 0.15s ease-out' }}>
            <ellipse cx={105} cy={205} rx={46} ry={52} fill="url(#rvGrad)" opacity={0.94} />
          </g>
          {/* Left Atrium */}
          <g style={{ transformOrigin: '296px 90px', transform: `scale(${atrialScale})`, transition: 'transform 0.15s ease-out' }}>
            <ellipse cx={296} cy={90} rx={38} ry={34} fill="url(#laGrad)" opacity={0.92} />
          </g>
          {/* Left Ventricle (thicker walled, slightly larger) */}
          <g style={{ transformOrigin: '270px 210px', transform: `scale(${ventricleScale})`, transition: 'transform 0.15s ease-out' }}>
            <ellipse cx={270} cy={210} rx={54} ry={58} fill="url(#lvGrad)" opacity={0.96} />
          </g>

          {/* septum divider */}
          <path d="M 190 96 C 195 140, 195 190, 190 258" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={4} strokeLinecap="round" />

          {/* AV valve indicators (tricuspid + mitral) */}
          <g transform="translate(96,150)">
            <path d={avValvesOpen ? 'M -10 0 L -16 10 M 10 0 L 16 10' : 'M -10 0 L -2 8 M 10 0 L 2 8'} stroke="#fef08a" strokeWidth={3} strokeLinecap="round" />
          </g>
          <g transform="translate(288,150)">
            <path d={avValvesOpen ? 'M -10 0 L -16 10 M 10 0 L 16 10' : 'M -10 0 L -2 8 M 10 0 L 2 8'} stroke="#fef08a" strokeWidth={3} strokeLinecap="round" />
          </g>
          {/* semilunar valve indicators */}
          <g transform="translate(150,45)">
            <circle r={5} fill="none" stroke="#fef08a" strokeWidth={2} opacity={semilunarOpen ? 1 : 0.3} />
          </g>
          <g transform="translate(232,40)">
            <circle r={5} fill="none" stroke="#fef08a" strokeWidth={2} opacity={semilunarOpen ? 1 : 0.3} />
          </g>

          {/* blood flow particles */}
          {particles(deoxyPathRef, 5, 'blueBlood')}
          {particles(oxyPathRef, 5, 'redBlood')}

          {/* minimal necessary labels */}
          <text x={90} y={94} textAnchor="middle" fontSize={9} fill="#dbeafe" fontFamily="ui-monospace,monospace">RA</text>
          <text x={105} y={209} textAnchor="middle" fontSize={9} fill="#dbeafe" fontFamily="ui-monospace,monospace">RV</text>
          <text x={296} y={94} textAnchor="middle" fontSize={9} fill="#fee2e2" fontFamily="ui-monospace,monospace">LA</text>
          <text x={270} y={214} textAnchor="middle" fontSize={9} fill="#fee2e2" fontFamily="ui-monospace,monospace">LV</text>
          <text x={100} y={16} textAnchor="middle" fontSize={8} fill={t.text3 || '#94a3b8'}>to/from lungs</text>
          <text x={280} y={16} textAnchor="middle" fontSize={8} fill={t.text3 || '#94a3b8'}>to/from body</text>
        </svg>
      </div>
    </div>
  );
});
