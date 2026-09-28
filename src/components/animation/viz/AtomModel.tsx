'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { AnimationHandle, AnimationPhase, VizCommonProps } from '../types';
import { InputBar, SelectField } from '../shared';

interface ElementConfig { symbol: string; name: string; protons: number; neutrons: number; shells: number[]; }

const ELEMENTS: ElementConfig[] = [
  { symbol: 'H', name: 'Hydrogen', protons: 1, neutrons: 0, shells: [1] },
  { symbol: 'He', name: 'Helium', protons: 2, neutrons: 2, shells: [2] },
  { symbol: 'C', name: 'Carbon', protons: 6, neutrons: 6, shells: [2, 4] },
  { symbol: 'N', name: 'Nitrogen', protons: 7, neutrons: 7, shells: [2, 5] },
  { symbol: 'O', name: 'Oxygen', protons: 8, neutrons: 8, shells: [2, 6] },
  { symbol: 'Ne', name: 'Neon', protons: 10, neutrons: 10, shells: [2, 8] },
  { symbol: 'Na', name: 'Sodium', protons: 11, neutrons: 12, shells: [2, 8, 1] },
  { symbol: 'Cl', name: 'Chlorine', protons: 17, neutrons: 18, shells: [2, 8, 7] },
];

const SHELL_NAMES = ['K', 'L', 'M', 'N'];

interface Props extends VizCommonProps { }

