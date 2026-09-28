'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback, useMemo } from 'react';
import { AnimationHandle, AnimationPhase, VizCommonProps } from '../types';
import { InputBar, TextField, SelectField } from '../shared';
import { AlgoId, AlgoStep, ALGO_LABELS, ALGO_COMPLEXITY, needsTarget, isSearch, runAlgorithm } from '../algorithms';

interface Props extends VizCommonProps { }

function parseArray(text: string): number[] {
  const nums = text.split(/[,\s]+/).map(s => Number(s.trim())).filter(n => !isNaN(n));
  return nums.slice(0, 12);
}

export const ArrayAlgorithms = forwardRef<AnimationHandle, Props>(function ArrayAlgorithms(
  { playing, speed, onPhases, onPlayingChange, onSound, t, fs }, ref
) {
  const [arrText, setArrText] = useState('64, 25, 12, 22, 11');
  const [targetText, setTargetText] = useState('22');
  const [algo, setAlgo] = useState<AlgoId>('bubble');
  const [stepIndex, setStepIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSoundStep = useRef(-1);

  const values = useMemo(() => { const v = parseArray(arrText); return v.length ? v : [64, 25, 12, 22, 11]; }, [arrText]);
  const target = Number(targetText) || 0;

  const steps: AlgoStep[] = useMemo(() => {
    try { return runAlgorithm(algo, values, target); } catch { return []; }
  }, [algo, values, target]);

  const TOTAL = steps.length;
  const clampedIndex = Math.min(stepIndex, Math.max(0, TOTAL - 1));
  const cur = steps[clampedIndex];

  useEffect(() => { setStepIndex(0); lastSoundStep.current = -1; }, [algo, arrText, targetText]);

  const buildPhases = useCallback((): AnimationPhase[] => {
    return steps.map((s, i) => {
      const values2: { label: string; value: string }[] = [{ label: 'Array', value: `[${s.arr.map(x => x.value).join(', ')}]` }];
      if (s.compare) values2.push({ label: 'Comparing', value: s.compare.map(idx => `idx ${idx}`).join(' & ') });
      if (s.swap) values2.push({ label: 'Swapped', value: `idx ${s.swap[0]} ↔ idx ${s.swap[1]}` });
      if (s.mid !== undefined) values2.push({ label: 'Mid index', value: String(s.mid) });
      if (s.lo !== undefined && s.hi !== undefined) values2.push({ label: 'Window', value: `[${s.lo}, ${s.hi}]` });
      if (s.foundIdx !== undefined) values2.push({ label: 'Found at index', value: String(s.foundIdx) });
      return {
        label: `Step ${i + 1}: ${s.kind === 'done' ? 'Complete' : s.kind === 'found' ? 'Found' : s.kind === 'notfound' ? 'Not found' : s.kind}`,
        explanation: s.desc,
        values: values2,
        formula: ALGO_COMPLEXITY[algo],
        why: s.kind === 'swap' ? 'Elements out of relative order are swapped immediately so the algorithm always works with the most current arrangement.' : s.kind === 'eliminate' ? 'Binary Search halves the remaining search space every step, which is why it is dramatically faster than checking one element at a time.' : undefined,
        takeaway: (s.kind === 'done' || s.kind === 'found' || s.kind === 'notfound') ? `${ALGO_LABELS[algo]} on your input completed in ${TOTAL} recorded steps. ${ALGO_COMPLEXITY[algo]}.` : undefined,
      };
    });
  }, [steps, algo, TOTAL]);

  useEffect(() => {
    onPhases(buildPhases(), clampedIndex, TOTAL);
    if (clampedIndex !== lastSoundStep.current) {
      lastSoundStep.current = clampedIndex;
      const k = cur?.kind;
      if (k === 'compare' || k === 'mid') onSound('compare');
      else if (k === 'swap') onSound('swap');
      else if (k === 'done' || k === 'found') onSound('success');
      else onSound('tick');
    }
  }, [buildPhases, clampedIndex, TOTAL, onPhases, cur, onSound]);

  useEffect(() => {
    onPlayingChange(playing);
    if (!playing) { if (timerRef.current) clearTimeout(timerRef.current); return; }
    if (clampedIndex >= TOTAL - 1) { onPlayingChange(false); return; }
    timerRef.current = setTimeout(() => setStepIndex(i => Math.min(TOTAL - 1, i + 1)), 900 / speed);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, speed, clampedIndex, TOTAL, onPlayingChange]);

  useImperativeHandle(ref, () => ({
    play: () => { if (clampedIndex >= TOTAL - 1) setStepIndex(0); onPlayingChange(true); },
    pause: () => onPlayingChange(false),
    reset: () => { setStepIndex(0); onPlayingChange(false); },
    next: () => setStepIndex(i => Math.min(TOTAL - 1, i + 1)),
    prev: () => setStepIndex(i => Math.max(0, i - 1)),
  }), [clampedIndex, TOTAL, onPlayingChange]);

  if (!cur) return <div style={{ padding: 20, color: t.text2 }}>Enter an array above to begin.</div>;

  const maxVal = Math.max(...cur.arr.map(x => Math.abs(x.value)), 1);
  const barW = 44, gap = 10;
  const isSorted = (idx: number) => cur.sortedIdx.includes(idx);
  const isCompared = (idx: number) => cur.compare?.includes(idx);
  const isSwapped = (idx: number) => cur.swap?.includes(idx);
  const isMid = (idx: number) => cur.mid === idx;
  const isEliminated = (idx: number) => (cur.lo !== undefined && idx < cur.lo) || (cur.hi !== undefined && idx > cur.hi);
  const isFound = (idx: number) => cur.foundIdx === idx;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <InputBar t={t}>
        <TextField label="Array (comma-separated)" value={arrText} onChange={setArrText} t={t} fs={fs} width={220} placeholder="e.g. 5, 2, 8, 1" />
        <SelectField label="Operation" value={algo} onChange={v => setAlgo(v as AlgoId)} t={t} fs={fs}
          options={Object.entries(ALGO_LABELS).map(([k, v]) => ({ value: k, label: v }))} width={170} />
        {needsTarget(algo) && <TextField label="Search for" value={targetText} onChange={setTargetText} t={t} fs={fs} width={100} />}
      </InputBar>

      <div style={{ flex: 1, minHeight: 260, borderRadius: 12, border: `1px solid ${t.border}`, background: t.bg3, position: 'relative', padding: '20px 16px', overflow: 'auto' }}>
        {isSearch(algo) && cur.lo !== undefined && cur.hi !== undefined && (
          <div style={{ position: 'absolute', top: 8, left: 16, fontSize: 11, color: t.text2, fontFamily: 'ui-monospace,monospace' }}>search window: [{cur.lo}, {cur.hi}]</div>
        )}
        <div style={{ position: 'relative', height: 200, marginTop: 20 }}>
          {cur.arr.map((item, idx) => {
            const h = Math.max(18, (Math.abs(item.value) / maxVal) * 160);
            let bg = 'linear-gradient(180deg,#3b82f6,#1d4ed8)';
            if (isEliminated(idx)) bg = 'linear-gradient(180deg,#475569,#334155)';
            if (isSorted(idx)) bg = 'linear-gradient(180deg,#4ade80,#16a34a)';
            if (isCompared(idx) || isMid(idx)) bg = 'linear-gradient(180deg,#fbbf24,#d97706)';
            if (isSwapped(idx)) bg = 'linear-gradient(180deg,#fb923c,#c2410c)';
            if (isFound(idx)) bg = 'linear-gradient(180deg,#34d399,#059669)';
            return (
              <div key={item.id} title={`value ${item.value}, index ${idx}`}
                style={{
                  position: 'absolute', left: idx * (barW + gap), bottom: 0, width: barW, height: h,
                  background: isEliminated(idx) ? bg : bg, borderRadius: '8px 8px 4px 4px',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 4,
                  color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: 'ui-monospace,monospace',
                  boxShadow: (isCompared(idx) || isSwapped(idx) || isMid(idx) || isFound(idx)) ? '0 0 0 2px rgba(255,255,255,0.5), 0 6px 16px rgba(0,0,0,0.35)' : '0 3px 8px rgba(0,0,0,0.25)',
                  opacity: isEliminated(idx) ? 0.35 : 1,
                  transition: 'left 0.45s cubic-bezier(.4,0,.2,1), height 0.3s ease, background 0.25s ease, opacity 0.3s ease',
                }}>
                {item.value}
                <span style={{ position: 'absolute', bottom: -18, fontSize: 9, color: t.text3, fontWeight: 500 }}>{idx}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
