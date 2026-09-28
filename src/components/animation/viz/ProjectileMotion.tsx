'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback, RefObject } from 'react';
import { AnimationHandle, AnimationPhase, VizCommonProps } from '../types';
import { InputBar, SliderField } from '../shared';

interface Props extends VizCommonProps { }

export const ProjectileMotion = forwardRef<AnimationHandle, Props>(function ProjectileMotion(
  { playing, speed, onPhases, onPlayingChange, onSound, t, fs }, ref
) {
  const [v0, setV0] = useState(24);
  const [angleDeg, setAngleDeg] = useState(45);
  const [g, setG] = useState(9.8);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);
  const [time, setTime] = useState(0);
  const rafRef = useRef<number | null>(null);
  const landedSoundPlayed = useRef(false);
  const lastPhaseRef = useRef(-1);

  const theta = (angleDeg * Math.PI) / 180;
  const flightTime = (2 * v0 * Math.sin(theta)) / g;
  const range = v0 * Math.cos(theta) * flightTime;
  const maxHeight = (v0 * v0 * Math.sin(theta) * Math.sin(theta)) / (2 * g);
  const T = Math.max(0.001, flightTime);

  const posAt = useCallback((tt: number) => {
    const x = v0 * Math.cos(theta) * tt;
    const y = Math.max(0, v0 * Math.sin(theta) * tt - 0.5 * g * tt * tt);
    const vy = v0 * Math.sin(theta) - g * tt;
    return { x, y, vy };
  }, [v0, theta, g]);

  const TOTAL = 5;
  const phaseIndex = Math.min(TOTAL - 1, Math.floor((time / T) * TOTAL));

  const buildPhases = useCallback((): AnimationPhase[] => {
    const cur = posAt(time);
    const labels = ['Launch', 'Rising', 'Apex (peak height)', 'Falling', 'Landing'];
    const explains = [
      `The projectile launches at ${v0} m/s at ${angleDeg}° above the horizontal. Its velocity splits into horizontal (constant) and vertical (decelerating) components.`,
      `Gravity constantly pulls the projectile downward, so its vertical speed shrinks while its horizontal speed stays exactly ${(v0 * Math.cos(theta)).toFixed(1)} m/s.`,
      `Vertical velocity has dropped to zero — this is the highest point of the arc, at height ${maxHeight.toFixed(2)} m.`,
      `Past the apex, gravity now speeds the projectile up as it falls, tracing the second half of the parabola.`,
      `The projectile returns to ground level after ${flightTime.toFixed(2)} s, having travelled ${range.toFixed(2)} m horizontally.`,
    ];
    return labels.map((label, i) => ({
      label,
      explanation: explains[i],
      values: [
        { label: 'x (m)', value: cur.x.toFixed(2) },
        { label: 'y (m)', value: cur.y.toFixed(2) },
        { label: 'vy (m/s)', value: cur.vy.toFixed(2) },
        { label: 't (s)', value: time.toFixed(2) },
      ],
      formula: 'y = x·tanθ − g·x² / (2v₀²cos²θ)',
      why: i === 2 ? 'At the apex, vertical velocity vy = v₀sinθ − gt equals zero — the projectile momentarily stops moving up or down.' : 'Horizontal and vertical motion are independent: gravity only ever acts vertically.',
      takeaway: i === TOTAL - 1 ? `Range ≈ ${range.toFixed(1)} m, max height ≈ ${maxHeight.toFixed(1)} m, flight time ≈ ${flightTime.toFixed(2)} s. A 45° launch angle maximizes range for a given speed — try it.` : undefined,
    }));
  }, [angleDeg, flightTime, maxHeight, posAt, range, theta, time, v0]);

  useEffect(() => {
    onPhases(buildPhases(), phaseIndex, TOTAL);
    if (phaseIndex !== lastPhaseRef.current) { onSound('tick'); lastPhaseRef.current = phaseIndex; }
  }, [buildPhases, phaseIndex, onPhases, onSound]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const padL = 40, padB = 40, padT = 24, padR = 20;
    const usableW = W - padL - padR, usableH = H - padT - padB;
    const scale = Math.min(usableW / Math.max(range, 1), usableH / Math.max(maxHeight, 1)) * 0.92;
    const groundY = H - padB;
    const toPx = (x: number, y: number) => [padL + x * scale, groundY - y * scale];

    ctx.clearRect(0, 0, W, H);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, t.bg3 || '#0f172a'); sky.addColorStop(1, t.bg || '#0b1220');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    // ground
    ctx.fillStyle = 'rgba(34,197,94,0.12)';
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();

    // full dashed trajectory guide
    ctx.strokeStyle = 'rgba(148,163,184,0.35)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const tt = T * (i / 100);
      const p = posAt(tt);
      const [px, py] = toPx(p.x, p.y);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke(); ctx.setLineDash([]);

    // traced solid trajectory up to current time
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(59,130,246,0.6)'; ctx.shadowBlur = 8;
    ctx.beginPath();
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const tt = time * (i / steps);
      const p = posAt(tt);
      const [px, py] = toPx(p.x, p.y);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke(); ctx.shadowBlur = 0;

    // launch pad
    const [lx, ly] = toPx(0, 0);
    ctx.fillStyle = '#64748b'; ctx.fillRect(lx - 10, ly - 4, 20, 6);

    // projectile ball with radial shading for a "real object" look
    const cur = posAt(time);
    const [px, py] = toPx(cur.x, cur.y);
    const grad = ctx.createRadialGradient(px - 3, py - 3, 1, px, py, 9);
    grad.addColorStop(0, '#fef08a'); grad.addColorStop(0.5, '#f59e0b'); grad.addColorStop(1, '#b45309');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.stroke();

    // angle indicator at launch
    ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(lx, ly, 26, -theta, 0, false); ctx.stroke();
    ctx.fillStyle = '#a78bfa'; ctx.font = '11px ui-monospace,monospace';
    ctx.fillText(`${angleDeg}°`, lx + 30, ly - 6);
  }, [angleDeg, maxHeight, posAt, range, t, theta, time, T]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    onPlayingChange(playing);
    if (!playing) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return; }
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      tRef.current = Math.min(T, tRef.current + dt * speed);
      setTime(tRef.current);
      if (tRef.current >= T) {
        if (!landedSoundPlayed.current) { onSound('success'); landedSoundPlayed.current = true; }
        onPlayingChange(false);
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, T]);

  useImperativeHandle(ref, () => ({
    play: () => { if (tRef.current >= T) { tRef.current = 0; setTime(0); } landedSoundPlayed.current = false; onPlayingChange(true); },
    pause: () => onPlayingChange(false),
    reset: () => { tRef.current = 0; setTime(0); landedSoundPlayed.current = false; onPlayingChange(false); },
    next: () => { tRef.current = Math.min(T, T * ((phaseIndex + 2) / TOTAL)); setTime(tRef.current); },
    prev: () => { tRef.current = Math.max(0, T * (phaseIndex / TOTAL)); setTime(tRef.current); },
  }), [T, phaseIndex, onPlayingChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <InputBar t={t}>
        <SliderField label="Initial velocity" value={v0} min={5} max={50} step={1} onChange={v => { setV0(v); tRef.current = 0; setTime(0); }} t={t} fs={fs} unit=" m/s" />
        <SliderField label="Launch angle" value={angleDeg} min={5} max={85} step={1} onChange={v => { setAngleDeg(v); tRef.current = 0; setTime(0); }} t={t} fs={fs} unit="°" />
        <SliderField label="Gravity" value={g} min={1.6} max={24.8} step={0.1} onChange={v => { setG(v); tRef.current = 0; setTime(0); }} t={t} fs={fs} unit=" m/s²" />
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
