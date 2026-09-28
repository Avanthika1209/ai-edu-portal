'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { AnimationHandle, AnimationPhase, VizCommonProps } from '../types';
import { InputBar, SelectField } from '../shared';

interface AtomSpec { label: string; color: string; x: number; y: number; }
interface BondSpec { from: number; to: number; order: 1 | 2 | 3; }
interface MoleculeSpec { name: string; formula: string; atoms: AtomSpec[]; bonds: BondSpec[]; note: string; }

const ATOM_COLORS: Record<string, string> = { H: '#e2e8f0', O: '#ef4444', C: '#374151', N: '#3b82f6' };

const MOLECULES: Record<string, MoleculeSpec> = {
  H2: { name: 'Hydrogen gas', formula: 'H₂', atoms: [{ label: 'H', color: ATOM_COLORS.H, x: -34, y: 0 }, { label: 'H', color: ATOM_COLORS.H, x: 34, y: 0 }], bonds: [{ from: 0, to: 1, order: 1 }], note: 'Each hydrogen atom shares its single electron, so both atoms effectively have 2 electrons (a full shell) — a single covalent bond.' },
  H2O: { name: 'Water', formula: 'H₂O', atoms: [{ label: 'O', color: ATOM_COLORS.O, x: 0, y: -10 }, { label: 'H', color: ATOM_COLORS.H, x: -46, y: 34 }, { label: 'H', color: ATOM_COLORS.H, x: 46, y: 34 }], bonds: [{ from: 0, to: 1, order: 1 }, { from: 0, to: 2, order: 1 }], note: 'Oxygen shares one electron pair with each hydrogen. The bent ~104.5° shape comes from oxygen\'s two lone electron pairs repelling the bonds.' },
  CO2: { name: 'Carbon dioxide', formula: 'CO₂', atoms: [{ label: 'O', color: ATOM_COLORS.O, x: -64, y: 0 }, { label: 'C', color: ATOM_COLORS.C, x: 0, y: 0 }, { label: 'O', color: ATOM_COLORS.O, x: 64, y: 0 }], bonds: [{ from: 1, to: 0, order: 2 }, { from: 1, to: 2, order: 2 }], note: 'Carbon forms a double bond with each oxygen (2 shared electron pairs per bond), giving carbon a full octet and a perfectly linear molecule.' },
  N2: { name: 'Nitrogen gas', formula: 'N₂', atoms: [{ label: 'N', color: ATOM_COLORS.N, x: -34, y: 0 }, { label: 'N', color: ATOM_COLORS.N, x: 34, y: 0 }], bonds: [{ from: 0, to: 1, order: 3 }], note: 'The two nitrogen atoms share three electron pairs — a triple bond — which is why N₂ is extremely stable and mostly unreactive.' },
  CH4: { name: 'Methane', formula: 'CH₄', atoms: [{ label: 'C', color: ATOM_COLORS.C, x: 0, y: 0 }, { label: 'H', color: ATOM_COLORS.H, x: 0, y: -58 }, { label: 'H', color: ATOM_COLORS.H, x: 54, y: 32 }, { label: 'H', color: ATOM_COLORS.H, x: -54, y: 32 }, { label: 'H', color: ATOM_COLORS.H, x: 0, y: 56 }], bonds: [{ from: 0, to: 1, order: 1 }, { from: 0, to: 2, order: 1 }, { from: 0, to: 3, order: 1 }, { from: 0, to: 4, order: 1 }], note: 'Carbon has 4 valence electrons and forms 4 single bonds with hydrogen. In 3D these arrange tetrahedrally to minimize repulsion (shown flattened here).' },
};

interface Props extends VizCommonProps { }

const TOTAL = 3;

