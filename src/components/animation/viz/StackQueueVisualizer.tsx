'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { AnimationHandle, AnimationPhase, VizCommonProps } from '../types';
import { InputBar, TextField, SelectField, SmallButton } from '../shared';

interface Op { kind: 'init' | 'push' | 'pop' | 'blocked'; value?: number; snapshot: number[]; desc: string; }

interface Props extends VizCommonProps { }

export const StackQueueVisualizer = forwardRef<AnimationHandle, Props>(function StackQueueVisualizer(
  { playing, speed, onPhases, onPlayingChange, onSound, t, fs }, ref
) {
  const [mode, setMode] = useState<'stack' | 'queue'>('stack');
  const [inputValue, setInputValue] = useState('10');
  const [log, setLog] = useState<Op[]>([{ kind: 'init', snapshot: [], desc: `Empty ${mode === 'stack' ? 'stack' : 'queue'}. Push or enqueue a value to begin.` }]);
  const [stepIndex, setStepIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSoundStep = useRef(-1);

  useEffect(() => { setLog([{ kind: 'init', snapshot: [], desc: `Empty ${mode === 'stack' ? 'stack' : 'queue'}. Push or enqueue a value to begin.` }]); setStepIndex(0); }, [mode]);

  const current = log[log.length - 1].snapshot;
  const TOTAL = log.length;
  const clampedIndex = Math.min(stepIndex, TOTAL - 1);
  const cur = log[clampedIndex];

  const push = () => {
    const v = Number(inputValue); if (isNaN(v)) return;
    let next: Op;
    if (current.length >= 8) {
      next = { kind: 'blocked', value: v, snapshot: current, desc: `${mode === 'stack' ? 'Stack' : 'Queue'} is full (max 8 shown) — ${v} was not added.` };
    } else {
      const snap = mode === 'stack' ? [...current, v] : [...current, v];
      next = { kind: 'push', value: v, snapshot: snap, desc: mode === 'stack' ? `Push ${v} onto the top of the stack.` : `Enqueue ${v} at the back of the queue.` };
    }
    setLog(l => [...l, next]); setStepIndex(log.length);
    onSound('click');
  };

  const pop = () => {
    if (current.length === 0) { setLog(l => [...l, { kind: 'blocked', snapshot: current, desc: `${mode === 'stack' ? 'Stack' : 'Queue'} is empty — nothing to remove.` }]); setStepIndex(log.length); return; }
    const removed = mode === 'stack' ? current[current.length - 1] : current[0];
    const snap = mode === 'stack' ? current.slice(0, -1) : current.slice(1);
    setLog(l => [...l, { kind: 'pop', value: removed, snapshot: snap, desc: mode === 'stack' ? `Pop ${removed} from the top of the stack (last in, first out).` : `Dequeue ${removed} from the front of the queue (first in, first out).` }]);
    setStepIndex(log.length);
    onSound('click');
  };

  const buildPhases = useCallback((): AnimationPhase[] => log.map((o, i) => ({
    label: `Operation ${i}: ${o.kind === 'init' ? 'Start' : o.kind}`,
    explanation: o.desc,
    values: [{ label: 'Contents', value: `[${o.snapshot.join(', ')}]` }, { label: 'Size', value: String(o.snapshot.length) }],
    formula: mode === 'stack' ? 'LIFO — Last In, First Out' : 'FIFO — First In, First Out',
    why: mode === 'stack' ? 'A stack only ever exposes its top element, so the most recently pushed value is always the first one popped.' : 'A queue only ever removes from the front, so elements are served in the exact order they arrived.',
    takeaway: i === log.length - 1 && log.length > 1 ? `Current ${mode}: [${o.snapshot.join(', ')}]. ${mode === 'stack' ? 'Next pop will remove ' + (o.snapshot[o.snapshot.length - 1] ?? 'nothing') : 'Next dequeue will remove ' + (o.snapshot[0] ?? 'nothing')}.` : undefined,
  })), [log, mode]);

  useEffect(() => {
    onPhases(buildPhases(), clampedIndex, TOTAL);
    if (clampedIndex !== lastSoundStep.current) { lastSoundStep.current = clampedIndex; }
  }, [buildPhases, clampedIndex, TOTAL, onPhases]);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <InputBar t={t}>
        <SelectField label="Structure" value={mode} onChange={v => setMode(v as 'stack' | 'queue')} t={t} fs={fs}
          options={[{ value: 'stack', label: 'Stack (LIFO)' }, { value: 'queue', label: 'Queue (FIFO)' }]} width={160} />
        <TextField label="Value" value={inputValue} onChange={setInputValue} t={t} fs={fs} width={90} />
        <SmallButton onClick={push} t={t} fs={fs} active color="#3b82f6">{mode === 'stack' ? '⬆ Push' : '➡ Enqueue'}</SmallButton>
        <SmallButton onClick={pop} t={t} fs={fs} color="#ef4444">{mode === 'stack' ? '⬇ Pop' : '⬅ Dequeue'}</SmallButton>
      </InputBar>

      <div style={{ flex: 1, minHeight: 260, borderRadius: 12, border: `1px solid ${t.border}`, background: t.bg3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: mode === 'stack' ? 'flex-end' : 'center', padding: 20, gap: 10, overflow: 'auto' }}>
        {cur.snapshot.length === 0 && <div style={{ color: t.text3, fontSize: fs }}>Empty {mode}</div>}
        <div style={{ display: 'flex', flexDirection: mode === 'stack' ? 'column-reverse' : 'row', gap: 8, alignItems: 'center' }}>
          {cur.snapshot.map((v, i) => {
            const isTopOrFront = mode === 'stack' ? i === cur.snapshot.length - 1 : i === 0;
            return (
              <div key={i} style={{
                width: mode === 'stack' ? 90 : 56, height: mode === 'stack' ? 44 : 56, borderRadius: 10,
                background: isTopOrFront ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14,
                boxShadow: isTopOrFront ? '0 0 0 2px rgba(255,255,255,0.5), 0 6px 16px rgba(0,0,0,0.3)' : '0 3px 8px rgba(0,0,0,0.25)',
                transition: 'transform 0.3s ease, background 0.3s ease', fontFamily: 'ui-monospace,monospace',
              }}>{v}</div>
            );
          })}
        </div>
        {cur.snapshot.length > 0 && <div style={{ fontSize: 11, color: t.text2 }}>{mode === 'stack' ? '↑ top of stack highlighted' : 'front (highlighted) → back'}</div>}
      </div>
    </div>
  );
});