export const AtomModel = forwardRef<AnimationHandle, Props>(function AtomModel(
  { playing, speed, onPhases, onPlayingChange, onSound, t, fs }, ref
) {
  const [symbol, setSymbol] = useState('C');
  const el = ELEMENTS.find(e => e.symbol === symbol) || ELEMENTS[2];
  const [shellsRevealed, setShellsRevealed] = useState(1); // 1..TOTAL (last value reveals the final summary phase)
  const angleRef = useRef(0);
  const [angle, setAngle] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastRevealSound = useRef(-1);

  const TOTAL = el.shells.length + 1; // one phase per shell + final overview
  const stepIndex = Math.min(TOTAL - 1, shellsRevealed - 1);

  const buildPhases = useCallback((): AnimationPhase[] => {
    const phases: AnimationPhase[] = el.shells.map((count, i) => ({
      label: `Filling shell ${SHELL_NAMES[i]} (n=${i + 1})`,
      explanation: `${count} electron${count > 1 ? 's' : ''} occupy${count === 1 ? 'ies' : ''} the ${SHELL_NAMES[i]} shell. Electrons fill the lowest-energy shell available before moving to the next.`,
      values: [{ label: 'Shell', value: SHELL_NAMES[i] }, { label: 'Electrons here', value: String(count) }, { label: 'Max capacity', value: String(2 * (i + 1) * (i + 1)) }],
      formula: 'Max electrons per shell = 2n²',
      why: i === 0 ? 'The first (innermost) shell has the lowest energy, so it fills first — with a maximum of 2 electrons.' : 'Each shell must reach a stable arrangement before electrons begin occupying the next one out.',
    }));
    phases.push({
      label: `${el.name} (${el.symbol}) — complete`,
      explanation: `The nucleus holds ${el.protons} proton${el.protons > 1 ? 's' : ''} and ${el.neutrons} neutron${el.neutrons !== 1 ? 's' : ''}, balanced by ${el.protons} orbiting electrons across ${el.shells.length} shell${el.shells.length > 1 ? 's' : ''}.`,
      values: [{ label: 'Protons', value: String(el.protons) }, { label: 'Neutrons', value: String(el.neutrons) }, { label: 'Electrons', value: String(el.protons) }, { label: 'Shells', value: String(el.shells.length) }],
      formula: 'Atomic number Z = protons = electrons (neutral atom)',
      takeaway: `${el.name}'s outer shell has ${el.shells[el.shells.length - 1]} electron${el.shells[el.shells.length - 1] > 1 ? 's' : ''} — this "valence" count largely determines how it bonds with other atoms.`,
    });
    return phases;
  }, [el]);

  useEffect(() => {
    onPhases(buildPhases(), stepIndex, TOTAL);
    if (stepIndex !== lastRevealSound.current) { onSound('tick'); lastRevealSound.current = stepIndex; }
  }, [buildPhases, stepIndex, TOTAL, onPhases, onSound]);

  useEffect(() => { setShellsRevealed(1); lastRevealSound.current = -1; }, [symbol]);

  // continuous electron orbit animation
  useEffect(() => {
    onPlayingChange(playing);
    if (!playing) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return; }
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      angleRef.current += dt * speed;
      setAngle(angleRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed]);

  useImperativeHandle(ref, () => ({
    play: () => onPlayingChange(true),
    pause: () => onPlayingChange(false),
    reset: () => { setShellsRevealed(1); onPlayingChange(false); },
    next: () => setShellsRevealed(s => Math.min(TOTAL, s + 1)),
    prev: () => setShellsRevealed(s => Math.max(1, s - 1)),
  }), [el.shells.length, onPlayingChange]);

  // ── nucleus packing: deterministic pseudo-random ring layout ──
  const nucleons = [
    ...Array.from({ length: el.protons }, () => 'p'),
    ...Array.from({ length: el.neutrons }, () => 'n'),
  ];
  const nucleusR = 8 + Math.sqrt(nucleons.length) * 3.2;
  const W = 420, H = 340, cx = W / 2, cy = H / 2;

  const shellRadii = el.shells.map((_, i) => nucleusR + 34 + i * 32);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <InputBar t={t}>
        <SelectField label="Element" value={symbol} onChange={setSymbol} t={t} fs={fs}
          options={ELEMENTS.map(e => ({ value: e.symbol, label: `${e.symbol} — ${e.name} (Z=${e.protons})` }))} width={220} />
      </InputBar>
      <div style={{ flex: 1, minHeight: 260, borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}`, background: `radial-gradient(circle at 50% 45%, ${t.bg2 || '#111827'}, ${t.bg3 || '#0b1220'})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', maxWidth: 460 }}>
          <defs>
            <radialGradient id="protonGrad" cx="35%" cy="30%" r="70%"><stop offset="0%" stopColor="#fecaca" /><stop offset="60%" stopColor="#ef4444" /><stop offset="100%" stopColor="#7f1d1d" /></radialGradient>
            <radialGradient id="neutronGrad" cx="35%" cy="30%" r="70%"><stop offset="0%" stopColor="#e2e8f0" /><stop offset="60%" stopColor="#94a3b8" /><stop offset="100%" stopColor="#334155" /></radialGradient>
            <radialGradient id="electronGrad" cx="35%" cy="30%" r="70%"><stop offset="0%" stopColor="#dbeafe" /><stop offset="55%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#1e3a8a" /></radialGradient>
          </defs>

          {/* orbit rings */}
          {shellRadii.map((r, i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={i < shellsRevealed ? 'rgba(59,130,246,0.35)' : 'rgba(148,163,184,0.15)'} strokeWidth={1} strokeDasharray="3 4" />
          ))}

          {/* nucleus: nucleons packed in a small cluster */}
          {nucleons.map((kind, i) => {
            const ring = Math.floor(Math.sqrt(i));
            const idxInRing = i - ring * ring;
            const perRing = Math.max(1, ring * 2 + 1);
            const a = (idxInRing / perRing) * Math.PI * 2 + ring * 0.7;
            const rr = ring * 5.2;
            const nx = cx + rr * Math.cos(a);
            const ny = cy + rr * Math.sin(a);
            return <circle key={i} cx={nx} cy={ny} r={5.4} fill={kind === 'p' ? 'url(#protonGrad)' : 'url(#neutronGrad)'} stroke="rgba(0,0,0,0.3)" strokeWidth={0.5} />;
          })}
          <text x={cx} y={cy + nucleusR + 16} textAnchor="middle" fontSize={11} fill={t.text2 || '#94a3b8'} fontFamily="ui-monospace,monospace">{el.symbol} nucleus</text>

          {/* electrons orbiting on revealed shells */}
          {el.shells.slice(0, shellsRevealed).map((count, shellIdx) => {
            const r = shellRadii[shellIdx];
            const shellSpeed = 1.4 / (shellIdx + 1);
            return Array.from({ length: count }).map((_, i) => {
              const a = angle * shellSpeed + (i / count) * Math.PI * 2;
              const ex = cx + r * Math.cos(a);
              const ey = cy + r * Math.sin(a);
              return (
                <g key={`${shellIdx}-${i}`}>
                  <circle cx={ex} cy={ey} r={9} fill="rgba(59,130,246,0.18)" />
                  <circle cx={ex} cy={ey} r={4.2} fill="url(#electronGrad)" />
                </g>
              );
            });
          })}
        </svg>
      </div>
    </div>
  );
});
