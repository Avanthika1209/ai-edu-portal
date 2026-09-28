'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback, RefObject } from 'react';
import { AnimationHandle, AnimationPhase, VizCommonProps } from '../types';
import { InputBar, TextField, SliderField } from '../shared';

const TOTAL_PHASES = 6;
const SAFE_TOKEN = /^[0-9x+\-*/^().,\s a-zA-Z]*$/;
const ALLOWED_NAMES = new Set(['x', 'sin', 'cos', 'tan', 'sqrt', 'abs', 'log', 'exp', 'pow', 'PI', 'min', 'max', 'floor', 'ceil']);

function compileFn(expr: string): ((x: number) => number) | null {
  if (!expr.trim() || !SAFE_TOKEN.test(expr)) return null;
  const words = expr.match(/[a-zA-Z]+/g) || [];
  for (const w of words) if (!ALLOWED_NAMES.has(w)) return null;
  const body = expr.replace(/\^/g, '**');
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('x', `"use strict"; const {sin,cos,tan,sqrt,abs,log,exp,pow,PI,min,max,floor,ceil}=Math; return (${body});`);
    fn(1); // sanity check it evaluates without throwing
    return (x: number) => { const v = fn(x); return typeof v === 'number' && isFinite(v) ? v : NaN; };
  } catch { return null; }
}

interface Props extends VizCommonProps { }