export const MolecularBonding = forwardRef<AnimationHandle, Props>(function MolecularBonding(
  { playing, speed, onPhases, onPlayingChange, onSound, t, fs }, ref
) {
  const [key, setKey] = useState('H2O');
  const mol = MOLECULES[key];
  const [step, setStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSound = useRef(-1);

  const buildPhases = useCallback((): AnimationPhase[] => [
    { label: 'Separate atoms', explanation: `${mol.atoms.map(a => a.label).join(' + ')} start as individual atoms, each with unpaired valence electrons, too unstable to stay isolated.`, values: [{ label: 'Molecule', value: mol.formula }, { label: 'Atoms', value: String(mol.atoms.length) }], why: 'Atoms bond because sharing electrons lets each one achieve a full, stable outer shell (the octet rule, or a full shell of 2 for hydrogen).' },
    { label: 'Approaching & sharing electrons', explanation: `As the atoms move closer, their outer electron clouds begin to overlap and electron pairs become shared between nuclei.`, values: [{ label: 'Bonds forming', value: String(mol.bonds.length) }], why: 'Electron sharing lowers the total energy of the system compared to separate atoms — the bonded state is more stable.' },
    { label: `${mol.name} (${mol.formula}) formed`, explanation: mol.note, values: [{ label: 'Bond type', value: mol.bonds[0]?.order === 3 ? 'Triple' : mol.bonds[0]?.order === 2 ? 'Double' : 'Single' }], formula: 'Octet Rule: atoms bond to reach 8 valence electrons (2 for H)', takeaway: `${mol.formula} is held together by covalent bonds — shared, not transferred, electron pairs. Try a different molecule above.` },
  ], [mol]);

  useEffect(() => {
    onPhases(buildPhases(), step, TOTAL);
    if (step !== lastSound.current) { onSound(step === TOTAL - 1 ? 'success' : 'tick'); lastSound.current = step; }
  }, [buildPhases, step, onPhases, onSound]);

  useEffect(() => { setStep(0); lastSound.current = -1; }, [key]);

  useEffect(() => {
    onPlayingChange(playing);
    if (!playing) { if (timerRef.current) clearTimeout(timerRef.current); return; }
    if (step >= TOTAL - 1) { onPlayingChange(false); return; }
    timerRef.current = setTimeout(() => setStep(s => Math.min(TOTAL - 1, s + 1)), 1500 / speed);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, speed, step, onPlayingChange]);

  useImperativeHandle(ref, () => ({
    play: () => { if (step >= TOTAL - 1) setStep(0); onPlayingChange(true); },
    pause: () => onPlayingChange(false),
    reset: () => { setStep(0); onPlayingChange(false); },
    next: () => setStep(s => Math.min(TOTAL - 1, s + 1)),
    prev: () => setStep(s => Math.max(0, s - 1)),
  }), [step, onPlayingChange]);

  const spread = step === 0 ? 2.2 : step === 1 ? 1.35 : 1;
  const W = 420, H = 300, cx = W / 2, cy = H / 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <InputBar t={t}>
        <SelectField label="Molecule" value={key} onChange={setKey} t={t} fs={fs}
          options={Object.entries(MOLECULES).map(([k, m]) => ({ value: k, label: `${m.formula} — ${m.name}` }))} width={220} />
      </InputBar>
      <div style={{ flex: 1, minHeight: 240, borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}`, background: t.bg3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', maxWidth: 440 }}>
          <defs>
            {mol.atoms.map((a, i) => (
              <radialGradient key={i} id={`atomGrad${i}`} cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#fff" stopOpacity={0.85} />
                <stop offset="40%" stopColor={a.color} />
                <stop offset="100%" stopColor={a.color} stopOpacity={0.55} />
              </radialGradient>
            ))}
          </defs>
          {step >= 1 && mol.bonds.map((b, i) => {
            const A = mol.atoms[b.from], Bm = mol.atoms[b.to];
            const ax = cx + A.x * spread, ay = cy + A.y * spread;
            const bx = cx + Bm.x * spread, by = cy + Bm.y * spread;
            const dx = bx - ax, dy = by - ay; const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len, ny = dx / len; // normal for parallel bond lines
            const lines = Array.from({ length: b.order }, (_, li) => {
              const offset = (li - (b.order - 1) / 2) * 5;
              return (
                <line key={li} x1={ax + nx * offset} y1={ay + ny * offset} x2={bx + nx * offset} y2={by + ny * offset}
                  stroke={step >= 2 ? '#22c55e' : '#f59e0b'} strokeWidth={2.5} strokeLinecap="round" opacity={step >= 1 ? 1 : 0} />
              );
            });
            return <g key={i}>{lines}</g>;
          })}
          {mol.atoms.map((a, i) => {
            const ax = cx + a.x * spread, ay = cy + a.y * spread;
            const r = a.label === 'H' ? 14 : 20;
            return (
              <g key={i}>
                <circle cx={ax} cy={ay} r={r} fill={`url(#atomGrad${i})`} stroke="rgba(0,0,0,0.3)" strokeWidth={0.5} />
                <text x={ax} y={ay + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill={a.label === 'H' ? '#1e293b' : '#fff'} fontFamily="ui-monospace,monospace">{a.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
});
