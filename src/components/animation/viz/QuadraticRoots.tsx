'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback, RefObject } from 'react';
import { AnimationHandle, AnimationPhase, VizCommonProps } from '../types';
import { InputBar, SliderField } from '../shared';

interface Props extends VizCommonProps { }

export const QuadraticRoots = forwardRef<AnimationHandle, Props>(function QuadraticRoots(
  { playing, speed, onPhases, onPlayingChange, onSound, t, fs }, ref
) {
  const [a, setA] = useState(1);
  const [b, setB] = useState(-2);
  const [c, setC] = useState(-3);
  const [step, setStep] = useState(0); // 0..4
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSoundStep = useRef(-1);

  const disc = b * b - 4 * a * c;
  const vertexX = -b / (2 * a);
  const vertexY = a * vertexX * vertexX + b * vertexX + c;
  const hasRealRoots = disc >= 0;
  const root1 = hasRealRoots ? (-b + Math.sqrt(disc)) / (2 * a) : NaN;
  const root2 = hasRealRoots ? (-b - Math.sqrt(disc)) / (2 * a) : NaN;

  const eqStr = `${a}x² ${b >= 0 ? '+' : '-'} ${Math.abs(b)}x ${c >= 0 ? '+' : '-'} ${Math.abs(c)}`;
  const TOTAL = 5;

  const buildPhases = useCallback((): AnimationPhase[] => [
    { label: 'The equation', explanation: `We start with the quadratic ${eqStr} = 0. Because the x² term is present, its graph is a parabola.`, values: [{ label: 'a', value: String(a) }, { label: 'b', value: String(b) }, { label: 'c', value: String(c) }], formula: `${eqStr} = 0`, why: 'Every quadratic ax² + bx + c defines a parabola that opens upward if a > 0 and downward if a < 0.' },
    { label: 'Computing the discriminant', explanation: `The discriminant Δ = b² − 4ac tells us how many real roots exist before we even solve for them.`, values: [{ label: 'Δ = b²−4ac', value: disc.toFixed(2) }], formula: 'Δ = b² − 4ac', why: disc > 0 ? 'Δ > 0 means the parabola crosses the x-axis at two distinct points.' : disc === 0 ? 'Δ = 0 means the parabola just touches the x-axis at one point (a repeated root).' : 'Δ < 0 means the parabola never touches the x-axis — the roots are complex, not real.' },
    { label: 'Locating the vertex', explanation: `The vertex — the parabola's turning point — sits at x = −b/2a.`, values: [{ label: 'Vertex x', value: vertexX.toFixed(2) }, { label: 'Vertex y', value: vertexY.toFixed(2) }], formula: 'x = −b / 2a', why: 'The vertex is the axis of symmetry — the parabola is a mirror image on either side of this x value.' },
    { label: hasRealRoots ? 'First root' : 'No real root (side A)', explanation: hasRealRoots ? `Using the quadratic formula with the + sign gives the first x-intercept.` : `Since Δ < 0, √Δ is imaginary, so there is no real x-intercept on this side.`, values: hasRealRoots ? [{ label: 'x₁', value: root1.toFixed(3) }] : [{ label: 'x₁', value: 'complex' }], formula: 'x = (−b + √Δ) / 2a', why: 'The ± in the quadratic formula produces up to two symmetric solutions around the vertex.' },
    { label: hasRealRoots ? 'Second root & summary' : 'Summary', explanation: hasRealRoots ? `The second root completes the picture — these are exactly where the parabola crosses y = 0.` : `The parabola stays entirely above or below the x-axis, confirming there are no real solutions.`, values: hasRealRoots ? [{ label: 'x₂', value: root2.toFixed(3) }] : [{ label: 'Real roots', value: '0' }], formula: 'x = (−b − √Δ) / 2a', takeaway: hasRealRoots ? `${eqStr} = 0 has two real roots: x ≈ ${root1.toFixed(2)} and x ≈ ${root2.toFixed(2)}. Try changing a, b, c above to see the parabola reshape in real time.` : `${eqStr} = 0 has no real roots — try lowering c or changing the sign of a to make the parabola cross the x-axis.` },
  ], [a, b, c, disc, eqStr, hasRealRoots, root1, root2, vertexX, vertexY]);

  useEffect(() => {
    onPhases(buildPhases(), step, TOTAL);
    if (step !== lastSoundStep.current) { onSound('tick'); lastSoundStep.current = step; }
  }, [buildPhases, step, onPhases, onSound]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const W = canvas.width, H = canvas.height, pad = 32;
    const range = Math.max(8, Math.abs(vertexX) + 6, Math.sqrt(Math.abs(disc)) + 4);
    const yRange = Math.max(8, Math.abs(vertexY) + 6);
    const toPx = (x: number, y: number) => [pad + ((x + range) / (2 * range)) * (W - 2 * pad), H / 2 - (y / yRange) * (H / 2 - pad)];

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = t.bg3 || '#0f172a'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = t.border || 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
    for (let i = -5; i <= 5; i++) {
      const [px] = toPx((range / 5) * i, 0); ctx.beginPath(); ctx.moveTo(px, pad); ctx.lineTo(px, H - pad); ctx.stroke();
      const [, py] = toPx(0, (yRange / 5) * i); ctx.beginPath(); ctx.moveTo(pad, py); ctx.lineTo(W - pad, py); ctx.stroke();
    }
    ctx.strokeStyle = t.text3 || '#64748b'; ctx.lineWidth = 1.5;
    const [ax] = toPx(0, 0); const [, ay] = toPx(0, 0);
    ctx.beginPath(); ctx.moveTo(ax, pad); ctx.lineTo(ax, H - pad); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad, ay); ctx.lineTo(W - pad, ay); ctx.stroke();

    // parabola
    ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(139,92,246,0.5)'; ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i <= 300; i++) {
      const x = -range + (2 * range) * (i / 300);
      const y = a * x * x + b * x + c;
      const [px, py] = toPx(x, y);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke(); ctx.shadowBlur = 0;

    if (step >= 2) {
      const [vx, vy] = toPx(vertexX, vertexY);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.arc(vx, vy, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = t.text2 || '#94a3b8'; ctx.font = '11px ui-monospace,monospace';
      ctx.fillText('vertex', vx + 8, vy - 6);
    }
    if (hasRealRoots) {
      if (step >= 3) { const [rx, ry] = toPx(root1, 0); ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(rx, ry, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillText('x₁', rx - 4, ry + 18); }
      if (step >= 4) { const [rx, ry] = toPx(root2, 0); ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(rx, ry, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillText('x₂', rx - 4, ry + 18); }
    }
  }, [a, b, c, disc, hasRealRoots, root1, root2, step, t, vertexX, vertexY]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    onPlayingChange(playing);
    if (!playing) { if (timerRef.current) clearTimeout(timerRef.current); return; }
    if (step >= TOTAL - 1) { onPlayingChange(false); return; }
    timerRef.current = setTimeout(() => setStep(s => Math.min(TOTAL - 1, s + 1)), 1400 / speed);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, speed, step, onPlayingChange]);

  useImperativeHandle(ref, () => ({
    play: () => { if (step >= TOTAL - 1) setStep(0); onPlayingChange(true); },
    pause: () => onPlayingChange(false),
    reset: () => { setStep(0); onPlayingChange(false); },
    next: () => setStep(s => Math.min(TOTAL - 1, s + 1)),
    prev: () => setStep(s => Math.max(0, s - 1)),
  }), [step, onPlayingChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <InputBar t={t}>
        <SliderField label="a" value={a} min={-3} max={3} step={1} onChange={v => { setA(v === 0 ? 1 : v); setStep(0); }} t={t} fs={fs} width={130} />
        <SliderField label="b" value={b} min={-10} max={10} step={1} onChange={v => { setB(v); setStep(0); }} t={t} fs={fs} width={130} />
        <SliderField label="c" value={c} min={-10} max={10} step={1} onChange={v => { setC(v); setStep(0); }} t={t} fs={fs} width={130} />
      </InputBar>
      <div style={{ flex: 1, minHeight: 240, borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}` }}>
        <ResponsiveCanvas canvasRef={canvasRef} onResize={draw} />
      </div>
    </div>
  );
});

function ResponsiveCanvas({ canvasRef, onResize }: { canvasRef: RefObject<HTMLCanvasElement>; onResize: () => void }) {
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const parent = canvas.parentElement; if (!parent) return;
    const ro = new ResizeObserver(() => {
      const rect = parent.getBoundingClientRect();
      canvas.width = Math.max(200, Math.floor(rect.width));
      canvas.height = Math.max(180, Math.floor(rect.height));
      onResize();
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, [canvasRef, onResize]);
  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}