export const MathGrapher = forwardRef<AnimationHandle, Props>(function MathGrapher(
  { playing, speed, onPhases, onPlayingChange, onSound, t, fs }, ref
) {
  const [expr, setExpr] = useState('sin(x) * x / 3');
  const [domain, setDomain] = useState(10);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(0); // 0..1 sweep across domain
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastPhaseRef = useRef(-1);

  const fn = compileFn(expr) || ((x: number) => x);
  const valid = compileFn(expr) !== null;

  const phaseIndex = Math.min(TOTAL_PHASES - 1, Math.floor(progress * TOTAL_PHASES));

  const buildPhases = useCallback((): AnimationPhase[] => {
    const phases: AnimationPhase[] = [];
    for (let i = 0; i < TOTAL_PHASES; i++) {
      const xEnd = -domain + (2 * domain) * ((i + 1) / TOTAL_PHASES);
      const y = fn(xEnd);
      phases.push({
        label: `Tracing up to x = ${xEnd.toFixed(2)}`,
        explanation: `The grapher is plugging in values of x from −${domain} up to ${xEnd.toFixed(2)} into y = ${expr || 'f(x)'} and plotting each resulting point (x, y).`,
        values: [
          { label: 'x', value: xEnd.toFixed(2) },
          { label: 'y = f(x)', value: isFinite(y) ? y.toFixed(3) : 'undefined' },
        ],
        formula: `y = ${expr || 'f(x)'}`,
        why: 'A continuous function is really just infinitely many (x, y) points — sampling and connecting enough of them reveals its shape.',
        takeaway: i === TOTAL_PHASES - 1 ? `The full curve for y = ${expr || 'f(x)'} across x ∈ [−${domain}, ${domain}] is now visible. Try changing the equation or domain above.` : undefined,
      });
    }
    return phases;
  }, [domain, expr, fn]);

  useEffect(() => {
    onPhases(buildPhases(), phaseIndex, TOTAL_PHASES);
    if (phaseIndex !== lastPhaseRef.current) {
      if (phaseIndex > lastPhaseRef.current) onSound('tick');
      lastPhaseRef.current = phaseIndex;
    }
  }, [buildPhases, phaseIndex, onPhases, onSound]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const pad = 30;
    const toPx = (x: number, y: number) => {
      const px = pad + ((x + domain) / (2 * domain)) * (W - 2 * pad);
      const yScale = domain; // rough auto-scale using domain as y-range too
      const py = H / 2 - (y / yScale) * (H / 2 - pad);
      return [px, py];
    };

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = t.bg3 || '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // grid
    ctx.strokeStyle = t.border || 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let gx = -domain; gx <= domain; gx += domain / 5) {
      const [px] = toPx(gx, 0);
      ctx.beginPath(); ctx.moveTo(px, pad); ctx.lineTo(px, H - pad); ctx.stroke();
    }
    for (let gy = -domain; gy <= domain; gy += domain / 5) {
      const [, py] = toPx(0, gy);
      ctx.beginPath(); ctx.moveTo(pad, py); ctx.lineTo(W - pad, py); ctx.stroke();
    }

    // axes
    ctx.strokeStyle = t.text3 || '#64748b';
    ctx.lineWidth = 1.5;
    const [ax] = toPx(0, 0); const [, ay] = toPx(0, 0);
    ctx.beginPath(); ctx.moveTo(ax, pad); ctx.lineTo(ax, H - pad); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad, ay); ctx.lineTo(W - pad, ay); ctx.stroke();
    ctx.fillStyle = t.text2 || '#94a3b8';
    ctx.font = '10px ui-monospace,monospace';
    ctx.fillText('x', W - pad + 6, ay + 4);
    ctx.fillText('y', ax - 4, pad - 8);

    if (!valid) {
      ctx.fillStyle = '#ef4444';
      ctx.font = '13px sans-serif';
      ctx.fillText('Enter a valid function of x (e.g. sin(x), x^2 - 4, sqrt(x+5))', pad, H / 2);
      return;
    }

    // curve, traced up to current progress
    const xEnd = -domain + 2 * domain * progress;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(59,130,246,0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    let started = false;
    const steps = 400;
    for (let i = 0; i <= steps; i++) {
      const x = -domain + (2 * domain) * (i / steps);
      if (x > xEnd + 1e-9) break;
      const y = fn(x);
      if (!isFinite(y)) { started = false; continue; }
      const [px, py] = toPx(x, y);
      if (!started) { ctx.moveTo(px, py); started = true; } else { ctx.lineTo(px, py); }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // tracer dot at current head
    const yHead = fn(xEnd);
    if (isFinite(yHead)) {
      const [hx, hy] = toPx(xEnd, yHead);
      const grad = ctx.createRadialGradient(hx, hy, 0, hx, hy, 8);
      grad.addColorStop(0, '#fff'); grad.addColorStop(0.4, '#60a5fa'); grad.addColorStop(1, 'rgba(59,130,246,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(hx, hy, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(hx, hy, 3, 0, Math.PI * 2); ctx.fill();
    }
  }, [domain, fn, progress, t, valid]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    onPlayingChange(playing);
    if (!playing) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return; }
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      progressRef.current = Math.min(1, progressRef.current + dt * 0.18 * speed);
      setProgress(progressRef.current);
      if (progressRef.current >= 1) { onPlayingChange(false); return; }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed]);

  useImperativeHandle(ref, () => ({
    play: () => { if (progressRef.current >= 1) progressRef.current = 0; onPlayingChange(true); },
    pause: () => onPlayingChange(false),
    reset: () => { progressRef.current = 0; setProgress(0); onPlayingChange(false); },
    next: () => { progressRef.current = Math.min(1, (phaseIndex + 1 + 1) / TOTAL_PHASES); setProgress(progressRef.current); },
    prev: () => { progressRef.current = Math.max(0, (phaseIndex - 1 + 1) / TOTAL_PHASES); setProgress(progressRef.current); },
  }), [phaseIndex]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <InputBar t={t}>
        <TextField label="f(x) =" value={expr} onChange={setExpr} t={t} fs={fs} width={260} placeholder="e.g. x^2 - 4, sin(x), sqrt(x+5)" />
        <SliderField label="Domain ±" value={domain} min={2} max={20} step={1} onChange={v => { setDomain(v); progressRef.current = 0; setProgress(0); }} t={t} fs={fs} />
      </InputBar>
      <div style={{ flex: 1, minHeight: 240, borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}` }}>
        <ResponsiveCanvas canvasRef={canvasRef} onResize={draw} />
      </div>
    </div>
  );
});

// Keeps the canvas' pixel buffer in sync with its rendered CSS size so the
// plot stays crisp on any screen without hard-coding dimensions.
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
