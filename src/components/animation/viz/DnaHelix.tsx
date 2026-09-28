'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { AnimationHandle, AnimationPhase, VizCommonProps } from '../types';
import { InputBar, SliderField } from '../shared';

interface Props extends VizCommonProps { }

const PAIR_TYPES = [
  { a: 'A', b: 'T', bonds: 2, colorA: '#f87171', colorB: '#60a5fa' },
  { a: 'T', b: 'A', bonds: 2, colorA: '#60a5fa', colorB: '#f87171' },
  { a: 'G', b: 'C', bonds: 3, colorA: '#4ade80', colorB: '#fbbf24' },
  { a: 'C', b: 'G', bonds: 3, colorA: '#fbbf24', colorB: '#4ade80' },
];

const TOTAL = 4;
const RUNG_COUNT = 16;

export const DnaHelix = forwardRef<AnimationHandle, Props>(function DnaHelix(
  { playing, speed, onPhases, onPlayingChange, onSound, t, fs }, ref
) {
  const [revealLevel, setRevealLevel] = useState(1); // 1..4
  const [twist, setTwist] = useState(1);
  const angleRef = useRef(0);
  const [angle, setAngle] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastReveal = useRef(-1);

  const buildPhases = useCallback((): AnimationPhase[] => [
    { label: 'Sugar-phosphate backbones', explanation: 'DNA has two long strands made of alternating sugar and phosphate groups, twisting around a common axis like a spiral staircase\'s two rails.', values: [{ label: 'Strands', value: '2' }], why: 'The backbone is chemically identical in both strands and carries no genetic information itself — it\'s structural.' },
    { label: 'Base pairing rungs', explanation: 'Nitrogenous bases project inward from each backbone and pair up across the middle, forming the "steps" of the staircase.', values: [{ label: 'Rungs shown', value: String(RUNG_COUNT) }], why: 'Each base can only pair with one specific partner, which is what makes DNA replication and reading so reliable.' },
    { label: 'Complementary base pairing', explanation: 'Adenine (A) always pairs with Thymine (T) via 2 hydrogen bonds; Guanine (G) always pairs with Cytosine (C) via 3 hydrogen bonds.', values: [{ label: 'A—T bonds', value: '2' }, { label: 'G—C bonds', value: '3' }], formula: 'A↔T (2 H-bonds), G↔C (3 H-bonds)', why: 'This strict pairing rule means if you know one strand\'s sequence, you automatically know the other — the basis of DNA replication.' },
    { label: 'The double helix', explanation: 'The paired strands twist into a right-handed double helix — this coiling packs an enormous length of genetic code into a tiny nucleus.', values: [{ label: 'Shape', value: 'Right-handed helix' }], takeaway: 'DNA\'s structure isn\'t decorative — the twisting, pairing backbone is exactly what lets a cell copy, repair and read genetic information reliably.' },
  ], []);

  useEffect(() => {
    onPhases(buildPhases(), revealLevel - 1, TOTAL);
    if (revealLevel - 1 !== lastReveal.current) { onSound('tick'); lastReveal.current = revealLevel - 1; }
  }, [buildPhases, revealLevel, onPhases, onSound]);

  useEffect(() => {
    onPlayingChange(playing);
    if (!playing) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return; }
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      angleRef.current += dt * speed * twist;
      setAngle(angleRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, twist]);

  useImperativeHandle(ref, () => ({
    play: () => onPlayingChange(true),
    pause: () => onPlayingChange(false),
    reset: () => { setRevealLevel(1); onPlayingChange(false); },
    next: () => setRevealLevel(s => Math.min(TOTAL, s + 1)),
    prev: () => setRevealLevel(s => Math.max(1, s - 1)),
  }), [onPlayingChange]);

  const W = 320, H = 300, amplitude = 70, cx = W / 2;
  const rungs = Array.from({ length: RUNG_COUNT }).map((_, i) => {
    const y = 20 + (i / (RUNG_COUNT - 1)) * (H - 40);
    const a = angle + (i / RUNG_COUNT) * Math.PI * 4;
    const x1 = cx + amplitude * Math.cos(a);
    const x2 = cx + amplitude * Math.cos(a + Math.PI);
    const depth = Math.sin(a); // -1 back, +1 front
    const pair = PAIR_TYPES[i % PAIR_TYPES.length];
    return { y, x1, x2, depth, pair, i };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <InputBar t={t}>
        <SliderField label="Rotation speed" value={twist} min={0.2} max={2.5} step={0.1} onChange={setTwist} t={t} fs={fs} unit="x" />
      </InputBar>
      <div style={{ flex: 1, minHeight: 260, borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}`, background: `radial-gradient(circle at 50% 40%, ${t.bg2 || '#0f1a12'}, ${t.bg3 || '#071008'})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', maxWidth: 340 }}>
          {/* back rungs first (depth < 0), then backbone, then front rungs */}
          {revealLevel >= 2 && rungs.filter(r => r.depth < 0).map(r => (
            <line key={`b${r.i}`} x1={r.x1} y1={r.y} x2={r.x2} y2={r.y} stroke={r.pair.colorA} strokeWidth={revealLevel >= 3 ? 2.5 : 2} opacity={0.35} />
          ))}

          {/* backbones as smooth paths through all points on each side */}
          <path d={rungs.map((r, i) => `${i === 0 ? 'M' : 'L'} ${r.x1} ${r.y}`).join(' ')} fill="none" stroke="#38bdf8" strokeWidth={4} strokeLinecap="round" opacity={0.9} />
          <path d={rungs.map((r, i) => `${i === 0 ? 'M' : 'L'} ${r.x2} ${r.y}`).join(' ')} fill="none" stroke="#a78bfa" strokeWidth={4} strokeLinecap="round" opacity={0.9} />

          {revealLevel >= 2 && rungs.filter(r => r.depth >= 0).map(r => (
            <g key={`f${r.i}`}>
              <line x1={r.x1} y1={r.y} x2={r.x2} y2={r.y} stroke={revealLevel >= 3 ? r.pair.colorA : '#facc15'} strokeWidth={2.5} opacity={0.9} />
              {revealLevel >= 3 && (
                <>
                  <circle cx={r.x1} cy={r.y} r={3.5} fill={r.pair.colorA} />
                  <circle cx={r.x2} cy={r.y} r={3.5} fill={r.pair.colorB} />
                </>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
});
